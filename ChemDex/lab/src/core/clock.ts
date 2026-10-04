/**
 * SIMULATION CLOCK & FIXED-TIMESTEP ACCUMULATOR
 * Main Loop Specification (§2):
 * - Fixed physical substep DT_SIM = 1/120 s (~8.33 ms)
 * - Frame dt clamp: min(frameDt, 0.1 s)
 * - Maximum substeps per frame cap (<= 8) to prevent spiral of death
 * - Configurable time scale multiplier (1x, 2x, 5x, 10x, 30x)
 * - Pausing support
 */

export class SimClock {
  public static readonly DT_SIM: number = 1.0 / 120.0; // 120 Hz internal physics substep
  public static readonly MAX_SUBSTEPS: number = 8;     // Spiral-of-death guard

  public accumulator: number = 0;
  public timeScale: number = 1.0;
  public isPaused: boolean = false;
  public totalSimTime: number = 0; // Simulated seconds elapsed
  public totalTicks: number = 0;   // Number of DT_SIM steps executed

  constructor(timeScale: number = 1.0) {
    this.timeScale = timeScale;
  }

  public setTimeScale(scale: number): void {
    this.timeScale = Math.max(0.1, Math.min(60.0, scale));
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
    if (this.isPaused || frameDt <= 0) return 0;

    // Clamp frameDt to 100ms to avoid spiral of death on background tab return
    const clampedFrameDt = Math.min(frameDt, 0.1);
    this.accumulator += clampedFrameDt * this.timeScale;

    let stepsExecuted = 0;
    while (this.accumulator >= SimClock.DT_SIM && stepsExecuted < SimClock.MAX_SUBSTEPS) {
      this.totalTicks++;
      this.totalSimTime += SimClock.DT_SIM;
      onSubstep(SimClock.DT_SIM, this.totalSimTime);
      this.accumulator -= SimClock.DT_SIM;
      stepsExecuted++;
    }

    // If accumulated time is still excessive, drop remainder
    if (this.accumulator > SimClock.DT_SIM * 2) {
      this.accumulator = 0;
    }

    return stepsExecuted;
  }
}

export const defaultClock = new SimClock();
