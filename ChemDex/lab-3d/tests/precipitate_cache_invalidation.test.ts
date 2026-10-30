import { describe, expect, it } from 'vitest';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { PRNG } from '../src/core/rng';
import { sphereSettlingSpeed } from '../src/science/particleSettling';
import { METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';

describe('Precipitate parameter changes after repeated fixed steps', () => {
  it('updates crystal formation and generic appearance even when formula is unchanged', () => {
    const system = new PrecipitationSystem(20, 'PbI2');
    system.setSubstance('PbI2', 'CRYSTAL_PLATE'); expect(system.profile.morphology).toBe('crystalline');
    system.setSubstance('PbI2'); expect(system.profile.morphology).toBe('fine_powder');
    system.setSubstance('UnknownX', undefined, '#aabbcc'); expect(system.profile.color).toBe('#aabbcc');
    system.setSubstance('UnknownX', undefined, '#ccbbaa'); expect(system.profile.color).toBe('#ccbbaa');
  });
  it('keeps color aliases out of the aggregation model when switching to the same profile', () => {
    const system = new PrecipitationSystem(20, 'Cu(OH)2');
    const params = { radius: 10, liquidBottomY: 0, surfaceY: 100, volume_ml: 100,
      temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1, precipitateAmount_g: 0.1 };
    system.update(1 / 60, { ...params, substance: 'Cu(OH)2' }); expect(system.flocculation.enabled).toBe(true);
    system.update(1 / 60, { ...params, substance: 'BLUE' }); expect(system.flocculation.enabled).toBe(false);
    system.update(1 / 60, { ...params, substance: 'Cu(OH)2' }); expect(system.flocculation.enabled).toBe(true);
    expect(system.representedMass_g).toBeCloseTo(0.1, 12);
  });
  it('recomputes slip after viscosity/density changes and dissolution, including after reset', () => {
    const system = new PrecipitationSystem(20, 'BaSO4', new PRNG(9));
    const params = { radius: 10, liquidBottomY: 0, surfaceY: 100, volume_ml: 100,
      temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1, precipitateAmount_g: 0.1, substance: 'BaSO4' };
    for (const patch of [{}, { viscosity_mPa_s: 5 }, { density_g_ml: 1.2 }, { precipitateAmount_g: 0.05 }, {}]) {
      const current = { ...params, ...patch };
      system.update(0.1, current);
      expect(system.particles.length).toBeGreaterThan(0);
      for (const p of system.particles) expect(p.sedimentationSpeed).toBe(sphereSettlingSpeed(
        p.physicalRadius_m!, p.density, current.density_g_ml * 1000, current.viscosity_mPa_s * 0.001) / METERS_PER_SCENE_UNIT);
      expect(system.representedMass_g).toBeCloseTo(current.precipitateAmount_g, 12);
    }
    system.reset(); system.update(0.1, params);
    expect(system.representedMass_g).toBeCloseTo(0.1, 12);
  });
});
