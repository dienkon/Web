import { describe, expect, it } from 'vitest';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import { PRECIPITATES_DATABASE } from '../src/data/precipitates';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { resolveMorphology } from '../src/vfx/particles/Precipitate';
import type { VesselState } from '../src/types/chemistry';

describe('Silver halides remain distinct through physical rendering', () => {
  it.each(['AgCl', 'AgBr', 'AgI'])('%s keeps identity, curdy shape and finite mass', formula => {
    const profile = getPrecipitateProfile(`${formula}(s)`);
    expect(profile.id).toBe(formula);
    expect(profile.morphology).toBe('flocculent');
    expect(resolveMorphology(`${formula}(s)`)).toBe('CURD');
    expect(profile.particleDensity_g_cm3).toBe(PRECIPITATES_DATABASE[formula].density_g_cm3);
    const manager = new VesselSimulationManager(formula);
    const vessel = { type: 'beaker', capacity_ml: 250, volume_ml: 100, mass_g: 100.1,
      temperature_c: 25, precipitateSubstance: `${formula}(s)`,
      contents: [{ formula, phase: 's', mass_g: 0.1, moles: 0.0005 }] } as VesselState;
    const result = manager.step(vessel, 0.1, { thermalStateAuthoritative: true });
    expect(result.precipitateAmount_g).toBe(0.1);
    expect(result.precipitateColor).toBe(profile.color);
    expect(manager.precipitationSystem.profile.id).toBe(formula);
    expect(manager.precipitationSystem.representedMass_g).toBeCloseTo(0.1, 12);
    vessel.contents = [];
    manager.step(vessel, 0.1, { thermalStateAuthoritative: true });
    expect(manager.precipitationSystem.representedMass_g).toBe(0);
  });
  it('does not render AgI as white BaSO4 or glittering PbI2', () => {
    const colors = ['AgCl', 'AgBr', 'AgI'].map(f => getPrecipitateProfile(f).color);
    expect(new Set(colors).size).toBe(3);
    expect(getPrecipitateProfile('AgI', 'CRYSTAL_PLATE').morphology).toBe('flocculent');
    expect(getPrecipitateProfile('AgI').color).not.toBe(getPrecipitateProfile('PbI2').color);
  });
});
