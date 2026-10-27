import { describe, expect, it } from 'vitest';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';

describe('Cuprous oxide and chromate suspension lifecycle', () => {
  it.each(['Cu2O', 'Ag2CrO4', 'BaCrO4', 'PbCrO4'])('%s stays contained and clears when its actual solid dissolves', substance => {
    const system = new PrecipitationSystem(40, substance);
    const params = { substance, temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1,
      radius: 0.3, liquidBottomY: 0, surfaceY: 0.5, precipitateAmount_g: 0.1 };
    for (let i = 0; i < 100; i++) system.update(0.1, params);
    expect(system.profile.id).toBe(substance);
    expect(system.profile.modelBasis).toBeUndefined();
    expect(system.representedMass_g).toBeCloseTo(0.1, 12);
    expect(system.particles.length).toBeGreaterThan(0);
    for (const p of system.particles) {
      expect(p.y - p.radius * 2.01).toBeGreaterThanOrEqual(-1e-8);
      expect(p.y + p.radius * 2.01).toBeLessThanOrEqual(0.5 + 1e-8);
      expect(Math.hypot(p.x, p.z) + p.radius * 2.01).toBeLessThanOrEqual(0.3 + 1e-8);
      expect(p.physicalRadius_m).toBeCloseTo(1e-6, 12);
    }
    system.update(0.1, { ...params, precipitateAmount_g: 0.025 });
    expect(system.representedMass_g).toBeCloseTo(0.025, 12);
    system.update(0.1, { ...params, precipitateAmount_g: 0 });
    expect(system.particles).toHaveLength(0);
    expect(system.representedMass_g).toBe(0);
    expect(system.cloudiness).toBe(0);
  });
  it('does not give yellow chromates the golden-rain platelet route', () => {
    for (const formula of ['BaCrO4', 'PbCrO4']) {
      expect(getPrecipitateProfile(formula, 'CRYSTAL_PLATE').morphology).toBe('fine_powder');
    }
    expect(getPrecipitateProfile('Cu₂O(s)').id).toBe('Cu2O');
    expect(getPrecipitateProfile('Cu2O').color).not.toBe(getPrecipitateProfile('CuO').color);
    expect(getPrecipitateProfile('Ag2CrO4').color).not.toBe(getPrecipitateProfile('BaCrO4').color);
  });
});
