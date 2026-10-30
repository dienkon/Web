import { afterEach, describe, expect, it } from 'vitest';
import { waterLatentHeatJ_G, waterSaturationProperties } from '../src/science/waterThermodynamics';
import { waterSaturationPressurePa } from '../src/science/waterSaturation';
import { waterBoilingPointAtPressure, DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { applyThermalEnergy, sampleHeatCapacity } from '../src/engine/thermalState';
import { transferWaterCondensate } from '../src/engine/condensationTransfer';
import { stepWallCondensation } from '../src/engine/wallCondensation';
import { condenseBubbleVapor, saturationTemperatureC } from '../src/science/bubblePhase';
import { useAppStore } from '../src/store/useAppStore';
import { SimulationEngine } from '../src/simulation/core/SimulationEngine';
import type { VesselState } from '../src/types/chemistry';
import { effects } from '../src/vfx/vesselEffects';

const before = useAppStore.getState();
const water = (patch: Partial<VesselState> = {}): VesselState => ({ id: 's', name: 's', type: 'beaker',
  position: [0, 0, 0], rotationY: 0, isLocked: false, capacity_ml: 100, volume_ml: 50, volume: 0.5,
  mass_g: 50, temperature_c: 25, ph: 7, hasGas: false, isBoiling: false, hasPrecipitate: false,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }], substances: ['H2O'],
  environment: DEFAULT_LAB_ENVIRONMENT, ...patch });
afterEach(() => { useAppStore.setState(before, true); SimulationEngine.clearAll(); });

describe('IAPWS saturation enthalpy and latent heat', () => {
  it('matches the release Table 1 at the triple point, standard boiling reference and critical point', () => {
    const triple = waterSaturationProperties(0.01)!;
    expect(triple.pressureSlope_Pa_K).toBeCloseTo(44.436693, 5);
    expect(triple.liquidDensity_kg_m3).toBeCloseTo(999.789, 3);
    expect(triple.vaporDensity_kg_m3).toBeCloseTo(0.00485426, 7);
    expect(triple.liquidEnthalpy_J_g * 1000).toBeCloseTo(0.611786, 5);
    expect(triple.vaporEnthalpy_J_g).toBeCloseTo(2500.5, 1);
    const boiling = waterSaturationProperties(373.1243 - 273.15)!;
    expect(boiling.liquidEnthalpy_J_g).toBeCloseTo(419.05, 2);
    expect(boiling.vaporEnthalpy_J_g).toBeCloseTo(2675.7, 1);
    const critical = waterSaturationProperties(373.946)!;
    expect(critical.liquidDensity_kg_m3).toBe(322); expect(critical.vaporDensity_kg_m3).toBe(322);
    expect(critical.liquidEnthalpy_J_g).toBeCloseTo(2086.6, 1);
    expect(critical.latentHeat_J_g).toBe(0);
  });
  it('agrees with an independent pressure finite difference and obeys the Clapeyron phase relation', () => {
    for (const t of [5, 25, 80, 100, 200, 350]) {
      const p = waterSaturationProperties(t)!, delta = 0.0001;
      const slope = (waterSaturationPressurePa(t + delta) - waterSaturationPressurePa(t - delta)) / (2 * delta);
      expect(p.pressureSlope_Pa_K / slope).toBeCloseTo(1, 7);
      expect(p.vaporEnthalpy_J_g - p.liquidEnthalpy_J_g).toBeCloseTo(p.latentHeat_J_g, 8);
    }
  });
  it('reduces latent heat with temperature, reaches zero at criticality and rejects unsupported phases', () => {
    const values = [0, 25, 50, 100, 200, 300, 373.946].map(waterLatentHeatJ_G);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeLessThan(values[i - 1]);
    expect(values[1]).toBeGreaterThan(2440); expect(values[1]).toBeLessThan(2443);
    for (const t of [-1, NaN, Infinity, 374]) {
      expect(waterSaturationProperties(t)).toBeNull(); expect(waterLatentHeatJ_G(t)).toBeNaN();
    }
  });
});

describe('Finite phase-energy budgets', () => {
  it('uses surface temperature for ambient evaporation and closes the sensible/latent packet', () => {
    for (const t of [5, 25, 80]) {
      const initial = water({ temperature_c: t }), result = applyThermalEnergy(initial, 0, 1, 0.01);
      expect(result.evaporatedStep_g).toBe(0.01);
      expect(result.latentEnergy_J).toBeGreaterThanOrEqual(0.01 * waterLatentHeatJ_G(t));
      expect(result.latentEnergy_J).toBeLessThanOrEqual(0.01 * waterLatentHeatJ_G(result.temperature_c));
      expect(result.storedSensibleEnergyChange_J + result.vaporSensibleEnergy_J + result.latentEnergy_J).toBeCloseTo(0, 8);
      expect(result.sensibleEnergy_J + result.latentEnergy_J).toBeCloseTo(0, 10);
      expect(result.mass_g + result.evaporatedStep_g).toBe(50);
      useAppStore.setState({ vessels: { s: initial } });
      const view = effects.forVessel('s').inspect().state!;
      expect(view.waterLatentHeat_J_g).toBe(waterLatentHeatJ_G(t));
      expect(view.boilingWaterLatentHeat_J_g).toBe(waterLatentHeatJ_G(waterBoilingPointAtPressure()));
    }
  });
  it('changes heat-limited boiling yield with pressure-dependent latent heat, while keeping every joule accounted', () => {
    const yields = [0.6, 1.2].map(pressure => {
      const t = waterBoilingPointAtPressure(pressure), sample = water({ temperature_c: t,
        environment: { ...DEFAULT_LAB_ENVIRONMENT, pressure_atm: pressure } });
      const result = applyThermalEnergy(sample, 100, 1);
      expect(result.latentEnergy_J).toBeCloseTo(100, 9); expect(result.sensibleEnergy_J).toBeCloseTo(0, 9);
      expect(result.evaporatedStep_g * waterLatentHeatJ_G(t)).toBeCloseTo(100, 9);
      return result.evaporatedStep_g;
    });
    expect(yields[1]).toBeGreaterThan(yields[0]);
  });
  it('limits evaporation by inventory and preserves surplus heat after dryout', () => {
    const t = waterBoilingPointAtPressure(), initial = water({ temperature_c: t, mass_g: 0.001, volume_ml: 0.001,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 0.001, moles: 0.001 / 18.015 }] });
    const result = applyThermalEnergy(initial, 20, 1);
    expect(result.evaporatedStep_g).toBe(0.001); expect(result.mass_g).toBe(0); expect(result.isBoiling).toBe(false);
    expect(result.latentEnergy_J + (result.temperature_c - t) * 33.2).toBeCloseTo(20, 9);
    const critical = applyThermalEnergy(water({ temperature_c: 373.946,
      effectsEnvironment: { pressure_atm: 22.064e6 / 101325 } }), 20);
    expect(Number.isFinite(critical.temperature_c)).toBe(true); expect(critical.evaporatedStep_g).toBe(0);
  });
  it('uses each wall interface temperature for condensation/drying heat with finite inventories', () => {
    const cold = stepWallCondensation(water({ temperature_c: 5 }), 0.01, 0);
    expect(cold.latentHeatToSample_J).toBeGreaterThan(0);
    expect(cold.wall.ambientCondensationEnergyReceived_J).toBeCloseTo(cold.wall.ambientCollected_g * (4.184 * 25 + waterLatentHeatJ_G(25)), 10);
    expect(cold.latentHeatToSample_J + cold.wall.outer_g * 4.184 * cold.wall.outerWall_c
      + cold.wall.outerDrainedSensibleEnergy_J! + cold.wall.outerMassTransferVaporEnergy_J!)
      .toBeCloseTo(cold.wall.ambientCondensationEnergyReceived_J!, 10);
    const hot = stepWallCondensation(water({ temperature_c: 95 }), 0.01, 0.001);
    expect(hot.wall.inner_g).toBeGreaterThan(0);
    expect(hot.wall.heatRejected_J + hot.wall.inner_g * 4.184 * hot.wall.innerWall_c + hot.wall.returnedSensibleEnergy_J!)
      .toBeCloseTo((0.001 - hot.availableVapor_g) * (4.184 * 95 + waterLatentHeatJ_G(95)), 10);
    const drying = stepWallCondensation(water({ temperature_c: 35, wallCondensation: { ...cold.wall,
      outerBeads: [], outer_g: 0.001, outerWall_c: 35 } }), 0.01, 0);
    expect(drying.latentHeatToSample_J).toBe(0);
    expect(drying.wall.outerWall_c).toBeLessThan(35);
    expect(drying.wall.outer_g * 4.184 * drying.wall.outerWall_c
      + drying.wall.outerMassTransferVaporEnergy_J! + (drying.wall.outerDrainedSensibleEnergy_J ?? 0))
      .toBeCloseTo(0.001 * 4.184 * 35, 10);
  });
  it('splits incoming vapor enthalpy between condenser thermal storage and the finite coolant sink', () => {
    const source = water({ temperature_c: 100 }), receiver = water({ id: 'r', type: 'condenser',
      vaporSourceId: 's', coolingWaterActive: true, mass_g: 0, volume_ml: 0, contents: [] });
    const next = transferWaterCondensate({ s: source, r: receiver }, new Map([['s', 1]]), 10);
    const storedChange = sampleHeatCapacity(next.r) * next.r.temperature_c - sampleHeatCapacity(receiver) * receiver.temperature_c;
    expect(storedChange + next.r.coolantHeatReceived_J!).toBeCloseTo(next.r.condenserVaporEnergyReceived_J!, 8);
    expect(next.r.mass_g).toBe(1); expect(next.s.condensedTransfer_g).toBe(1);
    const hot = transferWaterCondensate({ s: source, r: { ...receiver, temperature_c: 110 } }, new Map([['s', 1]]), 0.01);
    expect(hot.r.mass_g).toBe(0); expect(hot.r.temperature_c).toBeLessThan(110);
    const superheated = transferWaterCondensate({ s: { ...source, temperature_c: 150 }, r: receiver }, new Map([['s', 1]]), 10);
    expect(superheated.r.condenserVaporEnergyReceived_J! - next.r.condenserVaporEnergyReceived_J!).toBeCloseTo(1.86 * 50, 9);
  });
  it('uses interface latent heat for bubble collapse and keeps an explicit coefficient override', () => {
    const pressure = 101325, gas = { vapor_Pa_m3: pressure * 0.001 ** 3, noncondensable_Pa_m3: 0, temperature_c: 100 };
    const next = condenseBubbleVapor(gas, pressure, 0, 80, 1e-4);
    expect(next.condensedMass_kg).toBeGreaterThan(0);
    expect(next.latentHeat_J / next.condensedMass_kg).toBeCloseTo(waterLatentHeatJ_G(saturationTemperatureC(pressure)) * 1000, 7);
    const override = condenseBubbleVapor(gas, pressure, 0, 80, 1e-4, 0.6, 2.4e6);
    expect(override.latentHeat_J / override.condensedMass_kg).toBeCloseTo(2.4e6, 7);
  });
  it('keeps live source, wall, condenser and external water sinks conserved with the new phase enthalpies', () => {
    const source = water({ temperature_c: waterBoilingPointAtPressure(), effectHeatInput_W: 300 });
    const receiver = water({ id: 'r', type: 'condenser', vaporSourceId: 's', coolingWaterActive: true,
      volume_ml: 0, mass_g: 0, contents: [], substances: [] });
    useAppStore.setState({ vessels: { s: source, r: receiver }, vesselIds: ['s', 'r'], burners: {}, spills: {},
      activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
    for (let i = 0; i < 20; i++) {
      useAppStore.getState().tickSimulation(0.05);
      const vessels = Object.values(useAppStore.getState().vessels);
      const total = vessels.reduce((sum, v) => sum + v.mass_g + (v.wallCondensation?.inner_g ?? 0)
        + (v.waterVaporReleased_g ?? 0), 0);
      expect(total).toBeCloseTo(50, 8);
    }
    const current = useAppStore.getState().vessels;
    expect(current.r.condensateReceived_g).toBeGreaterThan(0);
    expect(current.r.coolantHeatReceived_J).toBeGreaterThan(0);
    expect(current.r.condenserVaporEnergyReceived_J).toBeGreaterThan(current.r.coolantHeatReceived_J!);
    expect(current.s.temperature_c).toBeCloseTo(waterBoilingPointAtPressure(), 8);
  });
});
