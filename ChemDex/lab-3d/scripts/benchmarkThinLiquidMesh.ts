import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
import { LatheGeometry, Vector2 } from 'three';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { solveLevel } from '../src/pour/physics/retained';
import { liquidRadialSegments } from '../src/vfx/materials/liquidGeometry';
const quantile = (a: number[], q: number) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * q)];
const rows = [];
for (const type of ['beaker', 'flask', 'test_tube', 'cylinder']) {
  const p = getVesselProfile(type), points = [...p.contour!.map(([r, y]) => new Vector2(r, y)), new Vector2(0, p.baseY + p.H)];
  for (const volume_ml of [0.02, 0.0002]) for (const angle of [0.8006482512054093, Math.PI / 2]) {
    const level = solveLevel(p, angle, volume_ml), segments = liquidRadialSegments(p, angle, level.depth);
    const samples = []; let vertices = 0, triangles = 0, bytes = 0;
    for (let i = 0; i < 45; i++) {
      const start = performance.now(), g = new LatheGeometry(points, segments), end = performance.now();
      if (i >= 5) samples.push(end - start);
      vertices = g.attributes.position.count; triangles = g.index!.count / 3;
      bytes = Object.values(g.attributes).reduce((sum, a) => sum + a.array.byteLength, 0) + g.index!.array.byteLength;
      g.dispose();
    }
    rows.push({ type, volume_ml, angle, segments, vertices, triangles, bytes, median_ms: quantile(samples, 0.5), p95_ms: quantile(samples, 0.95), samples });
  }
}
await writeFile('docs/research/thin-liquid-2026-10-30/mesh-cpu.json', JSON.stringify({ node: process.version,
  method: 'CPU construction of one LatheGeometry, 5 warmups + 40 samples, excludes GPU upload/draw. Production caches each resolution per liquid component; no FPS claim.', rows }, null, 2) + '\n');
console.log(rows.map(({ samples, ...row }) => row));
