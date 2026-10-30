import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync } from 'node:fs';
import { getAllHandcraftedPrograms, getProgramById } from '../src/vfx/programs/library';
import { createStudioSample } from '../src/engine/studioProgram';
import { aliquotContactProgramSupported, prepareAliquotContact, evolveAliquotContact } from '../src/engine/aliquotContactChemistry';
import { withdrawAliquot } from '../src/handling/aliquot';
import { readComposition } from '../src/science/balance';
import type { VesselState } from '../src/types/chemistry';

const shell: VesselState = { id: 'audit', name: 'Audit', type: 'beaker', capacity_ml: 250, position: [0, 0, 0],
  rotationY: 0, isLocked: false, contents: [], substances: [], mass_g: 0, volume_ml: 0, volume: 0, temperature_c: 25,
  ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false };
const programs = getAllHandcraftedPrograms().filter(aliquotContactProgramSupported), rows = [];
for (const program of programs) {
  try {
    const input = prepareAliquotContact(withdrawAliquot(createStudioSample(program, shell), 5).sample, program.id);
    const output = evolveAliquotContact(input, 0.1), atoms = (contents: typeof input.contents) => {
      const result: Record<string, number> = {};
      for (const c of contents) for (const [a, n] of Object.entries(readComposition(c.formula).atoms)) result[a] = (result[a] ?? 0) + n * c.moles;
      return result;
    };
    const a = atoms(input.contents), b = atoms(output.contents), error = Math.max(0, ...Object.entries(a).map(([e, n]) => Math.abs(n - (b[e] ?? 0))));
    const massError_g = Math.abs(input.mass_g - output.mass_g);
    const changed = input.contents.some(c => Math.abs(c.moles - output.contents.filter(o => o.formula === c.formula && o.phase === c.phase).reduce((sum, o) => sum + o.moles, 0)) > 1e-12);
    rows.push({ id: program.id, selected: input.reactionProgramId, changed, modelLimit: output.contactChemistryLimit ?? null,
      maxAtomError_mol: error, massError_g, temperature_c: output.temperature_c });
    if (error > 1e-9 || massError_g > 1e-9 || output.contents.some(c => c.mass_g < 0 || c.moles < 0)) process.exitCode = 1;
  } catch (error) { rows.push({ id: program.id, error: String(error) }); process.exitCode = 1; }
}
let samples = Array.from({ length: 24 }, () => prepareAliquotContact(withdrawAliquot(createStudioSample(getProgramById('hcl_naoh')!, shell), 5).sample, 'hcl_naoh'));
const durations: number[] = [];
for (let i = 0; i < 120; i++) {
  const start = performance.now(); samples = samples.map(s => evolveAliquotContact(s, 1 / 120));
  if (i >= 20) durations.push(performance.now() - start);
}
durations.sort((a, b) => a - b);
const report = { node: process.version, supportedPrograms: programs.length, rows,
  benchmark: { scope: 'CPU only, 24 progressively reacting samples per 1/120 s step; not GPU FPS or renderer',
    median_ms: durations[Math.floor(durations.length / 2)], p95_ms: durations[Math.floor(durations.length * 0.95)] } };
const folder = 'docs/research/aliquot-chemistry-2026-10-29'; mkdirSync(folder, { recursive: true });
writeFileSync(`${folder}/model-audit.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
