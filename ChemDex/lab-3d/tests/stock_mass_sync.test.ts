import { afterEach, describe, expect, it } from 'vitest';
import { BoxGeometry } from 'three';
import { StockWorld } from '../src/physical/StockWorld';
import { sameStockKinematics, reconcileStockReplyPose, reconcileStockReplyPoses } from '../src/physical/stockMassSync';
import { allocateStockConsumption } from '../src/physical/stockConsumption';
import { escapeStockGrain } from '../src/physical/stockEscape';
import { captureStockCarrier } from '../src/physical/stockCapture';
import { attachedMetalForCarrier } from '../src/science/metalSurfaceAppearance';
import type { StockContainerInput, StockGrainPose, StockWorldInput } from '../src/physical/stockTypes';
import type { VesselState } from '../src/types/chemistry';

const worlds: StockWorld[] = [];
afterEach(() => worlds.splice(0).forEach(world => world.free()));
const create = async () => { const world = await StockWorld.create(); worlds.push(world); return world; };
const empty: StockWorldInput = { containers: [], contacts: [], spills: [] };
const cube = new BoxGeometry(1, 1, 1);
const pose = (id: string, x = 0): StockGrainPose => ({ id, formula: 'Zn', mass_g: 0.1, scale_m: Math.cbrt(1e-7),
  position_m: [x, 1, 0], rotation: [0, 0, 0, 1], velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0],
  sleeping: false, powder: false });
const fixture = (): StockContainerInput => ({ id: 'carrier-test', shapeKey: 'none', colliders: [], position_m: [0, 0, 0],
  rotation: [0, 0, 0, 1], restore: false, saved: [pose('stock:1', -0.02), pose('stock:2', 0.02)],
  groups: [{ formula: 'Zn', mass_g: 0.2, density_kg_m3: 1000, powder: false, unitVolume: 1,
    vertices: Array.from(cube.getAttribute('position').array), seed: [{ position_m: [0, 1, 0], rotation: [0, 0, 0, 1] }] }] });
const vessel = (mass: number, stockMotion?: VesselState['stockMotion']): VesselState => ({
  id: 'carrier-test', name: 'carrier-test', type: 'beaker', capacity_ml: 100, volume_ml: 99,
  mass_g: 99 + mass, temperature_c: 25, position: [0, 0, 0], stockMotion,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 99, moles: 99 / 18.015 },
    { formula: 'Zn', phase: 's', mass_g: mass, moles: mass / 65.38 }], substances: ['H2O', 'Zn'],
} as VesselState);

describe('carrier mass and asynchronous physical state', () => {
  it('shrinks only the named carrier at its current trajectory, then acknowledges its full consumption', async () => {
    const world = await create(), input = fixture(); world.sync({ ...empty, containers: [input] });
    const initial = world.snapshot(); world.advance(0.1, false);
    const advanced = world.snapshot();
    input.groups[0].mass_g = 0.15;
    input.saved = initial.grains.map(({ pose: p }, i) => i ? p : { ...p, mass_g: 0.05, scale_m: p.scale_m * Math.cbrt(0.5) });
    world.sync({ ...empty, containers: [input] });
    const shrunk = world.snapshot();
    expect(Object.fromEntries(shrunk.grains.map(g => [g.pose.id, g.pose.mass_g])))
      .toEqual({ 'stock:1': 0.05, 'stock:2': 0.1 });
    for (const item of shrunk.grains) {
      const old = advanced.grains.find(g => g.pose.id === item.pose.id)!.pose;
      expect(item.pose.position_m).toEqual(old.position_m);
      expect(item.pose.velocity_m_s).toEqual(old.velocity_m_s);
    }
    input.groups[0].mass_g = 0.1;
    input.saved[0] = { ...input.saved[0], mass_g: 0, scale_m: 0 };
    world.sync({ ...empty, containers: [input] }); world.sync({ ...empty, containers: [input] });
    expect(world.snapshot().grains.map(g => [g.pose.id, g.pose.mass_g])).toEqual([['stock:2', 0.1]]);
  });

  it('keeps an unconsumed dry carrier unchanged when a fresh dose arrives after selective consumption', async () => {
    const world = await create(), input = fixture(); world.sync({ ...empty, containers: [input] });
    input.saved = world.snapshot().grains.map(({ pose: p }, i) => i ? p : { ...p, mass_g: 0.05 });
    input.groups[0].mass_g = 0.15; world.sync({ ...empty, containers: [input] });
    input.groups[0].mass_g = 0.2;
    world.sync({ ...empty, containers: [input], contacts: [{ id: 1, vesselId: input.id, formula: 'Zn', resolved: true,
      pieces: [{ mass_g: 0.05, position_m: [0, 1.5, 0], rotation: [0, 0, 0, 1], velocity_m_s: [0, -0.1, 0], angularVelocity_rad_s: [0, 0, 0] }] }] });
    const result = world.snapshot().grains.map(g => g.pose);
    expect(result.find(p => p.id === 'stock:1')!.mass_g).toBe(0.05);
    expect(result.find(p => p.id === 'stock:2')!.mass_g).toBe(0.1);
    expect(result).toHaveLength(3);
    expect(result.reduce((sum, p) => sum + p.mass_g, 0)).toBeCloseTo(0.2, 12);
    expect(result.find(p => p.id !== 'stock:1' && p.id !== 'stock:2')!.position_m[1]).toBe(1.5);
  });

  it('accepts a moving worker reply without overwriting a newer chemistry mass or resurrecting a removed carrier', () => {
    const requested = { tick: 1, grains: [pose('wet'), pose('dry')] };
    const current = { ...requested, grains: [{ ...requested.grains[0], mass_g: 0.04, scale_m: 0.003 }, requested.grains[1]] };
    expect(sameStockKinematics(requested, current)).toBe(true);
    const reply = { ...requested.grains[0], position_m: [0, 0.9, 0] as [number, number, number], velocity_m_s: [0, -0.98, 0] as [number, number, number] };
    const accepted = reconcileStockReplyPose(reply, requested, current);
    expect(accepted.mass_g).toBe(0.04);
    expect(accepted.position_m).toEqual(reply.position_m);
    expect(accepted.velocity_m_s).toEqual(reply.velocity_m_s);
    expect(accepted.scale_m / reply.scale_m).toBeCloseTo(Math.cbrt(0.4), 12);
    const consumed = { ...current, grains: [{ ...current.grains[0], mass_g: 0, scale_m: 0 }, current.grains[1]] };
    expect(reconcileStockReplyPose(reply, requested, consumed).mass_g).toBe(0);
    expect(reconcileStockReplyPose(reply, requested, consumed).scale_m).toBe(0);
    expect(sameStockKinematics(requested, { ...current, grains: [reply, current.grains[1]] })).toBe(false);
  });

  it.each([0, 0.025, 0.1])('caps an in-flight birth at its remaining %s g without shrinking the old carriers', async remaining => {
    const world = await create(), input = fixture(); world.sync({ ...empty, containers: [input] });
    const motion = { tick: 0, grains: world.snapshot().grains.map(g => g.pose) };
    const before = vessel(0.3, motion), request = { motion, masses: new Map([['Zn', 0.3]]) };
    world.advance(0.1, false); input.saved = motion.grains; input.groups[0].mass_g = 0.3;
    world.sync({ ...empty, containers: [input], contacts: [{ id: 1, vesselId: input.id, formula: 'Zn', resolved: true,
      pieces: [{ mass_g: 0.1, position_m: [0, 1.5, 0], rotation: [0, 0, 0, 1], velocity_m_s: [0, -0.1, 0], angularVelocity_rad_s: [0, 0, 0] }] }] });
    const reply = world.snapshot().grains.map(g => g.pose), current = vessel(0.2 + remaining, motion);
    current.stockMotion = allocateStockConsumption(before, current.contents);
    // Only the still-unposed dose was consumed; all old carriers are dry.
    expect(current.stockMotion).toBe(motion);
    const accepted = reconcileStockReplyPoses(reply, request, current);
    const birth = accepted.find(p => !motion.grains.some(old => old.id === p.id))!;
    expect(birth.mass_g).toBeCloseTo(remaining, 12);
    expect(accepted.reduce((sum, p) => sum + p.mass_g, 0)).toBeCloseTo(current.contents[1].mass_g, 12);
    for (const p of accepted) {
      expect(p.position_m).toEqual(reply.find(old => old.id === p.id)!.position_m);
      expect(p.velocity_m_s).toEqual(reply.find(old => old.id === p.id)!.velocity_m_s);
    }
    for (const old of motion.grains) expect(accepted.find(p => p.id === old.id)!.mass_g).toBe(old.mass_g);
    input.saved = accepted; input.groups[0].mass_g = 0.2 + remaining;
    world.sync({ ...empty, containers: [input] });
    for (const old of motion.grains) expect(world.snapshot().grains.find(g => g.pose.id === old.id)!.pose.mass_g).toBe(old.mass_g);
    expect(world.snapshot().grains.some(g => g.pose.id === birth.id)).toBe(remaining > 0);
    expect(world.snapshot().grains.reduce((sum, g) => sum + g.pose.mass_g, 0)).toBeCloseTo(0.2 + remaining, 12);
  });

  it('does not resurrect fully consumed stock during the first reply without any previous poses', () => {
    const current = vessel(0), reply = [pose('first')];
    expect(sameStockKinematics(undefined, current.stockMotion)).toBe(true);
    const accepted = reconcileStockReplyPoses(reply, { motion: undefined, masses: new Map([['Zn', 0.1]]) }, current);
    expect(accepted[0].mass_g).toBe(0);
    expect(accepted[0].scale_m).toBe(0);
    expect(escapeStockGrain({ ...current, stockMotion: { tick: 1, grains: accepted } }, {}, accepted[0])).toBeNull();
  });

  it('preserves selective old-ID consumption after the fresh dose has also been exhausted', () => {
    const motion = { tick: 1, grains: [pose('wet'), pose('dry')] };
    const current = vessel(0.15, { ...motion, grains: [{ ...motion.grains[0], mass_g: 0.05 }, motion.grains[1]] });
    const reply = [pose('fresh'), ...motion.grains.map(p => ({ ...p, position_m: [p.position_m[0], 0.9, 0] as [number, number, number] }))];
    const accepted = reconcileStockReplyPoses(reply, { motion, masses: new Map([['Zn', 0.3]]) }, current);
    expect(Object.fromEntries(accepted.map(p => [p.id, p.mass_g]))).toEqual({ fresh: 0, wet: 0.05, dry: 0.1 });
    expect(accepted.find(p => p.id === 'dry')!.position_m[1]).toBe(0.9);
  });

  it('keeps later arrivals unposed and excludes free precipitate and coatings from each formula budget', () => {
    const current = vessel(0.2), zinc = pose('new-zinc'), copper = { ...pose('new-copper'), formula: 'Cu' };
    current.contents.push({ formula: 'Zn', phase: 's', mass_g: 0.5, moles: 0.5 / 65.38, solidOrigin: 'precipitate' },
      { formula: 'Cu', phase: 's', mass_g: 0.03, moles: 0.03 / 63.546 },
      { formula: 'Cu', phase: 's', mass_g: 0.2, moles: 0.2 / 63.546, solidOrigin: 'precipitate', depositSubstrate: 'Zn' });
    const accepted = reconcileStockReplyPoses([zinc, copper], { motion: undefined,
      masses: new Map([['Zn', 0.1], ['Cu', 0.1]]) }, current);
    expect(accepted.find(p => p.id === zinc.id)!.mass_g).toBe(0.1);
    expect(accepted.find(p => p.id === copper.id)!.mass_g).toBeCloseTo(0.03, 12);
  });

  it('accounts for an escaping new ID before transferring only its surviving mass', async () => {
    const world = await create(), input = fixture();
    input.colliders = [{ kind: 'box', center_m: [0, 0, 0], halfExtents_m: [0.1, 0.005, 0.1] }];
    input.saved!.forEach(p => { p.position_m[1] = 0.001; });
    world.sync({ ...empty, containers: [input] });
    const motion = { tick: 0, grains: world.snapshot().grains.map(g => g.pose) };
    input.saved = motion.grains; input.groups[0].mass_g = 0.3;
    world.sync({ ...empty, containers: [input], contacts: [{ id: 1, vesselId: input.id, formula: 'Zn', resolved: true,
      pieces: [{ mass_g: 0.1, position_m: [0, 1.5, 0], rotation: [0, 0, 0, 1], velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0] }] }] });
    const snapshot = world.snapshot();
    expect(snapshot.escapes).toHaveLength(1);
    const escapingId = snapshot.escapes[0].pose.id;
    expect(snapshot.grains.some(g => g.pose.id === escapingId)).toBe(true);
    const current = vessel(0.25, motion);
    const accepted = reconcileStockReplyPoses(snapshot.grains.map(g => g.pose), { motion, masses: new Map([['Zn', 0.3]]) }, current);
    const transfer = escapeStockGrain({ ...current, stockMotion: { tick: snapshot.tick, grains: accepted } }, {},
      accepted.find(p => p.id === escapingId)!)!;
    expect(transfer.spill.mass_g).toBeCloseTo(0.05, 12);
    expect(transfer.vessel.contents.find(row => row.formula === 'Zn')!.mass_g).toBeCloseTo(0.2, 12);
    expect(transfer.vessel.stockMotion!.grains.every(p => p.mass_g === 0.1)).toBe(true);
    expect(transfer.vessel.mass_g + transfer.spill.mass_g).toBeCloseTo(current.mass_g, 12);
  });

  it('includes coating mass in support load while keeping the published core mass and scale separate', async () => {
    const world = await create(), input = fixture();
    input.colliders = [{ kind: 'box', center_m: [0, 0, 0], halfExtents_m: [0.1, 0.005, 0.1] }];
    input.groups[0].mass_g = 0.1; input.saved = [pose('stock:1')]; input.saved[0].position_m = [0, 0.02, 0];
    input.groups[0].carrierCoatings = { 'stock:1': { mass_g: 0.05, volume_ml: 0.05 / 8.96 } };
    world.sync({ ...empty, containers: [input] });
    for (let i = 0; i < 30; i++) world.advance(1 / 30, false);
    const result = world.advance(1 / 30, false), expected = -0.00015 * 9.80665 / 30;
    expect(result.grains[0].pose.mass_g).toBe(0.1);
    expect(result.grains[0].pose.scale_m).toBeCloseTo(Math.cbrt(1e-7), 12);
    expect(Math.abs(result.reactions[0].impulse_Ns[1] / expected - 1)).toBeLessThan(0.02);
  });

  it('moves only the selected core and its coating through escape and capture, preserving separate free precipitate', () => {
    const grain = { ...pose('iron:1'), formula: 'Fe', mass_g: 0.5 };
    const source = { id: 'source', name: 'source', type: 'beaker', capacity_ml: 100, volume_ml: 0,
      mass_g: 0.63, temperature_c: 25, position: [0, 0, 0], stockMotion: { tick: 1, grains: [grain] }, contents: [
        { formula: 'Fe', phase: 's', mass_g: 0.5, moles: 0.5 / 55.845 },
        { formula: 'Fe', phase: 's', mass_g: 0.03, moles: 0.03 / 55.845, solidOrigin: 'precipitate' },
        { formula: 'Cu', phase: 's', mass_g: 0.1, moles: 0.1 / 63.546, solidOrigin: 'precipitate',
          depositSubstrate: 'Fe', depositCarrierId: grain.id, depositionReactionId: 'fe_cuso4' },
      ], substances: ['Fe', 'Cu'] } as VesselState;
    const transfer = escapeStockGrain(source, {}, grain)!;
    expect(transfer.spill.mass_g).toBeCloseTo(0.6, 12);
    expect(transfer.spill.stockMotion!.mass_g).toBe(0.5);
    expect(transfer.vessel.contents).toHaveLength(1);
    expect(transfer.vessel.contents[0].solidOrigin).toBe('precipitate');
    expect(transfer.vessel.mass_g).toBeCloseTo(0.03, 12);
    const receiver = { ...source, id: 'receiver', mass_g: 0, contents: [], substances: [], stockMotion: undefined };
    const captured = captureStockCarrier(receiver, transfer.spill, grain)!;
    expect(captured.vessel.contents.find(row => row.formula === 'Fe')!.mass_g).toBe(0.5);
    expect(captured.vessel.contents.find(row => row.formula === 'Cu')!.mass_g).toBe(0.1);
    expect(captured.vessel.stockMotion!.grains[0].mass_g).toBe(0.5);
    expect(attachedMetalForCarrier(captured.vessel, grain.id).mass_g).toBe(0.1);
    expect(captured.vessel.mass_g + transfer.vessel.mass_g).toBeCloseTo(source.mass_g, 12);
  });

  it.each([0, 2])('capturing a coated core overflows only the upper liquid layer with %s mL on the wall', wallCoating_ml => {
    const waterMass = 80 - wallCoating_ml;
    const receiver = { ...vessel(0), id: 'layered-receiver', volume_ml: 100 - wallCoating_ml,
      wallCoating_ml, mass_g: waterMass + 13.18, immiscibleOrganicVolume_ml: 20,
      contents: [
        { formula: 'H2O', phase: 'l', mass_g: waterMass, moles: waterMass / 18.015 },
        { formula: 'C6H14', phase: 'l', mass_g: 13.18, moles: 13.18 / 86.178,
          liquidLayer: 'organic', volume_ml: 20 },
      ], substances: ['H2O', 'C6H14'] } as VesselState;
    const grain = { ...pose('iron-overflow'), formula: 'Fe', mass_g: 5,
      scale_m: 0.004, position_m: [0, 0.005, 0] as [number, number, number] };
    const source = { ...vessel(0), volume_ml: 0, mass_g: 5.1, stockMotion: { tick: 1, grains: [grain] },
      contents: [{ formula: 'Fe', phase: 's', mass_g: 5, moles: 5 / 55.845 },
        { formula: 'Cu', phase: 's', mass_g: 0.1, moles: 0.1 / 63.546, solidOrigin: 'precipitate',
          depositSubstrate: 'Fe', depositCarrierId: grain.id, depositionReactionId: 'fe_cuso4' }],
      substances: ['Fe', 'Cu'] } as VesselState;
    const escaped = escapeStockGrain(source, {}, grain)!;
    const captured = captureStockCarrier(receiver, escaped.spill, grain)!;
    const spill = captured.spill!;
    const displaced = 5 / 7.87 + 0.1 / 8.96;
    expect(spill.volume_ml).toBeCloseTo(displaced, 8);
    expect(spill.organicVolume_ml).toBeCloseTo(spill.volume_ml, 10);
    expect(spill.contents.filter(row => row.mass_g > 0).map(row => row.formula)).toEqual(['C6H14']);
    expect(captured.vessel.contents.find(row => row.formula === 'H2O')!.mass_g).toBe(waterMass);
    expect(captured.vessel.immiscibleOrganicVolume_ml).toBeCloseTo(20 - displaced, 8);
    expect(captured.vessel.volume_ml + displaced + wallCoating_ml).toBeCloseTo(100, 8);
    expect(attachedMetalForCarrier(captured.vessel, grain.id).mass_g).toBe(0.1);
    expect(captured.vessel.mass_g + spill.mass_g).toBeCloseTo(receiver.mass_g + escaped.spill.mass_g, 10);
    for (const formula of ['Fe', 'Cu', 'H2O', 'C6H14']) {
      const total = (rows: VesselState['contents']) => rows.filter(row => row.formula === formula).reduce((sum, row) => sum + row.mass_g, 0);
      expect(total([...captured.vessel.contents, ...spill.contents]))
        .toBeCloseTo(total([...receiver.contents, ...escaped.spill.contents!]), 12);
    }
  });
});
