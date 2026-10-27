import { afterEach, describe, expect, it } from 'vitest';
import type { VesselState } from '../src/types/chemistry';
import { applyThermalEnergy, sampleHeatCapacity } from '../src/engine/thermalState';
import { applyLedgerWithThermalSinks } from '../src/engine/thermalLedger';
import { routeWaterVaporToWall, finalizeWaterVaporOutflow } from '../src/engine/waterVaporRouting';
import { stepWallCondensation } from '../src/engine/wallCondensation';
import { transferWaterCondensate } from '../src/engine/condensationTransfer';
import { stepCondenserHeatExchange, condenserCoolingSettings } from '../src/science/condenserHeatExchange';
import { DEFAULT_LAB_ENVIRONMENT, waterBoilingPointAtPressure } from '../src/science/labEnvironment';
import { waterLatentHeatJ_G } from '../src/science/waterThermodynamics';
import { useAppStore } from '../src/store/useAppStore';
import { SimulationEngine } from '../src/simulation/core/SimulationEngine';

const initial = useAppStore.getState(), boiling = waterBoilingPointAtPressure();
const cp = 4.184, saturatedH = cp * boiling + waterLatentHeatJ_G(boiling);
const sample = (patch: Partial<VesselState> = {}): VesselState => ({ id: 's', name: 's', type: 'beaker',
  position: [0, 0, 0], rotationY: 0, isLocked: false, capacity_ml: 100, volume_ml: 1, mass_g: 1, volume: 0.01,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 1, moles: 1 / 18.015 }], substances: ['H2O'],
  temperature_c: boiling, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false,
  environment: DEFAULT_LAB_ENVIRONMENT, ...patch });
const receiver = (patch: Partial<VesselState> = {}) => sample({ id: 'r', type: 'condenser',
  temperature_c: 25, volume_ml: 0, mass_g: 0, volume: 0, contents: [], vaporSourceId: 's', coolingWaterActive: true, ...patch });
afterEach(() => { useAppStore.setState(initial, true); SimulationEngine.clearAll(); });

describe('Emitted vapor carries finite enthalpy through the shared water boundary', () => {
  it('canonicalizes fully depleted water without erasing a real trace inventory', () => {
    const water = sample({ mass_g: 1 + Number.EPSILON, volume_ml: 1 + Number.EPSILON });
    const depleted = applyThermalEnergy(water, 5000);
    expect(depleted.mass_g).toBe(0);
    expect(depleted.volume_ml).toBe(0);
    const trace = { formula: 'Cu', phase: 's' as const, mass_g: 1e-18, moles: 1e-18 / 63.546 };
    const withTrace = applyThermalEnergy(sample({ contents: [...water.contents, trace] }), 5000);
    expect(withTrace.contents?.find(item => item.formula === 'Cu')?.mass_g).toBe(1e-18);
  });
  it('does not assign later dry-glass superheat to water that already boiled away', () => {
    const before = sample(), q = waterLatentHeatJ_G(boiling) + 33.2 * 400;
    const thermal = applyThermalEnergy(before, q), after = { ...before, ...thermal };
    expect(after.temperature_c).toBeCloseTo(boiling + 400, 10);
    expect(after.thermalVaporEnthalpy_J).toBeCloseTo(saturatedH, 9);
    expect(sampleHeatCapacity(after) * after.temperature_c + after.thermalVaporEnthalpy_J!
      - sampleHeatCapacity(before) * before.temperature_c).toBeCloseTo(q, 8);
    const routed = routeWaterVaporToWall(after, before, 0.01);
    expect(Number.isFinite(routed.vessel.waterVaporCarrier_mol_s)).toBe(true);
    const output = transferWaterCondensate({ s: routed.vessel, r: receiver() },
      new Map([['s', routed.availableVapor_g]]), 0.01, new Map([['s', routed.availableVaporEnergy_J]]));
    const final = finalizeWaterVaporOutflow(output.s, before, routed.availableVapor_g, 0.01, routed.availableVaporEnergy_J);
    const captured = final.wallCondensation!.inner_g + final.wallCondensation!.returned_g;
    expect(output.r.condensateReceived_g).toBeGreaterThan(0);
    expect(output.r.condenserVaporEnergyReceived_J! / output.r.condensateReceived_g!).toBeCloseTo(saturatedH, 8);
    expect(final.waterVaporReleasedEnergy_J! + output.r.condenserVaporEnergyReceived_J!
      + captured * saturatedH).toBeCloseTo(saturatedH, 8);
    expect(final.waterVaporEnergyModel).toBe('emission-ledger');
  });
  it('meters integrated evaporation enthalpy rather than estimating it at the final cooled temperature', () => {
    const before = sample({ temperature_c: 80, mass_g: 20, volume_ml: 20,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 20, moles: 20 / 18.015 }] });
    const after = { ...before, ...applyThermalEnergy(before, 0, 1, 1) };
    const energy = sampleHeatCapacity(before) * 80 - sampleHeatCapacity(after) * after.temperature_c;
    expect(after.thermalVaporEnthalpy_J).toBeCloseTo(energy, 8);
    const finalEstimate = cp * after.temperature_c + waterLatentHeatJ_G(after.temperature_c);
    expect(after.thermalVaporEnthalpy_J!).toBeGreaterThan(finalEstimate + 1);
    const routed = routeWaterVaporToWall(after, before, 1);
    const wall = routed.vessel.wallCondensation!;
    const storedLiquid = (wall.inner_g + wall.returned_g) * cp * wall.innerWall_c;
    expect(routed.availableVaporEnergy_J + wall.heatRejected_J + storedLiquid).toBeCloseTo(energy, 7);
  });
  it('keeps fusion heat out of vapor and never replays historical vapor energy as new emission', () => {
    const ice = sample({ temperature_c: 0, volume_ml: 0, contents: [
      { formula: 'H2O', phase: 's', mass_g: 1, moles: 1 / 18.015 }] });
    const melted = { ...ice, ...applyThermalEnergy(ice, 334) };
    expect(melted.thermalVaporEnthalpy_J).toBe(0);
    const current = { ...sample(), thermalVaporEnthalpy_J: 10000, programHeatApplied_J: 0 };
    const replay = applyLedgerWithThermalSinks({ ...sample(), thermalVaporEnthalpy_J: 0,
      programHeatApplied_J: 0 }, sample(), current, 1);
    expect(replay.thermalVaporEnthalpy_J).toBe(10000);
    const routed = routeWaterVaporToWall({ ...current, ...replay }, current, 1);
    expect(routed.availableVapor_g).toBe(0); expect(routed.availableVaporEnergy_J).toBe(0);
  });
  it('routes returned-wall flash at its formation enthalpy while the dry glass stays hot', () => {
    const dry = sample({ temperature_c: 240, volume_ml: 0, mass_g: 0, contents: [] });
    const before = { ...dry, wallCondensation: { ...stepWallCondensation(dry, 0, 0).wall,
      inner_g: 1, innerBeads: [{ mass_g: 1, y: -2, theta: 0, sliding: false }] } };
    const routed = routeWaterVaporToWall(before, before, 0.01);
    expect(routed.availableVapor_g).toBeCloseTo(1, 12);
    expect(routed.vessel.temperature_c).toBeGreaterThan(150);
    expect(routed.availableVaporEnergy_J).toBeCloseTo(saturatedH, 8);
    const again = routeWaterVaporToWall(routed.vessel, routed.vessel, 0.01);
    // A finite wall residue may dry; its mass/enthalpy are not a replay of the
    // historical 1-g flash, and must not be discarded with a visual cutoff.
    const residue = routed.vessel.wallCondensation!.inner_g;
    expect(again.availableVapor_g).toBeLessThanOrEqual(residue);
    const upperH = cp * Math.max(routed.vessel.temperature_c, routed.vessel.wallCondensation!.innerWall_c)
      + waterLatentHeatJ_G(0);
    expect(again.availableVaporEnergy_J).toBeLessThanOrEqual(residue * upperH);
    expect(again.vessel.thermalVaporEnthalpy_J).toBe(routed.vessel.thermalVaporEnthalpy_J);
  });
  it('does not lose further heat when numerical water residue remains in an otherwise dry vessel', () => {
    const dry = sample({ mass_g: 0, volume_ml: 0, contents: [
      { formula: 'H2O', phase: 'l', mass_g: 6e-17, moles: 6e-17 / 18.015 }] });
    const thermal = applyThermalEnergy(dry, 1000);
    expect(thermal.evaporatedStep_g).toBe(0);
    expect(thermal.temperature_c).toBeCloseTo(boiling + 1000 / 33.2, 10);
    expect(thermal.storedSensibleEnergyChange_J).toBeCloseTo(1000, 8);
    expect(thermal.thermalVaporEnthalpy_J).toBe(0);
    const limited = sample({ contents: [{ formula: 'H2O', phase: 'l', mass_g: 1 + Number.EPSILON,
      moles: (1 + Number.EPSILON) / 18.015 }] });
    const exhausted = applyThermalEnergy(limited, waterLatentHeatJ_G(boiling) + 1000);
    expect(exhausted.mass_g).toBe(0); expect(exhausted.isBoiling).toBe(false);
    expect(exhausted.storedSensibleEnergyChange_J + exhausted.thermalVaporEnthalpy_J!)
      .toBeCloseTo(waterLatentHeatJ_G(boiling) + 1000, 8);
  });
  it('splits packet mass and energy once across multiple connected receivers and exhaust', () => {
    const source = sample({ temperature_c: 300, waterVaporCarrier_mol_s: 0 });
    const out = transferWaterCondensate({ s: source, r: receiver({ capacity_ml: 0.25 }),
      r2: receiver({ id: 'r2' }) }, new Map([['s', 1]]), 1, new Map([['s', saturatedH]]));
    const totalMass = out.r.mass_g + out.r2.mass_g;
    expect(out.r.mass_g).toBe(0.25); expect(totalMass).toBeCloseTo(1, 10);
    expect(out.r.condenserVaporEnergyReceived_J! / out.r.mass_g).toBeCloseTo(saturatedH, 9);
    expect(out.r2.condenserVaporEnergyReceived_J! / out.r2.mass_g).toBeCloseTo(saturatedH, 9);
    expect(out.s.condensedTransferEnergy_J).toBeCloseTo(saturatedH, 8);
    expect(finalizeWaterVaporOutflow(out.s, source, 1, 1, saturatedH).waterVaporReleasedEnergy_J).toBeCloseTo(0, 8);
  });
  it('rejects invalid packet energy while still advancing the independently supplied coolant', () => {
    const settings = { dt: 1, vapor_g: 1, maxCondensate_g: 1, sourceTemperature_c: 200,
      interfaceTemperature_c: boiling, initialTemperature_c: 80, initialCapacity_J_K: 33.2,
      cooling: condenserCoolingSettings() };
    for (const h of [NaN, Infinity, -1, cp * boiling]) {
      const r = stepCondenserHeatExchange({ ...settings, vaporSpecificEnthalpy_J_g: h });
      expect(r.recovered_g).toBe(0); expect(r.receivedVaporEnergy_J).toBe(0);
      expect(r.temperature_c).toBeLessThan(80); expect(r.coolantVolume_ml).toBe(10);
    }
  });
  it('carries local wall-drying enthalpy without inventing new thermal emission from the bulk', () => {
    const dry = sample({ temperature_c: 25, mass_g: 0, volume_ml: 0, contents: [] });
    const before = { ...dry, wallCondensation: { ...stepWallCondensation(dry, 0, 0).wall,
      inner_g: 0.001, innerBeads: [{ mass_g: 0.001, y: 0, theta: 0, sliding: false }] } };
    const r = routeWaterVaporToWall(before, before, 1), wall = r.vessel.wallCondensation!;
    expect(r.availableVapor_g).toBeGreaterThan(0);
    expect(wall.innerWall_c).toBeLessThan(25);
    const meanT = r.availableVaporTemperatureMass_c_g / r.availableVapor_g;
    expect(meanT).toBeGreaterThan(wall.innerWall_c); expect(meanT).toBeLessThan(25);
    expect(r.availableVaporEnergy_J + wall.inner_g * cp * wall.innerWall_c).toBeCloseTo(0.001 * cp * 25, 10);
    expect(wall.heatRejected_J).toBe(0);
    expect(r.vessel.thermalVaporEnthalpy_J ?? 0).toBe(0);
  });
  it('preserves fresh-stream partial pressure when parallel receivers share one diluted source', () => {
    const source = sample({ waterVaporCarrier_mol_s: 1 / 18.015 / 10 });
    const out = transferWaterCondensate({ s: source, r: receiver({ capacity_ml: 0.9,
      condenserCooling: { conductance_W_K: 500, flow_ml_s: 100 } }),
      r2: receiver({ id: 'r2', temperature_c: 60, coolingWaterActive: false }) },
    new Map([['s', 1]]), 10, new Map([['s', saturatedH]]));
    expect(out.r.mass_g).toBeCloseTo(0.9, 10); expect(out.r2.mass_g).toBeCloseTo(0.1, 10);
    expect(out.r2.temperature_c).toBeGreaterThan(60);
    expect(out.s.condensedTransferEnergy_J).toBeCloseTo(saturatedH, 8);
  });
  it('uses the emission ledger in the actual store tick and preserves existing vessel IDs', () => {
    const source = sample({ effectHeatInput_W: 5000 });
    useAppStore.setState({ vessels: { s: source, r: receiver() }, vesselIds: ['s', 'r'], burners: {}, spills: {},
      activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
    for (let i = 0; i < 20; i++) useAppStore.getState().tickSimulation(0.05);
    const { s, r } = useAppStore.getState().vessels;
    expect(Object.keys(useAppStore.getState().vessels)).toEqual(['s', 'r']);
    expect(s.temperature_c).toBeGreaterThan(120); expect(s.mass_g).toBe(0);
    expect(s.thermalVaporEnthalpy_J).toBeCloseTo(saturatedH, 6);
    expect(r.condensateReceived_g).toBeGreaterThan(0);
    expect(r.condenserVaporEnergyReceived_J! / r.condensateReceived_g!).toBeCloseTo(saturatedH, 6);
    expect(s.waterVaporEnergyModel).toBe('emission-ledger');
    expect(s.waterVaporReleasedEnergy_J).toBeGreaterThanOrEqual(0);
  });
});
