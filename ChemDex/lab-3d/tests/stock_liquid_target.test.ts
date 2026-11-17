import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { ReactElement } from 'react';
import type { VesselState } from '../src/types/chemistry';
import { useAppStore } from '../src/store/useAppStore';
import { stockLiquidTarget, stockReceiverProblem, stockBottleDosePose, STOCK_BOTTLE_CLEARANCE,
  STOCK_BOTTLE_OUTLET_LOCAL_Y, stockTargetLiquidPacket, stockTargetArrivedFraction } from '../src/handling/stockDoseTarget';
import { STOCK_RELEASE_START_S, STOCK_RELEASE_END_S } from '../src/handling/doseTiming';
import { vesselLocalToWorld, vesselWorldToLocal } from '../src/science/vesselScale';
import { contourRadius, vesselInterior } from '../src/science/vesselDimensions';

const harness = vi.hoisted(() => ({ frame: null as null | ((state: unknown, delta: number) => void) }));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  const hooks = { memo: (fn: unknown) => fn, useRef: (current: unknown) => ({ current }),
    useMemo: (factory: () => unknown) => factory(), useEffect: () => {} };
  return { ...actual, ...hooks, default: { ...actual, ...hooks } };
});
vi.mock('@react-three/fiber', () => ({ useFrame: (frame: typeof harness.frame) => { harness.frame = frame; } }));
vi.mock('../src/store/useAppStore', async () => {
  const actual = await vi.importActual<typeof import('../src/store/useAppStore')>('../src/store/useAppStore');
  const store = actual.useAppStore;
  return { ...actual, useAppStore: Object.assign((selector: (state: ReturnType<typeof store.getState>) => unknown) => selector(store.getState()), store) };
});
vi.mock('../src/utils/audio', () => ({ labSound: { playDrop: vi.fn(), playPour: vi.fn() } }));
import { AddingAnimation } from '../src/components/three/PouringBottle';

const initial = useAppStore.getState();
afterEach(() => { useAppStore.setState(initial, true); harness.frame = null; });
function sample(patch: Partial<VesselState> = {}): VesselState {
  return { id: 'target', name: 'target', type: 'flask', capacity_ml: 100, position: [1.4, -.135, -.6],
    rotationY: .4, rotationZ: .5, isLocked: false, contents: [], substances: [], mass_g: 0,
    volume_ml: 0, volume: 0, temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false, ...patch };
}
type Element = ReactElement<{ name?: string; children?: unknown; ref?: { current: unknown }; geometry?: THREE.BufferGeometry }>;
function all(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(all);
  if (!node || typeof node !== 'object' || !('props' in node)) return [];
  const element = node as Element;
  return [element, ...all(element.props.children)];
}
function mount(vessel: VesselState, amount: number) {
  const contact = vi.fn(() => Promise.resolve());
  useAppStore.setState({ vessels: { target: vessel }, vesselIds: ['target'], isSimulationPaused: false,
    timeScale: 1, advancePourContact: contact });
  const tree = (AddingAnimation as unknown as (props: unknown) => Element)({ doseId: 1, chemical: 'H2O', targetId: 'target', amount, onComplete: vi.fn() });
  const nodes = all(tree), toolNode = nodes.find(node => node.props.name === (amount <= .2 ? 'stock-dropper-tool' : 'stock-bottle-tool'))!;
  const tool = new THREE.Group(); toolNode.props.ref!.current = tool;
  const outlet = nodes.find(node => node.props.name === (amount <= .2 ? 'stock-dropper-outlet' : 'stock-bottle-outlet'))!;
  const dropNode = nodes.find(node => node.props.name === 'stock-dropper-drop');
  const drop = dropNode ? new THREE.Mesh() : null;
  if (dropNode) dropNode.props.ref!.current = drop;
  const streamNode = nodes.find(node => node.props.geometry instanceof THREE.CylinderGeometry);
  const stream = streamNode ? new THREE.Mesh(streamNode.props.geometry) : null;
  if (streamNode) streamNode.props.ref!.current = stream;
  return { tool, outlet, drop, stream, contact, nodes };
}
function step(frames: number) { for (let i = 0; i < frames; i++) harness.frame!({}, 1 / 60); }

describe('Guided stock liquid follows the posed receiver opening', () => {
  it.each([false, true])('targets the actual tilted mouth and first wall (physical quaternion=%s)', physical => {
    const vessel = sample({ type: 'test_tube', ...(physical ? { rotationZ: 0,
      physicalMotion: { rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, .4, .5, 'YXZ')).toArray(),
        velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], tick: 0 } } : {}) });
    const target = stockLiquidTarget(vessel)!;
    expect(target).not.toBeNull(); expect(target.contactKind).toBe('wall');
    expect(target.mouth).toEqual(vesselLocalToWorld(vessel, [0, vesselInterior(vessel.type).topY, 0]));
    expect(target.outlet[0]).toBe(target.mouth[0]); expect(target.outlet[2]).toBe(target.mouth[2]);
    const contact = vesselWorldToLocal(vessel, target.contact);
    expect(Math.hypot(contact[0], contact[2])).toBeCloseTo(contourRadius(vesselInterior(vessel.type).points, contact[1]), 8);
  });

  it('rejects non-reservoir apparatus, invalid poses and downward-facing openings', () => {
    for (const type of ['tongs', 'test_tube_rack', 'hot_plate', 'retort_stand', 'condenser'] as VesselState['type'][])
      expect(stockReceiverProblem(sample({ type }))).not.toBeNull();
    for (const patch of [{ rotationZ: Math.PI }, { isSealed: true }, { isShattered: true }, { capacity_ml: NaN }])
      expect(stockLiquidTarget(sample(patch))).toBeNull();
    expect(stockReceiverProblem(sample({ isLocked: true }))).toBeNull();
  });

  it('keeps actual bottle lip and packet origin identical throughout release and accepts only after impact', () => {
    const target = stockLiquidTarget(sample(), STOCK_BOTTLE_CLEARANCE)!;
    for (const time of [STOCK_RELEASE_START_S, 1, 1.5, STOCK_RELEASE_END_S]) {
      const pose = stockBottleDosePose(time, target, 2.95);
      const lip = new THREE.Vector3(0, STOCK_BOTTLE_OUTLET_LOCAL_Y, 0)
        .applyAxisAngle(new THREE.Vector3(0, 0, 1), pose.angle).add(new THREE.Vector3(...pose.position)).toArray();
      lip.forEach((value, axis) => expect(value).toBeCloseTo(target.outlet[axis], 12));
      const packet = stockTargetLiquidPacket(time, target);
      expect(packet.start).toBe(target.outlet);
      expect(packet.start[1] + packet.vy * packet.flightTime - .5 * packet.gravity * packet.flightTime ** 2).toBeCloseTo(target.contact[1], 10);
    }
    const first = stockTargetLiquidPacket(STOCK_RELEASE_START_S, target);
    expect(stockTargetArrivedFraction(first.impactTime - 1e-6, target)).toBe(0);
    expect(stockTargetArrivedFraction(stockTargetLiquidPacket(STOCK_RELEASE_END_S, target).impactTime, target)).toBeCloseTo(1, 12);
  });

  it('uses the actual microdrop component pose and freezes a captured world-gravity flight', () => {
    const vessel = sample(), target = stockLiquidTarget(vessel)!, { tool, drop, contact } = mount(vessel, .12);
    step(46); tool.updateMatrixWorld();
    const outlet = tool.localToWorld(new THREE.Vector3(0, -.875, 0)).toArray();
    outlet.forEach((value, axis) => expect(value).toBeCloseTo(target.outlet[axis], 10));
    expect(drop!.visible).toBe(true);
    expect(drop!.position.x).toBe(target.outlet[0]); expect(drop!.position.z).toBe(target.outlet[2]);
    expect(contact).not.toHaveBeenCalled();
    useAppStore.setState({ isSimulationPaused: true }); const held = drop!.position.toArray(); step(120);
    expect(drop!.position.toArray()).toEqual(held);
  });

  it('renders a 2 mL continuous stream down the real opening from the rendered bottle outlet', () => {
    const vessel = sample(), target = stockLiquidTarget(vessel, STOCK_BOTTLE_CLEARANCE)!, { tool, stream } = mount(vessel, 2);
    step(60); tool.updateMatrixWorld();
    expect(stream!.visible).toBe(true);
    const lip = tool.localToWorld(new THREE.Vector3(0, STOCK_BOTTLE_OUTLET_LOCAL_Y, 0));
    expect(lip.x).toBeCloseTo(target.outlet[0], 10); expect(lip.y).toBeCloseTo(target.outlet[1], 10);
    const positions = stream!.geometry.getAttribute('position');
    for (let ring = 0; ring <= 24; ring++) {
      let x = 0, z = 0;
      for (let side = 0; side < 12; side++) { x += positions.getX(ring * 13 + side); z += positions.getZ(ring * 13 + side); }
      expect(x / 12).toBeCloseTo(target.outlet[0], 6); expect(z / 12).toBeCloseTo(target.outlet[2], 6);
    }
  });
});
