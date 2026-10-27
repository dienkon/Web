import { describe, expect, it } from 'vitest';
import { metalSurfaceAppearance } from '../src/science/metalSurfaceAppearance';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { currentPrecipitateTurbidity } from '../src/simulation/render/precipitateTurbidity';
import type { VesselState } from '../src/types/chemistry';
describe('Finite attached-metal appearance', () => {
  it.each([['zn_agno3', 'Zn', 'Ag'], ['mg_cuso4', 'Mg', 'Cu']])('%s attaches product appearance to its surviving substrate without a duplicate cloud', (id, substrate, product) => {
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
});
