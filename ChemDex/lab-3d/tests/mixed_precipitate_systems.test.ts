import { describe, expect, it } from 'vitest';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { precipitateComponents, isSuspensionRow, withLegacyPrecipitateOrigins } from '../src/science/precipitateInventory';
import { currentMixedPrecipitateTurbidity } from '../src/simulation/render/precipitateTurbidity';
import { computeMolarMass, applyProgramToLedger } from '../src/engine/ledger';
import { getProgramById } from '../src/vfx/programs/library';
import { liquidLevelForVolume, vesselInterior } from '../src/science/vesselDimensions';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const row = (formula: string, mass_g: number, tagged = true): SubstanceContent => ({ formula, phase: 's', mass_g,
  moles: mass_g / computeMolarMass(formula), ...(tagged ? { solidOrigin: 'precipitate' as const } : {}) });
const vessel = (solids: SubstanceContent[]): VesselState => ({ id: 'mixed-floc', type: 'beaker', capacity_ml: 250,
  volume_ml: 100, mass_g: 100 + solids.reduce((s, c) => s + c.mass_g, 0), temperature_c: 25,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 100, moles: 100 / 18.015 }, ...solids],
  precipitateSubstance: solids[0]?.formula, hasPrecipitate: solids.length > 0, ph: 7,
}) as VesselState;

describe('Independent precipitate species in a shared vessel', () => {
  it('does not clear haze belonging to a non-precipitate liquid model', () => {
    const v = { ...vessel([]), turbidity: 0.7 }, manager = new VesselSimulationManager('other-haze');
    manager.step(v, 0.1, { thermalStateAuthoritative: true });
    expect(currentMixedPrecipitateTurbidity(v, manager)).toBeNull();
  });
  it('keeps both species and their histories when the active UI label changes', () => {
    const v = vessel([row('Cu(OH)2', 0.1), row('Fe(OH)3', 0.2)]);
    const manager = new VesselSimulationManager(v.id, 'low');
    const first = manager.step(v, 0.1, { thermalStateAuthoritative: true });
    const copper = manager.precipitationSystems.get('Cu(OH)2')!;
    const iron = manager.precipitationSystems.get('Fe(OH)3')!;
    expect(manager.precipitationSystems.size).toBe(2);
    expect(first.precipitateAmount_g).toBeCloseTo(0.3, 12);
    expect(copper.profile.color).not.toBe(iron.profile.color);
    expect(copper.profile.morphology).toBe('gel_like');
    expect(iron.profile.morphology).toBe('flocculent');
    const age = copper.particles[0].age;
    v.precipitateSubstance = 'Fe(OH)3';
    manager.step(v, 0.1, { thermalStateAuthoritative: true });
    expect(manager.precipitationSystems.get('Cu(OH)2')).toBe(copper);
    expect(copper.particles[0].age).toBeGreaterThan(age);
    expect(copper.representedMass_g).toBeCloseTo(0.1, 12);
    expect(iron.representedMass_g).toBeCloseTo(0.2, 12);
    expect(currentMixedPrecipitateTurbidity(v, manager)).toBeCloseTo(manager.cloudiness, 12);
    manager.reset();
    expect(currentMixedPrecipitateTurbidity(v, manager)).toBeNull();
    manager.step(v, 0.1, { thermalStateAuthoritative: true });
    expect(manager.precipitationSystems.get('Cu(OH)2')).toBe(copper);
    expect(manager.precipitationSystems.get('Fe(OH)3')).toBe(iron);
    expect(copper.representedMass_g).toBeCloseTo(0.1, 12);
  });

  it('dissolves only the removed species and invalidates stale mixed snapshots', () => {
    const v = vessel([row('CuS', 0.1), row('AgBr', 0.2)]), manager = new VesselSimulationManager(v.id);
    manager.step(v, 0.1, { thermalStateAuthoritative: true });
    const sulfide = manager.precipitationSystems.get('CuS')!;
    v.contents = v.contents.filter(c => c.formula !== 'AgBr');
    expect(currentMixedPrecipitateTurbidity(v, manager)).toBeNull();
    manager.step(v, 0.1, { thermalStateAuthoritative: true });
    expect(manager.precipitationSystems.size).toBe(1);
    expect(manager.precipitationSystems.get('CuS')).toBe(sulfide);
    expect(sulfide.representedMass_g).toBeCloseTo(0.1, 12);
    v.contents = v.contents.filter(c => c.phase !== 's');
    manager.step(v, 0.1, { thermalStateAuthoritative: true });
    expect(manager.cloudiness).toBe(0);
    expect(manager.sedimentBed.amount_g).toBe(0);
    expect(currentMixedPrecipitateTurbidity(v, manager)).toBe(0);
  });

  it('shares a fixed glyph budget without losing mass when another species appears', () => {
    const v = vessel([row('CuS', 0.1)]), manager = new VesselSimulationManager(v.id, 'low');
    for (let i = 0; i < 100; i++) manager.step(v, 0.1, { thermalStateAuthoritative: true });
    v.contents.push(row('ZnS', 0.2));
    for (let i = 0; i < 100; i++) manager.step(v, 0.1, { thermalStateAuthoritative: true });
    const systems = [...manager.precipitationSystems.values()];
    expect(systems.reduce((s, p) => s + p.particles.length, 0)).toBeLessThanOrEqual(manager.maxPrecipitateParticles);
    expect(systems.reduce((s, p) => s + p.maxParticles, 0)).toBe(manager.maxPrecipitateParticles);
    expect(systems.reduce((s, p) => s + p.representedMass_g, 0)).toBeCloseTo(0.3, 10);
  });

  it('adds sediment volumes using each material density, rather than overlapping beds', () => {
    const v = vessel([row('AgBr', 0.3), row('BaSO4', 0.2)]), manager = new VesselSimulationManager(v.id, 'low');
    for (let i = 0; i < 1000; i++) manager.step(v, 0.1, { thermalStateAuthoritative: true });
    const systems = [...manager.precipitationSystems.values()];
    const packedVolume = systems.reduce((s, p) => s + p.sedimentBed.amount_g / p.profile.particleDensity_g_cm3 / 0.65, 0);
    expect(manager.sedimentBed.amount_g).toBeCloseTo(0.5, 8);
    expect(manager.sedimentBed.thickness).toBeCloseTo(liquidLevelForVolume(v.type, packedVolume, v.capacity_ml) - vesselInterior(v.type).floorY, 12);
    expect(manager.cloudiness).toBeLessThan(1e-6);
  });

  it('distinguishes added chunks, suspended products and retained filter cake', () => {
    const added = row('Cu', 1, false), product = row('Cu', 0.1), filtered = { ...row('Cu', 2), location: 'filter' as const };
    const contents = [added, product, filtered];
    expect(precipitateComponents(contents, 'Cu')).toEqual([{ formula: 'Cu', mass_g: 0.1, formation: undefined }]);
    expect(isSuspensionRow(added, contents, 'Cu')).toBe(false);
    expect(isSuspensionRow(product, contents, 'Cu')).toBe(true);
    expect(isSuspensionRow(filtered, contents, 'Cu')).toBe(false);
    expect(precipitateComponents(contents.map(c => ({ ...c, phase: 'aq' })), 'Cu')).toEqual([]);
  });

  it('migrates a legacy product fraction without turning the added remainder into cloud', () => {
    const v = vessel([row('Cu', 1, false)]);
    v.precipitateAmount_g = 0.1;
    const migrated = withLegacyPrecipitateOrigins(v);
    expect(migrated.filter(c => c.formula === 'Cu').reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(1, 12);
    expect(precipitateComponents(migrated, 'Ag')).toEqual([{ formula: 'Cu', mass_g: 0.1, formation: undefined }]);
    expect(migrated.find(c => c.formula === 'Cu' && !c.solidOrigin)!.mass_g).toBeCloseTo(0.9, 12);
    expect(withLegacyPrecipitateOrigins({ ...v, contents: migrated })).toEqual(migrated);
    expect(v.contents.some(c => c.solidOrigin)).toBe(false);
  });

  it('keeps added hydroxide separate when chemistry generates more of the same formula', () => {
    const v = vessel([row('Cu(OH)2', 0.1, false)]);
    v.hasPrecipitate = false; v.precipitateSubstance = undefined;
    v.contents.push(...[['CuSO4', 1e-4], ['NaOH', 2e-4]].map(([f, n]) => ({ formula: String(f), phase: 'aq',
      moles: Number(n), mass_g: Number(n) * computeMolarMass(String(f)) })));
    const patch = applyProgramToLedger(getProgramById('cuso4_naoh')!, v, 1, { deferThermal: true });
    const rows = patch.contents!.filter(c => c.formula === 'Cu(OH)2');
    expect(rows).toHaveLength(2);
    expect(rows.find(c => !c.solidOrigin)!.mass_g).toBe(0.1);
    expect(precipitateComponents(patch.contents!, 'Cu(OH)2')[0].mass_g).toBeCloseTo(rows.find(c => c.solidOrigin)!.mass_g, 12);
  });

  it('reduces representative count to zero and restores it without losing inventory', () => {
    const system = new PrecipitationSystem(20, 'CuS');
    const p = { temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1, radius: 1, surfaceY: 2, liquidBottomY: 0, precipitateAmount_g: 0.1 };
    for (let i = 0; i < 10; i++) system.update(0.1, p);
    system.setParticleBudget(0);
    expect(system.particles).toHaveLength(0);
    expect(system.representedMass_g).toBeCloseTo(0.1, 12);
    system.setParticleBudget(5); system.update(0.1, p);
    expect(system.particles.length).toBeGreaterThan(0);
    expect(system.particles.length).toBeLessThanOrEqual(5);
    expect(system.representedMass_g).toBeCloseTo(0.1, 12);
  });
});
