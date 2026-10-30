import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import { LatheGeometry, Vector2 } from 'three';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { solveLevel } from '../src/pour/physics/retained';
import { createLiquidVolumeGeometry, liquidMeshLayout, liquidRadialSegments } from '../src/vfx/materials/liquidGeometry';
const output = 'docs/research/wet-arc-mesh-2026-10-30'; await mkdir(output, { recursive: true });
const quantile = (a: number[], q: number) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * q)];
const rows = [];
for (const type of ['beaker', 'flask', 'test_tube', 'cylinder']) {
  const p = getVesselProfile(type), points = [...p.contour!.map(([r, y]) => new Vector2(r, y)), new Vector2(0, p.baseY + p.H)];
  for (const volume_ml of [0.02, 0.0002]) for (const angle of [0.8006482512054093, Math.PI / 2]) {
    const level = solveLevel(p, angle, volume_ml), fineSegments = liquidRadialSegments(p, angle, level.depth);
    const layout = liquidMeshLayout(p, angle, level.c, level.depth), variants = [];
    const samples: number[][] = [[], []], sizes: { vertices: number; triangles: number; bytes: number }[] = [];
    for (let i = 0; i < 75; i++) for (const variant of (i % 2 ? [0, 1] : [1, 0])) {
      const start = performance.now();
      const g = variant === 0 ? new LatheGeometry(points, fineSegments) : createLiquidVolumeGeometry(p, layout);
      const end = performance.now(); if (i >= 15) samples[variant].push(end - start);
      sizes[variant] = { vertices: g.attributes.position.count, triangles: g.index!.count / 3,
        bytes: Object.values(g.attributes).reduce((sum, a) => sum + a.array.byteLength, 0) + g.index!.array.byteLength };
      g.dispose();
    }
    for (let variant = 0; variant < 2; variant++) variants.push({ name: variant === 0 ? 'uniform-before' : 'wet-arc-after',
      ...sizes[variant], median_ms: quantile(samples[variant], 0.5), p95_ms: quantile(samples[variant], 0.95), samples: samples[variant] });
    rows.push({ type, volume_ml, angle, fineSegments, actualSegments: layout.angles.length - 1, variants });
  }
}
await writeFile(`${output}/mesh-cpu.json`, JSON.stringify({ node: process.version,
  method: 'Matched serial CPU construction of previous uniform LatheGeometry and current wet-arc geometry. 15 warmups + 60 measured samples per variant; order alternates each pair. Layout/plane precomputed for both. Includes no GPU upload/draw or cache hit cost, not FPS.', rows }, null, 2) + '\n');
console.log(rows.map(({ variants, ...row }) => ({ ...row, variants: variants.map(({ samples, ...v }) => v) })));
