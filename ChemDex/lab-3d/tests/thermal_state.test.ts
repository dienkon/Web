import { describe, expect, it, vi } from 'vitest';
import { IDEAL_GAS_R_L_ATM } from '../src/engine/headspacePressure';
import { stepVesselThermal, sealedGasPressure, aqueousBoilingPoint, relaxGeneratedWater } from '../src/engine/thermalState';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { EvaporationSystem } from '../src/simulation/effects/EvaporationSystem';
import { determineBoilingStage } from '../src/simulation/chemistry/PhaseEngine';
import { useAppStore } from '../src/store/useAppStore';
import { transferWaterCondensate } from '../src/engine/condensationTransfer';
import { applyProgramWithThermalSinks } from '../src/engine/thermalLedger';
import { computeMolarMass } from '../src/engine/ledger';
import { getProgramById } from '../src/vfx/programs/library';
import type { VesselState } from '../src/types/chemistry';
import { waterBoilingPointAtPressure } from '../src/science/labEnvironment';
import { waterLatentHeatJ_G } from '../src/science/waterThermodynamics';

const water = (patch: Partial<VesselState> = {}): VesselState => ({
  id: 'thermal_test', name: 'Water', type: 'beaker', capacity_ml: 250,
  position: [0, 0, 0], rotationY: 0, isLocked: false, volume_ml: 100, volume: 0.4,
  mass_g: 100, temperature_c: 25, ph: 7, hasGas: false, isBoiling: false, hasPrecipitate: false,
  substances: ['H2O'], contents: [{ formula: 'H2O', phase: 'l', mass_g: 100, moles: 100 / 18.015 }], ...patch,
});

describe('Heat and solvent budgets', () => {
  it('gives newly generated reaction water a liquid volume or a heat-limited vapor fraction', () => {
    const contents = [{ formula: 'H2O', phase: 'l', mass_g: 1, moles: 1 / 18.015 }];
    const cool = relaxGeneratedWater(contents, 80)!;
    expect(cool.volume_ml).toBe(1);
    expect(cool.vaporMass_g).toBe(0);
    const warm = relaxGeneratedWater(contents, 105)!;
    expect(warm.temperature_c).toBe(waterBoilingPointAtPressure());
    expect(warm.vaporMass_g * waterLatentHeatJ_G(waterBoilingPointAtPressure())).toBeCloseTo((33.2 + 4.184) * (105 - waterBoilingPointAtPressure()), 8);
    expect(warm.volume_ml + warm.vaporMass_g).toBeCloseTo(1, 12);
    expect(warm.contents.reduce((sum, item) => sum + item.mass_g, 0)).toBeCloseTo(1, 12);
    expect(warm.contents.reduce((sum, item) => sum + item.moles, 0)).toBeCloseTo(1 / 18.015, 12);
  });
  it('does not resurrect evaporated solvent when a reaction timeline replays its baseline', () => {
    const contents = [...water().contents, ...['HCl', 'NaOH'].map(formula => ({ formula, phase: 'aq', moles: 0.05, mass_g: 0.05 * computeMolarMass(formula) }))];
    const baseline = water({ contents, mass_g: contents.reduce((sum, item) => sum + item.mass_g, 0), evaporated_ml: 2 });
    const current = { ...baseline, evaporated_ml: 3, volume_ml: 99, mass_g: baseline.mass_g - 1 };
    for (const extent of [0.1, 0.5, 1]) {
      const result = applyProgramWithThermalSinks(getProgramById('hcl_naoh')!, baseline, current, extent);
      const remainingWater = result.contents!.filter(item => item.formula === 'H2O').reduce((sum, item) => sum + item.mass_g, 0);
      expect(remainingWater).toBeCloseTo(99 + 0.05 * extent * computeMolarMass('H2O'), 10);
      expect(result.mass_g).toBeCloseTo(baseline.mass_g - 1, 10);
      expect(result.contents!.reduce((sum, item) => sum + item.mass_g, 0)).toBeCloseTo(result.mass_g!, 8);
    }
  });
  it('warms a cold sample continuously instead of snapping it to room temperature', () => {
    const initial = water({ temperature_c: 10 });
    const next = stepVesselThermal(initial, 1, 0);
    expect(next.temperature_c).toBeGreaterThan(10);
    expect(next.temperature_c).toBeLessThan(10.1);
    expect(next.mass_g).toBe(100);
    expect(next.evaporatedStep_g).toBe(0);
  });

  it('preserves tiny temperature increments and agrees at different frame rates', () => {
    const initial = water({ temperature_c: 10 });
    let fast = initial;
    for (let i = 0; i < 60; i++) fast = { ...fast, ...stepVesselThermal(fast, 1 / 60) };
    expect(fast.temperature_c).toBeCloseTo(stepVesselThermal(initial, 1).temperature_c, 9);
  });

  it('spends surplus heat on vaporization instead of increasing temperature above boiling', () => {
    const initial = water({ temperature_c: 100 });
    const next = stepVesselThermal(initial, 10, 300);
    expect(next.temperature_c).toBeCloseTo(waterBoilingPointAtPressure(), 10);
    expect(next.evaporatedStep_g).toBeGreaterThan(1);
    expect(next.evaporatedStep_g * waterLatentHeatJ_G(next.boilingPoint_c)).toBeLessThanOrEqual(3000);
    expect(next.latentEnergy_J).toBeCloseTo(next.evaporatedStep_g * waterLatentHeatJ_G(next.boilingPoint_c), 8);
    expect(next.mass_g + next.evaporatedStep_g).toBeCloseTo(initial.mass_g, 10);
    expect(next.contents![0].mass_g + next.evaporatedStep_g).toBeCloseTo(100, 10);
    expect(next.contents![0].moles * 18.015).toBeCloseTo(next.contents![0].mass_g, 10);
    expect(next.isBoiling).toBe(true);
  });

  it('keeps solute moles and concentrates the solution as water leaves', () => {
    const initial = water({ temperature_c: 101,
      mass_g: 102.922, contents: [...water().contents, { formula: 'NaCl', phase: 'aq', moles: 0.05, mass_g: 2.922 }],
    });
    const next = stepVesselThermal(initial, 10, 300);
    const salt = next.contents!.find(item => item.formula === 'NaCl')!;
    expect(salt.moles).toBe(0.05);
    expect(salt.mass_g).toBe(2.922);
    expect(salt.concentration_M).toBeGreaterThan(0.5);
    expect(aqueousBoilingPoint({ ...initial, ...next })).toBeGreaterThan(aqueousBoilingPoint(initial));
  });

  it('ignores settled solids and gas when estimating boiling elevation', () => {
    const pure = water();
    const solid = { ...pure, contents: [...pure.contents, { formula: 'NaCl', phase: 's', moles: 0.2, mass_g: 11.688 }] };
    expect(aqueousBoilingPoint(solid)).toBe(waterBoilingPointAtPressure());
    expect(aqueousBoilingPoint({ ...solid, contents: [...pure.contents, { ...solid.contents[1], phase: 'aq' }] })).toBeNaN();
    expect(aqueousBoilingPoint({ ...pure, contents: [...pure.contents,
      { formula: 'NaCl', phase: 'aq', mass_g: 1.1688, moles: 0.02 }] })).toBeGreaterThan(waterBoilingPointAtPressure());
  });

  it('cannot evaporate more water than exists or evaporate sealed-vessel mass', () => {
    const tiny = water({ mass_g: 0.001, volume_ml: 0.001, temperature_c: 100,
      contents: [{ formula: 'H2O', phase: 'l', moles: 0.001 / 18.015, mass_g: 0.001 }] });
    const dry = stepVesselThermal(tiny, 10, 500);
    expect(dry.mass_g).toBe(0);
    expect(dry.volume_ml).toBe(0);
    expect(dry.evaporatedStep_g).toBe(0.001);
    expect(dry.isBoiling).toBe(false);
    const closed = stepVesselThermal(water({ isSealed: true, temperature_c: 100 }), 1, 300);
    expect(closed.mass_g).toBe(100);
    expect(closed.evaporatedStep_g).toBe(0);
    expect(closed.temperature_c).toBeGreaterThan(100);
  });

  it('does not fabricate a solvent inventory for unknown fluids', () => {
    const unknown = water({ contents: [], temperature_c: 100 });
    expect(stepVesselThermal(unknown, 1, 300).evaporatedStep_g).toBe(0);
    expect(stepVesselThermal(unknown, 0, 300).temperature_c).toBe(100);
  });
});

describe('Physical visuals and finite pressure', () => {
  it('retains all elapsed physics time while publishing store changes at a lower cadence', () => {
    const before = useAppStore.getState();
    let frameTime = 1e9;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => frameTime);
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('VITEST', '');
    let unsubscribe = () => {};
    try {
      // Dry glass isolates the clock from evaporation/condensation latent heat.
      const initial = water({ temperature_c: 10, contents: [], mass_g: 0, volume_ml: 0 });
      useAppStore.setState({ vessels: { [initial.id]: initial }, vesselIds: [initial.id], burners: {},
        activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
      let commits = 0;
      unsubscribe = useAppStore.subscribe(() => { commits++; });
      for (let frame = 0; frame < 13; frame++) {
        frameTime = 1e9 + frame * 16.67;
        useAppStore.getState().tickSimulation(1 / 60);
      }
      const expected = stepVesselThermal(initial, 13 / 60).temperature_c;
      expect(useAppStore.getState().vessels[initial.id].temperature_c).toBeCloseTo(expected, 8);
      expect(commits).toBeLessThanOrEqual(5);
      expect(commits).toBeGreaterThan(1);
    } finally { unsubscribe(); vi.unstubAllEnvs(); clock.mockRestore(); useAppStore.setState(before, true); }
  });
  it('does not cap accumulated accepted time again when publication is delayed beyond 100 ms', () => {
    const before = useAppStore.getState();
    let frameTime = 2e9;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => frameTime);
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('VITEST', '');
    try {
      // Dry glass isolates the clock from evaporation/condensation latent heat.
      const initial = water({ temperature_c: 10, contents: [], mass_g: 0, volume_ml: 0 });
      useAppStore.setState({ vessels: { [initial.id]: initial }, burners: {}, activeKinetics: {},
        pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
      useAppStore.getState().tickSimulation(0.1);
      for (const offset of [10, 20, 30, 60]) {
        frameTime = 2e9 + offset;
        useAppStore.getState().tickSimulation(0.05);
      }
      expect(useAppStore.getState().vessels[initial.id].temperature_c)
        .toBeCloseTo(stepVesselThermal(initial, 0.3).temperature_c, 8);
    } finally { vi.unstubAllEnvs(); clock.mockRestore(); useAppStore.setState(before, true); }
  });
  it('limits two connected condensers to one vapor budget and respects cooling/capacity', () => {
    const source = water({ id: 'source', mass_g: 99, volume_ml: 99, temperature_c: 100 });
    const a = water({ id: 'a', type: 'condenser', vaporSourceId: 'source', coolingWaterActive: true,
      capacity_ml: 0.6, mass_g: 0, volume_ml: 0, contents: [] });
    const b = { ...a, id: 'b', capacity_ml: 100 };
    const initial = { source, a, b };
    const next = transferWaterCondensate(initial, new Map([['source', 1]]), 10);
    expect(next.a.mass_g).toBeCloseTo(0.6, 12);
    expect(next.b.mass_g).toBeCloseTo(0.4, 12);
    expect(next.source.condensedTransfer_g).toBeCloseTo(1, 12);
    expect(next.a.condensationHeatRemoved_J! + next.b.condensationHeatRemoved_J!).toBeCloseTo(
      next.a.coolantHeatReceived_J! + next.b.coolantHeatReceived_J!, 8);
    const idle = transferWaterCondensate(initial, new Map(), 1);
    expect(idle.a.mass_g).toBe(0); expect(idle.a.coolantPassed_ml).toBe(10);
    const disconnected = { ...initial, a: { ...a, vaporSourceId: undefined }, b: { ...b, vaporSourceId: undefined, coolingWaterActive: false } };
    const out = transferWaterCondensate(disconnected, new Map([['source', 1]]), 1);
    expect(out.a.mass_g).toBe(0); expect(out.b.mass_g).toBe(0); expect(out.source).toBe(source);
  });
  it('does not classify 95–99 °C atmospheric water as active boiling', () => {
    for (const temperature of [90, 95, 98, 99.9]) {
      expect(['ACTIVE_BOIL', 'INTENSE_ROLLING_BOIL']).not.toContain(determineBoilingStage(temperature, 100, 300).stage);
    }
  });

  it('renders the authoritative state without integrating a second thermal history', () => {
    const manager = new VesselSimulationManager('visual_thermal', 'medium');
    const initial = water({ temperature_c: 90 });
    const rendered = manager.step(initial, 1, { heatPower_W: 100, thermalStateAuthoritative: true });
    expect(rendered.temperature_c).toBe(90);
    expect(rendered.mass_g).toBe(100);
    expect(rendered.evaporated_ml).toBe(0);
    expect(rendered.density_g_ml).toBeLessThan(1.1);
  });

  it('emits no visible room-temperature vapor and stops with zero vapor supply', () => {
    const system = new EvaporationSystem(60);
    const params = { temp_c: 25, surfaceArea_cm2: 20, radius: 0.4, surfaceY: 0.2,
      mouthY: 0.5, mouthRadius: 0.4, isBoiling: false, actualRate_ml_s: 0 };
    for (let i = 0; i < 600; i++) system.update(1 / 60, params);
    expect(system.particles).toHaveLength(0);
    system.update(0.5, { ...params, temp_c: 100, isBoiling: true, actualRate_ml_s: 0.1 });
    expect(system.particles.length).toBeGreaterThan(0);
    for (let i = 0; i < 300; i++) system.update(1 / 60, params);
    expect(system.particles).toHaveLength(0);
  });

  it('computes pressure from retained gas rather than elapsed reaction time', () => {
    const initial = water({ isSealed: true, hasGas: true,
      contents: [...water().contents, { formula: 'H2', phase: 'g', moles: 0.001, mass_g: 0.002016 }] });
    const expected = 1 + 0.001 * IDEAL_GAS_R_L_ATM * 298.15 / 0.15;
    expect(sealedGasPressure(initial)).toBeCloseTo(expected, 10);
    const before = useAppStore.getState();
    try {
      useAppStore.setState({ vessels: { [initial.id]: initial }, vesselIds: [initial.id], burners: {},
        activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false });
      for (let i = 0; i < 100; i++) useAppStore.getState().tickSimulation(0.05);
      const current = useAppStore.getState().vessels[initial.id];
      expect(current.internalPressure_atm).toBeCloseTo(expected, 10);
      expect(current.isShattered).toBe(false);
    } finally { useAppStore.setState(before, true); }
  });

  it('does not shatter dry glass or create dense dilute-acid fumes from a temperature/name threshold', () => {
    const before = useAppStore.getState();
    try {
      const dry = water({ id: 'dry_glass', volume_ml: 0, mass_g: 0, contents: [], substances: [], temperature_c: 240 });
      const dilute = water({ id: 'dilute_acid', substances: ['HNO3(dil)'], contents: [
        ...water().contents, { formula: 'HNO3(dil)', phase: 'aq', moles: 0.01, mass_g: 0.63012 }] });
      useAppStore.setState({ vessels: { [dry.id]: dry, [dilute.id]: dilute }, vesselIds: [dry.id, dilute.id],
        burners: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false });
      useAppStore.getState().tickSimulation(0.05);
      expect(useAppStore.getState().vessels[dry.id].isShattered).not.toBe(true);
      expect(useAppStore.getState().vessels[dilute.id].fumingIntensity).toBe(0);
    } finally { useAppStore.setState(before, true); }
  });
});
