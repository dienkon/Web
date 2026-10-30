import { afterEach, describe, expect, it } from 'vitest';
import { equilibrateMoistAirWater, plumeWaterEnthalpyJ_G, waterPlumeState } from '../src/science/moistAirFog';
import { waterSaturationPressurePa, waterSaturationTemperatureC } from '../src/science/waterSaturation';
import { waterBoilingPointAtPressure, DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { waterLatentHeatJ_G } from '../src/science/waterThermodynamics';
import { applyThermalEnergy } from '../src/engine/thermalState';
import { applyLedgerWithThermalSinks } from '../src/engine/thermalLedger';
import { routeWaterVaporToWall, finalizeWaterVaporOutflow } from '../src/engine/waterVaporRouting';
import { stepWallCondensation } from '../src/engine/wallCondensation';
import { waterVisualState } from '../src/vfx/waterVisualState';
import { buildProgramLedgerView } from '../src/vfx/programs/player/authoritativeView';
import { ProgramPlayer } from '../src/vfx/programs/player/ProgramPlayer';
import { ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library';
import { useAppStore, type ActiveKineticsState } from '../src/store/useAppStore';
import { SimulationEngine, VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { EvaporationSystem } from '../src/simulation/effects/EvaporationSystem';
import type { VesselState } from '../src/types/chemistry';

const original = useAppStore.getState(), pressure = 101325, cp = 4.184, ratio = 0.621945;
const boiling = waterBoilingPointAtPressure(), hv = cp * boiling + waterLatentHeatJ_G(boiling);
const sample = (patch: Partial<VesselState> = {}): VesselState => ({ id: 'b', name: 'b', type: 'beaker',
  position: [0, 0, 0], rotationY: 0, isLocked: false, volume_ml: 1, volume: 0.01, capacity_ml: 100, mass_g: 1,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 1, moles: 1 / 18.015 }], substances: ['H2O'],
  temperature_c: boiling, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false,
  environment: DEFAULT_LAB_ENVIRONMENT, ...patch });
const kinetics = (progress = 0.5) => ({ progress, duration: 10 } as ActiveKineticsState);
const finish = (before: VesselState, current: VesselState, dt = 0.01) => {
  const r = routeWaterVaporToWall(current, before, dt);
  return finalizeWaterVaporOutflow(r.vessel, before, r.availableVapor_g, dt, r.availableVaporEnergy_J, r.availableVaporTemperatureMass_c_g);
};
afterEach(() => { useAppStore.setState(original, true); SimulationEngine.clearAll(); });

describe('Adiabatic water/air/droplet equilibrium for mist visibility', () => {
  it('recovers an independently constructed saturated-air plus liquid state and conserves its enthalpy', () => {
    const q = 0.03, dry = 1 - q, t = 30, ps = waterSaturationPressurePa(t);
    const vapor = dry * ratio * ps / (pressure - ps), liquid = q - vapor;
    const h = dry * 1.006 * t + vapor * (cp * t + waterLatentHeatJ_G(t)) + liquid * cp * t;
    const r = equilibrateMoistAirWater(q, h, pressure);
    expect(r.status).toBe('fog'); expect(r.temperature_c).toBeCloseTo(t, 8);
    expect(r.condensateFraction).toBeCloseTo(liquid, 10);
    expect(r.condensateFraction + r.vaporFraction).toBeCloseTo(q, 14);
    expect(r.enthalpyResidual_J_g).toBeCloseTo(0, 7);
  });
  it('accounts for latent warming instead of rendering all excess vapor at the uncondensed gas temperature', () => {
    const q = 0.03, dry = 1 - q, t = 30, ps = waterSaturationPressurePa(t);
    const vapor = dry * ratio * ps / (pressure - ps);
    const h = (dry * 1.006 + q * cp) * t + vapor * waterLatentHeatJ_G(t);
    let low = 0, high = t;
    for (let i = 0; i < 48; i++) {
      const mid = (low + high) / 2, allVaporH = dry * 1.006 * mid + q * plumeWaterEnthalpyJ_G(mid, pressure);
      if (allVaporH < h) low = mid; else high = mid;
    }
    const uncondensedT = (low + high) / 2, naivePs = waterSaturationPressurePa(uncondensedT);
    const naiveLiquid = q - dry * ratio * naivePs / (pressure - naivePs), r = equilibrateMoistAirWater(q, h, pressure);
    expect(r.temperature_c!).toBeGreaterThan(uncondensedT); expect(r.condensateFraction).toBeLessThan(naiveLiquid);
    expect(r.condensateFraction).toBeGreaterThan(0);
  });
  it('supports pure steam and remains continuous near zero dry-air mass without a 0.99-pressure cap', () => {
    for (const dry of [0.01, 1e-5, 1e-9, 0]) {
      const q = 1 - dry, vapor = 0.25;
      const t = dry === 0 ? boiling : waterSaturationTemperatureC(pressure * vapor / (ratio * dry + vapor));
      const h = (dry * 1.006 + q * cp) * t + vapor * waterLatentHeatJ_G(t);
      const r = equilibrateMoistAirWater(q, h, pressure);
      expect(r.vaporFraction).toBeCloseTo(vapor, 8); expect(r.condensateFraction).toBeCloseTo(q - vapor, 8);
      expect(r.temperature_c).toBeCloseTo(t, 7); expect(r.enthalpyResidual_J_g).toBeCloseTo(0, 6);
    }
  });
  it('keeps ordinary isothermal room evaporation invisible', () => {
    expect(waterPlumeState(25, 25, 0.5).visibility).toBe(0);
    const q = 0.01, h = 0.99 * 1.006 * 60 + q * plumeWaterEnthalpyJ_G(60, pressure);
    expect(equilibrateMoistAirWater(q, h, pressure).status).toBe('clear');
  });
  it('uses actual incoming water enthalpy and admits superheated source temperatures above 200 C', () => {
    expect(waterPlumeState(boiling, 20, 0.5, 1, pressure, hv).visibility).toBeGreaterThan(0);
    expect(waterPlumeState(boiling, 20, 0.5, 1, pressure, 5000).visibility).toBe(0);
    const hot = waterPlumeState(500, 20, 0.5, 1, pressure);
    expect(hot.status).toBe('liquid-equilibrium'); expect(Number.isFinite(hot.visibility)).toBe(true);
  });
  it('rejects unsupported/invalid states instead of fabricating liquid or opacity', () => {
    for (const r of [waterPlumeState(100, 25, NaN), waterPlumeState(100, 25, 0.5, 0),
      waterPlumeState(100, 25, 0.5, 1, pressure + 1), waterPlumeState(100, 25, 0.5, 1, pressure, -1),
      waterPlumeState(NaN, 25, 0.5), waterPlumeState(100, -10, 0.5)]) {
      expect(r.visibility).toBe(0); expect(r.status).toBe('outside-model');
    }
  });
});

describe('Emission temperature and enthalpy reach both actual VFX paths', () => {
  it('renders boil-off at its emission temperature after the glass has heated to almost 500 C', () => {
    const before = sample(), current = { ...before, ...applyThermalEnergy(before, waterLatentHeatJ_G(boiling) + 33.2 * 400) };
    const final = finish(before, current), snapshot = structuredClone(final), visual = waterVisualState(final);
    expect(final.temperature_c).toBeGreaterThan(490); expect(final.waterVaporTemperature_c).toBeCloseTo(boiling, 9);
    expect(final.waterVaporSpecificEnthalpy_J_g).toBeCloseTo(hv, 8);
    expect(visual.visibility).toBeGreaterThan(0); expect(visual.isBoiling).toBe(false);
    const view = buildProgramLedgerView(final, kinetics());
    expect(view.waterMistVisibility).toBe(visual.visibility); expect(view.waterVaporTemperature_c).toBe(visual.sourceTemperature_c);
    expect(final).toEqual(snapshot);
  });
  it('carries the integrated mass-weighted emission temperature during finite evaporative cooling', () => {
    const before = sample({ temperature_c: 80, mass_g: 20, volume_ml: 20, contents: [
      { formula: 'H2O', phase: 'l', mass_g: 20, moles: 20 / 18.015 }] });
    const thermal = applyThermalEnergy(before, 0, 1, 1), after = { ...before, ...thermal };
    const expected = thermal.vaporSensibleEnergy_J / (cp * thermal.evaporatedStep_g), final = finish(before, after);
    expect(expected).toBeGreaterThan(after.temperature_c); expect(expected).toBeLessThan(80);
    expect(final.waterVaporTemperature_c).toBeCloseTo(expected, 8);
    expect(final.waterVaporTemperatureModel).toBe('emission-ledger');
  });
  it('preserves the cumulative sensible meter across reaction replay without re-emitting history', () => {
    const before = sample({ temperature_c: 30, evaporated_ml: 2, thermalVaporSensibleEnthalpy_J: 1000 });
    const patch = applyLedgerWithThermalSinks({ ...sample({ temperature_c: 30 }), thermalVaporSensibleEnthalpy_J: 0,
      programHeatApplied_J: 0 }, sample(), before, 1);
    expect(patch.thermalVaporSensibleEnthalpy_J).toBe(1000);
    const r = routeWaterVaporToWall({ ...before, ...patch }, before, 1);
    expect(r.availableVaporTemperatureMass_c_g).toBe(0);
  });
  it('clears stale stream diagnostics and mist when recovery leaves no external vapor', () => {
    const before = sample(), current = { ...before, condensedTransfer_g: 1, waterVaporTemperature_c: boiling,
      waterVaporSpecificEnthalpy_J_g: hv, isBoiling: true, evaporationRate_g_s: 1 };
    const final = finalizeWaterVaporOutflow(current, before, 1, 1, hv, boiling);
    expect(final.waterVaporTemperature_c).toBeUndefined(); expect(final.waterVaporSpecificEnthalpy_J_g).toBeUndefined();
    expect(final.waterVaporReleasedEnergy_J).toBe(0);
    expect(waterVisualState(final).visibility).toBe(0); expect(waterVisualState(final).isBoiling).toBe(true);
    const partial = finalizeWaterVaporOutflow({ ...before, condensedTransfer_g: 0.5 }, before, 2, 1, 2 * hv, 2 * boiling);
    expect(partial.waterVaporReleasedEnergy_J).toBeCloseTo(1.5 * hv, 9);
    expect(partial.waterVaporTemperature_c).toBeCloseTo(boiling, 10);
  });
  it('invalidates its exact-state visual cache when an exposed packet or environment value changes', () => {
    const v = sample({ temperature_c: 500, volume_ml: 0, waterVaporOutflow_g_s: 0.1,
      waterVaporTemperature_c: boiling, waterVaporSpecificEnthalpy_J_g: hv, waterVaporPartialPressure_Pa: pressure });
    const first = waterVisualState(v); expect(waterVisualState(v)).toBe(first); expect(first.visibility).toBeGreaterThan(0);
    v.waterVaporSpecificEnthalpy_J_g = 5000;
    expect(waterVisualState(v).visibility).toBe(0);
    v.waterVaporSpecificEnthalpy_J_g = hv; v.waterVaporTemperature_c = NaN;
    expect(waterVisualState(v).visibility).toBe(0);
  });
  it('allows wall-only steam in live VFX and reaction playback even with zero bulk evaporation', () => {
    const dry = sample({ temperature_c: 240, volume_ml: 0, mass_g: 0, contents: [] });
    const source = { ...dry, wallCondensation: { ...stepWallCondensation(dry, 0, 0).wall,
      inner_g: 0.01, innerWall_c: boiling, innerBeads: [{ mass_g: 0.01, y: 0.5, theta: 0, sliding: false }] } };
    useAppStore.setState({ vessels: { b: source }, vesselIds: ['b'], burners: {}, spills: {}, activeKinetics: {},
      pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
    useAppStore.getState().tickSimulation(0.05);
    const final = useAppStore.getState().vessels.b;
    expect(Object.keys(useAppStore.getState().vessels)).toEqual(['b']);
    expect(final.evaporationRate_g_s).toBe(0); expect(final.waterVaporOutflow_g_s).toBeGreaterThan(0);
    expect(final.waterVaporTemperature_c).toBeCloseTo(boiling, 7); expect(waterVisualState(final).mistRate).toBeGreaterThan(0);
    const program = ALL_HANDCRAFTED_PROGRAMS.find(p => p.visual?.timeline?.some(i => i.atom === 'thermalSteam'))!;
    const item = program.visual!.timeline!.find(i => i.atom === 'thermalSteam')!;
    const progress = (item.window[0] + item.window[1]) / 2, player = new ProgramPlayer();
    const session = player.startProgram('b', program), view = buildProgramLedgerView(final, kinetics(progress));
    player.update(0.05, { b: view });
    expect(session.activeAtoms.has(item.id)).toBe(true);
    expect(session.activeAtoms.get(item.id)!.handle.custom.steamVigor).toBeGreaterThan(0);
    player.stopProgram('b');
  });
  it('feeds actual mist particles from the emitted packet after dryout, without a second solvent debit', () => {
    const before = sample(), current = { ...before, ...applyThermalEnergy(before, waterLatentHeatJ_G(boiling) + 33.2 * 400) };
    const final = finish(before, current, 1), snapshot = structuredClone(final);
    const manager = new VesselSimulationManager('b');
    manager.step(final, 1, { thermalStateAuthoritative: true });
    expect(manager.evaporationSystem.particles.length).toBeGreaterThan(0);
    expect(manager.evaporationSystem.acceptedVapor_g).toBeCloseTo(final.waterVaporOutflow_g_s!, 12);
    expect(final).toEqual(snapshot);
    const clear = new VesselSimulationManager('b');
    clear.step({ ...final, waterVaporSpecificEnthalpy_J_g: 5000 }, 1, { thermalStateAuthoritative: true });
    expect(clear.evaporationSystem.particles).toHaveLength(0);
    manager.reset(); clear.reset();
  });
  it('continues aging existing mist when a zero-source frame has a hot glass temperature above 200 C', () => {
    const params = { temp_c: boiling, ambient_c: 25, relativeHumidity: 0.5, pressure_atm: 1,
      sourceWaterPressure_Pa: pressure, sourceWaterEnthalpy_J_g: hv, actualRate_g_s: 1,
      radius: 0.5, mouthRadius: 0.2, surfaceY: 0, mouthY: 1, surfaceArea_cm2: 10, isBoiling: false };
    const sim = new EvaporationSystem(); sim.update(1, params);
    expect(sim.particles.length).toBeGreaterThan(0);
    sim.update(3, { ...params, actualRate_g_s: 0, temp_c: 500 });
    expect(sim.acceptedSeconds).toBe(4); expect(sim.acceptedVapor_g).toBe(1);
    expect(sim.particles).toHaveLength(0);
  });
});
