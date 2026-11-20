import { afterEach, describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { useAppStore } from '../src/store/useAppStore';
import { useToolDockStore } from '../src/handling/toolDock';
import { restingVesselHeight } from '../src/handling/vesselRest';
import { alignSelectedVessel } from '../src/handling/instrumentOperations';
import { relocateVesselStocks } from '../src/physical/stockRelocation';
import { sameStockKinematics } from '../src/physical/stockMassSync';
import { stockLocalMatrix } from '../src/physical/stockCoordinates';
import { stockContainer } from '../src/physical/stockAdapter';
import { StockWorld } from '../src/physical/StockWorld';
import { vesselLocalToWorld } from '../src/science/vesselScale';
import { scenePointToSI } from '../src/science/sceneUnits';
import type { VesselState } from '../src/types/chemistry';

const initial = useAppStore.getState();
const dock = useToolDockStore.getState();
afterEach(() => { useAppStore.setState(initial, true); useToolDockStore.setState(dock, true); });
const sample = (id = 'sample', type: VesselState['type'] = 'beaker', position: [number, number, number] = [3, -.135, 0]): VesselState => {
  const vessel: VesselState = { id, name: id, type, capacity_ml: 100, position, rotationY: 0, isLocked: false,
    mass_g: 5, volume_ml: 0, volume: 0, temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false,
    contents: [{ formula: 'CuSO4·5H2O', phase: 's', mass_g: 5, moles: 5 / 249.677 }], substances: ['CuSO4·5H2O'] };
  vessel.stockMotion = { tick: 24, grains: [{ id: 'stock:1', formula: 'CuSO4·5H2O', mass_g: 5, scale_m: .003,
    position_m: scenePointToSI(vesselLocalToWorld(vessel, [.1, -.8, -.1])), rotation: [0, 0, 0, 1],
    velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], sleeping: true, powder: false }] };
  return vessel;
};
const local = (vessel: VesselState) => stockLocalMatrix(vessel, vessel.stockMotion!.grains[0]).elements.slice(12, 15);
const expectSameLocal = (before: VesselState, after: VesselState) => local(after).forEach((coordinate, axis) => expect(coordinate).toBeCloseTo(local(before)[axis], 12));
function mount(vessels: Record<string, VesselState>) {
  useToolDockStore.setState({ positions: {}, dragging: null });
  useAppStore.setState({ vessels, vesselIds: Object.keys(vessels), selectedVesselId: 'sample', burners: {}, burnerIds: [],
    moveMode: false, draggingVesselId: null, isSimulationPaused: true, instrumentRinse: null, snapToGrid: false });
}

describe('explicit specimen relocation carries its existing finite stock', () => {
  it('aligns a stock-filled vessel below the burette without leaving the solid at the old bench position', () => {
    const before = sample(); mount({ sample: before });
    expect(alignSelectedVessel('burette').ok).toBe(true);
    const after = useAppStore.getState().vessels.sample;
    expect(after.position).toEqual([0, restingVesselHeight(after.type, after.capacity_ml), 0]); expectSameLocal(before, after);
    expect(after.contents).toBe(before.contents); expect(after.mass_g).toBe(before.mass_g);
    expect(after.stockMotion!.grains[0].id).toBe('stock:1');
    // This is the worker bridge's actual stale-reply gate. A pre-relocation
    // request can no longer restore old world coordinates over this placement.
    expect(sameStockKinematics(before.stockMotion, after.stockMotion)).toBe(false);
    expect(before.position).toEqual([3, -.135, 0]);
  });

  it('preserves stock when hot-plate and rack buttons relocate vessels while paused', () => {
    const before = sample(), plate = { ...sample('plate', 'hot_plate', [-3, -.135, 1]), contents: [], stockMotion: undefined };
    mount({ sample: before, plate });
    expect(useAppStore.getState().placeOnHotPlate('sample', 'plate')).toBe(true);
    expectSameLocal(before, useAppStore.getState().vessels.sample);
    const tube = sample('tube', 'test_tube'), rack = { ...sample('rack', 'test_tube_rack', [0, -.945, 2]), contents: [], stockMotion: undefined };
    mount({ tube, rack });
    useAppStore.getState().placeTestTubeInRack('rack', 'tube');
    const slotted = useAppStore.getState().vessels.tube; expectSameLocal(tube, slotted);
    expect(useAppStore.getState().vessels.rack.slottedTestTubeIds).toEqual(['tube']);
    useAppStore.getState().removeTestTubeFromRack('rack', 'tube');
    expectSameLocal(slotted, useAppStore.getState().vessels.tube);
  });

  it('rights a physically tilted vessel on the hot plate while retaining each carrier in the same glass-local frame', () => {
    const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), .35);
    const before = sample(); before.rotationZ = .35;
    before.physicalMotion = { tick: 4, rotation: rotation.toArray() as [number, number, number, number],
      velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0] };
    before.stockMotion!.grains[0] = { ...before.stockMotion!.grains[0],
      position_m: scenePointToSI(vesselLocalToWorld(before, [.1, -.8, -.1])), rotation: rotation.toArray() as [number, number, number, number] };
    const plate = { ...sample('plate', 'hot_plate', [-3, -.135, 1]), contents: [], stockMotion: undefined };
    mount({ sample: before, plate });
    expect(useAppStore.getState().placeOnHotPlate('sample', 'plate')).toBe(true);
    const after = useAppStore.getState().vessels.sample;
    expect(after.rotationZ).toBe(0); expect(after.physicalMotion).toBeUndefined();
    const originalMatrix = stockLocalMatrix(before, before.stockMotion!.grains[0]);
    const currentMatrix = stockLocalMatrix(after, after.stockMotion!.grains[0]);
    currentMatrix.elements.forEach((coordinate, index) => expect(coordinate).toBeCloseTo(originalMatrix.elements[index], 12));
  });

  it('honors explicit replacement stock poses rather than rebasing them a second time', () => {
    const before = sample(), replacement = { tick: 1, grains: [{ ...before.stockMotion!.grains[0], position_m: [-.07, -.02, 0] as [number, number, number] }] };
    mount({ sample: before });
    useAppStore.getState().setVesselState('sample', { position: [-2, -.135, 0], stockMotion: replacement });
    expect(useAppStore.getState().vessels.sample.stockMotion).toBe(replacement);
  });

  it('rebases every linked child for button relocation but leaves active Move carries to their existing boundary path', () => {
    const tube = sample('tube', 'test_tube', [-.65, -.495, 0]);
    const rack = { ...sample('rack', 'test_tube_rack', [0, -.945, 0]), contents: [], stockMotion: undefined, slottedTestTubeIds: ['tube'] };
    mount({ tube, rack });
    useAppStore.getState().setVesselState('rack', { position: [2, -.945, 1] });
    expectSameLocal(tube, useAppStore.getState().vessels.tube);
    const held = useAppStore.getState().vessels.tube;
    useAppStore.setState({ moveMode: true, draggingVesselId: 'rack' });
    useAppStore.getState().updateVesselPosition('rack', [3, -.945, 1]);
    expect(useAppStore.getState().vessels.tube.stockMotion).toBe(held.stockMotion);
  });

  it('rejects linked moves and rack insert/remove that would move or silently unlock a locked child', () => {
    const tube = { ...sample('tube', 'test_tube', [-.65, -.495, 0]), isLocked: true };
    const rack = { ...sample('rack', 'test_tube_rack', [0, -.945, 0]), slottedTestTubeIds: ['tube'] };
    mount({ tube, rack });
    useAppStore.getState().updateVesselPosition('rack', [2, -.945, 1]);
    expect(useAppStore.getState().vessels.rack).toBe(rack); expect(useAppStore.getState().vessels.tube).toBe(tube);
    useAppStore.getState().setVesselState('rack', { position: [2, -.945, 1] });
    expect(useAppStore.getState().vessels.rack).toBe(rack);
    useAppStore.setState({ selectedVesselId: 'rack' });
    useAppStore.getState().updateBurette({ position: [-3, 1, 0] });
    expect(alignSelectedVessel('burette').ok).toBe(false);
    expect(useAppStore.getState().vessels.rack).toBe(rack);
    useAppStore.getState().removeTestTubeFromRack('rack', 'tube');
    expect(useAppStore.getState().vessels.tube).toBe(tube);
    useAppStore.setState({ vessels: { tube, rack: { ...rack, slottedTestTubeIds: [] } } });
    useAppStore.getState().placeTestTubeInRack('rack', 'tube');
    expect(useAppStore.getState().vessels.tube).toBe(tube); expect(useAppStore.getState().vessels.tube.isLocked).toBe(true);
  });

  it('rejects an old uninitialized-worker branch and seeds finite grains at the new placement', async () => {
    const before = { ...sample(), stockMotion: undefined }, target = { ...before, position: [-2, -.135, 1] as [number, number, number] };
    const after = relocateVesselStocks({ sample: before }, { sample: target }).sample;
    expect(after.stockMotion).toEqual({ tick: 0, grains: [] });
    expect(sameStockKinematics(before.stockMotion, after.stockMotion)).toBe(false);
    const next = relocateVesselStocks({ sample: after }, { sample: { ...after, position: [2, -.135, 1] } }).sample;
    expect(sameStockKinematics(after.stockMotion, after.stockMotion)).toBe(true);
    expect(sameStockKinematics(after.stockMotion, next.stockMotion)).toBe(false);
    const world = await StockWorld.create();
    try {
      world.sync({ containers: [stockContainer(before, false)!], contacts: [], spills: [] });
      world.sync({ containers: [stockContainer(after, true)!], contacts: [], spills: [] });
      const poses = world.snapshot().grains;
      expect(poses.length).toBeGreaterThan(0);
      expect(poses.reduce((mass, grain) => mass + grain.pose.mass_g, 0)).toBeCloseTo(5, 10);
      expect(world.snapshot().escapes).toHaveLength(0);
      const averageX = poses.reduce((sum, grain) => sum + grain.pose.position_m[0], 0) / poses.length;
      expect(averageX).toBeCloseTo(scenePointToSI(after.position)[0], 3);
    } finally { world.free(); }
  });
});
