import { SimClock } from '../../core/clock';

/** Quantitative effects advance on fixed ticks, outside renderer callbacks.
 * Rendering quality may change glyph budgets, never the accepted physical time. */
export class PhysicalEffectsRuntime {
  readonly clock = new SimClock();
  private steps = new Map<string, { token: object; step: (dt: number) => void }>();
  register(id: string, step: (dt: number) => void) {
    const token = {}; this.steps.set(id, { token, step });
    return () => { if (this.steps.get(id)?.token === token) this.steps.delete(id); };
  }
  advance(frameDt: number, paused: boolean, timeScale: number) {
    this.clock.setPaused(paused); this.clock.setTimeScale(timeScale);
    return this.clock.tick(frameDt, dt => { for (const { step } of this.steps.values()) step(dt); });
  }
  reset() { this.clock.reset(); }
}
export const physicalEffectsRuntime = new PhysicalEffectsRuntime();
