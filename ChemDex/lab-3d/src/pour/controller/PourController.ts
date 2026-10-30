import { PourSessionState, PourMode } from './modes';
import { stepPourSimulation, SimVessel, PourPhysicsSession } from '../physics/step';
import { storeBridge } from './store-bridge';
import { vfxBus } from '../../vfx/bus';
import { useAppStore } from '../../store/useAppStore';
import { getWorldVesselProfile } from '../physics/profiles';
import { calculateVesselWeirFlow, findVesselPouringTilt } from '../physics/vesselFlow';
import { decantLiquid, canReceivePour } from '../../engine/decantTransfer';
import { clampTilt } from '../../handling/limits';
import { calculateStreamBallistics } from '../physics/ballistics';
import { mobileSolidInventory } from '../../science/suspensionTransport';
import { SimulationEngine } from '../../simulation/core/SimulationEngine';
import { vesselWorldLiquidSurfaceY } from '../../science/vesselGeometry';
import { LAB_PHYSICS } from '../../engine/interactionEngine';
import { pourTargetPose, type PourArrival } from '../../engine/pourTransport';
import { overflowLocationFractions } from '../../engine/overflowTransport';

let pourSessionCounter = 0;

export type PourListener = (session: PourSessionState | null) => void;

class PourControllerClass {
  private activeSession: PourSessionState | null = null;
  private listeners: Set<PourListener> = new Set();
  private timeAccumulator: number = 0;
  private simTime: number = 0;
  private lastNotifyTime: number = 0;
  private sessionEpoch = 0;
  private parcelCounter = 0;

  private syncEpoch(): void {
    if (this.activeSession && this.sessionEpoch !== useAppStore.getState().pourEpoch) {
      this.activeSession = null;
      this.timeAccumulator = 0;
      this.notify();
    }
  }

  private applyArrivals(arrivals: PourArrival[], dt: number): void {
    if (this.activeSession?.mixingZone) this.activeSession.mixingZone.active = false;
    for (const arrival of arrivals) {
      const { parcel, sample, accepted_ml, spilled_ml } = arrival;
      const flow = sample.volume_ml / dt;
      if (this.activeSession?.id === parcel.sessionId) {
        this.activeSession.transferred_ml += accepted_ml;
        this.activeSession.spilled_ml += spilled_ml;
        if (accepted_ml > 0 && parcel.trajectory.detailKind === 'liquid') {
          this.activeSession.mixingZone = { active: true, point: parcel.trajectory.impactPos,
            radius: 0.08, intensity: Math.min(1, flow / 40), color: sample.color };
        }
      }
      if (accepted_ml > 0 && parcel.trajectory.detailKind === 'liquid') {
        vfxBus.emit('pour:impact', { position: parcel.trajectory.impactPos,
          color: sample.color, flowRate: accepted_ml / dt });
      }
      // Rim overflow already has a wall-cascade receipt. An incoming stream
      // touching the liquid inside a full receiver does not prove an eruption.
      if (spilled_ml > 0 && parcel.trajectory.landingKind === 'table') {
        const spillFlow = spilled_ml / dt;
        const isAcid = sample.substances.some(formula => ['HCl', 'H2SO4', 'HNO3', 'CH3COOH'].includes(formula));
        vfxBus.emit('acid:splatter', { vesselId: parcel.sourceId, position: parcel.trajectory.impactPos,
          count: Math.min(48, Math.max(1, Math.floor(spillFlow * 0.85))),
          speed: 2.6 + Math.min(2.8, spillFlow * 0.05), color: sample.color,
          substances: sample.substances, isAcid });
      }
    }
    if (this.activeSession) {
      const parcels = useAppStore.getState().inFlightPours.filter(p => p.sessionId === this.activeSession!.id);
      this.activeSession.inFlight_ml = parcels.reduce((sum, p) => sum + (p.stage === 'wall' ? 0
        : p.stage === 'overflow' ? p.sample.volume_ml * overflowLocationFractions(p).air : p.sample.volume_ml), 0);
      this.activeSession.onWall_ml = parcels.reduce((sum, p) => sum + (p.stage === 'wall' ? p.sample.volume_ml
        : p.stage === 'overflow' ? p.sample.volume_ml * (1 - overflowLocationFractions(p).air) : 0), 0);
    }
  }

  public subscribe(listener: PourListener): () => void {
    this.listeners.add(listener);
    listener(this.activeSession);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const session = this.activeSession ? { ...this.activeSession } : null;
    for (const listener of this.listeners) {
      listener(session);
    }
  }

  public getSession(): PourSessionState | null {
    this.syncEpoch();
    return this.activeSession;
  }

  public getSimulationTime(): number { return this.simTime; }

  /**
   * Initiates a new pouring session in a specific operational mode.
   * Starts the physical pipeline: IDLE -> LIFT -> TILT -> FLOW -> DRIP -> RETURN -> SETTLE
   */
  public beginPour(opts: {
    mode: PourMode;
    sourceId: string;
    targetId: string | null;
    requestedVolume_ml?: number;
    chemical?: string;
    solidMass_g?: number;
    assist?: 'off' | 'low' | 'high';
  }): void {
    this.syncEpoch();
    const store = useAppStore.getState();
    const sourceVessel = store.vessels[opts.sourceId];
    if (!sourceVessel || this.activeSession) return;
    const finiteVesselMode = !['STOCK_BOTTLE', 'DROPPER', 'SOLID'].includes(opts.mode);
    const recipient = opts.targetId ? store.vessels[opts.targetId] : null;
    if (finiteVesselMode && ((sourceVessel.volume_ml > 0 && !decantLiquid(sourceVessel, recipient ?? null, 0.001))
      || (opts.targetId && (!recipient || !canReceivePour(recipient))))) return;
    if (opts.requestedVolume_ml !== undefined && (!Number.isFinite(opts.requestedVolume_ml) || opts.requestedVolume_ml <= 0)) return;
    this.timeAccumulator = 0;
    this.sessionEpoch = store.pourEpoch;

    let id: string;
    do { id = `pour_${++pourSessionCounter}`; }
    while (store.inFlightPours.some(parcel => parcel.sessionId === id));
    const initialPos: [number, number, number] = [...sourceVessel.position];
    const targetVessel = opts.targetId ? store.vessels[opts.targetId] : undefined;

    this.activeSession = {
      id,
      mode: opts.mode,
      sourceId: opts.sourceId,
      targetId: opts.targetId,
      tilt: 0,
      targetTilt: 0,
      lift: 0,
      requestedVolume_ml: opts.requestedVolume_ml,
      chemical: opts.chemical,
      solidMass_g: opts.solidMass_g,
      transferred_ml: 0,
      spilled_ml: 0,
      released_ml: 0,
      inFlight_ml: 0,
      onWall_ml: 0,
      flow_ml_s: 0,
      wallClinging: false,
      aim: {
        landing: [0, LAB_PHYSICS.TABLE_SURFACE_Y, 0],
        kind: 'table'
      },
      assist: opts.assist || (opts.mode === 'ASSIST' ? 'high' : 'off'),
      phase: 'lifting',
      startedAt: this.simTime,
      sourcePos: [...initialPos],
      sourceRotationZ: 0,
      initialSourcePos: [...initialPos],
      initialFromVolume_ml: sourceVessel.volume_ml,
      initialToVolume_ml: targetVessel ? targetVessel.volume_ml : undefined,
      mixingZone: {
        active: false,
        point: [0, 0, 0],
        radius: 0.05,
        intensity: 0.0,
        color: sourceVessel.liquidColor || '#38bdf8'
      }
    };

    vfxBus.emit('pour:start', {
      sourceId: opts.sourceId,
      targetId: opts.targetId,
      mode: opts.mode
    });

    useAppStore.getState().setIsPouring(true);

    this.notify();
  }

  /**
   * Sets the target tilt angle in radians (from 3D gizmo, 2D touch dial, mouse wheel, or keys).
   */
  public setTilt(rad: number): void {
    if (!this.activeSession) return;
    const store = useAppStore.getState();
    const sourceVessel = store.vessels[this.activeSession.sourceId];
    this.activeSession.targetTilt = clampTilt(sourceVessel?.type, rad);
  }

  /**
   * Master physical simulation sub-step loop (Fixed 1/60s).
   * Manages the complete physical pouring pipeline and updates continuous fluid dynamics.
   */
  public tick(
    delta: number,
    vesselsMap?: Record<string, SimVessel>,
    isPaused: boolean = false,
    timeScale: number = 1.0
  ): void {
    this.syncEpoch();
    if (isPaused || useAppStore.getState().isSimulationPaused || !Number.isFinite(delta) || delta <= 0
      || !Number.isFinite(timeScale) || timeScale <= 0) return;
    const effectiveDt = Math.min(delta, 0.1) * timeScale;
    if (!this.activeSession && !useAppStore.getState().inFlightPours.length) {
      this.simTime += effectiveDt;
      this.timeAccumulator = 0;
      return;
    }
    this.timeAccumulator += effectiveDt;

    const FIXED_STEP = 1 / 60;
    let steps = 0;

    while (this.timeAccumulator >= FIXED_STEP - 1e-12 && steps < 120) {
      this.timeAccumulator = Math.max(0, this.timeAccumulator - FIXED_STEP);
      this.simTime += FIXED_STEP;
      steps++;
      try {
        if (!this.activeSession) continue;

        const store = useAppStore.getState();
        const liveVessels = store.vessels;
        let effectiveVesselsMap: Record<string, SimVessel> = {};
        let sourceVessel = liveVessels[this.activeSession.sourceId];
        let targetVessel = this.activeSession.targetId ? liveVessels[this.activeSession.targetId] : null;

        if (!sourceVessel) {
          void this.commitCurrentPour();
          continue;
        }

        const srcProfile = getWorldVesselProfile(sourceVessel.type, sourceVessel.capacity_ml);
        const tgtProfile = targetVessel ? getWorldVesselProfile(targetVessel.type, targetVessel.capacity_ml) : null;

        // Calculate hover pouring position: anchor spout lip directly above recipient mouth
        let hoverPos: [number, number, number] = [
          sourceVessel.position[0],
          sourceVessel.position[1] + 0.6,
          sourceVessel.position[2]
        ];

        if (targetVessel && tgtProfile) {
          const mouthY = targetVessel.position[1] + tgtProfile.lipLocal[1];
          const mouthR = tgtProfile.mouthR;
          const tilt = this.activeSession.tilt || 0.65;
          const phi = -tilt;
          const cosT = Math.cos(phi);
          const sinT = Math.sin(phi);
          const lipLocal = srcProfile.lipLocal;
          const tiltedLipX = lipLocal[0] * cosT - lipLocal[1] * sinT;
          const tiltedLipY = lipLocal[0] * sinT + lipLocal[1] * cosT;
          const yaw = sourceVessel.rotationY || 0;
          const tiltedLipZ = lipLocal[2] || 0;
          const worldOffsetX = tiltedLipX * Math.cos(yaw) + tiltedLipZ * Math.sin(yaw);
          const worldOffsetZ = -tiltedLipX * Math.sin(yaw) + tiltedLipZ * Math.cos(yaw);

          hoverPos = [
            (targetVessel.position[0] - mouthR * 0.25) - worldOffsetX,
            (mouthY + 0.22) - tiltedLipY,
            targetVessel.position[2] - worldOffsetZ
          ];
        }

        const initPos = this.activeSession.initialSourcePos || sourceVessel.position;

        const current = useAppStore.getState().vessels;
        sourceVessel = current[this.activeSession.sourceId];
        targetVessel = this.activeSession.targetId ? current[this.activeSession.targetId] : null;
        if (!sourceVessel || sourceVessel.isSealed || sourceVessel.isShattered
          || (this.activeSession.targetId && (!targetVessel || !canReceivePour(targetVessel)))) {
          void this.commitCurrentPour();
          continue;
        }
        effectiveVesselsMap = Object.fromEntries([sourceVessel, ...(targetVessel ? [targetVessel] : [])].map(v => [v.id, {
          ...v, rotationZ: v.rotationZ ?? 0, density_g_ml: v.density_g_ml ?? 1,
          colorHex: v.liquidColor ?? '#f8fafc', ...(vesselsMap?.[v.id] ? {
            position: vesselsMap[v.id].position,
          } : {}),
        }]));

        // ========================================================
        // PIPELINE STATE MACHINE
        // ========================================================
        switch (this.activeSession.phase) {
          case 'lifting': {
            // Smooth vertical lift towards hover position
            this.activeSession.lift = Math.min(1.0, this.activeSession.lift + FIXED_STEP * 3.2);
            const t = this.activeSession.lift;
            const smoothT = t * t * (3 - 2 * t);

            this.activeSession.sourcePos = [
              initPos[0] + (hoverPos[0] - initPos[0]) * smoothT,
              initPos[1] + (hoverPos[1] - initPos[1]) * smoothT,
              initPos[2] + (hoverPos[2] - initPos[2]) * smoothT
            ];

            if (this.activeSession.lift >= 0.98) {
              this.activeSession.phase = 'tilting';
              this.activeSession.sourcePos = [...hoverPos];
              if (this.activeSession.assist === 'high' || this.activeSession.mode === 'ASSIST') {
                this.activeSession.targetTilt = findVesselPouringTilt(sourceVessel);
              }
            }
            break;
          }

          case 'tilting': {
            // Lock aligned source position at rim
            this.activeSession.sourcePos = [...hoverPos];
            // Smooth tilt towards targetTilt
            const tiltSpeed = 7.0;
            this.activeSession.tilt += (this.activeSession.targetTilt - this.activeSession.tilt) * Math.min(1, FIXED_STEP * tiltSpeed);
            this.activeSession.sourceRotationZ = -this.activeSession.tilt;

            // Check if flow starts
            const physSession: PourPhysicsSession = {
              sourceId: this.activeSession.sourceId,
              targetId: this.activeSession.targetId,
              sourcePos: this.activeSession.sourcePos,
              tilt: this.activeSession.tilt,
              sourceRotationZ: this.activeSession.sourceRotationZ,
              isStreaming: false,
              totalTransferred_ml: this.activeSession.transferred_ml,
              totalSpilled_ml: this.activeSession.spilled_ml,
              lastFlowRate: 0,
              assist: this.activeSession.assist || 'high'
            };

            const check = stepPourSimulation(physSession, effectiveVesselsMap, FIXED_STEP, this.simTime, Infinity,
              mobileSolidInventory(sourceVessel, SimulationEngine.findManager(sourceVessel.id)));
            if (check.nextSession.isStreaming && check.nextSession.lastFlowRate > 0) {
              this.activeSession.phase = 'pouring';
            }
            break;
          }

          case 'pouring': {
            // Lock aligned source position at rim
            this.activeSession.sourcePos = [...hoverPos];
            // Smooth tilt response
            const tiltSpeed = 8.5;
            this.activeSession.tilt += (this.activeSession.targetTilt - this.activeSession.tilt) * Math.min(1, FIXED_STEP * tiltSpeed);
            this.activeSession.sourceRotationZ = -this.activeSession.tilt;

            const physSession: PourPhysicsSession = {
              sourceId: this.activeSession.sourceId,
              targetId: this.activeSession.targetId,
              sourcePos: this.activeSession.sourcePos,
              tilt: this.activeSession.tilt,
              sourceRotationZ: this.activeSession.sourceRotationZ,
              isStreaming: true,
              totalTransferred_ml: this.activeSession.transferred_ml,
              totalSpilled_ml: this.activeSession.spilled_ml,
              lastFlowRate: this.activeSession.flow_ml_s,
              assist: this.activeSession.assist || 'high'
            };

            const result = stepPourSimulation(physSession, effectiveVesselsMap, FIXED_STEP, this.simTime,
              this.activeSession.requestedVolume_ml === undefined ? Infinity
                : Math.max(0, this.activeSession.requestedVolume_ml - this.activeSession.released_ml),
              mobileSolidInventory(sourceVessel, SimulationEngine.findManager(sourceVessel.id)));

            const finiteVesselMode = !['STOCK_BOTTLE', 'DROPPER', 'SOLID'].includes(this.activeSession.mode);
            if (finiteVesselMode) {
              // Discharge is a release into air. Capacity and chemistry are evaluated at arrival.
              const projected = result.nextSession.totalTransferred_ml + result.nextSession.totalSpilled_ml
                - physSession.totalTransferred_ml - physSession.totalSpilled_ml;
              const released = result.trajectory && projected > 0 ? useAppStore.getState().releasePourLiquid({
                id: `${this.activeSession.id}_${++this.parcelCounter}`, sessionId: this.activeSession.id,
                sourceId: sourceVessel.id, sourceName: sourceVessel.name, targetId: this.activeSession.targetId,
                targetPose: pourTargetPose(targetVessel), duration_s: FIXED_STEP, trajectory: result.trajectory,
              }, projected) : 0;
              this.activeSession.released_ml += released;
              this.activeSession.inFlight_ml += released;
              this.activeSession.flow_ml_s = released / FIXED_STEP;
              if (released === 0 && projected > 0) {
                this.activeSession.phase = 'dripping'; this.activeSession.targetTilt = 0;
              }
              sourceVessel = useAppStore.getState().vessels[sourceVessel.id];
            } else {
              this.activeSession.transferred_ml = result.nextSession.totalTransferred_ml;
              this.activeSession.spilled_ml = result.nextSession.totalSpilled_ml;
              this.activeSession.released_ml = this.activeSession.transferred_ml + this.activeSession.spilled_ml;
              this.activeSession.flow_ml_s = result.nextSession.lastFlowRate;
            }

            // Check if pour should transition to dripping
            const isDepleted = sourceVessel.volume_ml <= 0;
            const isRequestedReached = this.activeSession.requestedVolume_ml && this.activeSession.released_ml >= this.activeSession.requestedVolume_ml - 1e-9;
            const isTiltingBack = this.activeSession.targetTilt <= 0.08;

            if (isDepleted || isRequestedReached || isTiltingBack) {
              this.activeSession.phase = 'dripping';
              this.activeSession.targetTilt = 0;
            }
            break;
          }

          case 'dripping': {
            // Smoothly tilt back to 0
            this.activeSession.tilt += (0 - this.activeSession.tilt) * Math.min(1, FIXED_STEP * 6.0);
            this.activeSession.sourceRotationZ = -this.activeSession.tilt;

            // No cosmetic residual flow: the finite trailing stream lives in the transport inventory.
            this.activeSession.flow_ml_s = 0;

            // Transition to returning once stream stops and tilt is upright
            if (this.activeSession.tilt <= 0.04 && this.activeSession.flow_ml_s <= 0.01) {
              this.activeSession.phase = 'returning';
            }
            break;
          }

          case 'returning': {
            // Smoothly return from hover position back down to resting table position
            const curPos = this.activeSession.sourcePos || initPos;
            const dx = initPos[0] - curPos[0];
            const dy = initPos[1] - curPos[1];
            const dz = initPos[2] - curPos[2];
            const dist = Math.hypot(dx, dy, dz);

            const returnSpeed = 4.5;
            this.activeSession.sourcePos = [
              curPos[0] + dx * Math.min(1.0, FIXED_STEP * returnSpeed),
              curPos[1] + dy * Math.min(1.0, FIXED_STEP * returnSpeed),
              curPos[2] + dz * Math.min(1.0, FIXED_STEP * returnSpeed)
            ];
            this.activeSession.tilt = Math.max(0, this.activeSession.tilt - FIXED_STEP * 4.0);
            this.activeSession.sourceRotationZ = 0;

            if (dist < 0.02) {
              this.activeSession.sourcePos = [...initPos];
              this.activeSession.phase = 'settling';
            }
            break;
          }

          case 'settling': {
            void this.commitCurrentPour();
            break;
          }
        }
      } finally {
        this.applyArrivals(useAppStore.getState().advancePourTransport(FIXED_STEP), FIXED_STEP);
      }
    }

    // Throttled UI state notifications (10 Hz for smooth React UI without lag)
    const now = performance.now();
    if (this.activeSession) {
      const session = this.activeSession;
      const current = useAppStore.getState().vessels;
      const source = current[session.sourceId];
      const target = session.targetId ? current[session.targetId] : undefined;
      if (source) {
        const profile = getWorldVesselProfile(source.type, source.capacity_ml);
        const targetProfile = target ? getWorldVesselProfile(target.type, target.capacity_ml) : null;
        const flow = calculateVesselWeirFlow(source, session.tilt, this.simTime, 1,
          mobileSolidInventory(source, SimulationEngine.findManager(source.id)));
        session.trajectory = calculateStreamBallistics(session.sourcePos ?? source.position,
          session.sourceRotationZ ?? -session.tilt, profile, flow.head_cm,
          target && targetProfile ? { id: target.id, position: target.position,
            mouthR: targetProfile.mouthR, mouthY: target.position[1] + targetProfile.lipLocal[1],
            profile: getWorldVesselProfile(target.type, target.capacity_ml),
            liquidSurfaceY: target.position[1] + vesselWorldLiquidSurfaceY(target) } : null,
          LAB_PHYSICS.TABLE_SURFACE_Y, source.rotationY, session.assist);
        session.aim = { landing: session.trajectory.impactPos,
          kind: session.trajectory.landingKind === 'rim' ? 'rim' : session.trajectory.landingKind === 'inside' ? 'inside' : 'table' };
      }
    }
    if (now - this.lastNotifyTime >= 80) {
      this.lastNotifyTime = now;
      this.notify();
    }
  }

  /**
   * Requests closure. Released matter finishes on simulation ticks before finalization.
   */
  public async commitCurrentPour(): Promise<void> {
    this.syncEpoch();
    if (!this.activeSession) return;
    const session = this.activeSession;
    const epoch = this.sessionEpoch;
    if (useAppStore.getState().inFlightPours.some(parcel => parcel.sessionId === session.id)) {
      // Request closure; normal simulation ticks must finish the released matter first.
      session.phase = 'settling'; session.flow_ml_s = 0; session.targetTilt = 0;
      this.notify();
      return;
    }
    this.activeSession = null;

    if (session.mode === 'STOCK_BOTTLE' || session.mode === 'DROPPER' || session.mode === 'SOLID') {
      if (session.targetId && session.chemical) {
        const amount = session.mode === 'SOLID' 
          ? (session.solidMass_g || 10) 
          : (session.requestedVolume_ml || 20);
        await storeBridge.commitAddChemical(session.targetId, session.chemical, amount);
      }
    } else {
      await storeBridge.completeLivePour(session.sourceId, session.targetId);
    }
    if (useAppStore.getState().pourEpoch !== epoch) return;

    vfxBus.emit('pour:end', {
      sourceId: session.sourceId,
      targetId: session.targetId,
      transferred_ml: session.transferred_ml
    });

    if (!this.activeSession) useAppStore.getState().setIsPouring(false);

    this.notify();
  }

  /**
   * Cancels the active pour gracefully (tilts back and returns to table).
   */
  public cancelPour(): void {
    if (!this.activeSession) return;
    if (this.activeSession.phase === 'pouring' || this.activeSession.phase === 'tilting') {
      this.activeSession.phase = 'dripping';
      this.activeSession.targetTilt = 0;
    } else if (this.activeSession.phase === 'lifting') {
      this.activeSession.phase = 'returning';
    } else {
      storeBridge.cancelPour(this.activeSession);
      void this.commitCurrentPour();
    }
  }
}

export const PourController = new PourControllerClass();
