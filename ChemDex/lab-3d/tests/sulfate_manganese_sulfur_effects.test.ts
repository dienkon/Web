import { describe, expect, it } from 'vitest';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';

describe('Lead sulfate, manganese oxide and sulfur suspensions', () => {
  it.each(['PbSO4', 'MnO2', 'S'])('%s preserves a finite suspension and clears after removal', substance => {
    const s = new PrecipitationSystem(40, substance);
    const p = { substance, precipitateAmount_g: 0.1, volume_ml: 100, radius: 0.3,
      surfaceY: 0.5, liquidBottomY: 0, viscosity_mPa_s: 1, density_g_ml: 1, temp_c: 25 };
    for (let i = 0; i < 100; i++) s.update(0.1, p);
    expect(s.profile.id).toBe(substance);
    expect(s.profile.modelBasis).toBeUndefined();
    expect(s.representedMass_g).toBeCloseTo(0.1, 12);
    expect(s.particles.length).toBeGreaterThan(0);
    for (const particle of s.particles) {
      expect(particle.y - 2.01 * particle.radius).toBeGreaterThanOrEqual(-1e-8);
      expect(particle.y + 2.01 * particle.radius).toBeLessThanOrEqual(0.5 + 1e-8);
    }
    s.update(0.1, { ...p, precipitateAmount_g: 0.025 });
    expect(s.representedMass_g).toBeCloseTo(0.025, 12);
    s.update(0.1, { ...p, precipitateAmount_g: 0 });
    expect(s.particles).toHaveLength(0);
    expect(s.cloudiness).toBe(0);
  });
  it('distinguishes the white sulfate, brown-black oxide and pale yellow sulfur', () => {
    expect(getPrecipitateProfile('PbSO₄(s)').id).toBe('PbSO4');
    expect(getPrecipitateProfile('MnO₂(s)').color).toBe('#3c302a');
    expect(getPrecipitateProfile('S').particleDensity_g_cm3).toBe(2.07);
    expect(new Set(['PbSO4', 'MnO2', 'S'].map(f => getPrecipitateProfile(f).color)).size).toBe(3);
  });
});
