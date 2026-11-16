import { afterEach, describe, expect, it, vi } from 'vitest';
import { Group } from 'three';
import type { ReactElement } from 'react';
import { useAppStore } from '../src/store/useAppStore';
import type { VesselState } from '../src/types/chemistry';

const harness = vi.hoisted(() => ({ frame: null as null | ((state: unknown, delta: number) => void) }));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  const hooks = { memo: (fn: unknown) => fn, useRef: (current: unknown) => ({ current }),
    useMemo: (factory: () => unknown) => factory(), useState: (value: unknown) => [value, vi.fn()] };
  return { ...actual, ...hooks, default: { ...actual, ...hooks } };
});
vi.mock('@react-three/fiber', () => ({ useFrame: (frame: typeof harness.frame) => { harness.frame = frame; } }));
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
import { MortarPestle } from '../src/components/three/Vessels';

type Element = ReactElement<{ name?: string; children?: Element | Element[]; ref?: { current: unknown }; onClick?: (event: unknown) => void }>;
function findPestle(node: Element): Element | undefined {
  if (!node?.props) return;
  if (node.props.name === 'mortar-pestle-m') return node;
  for (const child of [node.props.children].flat(Infinity) as Element[]) {
    const match = findPestle(child); if (match) return match;
  }
}
const original = useAppStore.getState();
afterEach(() => { useAppStore.setState(original, true); harness.frame = null; vi.restoreAllMocks(); });
function mount(selected = false) {
  const vessel = { id: 'm', type: 'mortar_pestle', position: [0, 0, 0], capacity_ml: 80,
    rotationY: 0, volume_ml: 0, contents: [] } as unknown as VesselState;
  useAppStore.setState({ vessels: { m: vessel }, selectedVesselId: selected ? 'm' : null,
    hoveredVesselId: null, isSimulationPaused: false, timeScale: 1, grindMortar: () => {} });
  const tree = (MortarPestle as unknown as (props: unknown) => Element)({ id: 'm', position: [0, 0, 0] });
  const pestle = findPestle(tree)!;
  const group = new Group(); pestle.props.ref!.current = group;
  return { group, grind: () => pestle.props.onClick!({ stopPropagation() {} }) };
}
function frame(delta = 1 / 60, wallTime = 1000) { harness.frame!({ clock: { elapsedTime: wallTime } }, delta); }
function pose(group: Group) { group.updateMatrix(); return group.matrix.elements.slice(); }

describe('Visible mortar motion follows accepted simulation time', () => {
  it('freezes selected and grinding poses during pause without a wall-clock jump on resume', () => {
    for (const grinding of [false, true]) {
      const { group, grind } = mount(true); if (grinding) grind();
      frame(); const snapshot = pose(group);
      useAppStore.setState({ isSimulationPaused: true });
      for (let i = 0; i < 120; i++) frame(1 / 60, 1000 + i);
      expect(pose(group)).toEqual(snapshot);
      useAppStore.setState({ isSimulationPaused: false }); frame(); const resumed = pose(group);
      const reference = mount(true); if (grinding) reference.grind();
      frame(1 / 60, 0); frame(1 / 60, 0);
      expect(resumed).toEqual(pose(reference.group));
    }
  });

  it('uses the same grinding duration and path at 1x and 4x across render rates', () => {
    const run = (fps: number, speed: number, seconds: number) => {
      const { group, grind } = mount(); grind(); useAppStore.setState({ timeScale: speed });
      for (let i = 0; i < fps * seconds / speed; i++) frame(1 / fps, i / fps);
      return pose(group);
    };
    const moving = run(60, 1, 0.8);
    for (const [fps, speed] of [[30, 1], [120, 1], [30, 4], [60, 4], [120, 4]]) {
      const actual = run(fps, speed, 0.8);
      actual.forEach((value, index) => expect(value).toBeCloseTo(moving[index], 10));
      const rested = run(fps, speed, 2);
      const expected = new Group(); expected.position.set(0.18, 0.22, 0); expected.rotation.set(0.12, 0, -0.38);
      expect(rested).toEqual(pose(expected));
    }
  });
});
