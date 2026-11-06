/** Metered drops on the simulation clock. This class owns timing only: the
 * receipt callback is the sole owner of liquid removal and acceptance. */
export class BuretteFlowClock {
  private pending_s = 0;
  public step(dt: number, enabled: boolean, flow_ml_s: number, available_ml: number, dispense: () => number): number {
    if (!enabled || !Number.isFinite(flow_ml_s) || flow_ml_s <= 0 || !Number.isFinite(available_ml) || available_ml <= 0) {
      this.pending_s = 0; return 0;
    }
    if (!Number.isFinite(dt) || dt <= 0) return 0;
    this.pending_s += dt;
    let moved = 0;
    for (let n = 0; n < 64 && available_ml > 1e-12; n++) {
      const interval = Math.min(0.05, available_ml) / flow_ml_s;
      if (this.pending_s + 1e-12 < interval) break;
      const receipt = dispense();
      if (!Number.isFinite(receipt) || receipt <= 0) { this.pending_s = 0; break; }
      this.pending_s = Math.max(0, this.pending_s - receipt / flow_ml_s);
      available_ml = Math.max(0, available_ml - receipt); moved += receipt;
    }
    if (available_ml <= 1e-12) this.pending_s = 0;
    return moved;
  }
}
