import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceSplatterFlight, advanceSplatterBounce } from '../src/science/splatterFlight';
import { METERS_PER_SCENE_UNIT, SCENE_GRAVITY } from '../src/science/sceneUnits';
import { LAB_PHYSICS } from '../src/engine/interactionEngine';
import { useAppStore } from '../src/store/useAppStore';
import { labSound } from '../src/utils/audio';
import { vfxBus } from '../src/vfx/bus';
import type { VesselState } from '../src/types/chemistry';

const harness = vi.hoisted(() => ({ memos: [] as unknown[], cleanup: [] as (() => void)[],
  frame: null as null | ((state: unknown, delta: number) => void), tier: 'low' }));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return { ...actual, default: { ...actual, memo: (fn: unknown) => fn },
    useRef: (value: unknown) => ({ current: value }),
    useMemo: (factory: () => unknown) => { const value = factory(); harness.memos.push(value); return value; },
    useEffect: (effect: () => void | (() => void)) => { const cleanup = effect(); if (cleanup) harness.cleanup.push(cleanup); } };
});
vi.mock('@react-three/fiber', () => ({ useFrame: (callback: (state: unknown, delta: number) => void) => { harness.frame = callback; } }));
vi.mock('../src/vfx/quality', () => ({ useQualityStore: (selector: (s: { effectiveTier: string }) => unknown) => selector({ effectiveTier: harness.tier }),
  QUALITY_CONFIGS: { low: { particleMultiplier: 0.5 }, ultra: { particleMultiplier: 1.5 } } }));
import { AcidSplatter } from '../src/vfx/particles/AcidSplatter';

interface Particle { active: boolean; x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; history: unknown[] }
const before = useAppStore.getState();
function mount(tier = 'low') {
  harness.tier = tier; harness.memos = [];
  (AcidSplatter as unknown as () => unknown)();
  return harness.memos.find(value => Array.isArray(value) && value[0] && 'history' in value[0]) as Particle[];
}
function frame(dt: number) { harness.frame!({}, dt); }
function unmount() { harness.cleanup.splice(0).forEach(fn => fn()); harness.frame = null; }
beforeEach(() => {
  useAppStore.setState({ vessels: {}, spills: {}, isSimulationPaused: false, timeScale: 1, wasteMass_g: 0, wasteContents: [] });
  vi.spyOn(labSound, 'playDroplet').mockImplementation(() => {});
  vi.spyOn(labSound, 'playGlassShatter').mockImplementation(() => {});
  vi.spyOn(labSound, 'playSodiumSizzlePop').mockImplementation(() => {});
});
afterEach(() => { unmount(); useAppStore.setState(before, true); vi.restoreAllMocks(); });

describe('Splatter ballistic transport', () => {
  it('falls the correct SI distance and preserves ballistic energy', () => {
    const point = { x: 0, y: 10, z: 0, vx: 2, vy: 0, vz: 1 };
    const result = advanceSplatterFlight(point, 0.1, -100);
    expect((point.y - result.y) * METERS_PER_SCENE_UNIT).toBeCloseTo(0.5 * 9.8 * 0.1 ** 2, 12);
    expect(result.x).toBeCloseTo(0.2, 12);
    const energy = (p: typeof point) => (p.vx ** 2 + p.vy ** 2 + p.vz ** 2) / 2 + SCENE_GRAVITY * p.y;
    expect(energy(result)).toBeCloseTo(energy(point), 9);
  });
  it('clips exactly at the landing time rather than overshooting the surface in x/y', () => {
    const point = { x: 1, y: 1, z: 2, vx: 3, vy: 0, vz: -2 }, plane = 0;
    const result = advanceSplatterFlight(point, 1, plane), time = Math.sqrt(2 / SCENE_GRAVITY);
    expect(result.hit).toBe(true); expect(result.y).toBe(plane);
    expect(result.elapsed_s).toBeCloseTo(time, 12); expect(result.x).toBeCloseTo(1 + 3 * time, 12);
    expect(result.z).toBeCloseTo(2 - 2 * time, 12);
  });
  it('matches across 30/60/120 Hz until impact, including a launch from the plane', () => {
    const run = (fps: number) => {
      let p = { x: 0, y: 0, z: 0, vx: 3, vy: 10, vz: 1 };
      for (let i = 0; i < fps; i++) { const result = advanceSplatterFlight(p, 1 / fps, 0); p = result; if (result.hit) break; }
      return p;
    };
    for (const fps of [60, 120]) for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz'] as const) expect(run(fps)[key]).toBeCloseTo(run(30)[key], 9);
  });
  it('dissipates bounce energy, prevents penetration and leaves resting points at rest', () => {
    const p = { x: 0, y: 1, z: 0, vx: 2, vy: -1, vz: 3 };
    const result = advanceSplatterBounce(p, 0.5, 0);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.vx ** 2 + result.vy ** 2 + result.vz ** 2 + 2 * SCENE_GRAVITY * result.y)
      .toBeLessThan(p.vx ** 2 + p.vy ** 2 + p.vz ** 2 + 2 * SCENE_GRAVITY * p.y);
    expect(advanceSplatterBounce({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }, 1, 0)).toEqual({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
  });
  it('rejects invalid time/coefficients without changing the point', () => {
    const p = { x: 0, y: 1, z: 0, vx: 1, vy: 2, vz: 0 };
    for (const dt of [0, -1, NaN, Infinity]) {
      expect(advanceSplatterFlight(p, dt, 0)).toMatchObject(p);
      expect(advanceSplatterBounce(p, dt, 0)).toEqual(p);
    }
    expect(advanceSplatterBounce(p, 1, 0, 1.1)).toEqual(p);
  });
});

describe('Real splatter renderer cannot create matter', () => {
  it.each(['low', 'ultra'])('keeps the same inventory after all %s-quality glyphs land', tier => {
    const add = vi.spyOn(useAppStore.getState(), 'addSpill');
    const particles = mount(tier), initial = structuredClone(useAppStore.getState().spills);
    vfxBus.emit('acid:splatter', { vesselId: 'v', position: [0, 0, 0], count: 60, isAcid: true, substances: ['HCl'] });
    expect(particles.some(p => p.active)).toBe(true);
    for (let i = 0; i < 120; i++) frame(1 / 60);
    expect(particles.every(p => !p.active)).toBe(true);
    expect(add).not.toHaveBeenCalled(); expect(useAppStore.getState().spills).toEqual(initial);
    expect(labSound.playSodiumSizzlePop).not.toHaveBeenCalled();
    expect(labSound.playDroplet).toHaveBeenCalled();
  });
  it('freezes particles while paused and uses the application time scale', () => {
    const particles = mount();
    vfxBus.emit('acid:splatter', { position: [0, 4, 0], count: 2, speed: 0 });
    const first = particles.find(p => p.active)!, initial = structuredClone(first);
    useAppStore.setState({ isSimulationPaused: true }); frame(0.1); expect(first).toEqual(initial);
    useAppStore.setState({ isSimulationPaused: false, timeScale: 2 }); frame(0.01);
    expect(first.vy).toBeCloseTo(-SCENE_GRAVITY * 0.02, 12);
    expect(first.y).toBeCloseTo(4 - 0.5 * SCENE_GRAVITY * 0.02 ** 2, 12);
  });
  it('uses one explicit liquid channel and respects zero-count/invalid events', () => {
    const particles = mount();
    vfxBus.emit('explosion', { vesselId: 'v', position: [0, 0, 0], intensity: 1 });
    expect(particles.some(p => p.active)).toBe(false);
    for (const count of [0, -1, NaN, Infinity]) vfxBus.emit('acid:splatter', { position: [0, 0, 0], count });
    expect(particles.some(p => p.active)).toBe(false);
    vfxBus.emit('acid:splatter', { position: [0, 0, 0], count: 2 });
    expect(particles.filter(p => p.active)).toHaveLength(1);
  });
  it('preserves the source shatter receipt after visual impacts and does not invent wet splash for a dry sample', () => {
    const particles = mount();
    const make = (id: string, wet: boolean) => ({ id, name: id, type: 'beaker', position: [0, 0, 0],
      volume_ml: wet ? 5 : 0, capacity_ml: 100, mass_g: wet ? 5 : 2, substances: wet ? ['H2O'] : ['Cu'],
      contents: [{ formula: wet ? 'H2O' : 'Cu', phase: wet ? 'l' : 's', mass_g: wet ? 5 : 2, moles: wet ? 5 / 18.015 : 2 / 63.546 }] }) as VesselState;
    useAppStore.setState({ vessels: { dry: make('dry', false), wet: make('wet', true) }, vesselIds: ['dry', 'wet'] });
    useAppStore.getState().shatterVessel('dry', 'explosion');
    expect(particles.some(p => p.active)).toBe(false);
    useAppStore.getState().shatterVessel('wet', 'explosion');
    const committed = structuredClone(useAppStore.getState().spills);
    expect(particles.some(p => p.active)).toBe(true);
    for (let i = 0; i < 120; i++) frame(1 / 60);
    expect(useAppStore.getState().spills).toEqual(committed);
    expect(Object.values(committed).reduce((sum, s) => sum + s.mass_g, 0)).toBe(7);
  });
  it('has repeatable seeded launch positions and hits the authoritative tabletop plane', () => {
    const run = () => {
      const particles = mount();
      vfxBus.emit('acid:splatter', { position: [0, 0, 0], count: 4, speed: 0 });
      const launch = structuredClone(particles.filter(p => p.active));
      for (let i = 0; i < 60; i++) frame(1 / 60);
      for (const p of particles.filter(p => p.history.length)) expect(p.y).toBe(LAB_PHYSICS.TABLE_SURFACE_Y);
      unmount(); return launch;
    };
    expect(run()).toEqual(run());
  });
  it('keeps live renderer trajectories equal at 30/60/120 Hz before impact', () => {
    const run = (fps: number) => {
      const particles = mount();
      vfxBus.emit('acid:splatter', { position: [0, 4, 0], count: 4 });
      for (let i = 0; i < fps / 10; i++) frame(1 / fps);
      const result = particles.filter(p => p.active).map(p => ({ x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, vz: p.vz, life: p.life }));
      unmount(); return result;
    };
    const at30 = run(30);
    expect(at30).toHaveLength(2);
    for (const fps of [60, 120]) run(fps).forEach((p, i) => {
      for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'life'] as const) expect(p[key]).toBeCloseTo(at30[i][key], 10);
    });
  });
  it('advances a newly born bounce for only the remaining time after its parent impact', () => {
    mount();
    vfxBus.emit('acid:splatter', { position: [0, LAB_PHYSICS.TABLE_SURFACE_Y + 0.01, 0], count: 2, speed: 0 });
    frame(0.1);
    const bouncePool = harness.memos.find(value => Array.isArray(value) && value[0] && 'delay_s' in value[0]) as { active: boolean; life: number }[];
    const active = bouncePool.filter(p => p.active);
    expect(active.length).toBeGreaterThan(0);
    for (const bounce of active) expect(bounce.life).toBeCloseTo(0.1 - Math.sqrt(2 * 0.01 / SCENE_GRAVITY), 10);
  });
});
