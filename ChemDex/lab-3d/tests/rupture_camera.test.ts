import { afterEach, describe, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Matrix4, Vector3 } from 'three';
import { CameraShakeProjection, createCameraShake, kickCameraShake, stepCameraShake } from '../src/vfx/cameraShake';
import { vfxBus, type VfxEventMap } from '../src/vfx/bus';
import { getEffectAtom } from '../src/vfx/catalog';
import { runStudioAtomContext } from '../src/engine/studioAtom';
import { useAppStore } from '../src/store/useAppStore';
import { useLabEnvironment } from '../src/store/useLabEnvironment';
import { DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { runContactScenario } from '../src/vfx/dev/contactScenarios';
import type { VesselState } from '../src/types/chemistry';

const before = useAppStore.getState(), room = useLabEnvironment.getState().conditions;
afterEach(() => { useAppStore.setState(before, true); useLabEnvironment.getState().setConditions(room); vi.restoreAllMocks(); });
const vessel: VesselState = { id: 'rupture', name: 'Rupture', type: 'beaker', capacity_ml: 100,
  position: [0, -0.135, 0], rotationY: 0, isLocked: false, contents: [], substances: [], volume_ml: 0,
  volume: 0, mass_g: 0, temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false };

describe('Rupture is a mechanical event, not invented incandescence', () => {
  it.each([0, 0.2095])('bulk sodium fragments and releases material with no auto sparks at oxygen fraction %s', async oxygenFraction => {
    useLabEnvironment.getState().setConditions({ ...DEFAULT_LAB_ENVIRONMENT, oxygenFraction });
    useAppStore.setState({ vessels: { [vessel.id]: vessel }, vesselIds: [vessel.id], burners: {}, spills: {},
      activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, inFlightPours: [], workbenchEscapedGas_g: {},
      isSimulationPaused: false, timeScale: 1 });
    const burst: VfxEventMap['explosion'][] = [], sparks: VfxEventMap['sparks'][] = [];
    const off = vfxBus.on('explosion', e => burst.push(e)), offSparks = vfxBus.on('sparks', e => sparks.push(e));
    try {
      await runContactScenario(vessel.id, 'sodium_large');
      const initial = useAppStore.getState().vessels[vessel.id].mass_g;
      useAppStore.getState().tickSimulation(0.05);
      const s = useAppStore.getState(), v = s.vessels[vessel.id];
      expect(v.isShattered).toBe(true);
      expect(burst).toHaveLength(1); expect(burst[0].kind).toBe('fragmentation');
      expect(burst[0].radiantEnergy_J).toBeUndefined(); expect(sparks).toEqual([]);
      expect(v.hydrogenCombustion).toBeUndefined();
      const mass = Object.values(s.spills).reduce((sum, p) => sum + p.mass_g, 0)
        + Object.values(v.escapedGas_g ?? {}).reduce((sum, g) => sum + g, 0) + (v.evaporated_ml ?? 0);
      expect(mass).toBeCloseTo(initial, 7);
    } finally { off(); offSparks(); }
  });
  it('does not convert a cold pressure rupture into sparks', () => {
    useAppStore.setState({ vessels: { [vessel.id]: vessel }, spills: {} });
    const sparks = vi.fn(), off = vfxBus.on('sparks', sparks);
    try { useAppStore.getState().shatterVessel(vessel.id, 'overpressure'); expect(sparks).not.toHaveBeenCalled(); }
    finally { off(); }
  });
  it('does not invent an explosion when the cause of glass failure is unspecified', () => {
    useAppStore.setState({ vessels: { [vessel.id]: vessel }, spills: {} });
    const burst = vi.fn(), off = vfxBus.on('explosion', burst);
    try {
      useAppStore.getState().shatterVessel(vessel.id);
      expect(useAppStore.getState().vessels[vessel.id].isShattered).toBe(true);
      expect(burst).not.toHaveBeenCalled();
    } finally { off(); }
  });
  it.each(['cameraShake', 'cameraTraumaShake'])('%s and its Studio preview affect only the camera event bus', name => {
    const explosion = vi.fn(), shake = vi.fn(), off = vfxBus.on('explosion', explosion), offShake = vfxBus.on('camera:shake', shake);
    try {
      const atom = getEffectAtom(name)!, state = useAppStore.getState();
      atom.mount({ vesselId: vessel.id, position: [0, 0, 0], dimensions: { radius: 1, height: 1, mouthY: 1, liquidY: 0.5 }, timeScale: 1, seed: 42 },
        { intensity: 0.4, decay_s: 0.3 });
      expect(shake).toHaveBeenCalledWith({ intensity: 0.4, decay_s: 0.3 });
      expect(runStudioAtomContext(atom, 0).action.kind).toBe('camera_shake');
      expect(explosion).not.toHaveBeenCalled(); expect(useAppStore.getState()).toBe(state);
    } finally { off(); offShake(); }
  });
});

describe('Camera impulse is a reversible projection overlay', () => {
  it('shakes a settled camera without modifying its physical position, rotation or orbit target', () => {
    const camera = new PerspectiveCamera(50, 1.5, 0.1, 100), projection = new CameraShakeProjection();
    camera.position.set(0, 5, 12); camera.lookAt(new Vector3());
    const pose = { p: camera.position.clone(), q: camera.quaternion.clone() }, base = camera.projectionMatrix.clone();
    const shake = createCameraShake(); kickCameraShake(shake, 1, 0.5);
    for (let i = 0; i < 30; i++) {
      projection.restore(camera); projection.apply(camera, stepCameraShake(shake, 1 / 120));
      expect(camera.position.toArray()).toEqual(pose.p.toArray()); expect(camera.quaternion.toArray()).toEqual(pose.q.toArray());
    }
    expect(camera.projectionMatrix.equals(base)).toBe(false);
    const identity = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.projectionMatrixInverse);
    identity.elements.forEach((v, i) => expect(v).toBeCloseTo(i % 5 === 0 ? 1 : 0, 12));
    projection.apply(camera, stepCameraShake(shake, 1)); expect(camera.projectionMatrix).toEqual(base);
  });
  it('does not accumulate projection drift over repeated impulses', () => {
    const camera = new PerspectiveCamera(), projection = new CameraShakeProjection(), base = camera.projectionMatrix.clone();
    for (let i = 0; i < 500; i++) projection.apply(camera, { x: 0.01, y: -0.01, roll: 0.02 });
    projection.restore(camera); expect(camera.projectionMatrix).toEqual(base);
  });
  it('preserves a real resize or lens update instead of restoring an obsolete projection', () => {
    const camera = new PerspectiveCamera(), projection = new CameraShakeProjection();
    projection.apply(camera, { x: 0.01, y: 0, roll: 0 });
    camera.aspect = 2; camera.fov = 75; camera.updateProjectionMatrix();
    const resized = camera.projectionMatrix.clone(); projection.restore(camera);
    expect(camera.projectionMatrix).toEqual(resized);
  });
  it('uses the shared pause/scale clock and honors reduced motion', () => {
    const state = createCameraShake(); kickCameraShake(state, 1, 0.5);
    const moving = stepCameraShake(state, 0.1), frozen = { ...state };
    expect(stepCameraShake(state, 0)).toEqual(moving); expect(state).toEqual(frozen);
    expect(stepCameraShake(state, 0, true)).toEqual({ x: 0, y: 0, roll: 0 });
    expect(stepCameraShake(state, 1)).toEqual({ x: 0, y: 0, roll: 0 });
  });
  it('keeps its decay independent of frame subdivision and ignores invalid impulses', () => {
    const a = createCameraShake(), b = createCameraShake();
    kickCameraShake(a, 0.8, 0.6); kickCameraShake(b, 0.8, 0.6);
    const one = stepCameraShake(a, 0.3); let many = one;
    for (let i = 0; i < 30; i++) many = stepCameraShake(b, 0.01);
    for (const k of ['x', 'y', 'roll'] as const) expect(one[k]).toBeCloseTo(many[k], 12);
    const old = { ...a }; kickCameraShake(a, NaN); kickCameraShake(a, 1, Infinity); expect(a).toEqual(old);
  });
});
