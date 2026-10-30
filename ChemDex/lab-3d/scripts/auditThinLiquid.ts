import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import { getVesselProfile, type VesselProfile } from '../src/pour/physics/profiles';
import { solveLevel, volumeBelowPlane, retainedVolume } from '../src/pour/physics/retained';
import { cylinderPlaneReference } from '../tests/helpers/cylinderPlaneReference';

const output = 'docs/research/thin-liquid-2026-10-30';
await mkdir(output, { recursive: true });
const profile: VesselProfile = { type: 'reference-cylinder', H: 2, baseY: -1, r: () => 1,
  lipLocal: [1, 1, 0], mouthR: 1, spoutWidth: 0.2, capacity_ml: 100, sceneScale: Math.cbrt(100 / (2 * Math.PI)),
  contour: [[1, -1], [1, 1]], referenceSceneVolume: 2 * Math.PI };
const rows = [];
for (const angle of [0.3, 0.8, Math.PI / 2, 2.2]) {
  for (const fraction of [1e-8, 1e-6, 1e-4, 0.01, 0.5]) {
    const level = solveLevel(profile, angle, fraction * 100);
    const reference = cylinderPlaneReference(1, 2, -1, -Math.sin(angle), Math.cos(angle), level.c);
    rows.push({ angle, fraction, c: level.c, surfaceArea: level.surfaceArea,
      solverVolume: volumeBelowPlane(profile, -Math.sin(angle), Math.cos(angle), level.c),
      independentVolume: reference, relativeError: (reference - fraction * 2 * Math.PI) / (fraction * 2 * Math.PI) });
  }
}
const quantile = (a: number[], q: number) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * q)];
const cpu = [];
for (const type of ['beaker', 'flask', 'test_tube', 'cylinder']) {
  const p = getVesselProfile(type), samples: number[] = [];
  for (let i = 0; i < 250; i++) {
    const start = performance.now();
    const angle = 0.8 + i * 0.0001;
    solveLevel(p, angle, p.capacity_ml * (i % 2 ? 1e-6 : 0.4)); retainedVolume(p, angle);
    if (i >= 50) samples.push(performance.now() - start);
  }
  cpu.push({ type, median_ms: quantile(samples, 0.5), p95_ms: quantile(samples, 0.95), samples });
}
const label = process.argv[2] ?? 'after';
await writeFile(`${output}/${label}.json`, JSON.stringify({ node: process.version,
  method: 'Cylinder reference integrates x independently with floor/top crossings. CPU: serial solveLevel plus retainedVolume; 50 warmups and 200 measured samples, alternating 1e-6 and 0.4 capacity; not FPS.', rows, cpu }, null, 2) + '\n');
console.log({ label, maxRelativeVolumeError: Math.max(...rows.map(r => Math.abs(r.relativeError))), cpu: cpu.map(({ samples, ...r }) => r) });
