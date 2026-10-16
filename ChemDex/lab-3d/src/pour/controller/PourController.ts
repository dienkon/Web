import { PourSessionState, PourMode, PourPhase } from './modes';
import { stepPourSimulation, SimVessel, PourPhysicsSession } from '../physics/step';
import { storeBridge } from './store-bridge';
import { vfxBus } from '../../vfx/bus';
import { useAppStore } from '../../store/useAppStore';
import { getVesselProfile } from '../physics/profiles';
import { findPouringTilt } from '../physics/retained';
import { decantLiquid, canReceivePour } from '../../engine/decantTransfer';
import { clampTilt } from '../../handling/limits';

let pourSessionCounter = 0;

export type PourListener = (session: PourSessionState | null) => void;

class PourControllerClass {
  private activeSession: PourSessionState | null = null;
  private listeners: Set<PourListener> = new Set();
  private timeAccumulator: number = 0;
  private simTime: number = 0;
  private lastNotifyTime: number = 0;
  private lastStoreCommitTime: number = 0;

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
    return this.activeSession;
  }

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
    const store = useAppStore.getState();
    const sourceVessel = store.vessels[opts.sourceId];
    if (!sourceVessel || this.activeSession) return;
    const finiteVesselMode = !['STOCK_BOTTLE', 'DROPPER', 'SOLID'].includes(opts.mode);
    const recipient = opts.targetId ? store.vessels[opts.targetId] : null;
    if (finiteVesselMode && ((sourceVessel.volume_ml > 0 && !decantLiquid(sourceVessel, recipient ?? null, 0.001))
      || (opts.targetId && (!recipient || !canReceivePour(recipient))))) return;
    if (opts.requestedVolume_ml !== undefined && (!Number.isFinite(opts.requestedVolume_ml) || opts.requestedVolume_ml <= 0)) return;
    this.timeAccumulator = 0;

    const id = `pour_${++pourSessionCounter}`;
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
      flow_ml_s: 0,
      wallClinging: false,
      aim: {
        landing: [0, -0.135, 0],
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
    if (isPaused || !this.activeSession) return;

    const effectiveDt = Math.min(delta, 0.1) * timeScale;
    this.simTime += effectiveDt;
    this.timeAccumulator += effectiveDt;

    const FIXED_STEP = 1 / 60;
    let steps = 0;

    const store = useAppStore.getState();
    const liveVessels = store.vessels;
    let effectiveVesselsMap: Record<string, SimVessel> = {};
    let sourceVessel = liveVessels[this.activeSession.sourceId];
    let targetVessel = this.activeSession.targetId ? liveVessels[this.activeSession.targetId] : null;

    if (!sourceVessel) {
      this.cancelPour();
      return;
    }

    const srcProfile = getVesselProfile(sourceVessel.type);
    const tgtProfile = targetVessel ? getVesselProfile(targetVessel.type) : null;

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

      hoverPos = [
        (targetVessel.position[0] - mouthR * 0.25) - tiltedLipX,
        (mouthY + 0.22) - tiltedLipY,
        targetVessel.position[2] - (lipLocal[2] || 0)
      ];
    }

    const initPos = this.activeSession.initialSourcePos || sourceVessel.position;

    while (this.activeSession && this.timeAccumulator >= FIXED_STEP && steps < 5) {
      this.timeAccumulator -= FIXED_STEP;
      steps++;
      const current = useAppStore.getState().vessels;
      sourceVessel = current[this.activeSession.sourceId];
      targetVessel = this.activeSession.targetId ? current[this.activeSession.targetId] : null;
      if (!sourceVessel || sourceVessel.isSealed || sourceVessel.isShattered
        || (this.activeSession.targetId && (!targetVessel || !canReceivePour(targetVessel)))) {
        void this.commitCurrentPour();
        break;
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
              this.activeSession.targetTilt = findPouringTilt(srcProfile, sourceVessel.volume_ml);
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

          const check = stepPourSimulation(physSession, effectiveVesselsMap, FIXED_STEP, this.simTime);
          if (check.nextSession.isStreaming && check.nextSession.lastFlowRate > 0.05) {
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
              : Math.max(0, this.activeSession.requestedVolume_ml - this.activeSession.transferred_ml - this.activeSession.spilled_ml));

          this.activeSession.transferred_ml = result.nextSession.totalTransferred_ml;
          this.activeSession.spilled_ml = result.nextSession.totalSpilled_ml;
          this.activeSession.flow_ml_s = result.nextSession.lastFlowRate;

          // Dispatch physical events
          for (const event of result.events) {
            if (event.type === 'flow:impact') {
              vfxBus.emit('pour:impact', {
                position: event.position,
                color: event.color,
                flowRate: event.flowRate_ml_s
              });
            } else if (event.type === 'spill') {
              // Realistic parabolic droplet splatter eruption
              const isAcid = (sourceVessel.ph !== undefined && sourceVessel.ph < 5.5) ||
                (sourceVessel.substances || []).some(s => {
                  const l = s.toLowerCase();
                  return l.includes('hcl') || l.includes('h2so4') || l.includes('hno3') || l.includes('ch3cooh');
                });
              vfxBus.emit('acid:splatter', {
                position: event.position,
                count: Math.min(48, Math.max(12, Math.floor(event.flowRate_ml_s * 0.85))),
                speed: 2.6 + Math.min(2.8, event.flowRate_ml_s * 0.05),
                color: event.color,
                substances: sourceVessel.substances || [],
                isAcid
              });
            }
          }

          // The geometry solver proposes volumes; the inventory transaction moves
          // each aliquot once. No direct mutation and no synthetic 0.8 M kinetics.
          const finiteVesselMode = !['STOCK_BOTTLE', 'DROPPER', 'SOLID'].includes(this.activeSession.mode);
          if (finiteVesselMode) {
            const accepted = result.nextSession.totalTransferred_ml - physSession.totalTransferred_ml;
            const spilled = result.nextSession.totalSpilled_ml - physSession.totalSpilled_ml;
            if (accepted > 0 && this.activeSession.targetId) {
              useAppStore.getState().transferLiquidContinuous(sourceVessel.id, this.activeSession.targetId, accepted);
            }
            if (spilled > 0) {
              const contact = result.events.find(e => e.type === 'spill')?.position ?? sourceVessel.position;
              useAppStore.getState().transferLiquidContinuous(sourceVessel.id, null, spilled, contact);
            }
            sourceVessel = useAppStore.getState().vessels[sourceVessel.id];
          }
          const impact = result.events.find(e => e.type === 'flow:impact');
          this.activeSession.mixingZone = { active: !!impact, point: impact?.position ?? sourceVessel.position,
            radius: 0.08, intensity: impact ? Math.min(1, this.activeSession.flow_ml_s / 40) : 0,
            color: sourceVessel.liquidColor ?? '#f8fafc' };

          // Check if pour should transition to dripping
          const isDepleted = sourceVessel.volume_ml <= 0.05;
          const isRequestedReached = this.activeSession.requestedVolume_ml && this.activeSession.transferred_ml + this.activeSession.spilled_ml >= this.activeSession.requestedVolume_ml - 1e-9;
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

          // Check residual flow
          const physSession: PourPhysicsSession = {
            sourceId: this.activeSession.sourceId,
            targetId: this.activeSession.targetId,
            sourcePos: this.activeSession.sourcePos,
            tilt: this.activeSession.tilt,
            sourceRotationZ: this.activeSession.sourceRotationZ,
            isStreaming: false,
            totalTransferred_ml: this.activeSession.transferred_ml,
            totalSpilled_ml: this.activeSession.spilled_ml,
            lastFlowRate: this.activeSession.flow_ml_s,
            assist: this.activeSession.assist || 'high'
          };

          const result = stepPourSimulation(physSession, effectiveVesselsMap, FIXED_STEP, this.simTime);
          this.activeSession.flow_ml_s = result.nextSession.lastFlowRate;

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
          this.commitCurrentPour();
          return;
        }
      }
    }

    // Throttled UI state notifications (10 Hz for smooth React UI without lag)
    const now = performance.now();
    if (now - this.lastNotifyTime >= 80) {
      this.lastNotifyTime = now;
      this.notify();
    }
  }

  /**
   * Commits the current pour and closes the session.
   */
  public async commitCurrentPour(): Promise<void> {
    if (!this.activeSession) return;
    const session = this.activeSession;
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
      const session = this.activeSession;
      this.activeSession = null;
      useAppStore.getState().setIsPouring(false);
      storeBridge.cancelPour(session);
      this.notify();
    }
  }
}

export const PourController = new PourControllerClass();
