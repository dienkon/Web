import { describe, expect, it } from 'vitest';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';

describe('Distinct divalent hydroxide suspensions', () => {
  it.each(['Mg(OH)2', 'Ni(OH)2', 'Fe(OH)2'])('%s preserves identity and finite mass through stirring and dissolution', substance => {
    const system = new PrecipitationSystem(40, substance);
    const p = { substance, temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1,
      radius: 0.3, liquidBottomY: 0, surfaceY: 0.5, precipitateAmount_g: 0.1, agitation: 1 };
    for (let i = 0; i < 200; i++) system.update(0.1, p);
    expect(system.profile.modelBasis).toBeUndefined();
    expect(system.profile.id).toBe(substance);
    expect(system.representedMass_g).toBeCloseTo(0.1, 12);
    for (const particle of system.particles) {
      expect(particle.physicalRadius_m).toBeCloseTo(1e-6, 12);
      expect(particle.y + particle.radius * 2.01).toBeLessThanOrEqual(0.5 + 1e-8);
      expect(Math.hypot(particle.x, particle.z) + particle.radius * 2.01).toBeLessThanOrEqual(0.3 + 1e-8);
    }
    system.update(0.1, { ...p, precipitateAmount_g: 0 });
    expect(system.representedMass_g).toBe(0);
    expect(system.cloudiness).toBe(0);
  });
  it('keeps Fe(II) appearance distinct from Fe(III) without a timed oxidation shortcut', () => {
    expect(getPrecipitateProfile('Fe(OH)₂(s)').id).toBe('Fe(OH)2');
    expect(getPrecipitateProfile('Fe(OH)2').color).not.toBe(getPrecipitateProfile('Fe(OH)3').color);
    expect(getPrecipitateProfile('Mg(OH)2').color).toBe('#f8fafc');
    expect(getPrecipitateProfile('Ni(OH)2').morphology).toBe('gel_like');
  });
});
