import { describe, expect, it } from 'vitest';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
describe('Ferrocyanide appearances expose transport uncertainty', () => {
  it.each(['KFe[Fe(CN)6]', 'Cu2[Fe(CN)6]'])('%s has a distinct appearance without claiming calibrated transport', substance => {
    const p = getPrecipitateProfile(substance);
    expect(p.id).toBe(substance);
    expect(p.modelBasis).toBe('uncalibrated_transport');
    expect(p.color).not.toBe('#f8fafc');
    const s = new PrecipitationSystem(40, substance);
    const params = { substance, precipitateAmount_g: 0.1, volume_ml: 100, temp_c: 25,
      viscosity_mPa_s: 1, density_g_ml: 1, radius: 1, liquidBottomY: 0, surfaceY: 1 };
    for (let i = 0; i < 100; i++) s.update(0.1, params);
    expect(s.representedMass_g).toBeCloseTo(0.1, 12);
    s.update(0.1, { ...params, precipitateAmount_g: 0 });
    expect(s.particles).toHaveLength(0);
    expect(s.representedMass_g).toBe(0);
  });
  it('uses a gel for copper ferrocyanide and fine colloidal glyphs for Prussian blue', () => {
    expect(getPrecipitateProfile('Cu2[Fe(CN)6]').morphology).toBe('gel_like');
    expect(getPrecipitateProfile('KFe[Fe(CN)6]').baseParticleRadius_mm).toBeLessThan(0.001);
  });
});
