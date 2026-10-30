import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import { createStockSolidGeometry } from '../src/components/three/stockSolidGeometry';
import { createStockSolidLayout } from '../src/components/three/stockSolidLayout';
import { solidSceneVolume } from '../src/science/vesselDimensions';
const output = 'docs/research/solid-volume-layout-2026-10-30'; await mkdir(output, { recursive: true });
const quantile = (a: number[], q: number) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * q)];
const rows = [];
for (const [type, capacity_ml, amount_ml] of [['beaker', 100, 4], ['flask', 250, 10], ['test_tube', 50, 2], ['cylinder', 100, 4]] as const) {
  const geometry = createStockSolidGeometry('TURNINGS', 'Cu'), volume = solidSceneVolume({ type, capacity_ml }, amount_ml);
  const start = performance.now(), initial = createStockSolidLayout(type, 'TURNINGS', geometry, volume), cold_ms = performance.now() - start;
  const hits = [], shrinking = [];
  for (let i = 0; i < 150; i++) {
    let t = performance.now(); createStockSolidLayout(type, 'TURNINGS', geometry, volume);
    if (i >= 30) hits.push(performance.now() - t);
    t = performance.now(); createStockSolidLayout(type, 'TURNINGS', geometry, volume * (1 - i * 0.001), volume);
    if (i >= 30) shrinking.push(performance.now() - t);
  }
  rows.push({ type, capacity_ml, amount_ml, status: initial.status, pieces: initial.pieces.length, triangles: (geometry.index?.count ?? geometry.attributes.position.count) / 3 * initial.pieces.length,
    cold_ms, cache_hit_median_ms: quantile(hits, 0.5), cache_hit_p95_ms: quantile(hits, 0.95), shrinking_median_ms: quantile(shrinking, 0.5), shrinking_p95_ms: quantile(shrinking, 0.95), hits, shrinking });
  geometry.dispose();
}
await writeFile(`${output}/cpu.json`, JSON.stringify({ node: process.version,
  method: 'CPU only: one cold envelope search per shape, then 30 warmups + 120 measured cached-plan / shrinking-volume updates. Excludes React, upload, draw and coating updates. No FPS claim.', rows }, null, 2) + '\n');
console.log(rows.map(({ hits, shrinking, ...row }) => row));
