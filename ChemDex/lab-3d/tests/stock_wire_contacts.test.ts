import { afterEach, expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import { StockWorld } from '../src/physical/StockWorld';
import { stockCarrierCoatings, stockContainer, stockGeometry, stockGroup } from '../src/physical/stockAdapter';
import { vesselLocalToWorld } from '../src/science/vesselScale';
import { vesselInterior } from '../src/science/vesselDimensions';
import type { StockGrainPose } from '../src/physical/stockTypes';
import type { VesselState } from '../src/types/chemistry';
import type { Capsule, World as RapierWorld } from '@dimforge/rapier3d-compat';

const worlds: StockWorld[] = [];
afterEach(() => worlds.splice(0).forEach(world => world.free()));
const fixture = (mass_g = 0.0052955, rotation = new Quaternion(), speed = 0, coat = 0) => {
  const sample = { id: 'wire', type: 'beaker', capacity_ml: 100, position: [0, 1.04, 0], volume_ml: 0,
    mass_g: mass_g + coat, contents: [{ formula: 'Cu', phase: 's', mass_g, moles: mass_g / 63.546 }] } as VesselState;
  if (coat) sample.contents.push({ formula: 'Ag', phase: 's', solidOrigin: 'precipitate', mass_g: coat, moles: coat / 107.8682,
    depositSubstrate: 'Cu', depositCarrierId: 'wire:1', depositionReactionId: 'cu_agno3' });
  const floor = vesselLocalToWorld(sample, [0, vesselInterior(sample.type).floorY, 0])[1] * 0.035;
  const pose: StockGrainPose = { id: 'wire:1', formula: 'Cu', mass_g, scale_m: Math.cbrt(mass_g / 8.96 * 1e-6),
    position_m: [0, floor + 0.008, 0], rotation: rotation.toArray(), velocity_m_s: [0, -speed, 0],
    angularVelocity_rad_s: [0, 0, 0], sleeping: false, powder: false };
  sample.stockMotion = { tick: 0, grains: [pose] };
  return { sample, floor };
};
const lowestVertex = (pose: StockGrainPose) => {
  const vertices = stockGeometry('Cu').getAttribute('position'), q = new Quaternion(...pose.rotation), point = new Vector3();
  let lowest = Infinity;
  for (let i = 0; i < vertices.count; i++) lowest = Math.min(lowest,
    point.fromBufferAttribute(vertices, i).multiplyScalar(pose.scale_m).applyQuaternion(q).y + pose.position_m[1]);
  return lowest;
};

it('supports copper wire at several orientations, sizes and arrival speeds without crossing the glass floor', async () => {
  for (const [mass, tilt, speed] of [[0.0052955, 0, 0], [0.0052955, 0, 0.66], [0.0052955, 1.2, 1.2],
    [0.001, 0.7, 0.66], [0.05, 1.55, 0.1]]) {
    const world = await StockWorld.create(); worlds.push(world);
    const { sample, floor } = fixture(mass, new Quaternion().setFromEuler(new Euler(tilt, 0.3, tilt / 2)), speed);
    world.sync({ containers: [stockContainer(sample, true)!], contacts: [], spills: [] });
    let final = world.snapshot();
    for (let i = 0; i < 240; i++) {
      final = world.advance(1 / 120, false);
      expect(final.escapes).toHaveLength(0);
      expect(lowestVertex(final.grains[0].pose)).toBeGreaterThan(floor - 0.00005);
    }
    expect(final.grains[0].pose.contacting, JSON.stringify({ mass, tilt, speed, final: final.grains[0].pose,
      clearance: lowestVertex(final.grains[0].pose) - floor })).toBe(true);
    expect(Math.hypot(...final.grains[0].pose.velocity_m_s)).toBeLessThan(0.005);
    expect(lowestVertex(final.grains[0].pose) - floor).toBeLessThan(0.00005);
    expect(final.grains[0].pose.mass_g).toBe(mass);
  }
});

it('keeps the candidate contacts local for twelve separated copper turnings', async () => {
  const world = await StockWorld.create(); worlds.push(world);
  const { sample } = fixture(0.1);
  sample.stockMotion = undefined;
  world.sync({ containers: [stockContainer(sample, false)!], contacts: [], spills: [] });
  const snapshot = world.advance(1 / 60, false);
  expect(snapshot.grains).toHaveLength(12);
  const engine = (world as unknown as { world: RapierWorld }).world;
  let candidates = 0;
  engine.colliders.forEach(collider => engine.contactPairsWith(collider, () => candidates++));
  // The metre-scale broad-phase margin previously made 183,816 directed
  // pairs here, although these millimetre coils have separated envelopes.
  // A local candidate bound catches that regression without timing the CPU.
  expect(candidates).toBeLessThan(engine.colliders.len() * 16);
});

it('counts the full coated wire weight once and captures a wire through any supporting segment', async () => {
  const world = await StockWorld.create(); worlds.push(world);
  const { sample } = fixture(0.0052955, new Quaternion(), 0.66, 0.003);
  const input = stockContainer(sample, true)!;
  world.sync({ containers: [input], contacts: [], spills: [] });
  for (let i = 0; i < 180; i++) world.advance(1 / 120, false);
  const loaded = world.advance(1 / 30, false);
  expect(loaded.grains[0].pose.contacting).toBe(true);
  expect(Math.abs(loaded.reactions[0].impulse_Ns[1] / (-sample.mass_g / 1000 * 9.80665 / 30) - 1)).toBeLessThan(0.02);
  expect(loaded.grains[0].pose.mass_g).toBe(0.0052955);
  const spilled = { ...loaded.grains[0].pose, vesselId: sample.id, group: input.groups[0] };
  world.markEscaped([spilled.id]);
  const receiver = { ...sample, contents: [], mass_g: 0, stockMotion: undefined };
  world.sync({ containers: [stockContainer(receiver, false)!], contacts: [], spills: [spilled] });
  expect(world.advance(1 / 120, false).captures[0]?.pose.id).toBe(spilled.id);
});

it('keeps shrinkage and resting load accurate across many individually subresolution updates', async () => {
  const world = await StockWorld.create(); worlds.push(world);
  const { sample, floor } = fixture();
  world.sync({ containers: [stockContainer(sample, true)!], contacts: [], spills: [] });
  for (let i = 0; i < 120; i++) world.advance(1 / 120, false);
  const initialMass = sample.contents[0].mass_g;
  for (let step = 1; step <= 200; step++) {
    const mass_g = initialMass * (1 - step * 0.0005);
    sample.mass_g = mass_g;
    sample.contents[0] = { ...sample.contents[0], mass_g, moles: mass_g / 63.546 };
    sample.stockMotion = { tick: step, grains: world.snapshot().grains.map(grain => ({ ...grain.pose, mass_g })) };
    world.sync({ containers: [stockContainer(sample, false)!], contacts: [], spills: [] });
    world.advance(1 / 120, false);
  }
  for (let i = 0; i < 120; i++) world.advance(1 / 120, false);
  const result = world.advance(1 / 30, false), pose = result.grains[0].pose;
  expect(pose.mass_g).toBe(initialMass * 0.9);
  expect(pose.scale_m).toBeCloseTo(Math.cbrt(pose.mass_g / 8.96 * 1e-6), 12);
  expect(pose.contacting).toBe(true);
  expect(Math.abs(lowestVertex(pose) - floor)).toBeLessThan(0.00005);
  expect(Math.abs(result.reactions[0].impulse_Ns[1] / (-sample.mass_g / 1000 * 9.80665 / 30) - 1)).toBeLessThan(0.002);
});

it('keeps finite silver on a nearly exhausted copper carrier within a finite contact envelope', async () => {
  const world = await StockWorld.create(); worlds.push(world);
  const { sample, floor } = fixture(1e-11, new Quaternion(), 0, 0.003);
  const input = stockContainer(sample, true)!;
  // The worker can receive an individual nearly exhausted carrier while
  // other grains still keep the macroscopic Cu row above the adapter cutoff.
  const group = stockGroup('Cu', 1e-11)!;
  group.carrierCoatings = stockCarrierCoatings(sample, 'Cu');
  input.groups = [group];
  world.sync({ containers: [input], contacts: [], spills: [] });
  const engine = (world as unknown as { world: RapierWorld }).world;
  engine.bodies.forEach(body => {
    if (!body.isDynamic()) return;
    for (let i = 0; i < body.numColliders(); i++) {
      const radius_m = (body.collider(i).shape as Capsule).radius / 100;
      expect(radius_m).toBeGreaterThan(0.0003);
      expect(radius_m).toBeLessThan(0.0005);
    }
  });
  for (let i = 0; i < 240; i++) world.advance(1 / 120, false);
  const result = world.advance(1 / 30, false), pose = result.grains[0].pose;
  expect(result.escapes).toHaveLength(0);
  expect(pose.contacting).toBe(true);
  expect(pose.mass_g).toBe(1e-11);
  expect(pose.position_m[1] - floor).toBeGreaterThan(0.0002);
  expect(pose.position_m[1] - floor).toBeLessThan(0.0006);
  expect(Math.abs(result.reactions[0].impulse_Ns[1] / (-sample.mass_g / 1000 * 9.80665 / 30) - 1)).toBeLessThan(0.002);
});
