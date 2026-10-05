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

    const runtime: ReactionRuntime = {
      reactionId,
      vesselId,
      progress: 0.0,
      reactionRate: 1.0,
      temperature: vessel.temperature_c || 25.0,
      reactantAvailability: {},
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

    this.activeRuntimes.set(vesselId, runtime);
    return runtime;
  }

  /**
   * Advances the simulation using a fixed-timestep accumulator.
   */
  public update(frameDelta: number, timeScale: number = 1.0): void {
    if (frameDelta <= 0) return;
    const clampedDelta = Math.min(frameDelta, 0.1) * timeScale;
    this.accumulator += clampedDelta;

    const maxSubSteps = 5;
    let stepCount = 0;

    while (this.accumulator >= this.fixedDt && stepCount < maxSubSteps) {
      this.stepFixed(this.fixedDt, timeScale);
      this.accumulator -= this.fixedDt;
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
      const vessel = vessels[vesselId];
      if (!vessel) {
        this.activeRuntimes.delete(vesselId);
        continue;
      }

      const controller = getReactionController(runtime.reactionId);
      runtime.agitation = activeTool === 'stirring_rod' ? 0.85 : 0.0;

      const context = this.createContext(runtime, vessel, dt, timeScale);

      if (controller) {
        controller.update(context);
        if (controller.updateSurface) controller.updateSurface(context);
        if (controller.updateGas) controller.updateGas(context);
        if (controller.updateLiquid) controller.updateLiquid(context);
        if (controller.updateSolids) controller.updateSolids(context);
      }

      // Check for completion
      if (runtime.progress >= 1.0) {
        if (controller) {
          controller.finalize(context);
        }
        this.activeRuntimes.delete(vesselId);
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

  public stopReaction(vesselId: string): void {
    this.activeRuntimes.delete(vesselId);
  }

  public resetAll(): void {
    this.activeRuntimes.clear();
    this.accumulator = 0;
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
