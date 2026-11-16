import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { useAppStore } from '../src/store/useAppStore';
import type { VesselState } from '../src/types/chemistry';
import { SimulationEngine } from '../src/simulation/core/SimulationEngine';

const harness = vi.hoisted(() => ({ cleanups: [] as (() => void)[] }));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  const hooks = { memo: (fn: unknown) => fn, useRef: (current: unknown) => ({ current }),
    useMemo: (factory: () => unknown) => factory(), useState: (value: unknown) => [value, vi.fn()],
    useEffect: (effect: () => void | (() => void)) => { const cleanup = effect(); if (cleanup) harness.cleanups.push(cleanup); } };
  return { ...actual, ...hooks, default: { ...actual, ...hooks } };
});
vi.mock('@react-three/fiber', () => ({ useFrame: () => {} }));
vi.mock('../src/store/useAppStore', async () => {
  const actual = await vi.importActual<typeof import('../src/store/useAppStore')>('../src/store/useAppStore');
  const store = actual.useAppStore;
  return { ...actual, useAppStore: Object.assign((selector: (state: ReturnType<typeof store.getState>) => unknown) => selector(store.getState()), store) };
});
import { VfxDirector } from '../src/vfx/director';
import { PhysicalSimulationRenderer } from '../src/simulation/render/PhysicalSimulationRenderer';

type Element = ReactElement<{ children?: unknown; vesselId?: string }>;
const initial = useAppStore.getState();
afterEach(() => {
  harness.cleanups.splice(0).forEach(cleanup => cleanup());
  SimulationEngine.clearAll(); useAppStore.setState(initial, true);
});
function sample(volume_ml: number): VesselState {
  return { id: 'micro-director', name: 'micro-director', type: 'beaker', capacity_ml: 250,
    position: [0, 0, 0], rotationY: 0, isLocked: false, volume_ml, volume: volume_ml / 250,
    temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: true, isBoiling: false,
    mass_g: volume_ml + 0.00001, substances: ['H2O', 'BaSO4'], precipitateSubstance: 'BaSO4',
    contents: [{ formula: 'H2O', phase: 'l', mass_g: volume_ml, moles: volume_ml / 18.015 },
      { formula: 'BaSO4', phase: 's', mass_g: 0.00001, moles: 0.00001 / 233.39, solidOrigin: 'precipitate' }] };
}
function mount(vessel: VesselState) {
  useAppStore.setState({ vessels: { [vessel.id]: vessel }, vesselIds: [vessel.id], activeKinetics: {},
    stirringVesselId: null, activeTool: 'none', selectedVesselId: null, isSimulationPaused: true });
}
function physicalNodes(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(physicalNodes);
  if (!node || typeof node !== 'object' || !('props' in node)) return [];
  const element = node as Element;
  return [...(element.type === PhysicalSimulationRenderer ? [element] : []), ...physicalNodes(element.props.children)];
}
function render() { return physicalNodes((VfxDirector as unknown as () => Element)()); }

describe('Manual director owns the full small-volume precipitation lifecycle', () => {
  it.each([0.050001, 0.12, 0.2, 0.201])('mounts a physical renderer for inactive %s mL solids without a pre-existing manager', volume => {
    const vessel = sample(volume); mount(vessel);
    expect(SimulationEngine.findManager(vessel.id)).toBeUndefined();
    expect(useAppStore.getState().activeKinetics).toEqual({});
    const nodes = render();
    expect(nodes).toHaveLength(1); expect(nodes[0].props.vesselId).toBe(vessel.id);
  });

  it('retains one final physical cleanup after micro-volume precipitate dissolves, then retires the renderer', () => {
    const vessel = sample(0.12); mount(vessel);
    const manager = SimulationEngine.getManager(vessel.id, 'low');
    manager.step(vessel, 0.1, { thermalStateAuthoritative: true });
    expect(manager.precipitationSystems.size).toBe(1);
    const dissolved = { ...vessel, hasPrecipitate: false, contents: vessel.contents.filter(row => row.phase !== 's') };
    mount(dissolved);
    expect(render()).toHaveLength(1);
    manager.step(dissolved, 0.1, { thermalStateAuthoritative: true });
    expect(manager.precipitationSystems.size).toBe(0);
    expect(render()).toHaveLength(0);
  });

  it.each([0, 0.05])('leaves %s mL dry-fallback specimens unmounted when no effect history remains', volume => {
    mount(sample(volume)); expect(render()).toHaveLength(0);
  });
});
