import { afterEach, describe, expect, it } from 'vitest';
import { finalizeWaterVaporOutflow, postRecoveryExhaustG, routeWaterVaporToWall } from '../src/engine/waterVaporRouting';
import { transferWaterCondensate } from '../src/engine/condensationTransfer';
import { applyLedgerWithThermalSinks } from '../src/engine/thermalLedger';
import { computeMolarMass } from '../src/engine/ledger';
import { useAppStore } from '../src/store/useAppStore';
import { planStudioProgram } from '../src/engine/studioProgram';
import { getProgramById } from '../src/vfx/programs/library';
import { stepWallCondensation } from '../src/engine/wallCondensation';
import { waterVisualState } from '../src/vfx/waterVisualState';
import { EvaporationSystem } from '../src/simulation/effects/EvaporationSystem';
import { planSodiumWater } from '../src/engine/sodiumWaterPlan';
import { resolveReactionEmission } from '../src/vfx/reactionActivity';
import type { VesselState } from '../src/types/chemistry';

const original = useAppStore.getState();
afterEach(() => useAppStore.setState(original, true));
const sample = (patch: Partial<VesselState> = {}): VesselState => ({ id: 'source', name: 'source', type: 'beaker',
  position: [0, 0, 0], rotationY: 0, isLocked: false, capacity_ml: 100, mass_g: 1,
  volume_ml: 0, volume: 0, temperature_c: 85, ph: 7, hasGas: false, hasPrecipitate: false,
  isBoiling: false, contents: [], substances: [], ...patch });
const condenser = (patch: Partial<VesselState> = {}) => sample({ id: 'receiver', type: 'condenser', mass_g: 0,
  temperature_c: 25, vaporSourceId: 'source', coolingWaterActive: true, ...patch });
const liquidWater = (v: Partial<VesselState>) => v.contents?.filter(c => c.formula === 'H2O' && c.phase === 'l').reduce((s, c) => s + c.mass_g, 0) ?? 0;
const gasStep = (water_g = 0.1, co2_g = water_g / 18.015 * 44.009) => sample({
  escapedGas_g: { H2O: water_g, CO2: co2_g }, mass_g: 1 - water_g - co2_g });

describe('One water-vapor routing boundary for thermal and chemical sources', () => {
  it('captures finite H2O from a dry chemical source before handing the rest to the condenser', () => {
    const previous = sample(), current = gasStep(), snapshot = JSON.stringify(current);
    const routed = routeWaterVaporToWall(current, previous, 1);
    expect(routed.vessel.wallCondensation!.inner_g).toBeGreaterThan(0);
    expect(routed.availableVapor_g + routed.vessel.wallCondensation!.inner_g
      + routed.vessel.wallCondensation!.returned_g).toBeCloseTo(0.1, 12);
    const receiver = condenser();
    const recovered = transferWaterCondensate({ source: routed.vessel, receiver }, new Map([['source', routed.availableVapor_g]]), 1);
    const final = finalizeWaterVaporOutflow(recovered.source, previous, routed.availableVapor_g, 1);
    expect(final.waterVaporOutflow_g_s).toBeCloseTo(0, 12);
    expect(final.waterVaporFromChemistry_g).toBeCloseTo(0.1, 12);
    expect(recovered.receiver.condensateReceived_g).toBeGreaterThan(0);
    expect(final.mass_g + final.wallCondensation!.inner_g + recovered.receiver.mass_g
      + Object.values(postRecoveryExhaustG(final)).reduce((s, n) => s + n, 0)).toBeCloseTo(1, 12);
    expect(JSON.stringify(current)).toBe(snapshot);
  });
  it('does not replay old chemical exhaust as a fresh source in the next step', () => {
    const first = routeWaterVaporToWall(gasStep(), sample(), 0.1);
    const next = routeWaterVaporToWall(first.vessel, first.vessel, 0.1);
    const priorWall = first.vessel.wallCondensation!, afterWall = next.vessel.wallCondensation!;
    // Old exhaust is not emitted again. Existing condensate can now dry into
    // unsaturated room air, even while the sample is warmer than the wall.
    expect(next.availableVapor_g).toBeGreaterThan(0);
    expect(next.availableVapor_g + afterWall.inner_g + afterWall.returned_g - priorWall.returned_g)
      .toBeCloseTo(priorWall.inner_g, 12);
    expect(next.vessel.waterVaporFromChemistry_g).toBeCloseTo(0.1, 12);
    expect(afterWall.inner_g).toBeLessThan(priorWall.inner_g);
  });
  it('does not turn room-temperature wall drying into a jet of pure steam or white fog', () => {
    const previous = sample({ temperature_c: 25,
      wallCondensation: { ...stepWallCondensation(sample({ temperature_c: 25 }), 0, 0).wall, inner_g: 0.001 } });
    const out = routeWaterVaporToWall(previous, previous, 1);
    expect(out.availableVapor_g).toBeGreaterThan(0);
    const final = finalizeWaterVaporOutflow(out.vessel, previous, out.availableVapor_g, 1);
    expect(final.waterVaporPartialPressure_Pa).toBeLessThan(4000);
    expect(waterVisualState(final).visibility).toBe(0);
  });
  it('does not condense dilute water gas merely because the reaction is hot', () => {
    const previous = sample(), current = gasStep(0.0001, 1);
    const out = routeWaterVaporToWall(current, previous, 1);
    expect(out.vessel.wallCondensation!.inner_g).toBe(0);
    const final = finalizeWaterVaporOutflow(out.vessel, previous, out.availableVapor_g, 1);
    expect(final.waterVaporPartialPressure_Pa).toBeLessThan(1000);
    expect(waterVisualState(final).visibility).toBe(0);
  });
  it('keeps thermal and reaction sources in one budget without advancing the wall twice', () => {
    const previous = sample(), current = gasStep();
    current.evaporated_ml = 0.02;
    current.mass_g -= 0.02;
    const out = routeWaterVaporToWall(current, previous, 0.1);
    expect(out.availableVapor_g + out.vessel.wallCondensation!.inner_g + out.vessel.wallCondensation!.returned_g).toBeCloseTo(0.12, 12);
    expect(out.vessel.evaporationRate_g_s).toBeCloseTo(0.2, 12);
    expect(out.vessel.waterVaporFromChemistry_g).toBeCloseTo(0.1, 12);
  });
  it('preserves gas inside a sealed vessel and emits no external water', () => {
    const previous = sample({ isSealed: true }), current = { ...previous,
      contents: [{ formula: 'H2O', phase: 'g', mass_g: 0.1, moles: 0.1 / 18.015 }] };
    const out = routeWaterVaporToWall(current, previous, 0.1);
    expect(out.availableVapor_g).toBe(0);
    expect(out.vessel.contents).toEqual(current.contents);
  });
  it('reduces partial pressure after a capacity-limited condenser and updates its solution concentration', () => {
    const previous = sample(), current = gasStep();
    const routed = routeWaterVaporToWall(current, previous, 1);
    const uncollected = finalizeWaterVaporOutflow(routed.vessel, previous, routed.availableVapor_g, 1);
    const receiver = condenser({ capacity_ml: 0.0002, volume_ml: 0.0001, mass_g: 0.0001 + 1e-8 * 58.44,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 0.0001, moles: 0.0001 / 18.015 },
        { formula: 'NaCl', phase: 'aq', mass_g: 1e-8 * 58.44, moles: 1e-8 }] });
    const next = transferWaterCondensate({ source: routed.vessel, receiver }, new Map([['source', routed.availableVapor_g]]), 1);
    const collected = finalizeWaterVaporOutflow(next.source, previous, routed.availableVapor_g, 1);
    expect(collected.waterVaporPartialPressure_Pa!).toBeLessThan(uncollected.waterVaporPartialPressure_Pa!);
    expect(next.receiver.contents.find(c => c.formula === 'NaCl')!.concentration_M).toBeCloseTo(0.05, 10);
    expect(next.receiver.condensateReceived_g).toBeCloseTo(0.0001, 12);
  });
  it('authorizes mist from dry-source exhaust but only with supersaturated mixing conditions', () => {
    const previous = sample({ temperature_c: 100 }), current = gasStep(0.1, 0);
    current.temperature_c = 100;
    const routed = routeWaterVaporToWall(current, previous, 1);
    const final = finalizeWaterVaporOutflow(routed.vessel, previous, routed.availableVapor_g, 1);
    expect(final.volume_ml).toBe(0);
    expect(waterVisualState(final).mistRate).toBeGreaterThan(0);
    expect(resolveReactionEmission(final).steam).toBe(true);
    const sim = new EvaporationSystem();
    sim.update(1, { temp_c: 100, actualRate_g_s: final.waterVaporOutflow_g_s, surfaceY: 0,
      mouthY: 1, mouthRadius: 0.3, radius: 0.3, surfaceArea_cm2: 1, isBoiling: false,
      sourceWaterPressure_Pa: final.waterVaporPartialPressure_Pa });
    expect(sim.particles.length).toBeGreaterThan(0);
    const dry = new EvaporationSystem();
    dry.update(1, { temp_c: 100, actualRate_g_s: 1, surfaceY: 0, mouthY: 1, mouthRadius: 0.3,
      radius: 0.3, surfaceArea_cm2: 1, isBoiling: false, sourceWaterPressure_Pa: 100 });
    expect(dry.particles).toHaveLength(0);
  });
  it.each([0, -1, NaN, Infinity])('does not route at invalid time %s', dt => {
    const current = gasStep(), out = routeWaterVaporToWall(current, sample(), dt);
    expect(out.vessel).toBe(current);
    expect(out.availableVapor_g).toBe(0);
  });
});

describe('Reaction replay preserves recovered water as a signed material flow', () => {
  it('retains chemical condensate returned to a sample even when evaporation was zero', () => {
    const baseline = sample(), current = sample({ temperature_c: 25, volume_ml: 0.01,
      wallCondensation: { ...stepWallCondensation(sample(), 0, 0).wall, returned_g: 0.01 } });
    const cumulative = { contents: [], mass_g: 0.9, programHeatApplied_J: 0 };
    const first = applyLedgerWithThermalSinks(cumulative, baseline, current);
    expect(liquidWater(first)).toBeCloseTo(0.01, 12);
    expect(first.mass_g).toBeCloseTo(0.91, 12);
    const second = applyLedgerWithThermalSinks(cumulative, baseline, { ...current, ...first });
    expect(liquidWater(second)).toBeCloseTo(0.01, 12);
    expect(second.mass_g).toBeCloseTo(0.91, 12);
  });
  it('subtracts baseline receipts and combines condenser receipts with later evaporation once', () => {
    const baseline = sample({ condensateReceived_g: 1, evaporated_ml: 0.2 });
    const current = sample({ condensateReceived_g: 1.01, evaporated_ml: 0.204, temperature_c: 25, volume_ml: 0.006 });
    const result = applyLedgerWithThermalSinks({ contents: [], mass_g: 0.9, programHeatApplied_J: 0 }, baseline, current);
    expect(liquidWater(result)).toBeCloseTo(0.006, 12);
    expect(result.mass_g).toBeCloseTo(0.906, 12);
  });
});

describe('Live reaction water reaches real receivers after chemistry', () => {
  it('routes water vaporized by reaction heat in the same tick and never counts it as chemical H2O product', () => {
    const source = sample({ temperature_c: 100, mass_g: 5.4598, volume_ml: 5, volume: 0.05,
      contents: [{ formula: 'Na', phase: 's', moles: 0.02, mass_g: 0.4598 },
        { formula: 'H2O', phase: 'l', mass_g: 5, moles: 5 / 18.015 }], substances: ['Na', 'H2O'] });
    const plan = planSodiumWater(source, 'vi')!;
    const receiver = condenser();
    useAppStore.setState({ vessels: { source: plan.vessel, receiver }, vesselIds: ['source', 'receiver'],
      activeKinetics: { source: plan.kinetics }, pendingReactions: {}, burners: {}, dissolvingSubstances: {},
      isSimulationPaused: false, timeScale: 1 });
    let firstVaporChecked = false;
    for (let i = 0; i < 120; i++) {
      useAppStore.getState().tickSimulation(1 / 60);
      const vessels = Object.values(useAppStore.getState().vessels);
      const current = useAppStore.getState().vessels.source;
      const accounted = vessels.reduce((sum, v) => sum + v.mass_g + (v.wallCondensation?.inner_g ?? 0)
        + Object.values(postRecoveryExhaustG(v)).reduce((s, n) => s + n, 0), 0);
      expect(accounted).toBeCloseTo(source.mass_g, 9);
      if (!firstVaporChecked && (current.evaporated_ml ?? 0) > 1e-6) {
        expect((current.wallCondensation?.inner_g ?? 0) + (current.condensedTransfer_g ?? 0)).toBeGreaterThan(0);
        firstVaporChecked = true;
      }
    }
    expect(firstVaporChecked).toBe(true);
    expect(useAppStore.getState().vessels.receiver.condensateReceived_g).toBeGreaterThan(0);
    expect(useAppStore.getState().vessels.source.waterVaporFromChemistry_g).toBe(0);
  });
  it.each([false, true])('conserves mass and source quantities throughout NaHCO3 progress, reverse iteration=%s', reverse => {
    const program = getProgramById('nahco3_heat')!;
    // The modeled upper wall is below the equimolar H2O/CO2 dew point here;
    // a 200 °C sample would instead have an upper wall too hot to collect dew.
    const source = sample({ temperature_c: 150, mass_g: 0.02 * computeMolarMass('NaHCO3'),
      contents: [{ formula: 'NaHCO3', phase: 's', moles: 0.02, mass_g: 0.02 * computeMolarMass('NaHCO3') }], substances: ['NaHCO3'] });
    const plan = planStudioProgram(program, source, 'vi');
    expect(plan.kinetics).toBeDefined();
    const receiver = condenser();
    useAppStore.setState({ vessels: reverse ? { receiver, source } : { source, receiver }, vesselIds: ['source', 'receiver'],
      activeKinetics: { source: plan.kinetics! }, pendingReactions: {}, burners: {}, dissolvingSubstances: {},
      isSimulationPaused: false, timeScale: 1 });
    for (let i = 0; i < 120; i++) {
      useAppStore.getState().tickSimulation(1 / 60);
      const vessels = Object.values(useAppStore.getState().vessels);
      const accounted = vessels.reduce((sum, v) => sum + v.mass_g + (v.wallCondensation?.inner_g ?? 0)
        + (v.wallCondensation?.outer_g ?? 0) + Object.values(postRecoveryExhaustG(v)).reduce((s, n) => s + n, 0), 0);
      expect(accounted).toBeCloseTo(source.mass_g, 9);
    }
    const final = useAppStore.getState().vessels;
    expect(final.receiver.condensateReceived_g).toBeGreaterThan(0);
    expect(final.source.waterVaporFromChemistry_g).toBeGreaterThan(0);
    expect(final.source.wallCondensation!.inner_g).toBeGreaterThan(0);
    expect(final.source.waterVaporReleased_g).toBeCloseTo(0, 12);
    useAppStore.setState({ isSimulationPaused: true });
    const frozen = useAppStore.getState().vessels;
    useAppStore.getState().tickSimulation(0.1);
    expect(useAppStore.getState().vessels).toBe(frozen);
  });
});
