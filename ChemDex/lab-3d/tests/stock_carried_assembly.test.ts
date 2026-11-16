import { afterEach, describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { moveCarriedVesselIds } from '../src/physical/carriedVessels';
import { StockWorld } from '../src/physical/StockWorld';
import { stockContainer } from '../src/physical/stockAdapter';
import { useAppStore } from '../src/store/useAppStore';
import type { VesselState } from '../src/types/chemistry';

const initial = useAppStore.getState();
const worlds: StockWorld[] = [];
afterEach(() => { worlds.splice(0).forEach(world => world.free()); useAppStore.setState(initial, true); });
const vessel = (id: string, type = 'beaker', x = 0, y = -.135) => ({ id, name: id, type, capacity_ml: 100,
  position: [x, y, 0], rotationY: 0, isLocked: false, mass_g: 5, volume_ml: 0, volume: 0,
  temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false,
  contents: [{ formula: 'CuSO4·5H2O', phase: 's', mass_g: 5, moles: 5 / 249.677 }], substances: ['CuSO4·5H2O'] } as VesselState);

describe('moving complete apparatus with its finite samples', () => {
  it('holds the same linked vessels that move with racks, tongs, burners and mounted funnels', () => {
    const sample = vessel('sample', 'test_tube', -2, .8), loose = vessel('loose', 'test_tube', 4);
    const rack = { ...vessel('rack', 'test_tube_rack', -2), slottedTestTubeIds: ['sample'] };
    const tongs = { ...vessel('tongs', 'tongs', -1), grippedVesselId: 'sample' };
    const flask = vessel('flask', 'flask', 1);
    const funnel = vessel('funnel', 'filter_funnel', 1.1, flask.position[1] + 1.35);
    const state = { moveMode: true, draggingVesselId: 'rack', vessels: { sample, loose, rack, tongs, flask, funnel }, burners: {} };
    expect([...moveCarriedVesselIds(state)]).toEqual(['rack', 'sample']);
    expect(moveCarriedVesselIds({ ...state, draggingVesselId: 'tongs' }).has('sample')).toBe(true);
    expect(moveCarriedVesselIds({ ...state, draggingVesselId: 'flask' }).has('funnel')).toBe(true);
    const burner = { ...initial.burners[initial.burnerIds[0]], id: 'burner_test', position: [-2, -1.175, 0] as [number, number, number] };
    expect([...moveCarriedVesselIds({ ...state, draggingVesselId: burner.id, burners: { [burner.id]: burner } })]).toEqual(['sample']);
    expect(moveCarriedVesselIds({ ...state, moveMode: false }).size).toBe(0);
    expect(moveCarriedVesselIds({ ...state, draggingVesselId: null }).size).toBe(0);
  });

  it('preserves every tube grain through a fast rack relocation and releases all carry holds afterwards', async () => {
    const rack = { ...vessel('rack', 'test_tube_rack', 0, -.945), slottedTestTubeIds: ['sample'] };
    const sample = vessel('sample', 'test_tube', 0, -.495);
    const world = await StockWorld.create(); worlds.push(world);
    const original = stockContainer(sample, false)!;
    world.sync({ containers: [original], contacts: [], spills: [] });
    for (let i = 0; i < 30; i++) world.advance(1 / 30, false);
    const settled = world.snapshot();
    expect(settled.escapes).toHaveLength(0);
    const local = settled.grains.map(grain => new Vector3(...grain.pose.position_m).sub(new Vector3(...original.position_m)));
    useAppStore.setState({ vessels: { rack, sample }, vesselIds: ['rack', 'sample'], moveMode: true, draggingVesselId: 'rack', snapToGrid: false });
    useAppStore.getState().updateVesselPosition('rack', [3, rack.position[1], 2]);
    const live = useAppStore.getState(), moved = stockContainer(live.vessels.sample, false)!;
    expect(live.vessels.sample.position).toEqual([3, sample.position[1], 2]);
    const carried = moveCarriedVesselIds(live);
    world.advanceBoundaryPath([{ seconds: .1, containers: [{ id: sample.id, position_m: moved.position_m,
      rotation: moved.rotation, carryStock: carried.has(sample.id) }] }], false);
    const result = world.snapshot();
    expect(result.escapes).toHaveLength(0);
    expect(result.grains).toHaveLength(settled.grains.length);
    result.grains.forEach((grain, i) => new Vector3(...grain.pose.position_m).sub(new Vector3(...moved.position_m)).toArray()
      .forEach((coordinate, axis) => expect(coordinate).toBeCloseTo(local[i].getComponent(axis), 6)));
    world.advanceBoundaryPath([{ seconds: 0, containers: [{ id: sample.id, position_m: moved.position_m,
      rotation: moved.rotation, carryStock: true, releaseStock: true }] }], true);
    expect(world.snapshot().containers[0].carryStock).toBe(false);
    expect(world.advance(.1, false).escapes).toHaveLength(0);
  });

  it('closes the burette when entering Move and stops an active vessel drag when the header locks it', () => {
    const sample = vessel('sample');
    useAppStore.setState({ vessels: { sample }, vesselIds: ['sample'], moveMode: false, draggingVesselId: 'sample',
      nearestPourTargetId: 'other', burette: { ...initial.burette, isDispensing: true } });
    useAppStore.getState().setMoveMode(true);
    expect(useAppStore.getState().burette.isDispensing).toBe(false);
    useAppStore.getState().setMoveMode(false);
    expect(useAppStore.getState().burette.isDispensing).toBe(false);
    useAppStore.getState().toggleLockVessel('sample');
    expect(useAppStore.getState().vessels.sample.isLocked).toBe(true);
    expect(useAppStore.getState().draggingVesselId).toBeNull();
    expect(useAppStore.getState().nearestPourTargetId).toBeNull();
    useAppStore.getState().updateVesselPosition('sample', [9, 9, 9]);
    expect(useAppStore.getState().vessels.sample.position).toEqual(sample.position);
    useAppStore.getState().toggleLockVessel('sample');
    useAppStore.getState().updateVesselPosition('sample', [2, -.135, 0]);
    expect(useAppStore.getState().vessels.sample.position[0]).toBe(2);
  });
});
