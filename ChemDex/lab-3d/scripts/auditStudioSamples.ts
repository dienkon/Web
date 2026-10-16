import { mkdirSync, writeFileSync } from 'node:fs';
import { ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library';
import { LESSON_PROGRAM_IDS } from '../src/lesson/programCompiler';
import { createStudioSample, planStudioProgram } from '../src/engine/studioProgram';
import { readComposition } from '../src/science/balance';
import { computeMolarMass } from '../src/engine/ledger';
import type { VesselState } from '../src/types/chemistry';

const shell: VesselState = { id: 'audit', name: 'Studio audit', type: 'beaker', capacity_ml: 100,
  position: [0, 0, 0], rotationY: 0, isLocked: false, contents: [], substances: [], volume_ml: 0,
  volume: 0, mass_g: 0, temperature_c: 25, ph: 7, hasPrecipitate: false, hasGas: false, isBoiling: false };
const samples = ALL_HANDCRAFTED_PROGRAMS.filter(program => !LESSON_PROGRAM_IDS.has(program.id)
  && program.chemistry.representation !== 'emission').map(program => {
  const vessel = createStudioSample(program, shell);
  const plan = planStudioProgram(program, vessel, 'vi');
  const nonMolecularLabels: string[] = [];
  for (const item of vessel.contents) {
    try { readComposition(item.formula); }
    catch { nonMolecularLabels.push(item.formula); continue; }
    if (Math.abs(item.mass_g - computeMolarMass(item.formula) * item.moles) > 1e-9) throw new Error('Molar mass mismatch: ' + program.id);
  }
  if (Math.abs(vessel.mass_g - vessel.contents.reduce((sum, item) => sum + item.mass_g, 0)) > 1e-9) throw new Error('Sample mass mismatch: ' + program.id);
  return { programId: program.id, equation: program.chemistry.equation,
    quantityPolicy: 'authored_virtual_sample_not_real_lab_protocol',
    volume_ml: vessel.volume_ml, mass_g: vessel.mass_g, temperature_c: vessel.temperature_c,
    isSealed: vessel.isSealed, contents: vessel.contents,
    readyUnderDeclaredModelConditions: !!plan.kinetics, unmetConditions: plan.unmet,
    needsActivationReview: program.chemistry.kinetics.model === 'heat_activated'
      && program.chemistry.conditions?.minTemp_c === undefined,
    nonMolecularLabels,
  };
});
mkdirSync('artifacts/science-audit', { recursive: true });
writeFileSync('artifacts/science-audit/studio-samples.json', JSON.stringify({
  schema: 'chemdex.studio-sample-audit/1', checkedAt: new Date().toISOString(),
  scope: 'Mass/formula/phase audit only; model eligibility is not experimental validation.',
  sampleCount: samples.length, samples,
}, null, 2) + '\n');
console.log(JSON.stringify({ samples: samples.length,
  readyUnderDeclaredModelConditions: samples.filter(sample => sample.readyUnderDeclaredModelConditions).length,
  waitingForDeclaredConditions: samples.filter(sample => !sample.readyUnderDeclaredModelConditions).length,
  activationConditionsNeedReview: samples.filter(sample => sample.needsActivationReview).map(sample => sample.programId),
}, null, 2));
