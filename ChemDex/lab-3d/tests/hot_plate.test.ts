import { afterEach, describe, expect, it } from 'vitest';
import { stepHotPlate, onHotPlate, PLATE_TOP_Y, PLATE_HEAT_CAPACITY_J_K, PLATE_POWER_W } from '../src/engine/hotPlateEnergy';
import { useAppStore } from '../src/store/useAppStore';
import type { VesselState } from '../src/types/chemistry';

const shell: VesselState = { id: 'plate', name: 'Plate', type: 'hot_plate', capacity_ml: 0,
  position: [0, -0.135, 0], rotationY: 0, isLocked: false, contents: [], substances: [],
  volume_ml: 0, volume: 0, mass_g: 0, temperature_c: 25, ph: 7,
  hasPrecipitate: false, hasGas: false, isBoiling: false, hotPlate: { isOn: false, setPoint_c: 150 } };
function sample(patch: Partial<VesselState> = {}): VesselState {
  return { ...shell, id: 'sample', name: 'Water', type: 'beaker', capacity_ml: 100, hotPlate: undefined,
    position: [0, shell.position[1] + PLATE_TOP_Y, 0], mass_g: 5, volume_ml: 5, volume: 0.05,
    contents: [{ formula: 'H2O', phase: 'l', mass_g: 5, moles: 5 / 18.015 }], substances: ['H2O'], ...patch };
}
const before = useAppStore.getState();
afterEach(() => useAppStore.setState(before));
function setup(plate = shell, receiver = sample()) {
  useAppStore.setState({ vessels: { [plate.id]: plate, [receiver.id]: receiver }, vesselIds: [plate.id, receiver.id],
    burners: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {},
    isSimulationPaused: false, timeScale: 1, spills: {} });
}

describe('Hot plate reservoir, contact and evaporation', () => {
  it('requires supported upright contact rather than heating nearby or lesson vessels', () => {
    expect(onHotPlate(shell, sample())).toBe(true);
    for (const patch of [{ position: [2, 0.135, 0] }, { position: [0, 2, 0] }, { type: 'test_tube' },
      { rotationZ: 0.5 }, { isShattered: true }, { id: 'lesson_vessel_example' }] as Partial<VesselState>[]) {
      expect(onHotPlate(shell, sample(patch))).toBe(false);
    }
  });
  it('meters one electrical input and closes the plate energy budget for multiple receivers', () => {
    const initial = { ...shell, temperature_c: 150, hotPlate: { isOn: true, setPoint_c: 200 } };
    const step = stepHotPlate(initial, [sample(), sample({ id: 'other' })], 0.1);
    const meters = step.plate.hotPlate!;
    expect(meters.electricalEnergy_J).toBeLessThanOrEqual(PLATE_POWER_W * 0.1);
    expect(meters.deliveredHeat_J).toBeGreaterThan(0);
    expect([...step.energyByVessel_J.values()].reduce((sum, value) => sum + value, 0)).toBeCloseTo(meters.deliveredHeat_J!, 10);
    expect((step.plate.temperature_c - initial.temperature_c) * PLATE_HEAT_CAPACITY_J_K
      + meters.deliveredHeat_J! + meters.heatLost_J!).toBeCloseTo(meters.electricalEnergy_J!, 8);
  });
  it('retains residual heat after switching off and does not deliver heat without contact', () => {
    const hot = { ...shell, temperature_c: 150 };
    const residual = stepHotPlate(hot, [sample()], 0.1);
    expect(residual.plate.hotPlate!.electricalEnergy_J).toBe(0);
    expect(residual.plate.hotPlate!.deliveredHeat_J).toBeGreaterThan(0);
    expect(residual.plate.temperature_c).toBeGreaterThan(25);
    const empty = stepHotPlate(hot, [sample({ position: [3, 0, 0] })], 0.1);
    expect(empty.energyByVessel_J.size).toBe(0);
    expect(empty.plate.temperature_c).toBeLessThan(150);
  });
  it('never jumps the sample to a setpoint, heats while no burner is on, and pauses with the lab', () => {
    setup();
    const state = useAppStore.getState();
    expect(state.setHotPlate('sample', { isOn: true })).toBe(false);
    expect(state.setHotPlate('plate', { isOn: true, setPoint_c: 200 })).toBe(true);
    expect(useAppStore.getState().vessels.sample.temperature_c).toBe(25);
    state.tickSimulation(0.1);
    const heated = useAppStore.getState();
    expect(heated.vessels.plate.temperature_c).toBeGreaterThan(25);
    expect(heated.vessels.sample.temperature_c).toBeGreaterThan(25);
    expect(heated.vessels.sample.temperature_c).toBeLessThan(26);
    useAppStore.setState({ isSimulationPaused: true });
    state.tickSimulation(0.1);
    expect(useAppStore.getState().vessels.plate).toBe(heated.vessels.plate);
  });
  it('bounds setpoints and only places an unlocked compatible receiver onto an empty plate', () => {
    setup(shell, sample({ position: [2, -0.135, 0] }));
    const state = useAppStore.getState();
    expect(state.setHotPlate('plate', { setPoint_c: Infinity })).toBe(true);
    expect(useAppStore.getState().vessels.plate.hotPlate!.setPoint_c).toBe(100);
    state.setHotPlate('plate', { setPoint_c: 500 });
    expect(useAppStore.getState().vessels.plate.hotPlate!.setPoint_c).toBe(350);
    const original = useAppStore.getState().vessels.sample;
    expect(state.placeOnHotPlate('sample', 'plate')).toBe(true);
    const placed = useAppStore.getState().vessels.sample;
    expect(onHotPlate(shell, placed)).toBe(true);
    expect(placed.contents).toBe(original.contents);
    expect(placed.mass_g).toBe(original.mass_g);
    useAppStore.setState(s => ({ vessels: { ...s.vessels, other: sample({ id: 'other', position: [4, -0.135, 0] }) } }));
    expect(state.placeOnHotPlate('other', 'plate')).toBe(false);
    state.setVesselState('sample', { isLocked: true });
    expect(state.placeOnHotPlate('sample', 'plate')).toBe(false);
  });
  it('commits the evaporated solvent inventory and stops with a dry sample', () => {
    const tiny = sample({ temperature_c: 100, mass_g: 0.001, volume_ml: 0.001, volume: 0.00001,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 0.001, moles: 0.001 / 18.015 }] });
    setup({ ...shell, temperature_c: 200 }, tiny);
    for (let i = 0; i < 30; i++) useAppStore.getState().tickSimulation(0.1);
    const state = useAppStore.getState(), end = state.vessels.sample;
    expect(end.volume_ml).toBeCloseTo(0, 12);
    expect(end.mass_g).toBeCloseTo(0, 12);
    expect(end.contents.reduce((sum, item) => sum + item.mass_g, 0)).toBeCloseTo(0, 12);
    expect(end.evaporated_ml).toBeCloseTo(0.001, 12);
    expect(end.isBoiling).toBe(false);
    expect(end.evaporationRate_g_s).toBe(0);
    expect(Object.keys(state.spills)).toHaveLength(0);
  });
  it('keeps water in a sealed sample and does not create random bumping spills', () => {
    setup({ ...shell, temperature_c: 200 }, sample({ isSealed: true, temperature_c: 110 }));
    for (let i = 0; i < 20; i++) useAppStore.getState().tickSimulation(0.1);
    const state = useAppStore.getState(), end = state.vessels.sample;
    expect(end.mass_g).toBe(5);
    expect(end.contents[0].mass_g).toBe(5);
    expect(end.isBoiling).toBe(false);
    expect(end.bumpingSurge).toBe(false);
    expect(Object.keys(state.spills)).toHaveLength(0);
  });
});
