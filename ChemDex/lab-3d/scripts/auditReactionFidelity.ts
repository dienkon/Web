/** Inventory/audit of fidelity evidence, not a certificate of experimental accuracy.
 * Run after source edits settle: npx tsx scripts/auditReactionFidelity.ts
 * Literal test references identify files to inspect; they NEVER count as tests run. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library';
import { DETERMINISTIC_REACTIONS } from '../src/engine/chemistryEngine';
import { getLessonDefinition, LESSON_DEFINITIONS } from '../src/lesson/catalog';
import { auditEquation } from '../src/science/balance';
import { validateProgram } from '../src/shared/programSchema';
import { getReactionReview, SCIENCE_REFERENCES } from '../src/science/reviewCatalog';
import { createStudioSample, planStudioProgram, studioProgramForReaction } from '../src/engine/studioProgram';
import { advanceReaction } from '../src/engine/advanceReaction';
import { EFFECT_ATOM_CATALOG } from '../src/vfx/catalog';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import { INSTRUMENTS } from '../src/handling/instrumentCatalog';
import { coverageInventory } from '../src/physical/catalog';
import type { ReactionProgram } from '../src/shared/programSchema';
import type { VesselState } from '../src/types/chemistry';

const posix = (path: string) => path.replaceAll('\\', '/');
function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? files(join(root, entry.name)) : [join(root, entry.name)]);
}
const testFiles = files('tests').filter(path => path.endsWith('.test.ts')).map(path => ({ path: posix(path), text: readFileSync(path, 'utf8') }));
const authoredFiles = [...files('src/vfx/programs/library'), ...files('src/lesson/catalog')]
  .filter(path => path.endsWith('.ts')).map(path => ({ path: posix(path), text: readFileSync(path, 'utf8') }));
const references = (key: string) => testFiles.filter(file => file.text.includes(`'${key}'`) || file.text.includes(`"${key}"`)).map(file => file.path);
const definitionLocations = (key: string) => authoredFiles.flatMap(file => file.text.split(/\r?\n/).flatMap((line, index) =>
  line.includes(`'${key}'`) || line.includes(`"${key}"`) ? [`${file.path}:${index + 1}`] : []));
const atomNames = new Set(EFFECT_ATOM_CATALOG.map(atom => atom.name));
const shell = (): VesselState => ({ id: 'fidelity-audit', name: 'Audit specimen', type: 'beaker', position: [0, 0, 0],
  rotationY: 0, isLocked: false, temperature_c: 25, ph: 7, capacity_ml: 100, volume_ml: 0, volume: 0,
  contents: [], substances: [], mass_g: 0, hasGas: false, hasPrecipitate: false, isBoiling: false });

function specimenProbe(program: ReactionProgram) {
  if (getLessonDefinition(program.id) || program.chemistry.representation === 'emission')
    return { status: 'separate_runtime_not_probed' as const };
  try {
    const sample = createStudioSample(program, shell());
    const plan = planStudioProgram(program, sample, 'vi');
    const dt = 0.1;
    const step = (durationScale: number, halfTimeScale: number) => {
      if (!plan.kinetics) return null;
      const kinetics = structuredClone(plan.kinetics);
      kinetics.duration *= durationScale;
      kinetics.program!.chemistry.kinetics.halfTime_s *= halfTimeScale;
      return advanceReaction(kinetics, structuredClone(sample), dt);
    };
    const reference = step(1, 1), duration10x = step(10, 1), halfTime10x = step(1, 10);
    return { status: 'software_probe_only' as const, volume_ml: sample.volume_ml, mass_g: sample.mass_g,
      inventoryMass_g: sample.contents.reduce((sum, row) => sum + row.mass_g, 0),
      contents: sample.contents.map(row => ({ formula: row.formula, phase: row.phase, mass_g: row.mass_g, moles: row.moles,
        concentration_M: row.concentration_M })),
      initialConditionsReady: !!plan.kinetics, unmet: plan.unmet,
      progressProbe: { dt_s: dt, reference, duration10x, halfTime10x,
        respondsToDuration: reference !== null && duration10x !== null && Math.abs(reference - duration10x) > 1e-12,
        respondsToHalfTime: reference !== null && halfTime10x !== null && Math.abs(reference - halfTime10x) > 1e-12,
        scope: 'Direct planStudioProgram + advanceReaction at initial conditions. No rendering, contact dynamics or fitted rates. Manual selectors can choose other planners.' } };
  } catch (error) { return { status: 'probe_error' as const, error: String(error) }; }
}

const requiredEvidence = [
  'sourced_reagent_preparation_order_and_conditions',
  'small_and_large_dose_tool_choice_and_finite_delivery',
  'reaction_and_relaxation_time_compared_with_experiment',
  'phase_color_morphology_heat_and_gas_comparison',
  'renderer_sequence_review_from_multiple_views',
  'manual_auto_pause_transfer_and_replay_invariants',
];
const programs = ALL_HANDCRAFTED_PROGRAMS.map(program => {
  const lesson = getLessonDefinition(program.id), review = getReactionReview(program.id), validation = validateProgram(program);
  const optical = ['indicator', 'emission'].includes(program.chemistry.representation ?? '');
  const balance = optical ? null : auditEquation(
    program.chemistry.species.filter(row => row.role === 'reactant').map(row => ({ formula: row.formula, coefficient: row.coeff })),
    program.chemistry.species.filter(row => row.role === 'product').map(row => ({ formula: row.formula, coefficient: row.coeff })));
  const probe = specimenProbe(program), precipitate = program.visual.after.precipitate;
  const profile = precipitate ? getPrecipitateProfile(precipitate.substance, precipitate.morphology, precipitate.color) : null;
  const flags = ['timing_not_experimentally_calibrated', 'renderer_sequence_not_individually_verified_in_this_audit'];
  if (review?.evidence !== 'specific_observation') flags.push('literature_is_family_or_model_context');
  if (lesson) flags.push('lesson_duration_is_compressed_model_time', 'lesson_conditions_are_scenario_controls');
  if ('progressProbe' in probe && probe.progressProbe?.respondsToDuration) flags.push('visual_duration_changes_chemical_progress_in_probe');
  if (profile?.modelBasis === 'generic_fallback') flags.push('solid_product_uses_generic_transport_profile');
  if (program.chemistry.species.some(row => row.role === 'reactant' && row.phase === 'aq')) flags.push('aqueous_stock_preparation_and_dose_procedure_needs_review');
  if (program.chemistry.kinetics.model === 'diffusion_limited') flags.push('diffusion_law_requires_concentration_boundary_layer_validation');
  return { id: program.id, equation: program.chemistry.equation, definitionLocations: definitionLocations(program.id),
    runtime: lesson ? 'lesson' : program.chemistry.representation === 'emission' ? 'emission' : 'finite_ledger',
    representation: program.chemistry.representation ?? 'reaction',
    species: program.chemistry.species, conditions: lesson?.conditions ?? program.chemistry.conditions ?? {},
    timing: { declaredKinetics: program.chemistry.kinetics, visualDuration_s: program.visual.duration_s,
      declaredTimeWarp: program.visual.timeWarp ?? null, lessonDuration_s: lesson?.duration_s,
      lessonPhysicalTime: lesson?.physicalTime_vi, calibration: review?.quantitativeCalibration ?? 'missing' },
    observation: program.explain.observation_vi, explanation: program.explain.why_vi,
    literature: { scope: review?.evidence ?? 'missing', finding: review?.finding_vi,
      sources: (review?.references ?? []).map(key => ({ key, ...SCIENCE_REFERENCES[key] })) },
    definitionChecks: { schemaValid: validation.success, balance,
      missingAtomNames: program.visual.timeline.filter(atom => !atomNames.has(atom.atom)).map(atom => atom.atom) },
    authoredEffects: { atoms: program.visual.timeline.map(atom => ({ name: atom.atom, anchor: atom.anchor, params: atom.params })),
      after: program.visual.after, precipitateProfile: profile ? { id: profile.id, morphology: profile.morphology,
        modelBasis: profile.modelBasis ?? 'uncalibrated_transport', density_g_cm3: profile.particleDensity_g_cm3 } : null },
    specimenProbe: probe,
    testReferences: { meaning: 'Literal ID matches only; not coverage and not test execution results.', files: references(program.id),
      catalogWideFiles: ['tests/auto_experiment.test.ts', 'tests/reaction_programs_library.test.ts', 'tests/scientific_catalog_regressions.test.ts'] },
    knownReviewFlags: flags, completion: { fullGoalVerified: false, missingRequiredEvidence: requiredEvidence } };
});
const deterministic = DETERMINISTIC_REACTIONS.map(reaction => ({ id: reaction.id, equation: reaction.equation,
  programId: studioProgramForReaction(reaction.id)?.id ?? null,
  execution: reaction.equilibriumOnly ? 'finite_phase_equilibrium' : 'stoichiometric_predictor',
  balance: auditEquation(Object.entries(reaction.stoichiometry).filter(([, coefficient]) => coefficient > 0).map(([formula, coefficient]) => ({ formula, coefficient })),
    Object.entries(reaction.products).map(([formula, product]) => ({ formula, coefficient: product.coeff }))),
  conditions: { heating: reaction.requiresHeating ?? false, minimum_c: reaction.minTemp_c ?? null },
  testReferences: references(reaction.id), fullProcessFidelityVerified: false }));

const toolGaps: Record<string, string[]> = {
  pipette: ['Compare 10 mL UI identity against actual tip/bulb geometry and chosen tool capacity.', 'Atomic instrument button transfer is not evidence of an animated aspirate/meniscus/drop contact cycle.', 'Check residual film, calibration and cleanup boundaries.'],
  burette: ['Verify stopcock to stream/drop transition and finite drop travel on renderer.', 'Nominal 0.05 mL is a display model, not calibration of every reagent/nozzle.'],
  balance: ['Validate pan contact and displayed settling delay across all vessel sizes.', 'Selected laboratory model, resolution, calibration and loading domain are absent.'],
  thermometer: ['Compare probe insertion and immersion across all vessel geometries.', 'Thermal response constant is illustrative; no selected probe datasheet.'],
  ph_meter: ['Verify wet/dry immersion, response delay and lack of fabricated pH for unsupported solutions.', 'No electrode calibration protocol or finite carried wet film.'],
  stirring_rod: ['Renderer/contact/vortex regressions exist; review every vessel and every heterogeneous sample.', 'Capillary film and local concentration field remain outside model.'],
  spatula: ['Verify retained dose visibly follows spoon through pick-up, release and partial remaining dose.', 'Button deposit currently calls mixSubstances; assess physical-contact consistency with manual drag.'],
  sponge: ['Verify cleaning follows finite collected stock and never destroys unrelated inventory.', 'Wet wiping, solvent uptake and footprint require direct rendered review.'],
};
const physicalEntries = coverageInventory().filter(entry => ['tool', 'apparatus', 'vessel'].includes(entry.kind));
const ids = [...new Set([...physicalEntries.map(entry => entry.id), ...INSTRUMENTS.map(entry => entry.id)])].sort();
const tools = ids.map(id => {
  const ui = INSTRUMENTS.find(tool => tool.id === id), physical = physicalEntries.find(entry => entry.id === id);
  return { id, name: ui?.name ?? physical?.name ?? id, kind: physical?.kind ?? 'ui_instrument',
    instructions: ui?.instructions ?? [], targetRequired: ui?.targetRequired ?? null, allowsLesson: ui?.allowsLesson ?? null,
    physicalValidation: physical?.validation ?? null, behaviors: physical?.behaviors ?? [],
    testReferences: { meaning: 'Literal ID references; no inference of behavior or visual coverage.', files: references(id) },
    openReview: toolGaps[id] ?? ['Check all supported actions with real render, contact geometry, material accounting and undo/redo.',
      'Physical catalog coverage is an estimate, not an instrument-specific verification.'],
    fullGoalVerified: false };
});

const sourcePaths = [...authoredFiles.map(file => file.path), 'src/engine/studioProgram.ts', 'src/engine/advanceReaction.ts',
  'src/engine/contactKinetics.ts', 'src/engine/heatActivatedProgress.ts', 'src/vfx/autoplay/AutoExperiment.ts',
  'src/vfx/autoplay/AutoExperimentScene.tsx', 'src/handling/instrumentCatalog.ts', 'src/handling/instrumentOperations.ts',
  'src/science/reviewCatalog.ts', 'src/lesson/chemistry/kinetics.ts'];
const failures = programs.filter(row => !row.definitionChecks.schemaValid || row.definitionChecks.balance?.valid === false
  || row.definitionChecks.missingAtomNames.length > 0 || row.specimenProbe.status === 'probe_error');
const report = { schema: 'chemdex.reaction-fidelity-audit/1', generatedAt: new Date().toISOString(),
  evidenceScope: 'Complete current-ID inventory, strict definitions and initial ledger probes. No full reaction playback, external experimental calibration or renderer equivalence certificate.',
  counts: { programs: programs.length, lessonSubset: LESSON_DEFINITIONS.length, deterministicRules: deterministic.length,
    toolsAndApparatus: tools.length, schemaOrProbeFailures: failures.length,
    durationSensitiveProbes: programs.filter(row => row.knownReviewFlags.includes('visual_duration_changes_chemical_progress_in_probe')).length,
    genericSolidProfiles: programs.filter(row => row.knownReviewFlags.includes('solid_product_uses_generic_transport_profile')).length,
    experimentSpecificSources: programs.filter(row => row.literature.scope === 'specific_observation').length,
    individuallyExperimentallyCalibrated: 0, fullGoalVerified: 0 },
  sourceHashes: Object.fromEntries(sourcePaths.map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')])),
  programs, deterministic, tools };
const output = process.env.FIDELITY_AUDIT_OUTPUT ?? 'artifacts/reaction-fidelity';
mkdirSync(output, { recursive: true });
writeFileSync(join(output, 'inventory.json'), JSON.stringify(report, null, 2) + '\n');
const lines = ['# Kiểm kê toàn bộ phản ứng và dụng cụ', '',
  'Bảng này kiểm ID/định nghĩa/probe phần mềm. Tệp test được dẫn theo chuỗi ID, không chứng minh coverage hay test đã chạy. **Không mục nào được chứng nhận khớp toàn bộ thực nghiệm chỉ từ audit này.**', '',
  `Chương trình: ${programs.length}; bài học là tập con: ${LESSON_DEFINITIONS.length}; quy tắc native: ${deterministic.length}; dụng cụ/bình/phụ kiện: ${tools.length}.`, '',
  '| ID | Runtime | Model khai báo | Clip / half-time (s) | Nguồn | Probe phụ thuộc clip | Profile rắn |',
  '| --- | --- | --- | --- | --- | --- | --- |'];
for (const row of programs) lines.push(`| ${row.id} | ${row.runtime} | ${row.timing.declaredKinetics.model} | ${row.timing.visualDuration_s} / ${row.timing.declaredKinetics.halfTime_s} | ${row.literature.scope} | ${row.knownReviewFlags.includes('visual_duration_changes_chemical_progress_in_probe') ? 'Có' : row.specimenProbe.status !== 'software_probe_only' || !row.specimenProbe.initialConditionsReady ? 'Chưa probe đủ điều kiện' : 'Không ở bước đầu'} | ${row.authoredEffects.precipitateProfile?.modelBasis ?? '—'} |`);
lines.push('', '## Dụng cụ / bình / phụ kiện', '', '| ID | Tên | Trạng thái dữ liệu vật lý | Cần rà trực tiếp |', '| --- | --- | --- | --- |');
for (const row of tools) lines.push(`| ${row.id} | ${row.name} | ${row.physicalValidation?.status ?? 'Không có entry'} | ${row.openReview.join(' ')} |`);
lines.push('', 'Chi tiết điều kiện, phương trình, probes, danh sách test và hash nguồn nằm trong `inventory.json`.');
writeFileSync(join(output, 'inventory.vi.md'), lines.join('\n') + '\n');
console.log(JSON.stringify({ output, ...report.counts, failures: failures.map(row => row.id) }, null, 2));
if (failures.length || deterministic.some(row => !row.balance.valid)) process.exitCode = 1;
