import { afterEach, describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { StockWorld } from '../src/physical/StockWorld';
import { stockContainer } from '../src/physical/stockAdapter';
import { scenePointToSI } from '../src/science/sceneUnits';
import { queueStockBoundaryFrame } from '../src/physical/stockBoundaryQueue';
import type { VesselState } from '../src/types/chemistry';
import type { StockWorldInput, StockBoundaryFrame } from '../src/physical/stockTypes';
import type { Vec3, Quat } from '../src/physical/types';

const worlds: StockWorld[] = [];
const empty: StockWorldInput = { containers: [], contacts: [], spills: [] };
const createWorld = async () => { const world = await StockWorld.create(); worlds.push(world); return world; };

afterEach(() => worlds.splice(0).forEach(world => world.free()));

function localGrainPositions(poses: { position_m: [number, number, number] }[], center: [number, number, number]) {
  return poses.map(pose => new Vector3(...pose.position_m).sub(new Vector3(...center)).toArray());
}

describe('relocating vessels without losing solid contents', () => {
  it('keeps grains inside through a fast drag, then resumes gravity after release', async () => {
    const world = await createWorld();
    const vessel = { id: 'sample', name: 'Sample beaker', type: 'beaker', capacity_ml: 100,
      position: [0, -0.135, 0], rotationY: 0, isLocked: false, volume_ml: 0, volume: 0,
      mass_g: 5, temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false,
      contents: [{ formula: 'CuSO4·5H2O', phase: 's', mass_g: 5, moles: 5 / 249.677 }],
      substances: ['CuSO4·5H2O'] } as VesselState;
    const container = stockContainer(vessel, false)!;
    world.sync({ ...empty, containers: [container] });
    let settled = world.snapshot();
    for (let i = 0; i < 30; i++) settled = world.advance(1 / 30, false);
    expect(settled.escapes).toHaveLength(0);
    const initial = settled.grains.map(grain => grain.pose);
    const target = scenePointToSI([2.4, 0.215, -1.7]);
    const rotation: [number, number, number, number] = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0).toArray() as [number, number, number, number];
    const frame = (carryStock: boolean, releaseStock = false) => ({ seconds: 0.1,
      containers: [{ id: vessel.id, position_m: target, rotation, carryStock, releaseStock }] });

    world.advanceBoundaryPath([frame(true)], false);
    const carried = world.snapshot();
    expect(carried.escapes).toHaveLength(0);
    expect(carried.grains).toHaveLength(initial.length);
    expect(carried.grains.reduce((sum, grain) => sum + grain.pose.mass_g, 0)).toBeCloseTo(5, 9);
    const afterCarry = localGrainPositions(carried.grains.map(grain => grain.pose), target);
    const beforeCarry = localGrainPositions(initial, scenePointToSI(vessel.position));
    for (let i = 0; i < beforeCarry.length; i++) for (let axis = 0; axis < 3; axis++)
      expect(afterCarry[i][axis]).toBeCloseTo(beforeCarry[i][axis], 6);

    world.advanceBoundaryPath([frame(true, true)], false);
    const released = world.snapshot();
    const afterRelease = world.advance(0.1, false);
    expect(afterRelease.grains).toHaveLength(initial.length);
    expect(afterRelease.escapes).toHaveLength(0);
    expect(afterRelease.grains.reduce((sum, grain) => sum + grain.pose.mass_g, 0)).toBeCloseTo(5, 9);
    expect(afterRelease.grains[0].pose.position_m[1]).toBeLessThanOrEqual(released.grains[0].pose.position_m[1] + 1e-5);
  });
});


const specimen = (wet = false) => ({ id: 'sample', type: 'beaker', capacity_ml: 100,
  position: [0, -0.135, 0], rotationY: 0, volume_ml: wet ? 50 : 0, volume: wet ? 0.5 : 0,
  mass_g: wet ? 55 : 5, temperature_c: 25,
  contents: [{ formula: wet ? 'Fe' : 'CuSO4·5H2O', phase: 's', mass_g: 5, moles: 5 / (wet ? 55.845 : 249.677) },
    ...(wet ? [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }] : [])],
  substances: wet ? ['Fe', 'H2O'] : ['CuSO4·5H2O'] } as VesselState);
const upright: Quat = [0, 0, 0, 1];

it.each([false, true])('preserves dry/wet stock throughout a long fast drag (wet=%s)', async wet => {
  const world = await createWorld(), vessel = specimen(wet), container = stockContainer(vessel, false)!;
  world.sync({ ...empty, containers: [container] });
  for (let i = 0; i < 60; i++) world.advance(1 / 30, false);
  const initial = world.snapshot();
  expect(initial.escapes).toHaveLength(0);
  const local = localGrainPositions(initial.grains.map(g => g.pose), container.position_m);
  for (let i = 1; i <= 30; i++) {
    const position_m = scenePointToSI([3 * Math.sin(i / 3), 0.215, i / 15]);
    const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), i / 30).toArray() as Quat;
    world.advanceBoundaryPath([{ seconds: 1 / 30, containers: [{ id: vessel.id, position_m, rotation, carryStock: true }] }], false);
    const result = world.snapshot();
    expect(result.escapes).toHaveLength(0);
    expect(result.grains.reduce((sum, g) => sum + g.pose.mass_g, 0)).toBeCloseTo(5, 9);
    for (let k = 0; k < result.grains.length; k++) {
      const relative = new Vector3(...result.grains[k].pose.position_m).sub(new Vector3(...position_m))
        .applyQuaternion(new Quaternion(...rotation).invert()).toArray();
      relative.forEach((x, axis) => expect(x).toBeCloseTo(local[k][axis], 6));
    }
  }
});

it('delivers a paused release queued while the worker is busy, then resumes free fall', async () => {
  const world = await createWorld(), vessel = specimen(), container = stockContainer(vessel, false)!;
  container.groups[0].seed.forEach(seed => { seed.position_m[1] += 0.015; });
  world.sync({ ...empty, containers: [container] });
  const initial = world.snapshot(), queue = { pending: 0, path: [] as StockBoundaryFrame[] };
  const position_m = scenePointToSI([2, -0.135, 1]);
  const lifted: Vec3 = [position_m[0], position_m[1] + 0.035, position_m[2]];
  queueStockBoundaryFrame(queue, { seconds: 1 / 60, containers: [{ id: vessel.id, position_m: lifted, rotation: upright, carryStock: true }] }, false);
  // Pause and release while the preceding worker request still owns its turn.
  queueStockBoundaryFrame(queue, { seconds: 1 / 60, containers: [{ id: vessel.id, position_m, rotation: upright, carryStock: true, releaseStock: true }] }, true);
  for (let i = 0; i < 10; i++) queueStockBoundaryFrame(queue,
    { seconds: 1 / 60, containers: [{ id: vessel.id, position_m, rotation: upright }] }, true);
  world.advanceBoundaryPath(queue.path, true);
  const placed = world.snapshot();
  expect(placed.tick).toBe(initial.tick);
  expect(queue.pending).toBe(0);
  expect(placed.containers[0].carryStock).toBe(false);
  placed.containers[0].position_m.forEach((x, axis) => expect(x).toBeCloseTo(position_m[axis], 7));
  const before = localGrainPositions(initial.grains.map(g => g.pose), container.position_m);
  const after = localGrainPositions(placed.grains.map(g => g.pose), position_m);
  after.forEach((p, i) => p.forEach((x, axis) => expect(x).toBeCloseTo(before[i][axis], 6)));
  const resumed = world.advance(1 / 30, false);
  expect(resumed.grains[0].pose.position_m[1]).toBeLessThan(placed.grains[0].pose.position_m[1] - 0.001);
  expect(resumed.escapes).toHaveLength(0);
});

it('still releases dry stock through the mouth during deliberate pouring after a move', async () => {
  const world = await createWorld(), vessel = specimen(), container = stockContainer(vessel, false)!;
  world.sync({ ...empty, containers: [container] });
  for (let i = 0; i < 30; i++) world.advance(1 / 30, false);
  const position_m = scenePointToSI([2, 1.2, 1]);
  world.advanceBoundaryPath([{ seconds: 1 / 30, containers: [{ id: vessel.id, position_m, rotation: upright, carryStock: true, releaseStock: true }] }], false);
  let escaped = 0;
  for (let i = 1; i <= 90; i++) {
    const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI * Math.min(1, i / 30)).toArray() as Quat;
    world.advanceBoundaryPath([{ seconds: 1 / 30, containers: [{ id: vessel.id, position_m, rotation }] }], false);
    escaped = Math.max(escaped, world.snapshot().escapes.length);
  }
  expect(escaped).toBeGreaterThan(0);
});
