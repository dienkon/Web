import { describe, expect, it } from 'vitest';
import { AutoExperiment, AUTO_TIMING, donorHome } from '../AutoExperiment';

function advanceUntil(e: AutoExperiment, condition: () => boolean, maximum = 30) {
  for (let frame = 0; !condition() && frame < maximum * 60; frame++) e.tick(1 / 60);
  expect(condition()).toBe(true);
}
describe('automatic transfer choreography', () => {
  it('starts with a clean empty receiver and doses solvent only after lifting, tilting and flight', () => {
    const e = new AutoExperiment('cuso4_naoh', false);
    expect(e.sample.mass_g).toBe(0);
    expect(e.sample.contents).toEqual([]);
    expect(e.donors[0].row.formula).toBe('H2O');
    const total = e.donors.reduce((sum, d) => sum + d.remaining, 0);
    advanceUntil(e, () => e.phase === 'dose');
    expect(e.sample.mass_g).toBe(0);
    const start = e.donorPose;
    advanceUntil(e, () => e.phaseTime >= AUTO_TIMING.tilt);
    expect(e.streamActive).toBe(true);
    expect(e.sample.mass_g).toBe(0);
    advanceUntil(e, () => e.phaseTime > AUTO_TIMING.tilt + AUTO_TIMING.flight + 0.1);
    expect(e.sample.mass_g).toBeGreaterThan(0);
    expect(e.donors[0].remaining).toBeLessThan(e.donors[0].row.mass_g);
    expect(e.sample.mass_g + e.donors.reduce((sum, d) => sum + d.remaining, 0)).toBeCloseTo(total, 9);
    expect(e.donorPose.position).toEqual(start.position);
    advanceUntil(e, () => e.phase === 'return');
    expect(e.donors[0].fraction).toBe(1);
    expect(e.streamActive).toBe(false);
    expect(e.donorPoseAt(0).tilt).toBeLessThan(-1.5);
    expect(e.donorPoseAt(AUTO_TIMING.upright).position).toEqual(start.position);
    expect(e.donorPoseAt(AUTO_TIMING.upright).tilt).toBeCloseTo(0);
    e.donorPoseAt(AUTO_TIMING.upright + AUTO_TIMING.return).position.forEach((value, i) => expect(value).toBeCloseTo(donorHome(0)[i]));
  });

  it('keeps chemistry and doses identical at 30 and 120 render frames per second', () => {
    const slow = new AutoExperiment('cuso4_naoh', false), fast = new AutoExperiment('cuso4_naoh', false);
    for (let i = 0; i < 30 * 35; i++) slow.tick(1 / 30);
    for (let i = 0; i < 120 * 35; i++) fast.tick(1 / 120);
    expect(slow.phase).toBe(fast.phase);
    expect(slow.sample.contents).toEqual(fast.sample.contents);
    expect(slow.progress).toBe(fast.progress);
    expect(slow.donors.map(d => d.remaining)).toEqual(fast.donors.map(d => d.remaining));
  });

  it('freezes every clock and transfer while paused and does not carry items to a fresh run', () => {
    const e = new AutoExperiment('cuso4_naoh', false);
    advanceUntil(e, () => e.sample.mass_g > 0);
    e.paused = true;
    const before = { elapsed: e.elapsed, time: e.phaseTime, sample: e.sample, pose: e.donorPose };
    e.tick(0.1);
    expect({ elapsed: e.elapsed, time: e.phaseTime, sample: e.sample, pose: e.donorPose }).toEqual(before);
    const next = new AutoExperiment('nh3_hcl', false);
    expect(next.sample.mass_g).toBe(0);
    expect(next.clouds.clouds.size).toBe(0);
    expect(next.donors.every(d => ['NH3', 'HCl'].includes(d.row.formula))).toBe(true);
  });
});
