import type { ReactionProgram } from '../shared/programSchema';
import type { SubstanceContent } from '../types/chemistry';
import { identifySpecies, matchesReagent, sameMolecularFormula } from './speciesIdentity';

export interface ExperimentalEnvironment {
  temperature_c?: number;
  pressure_bar?: number;
  pH?: number;
  isHeated?: boolean;
  light?: boolean;
  volume_ml?: number;
}

export interface ConditionAssessment {
  ready: boolean;
  unmet: string[];
}

const CONCENTRATED_ACID_CASES: Record<string, string> = {
  cu_hno3_conc: 'HNO3',
  cu_conc_h2so4: 'H2SO4',
  kcl_conc_h2so4: 'H2SO4',
  water_into_h2so4: 'H2SO4',
  h2so4_dilution: 'H2SO4',
};
const DILUTE_ACID_CASES: Record<string, string> = {
  cu_hno3_dil: 'HNO3', cu_hno3_dilute: 'HNO3', zn_h2so4_dilute: 'H2SO4',
};

function present(contents: SubstanceContent[], formula: string): boolean {
  return contents.some(item => sameMolecularFormula(item.formula, formula) && item.moles > 1e-12);
}

/** Conditions determine eligibility; they do not assert measured reaction rates. */
export function assessProgramConditions(
  program: ReactionProgram,
  contents: SubstanceContent[],
  env: ExperimentalEnvironment,
): ConditionAssessment {
  const unmet: string[] = [];
  if (contents.length > 0) {
    for (const reagent of program.chemistry.species.filter(item => item.role === 'reactant')) {
      if (!contents.some(item => item.moles > 1e-12 && matchesReagent(item.formula, reagent.formula)
        && (!item.phase || item.phase === reagent.phase))) unmet.push(`Thiếu lượng hoặc pha phù hợp của ${reagent.formula}.`);
    }
  }
  const producesHydrogen = program.chemistry.species.some(item => item.role === 'product' && item.formula === 'H2');
  const oxidizingAcid = contents.some(item => item.moles > 1e-12 && (sameMolecularFormula(item.formula, 'HNO3')
    || (sameMolecularFormula(item.formula, 'H2SO4') && identifySpecies(item.formula).concentration === 'concentrated')));
  if (producesHydrogen && oxidizingAcid) unmet.push('Không suy diễn H2 cho axit oxi hóa; cần kịch bản riêng đã xác định điều kiện.');
  const conditions = program.chemistry.conditions;
  const temperature = env.temperature_c ?? 25;
  if (conditions?.minTemp_c !== undefined && temperature < conditions.minTemp_c) unmet.push(`Nhiệt độ mẫu chưa đạt ${conditions.minTemp_c} °C của kịch bản.`);
  if (conditions?.catalyst && !present(contents, conditions.catalyst)) unmet.push(`Thiếu xúc tác ${conditions.catalyst}.`);
  if (conditions?.light && !env.light) unmet.push('Chưa có điều kiện chiếu sáng.');
  if (program.chemistry.representation === 'emission' && !env.isHeated) unmet.push('Phép thử ngọn lửa cần nguồn kích thích nhiệt.');
  const strongAcid = contents.filter(item => ['HCl', 'HNO3', 'H2SO4'].some(formula => sameMolecularFormula(item.formula, formula)))
    .reduce((sum, item) => sum + item.moles * (sameMolecularFormula(item.formula, 'H2SO4') ? 2 : 1), 0);
  const strongBase = contents.filter(item => ['NaOH', 'KOH', 'Ca(OH)2', 'Ba(OH)2'].some(formula => sameMolecularFormula(item.formula, formula)))
    .reduce((sum, item) => sum + item.moles * (/^(Ca|Ba)/.test(item.formula) ? 2 : 1), 0);
  if (conditions?.medium === 'acidic' && !(strongAcid > strongBase || (env.pH ?? 7) < 4)) unmet.push('Cần môi trường axit.');
  if (conditions?.medium === 'alkaline' && !(strongBase > strongAcid || (env.pH ?? 7) > 10)) unmet.push('Cần môi trường kiềm.');
  for (const [cases, grade] of [[CONCENTRATED_ACID_CASES, 'concentrated'], [DILUTE_ACID_CASES, 'dilute']] as const) {
    const acid = cases[program.id];
    if (!acid) continue;
    const found = contents.find(item => sameMolecularFormula(item.formula, acid) && item.moles > 1e-12);
    const declared = found ? identifySpecies(found.formula).concentration : null;
    if (declared !== grade) unmet.push(`Cần xác định ${acid} ${grade === 'concentrated' ? 'đặc' : 'loãng'}, không suy ra chỉ từ công thức.`);
  }
  if (program.id === 'nh3_hcl') {
    for (const formula of ['NH3', 'HCl']) {
      const gas = contents.some(item => sameMolecularFormula(item.formula, formula)
        && (item.phase === 'g' || identifySpecies(item.formula).phase === 'g') && item.moles > 1e-12);
      if (!gas) unmet.push(`Khói NH4Cl cần ${formula} ở pha khí.`);
    }
  }
  if (program.id.endsWith('_dissolution') && (env.volume_ml ?? 0) <= 0) unmet.push('Hòa tan cần dung môi; bình khô không đủ điều kiện.');
  return { ready: unmet.length === 0, unmet };
}
