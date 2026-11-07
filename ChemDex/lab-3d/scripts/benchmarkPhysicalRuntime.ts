import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PhysicsRuntime } from '../src/physical/PhysicsRuntime';
import { sampleDefinition, vesselDefinition } from '../src/physical/catalog';
import { createReferenceExperiment } from '../src/physical/ReferenceExperiments';
import type { PhysicalBodyInput, SimulationCommand } from '../src/physical/types';

const r = await PhysicsRuntime.create(17, true), bodies: PhysicalBodyInput[] = [];
let sequence = 0;
const command = (data: object) => r.dispatch({ ...data, sequence: ++sequence, tick: r.tick } as SimulationCommand);
const definition = vesselDefinition('beaker', 100);
for (let i = 0; i < 20; i++) bodies.push({ id: `cup_${i.toString().padStart(2, '0')}`, definition,
  position_m: [(i % 5 - 2) * 0.14, -0.004725, (Math.floor(i / 5) - 1.5) * 0.11], rotation: [0, 0, 0, 1],
  contentsMass_kg: 0.06, temperature_K: 293.15, locked: false,
  fluid: { volume_m3: 60e-6, density_kg_m3: 998.2, viscosity_Pas: 0.001002, vesselType: 'beaker', capacity_ml: 100 } });
for (let i = 0; i < 50; i++) bodies.push({ id: `solid_${i.toString().padStart(2, '0')}`,
  definition: sampleDefinition(i % 2 ? 'aluminum' : 'polyethylene'),
  position_m: [bodies[i % 20].position_m[0], 0.05 + Math.floor(i / 20) * 0.015, bodies[i % 20].position_m[2]],
  rotation: [0, 0, 0, 1], contentsMass_kg: 0, temperature_K: 293.15, locked: false });
const setupStart = performance.now(); command({ kind: 'sync', bodies });
const setup_ms = performance.now() - setupStart;
for (let i = 0; i < 3; i++) command({ kind: 'experiment', experiment: createReferenceExperiment(`flow_${i}`, 'pipette_bulb') });
for (let i = 0; i < 2; i++) command({ kind: 'experiment', experiment: createReferenceExperiment(`heater_${i}`, 'water_bath') });
const durations: number[] = [];
const frameCount = Number(process.env.PHYSICS_BENCH_FRAMES ?? 150);
const timing = { fluids_ms: 0, snapshot_ms: 0, total_ms: 0 };
for (const [method, key] of [['stepFluids', 'fluids_ms'], ['snapshot', 'snapshot_ms']] as const) {
  const original = (r as any)[method].bind(r);
  (r as any)[method] = (...args: unknown[]) => { const start = performance.now(); try { return original(...args); } finally { timing[key] += performance.now() - start; } };
}
try {
  for (let i = 0; i < frameCount; i++) {
    const start = performance.now(); const snapshot = command({ kind: 'advance', seconds: 1 / 30, paused: false, timeScale: 1 });
    if (snapshot.objects.some(o => [...o.position_m, ...o.velocity_m_s].some(v => !Number.isFinite(v)))) throw new Error('Non-finite benchmark trajectory');
    if (i >= Math.min(30, Math.floor(frameCount / 5))) durations.push(performance.now() - start);
    timing.total_ms += performance.now() - start;
  }
  durations.sort((a, b) => a - b);
  const report = { runtime: process.version, bodyCount: bodies.length, vesselCount: 20, solidCount: 50,
    referenceFlowFixtures: 3, referenceThermalFixtures: 2, tick: r.tick, setup_ms,
    median_ms: durations[Math.floor(durations.length / 2)], p95_ms: durations[Math.ceil(durations.length * 0.95) - 1],
    max_ms: durations.at(-1), samples: durations,
    timing,
    activeContacts: [...(r as any).contacts.values()].reduce((sum: number, c: Map<string, number>) => sum + [...c.values()].reduce((a, b) => a + b, 0), 0),
    examplePoses: r.snapshot().objects.slice(0, 2),
    scope: 'Node CPU for four fixed steps plus snapshot. Reference flows/thermal fixtures; excludes legacy chemistry, app transfer pipeline, React, browser Worker transport and GPU. This is not FPS or a phone benchmark.' };
  const output = resolve(process.env.PHYSICAL_AUDIT_OUTPUT ?? 'artifacts/verified-physics'); mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'runtime-cpu.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, samples: undefined }));
} finally { r.free(); }
