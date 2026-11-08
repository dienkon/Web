import { mkdirSync, writeFileSync } from 'node:fs';
import type { SpillState } from '../src/types/chemistry';
import { reconcileSpillSuspension, stepSpillSuspension } from '../src/science/spillSuspension';

const base: SpillState = { id: 'p', volume_ml: 10, mass_g: 10.01, temperature_c: 25,
  position: [0, -1.175, 0], radius: 1, color: '#fff', isHazard: false, timestamp: 0, substances: ['H2O', 'Ag2S'],
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 10, moles: 10 / 18.015 },
    { formula: 'Ag2S', phase: 's', solidOrigin: 'precipitate', mass_g: 0.01, moles: 0.01 / 247.8 }] };
base.suspension = reconcileSpillSuspension(base, true);
base.suspension!.species[0].cohorts = Array.from({ length: 24 }, (_, i) => ({ mass_g: 0.01 / 24, travel: i / 100 }));
let spills = Array.from({ length: 100 }, (_, i) => ({ ...structuredClone(base), id: `p${i}` }));
const times: number[] = [];
for (let step = 0; step < 130; step++) {
  const start = performance.now(); spills = spills.map(s => stepSpillSuspension(s, s, 1 / 120));
  if (step >= 10) times.push(performance.now() - start);
}
times.sort((a, b) => a - b);
const report = { scenario: '100 puddles, 24 suspended cohorts each, 120 analytical model steps after 10 warm-up steps',
  webglIncluded: false, browserFpsVerified: false, average_ms: times.reduce((s, t) => s + t, 0) / times.length,
  p95_ms: times[Math.floor(times.length * 0.95)], maximum_ms: times.at(-1),
  maxCohorts: Math.max(...spills.flatMap(s => s.suspension!.species.map(p => p.cohorts.length))) };
mkdirSync('artifacts/spill-suspension', { recursive: true });
writeFileSync(`artifacts/spill-suspension/benchmark-${process.env.SPILL_SUSPENSION_BENCH_LABEL ?? 'after'}.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
