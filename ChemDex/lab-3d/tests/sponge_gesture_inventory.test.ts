import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { ReactElement } from 'react';
import type { SpillState } from '../src/types/chemistry';
import { useAppStore } from '../src/store/useAppStore';
import { collectSpillPatch } from '../src/engine/spillCleanup';
import { LAB_GEOMETRY } from '../src/core/labGeometry';

const harness = vi.hoisted(() => ({ effects: [] as (() => void | (() => void))[],
  cleanups: [] as (() => void)[], three: {} as { camera: unknown; raycaster: unknown; gl: { domElement: unknown } } }));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  const hooks = { memo: (fn: unknown) => fn, useRef: (current: unknown) => ({ current }),
    useMemo: (factory: () => unknown) => factory(), useState: (value: unknown) => [value, vi.fn()],
    useEffect: (effect: () => void | (() => void)) => { harness.effects.push(effect); } };
  return { ...actual, ...hooks, default: { ...actual, ...hooks } };
});
vi.mock('@react-three/fiber', () => ({ useFrame: () => {}, useThree: () => harness.three, Canvas: 'canvas' }));
vi.mock('../src/store/useAppStore', async () => {
  const actual = await vi.importActual<typeof import('../src/store/useAppStore')>('../src/store/useAppStore');
  const store = actual.useAppStore;
  return { ...actual, useAppStore: Object.assign((selector: (state: ReturnType<typeof store.getState>) => unknown) => selector(store.getState()), store) };
});
vi.mock('../src/vfx/quality', async () => {
  const actual = await vi.importActual<typeof import('../src/vfx/quality')>('../src/vfx/quality');
  const store = actual.useQualityStore;
  return { ...actual, useQualityStore: Object.assign((selector: (state: ReturnType<typeof store.getState>) => unknown) => selector(store.getState()), store) };
});
vi.mock('../src/render/renderResolution', () => ({ useRenderDpr: () => 1 }));
vi.mock('../src/vfx/textures', () => ({ getLaboratoryTileTexture: () => ({}),
  getSkyGradientTexture: () => null, getSunbeamTexture: () => null }));
vi.mock('../src/vfx/materials/benchNormal', () => ({ getBenchNormalTexture: () => null }));
import { InteractiveSponge } from '../src/components/three/interactions/InteractiveSponge';
import { LabScene } from '../src/components/three/LabScene';

type Element = ReactElement<{ children?: unknown; args?: number[];
  onPointerDown?: (event: unknown) => void; onPointerMove?: (event: unknown) => void }>;
function tableNode(node: unknown): Element | undefined {
  if (Array.isArray(node)) return node.map(tableNode).find(Boolean);
  if (!node || typeof node !== 'object' || !('props' in node)) return;
  const element = node as Element;
  const children = [element.props.children].flat(Infinity) as Element[];
  if (children.some(child => child?.type === 'boxGeometry' && child.props.args?.join() === '32,0.35,13.5')) return element;
  return children.map(tableNode).find(Boolean);
}
const initial = useAppStore.getState();
afterEach(() => {
  harness.cleanups.splice(0).forEach(cleanup => cleanup()); harness.effects = [];
  useAppStore.setState(initial, true); vi.unstubAllGlobals(); vi.restoreAllMocks();
});
const wet = (position: [number, number, number] = [0, LAB_GEOMETRY.tableTop_scene, 0]): SpillState => ({
  id: 'spill', position, substances: ['H2O', 'NaCl'], color: '#fff', volume_ml: 100, mass_g: 110,
  radius: 1, isHazard: false, timestamp: 1,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 100, moles: 100 / 18.015 },
    { formula: 'NaCl', phase: 'aq', mass_g: 10, moles: 10 / 58.44 }],
});
function mount(spill = wet()) {
  const camera = new THREE.PerspectiveCamera(60, 1, .1, 100);
  camera.position.set(0, 35, 0); camera.up.set(0, 0, -1); camera.lookAt(0, LAB_GEOMETRY.tableTop_scene, 0); camera.updateMatrixWorld();
  const canvas = Object.assign(new EventTarget(), { getBoundingClientRect: () => ({ left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000 }) });
  vi.stubGlobal('window', new EventTarget());
  harness.three = { camera, raycaster: new THREE.Raycaster(), gl: { domElement: canvas } };
  const collect = vi.fn(initial.wipeSpillAt);
  useAppStore.setState({ activeTool: 'sponge', spills: { [spill.id]: spill }, wasteMass_g: 0, wasteContents: [],
    wipeSpillAt: collect, vessels: {}, vesselIds: [], burners: {}, burnerIds: [], draggingVesselId: null, moveMode: false });
  const table = tableNode(LabScene())!;
  // LabScene's native lifecycle is irrelevant here; retain only the sponge's
  // effect while dispatching the same event through both real gesture paths.
  harness.effects = [];
  (InteractiveSponge as unknown as () => unknown)();
  harness.effects.splice(0).forEach(effect => { const cleanup = effect(); if (cleanup) harness.cleanups.push(cleanup); });
  function dispatch(type: string, point: [number, number, number], timeStamp = 0, patch: Partial<PointerEvent> = {}) {
    const projected = new THREE.Vector3(...point).project(camera);
    const event = Object.assign(new Event(type), { clientX: (projected.x + 1) * 500,
      clientY: (1 - projected.y) * 500, button: 0, buttons: type === 'pointerup' ? 0 : 1,
      pointerId: 7, isPrimary: true, ...patch });
    Object.defineProperty(event, 'timeStamp', { value: timeStamp });
    canvas.dispatchEvent(event);
    const callback = type === 'pointerdown' ? table.props.onPointerDown : type === 'pointermove' ? table.props.onPointerMove : undefined;
    callback?.({ point: new THREE.Vector3(...point), buttons: (event as unknown as PointerEvent).buttons });
  }
  return { dispatch, collect, table, canvas };
}
function quantities() {
  const state = useAppStore.getState();
  return { waste: state.wasteMass_g, contents: state.wasteContents.reduce((sum, row) => sum + row.mass_g, 0),
    retained: Object.values(state.spills).reduce((sum, spill) => sum + spill.mass_g, 0) };
}

describe('One sponge gesture collects one finite footprint', () => {
  it('collects once when a native canvas press also hits the 3D tabletop', () => {
    const source = wet(), { dispatch, collect } = mount(source);
    const expected = collectSpillPatch(source, source.position, .75)!;
    expect(expected.fraction).toBeGreaterThan(0); expect(expected.fraction).toBeLessThan(1);
    dispatch('pointerdown', source.position);
    expect(collect).toHaveBeenCalledOnce();
    expect(quantities().waste).toBeCloseTo(expected.collected.mass_g, 10);
    expect(quantities().contents).toBeCloseTo(expected.collected.mass_g, 10);
    expect(quantities().retained + quantities().waste).toBeCloseTo(110, 10);
  });

  it('does not turn a right/middle/secondary pointer press into material cleanup', () => {
    const source = wet(), { dispatch, collect } = mount(source);
    for (const patch of [{ button: 1, buttons: 4 }, { button: 2, buttons: 2 }, { isPrimary: false }])
      dispatch('pointerdown', source.position, 0, patch);
    expect(collect).not.toHaveBeenCalled(); expect(quantities()).toEqual({ waste: 0, contents: 0, retained: 110 });
  });

  it('uses one collector size and throttles scrub passes instead of collecting every duplicate move', () => {
    const source = wet(), { dispatch, collect } = mount(source);
    dispatch('pointerdown', source.position, 0);
    for (const time of [1, 50, 119]) dispatch('pointermove', source.position, time);
    expect(collect).toHaveBeenCalledOnce();
    dispatch('pointermove', source.position, 120);
    expect(collect).toHaveBeenCalledTimes(2);
    expect(collect.mock.calls.every(([, radius]) => radius === .75)).toBe(true);
    expect(quantities().retained + quantities().waste).toBeCloseTo(110, 10);
    window.dispatchEvent(new Event('pointerup'));
    dispatch('pointermove', source.position, 250);
    expect(collect).toHaveBeenCalledTimes(2);
  });

  it('never collects a spill beyond the physical workbench or under a pointer outside the canvas', () => {
    const source = wet([16.3, LAB_GEOMETRY.tableTop_scene, 0]), { dispatch, collect, canvas } = mount(source);
    dispatch('pointerdown', source.position);
    const outside = Object.assign(new Event('pointerdown'), { clientX: 1200, clientY: 500, button: 0, buttons: 1, pointerId: 7, isPrimary: true });
    canvas.dispatchEvent(outside);
    expect(collect).not.toHaveBeenCalled(); expect(quantities().retained).toBe(110);
  });

  it('places the collector under the same bounded sponge center at the table edge', () => {
    const source = wet([15.9, LAB_GEOMETRY.tableTop_scene, 0]), { dispatch, collect } = mount(source);
    dispatch('pointerdown', source.position);
    expect(collect).toHaveBeenCalledOnce();
    const [x, y, z] = collect.mock.calls[0][0];
    expect(x).toBeCloseTo(LAB_GEOMETRY.tableHalfWidth_scene - .265, 12);
    expect(y).toBe(LAB_GEOMETRY.tableTop_scene); expect(z).toBeCloseTo(0, 12);
  });
});
