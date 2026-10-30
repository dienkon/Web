import { describe, expect, it } from 'vitest';
import { metalSurfaceAppearance } from '../src/science/metalSurfaceAppearance';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { currentPrecipitateTurbidity } from '../src/simulation/render/precipitateTurbidity';
import type { VesselState } from '../src/types/chemistry';
describe('Finite attached-metal appearance', () => {
  it.each([['zn_agno3', 'Zn', 'Ag'], ['mg_cuso4', 'Mg', 'Cu'], ['fe_cuso4', 'Fe (nail)', 'Cu'],
    ['zn_cuso4', 'Zn (granules)', 'Cu'], ['cu_agno3', 'Cu (turnings)', 'Ag']])('%s attaches product appearance to its surviving substrate without a duplicate cloud', (id, substrate, product) => {
    const v = { id: 'metal', type: 'beaker', capacity_ml: 250, volume_ml: 100, temperature_c: 25,
      lastReactionId: id, precipitateSubstance: product, precipitateAmount_g: 0.1,
      contents: [{ formula: 'H2O', phase: 'l', moles: 5, mass_g: 90 },
        { formula: substrate, phase: 's', moles: 0.01, mass_g: 1 },
        { formula: product, phase: 's', moles: 0.001, mass_g: 0.1 }] } as VesselState;
    const attachment = metalSurfaceAppearance(v)!;
    expect(attachment.attachedMass_g).toBe(0.1);
    expect(attachment.colorFraction).toBeCloseTo(0.1 / 1.1, 12);
    const manager = new VesselSimulationManager(v.id, 'low');
    manager.step(v, 0.1, { thermalStateAuthoritative: true });
    expect(manager.precipitationSystem.representedMass_g).toBe(0);
    expect(currentPrecipitateTurbidity(v, manager.precipitationSystem)).toBe(0);
    expect(v.contents[2].mass_g).toBe(0.1);
    expect(metalSurfaceAppearance({ ...v, lastReactionId: 'unrelated' })).toBeNull();
    expect(metalSurfaceAppearance({ ...v, contents: v.contents.filter(c => c.formula !== substrate) })).toBeNull();
    const released = { ...v, contents: v.contents.filter(c => c.formula !== substrate) };
    manager.step(released, 0.1, { thermalStateAuthoritative: true });
    expect(manager.precipitationSystem.profile.id).toBe(product);
    expect(manager.precipitationSystem.profile.modelBasis).toBeUndefined();
    expect(manager.precipitationSystem.profile.metalness).toBe(1);
    expect(manager.precipitationSystem.sedimentBed.metalness).toBe(1);
    expect(manager.precipitationSystem.representedMass_g).toBeCloseTo(0.1, 12);
    expect(manager.precipitationSystem.profile.color).not.toBe('#f8fafc');
  });
  it('does not turn independently added copper stock or filter cake into an iron coating', () => {
    const v = { lastReactionId: 'fe_cuso4', precipitateSubstance: 'Cu', contents: [
      { formula: 'Fe (nail)', phase: 's', mass_g: 1, moles: 1 / 55.845 },
      { formula: 'Cu', phase: 's', mass_g: 2, moles: 2 / 63.546 },
      { formula: 'Cu', phase: 's', mass_g: 0.1, moles: 0.1 / 63.546, solidOrigin: 'precipitate' },
      { formula: 'Cu', phase: 's', mass_g: 3, moles: 3 / 63.546, solidOrigin: 'precipitate', location: 'filter' },
    ] } as VesselState;
    expect(metalSurfaceAppearance(v)!.attachedMass_g).toBeCloseTo(0.1);
  });
});
