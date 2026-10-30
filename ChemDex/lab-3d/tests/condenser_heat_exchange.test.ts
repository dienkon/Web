import { afterEach, describe, expect, it } from 'vitest';
import { condenserCoolingSettings, stepCondenserHeatExchange } from '../src/science/condenserHeatExchange';
import { waterBoilingPointAtPressure, DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { waterLatentHeatJ_G, waterSaturationProperties } from '../src/science/waterThermodynamics';
import { transferWaterCondensate } from '../src/engine/condensationTransfer';
import { useAppStore } from '../src/store/useAppStore';
import { SimulationEngine } from '../src/simulation/core/SimulationEngine';
import type { VesselState } from '../src/types/chemistry';

const boiling = waterBoilingPointAtPressure();
const initial = useAppStore.getState();
const inputs = (patch: Partial<Parameters<typeof stepCondenserHeatExchange>[0]> = {}) => ({ dt: 1, vapor_g: 1,
  maxCondensate_g: 100, sourceTemperature_c: boiling, interfaceTemperature_c: boiling,
  initialTemperature_c: 25, initialCapacity_J_K: 33.2, cooling: condenserCoolingSettings(), ...patch });
const vessel = (patch: Partial<VesselState> = {}): VesselState => ({ id: 'r', name: 'r', type: 'condenser',
  position: [0, 0, 0], rotationY: 0, isLocked: false, volume_ml: 0, volume: 0, capacity_ml: 100,
  mass_g: 0, temperature_c: 25, contents: [], substances: [], ph: 7, hasGas: false,
  hasPrecipitate: false, isBoiling: false, vaporSourceId: 's', coolingWaterActive: true, ...patch });
afterEach(() => { useAppStore.setState(initial, true); SimulationEngine.clearAll(); });

describe('Finite coolant and condenser thermal storage', () => {
  it('matches exact cooling of a uniform node and the finite-stream effectiveness', () => {
    const p = inputs({ vapor_g: 0, dt: 2, initialTemperature_c: 80 }), r = stepCondenserHeatExchange(p);
    const coldRate = 10 * waterSaturationProperties(20)!.liquidDensity_kg_m3 / 1000 * 4.184;
    const k = coldRate * (1 - Math.exp(-10 / coldRate));
    expect(r.effectiveConductance_W_K).toBeCloseTo(k, 12);
    expect(r.temperature_c).toBeCloseTo(20 + 60 * Math.exp(-k * 2 / 33.2), 10);
    expect(r.heatRemoved_J).toBeCloseTo(33.2 * (80 - r.temperature_c), 9);
    expect(r.coolantMass_g * 4.184 * (r.coolantOutletTemperature_c - 20)).toBeCloseTo(r.heatRemoved_J, 9);
    expect(r.coolantVolume_ml).toBe(20);
  });
  it('uses finite cold-glass storage with coolant off, then stops at the phase ceiling', () => {
    const r = stepCondenserHeatExchange(inputs({ dt: 10, vapor_g: 5, cooling: condenserCoolingSettings({ flow_ml_s: 0 }) }));
    const expected = 33.2 * (boiling - 25) / waterLatentHeatJ_G(boiling);
    expect(r.recovered_g).toBeCloseTo(expected, 9); expect(r.recovered_g).toBeLessThan(5);
    expect(r.temperature_c).toBe(boiling); expect(r.coolantVolume_ml).toBe(0); expect(r.heatRemoved_J).toBe(0);
    expect(r.storedEnergyChange_J).toBeCloseTo(r.receivedVaporEnergy_J, 8);
  });
  it('limits saturated condensation by finite coolant heat rejection, not elapsed reaction time', () => {
    const r = stepCondenserHeatExchange(inputs({ initialTemperature_c: boiling, dt: 0.5, vapor_g: 1,
      cooling: condenserCoolingSettings({ flow_ml_s: 0.01 }) }));
    const q = r.effectiveConductance_W_K * (boiling - 20) * 0.5;
    expect(r.heatRemoved_J).toBeCloseTo(q, 10);
    expect(r.recovered_g).toBeCloseTo(q / waterLatentHeatJ_G(boiling), 11);
    expect(r.temperature_c).toBe(boiling); expect(r.recovered_g).toBeLessThan(0.001);
    expect(r.coolantOutletTemperature_c).toBeLessThanOrEqual(boiling + 1e-10);
  });
  it('agrees for 1/30/60/120 packets across warmup and the saturation event', () => {
    const run = (n: number) => {
      let temperature = 25, capacity = 33.2, mass = 0, heat = 0, received = 0;
      for (let i = 0; i < n; i++) {
        const r = stepCondenserHeatExchange(inputs({ dt: 10 / n, vapor_g: 5 / n,
          initialTemperature_c: temperature, initialCapacity_J_K: capacity,
          cooling: condenserCoolingSettings({ flow_ml_s: 0.01 }) }));
        temperature = r.temperature_c; capacity += 4.184 * r.recovered_g;
        mass += r.recovered_g; heat += r.heatRemoved_J; received += r.receivedVaporEnergy_J;
      }
      return { temperature, mass, heat, received };
    };
    const base = run(1);
    for (const n of [30, 60, 120]) {
      const r = run(n); expect(r.temperature).toBeCloseTo(base.temperature, 8);
      expect(r.mass).toBeCloseTo(base.mass, 9); expect(r.heat).toBeCloseTo(base.heat, 7);
      expect(r.received).toBeCloseTo(base.received, 6);
    }
  });
  it('does not turn off jacket water consumption when the vapor source is disconnected or the receiver is full', () => {
    const r = vessel({ vaporSourceId: undefined, temperature_c: 80, isBoiling: true, boilingIntensity: 1 });
    const out = transferWaterCondensate({ r }, new Map(), 2);
    expect(out.r.mass_g).toBe(0); expect(out.r.coolantPassed_ml).toBe(20); expect(out.r.temperature_c).toBeLessThan(80);
    expect(out.r.isBoiling).toBe(false); expect(out.r.boilingIntensity).toBe(0);
    const source = vessel({ id: 's', type: 'beaker', temperature_c: boiling });
    const full = vessel({ capacity_ml: 1, volume_ml: 1, mass_g: 1,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 1, moles: 1 / 18.015 }] });
    const filled = transferWaterCondensate({ s: source, r: full }, new Map([['s', 1]]), 1);
    expect(filled.r.mass_g).toBe(1); expect(filled.s.condensedTransfer_g).toBeUndefined();
    expect(filled.r.coolantPassed_ml).toBe(10);
  });
  it('allows warm coolant to heat a cold node without fabricating an external heat sink', () => {
    const r = stepCondenserHeatExchange(inputs({ dt: 10, vapor_g: 1, sourceTemperature_c: 40,
      interfaceTemperature_c: 40, cooling: condenserCoolingSettings({ inletTemperature_c: 60 }) }));
    expect(r.recovered_g).toBeGreaterThan(0); expect(r.recovered_g).toBeLessThan(1);
    expect(r.temperature_c).toBeGreaterThan(40); expect(r.temperature_c).toBeLessThan(60);
    expect(r.heatRemoved_J).toBeLessThan(0);
    expect(r.receivedVaporEnergy_J - r.storedEnergyChange_J).toBeCloseTo(r.heatRemoved_J, 8);
  });
  it('cools a hot condenser before allowing condensation and preserves the event energy balance', () => {
    const short = stepCondenserHeatExchange(inputs({ initialTemperature_c: 120, dt: 0.001 }));
    expect(short.recovered_g).toBe(0); expect(short.temperature_c).toBeLessThan(120);
    const longer = stepCondenserHeatExchange(inputs({ initialTemperature_c: 120, dt: 10 }));
    expect(longer.recovered_g).toBeGreaterThan(0);
    expect(longer.storedEnergyChange_J + longer.heatRemoved_J).toBeCloseTo(longer.receivedVaporEnergy_J, 8);
  });
  it('keeps coolant outlet temperature bounded even for extremely small flows', () => {
    for (const flow of [1e-20, 1e-12, 0.01, 10]) {
      const r = stepCondenserHeatExchange(inputs({ vapor_g: 0, initialTemperature_c: 80,
        cooling: condenserCoolingSettings({ flow_ml_s: flow }) }));
      expect(r.coolantOutletTemperature_c).toBeGreaterThanOrEqual(20);
      expect(r.coolantOutletTemperature_c).toBeLessThanOrEqual(80 + 1e-10);
      expect(r.heatRemoved_J).toBeGreaterThanOrEqual(0);
    }
  });
  it('distinguishes a zero-conductance jacket from infinite cooling', () => {
    const r = stepCondenserHeatExchange(inputs({ dt: 10, vapor_g: 5,
      cooling: condenserCoolingSettings({ conductance_W_K: 0 }) }));
    expect(r.coolantVolume_ml).toBe(100); expect(r.heatRemoved_J).toBe(0);
    expect(r.recovered_g).toBeLessThan(2); expect(r.temperature_c).toBe(boiling);
  });
  it('rejects invalid time before advancing coolant or material inventories', () => {
    for (const dt of [0, -1, NaN, Infinity]) {
      const r = stepCondenserHeatExchange(inputs({ dt })); expect(r.recovered_g).toBe(0); expect(r.coolantVolume_ml).toBe(0);
      const states = { r: vessel() }; expect(transferWaterCondensate(states, new Map(), dt)).toBe(states);
    }
    const oversized = stepCondenserHeatExchange(inputs({ vapor_g: 1e308 }));
    expect(oversized.recovered_g).toBe(0); expect(oversized.coolantVolume_ml).toBe(10);
    expect(oversized.temperature_c).toBeLessThan(25); expect(oversized.status).toBe('numerical-limit');
  });
  it('uses fresh water partial pressure rather than total pressure for a diluted vapor stream', () => {
    const receiver = vessel({ temperature_c: 60, coolingWaterActive: false });
    const s = vessel({ id: 's', type: 'beaker', temperature_c: 100, waterVaporCarrier_mol_s: 9 / 18.015 });
    const dilute = transferWaterCondensate({ s, r: receiver }, new Map([['s', 1]]), 1);
    expect(dilute.r.mass_g).toBe(0); expect(dilute.s.condensedTransfer_g).toBeUndefined();
    const pure = transferWaterCondensate({ s: { ...s, waterVaporCarrier_mol_s: 0 }, r: receiver }, new Map([['s', 1]]), 1);
    expect(pure.r.mass_g).toBeGreaterThan(0);
  });
  it('validates a complete setting update on one existing condenser without creating apparatus', () => {
    useAppStore.setState({ vessels: { r: vessel(), s: vessel({ id: 's', type: 'beaker' }) }, vesselIds: ['r', 's'] });
    const before = useAppStore.getState();
    expect(before.setCondenserCooling('r', { flow_ml_s: NaN, conductance_W_K: 20 })).toBe(false);
    expect(useAppStore.getState()).toBe(before);
    expect(before.setCondenserCooling('s', { flow_ml_s: 1 })).toBe(false);
    expect(before.setCondenserCooling('missing', { flow_ml_s: 1 })).toBe(false);
    expect(before.setCondenserCooling('r', { flow_ml_s: 0.01, inletTemperature_c: 15 })).toBe(true);
    expect(useAppStore.getState().vessels.r.condenserCooling?.conductance_W_K).toBe(10);
    expect(Object.keys(useAppStore.getState().vessels)).toEqual(['r', 's']);
  });
  it('conserves source/wall/collected/external water in the live store with coolant off', () => {
    const s = vessel({ id: 's', type: 'beaker', temperature_c: boiling, effectHeatInput_W: 300,
      volume_ml: 50, mass_g: 50, substances: ['H2O'],
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }], environment: DEFAULT_LAB_ENVIRONMENT });
    useAppStore.setState({ vessels: { s, r: vessel({ coolingWaterActive: false }) }, vesselIds: ['s', 'r'], burners: {}, spills: {},
      activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
    for (let i = 0; i < 20; i++) {
      useAppStore.getState().tickSimulation(0.05);
      const total = Object.values(useAppStore.getState().vessels).reduce((sum, v) => sum + v.mass_g
        + (v.wallCondensation?.inner_g ?? 0) + (v.waterVaporReleased_g ?? 0), 0);
      expect(total).toBeCloseTo(50, 8);
    }
    const r = useAppStore.getState().vessels.r;
    expect(r.condensateReceived_g).toBeGreaterThan(0); expect(r.temperature_c).toBeGreaterThan(25);
    expect(r.coolantPassed_ml).toBe(0); expect(r.coolantHeatReceived_J).toBe(0);
  });
});
