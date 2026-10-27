import { describe, expect, it } from 'vitest';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';

describe('Precipitate display dimensions and quiescent motion', () => {
  const params = { precipitateAmount_g: 0.1, volume_ml: 100, temp_c: 25,
    viscosity_mPa_s: 1, density_g_ml: 1, radius: 1, liquidBottomY: 0, surfaceY: 1 };
  it('converts an unmodified profile radius from meters into the shared scene scale', () => {
    const s = new PrecipitationSystem(40, 'BaSO4');
    s.update(0.1, { ...params, substance: 'BaSO4' });
    expect(s.particles.length).toBeGreaterThan(0);
    for (const p of s.particles) {
      const glyphToPhysicalRatio = p.radius * METERS_PER_SCENE_UNIT / p.physicalRadius_m!;
      // Only the documented ±20% display variation remains.
      expect(glyphToPhysicalRatio).toBeGreaterThanOrEqual(0.8);
      expect(glyphToPhysicalRatio).toBeLessThanOrEqual(1.2);
      expect(p.vx).toBe(0);
      expect(p.vz).toBe(0);
    }
  });
  it('preserves explicit glyph magnification independently of transport radius', () => {
    const s = new PrecipitationSystem(40, 'CuS');
    s.update(0.1, { ...params, substance: 'CuS' });
    expect(s.particles[0].radius).toBeGreaterThan(0.0005);
    expect(s.particles[0].physicalRadius_m).toBeCloseTo(5e-8, 14);
    expect(s.representedMass_g).toBeCloseTo(0.1, 12);
  });
});
