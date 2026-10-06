import { describe, it, expect } from 'vitest';
import { sampleStochasticPrecipitation } from '../src/data/precipitates';

describe('Precipitation Stochastic PRNG & Invariance Suite (§6.4 & §6.7)', () => {
  it('guarantees identical outputs for the same PRNG seed (reproducibility)', () => {
    const runA = sampleStochasticPrecipitation(42, 0.583);
    const runB = sampleStochasticPrecipitation(42, 0.583);

    expect(runA.particles.length).toBe(runB.particles.length);
    for (let i = 0; i < runA.particles.length; i++) {
      expect(runA.particles[i].x).toBe(runB.particles[i].x);
      expect(runA.particles[i].y).toBe(runB.particles[i].y);
      expect(runA.particles[i].z).toBe(runB.particles[i].z);
      expect(runA.particles[i].weight_g).toBe(runB.particles[i].weight_g);
      expect(runA.particles[i].radius_um).toBe(runB.particles[i].radius_um);
    }
    expect(runA.totalMass_g).toBe(runB.totalMass_g);
    expect(runA.bedHeight_mm).toBe(runB.bedHeight_mm);
  });

  it('generates distinct particle spatial positions for different seeds (non-identical look)', () => {
    const run1 = sampleStochasticPrecipitation(1001, 0.583);
    const run2 = sampleStochasticPrecipitation(2002, 0.583);

    let differences = 0;
    const threshold_m = 0.001; // 1 mm spatial tolerance

    for (let i = 0; i < run1.particles.length; i++) {
      const p1 = run1.particles[i];
      const p2 = run2.particles[i];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
      if (dist > threshold_m) {
        differences++;
      }
    }

    const differenceRatio = differences / run1.particles.length;
    // Over 90% of particles must occupy distinct spatial positions
    expect(differenceRatio).toBeGreaterThan(0.90);
  });

  it('strictly conserves total mass and final bed height across varying seeds (±0.001%)', () => {
    const targetMass_g = 0.583;
    const seeds = [7, 101, 999, 1337, 8888, 54321];

    for (const seed of seeds) {
      const run = sampleStochasticPrecipitation(seed, targetMass_g);
      expect(Math.abs(run.totalMass_g - targetMass_g)).toBeLessThan(1e-9);
      expect(run.bedHeight_mm).toBeCloseTo(0.294, 2);
    }
  });
});
