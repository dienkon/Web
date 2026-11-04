import { describe, expect, it } from 'vitest';
import { AdaptiveQualityController } from '../src/render/adaptiveQuality';

const fast = { ms: 1000 / 60, p95_ms: 18, samples: 60 };
const slow = { ms: 30, p95_ms: 40, samples: 34 };
const stalled = { ms: 125, p95_ms: 150, samples: 8 };

describe('Complete-frame quality feedback', () => {
  it('recovers from heavy reactions without disabling future monitoring', () => {
    const controller = new AdaptiveQualityController();
    expect(controller.sample(stalled, 'medium')).toBeUndefined();
    expect(controller.sample(stalled, 'medium')).toBeUndefined();
    expect(controller.sample(stalled, 'medium')).toBe('decline');
    controller.sample(stalled, 'low');
    controller.sample(stalled, 'low');
    expect(controller.sample(stalled, 'low')).toBe('decline');
    for (let i = 0; i < 35; i++) controller.sample(fast, 'potato');
    expect(controller.sample(stalled, 'low')).toBeUndefined();
    controller.sample(stalled, 'low');
    expect(controller.sample(stalled, 'low')).toBe('decline');
  });
  it('requires sustained headroom and can upgrade on a 60 Hz display', () => {
    const controller = new AdaptiveQualityController();
    for (let i = 0; i < 13; i++) expect(controller.sample(fast, 'medium')).toBeUndefined();
    expect(controller.sample(fast, 'medium')).toBe('incline');
    for (let i = 0; i < 30; i++) expect(controller.sample(fast, 'high')).toBeUndefined();
  });
  it('ignores switch transients, invalid windows and isolated slow frames', () => {
    const controller = new AdaptiveQualityController();
    for (let i = 0; i < 4; i++) controller.sample(fast, 'medium');
    expect(controller.sample(slow, 'medium')).toBeUndefined();
    expect(controller.sample(fast, 'medium')).toBeUndefined();
    expect(controller.sample({ ...slow, ms: NaN }, 'medium')).toBeUndefined();
    expect(controller.sample({ ...slow, samples: 0 }, 'medium')).toBeUndefined();
    expect(controller.sample(slow, 'medium')).toBeUndefined();
    expect(controller.sample(slow, 'medium')).toBe('decline');
    expect(controller.sample(stalled, 'low')).toBeUndefined();
  });
  it('holds upgrades after a downgrade and resets when automation is disabled', () => {
    const controller = new AdaptiveQualityController();
    for (let i = 0; i < 3; i++) controller.sample(stalled, 'high');
    for (let i = 0; i < 29; i++) expect(controller.sample(fast, 'medium')).toBeUndefined();
    expect(controller.sample(fast, 'medium')).toBe('incline');
    controller.reset();
    expect(controller.sample(stalled, 'medium')).toBeUndefined();
  });
});
