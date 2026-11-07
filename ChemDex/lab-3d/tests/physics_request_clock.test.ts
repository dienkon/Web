import { describe, expect, it } from 'vitest';
import { PhysicsRequestClock } from '../src/physical/PhysicsRequestClock';

describe('worker request backpressure', () => {
  it('bounds work after a slow response and eventually consumes every elapsed second', () => {
    const clock = new PhysicsRequestClock();
    clock.accumulate(3, false);
    let total = 0, requests = 0;
    while (clock.ready) {
      const seconds = clock.take();
      expect(seconds).toBeLessThanOrEqual(1 / 30);
      total += seconds; requests++;
    }
    expect(requests).toBe(90);
    expect(total).toBeCloseTo(3, 10);
  });
  it('clears delayed wall time during pause, including while a request is busy', () => {
    const clock = new PhysicsRequestClock();
    clock.accumulate(5, false);
    clock.accumulate(1, true);
    expect(clock.take()).toBe(0);
    clock.accumulate(1 / 120, false);
    expect(clock.take()).toBeCloseTo(1 / 120, 12);
  });
});
