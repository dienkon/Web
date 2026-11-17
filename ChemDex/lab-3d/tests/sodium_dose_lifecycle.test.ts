import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { Group, Mesh, MeshStandardMaterial } from 'three';
import { useAppStore } from '../src/store/useAppStore';
import type { VesselState } from '../src/types/chemistry';

const harness = vi.hoisted(() => ({ frame: null as null | ((state: unknown, delta: number) => void), cleanups: [] as (() => void)[] }));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  const hooks = { useRef: (current: unknown) => ({ current }), useMemo: (factory: () => unknown) => factory(),
    useEffect: (effect: () => void | (() => void)) => { const cleanup = effect(); if (cleanup) harness.cleanups.push(cleanup); } };
  return { ...actual, ...hooks, default: { ...actual, ...hooks } };
});
vi.mock('@react-three/fiber', () => ({ useFrame: (frame: typeof harness.frame) => { harness.frame = frame; } }));
import { SodiumDoseAnimation } from '../src/components/three/SodiumDoseAnimation';

const initial = useAppStore.getState();
afterEach(() => {
  harness.cleanups.splice(0).forEach(cleanup => cleanup());
  harness.frame = null; useAppStore.setState(initial, true); vi.restoreAllMocks();
});
type Element = ReactElement<{ ref?: { current: unknown }; geometry?: Mesh['geometry']; children?: unknown }>;
function mount(onComplete: () => void) {
  const vessel: VesselState = { id: 'sodium-receiver', name: 'Dry sodium receiver', type: 'beaker', capacity_ml: 100,
    position: [0, -.135, 0], rotationY: 0, isLocked: false, volume_ml: 0, volume: 0, mass_g: 0,
    temperature_c: 25, ph: 7, contents: [], substances: [], hasGas: false, hasPrecipitate: false, isBoiling: false };
  useAppStore.setState({ vessels: { [vessel.id]: vessel }, vesselIds: [vessel.id], burners: {}, activeKinetics: {},
    pendingReactions: {}, isSimulationPaused: false, timeScale: 1, pouringChemical: null,
    draggingVesselId: null, moveMode: false, isMixing: false, isPouring: false, instrumentRinse: null });
  initial.triggerPour('Na', vessel.id, .1);
  const dose = useAppStore.getState().pouringChemical!;
  const tree = SodiumDoseAnimation({ doseId: dose.id, targetId: vessel.id, amount: .1, onComplete }) as Element;
  const nodes = tree.props.children as Element[];
  nodes[0].props.ref!.current = new Group();
  const metal = new Mesh(nodes[1].props.geometry, new MeshStandardMaterial());
  nodes[1].props.ref!.current = metal;
  return { vessel, dose, metal };
}
function frames(count: number) { for (let i = 0; i < count; i++) harness.frame!({}, 1 / 60); }

describe('Sodium forceps delivery retains the contacted dose until its transaction settles', () => {
  it('waits for accepted chemistry before withdrawing the dose and allowing a replacement', async () => {
    const complete = vi.fn(() => useAppStore.getState().clearPour(dose.id));
    const { vessel, dose, metal } = mount(complete);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const mix = vi.fn(async (_id: string, _formula: string, amount: number, accepted?: () => void) => {
      await gate;
      useAppStore.setState(state => ({ vessels: { ...state.vessels, [vessel.id]: { ...state.vessels[vessel.id],
        mass_g: amount, contents: [{ formula: 'Na', phase: 's', mass_g: amount, moles: amount / 22.99 }], substances: ['Na'] } } }));
      accepted?.();
    });
    useAppStore.setState({ mixSubstances: mix });
    frames(180);
    expect(metal.visible).toBe(false);
    expect(mix).toHaveBeenCalledOnce();
    expect(complete).not.toHaveBeenCalled();
    expect(useAppStore.getState().pouringChemical?.id).toBe(dose.id);
    initial.triggerPour('Na', vessel.id, .2);
    expect(useAppStore.getState().pouringChemical?.id).toBe(dose.id);
    release();
    await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(useAppStore.getState().vessels[vessel.id].mass_g).toBe(.1);
    expect(useAppStore.getState().pouringChemical).toBeNull();
    frames(30); expect(complete).toHaveBeenCalledOnce();
    metal.material.dispose();
  });

  it('stops an invalid receiver before contact and freezes the forceps/pellet during pause', () => {
    const complete = vi.fn(), { vessel, metal } = mount(complete);
    const advance = vi.spyOn(useAppStore.getState(), 'advancePourContact');
    frames(10); metal.updateMatrix(); const held = metal.matrix.elements.slice();
    useAppStore.setState({ isSimulationPaused: true }); frames(120); metal.updateMatrix();
    expect(metal.matrix.elements).toEqual(held); expect(advance).not.toHaveBeenCalled();
    useAppStore.setState(state => ({ isSimulationPaused: false, vessels: { ...state.vessels,
      [vessel.id]: { ...state.vessels[vessel.id], isSealed: true } } }));
    frames(120);
    expect(complete).toHaveBeenCalledOnce(); expect(advance).not.toHaveBeenCalled();
    expect(useAppStore.getState().vessels[vessel.id].mass_g).toBe(0);
    metal.material.dispose();
  });
});
