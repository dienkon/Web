import { mkdirSync, writeFileSync } from 'node:fs';
import { ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library';

const entries = ALL_HANDCRAFTED_PROGRAMS.map(program => {
  const value = program.chemistry.deltaH_kJ_per_mol;
  if (value != null && !Number.isFinite(value)) throw new Error('Nonfinite enthalpy: ' + program.id);
  const sourceUrls = program.chemistry.deltaHSourceUrls ?? [];
  return { id: program.id, equation: program.chemistry.equation, deltaH_kJ_per_mol_reaction: value ?? null,
    basis: 'coefficients_as_written',
    referenceTemperature_K: program.chemistry.deltaHReferenceTemperature_K ?? null,
    sourceUrls, note_vi: program.chemistry.deltaHNote_vi ?? null,
    review: value == null ? 'missing' : sourceUrls.length ? 'sourced_reference_not_sample_calibration' : 'legacy_value_not_source_reviewed',
    experimentallyCalibratedForSample: false };
});
const counts = { programs: entries.length,
  sourcedReferences: entries.filter(entry => entry.review === 'sourced_reference_not_sample_calibration').length,
  legacyValuesNeedReview: entries.filter(entry => entry.review === 'legacy_value_not_source_reviewed').length,
  missing: entries.filter(entry => entry.review === 'missing').length };
mkdirSync('artifacts/science-audit', { recursive: true });
writeFileSync('artifacts/science-audit/thermochemistry.json', JSON.stringify({
  schema: 'chemdex.thermochemistry-audit/1', checkedAt: new Date().toISOString(), counts,
  scope: 'Data completeness and stated basis only. No pass claim for concentration-dependent calorimetry.', entries,
}, null, 2) + '\n');
console.log(JSON.stringify(counts, null, 2));
