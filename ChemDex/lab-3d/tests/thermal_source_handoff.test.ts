import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BurnerState, VesselState } from '../src/types/chemistry';
import { SimulationEngine, VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { applyThermalEnergy, aqueousBoilingPoint, sampleHeatCapacity, stepVesselThermal } from '../src/engine/thermalState';
import { routeWaterVaporToWall } from '../src/engine/waterVaporRouting';
import { useAppStore } from '../src/store/useAppStore';
import { effects } from '../src/vfx/vesselEffects';
import { DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { PLATE_TOP_Y } from '../src/engine/hotPlateEnergy';
import { waterLatentHeatJ_G, WATER_CP_J_G_K, WATER_FUSION_J_G, ICE_DENSITY_G_ML } from '../src/engine/waterProperties';
import * as heatIntegration from '../src/science/thermalHeatIntegration';
import { stepWetWallThermal } from '../src/engine/wetWallThermal';
import { stepWallCondensation } from '../src/engine/wallCondensation';

const original = useAppStore.getState();
const sample = (patch: Partial<VesselState> = {}): VesselState => ({
  id: 'a', name: 'a', type: 'beaker', capacity_ml: 250, position: [0, 1.3, 0],
  rotationY: 0, isLocked: false, volume_ml: 100, volume: 0.4, mass_g: 100,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 100, moles: 100 / 18.015 }],
  substances: ['H2O'], temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false,
  isBoiling: false, environment: DEFAULT_LAB_ENVIRONMENT, ...patch,
});
function setup(vessels: VesselState[], burners: Record<string, BurnerState> = {}) {
  useAppStore.setState({ vessels: Object.fromEntries(vessels.map(v => [v.id, v])),
    vesselIds: vessels.map(v => v.id), burners, burnerIds: Object.keys(burners), spills: {},
    activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {},
    isSimulationPaused: false, timeScale: 1 });
}
afterEach(() => { useAppStore.setState(original, true); SimulationEngine.clearAll(); vi.restoreAllMocks(); });

describe('One metered heater input and complete thermal state handoff', () => {
  it('cannot store more than 50 J from 50 W for one second in an initially ambient sample', () => {
    const before = sample({ environment: { ...DEFAULT_LAB_ENVIRONMENT, relativeHumidity: 1 } });
    const manager = new VesselSimulationManager(before.id);
    const out = manager.step(before, 1, { heatPower_W: 50 });
    const stored = sampleHeatCapacity({ ...before, ...out }) * out.temperature_c
      - sampleHeatCapacity(before) * before.temperature_c;
    // Initially no ambient heat gain. A small amount goes to cooling/evaporation.
    expect(stored).toBeGreaterThan(49);
    expect(stored).toBeLessThanOrEqual(50);
    expect(out.thermalHeatingPower_W).toBe(50);
    expect(out.thermalHeatingEnergy_J).toBe(50);
    const reference = stepVesselThermal(before, 1, 50);
    expect(out.temperature_c).toBe(reference.temperature_c);
    expect(out.evaporatedStep_g).toBe(reference.evaporatedStep_g);
  });
  it('preserves cumulative mass and outgoing enthalpy across repeated standalone result merges', () => {
    let current = sample(); current.temperature_c = aqueousBoilingPoint(current);
    // Isothermal surroundings keep the wall at Tb: this test isolates the
    // vapor handoff, without diverting a part of each packet into wall recovery.
    current.environment = { ...DEFAULT_LAB_ENVIRONMENT, temperature_c: current.temperature_c };
    const initial = current, manager = new VesselSimulationManager(current.id);
    let stepMass = 0, routedMass = 0, routedEnergy = 0;
    for (let i = 0; i < 10; i++) {
      const before = current, result = manager.step(before, 0.1, { heatPower_W: 200, ambientTemp_c: initial.temperature_c });
      current = { ...before, ...result }; stepMass += result.evaporatedStep_g;
      const route = routeWaterVaporToWall(current, before, 0.1);
      routedMass += route.availableVapor_g; routedEnergy += route.availableVaporEnergy_J;
      expect(current.thermalVaporEnthalpy_J).toBeGreaterThan(before.thermalVaporEnthalpy_J ?? 0);
    }
    expect(stepMass).toBeGreaterThan(0.05);
    expect(current.mass_g + current.evaporated_ml!).toBeCloseTo(initial.mass_g, 10);
    expect(current.evaporated_ml).toBeCloseTo(stepMass, 12);
    expect(routedMass).toBeCloseTo(stepMass, 12);
    expect(routedEnergy).toBeCloseTo(current.thermalVaporEnthalpy_J!, 8);
    expect(current.thermalVaporSensibleEnthalpy_J).toBeGreaterThan(0);
    expect(current.thermalHeatingEnergy_J).toBeCloseTo(200, 10);
    const energyChange = sampleHeatCapacity(current) * current.temperature_c
      - sampleHeatCapacity(initial) * initial.temperature_c + routedEnergy;
    expect(energyChange).toBeCloseTo(200, 8);
  });
  it('keeps every source counter during authoritative rendering and takes no second heater input', () => {
    const before = sample({ evaporated_ml: 3, thermalVaporEnthalpy_J: 8000,
      thermalVaporSensibleEnthalpy_J: 1200, thermalHeatingPower_W: 40,
      thermalHeatingEnergy_J: 10000, thermalEnergyOutsideModel_J: 500, thermalModelLimit: 'declared limit' });
    const snapshot = JSON.stringify(before), manager = new VesselSimulationManager(before.id);
    const out = manager.step(before, 1, { thermalStateAuthoritative: true, heatPower_W: 1000 });
    expect(out.evaporatedStep_g).toBe(0);
    for (const field of ['evaporated_ml', 'thermalVaporEnthalpy_J', 'thermalVaporSensibleEnthalpy_J',
      'thermalHeatingPower_W', 'thermalHeatingEnergy_J', 'thermalEnergyOutsideModel_J', 'thermalModelLimit'] as const) {
      expect(out[field]).toBe(before[field]);
    }
    expect(out.mass_g).toBe(before.mass_g); expect(out.temperature_c).toBe(before.temperature_c);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
  it('meters input even while the dilute-model boundary holds temperature and inventory fixed', () => {
    const initial = sample({ mass_g: 101, contents: [
      { formula: 'H2O', phase: 'l', mass_g: 100, moles: 100 / 18.015 },
      { formula: 'NaCl', phase: 'aq', mass_g: 1, moles: 1 / 58.44 }], substances: ['H2O', 'NaCl'] });
    initial.temperature_c = aqueousBoilingPoint(initial);
    const boundary = { ...initial, ...applyThermalEnergy(initial, 500000), effectHeatInput_W: 1000 };
    setup([boundary]);
    useAppStore.getState().tickSimulation(0.1);
    const first = useAppStore.getState().vessels.a;
    useAppStore.getState().tickSimulation(0.1);
    const second = useAppStore.getState().vessels.a;
    expect(second.temperature_c).toBe(first.temperature_c);
    expect(second.mass_g).toBe(first.mass_g);
    expect(second.thermalHeatingEnergy_J).toBe(200);
    expect(second.thermalEnergyOutsideModel_J! - first.thermalEnergyOutsideModel_J!).toBeGreaterThan(90);
    expect(second.thermalModelLimit).toContain('nồng độ');
    const diagnostic = effects.forVessel('a').inspect().state!;
    expect(diagnostic.thermalHeatingPower_W).toBe(1000);
    expect(diagnostic.thermalHeatingEnergy_J).toBe(200);
    expect(Object.keys(useAppStore.getState().vessels)).toEqual(['a']);
  });
  it('records virtual input on only the selected vessel and holds cumulative energy after cutoff/pause', () => {
    setup([sample({ effectHeatInput_W: 50 }), sample({ id: 'b' })]);
    useAppStore.getState().tickSimulation(0.2);
    const first = useAppStore.getState().vessels.a;
    expect(first.thermalHeatingEnergy_J).toBe(10);
    expect(useAppStore.getState().vessels.b.thermalHeatingEnergy_J).toBe(0);
    useAppStore.getState().setVesselState('a', { effectHeatInput_W: 0 });
    useAppStore.getState().tickSimulation(0.1);
    expect(useAppStore.getState().vessels.a.thermalHeatingPower_W).toBe(0);
    expect(useAppStore.getState().vessels.a.thermalHeatingEnergy_J).toBe(10);
    useAppStore.setState({ isSimulationPaused: true });
    const paused = useAppStore.getState().vessels.a;
    useAppStore.getState().tickSimulation(1);
    expect(useAppStore.getState().vessels.a).toBe(paused);
  });
  it('reports the partial final fuel packet after extinguishment, shared once across receivers', () => {
    const lamp: BurnerState = { id: 'lamp', position: [0, 0, 0], isOn: true,
      intensity: 3, fuelLevel_ml: 0.0001, maxFuel_ml: 150, tempOutput_c: 9999 };
    setup([sample(), sample({ id: 'b' })], { lamp });
    useAppStore.getState().tickSimulation(0.1);
    const state = useAppStore.getState(), delivered = state.burners.lamp.deliveredHeat_J!;
    expect(state.burners.lamp.isOn).toBe(false); expect(delivered).toBeGreaterThan(0);
    expect(state.vessels.a.thermalHeatingEnergy_J! + state.vessels.b.thermalHeatingEnergy_J!)
      .toBeCloseTo(delivered, 12);
    expect(state.vessels.a.thermalHeatingPower_W! * 0.1).toBeCloseTo(delivered / 2, 12);
    expect(delivered).toBeLessThan(state.burners.lamp.releasedHeat_J!);
    useAppStore.getState().tickSimulation(0.1);
    expect(useAppStore.getState().vessels.a.thermalHeatingPower_W).toBe(0);
    expect(useAppStore.getState().vessels.a.thermalHeatingEnergy_J).toBeCloseTo(delivered / 2, 12);
  });
  it('adds hotplate-delivered heat and virtual watts without using electrical input or setpoint as sample power', () => {
    const plate = sample({ id: 'plate', type: 'hot_plate', position: [0, -0.135, 0],
      volume_ml: 0, mass_g: 0, contents: [], temperature_c: 150,
      hotPlate: { isOn: true, setPoint_c: 200 } });
    const receiver = sample({ position: [0, plate.position[1] + PLATE_TOP_Y, 0], effectHeatInput_W: 25 });
    setup([plate, receiver]); useAppStore.getState().tickSimulation(0.1);
    const state = useAppStore.getState(), delivered = state.vessels.plate.hotPlate!.deliveredHeat_J!;
    expect(delivered).toBeGreaterThan(0);
    expect(state.vessels.a.thermalHeatingEnergy_J).toBeCloseTo(delivered + 2.5, 10);
    expect(state.vessels.a.thermalHeatingPower_W).toBeCloseTo(delivered / 0.1 + 25, 10);
  });
});

describe('Heat exchange follows the actual phase trajectory', () => {
  it('retains an actual boiling source through a steady film correction, but clears it after real film cooling', () => {
    const before = sample(); before.temperature_c = aqueousBoilingPoint(before);
    const wall = stepWallCondensation(before, 0.1, 0).wall;
    before.wallCondensation = { ...wall, inner_g: 0.01 };
    const heated = { ...before, ...stepVesselThermal(before, 0.1, 300, 25) };
    expect(heated.isBoiling).toBe(true);
    const steady = stepWetWallThermal(heated, 0.1, heated.wallThermalDryCredit_J).vessel;
    expect(steady.temperature_c).toBeCloseTo(before.temperature_c, 10);
    expect(steady.isBoiling).toBe(true); expect(steady.boilingIntensity).toBeGreaterThan(0);
    const coldFilm = { ...heated, wallCondensation: { ...heated.wallCondensation!, innerWall_c: 0 } };
    const cooled = stepWetWallThermal(coldFilm, 1, 0).vessel;
    expect(cooled.temperature_c).toBeLessThan(before.temperature_c - 1e-8);
    expect(cooled.isBoiling).toBe(false); expect(cooled.boilingIntensity).toBe(0);
  });
  it('matches the analytic heating-onset time followed by a finite boiling plateau', () => {
    const before = sample({ temperature_c: 90 }), power = 500, duration = 20, k = 0.35;
    const tb = aqueousBoilingPoint(before), c = sampleHeatCapacity(before);
    const onsetTime = -c / k * Math.log((power - k * (tb - 25)) / (power - k * (90 - 25)));
    expect(onsetTime).toBeGreaterThan(0); expect(onsetTime).toBeLessThan(duration);
    const expectedVapor = (power - k * (tb - 25)) * (duration - onsetTime) / waterLatentHeatJ_G(tb);
    const out = stepVesselThermal(before, duration, power, 25);
    expect(out.temperature_c).toBeCloseTo(tb, 10);
    expect(out.evaporatedStep_g).toBeCloseTo(expectedVapor, 7);
    expect(out.thermalHeatingEnergy_J).toBe(power * duration);
  });
  it('matches finite dryout time followed by cooling of the genuinely warming empty vessel', () => {
    const before = sample({ mass_g: 1, volume_ml: 1,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 1, moles: 1 / 18.015 }] });
    const tb = aqueousBoilingPoint(before); before.temperature_c = tb;
    before.environment = { ...DEFAULT_LAB_ENVIRONMENT, temperature_c: tb };
    const power = 100, duration = 40, k = 0.18;
    const dryoutTime = waterLatentHeatJ_G(tb) / power;
    const expectedT = tb + power / k * -Math.expm1(-k * (duration - dryoutTime) / 33.2);
    const out = stepVesselThermal(before, duration, power, tb);
    expect(out.mass_g).toBe(0); expect(out.evaporatedStep_g).toBe(1);
    expect(out.temperature_c).toBeCloseTo(expectedT, 6);
    const stored = 33.2 * out.temperature_c - (33.2 + WATER_CP_J_G_K) * tb;
    const ambientLoss = power * (duration - dryoutTime) - 33.2 * (expectedT - tb);
    expect(stored + out.thermalVaporEnthalpy_J! + ambientLoss).toBeCloseTo(power * duration, 4);
  });
  it('counts ambient warming during melting at 0 C without a fictitious sensible temperature rise', () => {
    const before = sample({ mass_g: 20, volume_ml: 10, temperature_c: 0, iceVolume_ml: 10 / ICE_DENSITY_G_ML,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 10, moles: 10 / 18.015 },
        { formula: 'H2O', phase: 's', mass_g: 10, moles: 10 / 18.015 }] });
    const out = stepVesselThermal(before, 5, 200, 25), net = (200 + 0.35 * 25) * 5;
    expect(out.temperature_c).toBe(0);
    expect(out.contents!.find(c => c.phase === 'l')!.mass_g).toBeCloseTo(10 + net / WATER_FUSION_J_G, 9);
    expect(out.latentEnergy_J).toBeCloseTo(net, 8); expect(out.thermalHeatingEnergy_J).toBe(1000);
    expect(out.evaporatedStep_g).toBe(0);
  });
  it('counts ambient cooling during freezing at 0 C with no heater source', () => {
    const before = sample({ temperature_c: 0 }), out = stepVesselThermal(before, 5, 0, -10);
    expect(out.temperature_c).toBe(0);
    expect(out.contents!.find(c => c.phase === 's')!.mass_g).toBeCloseTo(0.35 * 10 * 5 / WATER_FUSION_J_G, 10);
    expect(out.latentEnergy_J).toBeCloseTo(-17.5, 9); expect(out.thermalHeatingEnergy_J).toBe(0);
  });
  it('keeps a changing solution boiling path consistent across time subdivisions with heat loss', () => {
    const initial = sample({ mass_g: 10.2, volume_ml: 10, contents: [
      { formula: 'H2O', phase: 'l', mass_g: 10, moles: 10 / 18.015 },
      { formula: 'NaCl', phase: 'aq', mass_g: 0.2, moles: 0.2 / 58.44 }] });
    initial.temperature_c = aqueousBoilingPoint(initial);
    const run = (n: number) => {
      let current = initial;
      for (let i = 0; i < n; i++) current = { ...current, ...stepVesselThermal(current, 5 / n, 100, 25) };
      return current;
    };
    const one = run(1), fifty = run(50);
    expect(one.temperature_c).toBeGreaterThan(initial.temperature_c);
    expect(one.mass_g).toBeCloseTo(fifty.mass_g, 7);
    expect(one.temperature_c).toBeCloseTo(fifty.temperature_c, 8);
    expect(one.thermalVaporEnthalpy_J).toBeCloseTo(fifty.thermalVaporEnthalpy_J!, 5);
    expect(one.thermalHeatingEnergy_J).toBe(500);
  });
  it('holds material and records unresolved heat if the phase-path integrator cannot converge', () => {
    const integration = vi.spyOn(heatIntegration, 'integrateThermalHeat').mockReturnValue(undefined);
    const before = sample(); before.temperature_c = aqueousBoilingPoint(before);
    const snapshot = JSON.stringify(before), out = stepVesselThermal(before, 1, 100, 25);
    expect(out.temperature_c).toBe(before.temperature_c); expect(out.mass_g).toBe(before.mass_g);
    expect(out.evaporatedStep_g).toBe(0); expect(out.thermalHeatingEnergy_J).toBe(100);
    expect(out.thermalEnergyOutsideModel_J).toBeCloseTo(100 - 0.35 * (before.temperature_c - 25), 10);
    expect(out.thermalModelLimit).toContain('Chưa hội tụ'); expect(JSON.stringify(before)).toBe(snapshot);
    expect(heatIntegration.integrateThermalHeat).toHaveBeenCalled();
    integration.mockRestore();
    const recovered = stepVesselThermal({ ...before, ...out }, 1, 100, 25);
    expect(recovered.thermalModelLimit).toBeUndefined(); expect(recovered.isBoiling).toBe(true);
    expect(recovered.thermalHeatingEnergy_J).toBe(200);
    expect(recovered.thermalEnergyOutsideModel_J).toBe(out.thermalEnergyOutsideModel_J);
  });
});
