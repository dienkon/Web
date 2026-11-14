import type { ReactionProgram } from '../shared/programSchema';
import type { SubstanceContent } from '../types/chemistry';
import { sameMolecularFormula } from './speciesIdentity';
import { availableReagent, reagentPhase } from './reagentAvailability';
import { copperAmmoniaEquilibrium } from './copperAmmoniaEquilibrium';
import { landoltInventory } from './landoltClock';

export interface ExperimentalEnvironment {
  temperature_c?: number;
  pressure_bar?: number;
  pH?: number;
  isHeated?: boolean;
  light?: boolean;
  volume_ml?: number;
  ignitedProgramId?: string;
  isSealed?: boolean;
  requireInventory?: boolean;
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

function present(contents: SubstanceContent[], formula: string, expectedPhase?: string): boolean {
  return contents.some(item => availableReagent(item, formula, expectedPhase));
}

export function hasOxidizingAcid(contents: SubstanceContent[]): boolean {
  return contents.some(item => ['aq', 'l'].some(phase => availableReagent(item, 'HNO3', phase)
    || availableReagent(item, 'H2SO4(conc)', phase)));
}

/** Conditions determine eligibility; they do not assert measured reaction rates. */
export function assessProgramConditions(
  program: ReactionProgram,
  contents: SubstanceContent[],
  env: ExperimentalEnvironment,
): ConditionAssessment {
  const unmet: string[] = [];
  const copperAmmonia = program.id === 'cuso4_nh3';
  const landolt = program.id === 'iodine_clock';
  if (contents.length > 0 || env.requireInventory) {
    if (copperAmmonia && !copperAmmoniaEquilibrium(contents, env.volume_ml ?? 0, env.temperature_c ?? 25))
      unmet.push('Cân bằng đồng–ammonia cần nước và kiểm kê Cu(II)/NH3/NH4 trong hệ sulfate hoặc hydroxide được hỗ trợ; hỗn hợp có phối tử khác cần mô hình riêng.');
    if (landolt && !landoltInventory(contents, env.volume_ml ?? 0))
      unmet.push('Đồng hồ Landolt cần nước lỏng và hệ iodate/iodide/sulfite/sulfate Na/K được hỗ trợ; phối tử hoặc chất oxi hóa khác cần mô hình riêng.');
    for (const reagent of program.chemistry.species.filter(item => item.role === 'reactant' && !copperAmmonia && !landolt)) {
      if (!present(contents, reagent.formula, reagent.phase))
        unmet.push(`Thiếu lượng hoặc pha phù hợp của ${reagent.formula}.`);
    }
  }
  const producesHydrogen = program.chemistry.species.some(item => item.role === 'product' && item.formula === 'H2');
  const oxidizingAcid = hasOxidizingAcid(contents);
  if (producesHydrogen && oxidizingAcid) unmet.push('Không suy diễn H2 cho axit oxi hóa; cần kịch bản riêng đã xác định điều kiện.');
  const conditions = program.chemistry.conditions;
  if (conditions?.activation === 'ignition' && env.ignitedProgramId !== program.id) unmet.push('Cần thao tác mồi cháy cho mẫu này; chỉ có chất phản ứng hoặc tăng nhiệt độ chung chưa xác nhận đã mồi.');
  const temperature = env.temperature_c ?? 25;
  if (landolt && (temperature < 0 || temperature > 90)) unmet.push('Mô hình Landolt cần nước lỏng 0–90 °C; hằng số tốc độ hiện chỉ tham chiếu 25 °C.');
  if (copperAmmonia && (temperature < 0 || temperature > 90)) unmet.push('Mô hình cân bằng đồng–ammonia hỗ trợ nước lỏng trong khoảng 0–90 °C.');
  if (!Number.isFinite(temperature) || temperature <= -273.15) unmet.push('Nhiệt độ mẫu không hợp lệ.');
  if (env.pressure_bar !== undefined && (!Number.isFinite(env.pressure_bar) || env.pressure_bar <= 0)) unmet.push('Áp suất mẫu không hợp lệ.');
  if (env.pH !== undefined && !Number.isFinite(env.pH)) unmet.push('Giá trị pH không hợp lệ.');
  if (env.volume_ml !== undefined) {
    if (!Number.isFinite(env.volume_ml) || env.volume_ml < 0) unmet.push('Thể tích mẫu không hợp lệ.');
    else if (env.volume_ml === 0 && program.chemistry.species.some(item => item.role === 'reactant' && item.phase === 'aq'))
      unmet.push('Phản ứng dung dịch cần thể tích dung môi dương.');
  }
  if (conditions?.sealed !== undefined && env.isSealed !== conditions.sealed)
    unmet.push(conditions.sealed ? 'Kịch bản cần bình kín.' : 'Kịch bản cần bình mở.');
  if (conditions?.minTemp_c !== undefined && temperature < conditions.minTemp_c) unmet.push(`Nhiệt độ mẫu chưa đạt ${conditions.minTemp_c} °C của kịch bản.`);
  const catalysts = program.chemistry.species.filter(item => item.role === 'catalyst');
  for (const catalyst of catalysts) {
    if (!present(contents, catalyst.formula, catalyst.phase)) unmet.push(`Thiếu xúc tác hoặc pha phù hợp của ${catalyst.formula}.`);
  }
  if (conditions?.catalyst && !catalysts.some(item => sameMolecularFormula(item.formula, conditions.catalyst!))) {
    if (!present(contents, conditions.catalyst)) unmet.push(`Thiếu xúc tác hoặc pha phù hợp của ${conditions.catalyst}.`);
  }
  if (conditions?.light && !env.light) unmet.push('Chưa có điều kiện chiếu sáng.');
  if (program.chemistry.representation === 'emission' && !env.isHeated) unmet.push('Phép thử ngọn lửa cần nguồn kích thích nhiệt.');
  const strongAcid = contents.filter(item => ['HCl', 'HNO3', 'H2SO4'].some(formula => availableReagent(item, formula, 'aq')))
    .reduce((sum, item) => sum + item.moles * (sameMolecularFormula(item.formula, 'H2SO4') ? 2 : 1), 0);
  const strongBase = contents.filter(item => ['NaOH', 'KOH', 'Ca(OH)2', 'Ba(OH)2'].some(formula => availableReagent(item, formula, 'aq')))
    .reduce((sum, item) => sum + item.moles * (['Ca(OH)2', 'Ba(OH)2'].some(formula => sameMolecularFormula(item.formula, formula)) ? 2 : 1), 0);
  if (conditions?.medium === 'acidic' && !(strongAcid > strongBase || (env.pH ?? 7) < 4)) unmet.push('Cần môi trường axit.');
  if (conditions?.medium === 'alkaline' && !(strongBase > strongAcid || (env.pH ?? 7) > 10)) unmet.push('Cần môi trường kiềm.');
  for (const [cases, grade] of [[CONCENTRATED_ACID_CASES, 'concentrated'], [DILUTE_ACID_CASES, 'dilute']] as const) {
    const acid = cases[program.id];
    if (!acid) continue;
    const phases = grade === 'concentrated' ? ['aq', 'l'] : ['aq'];
    const found = contents.some(item => phases.some(phase => availableReagent(item, `${acid}(${grade})`, phase)));
    if (!found) unmet.push(`Cần xác định ${acid} ${grade === 'concentrated' ? 'đặc' : 'loãng'}, không suy ra chỉ từ công thức.`);
  }
  if (program.id === 'nh3_hcl') {
    for (const formula of ['NH3', 'HCl']) {
      const gas = contents.some(item => availableReagent(item, formula, 'g') && reagentPhase(item) === 'g');
      if (!gas) unmet.push(`Khói NH4Cl cần ${formula} ở pha khí.`);
    }
  }
  if (program.id.endsWith('_dissolution') && (env.volume_ml ?? 0) <= 0) unmet.push('Hòa tan cần dung môi; bình khô không đủ điều kiện.');
  return { ready: unmet.length === 0, unmet };
}
