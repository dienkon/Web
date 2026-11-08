import { afterEach, describe, expect, it } from 'vitest';
import { BoxGeometry, Quaternion, Euler, Vector3 } from 'three';
import { StockWorld } from '../src/physical/StockWorld';
import { stockContainer, stockGroup, stockGeometry } from '../src/physical/stockAdapter';
import { createPowderContactGeometry } from '../src/components/three/powderContactGeometry';
import { geometryVolume } from '../src/components/three/stockSolidGeometry';
import { escapeStockGrain } from '../src/physical/stockEscape';
import { CONSTANTS } from '../src/core/units';
import { METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';
import { vesselBodyTransform } from '../src/science/vesselScale';
import { vesselInterior } from '../src/science/vesselDimensions';
import { publishStockPresentation, presentedStockPose, clearStockPresentation } from '../src/physical/stockPresentation';
import type { StockContainerInput, StockWorldInput } from '../src/physical/stockTypes';
import type { VesselState } from '../src/types/chemistry';

const runtimes: StockWorld[] = [];
afterEach(() => runtimes.splice(0).forEach(r => r.free()));
const create = async () => { const r = await StockWorld.create(); runtimes.push(r); return r; };
const empty: StockWorldInput = { containers: [], contacts: [], spills: [] };
const cube = new BoxGeometry(1, 1, 1);
const laboratory = (): StockContainerInput => ({ id: 'fixture', shapeKey: 'none', colliders: [], position_m: [0, 0, 0], rotation: [0, 0, 0, 1], restore: false,
  groups: [{ formula: 'reference', mass_g: 1, density_kg_m3: 1000, powder: false, unitVolume: 1,
    vertices: Array.from(cube.getAttribute('position').array), seed: [{ position_m: [0, 1, 0], rotation: [0, 0, 0, 1] }] }] });

describe('finite stock contacts, independent of drawing', () => {
  it('matches free fall and preserves the same 120 physical ticks at 20/30/60/120 FPS', async () => {
    const results = [];
    for (const fps of [20, 30, 60, 120]) {
      const r = await create(), input = { ...empty, containers: [laboratory()] }; r.sync(input);
      for (let i = 0; i < fps / 10; i++) r.advance(1 / fps, false);
      const snapshot = r.snapshot(), grain = snapshot.grains[0].pose;
      expect(snapshot.tick).toBe(12);
      expect(Math.abs((1 - grain.position_m[1]) / (0.5 * CONSTANTS.g * 0.1 ** 2) - 1)).toBeLessThan(0.01);
      results.push(grain);
    }
    expect(results.every(p => Math.abs(p.position_m[1] - results[0].position_m[1]) < 1e-7)).toBe(true);
  });
  it('collides two independently moving grains with equal/opposite impulse', async () => {
    const r = await create(), v = laboratory(); v.groups[0].mass_g = 2;
    v.saved = [-1, 1].map((sign, i) => ({ id: `stock:${i + 1}`, formula: 'reference', mass_g: 1, scale_m: 0.01,
      position_m: [sign * 0.015, 1, 0], rotation: [0, 0, 0, 1], velocity_m_s: [-sign * 0.3, 0, 0], angularVelocity_rad_s: [0, 0, 0], sleeping: false, powder: false }));
    r.sync({ ...empty, containers: [v] });
    const result = r.advance(0.1, false).grains.map(g => g.pose);
    expect(result[0].velocity_m_s[0]).toBeLessThan(0);
    expect(result[1].velocity_m_s[0]).toBeGreaterThan(0);
    expect(result.reduce((p, g) => p + g.mass_g / 1000 * g.velocity_m_s[0], 0)).toBeCloseTo(0, 8);
    expect(result.reduce((e, g) => e + g.mass_g / 1000 * g.velocity_m_s[0] ** 2 / 2, 0)).toBeLessThan(0.001 * 0.3 ** 2);
  });
  it('drains accepted slow-frame/time-scale time without shortening the physical interval', async () => {
    const a = await create(), b = await create(), v = laboratory(); v.groups[0].seed[0].position_m[1] = 10;
    a.sync({ ...empty, containers: [v] }); b.sync({ ...empty, containers: [v] });
    const batch = a.advance(0.1 * 5, false);
    for (let i = 0; i < 15; i++) b.advance(1 / 30, false);
    expect(batch.tick).toBe(60); expect(batch.grains).toEqual(b.snapshot().grains);
  });
  it('waits for chemistry acknowledgement and never replays a contact dose', async () => {
    const r = await create(), v = laboratory();
    const receipt = { id: 7, vesselId: v.id, formula: 'reference', resolved: false,
      pieces: [{ mass_g: 1, position_m: [0.01, 0.2, 0] as [number, number, number], rotation: [0, 0, 0, 1] as [number, number, number, number],
        velocity_m_s: [0, -0.4, 0] as [number, number, number], angularVelocity_rad_s: [1, 0, 0] as [number, number, number] }] };
    const input = { ...empty, containers: [v], contacts: [receipt] };
    r.sync(input); expect(r.snapshot().grains).toHaveLength(0);
    receipt.resolved = true; r.sync(input); r.sync(input);
    expect(r.snapshot().grains).toHaveLength(1);
    expect(r.snapshot().grains[0].pose.velocity_m_s[1]).toBeCloseTo(-0.4, 6);
    expect(r.snapshot().grains[0].pose.position_m[0]).toBeCloseTo(0.01, 6);
  });
  it('keeps 5 g of hydrate spread over the cup floor, without vertical reference columns or tunneling', async () => {
    const r = await create(), vessel = { id: 'cup', type: 'beaker', capacity_ml: 100, position: [0, -0.135, 0], rotationY: 0,
      volume_ml: 0, mass_g: 5, contents: [{ formula: 'CuSO4·5H2O', phase: 's', mass_g: 5, moles: 5 / 249.677 }], substances: ['CuSO4·5H2O'] } as VesselState;
    r.sync({ ...empty, containers: [stockContainer(vessel, false)!] });
    let snapshot = r.snapshot(); for (let i = 0; i < 30; i++) snapshot = r.advance(1 / 30, false);
    const grains = snapshot.grains.map(g => g.pose);
    expect(grains.reduce((m, p) => m + p.mass_g, 0)).toBeCloseTo(5, 9);
    expect(snapshot.escapes).toHaveLength(0);
    expect(Math.max(...grains.map(p => p.position_m[1])) - Math.min(...grains.map(p => p.position_m[1]))).toBeLessThan(0.015);
    expect(Math.max(...grains.map(p => Math.hypot(p.position_m[0], p.position_m[2])))).toBeGreaterThan(0.012);
    expect(Math.min(...snapshot.reactions.map(r => r.impulse_Ns[1]))).toBeLessThan(0);
    const transform = vesselBodyTransform(vessel), floor = (vessel.position[1] + transform.offsetY + vesselInterior(vessel.type).floorY * transform.scale) * METERS_PER_SCENE_UNIT;
    const vertices = stockGeometry('CuSO4·5H2O').getAttribute('position');
    const lowest = Math.min(...grains.flatMap(g => Array.from({ length: vertices.count }, (_, i) =>
      new Vector3().fromBufferAttribute(vertices, i).multiplyScalar(g.scale_m).applyQuaternion(new Quaternion(...g.rotation)).y + g.position_m[1])));
    expect(lowest).toBeGreaterThanOrEqual(floor - 0.00005);
  });
  it('closes the powder bed mesh around its finite packed volume', () => {
    for (const type of ['beaker', 'flask', 'test_tube']) {
      const geometry = createPowderContactGeometry(type, 0.05, [{ x: -0.2, y: -0.85, z: 0, radius: 0.04 }, { x: 0.25, y: -0.85, z: 0.1, radius: 0.04 }])!;
      expect(geometryVolume(geometry)).toBeCloseTo(0.05, 5); geometry.dispose();
    }
  });
  it('moves escaped mass/moles once, instead of leaving a ghost in the source', async () => {
    const r = await create(), v = laboratory(); r.sync({ ...empty, containers: [v] }); const p = r.snapshot().grains[0].pose;
    const source = { id: 'fixture', name: 'stock', mass_g: 1, temperature_c: 25,
      contents: [{ formula: 'reference', phase: 's', mass_g: 1, moles: 0.01 }] } as VesselState;
    const result = escapeStockGrain(source, {}, p)!;
    expect(result.vessel.mass_g + result.spill.mass_g).toBeCloseTo(source.mass_g, 10);
    expect(result.spill.contents![0].moles).toBeCloseTo(0.01, 10);
    expect(escapeStockGrain(result.vessel, { [result.spill.id]: result.spill }, p)).toBeNull();
  });
  it('reports the resting load against the independent weight reference', async () => {
    const r = await create(), v = laboratory();
    v.colliders = [{ kind: 'box', halfExtents_m: [0.1, 0.005, 0.1], center_m: [0, 0, 0] }];
    v.groups[0].seed[0].position_m = [0, 0.02, 0]; r.sync({ ...empty, containers: [v] });
    for (let i = 0; i < 30; i++) r.advance(1 / 30, false);
    const snapshot = r.advance(1 / 30, false), expected = -0.001 * CONSTANTS.g / 30;
    expect(Math.abs(snapshot.reactions[0].impulse_Ns[1] / expected - 1)).toBeLessThan(0.01);
    expect(snapshot.grains[0].pose.contacting).toBe(true);
  });
  it('does not treat an airborne powder carrier as a settled bed', async () => {
    const r = await create(), v = laboratory(); v.groups[0].powder = true;
    r.sync({ ...empty, containers: [v] });
    expect(r.snapshot().grains[0].pose.contacting).toBe(false);
    expect(r.advance(1 / 120, false).grains[0].pose.contacting).toBe(false);
  });
  it('captures a spilled crystal in a receiver without duplicating its body or resetting momentum', async () => {
    const r = await create();
    const receiver = { id: 'receiver', type: 'beaker', capacity_ml: 100, position: [0, -0.135, 0], volume_ml: 0,
      mass_g: 0, contents: [], substances: [] } as unknown as VesselState;
    const group = stockGroup('CuSO4·5H2O', 0.2)!;
    const spill = { id: 'stock:80', formula: group.formula, mass_g: 0.2, scale_m: 0.0044, position_m: [0, 0.01, 0] as [number, number, number],
      rotation: [0, 0, 0, 1] as [number, number, number, number], velocity_m_s: [0.01, -0.1, 0] as [number, number, number],
      angularVelocity_rad_s: [0, 0, 1] as [number, number, number], sleeping: false, powder: false, vesselId: 'source', group };
    r.sync({ ...empty, containers: [stockContainer(receiver, false)!], spills: [spill] });
    let snapshot = r.snapshot();
    for (let i = 0; i < 60 && !snapshot.captures.length; i++) snapshot = r.advance(1 / 120, false);
    expect(snapshot.captures).toHaveLength(1);
    const incoming = snapshot.captures[0].pose;
    receiver.contents = [{ formula: group.formula, phase: 's', mass_g: 0.2, moles: 0.2 / 249.677 }];
    receiver.stockMotion = { tick: snapshot.tick, grains: [incoming] }; receiver.mass_g = 0.2;
    r.sync({ ...empty, containers: [stockContainer(receiver, false)!] });
    const captured = r.snapshot();
    expect(captured.grains).toHaveLength(1); expect(captured.captures).toHaveLength(0);
    expect(captured.grains[0].vesselId).toBe(receiver.id);
    expect(captured.grains[0].pose.id).toBe(spill.id);
    expect(captured.grains[0].pose.velocity_m_s).toEqual(incoming.velocity_m_s);
    expect(captured.grains[0].pose.mass_g).toBeCloseTo(0.2, 10);
  });
  it('restores all identities before allocating new grains, and freezes exactly while paused', async () => {
    const first = await create(), saved = laboratory(); first.sync({ ...empty, containers: [saved] });
    saved.saved = first.advance(1 / 30, false).grains.map(g => ({ ...g.pose, id: 'stock:2' }));
    saved.id = 'saved'; saved.restore = true;
    const r = await create(); r.sync({ ...empty, containers: [laboratory(), saved] });
    const before = r.snapshot(); expect(new Set(before.grains.map(g => g.pose.id)).size).toBe(2);
    expect(before.grains.find(g => g.vesselId === 'saved')!.pose.position_m).toEqual(saved.saved[0].position_m);
    expect(r.advance(0.1, true)).toEqual(before);
    const restore = await create(); restore.sync({ ...empty, containers: [saved] });
    r.sync({ ...empty, containers: [saved] });
    expect(r.advance(1 / 30, false).grains).toEqual(restore.advance(1 / 30, false).grains);
  });
  it('retains crystals inside a closed cup translated at 0.5 m/s', async () => {
    const r = await create(), v = { id: 'moving', type: 'beaker', capacity_ml: 100, position: [0, -0.135, 0],
      isSealed: true, volume_ml: 0, mass_g: 5, contents: [{ formula: 'CuSO4·5H2O', phase: 's', mass_g: 5, moles: 5 / 249.677 }] } as VesselState;
    r.sync({ ...empty, containers: [stockContainer(v, false)!] });
    for (let i = 0; i < 150; i++) r.advance(1 / 30, false);
    expect(r.snapshot().grains.some(g => g.pose.sleeping)).toBe(true);
    for (let i = 1; i <= 12; i++) {
      v.position[0] = i * 0.2 / 12 / METERS_PER_SCENE_UNIT;
      r.sync({ ...empty, containers: [stockContainer(v, false)!] });
      expect(r.advance(1 / 30, false).escapes).toHaveLength(0);
    }
    expect(r.snapshot().grains).toHaveLength(22);
    expect(r.snapshot().grains.reduce((s, g) => s + g.pose.position_m[0], 0) / 22).toBeGreaterThan(0.17);
  });
  it('interpolates display poses without moving the canonical specimen or replaying a restored branch', async () => {
    const r = await create(); r.sync({ ...empty, containers: [laboratory()] });
    const first = r.snapshot().grains[0].pose, second = r.advance(1 / 30, false).grains[0].pose;
    clearStockPresentation(); publishStockPresentation([first], 1 / 30, 0); publishStockPresentation([second], 1 / 30, 100);
    const middle = presentedStockPose(second, 100 + 1000 / 60);
    expect(middle.position_m[1]).toBeCloseTo((first.position_m[1] + second.position_m[1]) / 2, 9);
    expect(second.position_m[1]).not.toBe(middle.position_m[1]);
    const restored = { ...first }; expect(presentedStockPose(restored, 110)).toBe(restored);
    publishStockPresentation([second], 0, 120); expect(presentedStockPose(second, 120)).toBe(second);
    clearStockPresentation();
  });
  it('replays queued lift/tilt samples in order, then restores the boundary and stock together', async () => {
    const a = await create(), b = await create();
    const v = { id: 'queued', type: 'beaker', capacity_ml: 100, position: [0, -0.135, 0], isSealed: true,
      volume_ml: 0, mass_g: 5, contents: [{ formula: 'CuSO4·5H2O', phase: 's', mass_g: 5, moles: 5 / 249.677 }] } as VesselState;
    const input = stockContainer(v, false)!; a.sync({ ...empty, containers: [input] }); b.sync({ ...empty, containers: [input] });
    const saved = a.snapshot().grains.map(g => g.pose);
    const path = Array.from({ length: 12 }, (_, i) => ({ seconds: 1 / 60, containers: [{ id: v.id,
      position_m: [i * 0.002, input.position_m[1] + Math.min(i, 6) * 0.002, 0] as [number, number, number],
      rotation: new Quaternion().setFromEuler(new Euler(0, 0, -Math.max(0, i - 6) * 0.1)).toArray() as [number, number, number, number] }] }));
    a.advanceBoundaryPath(path, false);
    for (const frame of path) {
      b.sync({ ...empty, containers: [{ ...input, ...frame.containers[0] }] }); b.advance(frame.seconds, false);
    }
    expect(a.snapshot().grains).toEqual(b.snapshot().grains);
    a.sync({ ...empty, containers: [{ ...input, saved, restore: true }] });
    expect(a.snapshot().escapes).toHaveLength(0);
    expect(a.snapshot().grains.map(g => g.pose.position_m)).toEqual(saved.map(p => p.position_m));
  });
  it('lifts resting crystals on the open cup bottom instead of leaving them on the table', async () => {
    const r = await create(), v = { id: 'lifting', type: 'beaker', capacity_ml: 100, position: [0, -0.135, 0],
      volume_ml: 0, mass_g: 5, contents: [{ formula: 'CuSO4·5H2O', phase: 's', mass_g: 5, moles: 5 / 249.677 }] } as VesselState;
    r.sync({ ...empty, containers: [stockContainer(v, false)!] });
    for (let i = 0; i < 150; i++) r.advance(1 / 30, false);
    const path = Array.from({ length: 30 }, (_, i) => ({ seconds: 1 / 60, containers: [{ id: v.id,
      position_m: [0, -0.135 * METERS_PER_SCENE_UNIT + (i + 1) * 0.05 / 30, 0] as [number, number, number],
      rotation: [0, 0, 0, 1] as [number, number, number, number] }] }));
    r.advanceBoundaryPath(path, false);
    expect(r.snapshot().escapes).toHaveLength(0);
    expect(r.snapshot().grains.reduce((s, g) => s + g.pose.position_m[1], 0) / 22).toBeGreaterThan(0);
  });
  it('releases a grain through the open mouth even while it remains on the cup axis', async () => {
    const r = await create(), v = { id: 'mouth', type: 'beaker', capacity_ml: 100, position: [0, -0.135, 0],
      volume_ml: 0, mass_g: 0.2, contents: [{ formula: 'CuSO4·5H2O', phase: 's', mass_g: 0.2, moles: 0.2 / 249.677 }] } as VesselState;
    const container = stockContainer(v, false)!; container.groups[0].seed = [{ position_m: [0, 0.1, 0], rotation: [0, 0, 0, 1] }];
    r.sync({ ...empty, containers: [container] });
    expect(r.snapshot().escapes).toHaveLength(1);
    expect(r.snapshot().escapes[0].pose.mass_g).toBeCloseTo(0.2, 10);
  });
  it('captures a grain on top of existing receiver stock without requiring glass contact', async () => {
    const r = await create(), v = { id: 'stock-pile', type: 'beaker', capacity_ml: 100, position: [0, -0.135, 0],
      volume_ml: 0, contents: [], mass_g: 0 } as unknown as VesselState;
    const container = stockContainer(v, false)!, block = laboratory().groups[0];
    block.seed = [{ position_m: [0, -0.0336, 0], rotation: [0, 0, 0, 1] }]; container.groups = [block];
    const group = stockGroup('CuSO4·5H2O', 0.2)!;
    const spill = { id: 'stock:99', vesselId: 'source', formula: group.formula, mass_g: 0.2, scale_m: 0.0044,
      position_m: [0, 0.01, 0] as [number, number, number], rotation: [0, 0, 0, 1] as [number, number, number, number],
      velocity_m_s: [0, -0.1, 0] as [number, number, number], angularVelocity_rad_s: [0, 0, 0] as [number, number, number], sleeping: false, powder: false, group };
    r.sync({ ...empty, containers: [container], spills: [spill] });
    let snapshot = r.snapshot();
    for (let i = 0; i < 120 && !snapshot.captures.length; i++) snapshot = r.advance(1 / 120, false);
    expect(snapshot.captures).toHaveLength(1);
    expect(snapshot.captures[0].pose.position_m[1]).toBeGreaterThan(-0.0286);
  });
});
