/**
 * ReactionSimulationEngine.ts — Fixed-Timestep Reaction Simulation Engine
 * 
 * Satisfies Sections 4, 5, 29, 31, 32, 44, 45, 46, 58, 81:
 * - Deterministic fixed-timestep integration (1/60s) with accumulator.
 * - Manages active ReactionRuntime state per vessel.
 * - Routes to dedicated ReactionVisualController without generic fallbacks.
 * - Drives surface impulses, procedural audio, particle emission, and thermochemical updates.
 * - Supports timeline scrubbing (0..1) for development gallery and tests.
 */

import { ReactionRuntime, ReactionContext, ReactionVisualController } from './types';
import { getReactionController } from './registry';
import { useAppStore } from '../../store/useAppStore';
import { gasVisualState } from '../gasVisualState';
import { vfxBus } from '../bus';
import { labSound } from '../../utils/audio';

export class ReactionSimulationEngine {
  private static instance: ReactionSimulationEngine | null = null;
  public static getInstance(): ReactionSimulationEngine {
    if (!this.instance) {
      this.instance = new ReactionSimulationEngine();
    }
    return this.instance;
  }

  // Active runtimes keyed by vesselId
  private activeRuntimes: Map<string, ReactionRuntime> = new Map();
  // Fixed timestep configuration: 1/60 s
  public readonly fixedDt: number = 1.0 / 60.0;
  private accumulator: number = 0;
  private acceptedTime_s = 0;
  private integratedTime_s = 0;
  private joinedAt = new Map<string, number>();
  public getClockState() {
    return { acceptedTime_s: this.acceptedTime_s, integratedTime_s: this.integratedTime_s, pendingTime_s: this.accumulator };
  }

  /**
   * Starts a reaction simulation in a vessel with its dedicated controller.
   */
  public startReaction(
    vesselId: string,
    reactionId: string,
    initialData: Partial<ReactionRuntime> = {}
  ): ReactionRuntime | null {
    const controller = getReactionController(reactionId);
    const vessel = useAppStore.getState().vessels[vesselId];
    if (!vessel) return null;
    if (this.activeRuntimes.has(vesselId)) this.stopReaction(vesselId);

    const runtime: ReactionRuntime = {
      reactionId,
      vesselId,
      progress: 0.0,
      reactionRate: 1.0,
      temperature: vessel.temperature_c,
      reactantAvailability: Object.fromEntries((vessel.contents ?? []).map(content => [content.formula, content.moles])),
      productFormation: {},
      surfaceActivity: 0.0,
      gasGenerationRate: 0.0,
      precipitateRate: 0.0,
      mixingIntensity: 1.0,
      agitation: 0.0,
      heatReleaseRate: 0.0,
      currentColor: vessel.liquidColor || '#38bdf8',
      targetColor: vessel.liquidColor || '#38bdf8',
      turbidity: 0.0,
      elapsed: 0.0,
      duration: 5.0,
      customData: {},
      ...initialData,
    };

    if (controller) {
      const context = this.createContext(runtime, vessel, this.fixedDt);
      controller.initialize(context);
    }
    if (initialData.targetColor) runtime.targetColor = initialData.targetColor;
    // An externally supplied chemistry duration takes priority over a generic
    // controller preset; otherwise the controller can finish and restart early.
    if (initialData.duration !== undefined && Number.isFinite(initialData.duration) && initialData.duration > 0) {
      runtime.duration = initialData.duration;
      runtime.progress = Math.max(0, Math.min(1, initialData.progress ?? 0));
      runtime.elapsed = runtime.progress * runtime.duration;
    }

    this.activeRuntimes.set(vesselId, runtime);
    this.joinedAt.set(vesselId, this.acceptedTime_s);
    return runtime;
  }

  /**
   * Advances the simulation using a fixed-timestep accumulator.
   */
  public update(frameDelta: number, timeScale: number = 1.0): void {
    if (!Number.isFinite(frameDelta) || !Number.isFinite(timeScale) || frameDelta <= 0 || timeScale <= 0) return;
    const simulatedDelta = frameDelta * timeScale;
    if (!Number.isFinite(simulatedDelta) || !Number.isFinite(this.accumulator + simulatedDelta)
      || !Number.isFinite(this.acceptedTime_s + simulatedDelta)) return;
    this.accumulator += simulatedDelta;
    this.acceptedTime_s += simulatedDelta;

    // Enough for 30 FPS at 8x. Exceptional backlog is retained and observable,
    // never silently discarded. Paused/invalid inputs do not drain it.
    const maxSubSteps = 240;
    let stepCount = 0;

    while (this.accumulator + 1e-12 >= this.fixedDt && stepCount < maxSubSteps) {
      this.stepFixed(this.fixedDt, 1);
      this.integratedTime_s += this.fixedDt;
      this.accumulator = Math.max(0, this.accumulator - this.fixedDt);
      stepCount++;
    }
  }

  /**
   * Fixed substep update for all active reaction runtimes.
   */
  private stepFixed(dt: number, timeScale: number): void {
    const vessels = useAppStore.getState().vessels;
    const activeTool = useAppStore.getState().activeTool;

    for (const [vesselId, runtime] of this.activeRuntimes.entries()) {
      if (this.integratedTime_s + 1e-12 < (this.joinedAt.get(vesselId) ?? 0)) continue;
      const vessel = vessels[vesselId];
      if (!vessel) {
        this.activeRuntimes.delete(vesselId);
        this.joinedAt.delete(vesselId);
        continue;
      }

      const controller = getReactionController(runtime.reactionId);
      runtime.agitation = activeTool === 'stirring_rod' && useAppStore.getState().selectedVesselId === vesselId ? 0.85 : 0.0;

      const context = this.createContext(runtime, vessel, dt, timeScale);

      if (controller) {
        controller.update(context);
        if (controller.updateSurface) controller.updateSurface(context);
        if (controller.updateGas) controller.updateGas(context);
        if (controller.updateLiquid) controller.updateLiquid(context);
        if (controller.updateSolids) controller.updateSolids(context);
      }
      if (runtime.chemistryProgress !== undefined && Number.isFinite(runtime.chemistryProgress)) {
        runtime.progress = Math.max(0, Math.min(1, runtime.chemistryProgress));
        runtime.elapsed = runtime.progress * runtime.duration;
        runtime.temperature = vessel.temperature_c;
        runtime.gasGenerationRate = gasVisualState(vessel).bubbleRate;
      }

      // Check for completion
      if (runtime.progress >= 1.0) {
        if (controller) {
          controller.finalize(context);
        }
        this.activeRuntimes.delete(vesselId);
        this.joinedAt.delete(vesselId);
      }
    }
  }

  /**
   * Manually scrubs reaction timeline (0..1) for testing & developer gallery.
   */
  public scrubReaction(vesselId: string, targetProgress: number): void {
    const runtime = this.activeRuntimes.get(vesselId);
    if (!runtime) return;

    const controller = getReactionController(runtime.reactionId);
    const vessel = useAppStore.getState().vessels[vesselId];
    if (!vessel) return;

    runtime.progress = Math.max(0, Math.min(1.0, targetProgress));
    runtime.elapsed = runtime.progress * runtime.duration;

    if (controller) {
      const context = this.createContext(runtime, vessel, 0.016);
      controller.update(context);
    }
  }

  /**
   * Returns runtime state for telemetry debugging.
   */
  public getRuntime(vesselId: string): ReactionRuntime | undefined {
    return this.activeRuntimes.get(vesselId);
  }

  /** Chemistry owns the lifetime; a visual controller cannot outlive its run. */
  public retainVessels(vesselIds: ReadonlySet<string>): void {
    for (const id of this.activeRuntimes.keys()) {
      if (!vesselIds.has(id)) this.stopReaction(id);
    }
  }

  public stopReaction(vesselId: string): void {
    const runtime = this.activeRuntimes.get(vesselId);
    const vessel = useAppStore.getState().vessels[vesselId];
    if (runtime) {
      const controller = getReactionController(runtime.reactionId);
      if (controller && vessel) controller.finalize(this.createContext(runtime, vessel, 0));
      runtime.gasGenerationRate = 0;
      runtime.precipitateRate = 0;
      runtime.reactionRate = 0;
      runtime.heatReleaseRate = 0;
    }
    this.activeRuntimes.delete(vesselId);
    this.joinedAt.delete(vesselId);
  }

  public resetAll(): void {
    for (const id of [...this.activeRuntimes.keys()]) this.stopReaction(id);
    this.accumulator = 0;
    this.acceptedTime_s = 0;
    this.integratedTime_s = 0;
    this.joinedAt.clear();
  }

  private createContext(
    runtime: ReactionRuntime,
    vessel: any,
    dt: number,
    timeScale: number = 1.0
  ): ReactionContext {
    return {
      vessel,
      runtime,
      dt,
      timeScale,
      addSurfaceImpulse: (normX, normZ, amplitude, radiusSigma = 0.08) => {
        // Direct coupling with surface ripples (fixing F5)
        vfxBus.emit('surface:ripple', {
          x: normX,
          z: normZ,
          intensity: amplitude,
          vesselId: vessel.id
        });
      },
      emitBurst: (pos, count, color = '#ffffff', speed = 1.5) => {
        vfxBus.emit('particle:burst', {
          vesselId: vessel.id,
          position: [vessel.position[0] + pos[0], vessel.position[1] + pos[1], vessel.position[2] + pos[2]],
          count,
          color,
          speed,
        });
      },
      emitSparks: (pos, count, color = '#f59e0b') => {
        // Distinct sparks event on bus (fixing F5)
        vfxBus.emit('sparks', {
          position: [vessel.position[0] + pos[0], vessel.position[1] + pos[1], vessel.position[2] + pos[2]],
          count,
          color,
          speed: 3.5,
        });
      },
      playSound: (soundId: string) => {
        // Comprehensive mapping to procedural WebAudio synthesis (fixing F5)
        if (soundId === 'fizz') labSound.playFizz();
        else if (soundId === 'boil') labSound.playBoil();
        else if (soundId === 'bubble' || soundId === 'minnaert') labSound.playMinnaertBubble();
        else if (soundId === 'pop') labSound.playPop();
        else if (soundId === 'ignite') labSound.playBurnerIgnite();
        else if (soundId === 'alarm') labSound.playWarningAlarm();
        else if (soundId === 'pour') labSound.playLiquidPour();
        else if (soundId === 'sodium_sizzle' || soundId === 'sizzle') labSound.playSodiumSizzlePop();
        else if (soundId === 'glass_shatter' || soundId === 'shatter') labSound.playGlassShatter();
        else if (soundId === 'explosion') labSound.playExplosion();
        else if (soundId === 'clink' || soundId === 'tap') labSound.playGlassClink();
        else if (soundId === 'bumping') labSound.playBumpingSurge();
        else if (soundId === 'stir') labSound.playStir();
        else if (soundId === 'droplet' || soundId === 'drop') labSound.playDroplet();
        else if (soundId === 'powder' || soundId === 'solid_drop') labSound.playSolidDrop();
        else if (soundId === 'grind') labSound.playPestleGrind();
        else if (soundId === 'wipe') labSound.playSpongeWipe();
        else if (soundId === 'success') labSound.playSuccess();
      },
    };
  }
}

export const reactionSimulationEngine = ReactionSimulationEngine.getInstance();
