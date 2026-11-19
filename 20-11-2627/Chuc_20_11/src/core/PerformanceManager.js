import { tribute } from '../config.js';

export class PerformanceManager {
  constructor() {
    const lite = matchMedia('(pointer: coarse)').matches || (navigator.deviceMemory ?? 8) <= 4;
    const fast = !lite && (navigator.deviceMemory ?? 8) >= 8 && navigator.hardwareConcurrency >= 12;
    this.tier = lite ? 'mobile' : fast ? 'ultra' : 'standard';
    this.slowWindows = 0;
    this.reset();
  }

  get quality() { return tribute.quality[this.tier]; }

  get ratio() { return Math.min(window.devicePixelRatio || 1, this.quality.ratio); }

  reset() {
    this.sample = { total: 0, frames: 0 };
    this.warmup = 1100;
  }

  observe(milliseconds) {
    if (this.tier === 'mobile') return false;
    if (this.warmup > 0) {
      this.warmup -= milliseconds;
      return false;
    }
    this.sample.total += milliseconds;
    this.sample.frames++;
    if (this.sample.total < 1450) return false;
    const average = this.sample.total / this.sample.frames;
    this.sample = { total: 0, frames: 0 };
    this.slowWindows = average > 25 ? this.slowWindows + 1 : 0;
    if (this.slowWindows < 2) return false;
    this.tier = this.tier === 'ultra' ? 'standard' : 'mobile';
    this.slowWindows = 0;
    this.reset();
    return true;
  }
}
