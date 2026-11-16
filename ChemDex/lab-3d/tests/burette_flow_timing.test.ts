import { describe, expect, it } from 'vitest';
import { BuretteFlowClock } from '../src/handling/buretteFlow';

describe('metered burette event timing', () => {
  it.each([1, 2])('integrates exact finite doses at %smL/s and reports their within-frame ages', flow => {
    const clock = new BuretteFlowClock(), ages: number[] = [];
    let available = 1;
    const moved = clock.step(.2, true, flow, available, age => {
      ages.push(age); available -= .05; return .05;
    });
    expect(moved).toBeCloseTo(.2 * flow, 12);
    expect(ages).toHaveLength(4 * flow);
    ages.forEach((age, i) => expect(age).toBeCloseTo(.2 - (i + 1) * .05 / flow, 12));
    expect(available + moved).toBeCloseTo(1, 12);
  });

  it('produces the same release time across partitioned frames and retains only fractional pending time', () => {
    const clock = new BuretteFlowClock();
    let elapsed = 0, available = 1;
    const times: number[] = [];
    for (const dt of [.013, .024, .039, .1, .024]) {
      elapsed += dt;
      clock.step(dt, true, 1, available, age => { times.push(elapsed - age); available -= .05; return .05; });
    }
    expect(times).toHaveLength(4);
    times.forEach((t, i) => expect(t).toBeCloseTo(.05 * (i + 1), 12));
  });

  it('keeps a finite final partial drop and clears rejected debt instead of bursting on resume', () => {
    const clock = new BuretteFlowClock(), ages: number[] = [];
    const moved = clock.step(.2, true, 1, .02, age => { ages.push(age); return .02; });
    expect(moved).toBe(.02); expect(ages[0]).toBeCloseTo(.18, 12);
    expect(clock.step(.01, true, 1, 1, () => .05)).toBe(0);
    expect(clock.step(.1, true, 1, 1, () => 0)).toBe(0);
    expect(clock.step(.01, true, 1, 1, () => .05)).toBe(0);
    expect(clock.step(.2, false, 1, 1, () => .05)).toBe(0);
  });

  it('freezes pending time at dt zero and bounds exceptional frame work', () => {
    const clock = new BuretteFlowClock(); let count = 0;
    clock.step(.02, true, 1, 100, () => { count++; return .05; });
    clock.step(0, true, 1, 100, () => { count++; return .05; }); expect(count).toBe(0);
    clock.step(.03, true, 1, 100, () => { count++; return .05; }); expect(count).toBe(1);
    const moved = clock.step(100, true, 2, 100, () => { count++; return .05; });
    expect(moved).toBeCloseTo(64 * .05, 12); expect(count).toBe(65);
  });
});
