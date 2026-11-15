export interface AnimatedStockDose {
  id: number;
  chemical: string;
  targetId: string;
  type: 'liquid' | 'solid' | 'gas';
  amount: number;
  releasedAmount: number;
  awaitingContact: boolean;
  source?: { kind: 'spatula'; color: string };
}
export interface DoseDelivery { id: number; targetId: string; chemical: string; amount: number; contacts?: import('../physical/stockTypes').StockContactBirth[] }

/** Serialize contact transactions. A slow resolver may coalesce later contacts,
 * but can never overlap two chemistry writes or replay already delivered matter. */
export class AnimatedDoseQueue {
  private jobs: DoseDelivery[] = [];
  private running: Promise<void> | null = null;
  private generation = 0;
  constructor(private deliver: (job: DoseDelivery) => Promise<void | boolean>, private onError: (error: unknown) => void,
    private onSettled?: (job: DoseDelivery, accepted: boolean) => void, private onBusyChange?: (busy: boolean) => void) {}

  /** Retire old callbacks before replacing the whole bench. A slow old resolver
   * must neither block fresh doses nor settle/refund into the new inventory. */
  reset() {
    this.generation++;
    this.jobs = [];
    this.running = null;
    this.onBusyChange?.(false);
  }

  enqueue(job: DoseDelivery): Promise<void> {
    if (!Number.isFinite(job.amount) || job.amount <= 0) return this.running ?? Promise.resolve();
    const pending = this.jobs.find(item => item.id === job.id);
    if (pending) { pending.amount += job.amount; if (job.contacts) pending.contacts = [...(pending.contacts ?? []), ...job.contacts]; }
    else this.jobs.push({ ...job });
    if (!this.running) this.start();
    return this.idle();
  }
  private start() {
    const generation = this.generation;
    this.onBusyChange?.(true);
    this.running = this.drain(generation).finally(() => {
      if (generation !== this.generation) return;
      this.running = null;
      if (this.jobs.length) this.start();
      else this.onBusyChange?.(false);
    });
  }
  private async idle(): Promise<void> {
    while (this.running) await this.running;
  }
  private async drain(generation: number) {
    while (generation === this.generation && this.jobs.length) {
      const job = this.jobs.shift()!;
      let accepted = false;
      try { accepted = (await this.deliver(job)) !== false; }
      catch (error) { if (generation === this.generation) this.onError(error); }
      finally { if (generation === this.generation) this.onSettled?.(job, accepted); }
    }
  }
}

/** A contact callback is cumulative, so repeats and older animation frames are
 * harmless. Reservation happens before the asynchronous chemistry operation. */
export function releaseDoseAmount(dose: AnimatedStockDose, fraction: number) {
  if (!Number.isFinite(fraction)) return { dose, amount: 0 };
  const released = Math.max(dose.releasedAmount, dose.amount * Math.max(0, Math.min(1, fraction)));
  const amount = Math.max(0, released - dose.releasedAmount);
  return { dose: { ...dose, releasedAmount: released, awaitingContact: released < dose.amount }, amount };
}
