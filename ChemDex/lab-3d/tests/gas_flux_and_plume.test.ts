import { afterEach, describe, expect, it } from 'vitest';
import { measureGasFlux } from '../src/engine/gasFlux';
import { projectEscapedGas } from '../src/engine/gasInventory';
import { gasPacketRate, gasVisualState } from '../src/vfx/gasVisualState';
import { GasPlumeSystem, gasDensityRatio, type GasPlumeInput } from '../src/simulation/effects/GasPlumeSystem';
import { PRNG } from '../src/core/rng';
import { useAppStore } from '../src/store/useAppStore';
import { planSodiumWater } from '../src/engine/sodiumWaterPlan';
import { computeMolarMass } from '../src/engine/ledger';
import type { VesselState } from '../src/types/chemistry';

const before = useAppStore.getState();
afterEach(() => useAppStore.setState(before, true));
const sample = (patch: Partial<VesselState> = {}): VesselState => ({ id: 'g', name: 'test', type: 'beaker',
  position: [0, 0, 0], rotationY: 0, isLocked: false, capacity_ml: 100, volume_ml: 50, volume: 0.5,
  mass_g: 50, temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false,
  substances: ['H2O'], contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }], ...patch });
const input: GasPlumeInput = { rate: 20, mol_s: 0.001, temperature_c: 25, ambient_c: 25,
  molarMass: 46.005, mouthY: 1, mouthRadius: 0.3, floorY: -1, wind_m_s: 0.1 };
const plume = (maximum = 140) => new GasPlumeSystem(maximum, new PRNG(291));

describe('Gas flux distinguishes production, holdup and exhaust', () => {
  it('counts a stoichiometric gas source once and never repeats its cumulative history', () => {
    const previous = sample(), current = sample({ escapedGas_g: { CO2: 0.044009 } });
    const snapshot = JSON.stringify(current), flux = measureGasFlux(current, previous, 0.1);
    expect(flux.generated_mol_s.CO2).toBeCloseTo(0.01, 12);
    expect(flux.escaped_mol_s.CO2).toBeCloseTo(0.01, 12);
    const next = measureGasFlux({ ...current, gasFlux: flux }, { ...current, gasFlux: flux }, 0.1);
    expect(next.generated_mol_s.CO2).toBe(0);
    expect(next.escaped_mol_s.CO2).toBe(0);
    expect(JSON.stringify(current)).toBe(snapshot);
  });
  it('treats venting old headspace gas as exhaust, not another generation of bubbles', () => {
    const previous = sample({ isSealed: true, contents: [{ formula: 'CO2', phase: 'g', mass_g: 0.044009, moles: 0.001 }] });
    const opened = { ...previous, isSealed: false };
    const current = { ...opened, ...projectEscapedGas(opened) };
    const flux = measureGasFlux(current, previous, 0.1);
    expect(flux.generated_mol_s.CO2).toBeCloseTo(0, 12);
    expect(flux.escaped_mol_s.CO2).toBeCloseTo(0.01, 12);
  });
  it('does not count foam release as new underwater generation or water as chemical bubble glyphs', () => {
    const previous = sample({ contents: [{ formula: 'O2', phase: 'g', location: 'foam', mass_g: 0.031998, moles: 0.001 }] });
    const current = sample({ contents: [], escapedGas_g: { O2: 0.031998, H2O: 1 } });
    const flux = measureGasFlux(current, previous, 1);
    expect(flux.generated_mol_s.O2).toBeCloseTo(0, 12);
    expect(flux.escaped_mol_s.O2).toBeCloseTo(0.001, 7);
    expect(flux.generated_mol_s.H2O).toBeUndefined();
    expect(flux.escaped_mol_s.H2O).toBeUndefined();
  });
  it('retains a newly produced gas in a sealed vessel without an external plume', () => {
    const previous = sample({ isSealed: true });
    const current = sample({ isSealed: true, contents: [{ formula: 'NO2', phase: 'g', mass_g: 0.046005, moles: 0.001 }] });
    const flux = measureGasFlux(current, previous, 1);
    expect(flux.generated_mol_s.NO2).toBeGreaterThan(0);
    expect(flux.escaped_mol_s.NO2).toBe(0);
    expect(gasVisualState({ ...current, gasFlux: flux }).visible.every(g => g.rate === 0)).toBe(true);
  });
  it('does not infer sources from flags, recipe colors, temperature or absent telemetry', () => {
    const v = sample({ hasGas: true, gasColor: '#aa3300', temperature_c: 99 });
    expect(gasVisualState(v).bubbleRate).toBe(0);
    expect(gasVisualState(v).visible).toHaveLength(0);
    const flux = measureGasFlux(sample({ escapedGas_g: { H2: 0.002016 } }), sample(), 1);
    expect(gasVisualState({ ...v, gasFlux: flux }).visible).toHaveLength(0);
  });
  it('uses species identity, supports dry-source plumes and bounds the combined display budget', () => {
    const flux = measureGasFlux(sample({ escapedGas_g: { NO2: 1, Cl2: 1 } }), sample(), 0.01);
    const state = gasVisualState(sample({ volume_ml: 0, gasFlux: flux }));
    expect(state.bubbleRate).toBe(0);
    expect(state.visible).toHaveLength(2);
    expect(state.visible.reduce((sum, g) => sum + g.rate, 0)).toBeCloseTo(40, 12);
    expect(state.visible.every(g => g.color !== '#ffffff')).toBe(true);
    expect(gasPacketRate(1, 25, 1)).toBe(180);
    expect(gasPacketRate(0.000001, 25, 0.8)).toBeGreaterThan(gasPacketRate(0.000001, 25, 1));
  });
  it('integrates the actual live finite H2 amount including the final tick after kinetics retires', () => {
    const v = sample({ mass_g: 50.1, contents: [...sample().contents,
      { formula: 'Na', phase: 's', mass_g: 0.1, moles: 0.1 / computeMolarMass('Na') }], substances: ['Na', 'H2O'] });
    const plan = planSodiumWater(v, 'vi')!;
    useAppStore.setState({ vessels: { g: plan.vessel }, vesselIds: ['g'], activeKinetics: { g: plan.kinetics },
      burners: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
    let generated = 0, exhausted = 0, finalPulse = false;
    for (let i = 0; i < 600; i++) {
      useAppStore.getState().tickSimulation(1 / 60);
      const state = useAppStore.getState(), flux = state.vessels.g.gasFlux!;
      generated += (flux.generated_mol_s.H2 ?? 0) / 60;
      exhausted += (flux.escaped_mol_s.H2 ?? 0) / 60;
      if (!state.activeKinetics.g && (flux.escaped_mol_s.H2 ?? 0) > 0) finalPulse = true;
    }
    expect(generated).toBeCloseTo(0.1 / computeMolarMass('Na') / 2, 10);
    expect(exhausted).toBeCloseTo(generated, 12);
    expect(finalPulse).toBe(true);
    expect(useAppStore.getState().vessels.g.gasFlux!.generated_mol_s.H2).toBe(0);
  });
});

describe('Colored gas packet transport', () => {
  it('matches seeded trajectories and accepted source integrals at 30/60/120 Hz', () => {
    const run = (hz: number) => { const s = plume(); for (let i = 0; i < hz * 2; i++) s.update(1 / hz, input); return s; };
    const expected = run(120);
    for (const hz of [30, 60]) {
      const actual = run(hz);
      expect(actual.particles.length).toBe(expected.particles.length);
      expect(actual.integratedGas_mol).toBeCloseTo(0.002, 12);
      for (let i = 0; i < actual.particles.length; i++) for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'opacity', 'size'] as const) {
        expect(actual.particles[i][key]).toBeCloseTo(expected.particles[i][key], 10);
      }
    }
  });
  it('changes buoyancy sign for hot and cold gas using M/T, instead of a fixed heavy label', () => {
    expect(gasDensityRatio(46.005, 25, 25)).toBeGreaterThan(1);
    expect(gasDensityRatio(46.005, 500, 25)).toBeLessThan(1);
    const cold = plume(), hot = plume();
    cold.update(1, { ...input, wind_m_s: 0 }); hot.update(1, { ...input, temperature_c: 500, wind_m_s: 0 });
    expect(cold.particles[0].vy).toBeLessThan(0);
    expect(hot.particles[0].vy).toBeGreaterThan(0);
    expect(cold.particles.every(p => Math.hypot(p.x, p.z) > 0.2)).toBe(true);
  });
  it('does not authorize particles from a positive display rate without finite gas', () => {
    const s = plume(); s.update(1, { ...input, mol_s: 0 });
    expect(s.particles).toHaveLength(0);
  });
  it('preserves backlog and source history without draining while paused', () => {
    const s = plume(); s.update(3, input);
    expect(s.pendingSeconds).toBeCloseTo(1, 10);
    expect(s.integratedGas_mol).toBeCloseTo(0.002, 12);
    const old = JSON.stringify(s.particles);
    s.update(0, input);
    expect(JSON.stringify(s.particles)).toBe(old);
    s.update(1, { ...input, rate: 0, mol_s: 0 });
    expect(s.integratedGas_mol).toBeCloseTo(0.003, 12);
    expect(s.integratedSeconds).toBeCloseTo(4, 10);
  });
  it('keeps emitted gas dissipating after source stop and resets deterministically', () => {
    const s = plume(); s.update(1, input); const old = structuredClone(s.particles);
    s.update(1, { ...input, rate: 0, mol_s: 0 });
    expect(s.particles.length).toBeGreaterThan(0);
    s.update(2, { ...input, rate: 0, mol_s: 0 });
    expect(s.particles).toHaveLength(0);
    s.reset(); s.update(1, input); expect(s.particles).toEqual(old);
  });
  it('drops display packets when full instead of storing a burst debt, and does not accelerate pooling exponentially', () => {
    const s = plume(1); s.update(1, { ...input, rate: 40, floorY: 0.95 });
    expect(s.particles[0].y).toBeGreaterThanOrEqual(0.95);
    expect(Math.abs(s.particles[0].vx)).toBeLessThan(1.8);
    s.particles = []; s.maxParticles = 140;
    s.update(1 / 120, { ...input, rate: 40 });
    expect(s.particles.length).toBeLessThanOrEqual(1);
  });
  it.each([0, -1, NaN, Infinity])('does not move at invalid time %s', dt => {
    const s = plume(); s.update(1, input); const old = JSON.stringify(s);
    s.update(dt, input); expect(JSON.stringify(s)).toBe(old);
  });
});
