export class SimulationClock {
  private static timeScale = 1.0;
  private static accumulator = 0;
  private static readonly fixedStep = 1 / 20;

  static tick(delta: number, isPaused: boolean, step?: (dt: number) => void): number {
    if (isPaused) return 0;

    const scaledDelta = Math.min(0.1, Math.max(0, delta)) * this.timeScale;
    this.accumulator += scaledDelta;
    let steps = 0;
    while (this.accumulator >= this.fixedStep && steps < 4) {
      step?.(this.fixedStep);
      this.accumulator -= this.fixedStep;
      steps += 1;
    }
    return steps * this.fixedStep;
  }

  static reset(): void {
    this.accumulator = 0;
  }

  static setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale);
  }
}
