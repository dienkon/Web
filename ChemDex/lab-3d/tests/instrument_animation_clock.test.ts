import { afterEach, describe, expect, it, vi } from 'vitest';
import { Group } from 'three';
import type { ReactElement } from 'react';
import type { VesselState } from '../src/types/chemistry';

const harness = vi.hoisted(() => ({
  frame: null as null | ((state: unknown, delta: number) => void),
  cleanups: [] as Array<() => void>,
  refs: [] as { current: any }[], cursor: 0,
}));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  const hooks = { memo: (fn: unknown) => fn,
    useRef: (value: unknown) => harness.refs[harness.cursor++] ?? (harness.refs[harness.cursor - 1] = { current: value }),
    useEffect: (effect: () => void | (() => void)) => {
      const cleanup = effect();
      if (cleanup) harness.cleanups.push(cleanup);
    },
    useMemo: (factory: () => unknown) => factory(), useState: (value: unknown) => [value, vi.fn()] };
  return { ...actual, ...hooks, default: { ...actual, ...hooks } };
});
vi.mock('@react-three/fiber', () => ({ useFrame: (frame: typeof harness.frame) => { harness.frame = frame; } }));
vi.mock('@react-three/drei', () => ({ Text: 'text' }));
vi.mock('../src/handling/toolDock', async () => ({
  ...await vi.importActual('../src/handling/toolDock'),
  useToolDock: (_id: string, position: number[]) => ({ position, visible: true, moveMode: false, onPointerDown() {} }),
}));
vi.mock('../src/store/useAppStore', async () => {
  const actual = await vi.importActual<typeof import('../src/store/useAppStore')>('../src/store/useAppStore');
  const store = actual.useAppStore;
  return { ...actual, useAppStore: Object.assign((selector: (state: ReturnType<typeof store.getState>) => unknown) => selector(store.getState()), store) };
});
vi.mock('../src/handling/instrumentState', async () => {
  const actual = await vi.importActual<typeof import('../src/handling/instrumentState')>('../src/handling/instrumentState');
  const store = actual.useInstrumentStore;
  return { ...actual, useInstrumentStore: Object.assign((selector: (state: ReturnType<typeof store.getState>) => unknown) => selector(store.getState()), store) };
});
vi.mock('../src/store/useLabEnvironment', async () => {
  const actual = await vi.importActual<typeof import('../src/store/useLabEnvironment')>('../src/store/useLabEnvironment');
  const store = actual.useLabEnvironment;
  return { ...actual, useLabEnvironment: Object.assign((selector: (state: ReturnType<typeof store.getState>) => unknown) => selector(store.getState()), store) };
});

import { useAppStore } from '../src/store/useAppStore';
import { useInstrumentStore } from '../src/handling/instrumentState';
import { InteractiveDigitalBalance } from '../src/components/three/interactions/InteractiveDigitalBalance';
import { InteractiveThermometer } from '../src/components/three/interactions/InteractiveThermometer';
import { InteractivePhMeter } from '../src/components/three/interactions/InteractivePhMeter';
import { LAB_PHYSICS } from '../src/engine/interactionEngine';

type Element = ReactElement<{ children?: unknown; ref?: { current: any }; name?: string }>;
const before = useAppStore.getState(), instruments = useInstrumentStore.getState();
function unmount() {
  for (const cleanup of harness.cleanups.splice(0)) cleanup();
}
afterEach(() => {
  unmount(); useAppStore.setState(before, true); useInstrumentStore.setState(instruments, true);
  harness.refs = []; harness.cursor = 0; vi.restoreAllMocks();
});
function setup() {
  unmount();
  harness.refs = []; harness.cursor = 0;
  const water = { id: 'water', name: 'water', type: 'beaker', capacity_ml: 250, volume_ml: 150, volume: 0.6,
    mass_g: 150, temperature_c: 80, ph: 7, position: [...LAB_PHYSICS.BALANCE_POSITION], rotationY: 0,
    isLocked: false, isBoiling: false, hasGas: false, hasPrecipitate: false, substances: ['H2O'],
    contents: [{ formula: 'H2O', phase: 'l', mass_g: 150, moles: 150 / 18.015 }] } as VesselState;
  useAppStore.setState({ vessels: { water }, selectedVesselId: 'water', isSimulationPaused: false, timeScale: 1, moveMode: false });
  useInstrumentStore.setState({ balanceTare_g: 0 });
}
function render(component: unknown) {
  harness.cursor = 0;
  return (component as (props: {}) => Element)({});
}
function nodes(tree: unknown): Element[] {
  if (!tree || typeof tree !== 'object' || !('props' in tree)) return [];
  const node = tree as Element;
  return [node, ...[node.props.children].flat(Infinity).flatMap(nodes)];
}
function frame(delta = 1 / 60, wall = 1000) { harness.frame!({ clock: { elapsedTime: wall } }, delta); }

describe('Instrument renderers share the simulation clock', () => {
  it.each([InteractiveThermometer, InteractivePhMeter])('freezes probe pose during pause and resumes without jumping to wall time', component => {
    setup(); useAppStore.setState({ activeTool: component === InteractiveThermometer ? 'thermometer' : 'ph_meter' });
    const tree = render(component), group = new Group(); tree.props.ref!.current = group;
    const label = nodes(tree).find(node => node.type === 'text' && node.props.ref)!;
    label.props.ref!.current = { text: '' };
    frame(); group.updateMatrix(); const snapshot = group.matrix.elements.slice(), reading = label.props.ref!.current.text;
    useAppStore.setState({ isSimulationPaused: true });
    for (let i = 0; i < 10; i++) frame(1, 1e6 + i);
    group.updateMatrix(); expect(group.matrix.elements).toEqual(snapshot); expect(label.props.ref!.current.text).toBe(reading);
    useAppStore.setState({ isSimulationPaused: false }); frame(); group.updateMatrix(); const resumed = group.matrix.elements.slice();
    setup(); useAppStore.setState({ activeTool: component === InteractiveThermometer ? 'thermometer' : 'ph_meter' });
    const reference = render(component), expected = new Group(); reference.props.ref!.current = expected;
    frame(); frame(); expected.updateMatrix(); expect(resumed).toEqual(expected.matrix.elements);
  });

  it.each([InteractiveThermometer, InteractivePhMeter])('moves a probe along the same path at equal simulated time across frame rates and speeds', component => {
    const run = (fps: number, speed: number) => {
      setup(); useAppStore.setState({ timeScale: speed, activeTool: component === InteractiveThermometer ? 'thermometer' : 'ph_meter' });
      const tree = render(component), group = new Group(); tree.props.ref!.current = group;
      for (let i = 0; i < fps * 0.8 / speed; i++) frame(1 / fps);
      return group.position.toArray();
    };
    const reference = run(60, 1);
    for (const [fps, speed] of [[10, 1], [30, 1], [120, 1], [30, 4], [60, 8]]) {
      run(fps, speed).forEach((value, i) => expect(value).toBeCloseTo(reference[i], 10));
    }
  });

  it.each([InteractiveThermometer, InteractivePhMeter])('publishes a settled practice reading only at the sample and clears it on unmount', component => {
    setup();
    const tool = component === InteractiveThermometer ? 'thermometer' : 'ph_meter';
    const vessel: VesselState = { ...useAppStore.getState().vessels.water, id: 'beaker_1', temperature_c: 25,
      neutralizationPractice: { attemptId: 'practice', sampleRevision: 0, received_ml: 0 } };
    useAppStore.setState({ vessels: { beaker_1: vessel }, selectedVesselId: vessel.id, activeTool: tool });
    const tree = render(component), group = new Group(); tree.props.ref!.current = group;
    frame();
    expect(useInstrumentStore.getState().practiceProbe).toBeNull();
    for (let i = 0; i < 150; i++) frame();
    expect(useInstrumentStore.getState().practiceProbe).toMatchObject({
      tool, attemptId: 'practice', value: tool === 'thermometer' ? 25 : 7, settled: true,
    });
    unmount();
    expect(useInstrumentStore.getState().practiceProbe).toBeNull();
  });

  function changedBalance() {
    setup(); render(InteractiveDigitalBalance);
    useInstrumentStore.setState({ balanceTare_g: 100 });
    const tree = render(InteractiveDigitalBalance), display = nodes(tree).find(node => node.type === 'text' && node.props.ref)!;
    display.props.ref!.current = { text: '' };
    return () => display.props.ref!.current.text as string;
  }
  it('never overshoots a new balance mass after a long frame and freezes its noise while paused', () => {
    const read = changedBalance(); frame(1);
    const mass = Number.parseFloat(read());
    expect(mass).toBeGreaterThan(135); expect(mass).toBeLessThan(235);
    useAppStore.setState({ isSimulationPaused: true }); const snapshot = read();
    for (let i = 0; i < 10; i++) frame(1, 1e6 + i);
    expect(read()).toBe(snapshot);
  });
  it('settles the balance to the same displayed mass at equal simulation time', () => {
    const run = (fps: number, speed: number) => {
      const read = changedBalance(); useAppStore.setState({ timeScale: speed });
      for (let i = 0; i < fps * 0.8 / speed; i++) frame(1 / fps, i / fps);
      return read();
    };
    const reference = run(60, 1);
    for (const [fps, speed] of [[10, 1], [30, 1], [120, 1], [30, 4], [60, 8]]) expect(run(fps, speed)).toBe(reference);
  });
});
