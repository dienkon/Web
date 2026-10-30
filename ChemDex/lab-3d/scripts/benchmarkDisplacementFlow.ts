import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import { calculateVesselWeirFlow } from '../src/pour/physics/vesselFlow';
import { getWorldVesselProfile } from '../src/pour/physics/profiles';
import { retainedVolume } from '../src/pour/physics/retained';
import { computeMolarMass } from '../src/engine/ledger';
import type { VesselState } from '../src/types/chemistry';
import type { MobileSolidInventory } from '../src/science/suspensionTransport';
const output = 'docs/research/displaced-source-flow-2026-10-30'; await mkdir(output, { recursive: true });
const base = (volume_ml: number, formula?: string, mass_g = 0): VesselState => ({
  id: 'bench', name: 'bench', type: 'beaker', capacity_ml: 100, volume_ml, volume: volume_ml / 100,
  mass_g: volume_ml + mass_g, contents: [{ formula: 'H2O', phase: 'l', mass_g: volume_ml, moles: volume_ml / computeMolarMass('H2O') },
    ...(formula ? [{ formula, phase: 's' as const, mass_g, moles: mass_g / computeMolarMass(formula), ...(formula === 'CuS' ? { solidOrigin: 'precipitate' as const } : {}) }] : [])],
  substances: ['H2O', ...(formula ? [formula] : [])], position: [0, 0, 0], rotationY: 0, temperature_c: 25,
  isLocked: false, ph: 7, liquidColor: '#f8fafc', hasGas: false, hasPrecipitate: false, isBoiling: false,
});
const p = getWorldVesselProfile('beaker', 100);
let low = 1.2, high = 1.65;
for (let i = 0; i < 55; i++) { const a = (low + high) / 2; if (retainedVolume(p, a) > 0.05) low = a; else high = a; }
const fixtures: { name: string; vessel: VesselState; angle: number; mobile: MobileSolidInventory }[] = [
  { name: 'liquid-only', vessel: base(80), angle: 0.5, mobile: {} },
  { name: 'submerged-copper', vessel: base(80, 'Cu', 35.84), angle: 0.5, mobile: {} },
  { name: 'submerged-mobile-affine', vessel: base(80, 'CuS', 1), angle: 0.5, mobile: { CuS: { inventoryMass_g: 1, suspendedMass_g: 1 } } },
  { name: 'partial-mobile-nonlinear', vessel: base(0.1, 'CuS', 0.46), angle: (low + high) / 2, mobile: { CuS: { inventoryMass_g: 0.46, suspendedMass_g: 0.46 } } },
];
const quantile = (a: number[], q: number) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * q)];
const rows = [];
for (const f of fixtures) {
  const samples = [];
  for (let i = 0; i < 250; i++) {
    const start = performance.now(); calculateVesselWeirFlow(f.vessel, f.angle, 0, 1, f.mobile);
    if (i >= 50) samples.push(performance.now() - start);
  }
  rows.push({ name: f.name, angle: f.angle, liquid_ml: f.vessel.volume_ml, median_ms: quantile(samples, 0.5), p95_ms: quantile(samples, 0.95), samples });
}
await writeFile(`${output}/cpu.json`, JSON.stringify({ node: process.version,
  method: 'Pure CPU complete inventory-aware flow calculation, fixed input per case, 50 warmups + 200 measured samples. Includes displacement/retention solve. No renderer, transport step or FPS claim.', rows }, null, 2) + '\n');
console.log(rows.map(({ samples, ...row }) => row));
