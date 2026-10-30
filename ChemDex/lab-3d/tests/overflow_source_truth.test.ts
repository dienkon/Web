import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { effects } from '../src/vfx/vesselEffects';
import { vfxBus } from '../src/vfx/bus';
import { labSound } from '../src/utils/audio';
import { calculateOverflowProfile, calculateSpillRadius } from '../src/science/overflowPhysics';
import { storeBridge } from '../src/pour/controller/store-bridge';
import { reactionSimulationEngine } from '../src/vfx/reactions/ReactionSimulationEngine';
import type { VesselState } from '../src/types/chemistry';
import * as THREE from 'three';
import { METERS_PER_SCENE_UNIT, SCENE_GRAVITY } from '../src/science/sceneUnits';

const harness = vi.hoisted(() => ({ refs: [] as { current: any }[], cleanup: [] as (() => void)[],
  frame: null as null | ((state: unknown, delta: number) => void) }));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return { ...actual, default: { ...actual, memo: (fn: unknown) => fn },
    useRef: (value: unknown) => { const ref = { current: value }; harness.refs.push(ref); return ref; },
    useMemo: (factory: () => unknown) => factory(),
    useEffect: (effect: () => void | (() => void)) => { const cleanup = effect(); if (cleanup) harness.cleanup.push(cleanup); } };
});
vi.mock('@react-three/fiber', () => ({ useFrame: (callback: (state: unknown, delta: number) => void) => { harness.frame = callback; } }));
import { VesselWallOverflow } from '../src/components/three/VesselWallOverflow';

const original = useAppStore.getState();
const vessel = (id = 'b', patch: Partial<VesselState> = {}): VesselState => ({ id, name: id, type: 'beaker',
  position: [0, 0, 0], rotationY: 0, isLocked: false, volume_ml: 50, volume: 0.5, capacity_ml: 100, mass_g: 50,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }], substances: ['H2O'],
  temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false, ...patch });
function mount(v = vessel()) {
  harness.refs = [];
  (VesselWallOverflow as unknown as (p: { vessel: VesselState }) => unknown)({ vessel: v });
  const group = { visible: false }; harness.refs[0].current = group; return group;
}
const frame = () => harness.frame!({}, 1 / 60);
beforeEach(() => {
  useAppStore.setState({ vessels: {}, vesselIds: [], burners: {}, spills: {}, activeKinetics: {}, pendingReactions: {},
    dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
  useAppStore.setState({ inFlightPours: [] });
  vi.spyOn(labSound, 'playOverflow').mockImplementation(() => {});
});
afterEach(() => {
  harness.cleanup.splice(0).forEach(fn => fn()); harness.frame = null;
  reactionSimulationEngine.resetAll(); useAppStore.setState(original, true); vi.restoreAllMocks();
});

describe('Overflow/splatter requires an identified, finite liquid release', () => {
  it('does not convert a ground spill into wall overflow on either nearby vessel', () => {
    const a = vessel('a'), b = vessel('b');
    useAppStore.setState({ vessels: { a, b }, vesselIds: ['a', 'b'] });
    const group = mount(b), seen: string[] = [], stop = vfxBus.on('vessel:overflow', e => seen.push(e.vesselId));
    try {
      useAppStore.getState().addSpill([0.8, -1.155, 0], 2, ['H2O'], '#ffffff', 'released drop', 2,
        [{ formula: 'H2O', phase: 'l', mass_g: 2, moles: 2 / 18.015 }]);
      frame(); const spill = Object.values(useAppStore.getState().spills)[0];
      expect(seen).toEqual([]); expect(group.visible).toBe(false); expect(labSound.playOverflow).not.toHaveBeenCalled();
      expect(spill.position).toEqual([0.8, -1.155, 0]); expect(spill.volume_ml).toBe(2);
      expect(useAppStore.getState().vessels.a).toBe(a); expect(useAppStore.getState().vessels.b).toBe(b);
    } finally { stop(); }
  });
  it('keeps a finite dose and its rim overflow bound to B even when A occupies the same position', () => {
    const a = vessel('a'), b = vessel('b', { capacity_ml: 55 });
    useAppStore.setState({ vessels: { a, b }, vesselIds: ['a', 'b'] });
    const group = mount(b), seen: { vesselId: string; volume_ml?: number }[] = [];
    const stop = vfxBus.on('vessel:overflow', e => seen.push(e));
    try {
      const receipt = effects.forVessel('b').doseLiquid('a', 20), after = useAppStore.getState();
      expect(receipt.spilled_ml).toBeCloseTo(15, 10);
      expect(seen).toHaveLength(1); expect(seen[0].vesselId).toBe('b'); expect(seen[0].volume_ml).toBeCloseTo(15, 10);
      const inventory = after.vessels.a.mass_g + after.vessels.b.mass_g
        + Object.values(after.spills).reduce((s, spill) => s + spill.mass_g, 0)
        + after.inFlightPours.reduce((sum, p) => sum + p.sample.mass_g, 0);
      expect(inventory).toBeCloseTo(100, 10);
      const material = JSON.stringify(after.spills); frame();
      expect(group.visible).toBe(false); expect(JSON.stringify(useAppStore.getState().spills)).toBe(material);
      expect(after.inFlightPours[0].stage).toBe('overflow');
      useAppStore.getState().advancePourTransport(2);
      expect(Object.values(useAppStore.getState().spills).reduce((sum, p) => sum + p.volume_ml, 0)).toBeCloseTo(15, 10);
      expect(Object.keys(after.vessels)).toEqual(['a', 'b']);
    } finally { stop(); }
  });
  it('rejects missing, zero, negative and nonfinite event volume before geometry or audio starts', () => {
    const group = mount();
    for (const volume_ml of [undefined, 0, -1, NaN, Infinity]) {
      vfxBus.emit('vessel:overflow', { vesselId: 'b', volume_ml }); frame();
      expect(group.visible).toBe(false);
    }
    expect(labSound.playOverflow).not.toHaveBeenCalled();
  });
  it('ignores other IDs, shattered receivers and invalid timing/angle without a default 5 mL event', () => {
    const group = mount();
    for (const patch of [{ vesselId: 'other' }, { duration_s: 0 }, { duration_s: NaN }, { angle: Infinity }]) {
      vfxBus.emit('vessel:overflow', { vesselId: 'b', volume_ml: 1, ...patch }); frame(); expect(group.visible).toBe(false);
    }
    expect(labSound.playOverflow).not.toHaveBeenCalled();
    harness.cleanup.splice(0).forEach(fn => fn());
    const broken = mount(vessel('b', { isShattered: true }));
    vfxBus.emit('vessel:overflow', { vesselId: 'b', volume_ml: 1 }); frame();
    expect(broken.visible).toBe(false); expect(labSound.playOverflow).not.toHaveBeenCalled();
  });
  it('does not revive an invalid persisted overflow volume or timestamp', () => {
    for (const patch of [{ overflow_ml: Infinity, overflowTimestamp: Date.now() },
      { overflow_ml: 1, overflowTimestamp: Infinity }]) {
      harness.cleanup.splice(0).forEach(fn => fn());
      const group = mount(vessel('b', patch)); frame(); expect(group.visible).toBe(false);
    }
    expect(labSound.playOverflow).not.toHaveBeenCalled();
  });
  it('retains real micro-spill volume/footprint and disables empty profiles', () => {
    for (const amount of [1e-4, 0.01, 0.049]) {
      const profile = calculateOverflowProfile(amount);
      expect(profile.volume_ml).toBe(amount); expect(profile.puddleRadius).toBe(calculateSpillRadius(amount));
    }
    for (const amount of [0, -1, NaN, Infinity]) {
      const profile = calculateOverflowProfile(amount);
      expect(profile.volume_ml).toBe(0); expect(profile.puddleRadius).toBe(0);
      expect(profile.activeStreamsCount + profile.activeDropletsCount + profile.activeFallingDripsCount
        + profile.activeSplashRingsCount + profile.satelliteCount).toBe(0);
    }
    storeBridge.recordSpill([0, -1.155, 0], 1e-4, ['H2O'], '#ffffff');
    expect(Object.values(useAppStore.getState().spills)[0].volume_ml).toBe(1e-4);
  });
  it('allows a real micro-overflow event without changing its amount or generating another spill', () => {
    const group = mount(), before = useAppStore.getState();
    vfxBus.emit('vessel:overflow', { vesselId: 'b', volume_ml: 1e-4 }); frame();
    expect(group.visible).toBe(true); expect(labSound.playOverflow).toHaveBeenCalledWith(1e-4);
    expect(useAppStore.getState()).toBe(before);
  });
  it('renders detached drops with SI flight time, volume-preserving stretch and pause', () => {
    const b = vessel('b', { position: [0, 1, 0] }); mount(b);
    const sliding = new THREE.Group(), falling = new THREE.Group(), rings = new THREE.Group();
    for (let i = 0; i < 12; i++) sliding.add(new THREE.Mesh());
    for (let i = 0; i < 8; i++) falling.add(new THREE.Mesh());
    for (let i = 0; i < 6; i++) rings.add(new THREE.Mesh(undefined, new THREE.MeshBasicMaterial()));
    harness.refs[3].current = sliding; harness.refs[4].current = falling; harness.refs[5].current = rings;
    const volume = 1e-4, head_s = calculateOverflowProfile(volume).headDescentDuration_ms / 1000;
    vfxBus.emit('vessel:overflow', { vesselId: b.id, volume_ml: volume });
    const step = 1 / 240;
    let elapsed = 0, found = false;
    for (let i = 0; i < 400; i++) {
      elapsed += step; harness.frame!({}, step);
      if (elapsed < head_s) expect(falling.visible).toBe(false);
      const first = falling.children[0];
      if (falling.visible && first.visible) {
        const age = elapsed - head_s;
        expect(first.position.y).toBeCloseTo(-1 - 0.5 * SCENE_GRAVITY * age ** 2, 4);
        expect(rings.visible).toBe(false); // first drop has not arrived
        const renderedDropVolume = [...sliding.children, ...falling.children]
          .filter(drop => drop.visible).reduce((sum, drop) => sum + 4 * Math.PI / 3
            * drop.scale.x * drop.scale.y * drop.scale.z * METERS_PER_SCENE_UNIT ** 3 * 1e6, 0);
        expect(renderedDropVolume).toBeLessThanOrEqual(volume * (1 + 1e-12));
        const pose = first.position.clone();
        useAppStore.setState({ isSimulationPaused: true }); harness.frame!({}, 1);
        expect(first.position.equals(pose)).toBe(true);
        found = true; break;
      }
    }
    expect(found).toBe(true);
  });
  it('does not turn ordinary boiling or an acid-dilution timeline into ejected sulfuric acid', () => {
    const b = vessel('b', { temperature_c: 100, isBoiling: true, evaporationRate_g_s: 1 });
    const before = structuredClone(b), events: string[] = [];
    useAppStore.setState({ vessels: { b }, vesselIds: ['b'] });
    const stops = [vfxBus.on('acid:splatter', () => events.push('acid')),
      vfxBus.on('particle:burst', () => events.push('burst')), vfxBus.on('surface:ripple', () => events.push('impulse'))];
    try {
      const runtime = reactionSimulationEngine.startReaction('b', 'water_into_conc_h2so4_explosion')!;
      reactionSimulationEngine.update(0.5); reactionSimulationEngine.scrubReaction('b', 0.1);
      expect(events).toEqual([]); expect(runtime.heatReleaseRate).toBe(0); expect(runtime.reactionRate).toBe(0);
      expect(useAppStore.getState().vessels.b).toEqual(before); expect(useAppStore.getState().spills).toEqual({});
    } finally { stops.forEach(stop => stop()); }
  });
});
