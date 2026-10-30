import { describe, expect, it } from 'vitest';
import { ConvectionSystem } from '../src/simulation/effects/ConvectionSystem';
import { VESSEL_PROFILES } from '../src/pour/physics/profiles';

const params = { temp_c: 60, ambientTemp_c: 25, heatPower_W: 10,
  viscosity_mPa_s: 1, radius: 1.2, liquidBottomY: -0.4, surfaceY: 2.6 };
const velocity = (x: number, y: number, z: number, p = params) =>
  ConvectionSystem.sampleVelocity(x, y, z, p);

describe('Closed incompressible prescribed convection', () => {
  it('has no flow through the cylinder boundaries or outside the domain', () => {
    for (const y of [params.liquidBottomY, params.surfaceY]) {
      for (const r of [0, 0.3, 0.9]) expect(velocity(r, y, 0)).toEqual([0, 0, 0]);
    }
    for (const y of [0, 1, 2]) expect(velocity(params.radius, y, 0)).toEqual([0, 0, 0]);
    expect(velocity(2, 1, 0)).toEqual([0, 0, 0]);
    expect(velocity(0, 3, 0)).toEqual([0, 0, 0]);
  });

  it.each([0.02, 0.3, 3, 8])('preserves continuity in a liquid column of height %s', height => {
    const p = { ...params, surfaceY: params.liquidBottomY + height };
    const step = 1e-5 * Math.min(height, p.radius);
    for (const q of [[0, 0], [0.2, 0.3], [0.8, 0.2]]) {
      const x = q[0] * p.radius, z = q[1] * p.radius;
      for (const fraction of [0.15, 0.5, 0.85]) {
        const y = p.liquidBottomY + height * fraction;
        const divergence = (velocity(x + step, y, z, p)[0] - velocity(x - step, y, z, p)[0]
          + velocity(x, y + step, z, p)[1] - velocity(x, y - step, z, p)[1]
          + velocity(x, y, z + step, p)[2] - velocity(x, y, z - step, p)[2]) / (2 * step);
        expect(Math.abs(divergence) * height).toBeLessThan(1e-7);
      }
    }
  });

  it('balances upward and downward volume flux across horizontal slices', () => {
    for (const fraction of [0.1, 0.5, 0.9]) {
      const y = params.liquidBottomY + (params.surfaceY - params.liquidBottomY) * fraction;
      let flux = 0;
      // Simpson quadrature keeps integration truncation below the continuity
      // assertion as density-dependent forcing changes the velocity scale.
      const intervals = 2000, dr = params.radius / intervals;
      for (let i = 0; i <= intervals; i++) {
        const r = i * dr, weight = i === 0 || i === intervals ? 1 : i % 2 ? 4 : 2;
        flux += weight * velocity(r, y, 0)[1] * 2 * Math.PI * r * dr / 3;
      }
      expect(Math.abs(flux)).toBeLessThan(1e-7);
    }
  });

  it('circulates upward centrally and returns near the wall without an axis singularity', () => {
    const mid = (params.liquidBottomY + params.surfaceY) / 2;
    const axis = velocity(0, mid, 0);
    expect(axis[0]).toBeCloseTo(0, 14);
    expect(axis[2]).toBeCloseTo(0, 14);
    expect(axis[1]).toBeGreaterThan(0);
    expect(velocity(0.9 * params.radius, mid, 0)[1]).toBeLessThan(0);
    expect(velocity(0.5, params.liquidBottomY + 0.75, 0)[0]).toBeLessThan(0);
    expect(velocity(0.5, params.surfaceY - 0.75, 0)[0]).toBeGreaterThan(0);
  });

  it('rejects empty or invalid liquid domains and remains still without heating', () => {
    for (const patch of [{ radius: 0 }, { surfaceY: -0.4 }, { viscosity_mPa_s: 0 },
      { heatPower_W: NaN }, { temp_c: Infinity }]) {
      expect(velocity(0, 1, 0, { ...params, ...patch })).toEqual([0, 0, 0]);
    }
    expect(velocity(NaN, 1, 0)).toEqual([0, 0, 0]);
    expect(velocity(0, 1, 0, { ...params, temp_c: 25, heatPower_W: 0 })).toEqual([0, 0, 0]);
  });

  it.each(Object.values(VESSEL_PROFILES))('respects the $type contour and continuity between contour corners', profile => {
    const p = { ...params, liquidBottomY: profile.baseY, surfaceY: profile.baseY + profile.H * 0.9,
      vesselProfile: profile };
    const sample = (x: number, y: number, z: number) => ConvectionSystem.sampleVelocity(x, y, z, p);
    for (let i = 1; i < profile.contour!.length; i++) {
      const lower = Math.max(profile.contour![i - 1][1], p.liquidBottomY);
      const upper = Math.min(profile.contour![i][1], p.surfaceY);
      if (upper - lower < 1e-6) continue;
      const y = (lower + upper) / 2, r = profile.r(y);
      if (r < 1e-6) continue;
      const wall = sample(r, y, 0);
      expect(Math.hypot(...wall)).toBeLessThan(1e-12);
      const x = r * 0.6, z = r * 0.3;
      const step = Math.min(r, upper - lower) * 1e-5;
      const divergence = (sample(x + step, y, z)[0] - sample(x - step, y, z)[0]
        + sample(x, y + step, z)[1] - sample(x, y - step, z)[1]
        + sample(x, y, z + step)[2] - sample(x, y, z - step)[2]) / (2 * step);
      expect(Math.abs(divergence) * (upper - lower)).toBeLessThan(1e-7);
    }
  });
});
