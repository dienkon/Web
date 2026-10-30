import { afterEach, describe, expect, it } from 'vitest';
import type { VesselState } from '../src/types/chemistry';
import { DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { sampleHeatCapacity, stepVesselThermal } from '../src/engine/thermalState';
import { wallThermalPaths } from '../src/engine/wallThermalPaths';
import { stepWetWallThermal } from '../src/engine/wetWallThermal';
import { stepWallCondensation } from '../src/engine/wallCondensation';
import { routeWaterVaporToWall } from '../src/engine/waterVaporRouting';
import { useAppStore } from '../src/store/useAppStore';
import { SimulationEngine } from '../src/simulation/core/SimulationEngine';

const original = useAppStore.getState(), cp = 4.184;
const sample = (patch: Partial<VesselState> = {}): VesselState => ({ id: 'b', name: 'b', type: 'beaker',
  position: [0, 0, 0], rotationY: 0, isLocked: false, capacity_ml: 100, mass_g: 0, volume_ml: 0, volume: 0,
  contents: [], substances: [], temperature_c: 60, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false,
  isSealed: true, environment: DEFAULT_LAB_ENVIRONMENT, ...patch });
function film(v = sample(), inner = 0.1, outer = 0.05, innerT = 10, outerT = 15): VesselState {
  return { ...v, wallCondensation: { ...stepWallCondensation(v, 0, 0).wall,
    inner_g: inner, outer_g: outer, innerWall_c: innerT, outerWall_c: outerT,
    innerBeads: inner > 0 ? [{ mass_g: inner, y: 0.5, theta: 0, sliding: false }] : [],
    outerBeads: outer > 0 ? [{ mass_g: outer, y: 0.5, theta: 0, sliding: false }] : [] } };
}
const bulkEnergy = (v: VesselState) => sampleHeatCapacity(v) * v.temperature_c
  - v.contents.reduce((s, c) => s + (c.formula === 'H2O' && c.phase === 's' ? c.mass_g * 334 : 0), 0);
const filmEnergy = (v: VesselState) => cp * (v.wallCondensation!.inner_g * v.wallCondensation!.innerWall_c
  + v.wallCondensation!.outer_g * v.wallCondensation!.outerWall_c);
afterEach(() => { useAppStore.setState(original, true); SimulationEngine.clearAll(); });

describe('Finite thermal capacity of retained wall water', () => {
  it('replaces a bounded share of the dry path with the same steady resistance', () => {
    const paths = wallThermalPaths(film(), 25);
    expect(paths.patches).toHaveLength(2);
    expect(paths.dry_W_K + paths.patches.reduce((s, p) => s + p.replacedDry_W_K, 0)).toBeCloseTo(paths.baseline_W_K, 14);
    for (const p of paths.patches) {
      expect(p.sample_W_K * p.air_W_K / (p.sample_W_K + p.air_W_K)).toBeCloseTo(p.replacedDry_W_K, 14);
    }
    const saturated = wallThermalPaths(film(sample(), 1e6, 1e6), 25);
    expect(saturated.dry_W_K).toBeGreaterThanOrEqual(0);
    expect(saturated.patches.reduce((s, p) => s + p.replacedDry_W_K, 0)).toBeLessThanOrEqual(saturated.baseline_W_K * (1 + 1e-14));
  });
  it('warms cold film with finite sample/air heat rather than instantly resetting its temperature', () => {
    const before = film(), snapshot = structuredClone(before), after = stepWetWallThermal(before, 1).vessel;
    const wall = after.wallCondensation!;
    expect(wall.innerWall_c).toBeGreaterThan(10); expect(wall.innerWall_c).toBeLessThan(25 + 0.35 * 35);
    expect(wall.outerWall_c).toBeGreaterThan(15); expect(after.temperature_c).toBeLessThan(60);
    expect(filmEnergy(after) - filmEnergy(before)).toBeCloseTo(wall.filmSensibleEnergyChange_J!, 10);
    expect(wall.filmSensibleEnergyChange_J).toBeCloseTo(wall.filmHeatFromSample_J! + wall.filmHeatFromAir_J!, 10);
    expect(bulkEnergy(after) - bulkEnergy(before) + wall.filmHeatFromSample_J!).toBeCloseTo(0, 9);
    expect(before).toEqual(snapshot);
  });
  it('returns real heat from a hot film to a colder finite sample and rejects the rest to air', () => {
    const before = film(sample({ temperature_c: 10 }), 0.1, 0, 80), after = stepWetWallThermal(before, 10).vessel;
    expect(after.temperature_c).toBeGreaterThan(10); expect(after.wallCondensation!.innerWall_c).toBeLessThan(80);
    expect(after.wallCondensation!.filmHeatFromSample_J).toBeLessThan(0);
    expect(after.wallCondensation!.filmHeatFromAir_J).toBeLessThan(0);
    expect(bulkEnergy(after) + filmEnergy(after) - bulkEnergy(before) - filmEnergy(before))
      .toBeCloseTo(after.wallCondensation!.filmHeatFromAir_J!, 9);
  });
  it('keeps film and sample in bounds for a large timestep instead of explicit overshoot', () => {
    const before = film(), after = stepWetWallThermal(before, 1e5).vessel;
    for (const t of [after.temperature_c, after.wallCondensation!.innerWall_c, after.wallCondensation!.outerWall_c]) {
      expect(t).toBeGreaterThanOrEqual(10); expect(t).toBeLessThanOrEqual(60);
    }
    expect(bulkEnergy(after) + filmEnergy(after) - bulkEnergy(before) - filmEnergy(before))
      .toBeCloseTo(after.wallCondensation!.filmHeatFromAir_J!, 7);
  });
  it('does not double coolant loss at a steady wet-wall resistance split', () => {
    const before = film(sample(), 0.1, 0, 25 + 0.35 * 35), power = 0.18 * 35;
    const main = stepVesselThermal(before, 1, power), current = { ...before, ...main };
    const after = stepWetWallThermal(current, 1, main.wallThermalDryCredit_J).vessel;
    expect(after.temperature_c).toBeCloseTo(60, 12);
    expect(after.wallCondensation!.innerWall_c).toBeCloseTo(before.wallCondensation!.innerWall_c, 12);
    expect(after.wallCondensation!.filmHeatFromSample_J).toBeCloseTo(main.wallThermalDryCredit_J!, 12);
    expect(after.wallCondensation!.filmHeatFromAir_J).toBeCloseTo(-main.wallThermalDryCredit_J!, 12);
  });
  it('balances the composed bulk step, retained film and actual external air boundary', () => {
    const before = film(sample(), 0.1, 0, 10), dt = 1;
    const main = stepVesselThermal(before, dt), current = { ...before, ...main };
    const after = routeWaterVaporToWall(current, before, dt, {
      includedDryHeat_J: main.wallThermalDryCredit_J!, enabled: main.wallThermalEligible! }).vessel;
    const wall = after.wallCondensation!, fullDryLoss = bulkEnergy(before) - bulkEnergy(current);
    const actualExternalHeat = -fullDryLoss + wall.dryHeatReplaced_J! + wall.filmHeatFromAir_J!;
    expect(bulkEnergy(after) + filmEnergy(after) - bulkEnergy(before) - filmEnergy(before)).toBeCloseTo(actualExternalHeat, 9);
    expect(wall.innerWall_c).toBeGreaterThan(10); expect(wall.inner_g + wall.returned_g).toBeCloseTo(0.1, 12);
  });
  it('uses incoming film heat for melting at 0 C, without assigning fusion energy to vapor', () => {
    const before = film(sample({ temperature_c: 0, mass_g: 1, isSealed: false, contents: [
      { formula: 'H2O', phase: 's', mass_g: 1, moles: 1 / 18.015 }], iceVolume_ml: 1 / 0.917 }), 0.1, 0, 80);
    const after = stepWetWallThermal(before, 100).vessel;
    expect(after.temperature_c).toBe(0);
    expect(after.contents.find(c => c.phase === 's')!.mass_g).toBeLessThan(1);
    expect(after.thermalVaporEnthalpy_J).toBe(0);
    expect(bulkEnergy(after) + filmEnergy(after) - bulkEnergy(before) - filmEnergy(before))
      .toBeCloseTo(after.wallCondensation!.filmHeatFromAir_J!, 8);
  });
  it('converges under timestep refinement while conserving energy on every partition', () => {
    // Independent integration of the three-node first-law ODE, without the
    // production exponential/implicit-temperature calculation.
    const start = film(), paths = wallThermalPaths(start, 25).patches, c = sampleHeatCapacity(start);
    const derivative = (t: number[]) => {
      const bulkRates = paths.map((p, i) => p.sample_W_K * (t[0] - t[i + 1]));
      return [-bulkRates.reduce((s, q) => s + q, 0) / c,
        ...paths.map((p, i) => (bulkRates[i] + p.air_W_K * (25 - t[i + 1])) / (p.mass_g * cp))];
    };
    let referenceState = [60, 10, 15]; const h = 10 / 10000;
    for (let i = 0; i < 10000; i++) {
      const k1 = derivative(referenceState), k2 = derivative(referenceState.map((t, j) => t + h * k1[j] / 2));
      const k3 = derivative(referenceState.map((t, j) => t + h * k2[j] / 2));
      const k4 = derivative(referenceState.map((t, j) => t + h * k3[j]));
      referenceState = referenceState.map((t, j) => t + h / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    }
    const run = (n: number) => {
      let v = film(); const initialEnergy = bulkEnergy(v) + filmEnergy(v);
      for (let i = 0; i < n; i++) v = stepWetWallThermal(v, 10 / n).vessel;
      expect(bulkEnergy(v) + filmEnergy(v) - initialEnergy).toBeCloseTo(v.wallCondensation!.filmHeatFromAir_J!, 8);
      return v.temperature_c;
    };
    const reference = referenceState[0], coarse = run(1), medium = run(8), fine = run(64);
    expect(Math.abs(fine - reference)).toBeLessThan(Math.abs(medium - reference));
    expect(Math.abs(medium - reference)).toBeLessThan(Math.abs(coarse - reference));
    expect(Math.abs(run(512) - reference)).toBeLessThan(1e-6);
  });
  it('leaves invalid timesteps intact and labels unsupported film phase boundaries', () => {
    const before = film();
    for (const dt of [0, -1, NaN, Infinity]) expect(stepWetWallThermal(before, dt).vessel).toBe(before);
    for (const temperature_c of [-10]) {
      const unsupported = film(sample({ temperature_c })), paths = wallThermalPaths(unsupported, 25);
      const after = stepWetWallThermal(unsupported, 1).vessel;
      expect(paths.dry_W_K).toBe(paths.baseline_W_K);
      expect(after.temperature_c).toBe(temperature_c); expect(after.wallCondensation!.inner_g).toBe(0.1);
      expect(after.wallCondensation!.thermalStatus).toBe('unsupported-liquid-state');
    }
  });
  it('updates the retained film temperature in the live store on the same vessel ID', () => {
    const before = film(sample(), 0.1, 0, 10);
    useAppStore.setState({ vessels: { b: before }, vesselIds: ['b'], burners: {}, spills: {},
      activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
    useAppStore.getState().tickSimulation(0.05);
    const after = useAppStore.getState().vessels.b;
    expect(Object.keys(useAppStore.getState().vessels)).toEqual(['b']);
    expect(after.wallCondensation!.thermalStatus).toBe('finite-liquid');
    expect(after.wallCondensation!.innerWall_c).toBeGreaterThan(10);
    expect(after.wallCondensation!.innerWall_c).toBeLessThan(11);
    expect(after.wallCondensation!.filmHeatFromSample_J).toBeGreaterThan(0);
  });
});
