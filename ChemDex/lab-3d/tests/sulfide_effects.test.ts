import { describe, expect, it } from 'vitest';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
describe('Distinct sulfide suspensions', () => {
  it.each(['CuS', 'PbS', 'ZnS'])('%s conserves a finite suspension without using magnified glyph size for settling', formula => {
    const p = getPrecipitateProfile(formula);
    expect(p.id).toBe(formula);
    expect(p.modelBasis).toBeUndefined();
    const system = new PrecipitationSystem(40, formula);
    const params = { substance: formula, temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1,
      radius: 1, liquidBottomY: 0, surfaceY: 1, precipitateAmount_g: 0.1 };
    for (let i = 0; i < 100; i++) system.update(0.1, params);
    expect(system.representedMass_g).toBeCloseTo(0.1, 12);
    expect(system.particles.length).toBeGreaterThan(0);
    expect(system.particles[0].sedimentationSpeed).toBeLessThan(0.0001);
    expect(system.particles[0].physicalRadius_m).toBeCloseTo(p.baseParticleRadius_mm * 0.001, 14);
    expect(system.particles[0].radius).toBeGreaterThan(0.0005);
  });
  it('distinguishes white zinc sulfide from black copper and lead sulfides', () => {
    expect(getPrecipitateProfile('ZnS').color).toBe('#f8fafc');
    expect(getPrecipitateProfile('CuS').color).toBe('#18181b');
    expect(getPrecipitateProfile('PbS').color).toBe('#09090b');
  });
});
