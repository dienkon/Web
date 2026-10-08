
export class SimulationClock {
  private static timeScale: number = 1.0;
  private static lastTick: number = 0;
  
  static tick(delta: number, isPaused: boolean) {
    if (isPaused) return 0;
    return delta * this.timeScale;
  }
  
  static setTimeScale(scale: number) {
    this.timeScale = scale;
  }
}
