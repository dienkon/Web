import type { QualityTier } from '../vfx/quality';

export interface QualityFrameSample {
  ms: number;
  p95_ms: number;
  samples: number;
}

/** Complete-frame feedback. Downgrade quickly under load, but require sustained
 * headroom before rebuilding expensive effects. Never stops monitoring. */
export class AdaptiveQualityController {
  private tier?: QualityTier;
  private settledSeconds = 0;
  private slowSeconds = 0;
  private fastSeconds = 0;
  private upgradeDelay = 0;

  reset() {
    this.tier = undefined;
    this.settledSeconds = this.slowSeconds = this.fastSeconds = this.upgradeDelay = 0;
  }

  sample(stats: QualityFrameSample, tier: QualityTier): 'decline' | 'incline' | undefined {
    if (![stats.ms, stats.p95_ms, stats.samples].every(Number.isFinite)
      || stats.ms <= 0 || stats.p95_ms <= 0 || stats.samples <= 0) return;
    if (this.tier !== tier) {
      this.tier = tier;
      this.settledSeconds = this.slowSeconds = this.fastSeconds = 0;
    }
    // A stalled frame must not count as many seconds of sustained evidence.
    const seconds = Math.min(1.25, stats.ms * stats.samples / 1000);
    this.upgradeDelay = Math.max(0, this.upgradeDelay - seconds);
    this.settledSeconds += seconds;
    // Ignore shader compilation and buffer allocation immediately after a switch.
    if (this.settledSeconds < 3) return;
    const slow = stats.ms > 22 || stats.p95_ms > 35;
    const fast = stats.ms < 17.5 && stats.p95_ms < 22;
    this.slowSeconds = slow ? this.slowSeconds + seconds : 0;
    this.fastSeconds = fast ? this.fastSeconds + seconds : 0;
    if (tier !== 'potato' && (stats.ms > 50 || this.slowSeconds >= 2)) {
      this.upgradeDelay = 30;
      this.slowSeconds = this.fastSeconds = 0;
      return 'decline';
    }
    // Ultra remains available explicitly; auto reserves GPU headroom for reactions.
    if (tier !== 'high' && tier !== 'ultra' && this.upgradeDelay === 0 && this.fastSeconds >= 12) {
      this.fastSeconds = 0;
      return 'incline';
    }
  }
}
