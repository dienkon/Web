import { PourSessionState, PourMode, PourPhase } from './modes';
import { stepPourSimulation, SimVessel, PourPhysicsSession } from '../physics/step';
import { storeBridge } from './store-bridge';
import { vfxBus } from '../../vfx/bus';
import { useAppStore } from '../../store/useAppStore';
import { getVesselProfile } from '../physics/profiles';
import { kineticsEngine } from '../../simulation/chemistry/KineticsEngine';
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
    if (!sourceVessel) return;

    const id = `pour_${++pourSessionCounter}`;
    const initialPos: [number, number, number] = [...sourceVessel.position];

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
    vesselsMap: Record<string, SimVessel>,
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
    const sourceVessel = liveVessels[this.activeSession.sourceId];
    const targetVessel = this.activeSession.targetId ? liveVessels[this.activeSession.targetId] : null;

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
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);
      const lipLocal = srcProfile.lipLocal;
      const tiltedLipX = lipLocal[0] * cosT + lipLocal[1] * sinT;
      const tiltedLipY = -lipLocal[0] * sinT + lipLocal[1] * cosT;

      hoverPos = [
        (targetVessel.position[0] - mouthR * 0.2) - tiltedLipX,
        (mouthY + 0.22) - tiltedLipY,
        targetVessel.position[2]
      ];
    }

    const initPos = this.activeSession.initialSourcePos || sourceVessel.position;

    while (this.timeAccumulator >= FIXED_STEP && steps < 5) {
      this.timeAccumulator -= FIXED_STEP;
      steps++;

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
              this.activeSession.targetTilt = 0.65; // Initial gentle pour angle allowing user to adjust tilt for flow rate
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
            isStreaming: false,
            totalTransferred_ml: this.activeSession.transferred_ml,
            totalSpilled_ml: this.activeSession.spilled_ml,
            lastFlowRate: 0
          };

          const check = stepPourSimulation(physSession, vesselsMap, FIXED_STEP, this.simTime);
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
            isStreaming: true,
            totalTransferred_ml: this.activeSession.transferred_ml,
            totalSpilled_ml: this.activeSession.spilled_ml,
            lastFlowRate: this.activeSession.flow_ml_s
          };

          const result = stepPourSimulation(physSession, vesselsMap, FIXED_STEP, this.simTime);

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
              storeBridge.recordSpill(
                event.position,
                event.volume_ml,
                sourceVessel.substances || [],
                event.color
              );
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

          // Real-time live vessel volume transfer
          if (result.updatedSource) {
            sourceVessel.volume_ml = result.updatedSource.volume_ml;
            sourceVessel.mass_g = result.updatedSource.mass_g;
            sourceVessel.volume = Math.min(1.0, sourceVessel.volume_ml / sourceVessel.capacity_ml);
          }

          if (result.updatedTarget && targetVessel) {
            targetVessel.volume_ml = result.updatedTarget.volume_ml;
            targetVessel.mass_g = result.updatedTarget.mass_g;
            targetVessel.volume = Math.min(1.0, targetVessel.volume_ml / targetVessel.capacity_ml);
            targetVessel.substances = result.updatedTarget.substances;
            targetVessel.density_g_ml = result.updatedTarget.density_g_ml;

            // Step Real-Time Chemical Reaction Kinetics in Recipient!
            const impactEvent = result.events.find(e => e.type === 'flow:impact');
            const impactPos = impactEvent ? impactEvent.position : targetVessel.position;

            const kineticsResult = kineticsEngine.step(targetVessel, FIXED_STEP, {
              inflowRate_ml_s: this.activeSession.flow_ml_s,
              impactPoint: impactPos,
              incomingColor: sourceVessel.liquidColor
            });

            if (kineticsResult.hasPrecipitate) {
              targetVessel.hasPrecipitate = true;
              targetVessel.precipitateAmount_g = kineticsResult.precipitateTotal_g;
              targetVessel.precipitateColor = kineticsResult.precipitateColor || '#ffffff';
            }

            if (kineticsResult.hasGas) {
              targetVessel.hasGas = true;
              targetVessel.gasColor = kineticsResult.gasColor || '#ffffff';
            }

            if (kineticsResult.targetLiquidColor) {
              targetVessel.liquidColor = kineticsResult.targetLiquidColor;
            }

            targetVessel.temperature_c += kineticsResult.tempChange_c;

            // Update local mixing zone
            this.activeSession.mixingZone = {
              active: true,
              point: impactPos,
              radius: kineticsResult.mixingRadius,
              intensity: kineticsResult.mixingIntensity,
              color: sourceVessel.liquidColor || '#38bdf8'
            };
          }

          // Check if pour should transition to dripping
          const isDepleted = sourceVessel.volume_ml <= 0.05;
          const isRequestedReached = this.activeSession.requestedVolume_ml && this.activeSession.transferred_ml >= this.activeSession.requestedVolume_ml;
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
            tilt: this.activeSession.tilt,
            isStreaming: false,
            totalTransferred_ml: this.activeSession.transferred_ml,
            totalSpilled_ml: this.activeSession.spilled_ml,
            lastFlowRate: this.activeSession.flow_ml_s
          };

          const result = stepPourSimulation(physSession, vesselsMap, FIXED_STEP, this.simTime);
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
    } else if (session.targetId) {
      await storeBridge.commitVesselPour(session.sourceId, session.targetId, session.transferred_ml);
    }

    vfxBus.emit('pour:end', {
      sourceId: session.sourceId,
      targetId: session.targetId,
      transferred_ml: session.transferred_ml
    });

    useAppStore.getState().setIsPouring(false);

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
