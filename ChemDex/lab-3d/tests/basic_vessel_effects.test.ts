import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { effects } from '../src/vfx/vesselEffects';
import { stepVesselThermal, applyThermalEnergy } from '../src/engine/thermalState';
import { stepWallCondensation } from '../src/engine/wallCondensation';
import { DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { waterDewPointC, waterSaturationPressurePa, waterMassFluxG_M2_S, waterPlumeVisibility } from '../src/science/waterSurface';
import { reactionSimulationEngine } from '../src/vfx/reactions/ReactionSimulationEngine';
import { SimulationEngine } from '../src/simulation/core/SimulationEngine';
import { vfxBus } from '../src/vfx/bus';
import type { VesselState } from '../src/types/chemistry';
import { CondensationEngine, dropletMassG, mergeWallDroplets } from '../src/sim/condensation';

const before = useAppStore.getState();
const water = (id = 'b', patch: Partial<VesselState> = {}): VesselState => ({ id, name: id,
  type: 'beaker', capacity_ml: 100, position: [0, 0, 0], rotationY: 0, isLocked: false,
  volume_ml: 50, volume: 0.5, mass_g: 50, contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }],
  substances: ['H2O'], temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false,
  environment: DEFAULT_LAB_ENVIRONMENT, ...patch });
afterEach(() => { vi.restoreAllMocks(); useAppStore.setState(before); reactionSimulationEngine.resetAll(); SimulationEngine.clearAll(); });
function setup() {
  const a = water('a'), b = water();
  useAppStore.setState({ vessels: { a, b }, vesselIds: ['a', 'b'], selectedVesselId: 'b', burners: {},
    activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1, spills: {} });
  return { a, b };
}

describe('Commands remain bound to exactly one existing vessel', () => {
  it('layers heat, humidity and ripples on B without changing A or creating vessels', () => {
    const { a } = setup(), emit = vi.spyOn(vfxBus, 'emit'), eff = effects.forVessel('b');
    for (let i = 0; i < 5; i++) {
      expect(eff.setHeatInput(200).ok).toBe(true);
      expect(eff.setEnvironment({ relativeHumidity: 0.9 }).ok).toBe(true);
      expect(eff.ripple(0.5).ok).toBe(true);
    }
    expect(Object.keys(useAppStore.getState().vessels)).toEqual(['a', 'b']);
    expect(useAppStore.getState().vessels.a).toBe(a);
    expect(emit.mock.calls.every(([, e]) => 'vesselId' in e && e.vesselId === 'b')).toBe(true);
  });
  it('re-resolves deleted IDs and validates an entire command before mutation', () => {
    setup(); const eff = effects.forVessel('b'), state = useAppStore.getState();
    expect(eff.setEnvironment({ relativeHumidity: 0.8, airSpeed_m_s: NaN }).code).toBe('invalid_parameter');
    expect(eff.setHeatInput(Infinity).code).toBe('invalid_parameter');
    expect(eff.ripple(-1).code).toBe('invalid_parameter');
    expect(useAppStore.getState()).toBe(state);
    useAppStore.setState({ vessels: { a: state.vessels.a } });
    expect(eff.setHeatInput(200).code).toBe('missing_vessel');
    expect(eff.inspect().state).toBeNull();
    expect(Object.keys(useAppStore.getState().vessels)).toEqual(['a']);
  });
  it('rejects locked, sealed, shattered and lesson targets', () => {
    setup();
    for (const [patch, code] of [[{ isLocked: true }, 'locked'], [{ isSealed: true }, 'sealed'],
      [{ isShattered: true }, 'shattered']] as const) {
      useAppStore.setState({ vessels: { b: water('b', patch) } });
      expect(effects.forVessel('b').setHeatInput(100).code).toBe(code);
    }
    useAppStore.setState({ vessels: { lesson_vessel_b: water('lesson_vessel_b') } });
    expect(effects.forVessel('lesson_vessel_b').ripple().code).toBe('unsupported');
  });
  it('obsolete handles cannot shut off a newer heat source or a replacement sample', () => {
    setup(); const eff = effects.forVessel('b');
    const first = eff.setHeatInput(100), second = eff.setHeatInput(200);
    expect(eff.stop(first.handle!).code).toBe('stale_handle');
    expect(eff.inspect().state!.heatInput_W).toBe(200);
    expect(eff.stop(second.handle!).ok).toBe(true);
    expect(eff.inspect().state!.heatInput_W).toBe(0);
    const third = eff.setHeatInput(300);
    useAppStore.getState().prepareStudioWaterSample('b', 5);
    expect(eff.stop(third.handle!).code).toBe('stale_handle');
  });
  it('replaces specimens in place and clears the previous controllers and particles', () => {
    const { a, b } = setup();
    const manager = SimulationEngine.getManager('b');
    manager.evaporationSystem.update(1, { temp_c: 100, radius: 0.3, mouthRadius: 0.3, surfaceY: 0,
      mouthY: 1, surfaceArea_cm2: 10, isBoiling: true, actualRate_ml_s: 0.1 });
    const stop = vi.spyOn(reactionSimulationEngine, 'stopReaction');
    for (const program of ['agno3_nacl', 'cuso4_naoh', 'pbno32_ki']) {
      expect(useAppStore.getState().prepareStudioProgram(program, undefined, 'b')).toBe('b');
      const next = useAppStore.getState();
      expect(Object.keys(next.vessels)).toEqual(['a', 'b']);
      expect(next.vessels.a).toBe(a);
      expect(next.vessels.b.position).toEqual(b.position);
      expect(next.vessels.b.capacity_ml).toBe(b.capacity_ml);
      expect(next.activeKinetics.b).toBeUndefined();
      expect(manager.evaporationSystem.particles).toHaveLength(0);
      next.runStudioProgram('b');
    }
    expect(stop).toHaveBeenCalledTimes(3);
    expect(useAppStore.getState().prepareStudioProgram('agno3_nacl', undefined, 'deleted')).toBeNull();
    expect(Object.keys(useAppStore.getState().vessels)).toEqual(['a', 'b']);
  });
  it('supplies overflow from a finite source exactly once', () => {
    setup();
    useAppStore.setState({ vessels: { a: water('a'), b: water('b', { capacity_ml: 55 }) } });
    const receipt = effects.forVessel('b').doseLiquid('a', 20);
    expect(receipt.ok).toBe(true); expect(receipt.spilled_ml).toBeCloseTo(15, 8);
    const state = useAppStore.getState();
    const spillMass = Object.values(state.spills).reduce((s, c) => s + c.mass_g, 0)
      + state.inFlightPours.reduce((sum, p) => sum + p.sample.mass_g, 0);
    expect(state.vessels.a.mass_g + state.vessels.b.mass_g + spillMass).toBeCloseTo(100, 9);
    expect(Object.keys(state.vessels)).toEqual(['a', 'b']);
  });
});

describe('Water surface thermodynamics and wall budgets', () => {
  it('merges drops by volume and keeps the discrete solver within its finite supply', () => {
    const a = { u: 0.99, y: 0.03, radius: 0.001, isSliding: false, slideVelocity: 0 };
    const b = { ...a, u: 0.01, radius: 0.002 };
    const merged = mergeWallDroplets(a, b);
    expect(dropletMassG(merged.radius)).toBeCloseTo(dropletMassG(a.radius) + dropletMassG(b.radius), 12);
    expect(merged.u < 0.02 || merged.u > 0.98).toBe(true);
    const empty = new CondensationEngine(() => 0.5);
    for (let i = 0; i < 100; i++) empty.update(0.1, 280, 290, 0, 0.1);
    expect(empty.retainedMass_g).toBe(0); expect(empty.droplets).toHaveLength(0);
    const run = (hz: number) => {
      const engine = new CondensationEngine(() => 0.5);
      for (let i = 0; i < hz * 5; i++) engine.update(1 / hz, 280, 290, 0, 0.1, 0.01 / hz);
      expect(engine.retainedMass_g + engine.drippedMass_g + engine.evaporatedMass_g).toBeCloseTo(0.05, 10);
      return engine;
    };
    const fast = run(120), slow = run(30);
    expect(slow.retainedMass_g).toBeCloseTo(fast.retainedMass_g, 8);
  });
  it('matches vapor pressure and dew point reference conditions', () => {
    expect(waterSaturationPressurePa(25)).toBeCloseTo(3167, -1);
    expect(waterDewPointC(25, 0.5)).toBeCloseTo(13.9, 0);
    expect(waterDewPointC(25, 1)).toBeCloseTo(25, 8);
    expect(waterDewPointC(25, 0)).toBe(-Infinity);
    expect(waterPlumeVisibility(25, 25, 0.5)).toBe(0);
    expect(waterPlumeVisibility(95, 15, 0.8)).toBeGreaterThan(0);
  });
  it('humidity reduces evaporation; air motion and area increase it', () => {
    const dry = waterMassFluxG_M2_S(25, 25, 0.2, 0.1);
    expect(waterMassFluxG_M2_S(25, 25, 0.9, 0.1)).toBeLessThan(dry);
    expect(waterMassFluxG_M2_S(25, 25, 0.2, 1)).toBeGreaterThan(dry);
    const sample = water(), step = stepVesselThermal(sample, 1);
    expect(step.evaporatedStep_g).toBeGreaterThan(0);
    expect(step.temperature_c).toBeLessThan(25);
    expect(step.mass_g + step.evaporatedStep_g).toBeCloseTo(50, 12);
    const direct = applyThermalEnergy(sample, 0, 1, step.evaporatedStep_g);
    expect(direct.storedSensibleEnergyChange_J + direct.vaporSensibleEnergy_J + direct.latentEnergy_J).toBeCloseTo(0, 8);
    const narrow = stepVesselThermal(water('narrow', { type: 'flask' }), 1);
    expect(narrow.evaporatedStep_g).toBeLessThan(step.evaporatedStep_g);
  });
  it('excludes sealed and mixed volatile liquids from ambient water evaporation', () => {
    expect(stepVesselThermal(water('b', { isSealed: true }), 1).evaporatedStep_g).toBe(0);
    const mixed = water('b', { contents: [...water().contents, { formula: 'C2H5OH', phase: 'l', mass_g: 10, moles: 10 / 46 }] });
    expect(stepVesselThermal(mixed, 1).evaporatedStep_g).toBe(0);
  });
  it('uses the dew point for cold outer walls and finite vapor for inner walls', () => {
    const warm = stepWallCondensation(water(), 1, 0);
    expect(warm.wall.outer_g).toBe(0); expect(warm.wall.inner_g).toBe(0);
    const cold = stepWallCondensation(water('b', { temperature_c: 5 }), 1, 0);
    expect(cold.wall.outer_g).toBeGreaterThan(0);
    expect(cold.wall.ambientCollected_g).toBeCloseTo(cold.wall.outer_g, 12);
    const hot = stepWallCondensation(water('b', { temperature_c: 95 }), 1, 0.001);
    expect(hot.wall.inner_g).toBeGreaterThan(0);
    expect(hot.wall.inner_g + hot.availableVapor_g + hot.returnedStep_g).toBeCloseTo(0.001, 12);
    expect(stepWallCondensation(water('b', { temperature_c: 95 }), 1, 0).wall.inner_g).toBe(0);
  });
  it('conserves collected room moisture across film, evaporation and drainage', () => {
    let sample = water('b', { temperature_c: 5 });
    // A finite, already-condensed inventory can form mobile drops. A fresh
    // microscopic film must not be forced to drain after an arbitrary timeout.
    sample.wallCondensation = { ...stepWallCondensation(sample, 0, 0).wall,
      outer_g: 0.5, ambientCollected_g: 0.5 };
    for (let i = 0; i < 1200; i++) sample = { ...sample, wallCondensation: stepWallCondensation(sample, 0.5, 0).wall };
    const c = sample.wallCondensation!;
    expect(c.drainedOutside_g).toBeGreaterThan(0);
    expect(c.outer_g + c.drainedOutside_g + c.ambientReleased_g).toBeCloseTo(c.ambientCollected_g, 10);
  }, 60000); // Ten minutes at 1/120 s, including coalescence: measured ~24 s isolated on this host. Conservation assertions remain unchanged.
  it('shares one store vapor budget between the wall, condenser and plume', () => {
    setup();
    useAppStore.setState({ vessels: {
      b: water('b', { temperature_c: 100, effectHeatInput_W: 300 }),
      a: water('a', { type: 'condenser', volume_ml: 0, mass_g: 0, contents: [],
        vaporSourceId: 'b', coolingWaterActive: true }),
    } });
    let escaped = 0;
    for (let i = 0; i < 120; i++) {
      useAppStore.getState().tickSimulation(1 / 60);
      const vessels = Object.values(useAppStore.getState().vessels);
      escaped += vessels.reduce((s, v) => s + (v.waterVaporOutflow_g_s ?? 0) / 60, 0);
      const retained = vessels.reduce((s, v) => s + v.mass_g + (v.wallCondensation?.inner_g ?? 0), 0);
      expect(retained + escaped).toBeCloseTo(50, 8);
    }
    expect(useAppStore.getState().vessels.a.mass_g).toBeGreaterThan(0);
    expect(useAppStore.getState().vessels.b.wallCondensation!.inner_g).toBeGreaterThan(0);
  });
  it('agrees at 30, 60 and 120 Hz and freezes when paused', () => {
    const results = [30, 60, 120].map(hz => {
      let sample = water();
      for (let i = 0; i < hz * 10; i++) sample = { ...sample, ...stepVesselThermal(sample, 1 / hz) };
      return sample;
    });
    expect(Math.abs(results[0].temperature_c - results[2].temperature_c)).toBeLessThan(0.0001);
    expect(Math.abs(results[0].mass_g - results[2].mass_g)).toBeLessThan(0.00001);
    setup(); useAppStore.setState({ isSimulationPaused: true });
    const state = useAppStore.getState(); state.tickSimulation(1);
    expect(useAppStore.getState()).toBe(state);
  });
});
