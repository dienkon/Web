import { describe, expect, it } from 'vitest';
import { suspensionCloudiness, suspensionOpticalDepth } from '../src/science/suspensionCloudiness';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';

describe('Suspension loading controls qualitative cloudiness', () => {
  it('responds to dilution and suspended mass with bounded output', () => {
    const normal = suspensionCloudiness(0.1, 100, 0.9);
    expect(suspensionCloudiness(0.1, 1000, 0.9)).toBeLessThan(normal);
    expect(suspensionCloudiness(1e-9, 100, 0.9)).toBeLessThan(1e-7);
    expect(suspensionCloudiness(1, 1000, 0.9)).toBeCloseTo(normal, 14);
    expect(suspensionCloudiness(100, 1, 0.9)).toBe(1);
    for (const v of [0, -1, NaN, Infinity]) expect(suspensionCloudiness(0.1, v, 0.9)).toBe(0);
  });
  it('adds optical depth when material or equivalent path length doubles', () => {
    const a = suspensionCloudiness(0.01, 100, 0.4);
    const twice = suspensionCloudiness(0.02, 100, 0.4);
    expect(1 - twice).toBeCloseTo((1 - a) ** 2, 14);
    expect(suspensionCloudiness(0.01, 100, 0.8)).toBeCloseTo(twice, 14);
    expect(suspensionCloudiness(10, 100, 0.1)).toBeGreaterThan(0.99);
  });
  it('is independent of the glyph budget and uses supplied liquid volume', () => {
    const run = (budget: number, volume_ml: number) => {
      const s = new PrecipitationSystem(budget, 'CuS');
      for (let i = 0; i < 100; i++) s.update(0.1, { substance: 'CuS', volume_ml,
        precipitateAmount_g: 0.1, temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1,
        radius: 1, liquidBottomY: 0, surfaceY: 1 });
      return s.cloudiness;
    };
    expect(run(20, 100)).toBeCloseTo(run(180, 100), 12);
    expect(run(20, 1000)).toBeLessThan(run(20, 100));
  });
  it('smooths linear depth without saturating concentrated inventory or retaining it after reset', () => {
    const a = new PrecipitationSystem(0, 'CuS'), b = new PrecipitationSystem(0, 'CuS');
    const base = { substance: 'CuS', volume_ml: 100, temp_c: 25, viscosity_mPa_s: 1,
      density_g_ml: 1, radius: 1, liquidBottomY: 0, surfaceY: 1 };
    const mass = 2 / a.profile.cloudinessFactor;
    a.update(0.5, { ...base, precipitateAmount_g: mass });
    b.update(0.5, { ...base, precipitateAmount_g: 2 * mass });
    expect(a.opticalDepth).toBeCloseTo(20 * -Math.expm1(-0.75), 12);
    expect(b.opticalDepth).toBeCloseTo(2 * a.opticalDepth, 12);
    expect(a.cloudiness).toBeCloseTo(-Math.expm1(-a.opticalDepth), 14);
    expect(suspensionOpticalDepth(2, 100, 1)).toBe(20);
    expect(suspensionOpticalDepth(4, 100, 1)).toBe(40);
    a.reset();
    expect(a.opticalDepth).toBe(0); expect(a.cloudiness).toBe(0);
    b.update(0.1, { ...base, precipitateAmount_g: 0 });
    expect(b.opticalDepth).toBe(0); expect(b.cloudiness).toBe(0);
  });
});
