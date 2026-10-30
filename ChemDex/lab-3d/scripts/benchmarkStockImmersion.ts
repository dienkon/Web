import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync } from 'node:fs';
import { stockImmersion } from '../src/science/stockImmersion';
import { solveStockLiquidSurface } from '../src/science/stockLiquidSurface';
const rows = [];
const percentile = (values: number[], q: number) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * q)];
for (const [type, capacity_ml, amount] of [['beaker', 100, 4], ['flask', 250, 10], ['test_tube', 50, 2], ['cylinder', 100, 4]] as const) {
  const vessel = { type, capacity_ml, volume_ml: capacity_ml * 0.7, contents: [
    { formula: 'Cu', phase: 's' as const, mass_g: amount * 8.96, moles: amount * 8.96 / 63.546 }] };
  let start = performance.now(); const model = stockImmersion(vessel)!; const cold_model_ms = performance.now() - start;
  const solve: number[] = [], hit: number[] = [];
  for (let i = 0; i < 150; i++) {
    const angle = 0.25 + i / 150 * 1.1, n = [-Math.sin(angle), Math.cos(angle), 0] as const;
    start = performance.now(); solveStockLiquidSurface(vessel, n); const elapsed = performance.now() - start;
    start = performance.now(); solveStockLiquidSurface(vessel, n); const cached = performance.now() - start;
    if (i >= 30) { solve.push(elapsed); hit.push(cached); }
  }
  rows.push({ type, capacity_ml, amount_ml: amount, inside_ml: model.insideVolume_ml, cold_model_ms,
    changing_pose_median_ms: percentile(solve, 0.5), changing_pose_p95_ms: percentile(solve, 0.95),
    cache_hit_median_ms: percentile(hit, 0.5), cache_hit_p95_ms: percentile(hit, 0.95), solve, hit });
}
const output = 'docs/research/stock-immersion-2026-10-30'; mkdirSync(output, { recursive: true });
writeFileSync(`${output}/cpu.json`, JSON.stringify({ node: process.version,
  method: 'One cold model build, then 30 warmups and 120 changing normals and immediately repeated identical solves. CPU only; excludes React, buffer upload, drawing, controller and coatings. No FPS claim.', rows }, null, 2));
console.log(JSON.stringify(rows.map(({ solve, hit, ...row }) => row), null, 2));
