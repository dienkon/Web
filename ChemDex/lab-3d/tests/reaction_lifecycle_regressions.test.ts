import { describe, expect, it } from 'vitest';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { partitionLeadIodide } from '../src/engine/leadIodidePhase';
import { resolveReactionEmission, reactionIsEmitting } from '../src/vfx/reactionActivity';
import { ReactionSimulationEngine } from '../src/vfx/reactions/ReactionSimulationEngine';
import { useAppStore, type ActiveKineticsState } from '../src/store/useAppStore';
import type { VesselState } from '../src/types/chemistry';
import { PRNG } from '../src/core/rng';
import { executeMultiStepReactions, findPendingReaction } from '../src/engine/chemistryEngine';

const sample = (patch: Partial<VesselState> = {}): VesselState => ({
  id: 'lifecycle_test', name: 'PbI2', type: 'beaker', capacity_ml: 250,
  volume_ml: 100, volume: 0.4, mass_g: 100.2, temperature_c: 25,
  ph: 7, position: [0, -0.135, 0], rotationY: 0, isLocked: false,
  substances: ['PbI2', 'KNO3'],
  contents: [{ formula: 'PbI2', phase: 's', mass_g: 0.2, moles: 0.2 / 461.01 }],
  hasPrecipitate: true, precipitateAmount_g: 0.2, precipitateSubstance: 'PbI2',
  hasGas: false, isBoiling: false, ...patch,
});

const params = (mass = 0.2) => ({
  temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1,
  radius: 0.5, liquidBottomY: -0.8, surfaceY: 0.2,
  precipitateAmount_g: mass, substance: 'PbI2',
});

describe('Finite reaction and particle lifetimes', () => {
  it.each(['PbI2', 'BaSO4', 'AgCl', 'Cu(OH)2', 'Fe(OH)3', 'CaCO3'])('%s settles without endless replacement particles', substance => {
    const system = new PrecipitationSystem(300, substance, new PRNG(17));
    const conditions = { ...params(), substance };
    for (let index = 0; index < 6000; index++) system.update(0.1, conditions);
    expect(system.particles.length).toBe(0);
    expect(system.emittedCount).toBeLessThanOrEqual(301);
    expect(system.representedMass_g).toBeCloseTo(0.2, 10);
    expect(system.sedimentBed.amount_g).toBeCloseTo(0.2, 10);
    const emitted = system.emittedCount;
    for (let index = 0; index < 600; index++) system.update(0.1, conditions);
    expect(system.emittedCount).toBe(emitted);
  });

  it('tracks new reagent additions and dissolution without duplicating represented mass', () => {
    const system = new PrecipitationSystem(400, 'PbI2', new PRNG(23));
    for (const mass of [0.05, 0.2, 0.4, 0.1, 0.05]) {
      for (let index = 0; index < 80; index++) system.update(0.1, params(mass));
      expect(system.representedMass_g).toBeCloseTo(mass, 9);
    }
    system.update(0.1, params(0));
    expect(system.representedMass_g).toBe(0);
    expect(system.particles).toHaveLength(0);
    expect(system.sedimentBed.thickness).toBe(0);
  });

  it('uses numerous tiny PbI2 platelets with a bounded instance pool', () => {
    const system = new PrecipitationSystem(550, 'PbI2', new PRNG(41));
    for (let index = 0; index < 60; index++) system.update(1 / 60, { ...params(), formation: 'CRYSTAL_PLATE' });
    // Some emitted platelets may already have settled; particle pool occupancy
    // must not prescribe an artificial minimum suspension lifetime.
    expect(system.emittedCount).toBeGreaterThan(200);
    expect(system.particles.length).toBeGreaterThan(0);
    expect(system.representedMass_g).toBeCloseTo(0.2, 10);
    expect(system.particles.length).toBeLessThanOrEqual(550);
    expect(system.particles.every(particle => particle.radius < 0.008)).toBe(true);
  });

  it('does not emit gas/steam/sparks merely because products remain', () => {
    const vessel = sample({ hasGas: true, temperature_c: 55 });
    expect(resolveReactionEmission(vessel).gas).toBe(false);
    expect(resolveReactionEmission(vessel).steam).toBe(false);
    expect(resolveReactionEmission(vessel).retainedSolid).toBe(true);
    const finished = { progress: 1, duration: 5, hasGas: true } as ActiveKineticsState;
    expect(resolveReactionEmission(vessel, finished).running).toBe(false);
    expect(reactionIsEmitting({ progress: 0.4, duration: Infinity })).toBe(false);
    expect(reactionIsEmitting({ progress: NaN, duration: 5 })).toBe(false);
  });

  it('releases dedicated controllers when chemistry stops and preserves externally supplied duration', () => {
    const vessel = sample();
    useAppStore.setState({ vessels: { [vessel.id]: vessel } });
    const engine = new ReactionSimulationEngine();
    const runtime = engine.startReaction(vessel.id, 'golden_rain_pbi2', { duration: 3 });
    expect(runtime?.duration).toBe(3);
    engine.retainVessels(new Set());
    expect(engine.getRuntime(vessel.id)).toBeUndefined();
    expect(runtime?.precipitateRate).toBe(0);
    expect(runtime?.gasGenerationRate).toBe(0);
  });
});

describe('Golden rain thermal cycle', () => {
  it('dissolves a feasible amount in hot water and recrystallizes on cooling with conserved PbI2', () => {
    let vessel = sample({ temperature_c: 95 });
    const initialMoles = vessel.contents[0].moles;
    for (let step = 0; step < 600; step++) vessel = { ...vessel, ...partitionLeadIodide(vessel, 0.1) };
    expect(vessel.precipitateAmount_g).toBeLessThan(0.00001);
    expect(vessel.contents.reduce((sum, item) => sum + item.mass_g, 0)).toBeCloseTo(0.2, 10);
    vessel.temperature_c = 20;
    for (let step = 0; step < 1200; step++) vessel = { ...vessel, ...partitionLeadIodide(vessel, 0.1) };
    expect(vessel.precipitateAmount_g).toBeGreaterThan(0.1);
    expect(vessel.contents.reduce((sum, item) => sum + item.moles, 0)).toBeCloseTo(initialMoles, 12);
    expect(vessel.mass_g).toBe(100.2);
  });

  it('retains undissolved solid when loading exceeds hot-water solubility', () => {
    let vessel = sample({ temperature_c: 95, contents: [{ formula: 'PbI2', phase: 's', mass_g: 2, moles: 2 / 461.01 }] });
    for (let step = 0; step < 600; step++) vessel = { ...vessel, ...partitionLeadIodide(vessel, 0.1) };
    expect(vessel.precipitateAmount_g).toBeGreaterThan(1.5);
    expect(vessel.hasPrecipitate).toBe(true);
  });
});

describe('Measured-temperature condition gates', () => {
  it('waits for the actual temperature even with a burner already switched on', () => {
    expect(findPendingReaction(['Cu', 'H2SO4 (conc)'], 25, true)?.minTemp_c).toBeGreaterThan(25);
    const contents = [
      { formula: 'Cu', moles: 0.001, mass_g: 0.063546 },
      { formula: 'H2SO4 (conc)', moles: 0.002, mass_g: 0.196158 },
    ];
    const cold = executeMultiStepReactions(contents, contents.map(item => item.formula), 20, 25, true, 'vi', { preserveQuantities: true });
    const hot = executeMultiStepReactions(contents, contents.map(item => item.formula), 20, 80, true, 'vi', { preserveQuantities: true });
    expect(cold.reactionsOccurred).toHaveLength(0);
    expect(hot.reactionsOccurred.length).toBeGreaterThan(0);
    const after = executeMultiStepReactions(hot.updatedContents, hot.updatedSubstances, 20, 80, true, 'vi', { preserveQuantities: true });
    expect(after.reactionsOccurred).toHaveLength(0);
  });
});
