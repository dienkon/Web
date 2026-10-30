import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { sedimentPlane } from '../src/simulation/effects/sedimentPlane';
import { createClippedSedimentGeometry } from '../src/simulation/effects/clippedSedimentGeometry';
const output = 'docs/research/sediment-surface-2026-10-30'; await mkdir(output, { recursive: true });
const quantile = (values: number[], q: number) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * q)];
const rows = [];
for (const type of ['beaker', 'flask', 'test_tube', 'cylinder']) {
  const profile = getVesselProfile(type, 100), samples: { solve_ms: number; geometry_ms: number; total_ms: number; triangles: number }[] = [];
  for (let i = 0; i < 45; i++) {
    const start = performance.now(), plane = sedimentPlane(profile, 0.5 + i * 0.001, [0.3, Math.sqrt(0.91), 0]), solved = performance.now();
    const geometry = createClippedSedimentGeometry(type, plane), end = performance.now();
    if (i >= 5) samples.push({ solve_ms: solved - start, geometry_ms: end - solved, total_ms: end - start, triangles: geometry.index!.count / 3 });
    geometry.dispose();
  }
  rows.push({ type, samples, median_solve_ms: quantile(samples.map(s => s.solve_ms), 0.5),
    median_geometry_ms: quantile(samples.map(s => s.geometry_ms), 0.5), p95_total_ms: quantile(samples.map(s => s.total_ms), 0.95) });
}
await writeFile(`${output}/cpu-benchmark.json`, JSON.stringify({ node: process.version, method: 'CPU only, serial plane solution plus geometry construction, 5 warmups + 40 measured samples per contour. No GPU/frame/FPS claim.', rows }, null, 2) + '\n');
console.log(rows.map(({ samples, ...r }) => r));
