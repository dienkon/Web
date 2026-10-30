import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { PrecipitationSystem, type PrecipitationSimulationParams } from '../src/simulation/effects/PrecipitationSystem';
import { PRNG } from '../src/core/rng';

// CPU benchmark, separate from WebGL/FPS. Fixed seeds and checkpoints make
// conservation, trajectory and history changes visible across optimizations.
const label = process.argv[2] ?? 'current';
const repetitions = Number(process.argv[3] ?? 5);
if (!/^[\w-]+$/.test(label) || !Number.isInteger(repetitions) || repetitions < 1) throw new Error('Invalid benchmark arguments');
const scenarios = [
  { name: 'gel-900', substance: 'Cu(OH)2', budget: 900 },
  { name: 'curd-550', substance: 'AgCl', budget: 550 },
  { name: 'powder-900', substance: 'BaSO4', budget: 900 },
  { name: 'crystals-260', substance: 'PbI2', budget: 260, formation: 'CRYSTAL_PLATE' },
  { name: 'fallback-120', substance: 'UnknownX', budget: 120 },
  { name: 'suspended-gel-900', substance: 'Cu(OH)2', budget: 900, tall: true },
  { name: 'suspended-powder-900', substance: 'BaSO4', budget: 900, tall: true },
];
const referencePath = '../src/simulation/effects/PrecipitationSystem.benchmark-reference.ts';
const Reference: typeof PrecipitationSystem | null = process.env.PRECIPITATION_REFERENCE === '1'
  ? (await import(referencePath)).PrecipitationSystem : null;
function run(spec: typeof scenarios[number], System = PrecipitationSystem) {
  const system = new System(spec.budget, spec.substance, new PRNG(429));
  const hash = createHash('sha256');
  let milliseconds = 0;
  for (let frame = 0; frame < 900; frame++) {
    const params: PrecipitationSimulationParams = { temp_c: frame < 450 ? 25 : 60,
      ambientTemp_c: 25, viscosity_mPa_s: frame < 450 ? 1 : 0.6, density_g_ml: 1,
      radius: spec.tall ? 10 : 0.7, liquidBottomY: 0.02, surfaceY: spec.tall ? 100 : 1.5, volume_ml: 100,
      precipitateAmount_g: frame < 420 ? 0.2 : frame < 600 ? 0.1 : 0.15,
      substance: spec.substance, formation: spec.formation, declaredColor: '#aaccee',
      agitation: frame < 300 ? 0.3 : 0.95, heatPower_W: frame < 450 ? 0 : 10,
      withdrawnSuspension_g: frame === 420 ? 0.03 : 0 };
    if (frame === 700) system.setParticleBudget(Math.floor(spec.budget / 3));
    const start = performance.now();
    system.update(1 / 60, params);
    milliseconds += performance.now() - start;
    if (frame % 30 === 0 || frame === 899) hash.update(JSON.stringify({ frame, particles: system.particles,
      mass: system.representedMass_g, bed: system.sedimentBed, cloudiness: system.cloudiness,
      clock: system.clock, flocculation: system.flocculation, emitted: system.emittedCount }));
    if (Math.abs(system.representedMass_g - params.precipitateAmount_g) > 1e-10) throw new Error(`Mass mismatch: ${spec.name}/${frame}`);
  }
  return { milliseconds, digest: hash.digest('hex'), mass_g: system.representedMass_g,
    particles: system.particles.length, clock: system.clock };
}
const results = [];
for (const spec of scenarios) {
  run(spec); // JIT warmup excluded
  if (Reference) run(spec, Reference);
  const trials = [], referenceTrials = [];
  for (let trial = 0; trial < repetitions; trial++) {
    if (Reference && trial % 2 === 0) referenceTrials.push(run(spec, Reference));
    trials.push(run(spec));
    if (Reference && trial % 2 === 1) referenceTrials.push(run(spec, Reference));
  }
  if (new Set(trials.map(t => t.digest)).size !== 1) throw new Error('Non-deterministic benchmark');
  if (referenceTrials.some(t => t.digest !== trials[0].digest)) throw new Error(`Reference trajectory mismatch: ${spec.name}`);
  const times = trials.map(t => t.milliseconds).sort((a, b) => a - b);
  const referenceTimes = referenceTrials.map(t => t.milliseconds).sort((a, b) => a - b);
  const result = { ...spec, ...trials[0], median_ms: times[Math.floor(times.length / 2)], times_ms: times,
    ...(Reference ? { referenceMedian_ms: referenceTimes[Math.floor(referenceTimes.length / 2)], referenceTimes_ms: referenceTimes } : {}) };
  results.push(result);
  console.log(JSON.stringify(result));
}
const directory = resolve('docs/research/performance-2026-10-29');
mkdirSync(directory, { recursive: true });
const baselineFile = resolve(directory, 'baseline.json');
if (label !== 'baseline' && existsSync(baselineFile)) {
  const baseline = JSON.parse(readFileSync(baselineFile, 'utf8'));
  for (const result of results) {
    if (baseline.results.find((previous: { name: string }) => previous.name === result.name)?.digest !== result.digest)
      throw new Error(`Baseline trajectory mismatch: ${result.name}`);
  }
}
writeFileSync(resolve(directory, `${label}.json`), JSON.stringify({ label, node: process.version,
  platform: process.platform, repetitions, simulationSeconds: 15, results }, null, 2) + '\n');
