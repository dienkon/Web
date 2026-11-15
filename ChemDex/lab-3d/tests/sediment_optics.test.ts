import { describe, expect, it } from 'vitest';
import { sedimentBedOptics } from '../src/science/sedimentOptics';
import { sedimentLevel } from '../src/simulation/effects/sedimentGeometry';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';

const beaker = { type: 'beaker', capacity_ml: 250 };
const plate = getPrecipitateProfile('PbI2', 'CRYSTAL_PLATE');
const optics = (mass_g: number, vessel = beaker) => sedimentBedOptics(vessel,
  sedimentLevel(vessel.type, vessel.capacity_ml, mass_g, plate.particleDensity_g_cm3, 0.35), [{ mass_g, profile: plate }]);

describe('finite sediment bed optics', () => {
  it('has no opaque floor jump when the first trace reaches the bed', () => {
    expect(optics(0).opacity).toBe(0);
    expect(optics(1e-9).opacity).toBeGreaterThan(0);
    expect(optics(1e-9).opacity).toBeLessThan(1e-6);
    const early = optics(0.00355), final = optics(0.091);
    expect(early.opacity).toBeLessThan(0.05);
    expect(final.opacity).toBeGreaterThan(early.opacity);
    expect(final.opacity).toBeLessThan(1);
  });

  it('adds projected material area with mass and resolves the vessel footprint in SI units', () => {
    const first = optics(0.01), twice = optics(0.02), wider = optics(0.01, { ...beaker, capacity_ml: 2000 });
    expect(twice.opticalDepth / first.opticalDepth).toBeCloseTo(2, 12);
    expect(wider.footprintArea_m2 / first.footprintArea_m2).toBeCloseTo(4, 12);
    expect(wider.opticalDepth / first.opticalDepth).toBeCloseTo(0.25, 12);
  });

  it('combines mixed settled populations without manufacturing material or modifying geometry', () => {
    const level = sedimentLevel('beaker', 250, 0.02, plate.particleDensity_g_cm3, 0.35);
    const fine = getPrecipitateProfile('PbI2', 'FINE_POWDER');
    const first = sedimentBedOptics(beaker, level, [{ mass_g: 0.01, profile: plate }]);
    const second = sedimentBedOptics(beaker, level, [{ mass_g: 0.01, profile: fine }]);
    const mixed = sedimentBedOptics(beaker, level, [{ mass_g: 0.01, profile: plate }, { mass_g: 0.01, profile: fine }]);
    expect(mixed.opticalDepth).toBeCloseTo(first.opticalDepth + second.opticalDepth, 12);
    expect(mixed.opacity).toBeCloseTo(1 - (1 - first.opacity) * (1 - second.opacity), 12);
    expect(level).toBe(sedimentLevel('beaker', 250, 0.02, plate.particleDensity_g_cm3, 0.35));
  });

  it('does not turn invalid or empty material into a visible bed', () => {
    expect(sedimentBedOptics(beaker, Number.NaN, [{ mass_g: 1, profile: plate }]).opacity).toBe(0);
    expect(sedimentBedOptics(beaker, 0, [{ mass_g: -1, profile: plate }, { mass_g: Number.NaN, profile: plate }]).opacity).toBe(0);
    expect(sedimentBedOptics({ ...beaker, capacity_ml: 0 }, 0, [{ mass_g: 1, profile: plate }]).opacity).toBe(0);
  });
});
