export interface SpatulaSample { chemical: string; mass_g: number; color: string }
interface Reservation { sample: SpatulaSample; released: number; pending: number; closed: boolean }

/** The scoop is reserved once. Contacted jobs remain reserved until chemistry
 * acknowledges them; cancelling can return only matter that was not accepted. */
export class SpatulaDoseReservations {
  private doses = new Map<number, Reservation>();
  clear() { this.doses.clear(); }
  get occupied() { return this.doses.size > 0; }
  begin(id: number, sample: SpatulaSample) {
    if (this.occupied || !sample.chemical || !Number.isFinite(sample.mass_g) || sample.mass_g <= 0) return false;
    this.doses.set(id, { sample: { ...sample }, released: 0, pending: 0, closed: false });
    return true;
  }
  release(id: number, amount: number) {
    const dose = this.doses.get(id);
    if (!dose || dose.closed) return;
    const released = Math.min(Math.max(0, amount), dose.sample.mass_g - dose.released);
    dose.released += released;
    dose.pending += released;
  }
  close(id: number): SpatulaSample | null {
    const dose = this.doses.get(id);
    if (!dose || dose.closed) return null;
    dose.closed = true;
    const amount = Math.max(0, dose.sample.mass_g - dose.released);
    if (dose.pending <= dose.sample.mass_g * Number.EPSILON * 32) this.doses.delete(id);
    return amount > 0 ? { ...dose.sample, mass_g: amount } : null;
  }
  settle(id: number, amount: number, accepted: boolean): SpatulaSample | null {
    const dose = this.doses.get(id);
    if (!dose) return null;
    const resolved = Math.min(dose.pending, Math.max(0, amount));
    dose.pending = Math.max(0, dose.pending - resolved);
    if (dose.closed && dose.pending <= dose.sample.mass_g * Number.EPSILON * 32) this.doses.delete(id);
    return !accepted && resolved > 0 ? { ...dose.sample, mass_g: resolved } : null;
  }
}
