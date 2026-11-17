import { afterEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { moveCarriedVesselIds } from '../src/physical/carriedVessels';
import { StockWorld } from '../src/physical/StockWorld';
import { stockContainer } from '../src/physical/stockAdapter';
import { Vector3 } from 'three';
import type { BurnerState, VesselState } from '../src/types/chemistry';

const initial = useAppStore.getState();
const vessel = (id: string, type: VesselState['type'] = 'beaker', position: [number, number, number] = [0, -.135, 0]): VesselState => ({
  id, name: id, type, position, capacity_ml: 100, rotationY: 0, isLocked: false,
  volume_ml: 0, volume: 0, mass_g: 5, temperature_c: 25, ph: 7,
  hasGas: false, hasPrecipitate: false, isBoiling: false,
  contents: [{ formula: 'CuSO4·5H2O', phase: 's', mass_g: 5, moles: 5 / 249.677 }], substances: ['CuSO4·5H2O'],
});
afterEach(() => useAppStore.setState(initial, true));
function setup(vessels: Record<string, VesselState>, burners: Record<string, BurnerState> = {}) {
  useAppStore.setState({ vessels, vesselIds: Object.keys(vessels), burners, burnerIds: Object.keys(burners),
    moveMode: true, draggingVesselId: null, nearestPourTargetId: 'receiver', pouringChemical: null,
    stockDosePending: false, isSimulationPaused: true, mixError: null });
}
function assembly(kind: 'rack' | 'tongs' | 'flask' | 'burner') {
  const child = vessel('child', kind === 'rack' ? 'test_tube' : kind === 'flask' ? 'filter_funnel' : 'beaker', [0, 1.2, 0]);
  const root = vessel('root', kind === 'rack' ? 'test_tube_rack' : kind === 'tongs' ? 'tongs' : 'flask');
  if (kind === 'rack') root.slottedTestTubeIds = [child.id];
  if (kind === 'tongs') root.grippedVesselId = child.id;
  const burner = { id: 'burner_test', position: [0, -1.175, 0] } as BurnerState;
  setup(kind === 'burner' ? { child } : { root, child }, kind === 'burner' ? { [burner.id]: burner } : {});
  return { child, heldId: kind === 'burner' ? burner.id : root.id };
}

describe('Move gestures end as one glass and stock carry', () => {
  it('releases the held assembly and target together when Move is switched off', () => {
    const { child, heldId } = assembly('rack');
    const state = useAppStore.getState(); state.setDraggingVesselId(heldId);
    const before = useAppStore.getState();
    expect(moveCarriedVesselIds(before).has(child.id)).toBe(true);
    state.setMoveMode(false);
    const after = useAppStore.getState();
    expect(after.draggingVesselId).toBeNull();
    expect(after.nearestPourTargetId).toBeNull();
    expect(moveCarriedVesselIds(after).size).toBe(0);
    expect(after.vessels).toBe(before.vessels);
    expect(after.isSimulationPaused).toBe(true);
    state.setMoveMode(true);
    expect(useAppStore.getState().draggingVesselId).toBeNull();
  });

  it('rejects a locked vessel even through direct keyboard or touch pickup actions', () => {
    const locked = { ...vessel('locked'), isLocked: true };
    setup({ locked });
    useAppStore.getState().setMoveMode(false);
    useAppStore.getState().setDraggingVesselId(locked.id);
    expect(useAppStore.getState().draggingVesselId).toBeNull();
    expect(useAppStore.getState().vessels.locked).toBe(locked);
  });

  it('releases finite grains with the final resting glass boundary when Move ends', async () => {
    const sample = vessel('sample'); setup({ sample });
    const world = await StockWorld.create();
    try {
      const original = stockContainer(sample, false)!;
      world.sync({ containers: [original], contacts: [], spills: [] });
      for (let i = 0; i < 30; i++) world.advance(1 / 30, false);
      const before = world.snapshot();
      const local = before.grains.map(grain => new Vector3(...grain.pose.position_m).sub(new Vector3(...original.position_m)));
      const state = useAppStore.getState(); state.setDraggingVesselId(sample.id);
      state.updateVesselPosition(sample.id, [2, sample.position[1], 1]);
      const held = useAppStore.getState(), heldPose = stockContainer({ ...held.vessels.sample,
        position: [2, sample.position[1] + .35, 1] }, false)!;
      const previousCarry = moveCarriedVesselIds(held);
      world.advanceBoundaryPath([{ seconds: .1, containers: [{ id: sample.id, position_m: heldPose.position_m,
        rotation: heldPose.rotation, carryStock: previousCarry.has(sample.id) }] }], false);
      state.setMoveMode(false);
      const after = useAppStore.getState(), rest = stockContainer(after.vessels.sample, false)!;
      const currentCarry = moveCarriedVesselIds(after);
      expect(after.draggingVesselId).toBeNull();
      world.advanceBoundaryPath([{ seconds: 0, containers: [{ id: sample.id, position_m: rest.position_m,
        rotation: rest.rotation, carryStock: previousCarry.has(sample.id) || currentCarry.has(sample.id),
        releaseStock: previousCarry.has(sample.id) && !currentCarry.has(sample.id) }] }], true);
      const placed = world.snapshot();
      expect(placed.containers[0].carryStock).toBe(false);
      expect(placed.escapes).toHaveLength(0); expect(placed.grains).toHaveLength(before.grains.length);
      expect(placed.grains.reduce((sum, grain) => sum + grain.pose.mass_g, 0)).toBeCloseTo(5, 10);
      placed.grains.forEach((grain, index) => new Vector3(...grain.pose.position_m).sub(new Vector3(...rest.position_m))
        .toArray().forEach((coordinate, axis) => expect(coordinate).toBeCloseTo(local[index].getComponent(axis), 6)));
    } finally { world.free(); }
  });

  it.each(['rack', 'tongs', 'flask', 'burner'] as const)('rejects picking up a %s with a position-locked linked sample', kind => {
    const { child, heldId } = assembly(kind);
    useAppStore.getState().toggleLockVessel(child.id);
    useAppStore.getState().setDraggingVesselId(heldId);
    expect(useAppStore.getState().draggingVesselId).toBeNull();
    expect(useAppStore.getState().vessels[child.id].position).toEqual(child.position);
  });

  it.each(['rack', 'tongs', 'flask', 'burner'] as const)('ends a whole %s carry when the header locks its selected child', kind => {
    const { child, heldId } = assembly(kind);
    const state = useAppStore.getState(); state.setDraggingVesselId(heldId);
    expect(useAppStore.getState().draggingVesselId).toBe(heldId);
    state.toggleLockVessel(child.id);
    const after = useAppStore.getState();
    expect(after.vessels[child.id].isLocked).toBe(true);
    expect(after.draggingVesselId).toBeNull();
    expect(after.nearestPourTargetId).toBeNull();
    expect(after.moveMode).toBe(true); expect(after.isSimulationPaused).toBe(true);
    expect(after.vessels[child.id].contents).toBe(child.contents);
  });

  it('leaves an unrelated carry active when another vessel is locked or unlocked', () => {
    const held = vessel('held'), other = vessel('other', 'beaker', [4, -.135, 0]);
    setup({ held, other });
    const state = useAppStore.getState(); state.setDraggingVesselId(held.id);
    state.toggleLockVessel(other.id); state.toggleLockVessel(other.id);
    expect(useAppStore.getState().draggingVesselId).toBe(held.id);
    expect(useAppStore.getState().nearestPourTargetId).toBe('receiver');
  });

  it('clears stale target recognition through keyboard/touch release, including an already-released vessel', () => {
    const sample = vessel('sample'); setup({ sample });
    const state = useAppStore.getState(); state.setDraggingVesselId(sample.id);
    state.setDraggingVesselId(null);
    expect(useAppStore.getState().draggingVesselId).toBeNull();
    expect(useAppStore.getState().nearestPourTargetId).toBeNull();
    state.setNearestPourTargetId('old-target');
    state.setDraggingVesselId(null);
    expect(useAppStore.getState().nearestPourTargetId).toBeNull();
    const released = useAppStore.getState(); state.setDraggingVesselId(null);
    expect(useAppStore.getState()).toBe(released);
    expect(released.vessels.sample).toBe(sample);
  });
});
