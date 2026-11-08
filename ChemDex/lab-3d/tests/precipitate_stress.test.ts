import { afterEach, describe, expect, it } from 'vitest';
import { activePrecipitateVessels, precipitateSceneBudget } from '../src/simulation/render/precipitateBudget';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { useAppStore } from '../src/store/useAppStore';
import { getSolidMorphology, findChemical } from '../src/data/chemicals';
import { createStockSolidGeometry } from '../src/components/three/stockSolidGeometry';
import { PRECIPITATE_MORPHOLOGIES } from '../src/engine/studioMorphology';
import type { VesselState } from '../src/types/chemistry';
import type { QualityTier } from '../src/vfx/quality';
import { readablePrecipitateRadius } from '../src/simulation/render/precipitateReadability';

const initial = useAppStore.getState();
afterEach(() => useAppStore.setState(initial));
const shell = { id: 'reference', type: 'beaker', capacity_ml: 100, position: [0, -0.135, 0], rotationY: 0,
  volume_ml: 30, volume: 0.3, mass_g: 30, temperature_c: 25, contents: [], substances: [], isLocked: false } as unknown as VesselState;

describe('Precipitate stress and stock form regressions', () => {
  it('caps the scene glyph population across many cups at every rendering tier', () => {
    for (const tier of ['potato', 'low', 'medium', 'high', 'ultra'] as QualityTier[]) for (const count of [1, 2, 8, 20, 100, 1000]) {
      const budget = precipitateSceneBudget(tier, count);
      expect(budget.visible * count).toBeLessThanOrEqual(budget.total);
      expect(budget.physical).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(budget.physical)).toBe(true);
    }
  });
  it('counts actual bulk precipitates, excluding empty, dry, shattered and filter inventories', () => {
    const solid = { formula: 'BaSO4', phase: 's', mass_g: 1, moles: 1 / 233.39, solidOrigin: 'precipitate' as const };
    const wet = { ...shell, contents: [solid] };
    const vessels = { wet, dry: { ...wet, volume_ml: 0 }, broken: { ...wet, isShattered: true },
      filter: { ...wet, contents: [{ ...solid, location: 'filter' as const }] }, empty: shell };
    expect(activePrecipitateVessels(vessels)).toBe(1);
    expect(activePrecipitateVessels({ ...vessels, second: { ...wet, id: 'second' } })).toBe(2);
  });
  it('shrinks representative populations without changing mass, physical radius or instantaneous turbidity', () => {
    const system = new PrecipitationSystem(900, 'BaSO4');
    const params = { temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1, radius: 1, liquidBottomY: -1,
      surfaceY: 1, precipitateAmount_g: 1, volume_ml: 30, substance: 'BaSO4' };
    for (let i = 0; i < 90; i++) system.update(1 / 30, params);
    const before = { mass: system.representedMass_g, radius: system.particles[0].physicalRadius_m, cloudiness: system.cloudiness };
    system.setParticleBudget(precipitateSceneBudget('medium', 20).physical);
    expect(system.particles.length).toBeLessThanOrEqual(35);
    expect(system.representedMass_g).toBeCloseTo(before.mass, 12);
    expect(system.particles[0].physicalRadius_m).toBe(before.radius);
    expect(system.cloudiness).toBe(before.cloudiness);
  });
  it('reopens all eight Studio samples under 200 repeated clicks without creating or resetting matter', () => {
    useAppStore.setState({ vessels: { reference: shell }, vesselIds: ['reference'], activeKinetics: {}, pendingReactions: {},
      isSimulationPaused: true, pouringChemical: null, vesselPourAnimation: null, inFlightPours: [] });
    const ids = PRECIPITATE_MORPHOLOGIES.map(m => useAppStore.getState().prepareStudioMorphology(m.type)!);
    const specimens = ids.map(id => useAppStore.getState().vessels[id]);
    for (let i = 0; i < 200; i++) {
      const n = i % ids.length;
      expect(useAppStore.getState().prepareStudioMorphology(PRECIPITATE_MORPHOLOGIES[n].type)).toBe(ids[n]);
      expect(useAppStore.getState().vessels[ids[n]]).toBe(specimens[n]);
    }
    expect(useAppStore.getState().vesselIds).toHaveLength(9);
    expect(useAppStore.getState().vessels.reference).toBe(shell);
  });
  it('keeps fine iron powder, compact filings and one whole nail as distinct forms', () => {
    expect(findChemical('Fe').name_vi).toContain('Bột');
    expect(getSolidMorphology('Fe')).toBe('POWDER');
    expect(getSolidMorphology('Fe powder')).toBe('POWDER');
    expect(getSolidMorphology('Fe (filings)')).toBe('FILINGS');
    expect(getSolidMorphology('Fe (nail)')).toBe('NAIL');
    const powder = createStockSolidGeometry(getSolidMorphology('Fe'), 'Fe'); powder.computeBoundingBox();
    const size = powder.boundingBox!;
    const extents = [size.max.x - size.min.x, size.max.y - size.min.y, size.max.z - size.min.z];
    expect(Math.max(...extents) / Math.min(...extents)).toBeLessThan(2); powder.dispose();
  });
  it('enlarges only representative floc images, keeping their center and liquid/glass bounds', () => {
    const bounds = { radius: 1, liquidBottomY: 0, surfaceY: 1 };
    const particle = { x: 0.2, y: 0.5, z: 0.1, radius: 0.00005, physicalRadius_m: 5e-8, mass_ug: 10 };
    const before = { ...particle };
    expect(readablePrecipitateRadius(particle, { morphology: 'gel_like' }, bounds)).toBeGreaterThan(particle.radius);
    expect(particle).toEqual(before);
    for (const p of [{ ...particle, x: 0.9999, z: 0 }, { ...particle, y: 0.99999 }, { ...particle, y: 0.00001 }]) {
      const r = readablePrecipitateRadius(p, { morphology: 'flocculent' }, bounds);
      expect(Math.hypot(p.x, p.z) + r).toBeLessThanOrEqual(1);
      expect(p.y - r).toBeGreaterThanOrEqual(0); expect(p.y + r).toBeLessThanOrEqual(1);
    }
    expect(readablePrecipitateRadius(particle, { morphology: 'fine_powder' }, bounds)).toBe(particle.radius);
  });
});
