import { describe, expect, it } from 'vitest';
import { brownianDiffusivity } from '../src/science/brownianDiffusion';
import { PRNG } from '../src/core/rng';

describe('Stokes–Einstein diffusion', () => {
  it('has SI scaling with physical radius, viscosity and absolute temperature', () => {
    const d = brownianDiffusivity(1e-6, 0.001, 25);
    expect(d / 2.183820674945621e-13).toBeCloseTo(1, 8);
    expect(brownianDiffusivity(2e-6, 0.001, 25)).toBeCloseTo(d / 2, 24);
    expect(brownianDiffusivity(1e-6, 0.002, 25)).toBeCloseTo(d / 2, 24);
    expect(brownianDiffusivity(1e-6, 0.001, 50) / d).toBeCloseTo(323.15 / 298.15, 12);
    for (const radius of [0, -1, Infinity, NaN]) expect(brownianDiffusivity(radius, 0.001, 25)).toBe(0);
  });
  it('produces reproducible zero-mean increments with variance 2 D dt', () => {
    const rng = new PRNG(422), again = new PRNG(422), dt = 0.1;
    const variance = 2 * brownianDiffusivity(1e-7, 0.001, 25) * dt;
    let sum = 0, square = 0;
    for (let i = 0; i < 10000; i++) {
      const x = rng.gaussian(0, Math.sqrt(variance));
      expect(x).toBe(again.gaussian(0, Math.sqrt(variance)));
      sum += x; square += x * x;
    }
    expect(Math.abs(sum / 10000) / Math.sqrt(variance)).toBeLessThan(0.04);
    expect(Math.abs(square / 10000 / variance - 1)).toBeLessThan(0.05);
  });
});
