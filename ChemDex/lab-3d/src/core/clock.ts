/**
 * SIMULATION CLOCK & FIXED-TIMESTEP ACCUMULATOR
 * Main Loop Specification (§2):
 * - Fixed physical substep DT_SIM = 1/120 s (~8.33 ms)
 * - Frame dt clamp: min(frameDt, 0.1 s)
 * - Bounded work per call; retain exceptional backlog instead of dropping it
 * - Supported application time scale 0.1x–8x
 * - Pausing support
 */

export const MAX_FRAME_SECONDS = 0.1;
export function acceptedFrameSeconds(frameDt: number): number {
  return Number.isFinite(frameDt) && frameDt > 0 ? Math.min(frameDt, MAX_FRAME_SECONDS) : 0;
}
export function simulationFrameDt(frameDt: number, state: { timeScale: number; isSimulationPaused: boolean }): number {
  if (state.isSimulationPaused || !Number.isFinite(state.timeScale) || state.timeScale <= 0) return 0;
  const dt = acceptedFrameSeconds(frameDt) * state.timeScale;
  return Number.isFinite(dt) ? dt : 0;
}

export class SimClock {
  public static readonly DT_SIM: number = 1.0 / 120.0; // 120 Hz internal physics substep
  public static readonly MAX_SUBSTEPS: number = 240;   // Retains backlog beyond this work limit

  public accumulator: number = 0;
  public timeScale: number = 1.0;
  public isPaused: boolean = false;
  public totalSimTime: number = 0; // Simulated seconds elapsed
  public totalTicks: number = 0;   // Number of DT_SIM steps executed

  constructor(timeScale: number = 1.0) {
    this.timeScale = timeScale;
  }

  public setTimeScale(scale: number): void {
    if (Number.isFinite(scale) && scale >= 0.1 && scale <= 8) this.timeScale = scale;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  public reset(): void {
    this.accumulator = 0;
    this.totalSimTime = 0;
    this.totalTicks = 0;
  }

  /**
   * Advances accumulator by frameDt and executes substep callback for each DT_SIM slice.
   * Returns the number of substeps actually executed in this frame.
   */
  public tick(frameDt: number, onSubstep: (dt: number, totalTime: number) => void): number {
    const delta = simulationFrameDt(frameDt, { timeScale: this.timeScale, isSimulationPaused: this.isPaused });
    if (delta <= 0) return 0;

    // Clamp frameDt to 100ms to avoid spiral of death on background tab return
    this.accumulator += delta;

    let stepsExecuted = 0;
    while (this.accumulator + 1e-12 >= SimClock.DT_SIM && stepsExecuted < SimClock.MAX_SUBSTEPS) {
      this.totalTicks++;
      this.totalSimTime += SimClock.DT_SIM;
      onSubstep(SimClock.DT_SIM, this.totalSimTime);
      this.accumulator = Math.max(0, this.accumulator - SimClock.DT_SIM);
      stepsExecuted++;
    }

    return stepsExecuted;
  }
}

export const defaultClock = new SimClock();
