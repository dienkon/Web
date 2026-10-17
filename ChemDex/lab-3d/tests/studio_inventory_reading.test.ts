import { describe, expect, it } from 'vitest';
import { studioInventoryReading } from '../src/engine/studioInventoryReading';
import type { VesselState } from '../src/types/chemistry';

const water: VesselState = { id: 'reading', name: 'Water', type: 'beaker', capacity_ml: 100,
  position: [0, 0, 0], rotationY: 0, isLocked: false, contents: [{ formula: 'H2O', phase: 'l', mass_g: 10, moles: 10 / 18.015 }],
  substances: ['H2O'], volume_ml: 10, volume: 0.1, mass_g: 10, temperature_c: 25, ph: 7,
  phModel: 'ideal_aqueous_25c', hasPrecipitate: false, hasGas: false, isBoiling: false };
describe('Studio shows actual consistency measurements', () => {
  it('reports a changed mass instead of displaying a fixed PASS', () => {
    expect(studioInventoryReading(water).status).toBe('consistent');
    const wrong = studioInventoryReading({ ...water, mass_g: 20 });
    expect(wrong.status).toBe('mismatch');
    expect(wrong.relativeMassError).toBe(0.5);
    expect(studioInventoryReading({ ...water, contents: [] }).status).toBe('mismatch');
  });
  it('rejects invalid or missing inventory values', () => {
    expect(studioInventoryReading(undefined).status).toBe('unavailable');
    expect(studioInventoryReading({ ...water, mass_g: NaN }).relativeMassError).toBeNull();
    expect(studioInventoryReading({ ...water, contents: [{ ...water.contents[0], moles: -1 }] }).status).toBe('unavailable');
  });
  it('reports a solver residual only for a supported model near its reference temperature', () => {
    expect(Math.abs(studioInventoryReading(water).chargeResidual_M!)).toBeLessThan(1e-10);
    expect(studioInventoryReading({ ...water, temperature_c: 90 }).chargeResidual_M).toBeNull();
    expect(studioInventoryReading({ ...water, phModel: undefined }).chargeResidual_M).toBeNull();
    expect(studioInventoryReading({ ...water, contents: [{ formula: 'Unknown', phase: 'aq', moles: 1, mass_g: 10 }] }).chargeResidual_M).toBeNull();
  });
});
