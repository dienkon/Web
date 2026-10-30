export interface AnimatedStockDose {
  id: number;
  chemical: string;
  targetId: string;
  type: 'liquid' | 'solid' | 'gas';
  amount: number;
  releasedAmount: number;
  awaitingContact: boolean;
}
interface Delivery { id: number; targetId: string; chemical: string; amount: number }

/** Serialize contact transactions. A slow resolver may coalesce later contacts,
 * but can never overlap two chemistry writes or replay already delivered matter. */
export class AnimatedDoseQueue {
  private jobs: Delivery[] = [];
  private running: Promise<void> | null = null;
  constructor(private deliver: (job: Delivery) => Promise<void>, private onError: (error: unknown) => void) {}

  enqueue(job: Delivery): Promise<void> {
    if (!Number.isFinite(job.amount) || job.amount <= 0) return this.running ?? Promise.resolve();
    const pending = this.jobs.find(item => item.id === job.id);
    if (pending) pending.amount += job.amount;
    else this.jobs.push({ ...job });
    if (!this.running) this.start();
    return this.idle();
  }
  private start() {
    this.running = this.drain().finally(() => {
      this.running = null;
      if (this.jobs.length) this.start();
    });
  }
  private async idle(): Promise<void> {
    while (this.running) await this.running;
  }
  private async drain() {
    while (this.jobs.length) {
      const job = this.jobs.shift()!;
      try { await this.deliver(job); }
      catch (error) { this.onError(error); }
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
