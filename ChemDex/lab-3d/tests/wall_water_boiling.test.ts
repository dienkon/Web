import { afterEach, describe, expect, it } from 'vitest';
import { stepWallWaterPhase } from '../src/science/wallWaterPhase';
import { waterBoilingPointAtPressure, DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { waterLatentHeatJ_G } from '../src/science/waterThermodynamics';
import { stepWetWallThermal } from '../src/engine/wetWallThermal';
import { stepWallCondensation } from '../src/engine/wallCondensation';
import { sampleHeatCapacity } from '../src/engine/thermalState';
import { routeWaterVaporToWall } from '../src/engine/waterVaporRouting';
import { transferWaterCondensate } from '../src/engine/condensationTransfer';
import { useAppStore } from '../src/store/useAppStore';
import { SimulationEngine } from '../src/simulation/core/SimulationEngine';
import type { VesselState } from '../src/types/chemistry';

const original = useAppStore.getState(), cp = 4.184, boiling = waterBoilingPointAtPressure();
const latent = waterLatentHeatJ_G(boiling), h = cp * boiling + latent;
const input = (patch: Partial<Parameters<typeof stepWallWaterPhase>[0]> = {}) => ({
  dt: 1, mass_g: 1, temperature_c: boiling, boiling_c: boiling, sample_c: 200, air_c: 25,
  sample_W_K: 1, air_W_K: 0.1, allowBoiling: true, ...patch,
});
const balanced = (r: ReturnType<typeof stepWallWaterPhase>) => {
  expect(r.valid).toBe(true);
  expect(r.fromSample_J + r.fromAir_J).toBeCloseTo(r.storedChange_J + r.vaporEnergy_J, 8);
};
const sample = (patch: Partial<VesselState> = {}): VesselState => ({ id: 's', name: 's', type: 'beaker',
  position: [0, 0, 0], rotationY: 0, isLocked: false, capacity_ml: 100, mass_g: 0, volume_ml: 0, volume: 0,
  contents: [], substances: [], temperature_c: 240, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false,
  environment: DEFAULT_LAB_ENVIRONMENT, ...patch });
function withFilm(v = sample(), inner = 0.01, outer = 0.01): VesselState {
  return { ...v, wallCondensation: { ...stepWallCondensation(v, 0, 0).wall,
    inner_g: inner, outer_g: outer, innerWall_c: boiling, outerWall_c: boiling,
    innerBeads: inner > 0 ? [{ mass_g: inner, y: 0.5, theta: 0, sliding: false }] : [],
    outerBeads: outer > 0 ? [{ mass_g: outer, y: 0.5, theta: 0, sliding: false }] : [] } };
}
const energy = (v: VesselState) => sampleHeatCapacity(v) * v.temperature_c
  + cp * (v.wallCondensation!.inner_g * v.wallCondensation!.innerWall_c + v.wallCondensation!.outer_g * v.wallCondensation!.outerWall_c);
afterEach(() => { useAppStore.setState(original, true); SimulationEngine.clearAll(); });

describe('Finite boiling and dryout of wall water', () => {
  it('holds saturation and spends only finite positive heat on vaporization', () => {
    const p = input({ dt: 10 }), r = stepWallWaterPhase(p);
    const q = (p.sample_W_K * (200 - boiling) + p.air_W_K * (25 - boiling)) * 10;
    expect(r.evaporated_g).toBeCloseTo(q / latent, 12); expect(r.mass_g).toBeCloseTo(1 - q / latent, 12);
    expect(r.temperature_c).toBe(boiling); expect(r.vaporEnergy_J).toBeCloseTo(r.evaporated_g * h, 10); balanced(r);
  });
  it('uses sensible warming before boiling, with an independently calculated event time', () => {
    const p = input({ dt: 5, temperature_c: 20 }), r = stepWallWaterPhase(p);
    const g = 1.1, target = (200 + 0.1 * 25) / g;
    const hit = cp / g * Math.log((target - 20) / (target - boiling));
    const rate = (200 - boiling + 0.1 * (25 - boiling)) / latent;
    expect(r.evaporated_g).toBeCloseTo(rate * (5 - hit), 11); expect(r.temperature_c).toBe(boiling); balanced(r);
  });
  it('does not manufacture latent energy when cold air outweighs heat from the sample', () => {
    const r = stepWallWaterPhase(input({ sample_c: boiling + 1, air_W_K: 2 }));
    expect(r.evaporated_g).toBe(0); expect(r.mass_g).toBe(1); expect(r.temperature_c).toBeLessThan(boiling); balanced(r);
  });
  it('restores the dry series path for the rest of the timestep after complete dryout', () => {
    const p = input({ dt: 10, mass_g: 0.01 }), r = stepWallWaterPhase(p);
    const rate = 200 - boiling + 0.1 * (25 - boiling), wet = 0.01 * latent / rate;
    const dryHeat = 1 * 0.1 / 1.1 * (200 - 25) * (10 - wet);
    expect(r.mass_g).toBe(0); expect(r.evaporated_g).toBe(0.01);
    expect(r.dryDuration_s).toBeCloseTo(10 - wet, 12);
    expect(r.fromSample_J).toBeCloseTo((200 - boiling) * wet + dryHeat, 10);
    expect(r.fromAir_J).toBeCloseTo(0.1 * (25 - boiling) * wet - dryHeat, 10); balanced(r);
  });
  it('relaxes stored superheat without adding heat or losing the enthalpy of removed water', () => {
    const p = input({ temperature_c: boiling + 10, sample_W_K: 0, air_W_K: 0 }), r = stepWallWaterPhase(p);
    expect(r.evaporated_g).toBeCloseTo(cp * 10 / latent, 12);
    expect(r.fromSample_J).toBe(0); expect(r.fromAir_J).toBe(0); expect(r.temperature_c).toBe(boiling); balanced(r);
  });
  it('uses the boiling point/latent heat at the actual environment pressure', () => {
    const low = waterBoilingPointAtPressure(0.5), r = stepWallWaterPhase(input({ boiling_c: low, temperature_c: low }));
    expect(r.temperature_c).toBe(low);
    expect(r.evaporated_g).toBeCloseTo((200 - low + 0.1 * (25 - low)) / waterLatentHeatJ_G(low), 12); balanced(r);
  });
  it('agrees when constant-boundary warming, boiling and dryout are divided into packets', () => {
    const run = (n: number) => {
      let mass = 0.05, t = 20, vapor = 0, out = 0, qs = 0, qa = 0;
      for (let i = 0; i < n; i++) {
        const r = stepWallWaterPhase(input({ dt: 10 / n, mass_g: mass, temperature_c: t })); balanced(r);
        mass = r.mass_g; t = r.temperature_c; vapor += r.evaporated_g; out += r.vaporEnergy_J;
        qs += r.fromSample_J; qa += r.fromAir_J;
      }
      return { mass, vapor, out, qs, qa };
    };
    const base = run(1);
    for (const n of [10, 60, 120]) {
      const r = run(n); expect(r.mass).toBe(base.mass); expect(r.vapor).toBeCloseTo(base.vapor, 12);
      expect(r.out).toBeCloseTo(base.out, 9); expect(r.qs).toBeCloseTo(base.qs, 8); expect(r.qa).toBeCloseTo(base.qa, 8);
    }
  });
  it('preserves water rather than venting imaginary steam from a sealed unsupported headspace', () => {
    const r = stepWallWaterPhase(input({ allowBoiling: false }));
    expect(r.valid).toBe(false); expect(r.reason).toBe('unsupported-sealed-boiling');
    expect(r.mass_g).toBe(1); expect(r.evaporated_g).toBe(0); expect(r.vaporEnergy_J).toBe(0);
  });
  it('rejects invalid inputs with no mass or energy transfer', () => {
    for (const patch of [{ dt: 0 }, { dt: NaN }, { mass_g: -1 }, { sample_W_K: -1 }, { boiling_c: 374 }]) {
      const r = stepWallWaterPhase(input(patch)); expect(r.valid).toBe(false);
      expect(r.evaporated_g).toBe(0); expect(r.fromSample_J).toBe(0); expect(r.fromAir_J).toBe(0);
    }
  });
});

describe('Wall boiling coupled to finite glass/sample and the correct vapor boundary', () => {
  it('balances stored film/sample, air and both vapor packets without debiting nonexistent bulk liquid', () => {
    const before = withFilm(), r = stepWetWallThermal(before, 1), after = r.vessel, wall = after.wallCondensation!;
    expect(r.innerVapor_g).toBeGreaterThan(0); expect(wall.outerThermalEvaporated_g).toBeGreaterThan(0);
    expect(after.mass_g).toBe(0); expect(after.evaporated_ml ?? 0).toBe(0);
    expect(after.temperature_c).toBeLessThan(240);
    expect(energy(after) - energy(before) + r.innerVaporEnergy_J + wall.outerThermalVaporEnergy_J!)
      .toBeCloseTo(wall.filmHeatFromAir_J!, 8);
    expect(wall.inner_g + r.innerVapor_g).toBeCloseTo(0.01, 12);
    expect(wall.outer_g + wall.ambientReleased_g).toBeCloseTo(0.01, 12);
  });
  it('routes only internal wall steam through the connected condenser source packet', () => {
    const before = withFilm(), routed = routeWaterVaporToWall(before, before, 0.01);
    const r = sample({ id: 'r', type: 'condenser', temperature_c: 25, vaporSourceId: 's', coolingWaterActive: true });
    const out = transferWaterCondensate({ s: routed.vessel, r }, new Map([['s', routed.availableVapor_g]]), 0.01,
      new Map([['s', routed.availableVaporEnergy_J]]));
    expect(out.r.condensateReceived_g).toBeGreaterThan(0);
    expect(out.r.condenserVaporEnergyReceived_J! / out.r.condensateReceived_g!).toBeCloseTo(h, 7);
    expect(out.s.wallCondensation!.outerThermalEvaporated_g).toBeGreaterThan(0);
    expect(out.r.condensateReceived_g!).toBeLessThanOrEqual(out.s.wallCondensation!.innerThermalEvaporated_g! * (1 + 1e-10));
  });
  it('keeps sealed internal boiling unavailable without losing or externally recovering that water', () => {
    const before = withFilm(sample({ isSealed: true }), 0.01, 0), r = stepWetWallThermal(before, 1e6);
    expect(r.vessel.wallCondensation!.thermalStatus).toBe('unsupported-sealed-boiling');
    expect(r.vessel.wallCondensation!.inner_g).toBe(0.01); expect(r.innerVapor_g).toBe(0);
    expect(r.vessel.temperature_c).toBe(240);
  });
  it('continues exterior boiling when the internal sealed steam closure is unavailable', () => {
    const before = withFilm(sample({ isSealed: true })), r = stepWetWallThermal(before, 1), wall = r.vessel.wallCondensation!;
    expect(wall.thermalStatus).toBe('partial-sealed-boiling');
    expect(wall.inner_g).toBe(0.01); expect(wall.innerWall_c).toBe(boiling);
    expect(r.innerVapor_g).toBe(0); expect(wall.outerThermalEvaporated_g).toBeGreaterThan(0);
    expect(energy(r.vessel) - energy(before) + wall.outerThermalVaporEnergy_J!).toBeCloseTo(wall.filmHeatFromAir_J!, 8);
  });
  it('runs wall boiling/recovery on the existing IDs and conserves actual live water inventory', () => {
    const s = withFilm(), r = sample({ id: 'r', type: 'condenser', temperature_c: 25,
      vaporSourceId: 's', coolingWaterActive: true });
    useAppStore.setState({ vessels: { s, r }, vesselIds: ['s', 'r'], burners: {}, spills: {}, activeKinetics: {},
      pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
    useAppStore.getState().tickSimulation(0.05);
    const state = useAppStore.getState(), source = state.vessels.s, wall = source.wallCondensation!;
    expect(Object.keys(state.vessels)).toEqual(['s', 'r']);
    expect(wall.innerThermalEvaporated_g).toBeGreaterThan(0); expect(state.vessels.r.condensateReceived_g).toBeGreaterThan(0);
    const mass = Object.values(state.vessels).reduce((sum, v) => sum + v.mass_g + (v.wallCondensation?.inner_g ?? 0)
      + (v.wallCondensation?.outer_g ?? 0) + (v.waterVaporReleased_g ?? 0)
      + (v.wallCondensation?.ambientReleased_g ?? 0) + (v.wallCondensation?.drainedOutside_g ?? 0)
      - (v.wallCondensation?.ambientCollected_g ?? 0), 0);
    expect(mass).toBeCloseTo(0.02, 10);
  });
});
