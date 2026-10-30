import { describe, expect, it } from 'vitest';
import { suspensionCloudiness } from '../src/science/suspensionCloudiness';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';

describe('Suspension loading controls qualitative cloudiness', () => {
  it('responds to dilution and suspended mass with bounded output', () => {
    const normal = suspensionCloudiness(0.1, 100, 0.9);
    expect(suspensionCloudiness(0.1, 1000, 0.9)).toBeLessThan(normal);
    expect(suspensionCloudiness(1e-9, 100, 0.9)).toBeLessThan(1e-7);
    expect(suspensionCloudiness(1, 1000, 0.9)).toBeCloseTo(normal, 14);
    expect(suspensionCloudiness(100, 1, 0.9)).toBeLessThanOrEqual(0.9);
    for (const v of [0, -1, NaN, Infinity]) expect(suspensionCloudiness(0.1, v, 0.9)).toBe(0);
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
});
