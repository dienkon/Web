import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReactionSimulationEngine } from '../src/vfx/reactions/ReactionSimulationEngine';
import { BoilingSystem, type BoilingSimulationParams } from '../src/simulation/effects/BoilingSystem';
import { ProgramPlayer } from '../src/vfx/programs/player/ProgramPlayer';
import { getProgramById } from '../src/vfx/programs/library';
import { useAppStore } from '../src/store/useAppStore';
import { runBasicPhysicalScenario } from '../src/vfx/dev/basicScenarios';
import { PRNG } from '../src/core/rng';
import { vfxBus } from '../src/vfx/bus';
import { METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';
import { waterSurfaceTension } from '../src/science/wallDropletGeometry';
import { SimClock, simulationFrameDt } from '../src/core/clock';
import { stepDampedOscillator, frameSmoothing } from '../src/science/dampedOscillator';
import type { PhysicalBubble } from '../src/simulation/core/SimulationTypes';
import type { VesselState } from '../src/types/chemistry';

const before = useAppStore.getState();
const water = (id = 'b'): VesselState => ({ id, name: id, type: 'beaker', capacity_ml: 100,
  position: [2, 0, 3], rotationY: 0, isLocked: false, volume_ml: 50, volume: 0.5, mass_g: 50,
  temperature_c: 0, ph: 7, substances: ['H2O'], hasGas: false, hasPrecipitate: false, isBoiling: false,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }] });
const params: BoilingSimulationParams = { vesselId: 'b', worldPosition: [2, 0, 3],
  radius: 0.5, liquidBottomY: 0, surfaceY: 0.4, temp_c: 100, boilingPoint_c: 100,
  heatPower_W: 300, viscosity_mPa_s: 1, boilingStage: 'ACTIVE_BOIL', boilingIntensity: 0.5,
  vaporRate_g_s: 0.03, pressure_atm: 1 };
afterEach(() => { vi.restoreAllMocks(); useAppStore.setState(before); });
function setup() {
  useAppStore.setState({ vessels: { a: water('a'), b: water() }, vesselIds: ['a', 'b'], burners: {},
    activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, inFlightPours: [], pouringChemical: null,
    isSimulationPaused: false, timeScale: 1 });
}

describe('Accepted simulation time is never silently discarded', () => {
  it('keeps slosh stable and independent of frame partition, including large scaled steps', () => {
    for (const zeta of [0, 0.38, 1, 2]) {
      const single = stepDampedOscillator(0.1, 0.2, 8, 8.5, zeta, 2);
      for (const hz of [10, 30, 60, 120]) {
        let state = { x: 0.1, velocity: 0.2 };
        for (let i = 0; i < hz; i++) state = stepDampedOscillator(state.x, state.velocity, 8 / hz, 8.5, zeta, 2);
        expect(state.x).toBeCloseTo(single.x, 10); expect(state.velocity).toBeCloseTo(single.velocity, 10);
        expect(Math.abs(state.x)).toBeLessThan(0.5);
      }
      const unforced = stepDampedOscillator(0.1, 0.2, 8, 8.5, zeta);
      expect(unforced.velocity ** 2 + 8.5 ** 2 * unforced.x ** 2).toBeLessThanOrEqual(0.2 ** 2 + 8.5 ** 2 * 0.1 ** 2 + 1e-12);
    }
    for (const alpha of [0.08, 0.1, 0.2, 0.25]) {
      expect(frameSmoothing(alpha, 0)).toBe(0);
      expect(frameSmoothing(alpha, 1 / 60)).toBeCloseTo(alpha, 12);
      const half = frameSmoothing(alpha, 1 / 120);
      expect(1 - (1 - half) ** 2).toBeCloseTo(alpha, 12);
      expect(frameSmoothing(alpha, 0.8)).toBeLessThanOrEqual(1);
    }
  });
  it('shares one frame acceptance rule between store and primary renderers, even at 10 FPS', () => {
    for (const hz of [10, 30, 60, 120]) for (const timeScale of [1, 4, 8]) {
      const clock = new SimClock(timeScale);
      let accepted = 0;
      for (let i = 0; i < hz * 2; i++) {
        accepted += simulationFrameDt(1 / hz, { timeScale, isSimulationPaused: false });
        clock.tick(1 / hz, () => {});
      }
      expect(clock.totalSimTime).toBeCloseTo(2 * timeScale, 9);
      expect(clock.totalSimTime + clock.accumulator).toBeCloseTo(accepted, 9);
    }
    expect(simulationFrameDt(10, { timeScale: 8, isSimulationPaused: false })).toBe(0.8);
    expect(simulationFrameDt(0.1, { timeScale: 8, isSimulationPaused: true })).toBe(0);
    expect(simulationFrameDt(NaN, { timeScale: 1, isSimulationPaused: false })).toBe(0);
  });
  it('integrates identical reaction time at 30/60/120 FPS and 1x/4x/8x', () => {
    setup();
    for (const hz of [30, 60, 120]) for (const scale of [1, 4, 8]) {
      const engine = new ReactionSimulationEngine();
      const runtime = engine.startReaction('b', 'agno3_nacl_precipitate', { duration: 100 })!;
      expect(runtime.temperature).toBe(0);
      for (let i = 0; i < hz * 2; i++) engine.update(1 / hz, scale);
      expect(runtime.elapsed, `${hz} Hz at ${scale}x`).toBeCloseTo(2 * scale, 9);
      const clock = engine.getClockState();
      expect(clock.integratedTime_s + clock.pendingTime_s).toBeCloseTo(clock.acceptedTime_s, 9);
      expect(clock.pendingTime_s).toBeLessThan(engine.fixedDt);
    }
  });
  it('retains exceptional backlog, freezes on zero time, and prevents a new run borrowing old time', () => {
    setup(); const engine = new ReactionSimulationEngine();
    const old = engine.startReaction('a', 'agno3_nacl_precipitate', { duration: 100 })!;
    engine.update(10);
    expect(old.elapsed).toBeCloseTo(4, 10);
    expect(engine.getClockState().pendingTime_s).toBeCloseTo(6, 10);
    const frozen = engine.getClockState();
    for (const dt of [0, -1, Infinity, NaN]) engine.update(dt);
    engine.update(1, 0); expect(engine.getClockState()).toEqual(frozen);
    const fresh = engine.startReaction('b', 'agno3_nacl_precipitate', { duration: 100 })!;
    engine.update(0.001); engine.update(0.001);
    expect(old.elapsed).toBeCloseTo(10, 9); expect(fresh.elapsed).toBe(0);
    engine.update(1 / 60);
    expect(fresh.elapsed).toBeCloseTo(1 / 60, 10);
    const clock = engine.getClockState();
    expect(clock.integratedTime_s + clock.pendingTime_s).toBeCloseTo(clock.acceptedTime_s, 9);
  });
  it('does not autonomously complete a chemistry-bound controller early', () => {
    setup(); const engine = new ReactionSimulationEngine();
    const runtime = engine.startReaction('b', 'agno3_nacl_precipitate', { duration: 1, chemistryProgress: 0.2 })!;
    engine.update(2);
    expect(engine.getRuntime('b')).toBe(runtime);
    expect(runtime.progress).toBe(0.2); expect(runtime.elapsed).toBe(0.2);
    expect(runtime.temperature).toBe(0);
    runtime.chemistryProgress = 1; engine.update(1 / 60);
    expect(engine.getRuntime('b')).toBeUndefined();
  });
  it('rejects invalid speed inputs and does not let corrupt state advance physics', () => {
    setup();
    const store = useAppStore.getState();
    for (const scale of [0, -1, NaN, Infinity, 100]) {
      store.setTimeScale(scale); expect(useAppStore.getState().timeScale).toBe(1);
    }
    store.setTimeScale(8); expect(useAppStore.getState().timeScale).toBe(8);
    for (const timeScale of [0, -1, NaN, Infinity]) {
      useAppStore.setState({ timeScale });
      const frozen = useAppStore.getState(); frozen.tickSimulation(0.1);
      expect(useAppStore.getState()).toBe(frozen);
    }
  });
});

describe('Seeded bubble physics and vessel isolation', () => {
  it('has identical particles, events and positions across display frame rates', () => {
    const run = (hz: number) => {
      const system = new BoilingSystem(60, new PRNG(19));
      const events: unknown[] = [], off = vfxBus.on('surface:ripple', e => events.push(e));
      for (let i = 0; i < hz * 4; i++) system.update(1 / hz, params);
      off(); return { bubbles: system.bubbles, events };
    };
    const slow = run(30), medium = run(60), fast = run(120);
    expect(slow.events.length).toBeGreaterThan(0);
    expect(slow).toEqual(medium); expect(medium).toEqual(fast);
  });
  it('scopes surface impulses and translates bursts into the vessel world position', () => {
    const emit = vi.spyOn(vfxBus, 'emit'), system = new BoilingSystem(60, new PRNG(23));
    for (let i = 0; i < 240; i++) system.update(1 / 60, params);
    const ripples = emit.mock.calls.filter(([type]) => type === 'surface:ripple');
    const bursts = emit.mock.calls.filter(([type]) => type === 'particle:burst');
    expect(ripples.length).toBeGreaterThan(0); expect(bursts.length).toBeGreaterThan(0);
    for (const [, event] of ripples) expect(event).toHaveProperty('vesselId', 'b');
    for (const [, event] of bursts) {
      expect(event).toHaveProperty('vesselId', 'b');
      const position = (event as { position: number[] }).position;
      expect(position[0]).toBeGreaterThan(1); expect(position[2]).toBeGreaterThan(2);
      expect(position[1]).toBeCloseTo(params.surfaceY + 0.006, 9);
    }
    emit.mockClear();
    const anonymous = new BoilingSystem(60, new PRNG(23));
    for (let i = 0; i < 240; i++) anonymous.update(1 / 60, { ...params, vesselId: undefined });
    expect(emit).not.toHaveBeenCalled();
  });
  it('requires real boiling vapor while preserving separate reaction bubbles below boiling', () => {
    const system = new BoilingSystem(30, new PRNG(12));
    for (let i = 0; i < 120; i++) system.update(1 / 60, { ...params, vaporRate_g_s: 1e-9 });
    expect(system.bubbles).toHaveLength(0);
    const warm = { ...params, temp_c: 90, boilingStage: 'MICROBUBBLE_NUCLEATION' as const,
      vaporRate_g_s: 0.001, boilingIntensity: 0 };
    for (let i = 0; i < 120; i++) system.update(1 / 60, warm);
    expect(system.bubbles).toHaveLength(0);
    for (let i = 0; i < 120; i++) system.update(1 / 60, { ...warm, reactionGasRate: 20 });
    expect(system.bubbles.length).toBeGreaterThan(0);
    expect(system.bubbles.every(b => b.source === 'reaction')).toBe(true);
  });
  it('expands with hydrostatic pressure and merges without losing the P*r³ gas proxy', () => {
    const bubble = (x: number): PhysicalBubble => ({ id: x === 0 ? 1 : 2, x, y: 0.1, z: 0,
      radius: 0.03, baseRadius: 0.03, vx: 0, vy: 0.1, vz: 0, buoyancy: 1, growthRate: 1,
      wobblePhase: 0, wobbleSpeed: 1, wobbleAmp: 0, aspectRatio: 1, life: 0, maxLife: 5,
      opacity: 1, temperature: 100, isPopping: false, popProgress: 0, merged: false,
      // Boyle/coalescence conservation requires gas without phase transfer;
      // vapor can now condense under the local hydrostatic/Laplace pressure.
      source: 'reaction', nucleationPressure_Pa: 101325 + 1000 * 9.80665 * 0.3 * METERS_PER_SCENE_UNIT,
      gasPV_scene3_Pa: (101325 + 1000 * 9.80665 * 0.3 * METERS_PER_SCENE_UNIT) * 0.03 ** 3 });
    const system = new BoilingSystem(10, new PRNG(9));
    system.bubbles = [bubble(0), bubble(0.001)];
    const initialPV = system.bubbles.reduce((sum, b) => sum + b.gasPV_scene3_Pa!, 0);
    system.update(1 / 120, { ...params, vaporRate_g_s: 0 });
    expect(system.bubbles).toHaveLength(1);
    const b = system.bubbles[0];
    expect(b.gasPV_scene3_Pa).toBeCloseTo(initialPV, 12);
    const localPressure = 101325 + 1000 * 9.80665 * (params.surfaceY - b.y) * METERS_PER_SCENE_UNIT;
    const radius_m = b.radius * METERS_PER_SCENE_UNIT;
    expect((localPressure + 2 * waterSurfaceTension(params.temp_c) / radius_m) * b.radius ** 3)
      .toBeCloseTo(initialPV, 10);
    expect(b.baseRadius).toBeGreaterThan(0.034);
  });
});

describe('Developer panels exercise the same real inputs', () => {
  it('heats the existing target without forcing boiling, temperature or inventory', () => {
    setup(); const original = useAppStore.getState().vessels.b, a = useAppStore.getState().vessels.a;
    for (const scenario of [2, 3, 7, 8, 5]) expect(runBasicPhysicalScenario('b', scenario).ok).toBe(true);
    const state = useAppStore.getState();
    expect(state.vessels.b.temperature_c).toBe(original.temperature_c);
    expect(state.vessels.b.isBoiling).toBe(false); expect(state.vessels.b.contents).toEqual(original.contents);
    expect(state.vessels.a).toBe(a); expect(Object.keys(state.vessels)).toEqual(['a', 'b']);
  });
  it('prepares explicit finite samples, never fabricates precipitate flags or fallback vessels', () => {
    setup();
    expect(runBasicPhysicalScenario('deleted', 1).ok).toBe(false);
    expect(runBasicPhysicalScenario('b', 99).ok).toBe(false);
    expect(runBasicPhysicalScenario('b', 1).ok).toBe(true);
    let b = useAppStore.getState().vessels.b;
    expect(b.mass_g).toBe(b.contents.reduce((s, c) => s + c.mass_g, 0));
    expect(runBasicPhysicalScenario('b', 4).ok).toBe(true);
    b = useAppStore.getState().vessels.b;
    expect(b.precipitateAmount_g).toBe(0);
    expect(useAppStore.getState().activeKinetics.b).toBeDefined();
    expect(runBasicPhysicalScenario('b', 6).ok).toBe(true);
    expect(useAppStore.getState().activeKinetics.b).toBeUndefined();
    expect(useAppStore.getState().vessels.b.temperature_c).toBe(5);
    expect(Object.keys(useAppStore.getState().vessels)).toEqual(['a', 'b']);
  });
  it('restarts the same program for a new chemical run and disposes its old atoms', () => {
    const player = new ProgramPlayer(), program = getProgramById('cacl2_na2co3')!;
    const first = player.ensureProgram('b', program, 'run1'); player.update(1);
    const old = [...first.activeAtoms.values()].map(a => a.handle);
    expect(old.length).toBeGreaterThan(0);
    expect(player.ensureProgram('b', program, 'run1')).toBe(first);
    const second = player.ensureProgram('b', program, 'run2');
    expect(second).not.toBe(first); expect(second.elapsed_s).toBe(0);
    expect(old.every(h => !h.alive)).toBe(true);
    expect(player.getAllSessions()).toHaveLength(1); player.dispose();
  });
});
