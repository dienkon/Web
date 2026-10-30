import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync } from 'node:fs';
import { solveStockLiquidSurface } from '../src/science/stockLiquidSurface';
import { separatedLayers } from '../src/science/liquidLayers';
import type { SubstanceContent } from '../src/types/chemistry';
import { computeMolarMass } from '../src/engine/ledger';
const rows = [], q = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)];
for (const heavy of [false, true]) {
  const formula = heavy ? 'CHCl3' : 'C6H6', organicMass = 0.005 * (heavy ? 1.49 : 0.879);
  const contents: SubstanceContent[] = [{ formula: 'H2O', phase: 'l', mass_g: 3, moles: 3 / 18.015 },
    { formula, phase: 'l', liquidLayer: 'organic', mass_g: organicMass, moles: organicMass / computeMolarMass(formula) },
    { formula: 'Zn', phase: 's', mass_g: 7.14, initialMass_g: 7.14, moles: 7.14 / 65.38 }];
  const vessel = { type: 'separatory_funnel' as const, capacity_ml: 150, volume_ml: 3.005, immiscibleOrganicVolume_ml: 0.005, contents };
  const lower = separatedLayers(vessel).lowerVolume_ml;
  const solve = (n: [number, number, number]) => [solveStockLiquidSurface(vessel, n, 1, lower), solveStockLiquidSurface(vessel, n)];
  let start = performance.now(); solve([0, 1, 0]); const cold_two_planes_ms = performance.now() - start;
  const changing: number[] = [], repeated: number[] = [];
  for (let i = 0; i < 150; i++) {
    const angle = i / 150 * 1.2, n: [number, number, number] = [-Math.sin(angle), Math.cos(angle), 0];
    start = performance.now(); solve(n); const elapsed = performance.now() - start;
    start = performance.now(); solve(n); const hit = performance.now() - start;
    if (i >= 30) { changing.push(elapsed); repeated.push(hit); }
  }
  rows.push({ heavy, cold_two_planes_ms, changing_median_ms: q(changing, 0.5), changing_p95_ms: q(changing, 0.95),
    repeated_median_ms: q(repeated, 0.5), repeated_p95_ms: q(repeated, 0.95), changing, repeated });
}
const output = 'docs/research/layered-stock-2026-10-30'; mkdirSync(output, { recursive: true });
writeFileSync(`${output}/cpu.json`, JSON.stringify({ node: process.version,
  method: 'Two cumulative liquid surface solves, one cold call including model setup then 30 warmups/120 varying normals and immediate cache hits. CPU only, excludes React/draw/upload/controller. No FPS claim.', rows }, null, 2));
console.log(rows.map(({ changing, repeated, ...r }) => r));
