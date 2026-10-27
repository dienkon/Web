import { afterEach, describe, expect, it, vi } from 'vitest';
import { waterSaturationPressurePa, waterSaturationTemperatureC } from '../src/science/waterSaturation';
import { waterBoilingPointAtPressure, DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { waterDewPointC, waterMassFluxG_M2_S, waterPressureDrivenFluxG_M2_S } from '../src/science/waterSurface';
import { saturationTemperatureC } from '../src/science/bubblePhase';
import { aqueousBoilingPoint, applyThermalEnergy, relaxGeneratedWater, sampleHeatCapacity } from '../src/engine/thermalState';
import { stepWallCondensation } from '../src/engine/wallCondensation';
import { useAppStore } from '../src/store/useAppStore';
import { effects } from '../src/vfx/vesselEffects';
import { SimulationEngine, VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import type { VesselState } from '../src/types/chemistry';
import { waterLatentHeatJ_G } from '../src/science/waterThermodynamics';

const before = useAppStore.getState();
const water = (patch: Partial<VesselState> = {}): VesselState => ({ id: 'b', name: 'b', type: 'beaker', position: [0, 0, 0],
  rotationY: 0, isLocked: false, volume_ml: 50, volume: 0.5, capacity_ml: 100, mass_g: 50, temperature_c: 25,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }], substances: ['H2O'],
  ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false, environment: DEFAULT_LAB_ENVIRONMENT, ...patch });
afterEach(() => { useAppStore.setState(before, true); SimulationEngine.clearAll(); });

describe('One pure-water saturation boundary', () => {
  it('matches independent rounded saturation references and the unshifted standard-pressure root', () => {
    expect(waterSaturationPressurePa(0.01)).toBeCloseTo(611.657, 2);
    expect(waterSaturationPressurePa(100)).toBeCloseTo(101417.99, 1);
    expect(waterSaturationPressurePa(373.946)).toBeCloseTo(22064000, 0);
    expect(waterBoilingPointAtPressure(1)).toBeCloseTo(99.9743, 4);
    expect(waterBoilingPointAtPressure(1)).not.toBe(100);
  });
  it('inverts the same curve across the range and agrees with bubble-interface temperature', () => {
    for (const pressure of [611.6571, 10000, 0.6 * 101325, 101325, 1.2 * 101325, 1e6, 22.064e6]) {
      const temperature = waterSaturationTemperatureC(pressure);
      expect(waterSaturationPressurePa(temperature) / pressure).toBeCloseTo(1, 10);
      expect(saturationTemperatureC(pressure)).toBe(temperature);
    }
    expect(waterBoilingPointAtPressure(0.2)).toBeCloseTo(60.2, 0);
    expect(waterBoilingPointAtPressure(2)).toBeGreaterThan(120);
  });
  it('does not clamp invalid pressures to an apparently valid lab boiling point', () => {
    for (const pressure of [0, -1, NaN, Infinity, 0.001, 300]) expect(waterBoilingPointAtPressure(pressure)).toBeNaN();
  });
  it('uses per-vessel pressure for heat-limited boiling and generated water without changing energy or mass', () => {
    for (const pressure of [0.6, 1, 1.2]) {
      const point = waterBoilingPointAtPressure(pressure), initial = water({ temperature_c: point,
        effectsEnvironment: { pressure_atm: pressure } });
      expect(aqueousBoilingPoint(initial)).toBe(point);
      const result = applyThermalEnergy(initial, 100, 1);
      expect(result.temperature_c).toBeCloseTo(point, 10); expect(result.isBoiling).toBe(true);
      expect(result.evaporatedStep_g * waterLatentHeatJ_G(point)).toBeCloseTo(100, 9);
      expect(result.mass_g + result.evaporatedStep_g).toBeCloseTo(50, 10);
      const generated = relaxGeneratedWater(initial.contents, point + 1, pressure)!;
      expect(generated.temperature_c).toBe(point);
      expect(generated.vaporMass_g * waterLatentHeatJ_G(point)).toBeCloseTo(sampleHeatCapacity(initial), 9);
    }
  });
  it('declines phase transfer at an unsupported pressure and exposes unavailable in inspection', () => {
    const initial = water({ temperature_c: 100, effectsEnvironment: { pressure_atm: 0 } });
    const result = applyThermalEnergy(initial, 100, 1, 1);
    expect(result.evaporatedStep_g).toBe(0); expect(result.mass_g).toBe(50);
    expect(result.temperature_c).toBeGreaterThan(100); expect(result.thermalModelLimit).toBeTruthy();
    const recovered = applyThermalEnergy({ ...initial, ...result, effectsEnvironment: { pressure_atm: 1 } }, 0);
    expect(recovered.thermalModelLimit).toBeUndefined();
    useAppStore.setState({ vessels: { b: initial } });
    expect(effects.forVessel('b').inspect().state!.boilingPoint_c).toBeNull();
  });
  it('keeps two live vessel heat/vapor budgets at their own pressure-dependent plateaus', () => {
    const a = water({ id: 'a', temperature_c: waterBoilingPointAtPressure(0.6), effectHeatInput_W: 300,
      effectsEnvironment: { pressure_atm: 0.6 } });
    const b = water({ temperature_c: waterBoilingPointAtPressure(1.2), effectHeatInput_W: 300,
      effectsEnvironment: { pressure_atm: 1.2 } });
    useAppStore.setState({ vessels: { a, b }, vesselIds: ['a', 'b'], burners: {}, activeKinetics: {},
      pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1, spills: {} });
    for (let i = 0; i < 20; i++) useAppStore.getState().tickSimulation(0.05);
    const current = useAppStore.getState().vessels;
    expect(Object.keys(current)).toEqual(['a', 'b']);
    for (const [id, pressure] of [['a', 0.6], ['b', 1.2]] as const) {
      const v = current[id]; expect(v.temperature_c).toBeCloseTo(waterBoilingPointAtPressure(pressure), 8);
      expect(v.isBoiling).toBe(true); expect(v.mass_g).toBeLessThan(50);
      expect(v.mass_g + (v.wallCondensation?.inner_g ?? 0) + (v.waterVaporReleased_g ?? 0)).toBeCloseTo(50, 8);
      expect(effects.forVessel(id).inspect().state!.boilingPoint_c).toBe(waterBoilingPointAtPressure(pressure));
    }
  });
  it('uses one pressure for renderer nucleation and saturation, and clears stale bubbles when that model becomes unavailable', () => {
    const manager = new VesselSimulationManager('b', 'low'), pressure = 0.8;
    const sample = water({ temperature_c: waterBoilingPointAtPressure(pressure), isBoiling: true,
      boilingIntensity: 1, evaporationRate_g_s: 0.15, effectsEnvironment: { pressure_atm: pressure } });
    const update = vi.spyOn(manager.boilingSystem, 'update');
    for (let i = 0; i < 30; i++) manager.step(sample, 1 / 60, { heatPower_W: 300, thermalStateAuthoritative: true });
    expect(update).toHaveBeenLastCalledWith(1 / 60, expect.objectContaining({ pressure_atm: pressure,
      boilingPoint_c: waterBoilingPointAtPressure(pressure) }));
    expect(manager.boilingSystem.bubbles.length).toBeGreaterThan(0);
    const result = manager.step({ ...sample, effectsEnvironment: { pressure_atm: 0 } }, 1 / 60, { thermalStateAuthoritative: true });
    expect(result.isBoiling).toBe(false); expect(manager.boilingSystem.bubbles).toEqual([]);
    update.mockRestore();
  });
});

describe('Condensation and evaporation share a partial-pressure driving force', () => {
  it('changes sign exactly at the dew point for unequal gas/wall temperatures', () => {
    for (const [air, rh] of [[15, 0.7], [25, 0.5], [40, 0.9]]) {
      const dew = waterDewPointC(air, rh);
      expect(waterMassFluxG_M2_S(dew, air, rh, 0.1)).toBeCloseTo(0, 10);
      expect(waterMassFluxG_M2_S(dew - 0.01, air, rh, 0.1)).toBeLessThan(0);
      expect(waterMassFluxG_M2_S(dew + 0.01, air, rh, 0.1)).toBeGreaterThan(0);
    }
  });
  it('gives exactly zero at equal water pressures for a hot gas above a cooler wall', () => {
    const pressure = waterSaturationPressurePa(40);
    expect(waterPressureDrivenFluxG_M2_S(40, 90, pressure, 0.1)).toBe(0);
    expect(waterPressureDrivenFluxG_M2_S(40, 90, pressure * 1.01, 0.1)).toBeLessThan(0);
    expect(waterPressureDrivenFluxG_M2_S(40, 90, pressure * 0.99, 0.1)).toBeGreaterThan(0);
  });
  it('makes both wall routes agree at equilibrium, then captures only finite incoming vapor', () => {
    const initial = water({ temperature_c: 80 }), wall_c = 25 + 0.35 * (80 - 25);
    const pressure = waterSaturationPressurePa(wall_c);
    const equal = stepWallCondensation(initial, 0.01, 0.001, { headspaceWaterPressure_Pa: pressure });
    expect(equal.wall.inner_g).toBe(0); expect(equal.availableVapor_g).toBe(0.001);
    const wet = stepWallCondensation(initial, 0.01, 0.001, { headspaceWaterPressure_Pa: pressure * 1.01 });
    expect(wet.wall.inner_g).toBeGreaterThan(0);
    expect(wet.wall.inner_g + wet.availableVapor_g + wet.returnedStep_g).toBeCloseTo(0.001, 12);
    const incomingH = 4.184 * 80 + waterLatentHeatJ_G(80);
    expect(wet.wall.heatRejected_J + wet.wall.inner_g * 4.184 * wet.wall.innerWall_c
      + wet.wall.returnedSensibleEnergy_J! + wet.wallEvaporatedEnergy_J)
      .toBeCloseTo((0.001 - wet.availableVapor_g + wet.wallEvaporatedStep_g) * incomingH, 10);
    const dew = waterDewPointC(25, 0.5), sample_c = 25 + (dew - 25) / 0.9;
    expect(stepWallCondensation(water({ temperature_c: sample_c }), 0.01, 0).wall.ambientCollected_g).toBeCloseTo(0, 12);
    expect(stepWallCondensation(water({ temperature_c: sample_c - 0.01 }), 0.01, 0).wall.ambientCollected_g).toBeGreaterThan(0);
  });
  it('rejects invalid boundary inputs rather than contaminating ledgers', () => {
    expect(waterMassFluxG_M2_S(25, 25, NaN, 0.1)).toBe(0);
    expect(waterMassFluxG_M2_S(25, 25, 2, 0.1)).toBe(0);
    for (const [surface, gas, p, speed] of [[NaN, 25, 1000, 0.1], [-1, 25, 1000, 0.1], [25, 25, -1, 0.1], [25, 25, 1000, -1]])
      expect(waterPressureDrivenFluxG_M2_S(surface, gas, p, speed)).toBe(0);
  });
});
