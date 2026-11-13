import { afterEach, describe, expect, it } from 'vitest';
import { benchObstacles, benchRadius, findBenchPosition, BENCH_CLEARANCE } from '../src/core/benchPlacement';
import { LAB_GEOMETRY } from '../src/core/labGeometry';
import { useAppStore } from '../src/store/useAppStore';
import { useToolDockStore } from '../src/handling/toolDockState';
import { stowInstrument } from '../src/handling/instrumentOperations';

const initial = useAppStore.getState(), dockInitial = useToolDockStore.getState();
afterEach(() => { useAppStore.setState(initial, true); useToolDockStore.setState(dockInitial, true); });
function emptyBench() {
  useToolDockStore.setState({ positions: {}, deployed: {}, dragging: null });
  useAppStore.setState({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeTool: 'none',
    pendingReactions: {}, activeKinetics: {}, inFlightPours: [], pouringChemical: null });
}

describe('Workbench insertion uses actual occupied space', () => {
  it('packs repeated mixed additions inside the table with clearance and stops when full', () => {
    const obstacles = benchObstacles({}, {});
    let count = 0;
    for (let i = 0; i < 180; i++) {
      const type = ['beaker', 'flask', 'cylinder', 'test_tube', 'burner', 'watch_glass'][i % 6];
      const capacity = i % 3 === 0 ? 500 : 100;
      const point = findBenchPosition(type, capacity, obstacles);
      if (!point) break;
      const radius = benchRadius(type, capacity);
      expect(Math.abs(point[0]) + radius).toBeLessThanOrEqual(LAB_GEOMETRY.tableHalfWidth_scene);
      expect(Math.abs(point[2]) + radius).toBeLessThanOrEqual(LAB_GEOMETRY.tableHalfDepth_scene);
      for (const other of obstacles) expect(Math.hypot(point[0] - other.x, point[2] - other.z))
        .toBeGreaterThanOrEqual(radius + other.radius + BENCH_CLEARANCE - 1e-10);
      obstacles.push({ x: point[0], z: point[2], radius }); count++;
    }
    expect(count).toBeGreaterThan(15); expect(count).toBeLessThan(180);
    expect(findBenchPosition('beaker', 1e12, obstacles)).toBeNull();
  });
  it('uses moved objects and vacancies rather than total item count', () => {
    emptyBench();
    const state = useAppStore.getState(); state.addVessel('beaker');
    const first = Object.values(useAppStore.getState().vessels)[0];
    state.addVessel('flask');
    state.removeVessel(first.id); state.addVessel('beaker');
    const added = useAppStore.getState().vessels[useAppStore.getState().selectedVesselId!];
    expect(added.position).toEqual(first.position);
    state.duplicateVessel(added.id);
    const copy = useAppStore.getState().vessels[useAppStore.getState().selectedVesselId!];
    expect(Math.hypot(copy.position[0] - added.position[0], copy.position[2] - added.position[2]))
      .toBeGreaterThanOrEqual(2 * benchRadius('beaker', added.capacity_ml) + BENCH_CLEARANCE);
  });
  it('rapidly adds unique unlit lamps without overwriting or overlapping them', () => {
    useAppStore.getState().resetWorkbench();
    const defaults = benchObstacles(useAppStore.getState().vessels, useAppStore.getState().burners);
    for (let i = 0; i < defaults.length; i++) for (let j = 0; j < i; j++)
      expect(Math.hypot(defaults[i].x - defaults[j].x, defaults[i].z - defaults[j].z))
        .toBeGreaterThanOrEqual(defaults[i].radius + defaults[j].radius + BENCH_CLEARANCE);
    emptyBench();
    for (let i = 0; i < 15; i++) useAppStore.getState().addBurner();
    const lamps = Object.values(useAppStore.getState().burners);
    expect(lamps).toHaveLength(15);
    for (let i = 0; i < lamps.length; i++) {
      expect(lamps[i].isOn).toBe(false);
      expect(lamps[i].position[1] - 0.105).toBeCloseTo(LAB_GEOMETRY.tableTop_scene, 12);
      for (let j = 0; j < i; j++) expect(Math.hypot(lamps[i].position[0] - lamps[j].position[0], lamps[i].position[2] - lamps[j].position[2]))
        .toBeGreaterThanOrEqual(2 * benchRadius('burner') + BENCH_CLEARANCE - 1e-10);
    }
  });
  it('does not deploy measurement tools from move mode and can stow a used tool', () => {
    emptyBench();
    useAppStore.getState().setMoveMode(true);
    expect(useToolDockStore.getState().deployed).toEqual({});
    useAppStore.getState().setActiveTool('thermometer');
    const firstPosition = useToolDockStore.getState().positions.thermometer;
    expect(useToolDockStore.getState().deployed.thermometer).toBe(true);
    useAppStore.getState().setActiveTool('thermometer');
    expect(useToolDockStore.getState().positions.thermometer).toEqual(firstPosition);
    expect(stowInstrument('thermometer').ok).toBe(true);
    expect(useAppStore.getState().activeTool).toBe('none');
    expect(useToolDockStore.getState().deployed.thermometer).toBe(false);
  });
});
