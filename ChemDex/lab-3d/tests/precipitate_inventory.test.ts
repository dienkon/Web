import { describe, it, expect } from 'vitest';
import { bulkPrecipitateMass } from '../src/science/precipitateInventory';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { currentPrecipitateTurbidity } from '../src/simulation/render/precipitateTurbidity';
import type { VesselState, SubstanceContent } from '../src/types/chemistry';
const solid: SubstanceContent = { formula: 'AgBr', phase: 's', mass_g: 0.2, moles: 0.2 / 187.77 };
describe('Precipitate graphics obey bulk inventory', () => {
  it('excludes dissolved material, gas, filter cake and foam-held solid', () => {
    expect(bulkPrecipitateMass([solid, { ...solid, phase: 'aq' }, { ...solid, phase: 'g' },
      { ...solid, location: 'filter' }, { ...solid, location: 'foam' }], 'AgBr(s)')).toBe(0.2);
    expect(bulkPrecipitateMass([{ ...solid, formula: 'AgBr(s)', phase: undefined }], 'AgBr')).toBe(0.2);
  });
  it('removes phantom particles and cloudiness after inventory is transferred or dissolved despite stale metadata', () => {
    const manager = new VesselSimulationManager('inventory');
    const vessel = { type: 'beaker', capacity_ml: 250, volume_ml: 100, mass_g: 100.2,
      temperature_c: 25, precipitateSubstance: 'AgBr', precipitateAmount_g: 99,
      hasPrecipitate: true, contents: [solid] } as VesselState;
    expect(manager.step(vessel, 0.1, { thermalStateAuthoritative: true }).precipitateAmount_g).toBe(0.2);
    vessel.contents = [{ ...solid, phase: 'aq' }];
    const result = manager.step(vessel, 0.1, { thermalStateAuthoritative: true });
    expect(result.hasPrecipitate).toBe(false);
    expect(manager.precipitationSystem.representedMass_g).toBe(0);
    expect(currentPrecipitateTurbidity(vessel, manager.precipitationSystem)).toBe(0);
  });
  it('does not count another solid species or malformed mass', () => {
    expect(bulkPrecipitateMass([solid, { ...solid, formula: 'AgI' },
      { ...solid, mass_g: NaN }, { ...solid, mass_g: -1 }], 'AgBr')).toBe(0.2);
    expect(bulkPrecipitateMass([solid])).toBe(0);
  });
});
