import { mkdirSync, writeFileSync } from 'node:fs';
import { ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library';
import { DETERMINISTIC_REACTIONS } from '../src/engine/chemistryEngine';
import { LESSON_DEFINITIONS } from '../src/lesson/catalog';
import { getLessonSpecies } from '../src/lesson/catalog/species';
import { auditEquation } from '../src/science/balance';
import { sameMolecularFormula } from '../src/science/speciesIdentity';
import { getReactionReview, SCIENCE_REFERENCES } from '../src/science/reviewCatalog';
import { deriveProgramFromRules } from '../src/vfx/programs/resolver';
import { auditDisplayedEquation } from '../src/science/equationText';
import { nativeReagentPhases } from '../src/science/nativeReagentPhases';
import { HYDROXO_AMMINES } from '../src/science/copperAmmoniaEquilibrium';

const mixedEquilibriumAudit = HYDROXO_AMMINES.map(term => ({ product: term.formula, ammoniaCoefficient: term.ammonia,
  hydroxideCoefficient: term.hydroxide, productCharge: term.charge, logBeta25: term.logBeta25,
  estimatedDeltaH_J_mol: term.estimatedDeltaH_J,
  balance: auditEquation([{ formula: 'Cu(2+)', coefficient: 1 }, { formula: 'NH3', coefficient: term.ammonia },
    { formula: 'OH(-)', coefficient: term.hydroxide }], [{ formula: term.formula, coefficient: 1 }]),
}));

function copperModelConditions(id: string) {
  if (!['cuso4_nh3', 'cuso4_nh3_complex', 'cuso4_nh3_hydroxide', 'cuoh2_nh3_complex'].includes(id)) return {};
  return { model: 'coupled_copper_ammonia', referenceEquationOnly: true, temperatureRange_c: [0, 90],
    phaseAmounts: 'Charge and Cu/N/S/Na balances, ammines n=1..4, mixed hydroxo-ammines, hydrolysis, sulfate and Cu(OH)2 saturation.',
    mixedEquilibria: mixedEquilibriumAudit,
    mixedTemperatureBasis: 'Convert OH- association to H2O/H+ using Kw at 25 C, extrapolate estimated enthalpy with zero dCp on that basis, then convert back using Kw(T).',
    limitations: 'Ideal concentrations; mixed-complex temperature enthalpies are source estimates. Dimer/other-ligand chemistry and real-time kinetics are not included.',
  };
}

function reviewFields(id: string) {
  const review = getReactionReview(id);
  if (!review) throw new Error(`Missing individual scientific review: ${id}`);
  return {
    finding_vi: review.finding_vi,
    sourceScope: review.evidence,
    quantitativeCalibration: review.quantitativeCalibration,
    references: review.references.map(key => {
      const source = SCIENCE_REFERENCES[key];
      if (!source) throw new Error(`Missing scientific source ${key}`);
      return source;
    }),
  };
}

const programs = ALL_HANDCRAFTED_PROGRAMS.map(program => {
  const species = program.chemistry.species;
  const reactants = species.filter(term => term.role === 'reactant');
  const products = species.filter(term => term.role === 'product');
  const optical = ['indicator', 'emission'].includes(program.chemistry.representation ?? '');
  const balance = optical ? null : auditEquation(
    reactants.map(term => ({ formula: term.formula, coefficient: term.coeff })),
    products.map(term => ({ formula: term.formula, coefficient: term.coeff })),
  );
  const visualIssues: string[] = [];
  const precipitate = program.visual.after.precipitate;
  if (precipitate && !products.some(term => term.phase === 's' && sameMolecularFormula(term.formula, precipitate.substance))) {
    visualIssues.push(`Declared precipitate ${precipitate.substance} is not a solid product of this equation.`);
  }
  for (const gas of program.visual.after.gasesOffgassed) {
    if (!products.some(term => term.phase === 'g' && sameMolecularFormula(term.formula, gas.species))) {
      visualIssues.push(`Declared gas ${gas.species} is not a gaseous product.`);
    }
  }
  const lesson = LESSON_DEFINITIONS.find(definition => definition.id === program.id);
  return {
    id: program.id, equation: program.chemistry.equation,
    ionicBalance: program.chemistry.ionic ? auditDisplayedEquation(program.chemistry.ionic) : [],
    representation: program.chemistry.representation ?? (lesson ? 'conditional_lesson' : 'reaction'),
    classification: lesson ? [lesson.family] : [],
    balance, visualIssues,
    conditions: lesson?.conditions ?? { ...program.chemistry.conditions, ...copperModelConditions(program.id) },
    ...reviewFields(program.id),
    parameterLimits: ['Kinetic time and RGB values are illustrative.', 'Enthalpy and activities are not experimentally calibrated for every reagent concentration.'],
  };
});

const deterministic = DETERMINISTIC_REACTIONS.map(reaction => ({
  id: reaction.id, equation: reaction.equation,
  observation_vi: reaction.observable_vi,
  classification: [reaction.reactionType_en, reaction.reactionType_vi,
    ...(reaction.hasGas ? ['gas_evolution'] : []), ...(reaction.hasPrecipitate ? ['solid_formation'] : [])],
  execution: reaction.equilibriumOnly ? 'finite_phase_equilibrium' : 'stoichiometric_rule',
  ionicBalance: reaction.ionic_equation ? auditDisplayedEquation(reaction.ionic_equation) : [],
  balance: auditEquation(
    Object.entries(reaction.stoichiometry).filter(([, coefficient]) => coefficient > 0).map(([formula, coefficient]) => ({ formula, coefficient })),
    Object.entries(reaction.products).map(([formula, product]) => ({ formula, coefficient: product.coeff })),
  ),
  heating: { required: reaction.requiresHeating ?? false, minimum_c: reaction.minTemp_c ?? null },
  reactants: reaction.reactants.map(formula => ({ formula, phases: nativeReagentPhases(formula),
    coefficient: Object.entries(reaction.stoichiometry).find(([term]) => sameMolecularFormula(term, formula))?.[1] ?? 0 })),
  products: Object.entries(reaction.products).map(([formula, product]) => ({ formula, phase: product.state, coefficient: product.coeff })),
  conditions: {
    compartment: 'bulk', finitePositiveInventory: true, aqueousPhaseRequiresPositiveVolume: true,
    ...copperModelConditions(reaction.id),
    oxidizingAcidBlocksHydrogenInference: Boolean(reaction.products.H2),
    reactantPhases: Object.fromEntries(reaction.reactants.map(formula => [formula, nativeReagentPhases(formula)])),
    heating: { required: reaction.requiresHeating ?? false, minimum_c: reaction.minTemp_c ?? null },
    concentrationGrades: 'Explicit concentrated/dilute stock labels are matched; dilution-dependent activity is not calibrated.',
    compatibility: 'Historical unlabelled inventory retains phase inference; explicit phase/state metadata is checked.',
  },
  ...reviewFields(reaction.id),
}));

const lessons = LESSON_DEFINITIONS.map(lesson => ({
  id: lesson.id,
  classification: [lesson.family],
  balance: auditEquation(
    lesson.reactants.map(term => ({ formula: getLessonSpecies(term.species).formula, coefficient: term.coefficient })),
    lesson.products.map(term => ({ formula: getLessonSpecies(term.species).formula, coefficient: term.coefficient })),
  ),
}));

const dynamicRules = ['Na2CO3', 'K2CO3', 'NaHCO3', 'KHCO3', 'CaCO3', 'MgCO3']
  .flatMap(carbonate => ['HCl', 'HNO3', 'CH3COOH'].map(acid => {
    const program = deriveProgramFromRules([carbonate, acid], {});
    if (!program) throw new Error(`Missing derived equation: ${carbonate} + ${acid}`);
    return {
      id: program.id, equation: program.chemistry.equation,
      classification: ['carbonate_acid', 'gas_evolution'],
      reactants: program.chemistry.species.filter(item => item.role === 'reactant'),
      products: program.chemistry.species.filter(item => item.role === 'product'),
      conditions: program.chemistry.conditions ?? {},
      finding_vi: program.explain.why_vi, observation_vi: program.explain.observation_vi,
      references: [SCIENCE_REFERENCES.neutral], sourceScope: 'teaching_context',
      balance: auditEquation(program.chemistry.species.filter(item => item.role === 'reactant').map(item => ({ formula: item.formula, coefficient: item.coeff })),
        program.chemistry.species.filter(item => item.role === 'product').map(item => ({ formula: item.formula, coefficient: item.coeff }))),
    };
  }));
const failures = [...programs, ...deterministic, ...lessons, ...dynamicRules].filter(record => record.balance && !record.balance.valid);
const mixedFailures = mixedEquilibriumAudit.filter(record => !record.balance.valid);
const visualIssues = programs.filter(program => program.visualIssues.length);
const ionicFailures = [...programs, ...deterministic].filter(record => record.ionicBalance.some(result => !result.valid));
const report = {
  schema: 'chemdex.science-audit/1',
  checkedAt: new Date().toISOString(),
  scope: `All ${programs.length} program definitions, every deterministic rule, and all ${lessons.length} lessons. Lesson programs are a subset of the programs, not additional unique experiments.`,
  claims: { balanceChecked: true, qualitativeLiteratureReview: true, experimentallyValidated: false, realTimeKineticsValidated: false, allSourcesDescribeExactExperiment: false },
  counts: { mixedEquilibriumChecks: mixedEquilibriumAudit.length, mixedEquilibriumFailures: mixedFailures.length, programs: programs.length, deterministic: deterministic.length, equilibriumOnly: deterministic.filter(record => record.execution === 'finite_phase_equilibrium').length, lessons: lessons.length, dynamicRules: dynamicRules.length, ionicEquations: [...programs, ...deterministic].reduce((sum, record) => sum + record.ionicBalance.length, 0), ionicFailures: ionicFailures.length, nonStoichiometricObservations: programs.filter(row => row.balance === null).length, balanceFailures: failures.length, visualProductMismatches: visualIssues.length },
  programs, deterministic, lessons, dynamicRules, mixedEquilibriumAudit,
  referenceLabs: ['chemcollective', 'phet', 'rscLab'].map(key => SCIENCE_REFERENCES[key]),
};
mkdirSync('artifacts/science-audit', { recursive: true });
writeFileSync('artifacts/science-audit/catalog-review.json', JSON.stringify(report, null, 2) + '\n');
const lines = [
  '# Rà soát khoa học từng phương trình', '',
  `Phạm vi: ${programs.length} chương trình, ${deterministic.length} quy tắc bộ giải, ${lessons.length} bài học (đã nằm trong danh mục chương trình).`, '',
  'Cân bằng nguyên tố/điện tích là kiểm tra bắt buộc, không chứng nhận mô phỏng giống thực nghiệm. Nguồn mô tả đúng thí nghiệm được phân biệt với nguồn bối cảnh của cả họ phản ứng. Chưa hiệu chuẩn toàn bộ động học, nhiệt và màu.', '',
  '| ID | Phương trình | Cân bằng | Ghi nhận riêng | Phạm vi nguồn |',
  '|---|---|---|---|---|',
];
for (const row of programs) lines.push(`| ${row.id} | ${row.equation.replaceAll('|', '/')} | ${row.balance === null ? 'Quan sát quang học, không giả phản ứng mol' : row.balance.valid ? 'Đạt' : 'Lỗi'} | ${row.finding_vi} | ${row.sourceScope}: ${row.references.map(ref => `[${ref.title}](${ref.url})`).join(', ')} |`);
lines.push('', '## Quy tắc bộ giải', '', '| ID | Phương trình | Cân bằng | Cách xử lý lượng chất |', '|---|---|---|---|');
for (const row of deterministic) lines.push(`| ${row.id} | ${row.equation} | ${row.balance.valid ? 'Đạt' : JSON.stringify(row.balance)} | ${row.execution} |`);
lines.push('', '## Nhánh cacbonat tự suy diễn', '', '| ID | Phương trình | Cân bằng |', '|---|---|---|');
for (const row of dynamicRules) lines.push(`| ${row.id} | ${row.equation} | ${row.balance.valid ? 'Đạt' : JSON.stringify(row.balance)} |`);
if (visualIssues.length) {
  lines.push('', '## Khai báo hiệu ứng cần kiểm tra', '');
  for (const row of visualIssues) lines.push(`- ${row.id}: ${row.visualIssues.join(' ')}`);
}
writeFileSync('artifacts/science-audit/catalog-review.vi.md', lines.join('\n') + '\n');
console.log(JSON.stringify(report.counts, null, 2));
for (const failure of failures) console.error(failure.id, failure.balance);
for (const failure of ionicFailures) console.error(failure.id, failure.ionicBalance);
if (failures.length || visualIssues.length || ionicFailures.length || mixedFailures.length) process.exitCode = 1;
