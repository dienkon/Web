import { afterEach, describe, expect, it } from 'vitest';
import { stepAlcoholBurner, allocateBurnerHeat, ETHANOL_LHV_J_ML, MAX_CAPTURE_FRACTION,
  NOMINAL_FUEL_RATE_ML_S, DEFAULT_ETHANOL_VOLUME_FRACTION } from '../src/engine/burnerEnergy';
import { useAppStore } from '../src/store/useAppStore';
import type { BurnerState, VesselState } from '../src/types/chemistry';

const burner = (patch: Partial<BurnerState> = {}): BurnerState => ({
  id: 'energy_lamp', position: [0, 0, 0], isOn: true, intensity: 3,
  fuelLevel_ml: 120, maxFuel_ml: 150, ...patch,
});
const sample = (id = 'energy_sample', patch: Partial<VesselState> = {}): VesselState => ({
  id, name: id, type: 'beaker', position: [0, 1.3, 0], rotationY: 0,
  capacity_ml: 100, isLocked: false, volume_ml: 50, volume: 0.5, mass_g: 50,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }], substances: ['H2O'],
  temperature_c: 25, ph: 7, hasPrecipitate: false, hasGas: false, isBoiling: false, ...patch,
});
const before = useAppStore.getState();
afterEach(() => useAppStore.setState(before));
function setup(vessels: VesselState[], lamp = burner()) {
  useAppStore.setState({ vessels: Object.fromEntries(vessels.map(item => [item.id, item])),
    vesselIds: vessels.map(item => item.id), burners: { [lamp.id]: lamp }, burnerIds: [lamp.id],
    activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
}

describe('Finite lamp fuel and shared energy', () => {
  it('uses the DOE E100 lower heating value with explicit unit conversion', () => {
    expect(ETHANOL_LHV_J_ML).toBeCloseTo(76_330 * 1055.05585262 / 3785.411784, 8);
    expect(ETHANOL_LHV_J_ML).toBeGreaterThan(21_000);
    expect(ETHANOL_LHV_J_ML).toBeLessThan(22_000);
  });
  it('consumes sub-centilitre fuel increments instead of rounding them back into existence', () => {
    const initial = burner(), result = stepAlcoholBurner(initial, 1 / 60);
    expect(result.burner.fuelLevel_ml).toBeLessThan(120);
    expect(result.burned_ml).toBeCloseTo(NOMINAL_FUEL_RATE_ML_S / 60, 14);
    expect(result.energy_J).toBeCloseTo(result.burned_ml * DEFAULT_ETHANOL_VOLUME_FRACTION * ETHANOL_LHV_J_ML, 12);
    expect(initial.fuelLevel_ml).toBe(120);
  });
  it('conserves consumed fuel and energy across different step sizes', () => {
    const integrate = (count: number) => {
      let state = burner();
      for (let i = 0; i < count; i++) state = stepAlcoholBurner(state, 10 / count).burner;
      return state;
    };
    for (const state of [integrate(10), integrate(100), integrate(600)]) {
      expect(state.fuelLevel_ml).toBeCloseTo(119.8, 9);
      expect(state.burnedFuel_ml).toBeCloseTo(0.2, 10);
      expect(state.releasedHeat_J).toBeCloseTo(0.2 * DEFAULT_ETHANOL_VOLUME_FRACTION * ETHANOL_LHV_J_ML, 8);
    }
  });
  it('uses only remaining fuel for the last partial burn and then stops', () => {
    const initial = burner({ fuelLevel_ml: 0.0001 });
    const last = stepAlcoholBurner(initial, 1);
    expect(last.burned_ml).toBe(0.0001);
    expect(last.burner.isOn).toBe(false);
    expect(last.burner.flameState).toBe('OUT_OF_FUEL');
    expect(last.capturableHeat_J).toBeCloseTo(0.0001 * DEFAULT_ETHANOL_VOLUME_FRACTION * ETHANOL_LHV_J_ML * MAX_CAPTURE_FRACTION, 12);
    const after = stepAlcoholBurner(last.burner, 10);
    expect(after.energy_J).toBe(0);
    expect(after.burner.burnedFuel_ml).toBe(last.burner.burnedFuel_ml);
  });
  it('does not burn unlit fuel, nonflammable contents or invalid input', () => {
    for (const patch of [{ isOn: false }, { fuelLevel_ml: 0 }, { fuelLevel_ml: NaN }, { ethanolVolumeFraction: 0 }]) {
      expect(stepAlcoholBurner(burner(patch), 1).energy_J).toBe(0);
    }
    for (const dt of [NaN, Infinity, 0, -1]) expect(stepAlcoholBurner(burner(), dt).burned_ml).toBe(0);
    expect(stepAlcoholBurner(burner({ intensity: NaN }), 1).burner.intensity).toBe(3);
  });
  it('splits one budget between multiple receivers instead of multiplying output', () => {
    const receivers = [sample('a'), sample('b'), sample('c'), sample('d')];
    const one = allocateBurnerHeat(burner(), 100, receivers.slice(0, 1));
    const four = allocateBurnerHeat(burner(), 100, receivers);
    expect(one.deliveredHeat_J).toBe(100);
    expect(four.deliveredHeat_J).toBe(100);
    for (const energy of four.energyByVessel_J.values()) expect(energy).toBe(25);
  });
  it('assigns no heat to remote, shattered or lesson-controlled samples', () => {
    const allocation = allocateBurnerHeat(burner(), 100, [sample('far', { position: [10, 1, 0] }),
      sample('broken', { isShattered: true }), sample('lesson_vessel_demo')]);
    expect(allocation.deliveredHeat_J).toBe(0);
    expect(allocation.energyByVessel_J.size).toBe(0);
  });
  it('depletes fuel at 60 simulated frames/s in the actual store', () => {
    setup([]);
    for (let i = 0; i < 600; i++) useAppStore.getState().tickSimulation(1 / 60);
    const state = useAppStore.getState().burners.energy_lamp;
    expect(state.fuelLevel_ml).toBeCloseTo(119.8, 9);
    expect(state.burnedFuel_ml).toBeCloseTo(0.2, 10);
    expect(state.deliveredHeat_J).toBe(0);
    expect(state.heatLost_J).toBeCloseTo(state.releasedHeat_J!, 8);
  });
  it('records delivered plus lost heat as exactly the source energy in the store', () => {
    setup([sample('a'), sample('b')]);
    useAppStore.getState().tickSimulation(0.1);
    const state = useAppStore.getState(), lamp = state.burners.energy_lamp;
    expect(lamp.deliveredHeat_J! + lamp.heatLost_J!).toBeCloseTo(lamp.releasedHeat_J!, 10);
    expect(lamp.deliveredHeat_J).toBeCloseTo(lamp.releasedHeat_J! * MAX_CAPTURE_FRACTION, 10);
    expect(state.vessels.a.temperature_c).toBeGreaterThan(25);
    expect(state.vessels.a.temperature_c).toBeCloseTo(state.vessels.b.temperature_c, 12);
  });
  it('retains heat of the final partial burn even when isOn turns false in that step', () => {
    setup([sample()], burner({ fuelLevel_ml: 0.0001 }));
    useAppStore.getState().tickSimulation(0.1);
    const state = useAppStore.getState();
    expect(state.burners.energy_lamp.isOn).toBe(false);
    expect(state.vessels.energy_sample.temperature_c).toBeGreaterThan(25);
    const spent = state.burners.energy_lamp.releasedHeat_J;
    useAppStore.getState().tickSimulation(0.1);
    expect(useAppStore.getState().burners.energy_lamp.releasedHeat_J).toBe(spent);
    expect(useAppStore.getState().vessels.energy_sample.temperature_c).toBeLessThan(state.vessels.energy_sample.temperature_c);
  });
  it('does not ignite an empty lamp and keeps intensity controls finite', () => {
    setup([], burner({ fuelLevel_ml: 0, isOn: false }));
    useAppStore.getState().toggleBurner('energy_lamp');
    expect(useAppStore.getState().burners.energy_lamp.isOn).toBe(false);
    useAppStore.getState().setBurnerIntensity('energy_lamp', NaN);
    expect(useAppStore.getState().burners.energy_lamp.intensity).toBe(3);
  });
});
