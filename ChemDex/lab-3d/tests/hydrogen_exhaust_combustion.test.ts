import { afterEach, describe, expect, it } from 'vitest';
import { hydrogenExhaustAnchor, hydrogenFlameOxygenSupply, HYDROGEN_COMBUSTION_J_MOL,
  postCombustionExhaustG, sodiumExternalIgnition, stepHydrogenExhaustCombustion } from '../src/engine/hydrogenExhaustCombustion';
import type { BurnerState, VesselState } from '../src/types/chemistry';
import { useAppStore } from '../src/store/useAppStore';
import { planSodiumWater } from '../src/engine/sodiumWaterPlan';
import { DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { useLabEnvironment } from '../src/store/useLabEnvironment';

const original = useAppStore.getState();
afterEach(() => { useAppStore.setState(original, true); useLabEnvironment.getState().setConditions(DEFAULT_LAB_ENVIRONMENT); });
const sample = (patch: Partial<VesselState> = {}): VesselState => ({
  id: 'h2_test', name: 'H2 test', type: 'beaker', capacity_ml: 250,
  position: [0, 0, 0], rotationY: 0, isLocked: false,
  contents: [{ formula: 'Na', mass_g: 0.1, moles: 0.1 / 22.99, phase: 's' },
    { formula: 'H2O', mass_g: 50, moles: 50 / 18.015, phase: 'l' }],
  substances: ['Na', 'H2O'], mass_g: 50.1, volume_ml: 50, volume: 0.2,
  temperature_c: 25, ph: 7, liquidColor: '#ffffff', hasPrecipitate: false,
  isBoiling: false, hasGas: false, ...patch,
});
const flameAtMouth = (v: VesselState): BurnerState => ({ id: 'source', isOn: true, intensity: 1,
  fuelLevel_ml: 10, position: [v.position[0], v.position[1] + hydrogenExhaustAnchor(v)[1] - 1.1, v.position[2]] });

describe('Finite external hydrogen flame boundary', () => {
  it('conserves atoms/mass including incoming oxygen and exports the combustion heat once', () => {
    const previous = sample({ escapedGas_g: { H2: 0.01 } });
    const current = sample({ escapedGas_g: { H2: 0.010001 } });
    const snapshot = JSON.stringify([previous, current]);
    const c = stepHydrogenExhaustCombustion(current, previous, 1, true, true)!;
    expect(c.burnedHydrogen_g).toBeCloseTo(0.000001, 12);
    expect(c.waterVaporProduced_g).toBeCloseTo(c.burnedHydrogen_g + c.oxygenConsumed_g, 12);
    expect(c.waterVaporProduced_g / 18.015).toBeCloseTo(c.burnedHydrogen_g / 2.016, 12);
    expect(c.oxygenConsumed_g / 31.998).toBeCloseTo(c.burnedHydrogen_g / 2.016 / 2, 12);
    expect(c.releasedHeat_J).toBeCloseTo(c.burnedHydrogen_g / 2.016 * HYDROGEN_COMBUSTION_J_MOL, 10);
    expect(c.heatToEnvironment_J).toBe(c.releasedHeat_J);
    const net = postCombustionExhaustG({ ...current, hydrogenCombustion: c });
    expect(net.H2 + net.H2O).toBeCloseTo(current.escapedGas_g!.H2 + c.oxygenConsumed_g, 12);
    expect(JSON.stringify([previous, current])).toBe(snapshot);
  });
  it('limits combustion by finite oxygen delivery, even with surplus hydrogen', () => {
    const previous = sample(), current = sample({ escapedGas_g: { H2: 1 } });
    const c = stepHydrogenExhaustCombustion(current, previous, 0.02, true, true)!;
    expect(c.oxygenConsumed_g / 31.998).toBeCloseTo(hydrogenFlameOxygenSupply(current, 0.1) * 0.02, 12);
    expect(c.burnedHydrogen_g).toBeLessThan(1);
    expect(c.burnedHydrogen_g + c.unburnedHydrogen_g).toBeCloseTo(c.sourceHydrogen_g, 12);
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid physical time %s', dt => {
    expect(stepHydrogenExhaustCombustion(sample({ escapedGas_g: { H2: 1 } }), sample(), dt, true, true)).toBeNull();
  });
  it.each([{ isSealed: true }, { isShattered: true }, { environment: { ...DEFAULT_LAB_ENVIRONMENT, oxygenFraction: 0 } }])(
    'cannot burn with an unavailable physical boundary %j', patch => {
      const c = stepHydrogenExhaustCombustion(sample({ ...patch, escapedGas_g: { H2: 1 } }), sample(), 1, true, true);
      expect(c?.burning ?? false).toBe(false);
      expect(c?.releasedHeat_J ?? 0).toBe(0);
    });
  it('requires ignition, sustains on new fuel, extinguishes, and never reignites old exhaust', () => {
    const start = sample(), fed = sample({ escapedGas_g: { H2: 0.000001 } });
    expect(stepHydrogenExhaustCombustion(fed, start, 1, true, false)!.burning).toBe(false);
    const first = { ...fed, hydrogenCombustion: stepHydrogenExhaustCombustion(fed, start, 1, true, true)! };
    const next = sample({ escapedGas_g: { H2: 0.000002 } });
    const sustained = { ...next, hydrogenCombustion: stepHydrogenExhaustCombustion(next, first, 1, true, false)! };
    expect(sustained.hydrogenCombustion.burning).toBe(true);
    const off = stepHydrogenExhaustCombustion(sustained, sustained, 1, true, true)!;
    expect(off.burning).toBe(false);
    expect(off.power_W).toBe(0);
    expect(off.releasedHeat_J).toBe(sustained.hydrogenCombustion.releasedHeat_J);
  });
  it('requires a fueled flame at the mouth; cannot ignite through glass or another vessel', () => {
    const v = sample(), b = flameAtMouth(v);
    expect(sodiumExternalIgnition(v, { b })).toBe(true);
    expect(sodiumExternalIgnition(v, { b: { ...b, isOn: false } })).toBe(false);
    expect(sodiumExternalIgnition(v, { b: { ...b, intensity: 0 } })).toBe(false);
    expect(sodiumExternalIgnition(v, { b: { ...b, fuelLevel_ml: 0 } })).toBe(false);
    expect(sodiumExternalIgnition(v, { b: { ...b, ethanolVolumeFraction: 0 } })).toBe(false);
    expect(sodiumExternalIgnition(v, { b: { ...b, position: [0, b.position[1] - 0.3, 0] } })).toBe(false);
    expect(sodiumExternalIgnition({ ...v, position: [5, 0, 0] }, { b })).toBe(false);
    expect(sodiumExternalIgnition({ ...v, isSealed: true }, { b })).toBe(false);
  });
  it('has no mass discontinuity at the former 0.4 g explosion threshold', () => {
    const rates = [0.399, 0.4, 0.401].map(m => hydrogenFlameOxygenSupply(sample(), m));
    expect(rates[0]).toBeLessThan(rates[1]);
    expect(rates[2] / rates[0]).toBeLessThan(1.01);
  });
  it('integrates the same finite fuel/oxygen/heat at 30, 60 and 120 steps per second', () => {
    const run = (fps: number) => {
      let v = sample({ escapedGas_g: { H2: 0 } });
      for (let i = 0; i < fps; i++) {
        const next = { ...v, escapedGas_g: { H2: (i + 1) * 0.01 / fps } };
        v = { ...next, hydrogenCombustion: stepHydrogenExhaustCombustion(next, v, 1 / fps, true, true)! };
      }
      return v.hydrogenCombustion!;
    };
    for (const fps of [60, 120]) {
      expect(run(fps).releasedHeat_J).toBeCloseTo(run(30).releasedHeat_J, 9);
      expect(run(fps).oxygenConsumed_g).toBeCloseTo(run(30).oxygenConsumed_g, 12);
      expect(run(fps).sourceHydrogen_g).toBeCloseTo(0.01, 12);
    }
  });
  it('integrates with real chemistry, stays vessel-scoped and stops on pause', () => {
    const a = sample(), b = sample({ id: 'other', position: [5, 0, 0] });
    const pa = planSodiumWater(a, 'vi')!, pb = planSodiumWater(b, 'vi')!;
    useLabEnvironment.getState().setConditions(DEFAULT_LAB_ENVIRONMENT);
    useAppStore.setState({ vessels: { [a.id]: pa.vessel, [b.id]: pb.vessel },
      activeKinetics: { [a.id]: pa.kinetics, [b.id]: pb.kinetics }, burners: { source: flameAtMouth(a) },
      pendingReactions: {}, isSimulationPaused: false, timeScale: 1 });
    useAppStore.getState().tickSimulation(0.05);
    const state = useAppStore.getState();
    const c = state.vessels[a.id].hydrogenCombustion!;
    expect(c.burning).toBe(true);
    expect(c.burnedHydrogen_g).toBeGreaterThan(0);
    expect(c.burnedHydrogen_g).toBeLessThanOrEqual(state.vessels[a.id].escapedGas_g!.H2);
    expect(state.vessels[b.id].hydrogenCombustion!.burning).toBe(false);
    expect(state.vessels[a.id].isShattered).not.toBe(true);
    useAppStore.getState().tickSimulation(0.05);
    const second = useAppStore.getState().vessels[a.id];
    expect(second.hydrogenCombustion!.releasedHeat_J).toBeGreaterThan(c.releasedHeat_J);
    expect(second.hydrogenCombustion!.sourceHydrogen_g).toBeCloseTo(second.escapedGas_g!.H2, 12);
    useAppStore.getState().setVesselState(a.id, { effectsEnvironment: { oxygenFraction: 0 } });
    useAppStore.getState().tickSimulation(0.05);
    const starved = useAppStore.getState().vessels[a.id].hydrogenCombustion!;
    expect(starved.burning).toBe(false);
    expect(starved.releasedHeat_J).toBe(second.hydrogenCombustion!.releasedHeat_J);
    useAppStore.setState({ isSimulationPaused: true });
    useAppStore.getState().tickSimulation(0.1);
    expect(useAppStore.getState().vessels[a.id].hydrogenCombustion).toEqual(starved);
  });
});
