import { describe, expect, it } from 'vitest';
import { currentPrecipitateTurbidity } from '../src/simulation/render/precipitateTurbidity';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import type { VesselState } from '../src/types/chemistry';

const vessel = { precipitateSubstance: 'AgBr(s)', precipitateAmount_g: 1,
  hasPrecipitate: true, turbidity: 0.95,
  contents: [{ formula: 'AgBr', phase: 's', mass_g: 1, moles: 1 / 187.77 }] } as unknown as VesselState;
describe('Liquid follows finite suspension rather than retained solid flags', () => {
  it('accepts zero cloudiness even while a nonzero sediment bed remains', () => {
    expect(currentPrecipitateTurbidity(vessel, { profile: { id: 'AgBr' }, lastInputMass_g: 1, cloudiness: 0 })).toBe(0);
  });
  it('rejects stale inventory, uninitialized snapshots and the wrong species', () => {
    const snapshot = { profile: { id: 'AgBr' }, lastInputMass_g: 1, cloudiness: 0.3 };
    expect(currentPrecipitateTurbidity(vessel, { ...snapshot, lastInputMass_g: null })).toBeNull();
    expect(currentPrecipitateTurbidity(vessel, { ...snapshot, lastInputMass_g: 0.1 })).toBeNull();
    expect(currentPrecipitateTurbidity(vessel, { ...snapshot, profile: { id: 'BaSO4' } })).toBeNull();
    expect(currentPrecipitateTurbidity(vessel, snapshot)).toBe(0.3);
  });
  it('clears after settling, clouds again on stirring and clears on complete dissolution', () => {
    const system = new PrecipitationSystem(40, 'AgBr');
    const params = { substance: 'AgBr', temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1,
      radius: 1, liquidBottomY: 0, surfaceY: 0.5, precipitateAmount_g: 1 };
    for (let i = 0; i < 3000; i++) system.update(0.1, params);
    expect(system.sedimentBed.amount_g).toBeCloseTo(1, 10);
    expect(currentPrecipitateTurbidity(vessel, system)).toBeLessThan(1e-8);
    for (let i = 0; i < 10; i++) system.update(0.1, { ...params, agitation: 1 });
    expect(currentPrecipitateTurbidity(vessel, system)).toBeGreaterThan(0.01);
    system.update(0.1, { ...params, precipitateAmount_g: 0 });
    expect(currentPrecipitateTurbidity({ ...vessel, precipitateAmount_g: 0, contents: [] }, system)).toBe(0);
    system.reset();
    expect(currentPrecipitateTurbidity(vessel, system)).toBeNull();
  });
});
