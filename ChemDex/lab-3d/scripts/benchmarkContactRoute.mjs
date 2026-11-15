import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { transform } from 'esbuild';
import { clippedSolidVolume } from '../src/science/clippedSolidVolume.ts';
import { partitionDryStock } from '../src/physical/stockLiquidContact.ts';

// Pin the pre-optimization revision, never moving HEAD. Resolve baseline
// imports against their original source directories so
// baseline/current run in one process with the same dependencies and inputs.
const BASELINE_COMMIT = '16a97049';
async function baselineModule(sourcePath) {
  const text = execFileSync('git', ['show', `${BASELINE_COMMIT}:ChemDex/lab-3d/${sourcePath}`], { encoding: 'utf8' });
  const { code } = await transform(text, { loader: 'ts', format: 'esm', target: 'es2022' });
  const resolved = code.replace(/from "(\.[^"]+)"/g, (_, specifier) => {
    const stem = resolve(dirname(sourcePath), specifier);
    const file = [stem, `${stem}.ts`, `${stem}.tsx`, join(stem, 'index.ts'), join(stem, 'index.tsx')]
      .find(path => existsSync(path) && statSync(path).isFile());
    if (!file) throw new Error(`Missing baseline import ${specifier}`);
    return `from ${JSON.stringify(pathToFileURL(file).href)}`;
  });
  // The stock module also uses Three. A data URL has no package lookup base.
  const withPackages = resolved.replace(/from "three"/g, `from ${JSON.stringify(import.meta.resolve('three'))}`);
  return import(`data:text/javascript;base64,${Buffer.from(withPackages).toString('base64')}`);
}
const { clippedSolidVolume: baselineClip } = await baselineModule('src/science/clippedSolidVolume.ts');
const { partitionDryStock: baselinePartition } = await baselineModule('src/physical/stockLiquidContact.ts');

const fixture = JSON.parse(readFileSync('artifacts/contact-route-profile/clip-queries.json', 'utf8'));
const meshes = fixture.meshes.map(mesh => ({ ...mesh, triangles: Float64Array.from(mesh.triangles) }));
const snapshots = JSON.parse(readFileSync('artifacts/contact-route-profile/snapshots.json', 'utf8'));
let maxAbsoluteError = 0;
for (const { mesh, planes, origin } of fixture.queries) {
  const a = baselineClip(meshes[mesh], planes, origin), b = clippedSolidVolume(meshes[mesh], planes, origin);
  maxAbsoluteError = Math.max(maxAbsoluteError, Math.abs(a - b));
  if (Math.abs(a - b) > 1e-12) throw new Error(`Clip mismatch: ${a} versus ${b}`);
}
for (const snapshot of snapshots) {
  const summarize = result => ({ reactive: result.reactiveContents, inert: result.inertContents,
    motion: result.reactiveVessel.stockMotion, mass: result.reactiveVessel.mass_g,
    protected: [...result.protectedMolesByRow.values()] });
  if (JSON.stringify(summarize(baselinePartition(snapshot))) !== JSON.stringify(summarize(partitionDryStock(snapshot))))
    throw new Error('Static contact partition mismatch');
}
const clipRepeats = 50, partitionRepeats = 30;
const clip = fn => { let sum = 0; for (let n = 0; n < clipRepeats; n++) for (const { mesh, planes, origin } of fixture.queries) sum += fn(meshes[mesh], planes, origin); return sum; };
const partition = fn => { let sum = 0; for (let n = 0; n < partitionRepeats; n++) for (const snapshot of snapshots) sum += fn(snapshot).inertContents.length; return sum; };
const measure = (work, before, after) => {
  work(before); work(after); const baseline_ms = [], optimized_ms = [], baselineCPU_ms = [], optimizedCPU_ms = [];
  for (let n = 0; n < 8; n++) for (const [fn, output, cpuOutput] of n % 2
    ? [[after, optimized_ms, optimizedCPU_ms], [before, baseline_ms, baselineCPU_ms]]
    : [[before, baseline_ms, baselineCPU_ms], [after, optimized_ms, optimizedCPU_ms]]) {
    const cpuStart = process.cpuUsage(), start = performance.now(); work(fn); output.push(performance.now() - start);
    const cpu = process.cpuUsage(cpuStart); cpuOutput.push((cpu.user + cpu.system) / 1000);
  }
  const median = values => { const sorted = [...values].sort((a, b) => a - b); return (sorted[3] + sorted[4]) / 2; };
  return { baseline_ms, optimized_ms, baselineCPU_ms, optimizedCPU_ms,
    baselineMedian_ms: median(baseline_ms), optimizedMedian_ms: median(optimized_ms),
    baselineCPUMedian_ms: median(baselineCPU_ms), optimizedCPUMedian_ms: median(optimizedCPU_ms),
    speedup: median(baseline_ms) / median(optimized_ms) };
};
const report = { route: fixture.route, baselineCommit: BASELINE_COMMIT, node: process.version,
  sampledClipQueries: fixture.queries.length, totalClipQueries: fixture.queryCount,
  staticSnapshots: snapshots.length, maxAbsoluteError, partitionOutputsIdentical: true,
  clipRepeatsPerTrial: clipRepeats, partitionRepeatsPerTrial: partitionRepeats,
  clip: measure(clip, baselineClip, clippedSolidVolume), partition: measure(partition, baselinePartition, partitionDryStock) };
writeFileSync('artifacts/contact-route-profile/ab-benchmark.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
