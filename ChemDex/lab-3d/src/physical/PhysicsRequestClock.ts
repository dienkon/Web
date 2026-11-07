/** Bound each worker request while preserving elapsed time under CPU load.
 * Pausing discards unprocessed wall time, so resume cannot replay old input. */
export class PhysicsRequestClock {
  private pending_s = 0;
  reset() { this.pending_s = 0; }
  accumulate(seconds: number, paused: boolean) {
    if (paused) this.reset();
    else this.pending_s += seconds;
  }
  get ready() { return this.pending_s + 1e-12 >= 1 / 30; }
  take() {
    const seconds = Math.min(1 / 30, this.pending_s);
    this.pending_s = Math.max(0, this.pending_s - seconds);
    return seconds;
  }
}
