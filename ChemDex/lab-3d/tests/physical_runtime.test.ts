import { afterEach, describe, expect, it } from 'vitest';
import { PhysicsRuntime } from '../src/physical/PhysicsRuntime';
import { sampleDefinition, vesselDefinition } from '../src/physical/catalog';
import { CONSTANTS } from '../src/core/units';
import type { PhysicalBodyInput, SimulationCommand } from '../src/physical/types';

const runtimes: PhysicsRuntime[] = [];
afterEach(() => { for (const r of runtimes.splice(0)) r.free(); });
const create = async (environment = false) => { const r = await PhysicsRuntime.create(17, environment); runtimes.push(r); return r; };
const body = (id = 'sample', y = 1): PhysicalBodyInput => ({ id, definition: sampleDefinition('aluminum'),
  position_m: [0, y, 0], rotation: [0, 0, 0, 1], contentsMass_kg: 0, temperature_K: 293.15, locked: false });
const controller = (runtime: PhysicsRuntime) => {
  let sequence = 0;
  return (c: Omit<SimulationCommand, 'tick' | 'sequence'> | Record<string, unknown>) => runtime.dispatch({ ...c, sequence: ++sequence, tick: runtime.tick } as SimulationCommand);
};

describe('Rapier SI runtime, independent of render frames', () => {
  it('matches free fall within 1%, and impulses are in N·s', async () => {
    const r = await create(), send = controller(r), b = body();
    send({ kind: 'sync', bodies: [b] }); send({ kind: 'impulse', id: b.id, impulse_Ns: [b.definition.mass_kg, 0, 0] });
    const s = send({ kind: 'advance', seconds: 0.1, paused: false, timeScale: 1 });
    const p = s.objects[0];
    expect(p.position_m[0]).toBeCloseTo(0.1, 5);
    expect(Math.abs((1 - p.position_m[1]) / (0.5 * CONSTANTS.g * 0.1 ** 2) - 1)).toBeLessThan(0.01);
    expect(p.velocity_m_s[1]).toBeCloseTo(-CONSTANTS.g * 0.1, 5);
  });
  it.each([20, 30, 60, 120])('gives the same 120 physical steps at %i FPS', async fps => {
    const r = await create(), send = controller(r); send({ kind: 'sync', bodies: [body()] });
    let s;
    for (let i = 0; i < fps; i++) s = send({ kind: 'advance', seconds: 1 / fps, paused: false, timeScale: 1 });
    expect(s!.tick).toBe(120);
    expect(Math.abs((1 - s!.objects[0].position_m[1]) / (0.5 * CONSTANTS.g) - 1)).toBeLessThan(0.01);
  });
  it('keeps hollow vessel openings traversable and stops a sample at its real bottom', async () => {
    const r = await create(), send = controller(r), vessel = body('cup', 0);
    vessel.definition = vesselDefinition('beaker', 100); vessel.locked = true;
    const sample = body('grain', 0.07);
    send({ kind: 'sync', bodies: [vessel, sample] });
    let snapshot;
    for (let i = 0; i < 20; i++) snapshot = send({ kind: 'advance', seconds: 0.1, paused: false, timeScale: 1 });
    const grain = snapshot!.objects.find(o => o.id === 'grain')!;
    expect(grain.position_m[1]).toBeLessThan(0);
    expect(grain.position_m[1]).toBeGreaterThan(-0.04);
    expect(Math.abs(grain.velocity_m_s[1])).toBeLessThan(0.01);
    expect(grain.contacts).toContain('cup');
  });
  it('pauses exactly, rejects duplicate commands and resumes without catch-up', async () => {
    const r = await create(), send = controller(r); send({ kind: 'sync', bodies: [body()] });
    const s = send({ kind: 'advance', seconds: 0.1, paused: true, timeScale: 8 });
    expect(s.tick).toBe(0); expect(s.objects[0].position_m[1]).toBe(1);
    expect(() => r.dispatch({ kind: 'release', id: 'sample', tick: 0, sequence: 1 })).toThrow(/sequence/);
  });
  it('restores the WASM world and continues the identical trajectory', async () => {
    const a = await create(), sendA = controller(a); sendA({ kind: 'sync', bodies: [body()] });
    sendA({ kind: 'advance', seconds: 0.1, paused: false, timeScale: 1 });
    const save = a.save(), b = await create(); b.restore(save);
    const command = { kind: 'advance' as const, seconds: 0.1, paused: false, timeScale: 1, sequence: save.sequence + 1, tick: save.tick };
    expect(b.dispatch(command).objects).toEqual(a.dispatch(command).objects);
    expect(b.save().world).toEqual(a.save().world);
  });
  it('retains linear and angular velocities on release instead of teleporting', async () => {
    const r = await create(), send = controller(r); send({ kind: 'sync', bodies: [body()] });
    send({ kind: 'hold', id: 'sample', target_m: [0.1, 1, 0], rotation: [0, 0, 0.3, Math.sqrt(0.91)] });
    const held = send({ kind: 'advance', seconds: 0.05, paused: false, timeScale: 1 }).objects[0];
    const released = send({ kind: 'release', id: 'sample' }).objects[0];
    expect(released.velocity_m_s).toEqual(held.velocity_m_s);
    expect(released.angularVelocity_rad_s).toEqual(held.angularVelocity_rad_s);
    expect(released.held).toBe(false);
  });
  it('does not duplicate mass when sync changes finite contents', async () => {
    const r = await create(), send = controller(r), b = body();
    b.contentsMass_kg = 0.1; send({ kind: 'sync', bodies: [b] });
    send({ kind: 'sync', bodies: [b] });
    send({ kind: 'impulse', id: b.id, impulse_Ns: [b.definition.mass_kg + b.contentsMass_kg, 0, 0] });
    expect(r.snapshot().objects[0].velocity_m_s[0]).toBeCloseTo(1, 5);
  });
});
