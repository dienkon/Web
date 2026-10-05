import { MixResult } from '../shared/schemas';
import { ChemicalDefinition, VesselState } from '../types/chemistry';
import { findChemical } from '../data/chemicals';
import { chemistryCache, getCanonicalReactionKey } from './chemistryCache';

export interface DeterministicReaction {
  id: string;
  reactants: string[]; // required formulas (or canonical keys)
  optionalAdditions?: string[]; // e.g. Phenolphthalein
  requiresHeating?: boolean;
  minTemp_c?: number;
  
  equation: string;
  ionic_equation?: string;
  reactionType_en: string;
  reactionType_vi: string;
  
  summary_en: string;
  summary_vi: string;
  observable_en: string;
  observable_vi: string;
  
  // Stoichiometry: reactant formula -> coefficient
  stoichiometry: Record<string, number>;
  // Products: formula -> { coeff: number, state: 'aq' | 's' | 'g' | 'l' }
  products: Record<string, { coeff: number; state: 'aq' | 's' | 'g' | 'l' }>;
  
  // Thermal properties: deltaH in kJ/mol of limiting reagent
  deltaH_kJ: number; 
  
  // Visual outcome
  resultingLiquidColor?: string;
  resultingPh?: number | ((isBasic: boolean, excessRatio: number) => number);
  
  hasPrecipitate?: boolean;
  precipitateColor?: string;
  precipitateFormula?: string;
  
  hasGas?: boolean;
  gasColor?: string;
  gasFormula?: string;
  
  isBoiling?: boolean;
  isDangerous?: boolean;
  safetyNotes_en?: string;
  safetyNotes_vi?: string;
}

// Canonical matching helper with exact token equality to prevent false positives (e.g. NaOH matching Na + H2O)
function normalizeFormulaToken(f: string): string {
  return f.replace(/\s*\([a-z]+\)/gi, '').replace(/[·\.]\d*H2O/gi, '').trim().toLowerCase();
}

function chemicalFormulaMatches(substance: string, required: string): boolean {
  const normSub = normalizeFormulaToken(substance);
  const normReq = normalizeFormulaToken(required);

  if (normSub === normReq) return true;

  // Handle concentration qualifiers like 'h2so4 (conc)' vs 'h2so4'
  const baseSub = normSub.replace(/\s*\(conc\)/gi, '').trim();
  const baseReq = normReq.replace(/\s*\(conc\)/gi, '').trim();
  if (baseSub === baseReq) return true;

  // Handle chemical catalog IDs like 'chemical-na' or 'reagent_na'
  if (normSub === `chemical-${normReq}` || normSub === `chemical_${normReq}`) {
    return true;
  }

  return false;
}

function matchesReactants(substances: string[], required: string[]): boolean {
  // Special case for solid CuSO4 dehydration: must not have excess bulk water
  if (required.length === 1 && required[0] === 'CuSO4') {
    if (substances.some(s => normalizeFormulaToken(s) === 'h2o')) return false;
  }

  // Special case for Cu(OH)2: matches either direct Cu(OH)2 or mixture of CuSO4 + NaOH
  if (required.includes('Cu(OH)2') || (required.length === 1 && required[0] === 'Cu(OH)2')) {
    const hasDirect = substances.some(s => chemicalFormulaMatches(s, 'Cu(OH)2'));
    const hasPrecipitatePrecursor = substances.some(s => chemicalFormulaMatches(s, 'CuSO4')) && substances.some(s => chemicalFormulaMatches(s, 'NaOH'));
    if (hasDirect || hasPrecipitatePrecursor) {
      const otherRequired = required.filter(r => r !== 'Cu(OH)2');
      if (otherRequired.length === 0) return true;
      return otherRequired.every(req => substances.some(sub => chemicalFormulaMatches(sub, req)));
    }
  }

  return required.every(req => substances.some(sub => chemicalFormulaMatches(sub, req)));
}

export const DETERMINISTIC_REACTIONS: DeterministicReaction[] = [
  // 1. HCl + NaOH (Acid-Base Neutralization)
  {
    id: 'hcl_naoh_neutralization',
    reactants: ['HCl', 'NaOH'],
    equation: 'HCl + NaOH → NaCl + H₂O',
    ionic_equation: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    reactionType_en: 'Acid-Base Neutralization (Exothermic)',
    reactionType_vi: 'Phản ứng trung hòa Axit - Bazơ (Tỏa nhiệt)',
    summary_en: 'Neutralization of strong acid (HCl) by strong base (NaOH) forming sodium chloride salt and water.',
    summary_vi: 'Phản ứng trung hòa giữa axit mạnh (HCl) và bazơ mạnh (NaOH) tạo muối natri clorua và nước.',
    observable_en: 'The vessel becomes distinctly warm to the touch. If phenolphthalein is present, the pink color discharges immediately to clear.',
    observable_vi: 'Cốc nghiệm ấm lên rõ rệt do tỏa nhiệt. Nếu có phenolphtalein, màu hồng biến mất hoàn toàn trở lại không màu.',
    stoichiometry: { 'HCl': 1, 'NaOH': 1 },
    products: { 'NaCl': { coeff: 1, state: 'aq' }, 'H2O': { coeff: 1, state: 'l' } },
    deltaH_kJ: -57.1,
    resultingPh: 7.0,
    resultingLiquidColor: '#f8fafc',
    hasPrecipitate: false,
    hasGas: false,
    isDangerous: false
  },

  // 2. H2SO4 + 2NaOH (Diprotic Neutralization)
  {
    id: 'h2so4_naoh_neutralization',
    reactants: ['H2SO4', 'NaOH'],
    equation: 'H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O',
    ionic_equation: '2H⁺ + 2OH⁻ → 2H₂O',
    reactionType_en: 'Acid-Base Neutralization',
    reactionType_vi: 'Phản ứng trung hòa Axit - Bazơ',
    summary_en: 'Exothermic neutralization of sulfuric acid by sodium hydroxide forming sodium sulfate.',
    summary_vi: 'Phản ứng trung hòa tỏa nhiệt giữa axit sunfuric và natri hiđroxit tạo muối natri sunfat.',
    observable_en: 'Noticeable heat release with solution temperature rising to around 45°C-55°C.',
    observable_vi: 'Tỏa nhiệt mạnh, nhiệt độ dung dịch tăng lên khoảng 45°C - 55°C.',
    stoichiometry: { 'H2SO4': 1, 'NaOH': 2 },
    products: { 'Na2SO4': { coeff: 1, state: 'aq' }, 'H2O': { coeff: 2, state: 'l' } },
    deltaH_kJ: -114.2,
    resultingPh: 7.0,
    resultingLiquidColor: '#f8fafc',
    hasPrecipitate: false,
    hasGas: false,
    isDangerous: false
  },

  // 3. BaCl2 + H2SO4 (White Precipitate)
  {
    id: 'bacl2_h2so4_precipitate',
    reactants: ['BaCl2', 'H2SO4'],
    equation: 'BaCl₂ + H₂SO₄ → BaSO₄↓ + 2HCl',
    ionic_equation: 'Ba²⁺(aq) + SO₄²⁻(aq) → BaSO₄(s)↓',
    reactionType_en: 'Precipitation Reaction',
    reactionType_vi: 'Phản ứng tạo kết tủa',
    summary_en: 'Formation of insoluble heavy white barium sulfate precipitate.',
    summary_vi: 'Tạo thành kết tủa trắng mịn bari sunfat không tan trong axit mạnh.',
    observable_en: 'Instantaneous formation of a dense, milky-white precipitate of BaSO4 that settles slowly.',
    observable_vi: 'Xuất hiện ngay lập tức kết tủa màu trắng đục của BaSO4, lắng dần xuống đáy cốc.',
    stoichiometry: { 'BaCl2': 1, 'H2SO4': 1 },
    products: { 'BaSO4': { coeff: 1, state: 's' }, 'HCl': { coeff: 2, state: 'aq' } },
    deltaH_kJ: -19.0,
    resultingPh: 1.5,
    hasPrecipitate: true,
    precipitateColor: '#ffffff',
    precipitateFormula: 'BaSO4',
    hasGas: false,
    isDangerous: false
  },

  // 3b. BaCl2 + Na2SO4 (Law of Conservation of Mass)
  {
    id: 'bacl2_na2so4_conservation',
    reactants: ['BaCl2', 'Na2SO4'],
    equation: 'BaCl₂ + Na₂SO₄ → BaSO₄↓ + 2NaCl',
    ionic_equation: 'Ba²⁺(aq) + SO₄²⁻(aq) → BaSO₄(s)↓',
    reactionType_en: 'Precipitation / Law of Conservation of Mass',
    reactionType_vi: 'Phản ứng tạo kết tủa / Kiểm chứng Định luật Bảo toàn Khối lượng',
    summary_en: 'Double displacement between barium chloride and sodium sulfate creating dense white BaSO4 precipitate while total mass remains strictly invariant.',
    summary_vi: 'Phản ứng trao đổi tạo kết tủa trắng bari sunfat BaSO4, tổng khối lượng trước và sau phản ứng được bảo toàn hoàn hảo.',
    observable_en: 'Instant dense milky-white precipitate of BaSO4 forms. When carried out on the digital balance, the display confirms mass remains strictly constant (m1 = m2).',
    observable_vi: 'Xuất hiện tức thì kết tủa trắng đục BaSO4. Đồng hồ cân điện tử xác nhận tổng khối lượng không đổi (m1 = m2), kiểm chứng định luật bảo toàn khối lượng Lomonosov - Lavoisier.',
    stoichiometry: { 'BaCl2': 1, 'Na2SO4': 1 },
    products: { 'BaSO4': { coeff: 1, state: 's' }, 'NaCl': { coeff: 2, state: 'aq' } },
    deltaH_kJ: -24.0,
    resultingPh: 7.0,
    hasPrecipitate: true,
    precipitateColor: '#ffffff',
    precipitateFormula: 'BaSO4',
    hasGas: false,
    isDangerous: false
  },

  // 4. AgNO3 + NaCl (Curdy White Precipitate)
  {
    id: 'agno3_nacl_precipitate',
    reactants: ['AgNO3', 'NaCl'],
    equation: 'AgNO₃ + NaCl → AgCl↓ + NaNO₃',
    ionic_equation: 'Ag⁺(aq) + Cl⁻(aq) → AgCl(s)↓',
    reactionType_en: 'Precipitation (Halide Test)',
    reactionType_vi: 'Phản ứng tạo kết tủa (Nhận biết ion Cl-)',
    summary_en: 'Classic analytical test for chloride ion yielding insoluble silver chloride.',
    summary_vi: 'Phản ứng kinh điển nhận biết ion clorua tạo kết tủa trắng bạc clorua.',
    observable_en: 'Instant white curdy precipitate of silver chloride (AgCl) forms upon mixing.',
    observable_vi: 'Xuất hiện kết tủa trắng dạng vón (dạng nhũ tương) của AgCl.',
    stoichiometry: { 'AgNO3': 1, 'NaCl': 1 },
    products: { 'AgCl': { coeff: 1, state: 's' }, 'NaNO3': { coeff: 1, state: 'aq' } },
    deltaH_kJ: -65.5,
    resultingPh: 6.5,
    hasPrecipitate: true,
    precipitateColor: '#f1f5f9',
    precipitateFormula: 'AgCl',
    hasGas: false,
    isDangerous: false
  },

  // 5. 2KI + Pb(NO3)2 -> PbI2 (Golden Rain)
  {
    id: 'golden_rain_pbi2',
    reactants: ['KI', 'Pb(NO3)2'],
    equation: '2KI + Pb(NO₃)₂ → PbI₂↓ + 2KNO₃',
    ionic_equation: 'Pb²⁺(aq) + 2I⁻(aq) → PbI₂(s)↓',
    reactionType_en: 'Precipitation ("Golden Rain")',
    reactionType_vi: 'Phản ứng tạo kết tủa ("Mưa Vàng")',
    summary_en: 'Formation of brilliant golden-yellow crystalline lead(II) iodide precipitate.',
    summary_vi: 'Tạo kết tủa chì(II) iotua màu vàng kim rực rỡ lấp lánh như mưa vàng.',
    observable_en: 'Spectacular bright yellow precipitate fills the solution instantly and glistens.',
    observable_vi: 'Dung dịch lập tức chuyển sang màu vàng tươi rực rỡ với kết tủa vàng lấp lánh.',
    stoichiometry: { 'KI': 2, 'Pb(NO3)2': 1 },
    products: { 'PbI2': { coeff: 1, state: 's' }, 'KNO3': { coeff: 2, state: 'aq' } },
    deltaH_kJ: -62.8,
    resultingPh: 6.0,
    hasPrecipitate: true,
    precipitateColor: '#facc15',
    precipitateFormula: 'PbI2',
    resultingLiquidColor: '#fef08a',
    hasGas: false,
    isDangerous: true,
    safetyNotes_en: 'Lead compounds are toxic. Collect waste in heavy metal disposal container.',
    safetyNotes_vi: 'Hợp chất chì độc hại. Thu gom chất thải vào bình chứa kim loại nặng chuyên dụng.'
  },

  // 6. CuSO4 + 2NaOH -> Cu(OH)2 (Gelatinous Blue Precipitate)
  {
    id: 'cuso4_naoh_precipitate',
    reactants: ['CuSO4', 'NaOH'],
    equation: 'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄',
    ionic_equation: 'Cu²⁺(aq) + 2OH⁻(aq) → Cu(OH)₂(s)↓',
    reactionType_en: 'Precipitation Reaction',
    reactionType_vi: 'Phản ứng tạo kết tủa bazơ không tan',
    summary_en: 'Reaction between copper(II) sulfate and base creating gelatinous sky-blue copper(II) hydroxide.',
    summary_vi: 'Phản ứng tạo kết tủa đồng(II) hiđroxit màu xanh lam dạng keo nhầy.',
    observable_en: 'Vivid royal blue solution immediately transforms into a gelatinous sky-blue precipitate suspended in liquid.',
    observable_vi: 'Dung dịch màu xanh lam chuyển thành kết tủa màu xanh da trời dạng bông keo nhầy.',
    stoichiometry: { 'CuSO4': 1, 'NaOH': 2 },
    products: { 'Cu(OH)2': { coeff: 1, state: 's' }, 'Na2SO4': { coeff: 1, state: 'aq' } },
    deltaH_kJ: -45.0,
    resultingPh: 8.5,
    hasPrecipitate: true,
    precipitateColor: '#38bdf8',
    precipitateFormula: 'Cu(OH)2',
    resultingLiquidColor: '#bae6fd',
    hasGas: false,
    isDangerous: false
  },

  // 7. Fe + CuSO4 -> FeSO4 + Cu (Single Displacement)
  {
    id: 'fe_cuso4_displacement',
    reactants: ['Fe', 'CuSO4'],
    equation: 'Fe + CuSO₄ → FeSO₄ + Cu↓',
    ionic_equation: 'Fe(s) + Cu²⁺(aq) → Fe²⁺(aq) + Cu(s)↓',
    reactionType_en: 'Single Displacement (Redox)',
    reactionType_vi: 'Phản ứng thế kim loại (Oxi hóa - Khử)',
    summary_en: 'More reactive iron reduces copper ions, depositing reddish metallic copper on iron while solution turns pale green.',
    summary_vi: 'Sắt đẩy đồng ra khỏi dung dịch muối, kim loại đồng màu đỏ bám ngoài thanh sắt, dung dịch nhạt dần sang xanh lục nhạt.',
    observable_en: 'Reddish-brown copper metal coats the iron filings; the deep blue color of the solution gradually fades to pale light green (FeSO4).',
    observable_vi: 'Lớp kim loại màu đỏ bám quanh bột sắt; màu xanh lam đậm của dung dịch nhạt dần sang màu xanh rêu nhạt của FeSO4.',
    stoichiometry: { 'Fe': 1, 'CuSO4': 1 },
    products: { 'FeSO4': { coeff: 1, state: 'aq' }, 'Cu': { coeff: 1, state: 's' } },
    deltaH_kJ: -152.0,
    resultingPh: 4.8,
    hasPrecipitate: true,
    precipitateColor: '#b45309',
    precipitateFormula: 'Cu',
    resultingLiquidColor: '#bbf7d0',
    hasGas: false,
    isDangerous: false
  },

  // 8. CaCO3 + 2HCl -> CaCl2 + CO2 + H2O (Effervescence)
  {
    id: 'caco3_hcl_gas',
    reactants: ['CaCO3', 'HCl'],
    equation: 'CaCO₃ + 2HCl → CaCl₂ + CO₂↑ + H₂O',
    ionic_equation: 'CaCO₃(s) + 2H⁺(aq) → Ca²⁺(aq) + CO₂(g)↑ + H₂O(l)',
    reactionType_en: 'Gas Evolution Reaction',
    reactionType_vi: 'Phản ứng sinh khí (Sủi bọt mạnh)',
    summary_en: 'Reaction of calcium carbonate with hydrochloric acid causing vigorous bubbling of carbon dioxide gas.',
    summary_vi: 'Canxi cacbonat phản ứng với axit clohiđric giải phóng khí cacbonic (CO2) sủi bọt mạnh mẽ.',
    observable_en: 'Rapid effervescence with continuous stream of CO2 bubbles rising through the solution. Solid dissolves.',
    observable_vi: 'Hiện tượng sủi bọt khí mãnh liệt, các bọt khí CO2 không màu bay lên liên tục, đá vôi tan dần.',
    stoichiometry: { 'CaCO3': 1, 'HCl': 2 },
    products: { 'CaCl2': { coeff: 1, state: 'aq' }, 'CO2': { coeff: 1, state: 'g' }, 'H2O': { coeff: 1, state: 'l' } },
    deltaH_kJ: -15.0,
    resultingPh: 5.5,
    resultingLiquidColor: '#f8fafc',
    hasGas: true,
    gasColor: '#cbd5e1',
    gasFormula: 'CO2',
    isBoiling: true,
    isDangerous: false
  },

  // 9. Zn + 2HCl -> ZnCl2 + H2 (Hydrogen Gas Evolution)
  {
    id: 'zn_hcl_gas',
    reactants: ['Zn', 'HCl'],
    equation: 'Zn + 2HCl → ZnCl₂ + H₂↑',
    ionic_equation: 'Zn(s) + 2H⁺(aq) → Zn²⁺(aq) + H₂(g)↑',
    reactionType_en: 'Single Displacement / Hydrogen Gas Generation',
    reactionType_vi: 'Phản ứng điều chế khí Hiđro trong phòng thí nghiệm',
    summary_en: 'Zinc reacts with hydrochloric acid displacing hydrogen gas as visible effervescence.',
    summary_vi: 'Kẽm tác dụng với axit clohiđric sinh khí hiđro bay lên với bọt khí sủi nhanh.',
    observable_en: 'Vigorous bubbling and stream of tiny colorless hydrogen gas bubbles; zinc granules dissolve; test tube warms up.',
    observable_vi: 'Bọt khí không màu (H2) thoát ra nhanh quanh bề mặt hạt kẽm, tỏa nhiệt làm ấm bình nghiệm.',
    stoichiometry: { 'Zn': 1, 'HCl': 2 },
    products: { 'ZnCl2': { coeff: 1, state: 'aq' }, 'H2': { coeff: 1, state: 'g' } },
    deltaH_kJ: -153.0,
    resultingPh: 5.0,
    resultingLiquidColor: '#f1f5f9',
    hasGas: true,
    gasColor: '#ffffff',
    gasFormula: 'H2',
    isBoiling: true,
    isDangerous: true,
    safetyNotes_en: 'Hydrogen gas is highly flammable. Keep away from open Bunsen burner flames.',
    safetyNotes_vi: 'Khí hiđro rất dễ cháy nổ khi trộn lẫn với oxy. Tránh xa ngọn lửa đèn cồn.'
  },

  // 10. Mg + 2HCl -> MgCl2 + H2 (Energetic Hydrogen Generation)
  {
    id: 'mg_hcl_gas',
    reactants: ['Mg', 'HCl'],
    equation: 'Mg + 2HCl → MgCl₂ + H₂↑',
    ionic_equation: 'Mg(s) + 2H⁺(aq) → Mg²⁺(aq) + H₂(g)↑',
    reactionType_en: 'Vigorous Displacement',
    reactionType_vi: 'Phản ứng thế tỏa nhiệt mãnh liệt',
    summary_en: 'Extremely fast and exothermic reaction of magnesium ribbon with acid.',
    summary_vi: 'Dải magiê phản ứng cực kỳ nhanh và sủi bọt cuồn cuộn với axit HCl.',
    observable_en: 'Violent fizzing and rapid release of hot H2 gas. Magnesium ribbon darts across liquid surface and dissolves within seconds.',
    observable_vi: 'Sủi bọt khí cực mạnh, tỏa nhiều nhiệt, dải magiê di chuyển nhanh trên mặt nước và tan biến trong vài giây.',
    stoichiometry: { 'Mg': 1, 'HCl': 2 },
    products: { 'MgCl2': { coeff: 1, state: 'aq' }, 'H2': { coeff: 1, state: 'g' } },
    deltaH_kJ: -466.8,
    resultingPh: 6.0,
    resultingLiquidColor: '#f8fafc',
    hasGas: true,
    gasColor: '#ffffff',
    gasFormula: 'H2',
    isBoiling: true,
    isDangerous: true,
    safetyNotes_en: 'Extremely exothermic. Solution can reach near boiling point quickly.',
    safetyNotes_vi: 'Phản ứng tỏa nhiệt rất mạnh. Dung dịch có thể nóng ran gần sôi.'
  },

  // 11. 2H2O2 -> 2H2O + O2 (MnO2 catalyzed)
  {
    id: 'h2o2_mno2_decomposition',
    reactants: ['H2O2', 'MnO2'],
    equation: '2H₂O₂ ⎯⎯MnO₂⎯→ 2H₂O + O₂↑',
    reactionType_en: 'Catalytic Decomposition',
    reactionType_vi: 'Phản ứng phân hủy có xúc tác (Điều chế Oxi)',
    summary_en: 'Manganese dioxide catalytically accelerates the decomposition of hydrogen peroxide into water and hot oxygen gas.',
    summary_vi: 'Mangan đioxit đóng vai trò xúc tác làm H2O2 phân hủy tức thì sinh nước và khí oxy sủi bọt nóng bốc hơi.',
    observable_en: 'Violent eruption of oxygen froth, rapid foaming with steam rising from the vigorous exothermic decomposition.',
    observable_vi: 'Bọt khí oxy và hơi nước bốc lên cuồn cuộn dữ dội, dung dịch nóng bừng, MnO2 giữ nguyên không đổi.',
    stoichiometry: { 'H2O2': 2, 'MnO2': 0 },
    products: { 'H2O': { coeff: 2, state: 'l' }, 'O2': { coeff: 1, state: 'g' } },
    deltaH_kJ: -98.2,
    resultingPh: 7.0,
    hasGas: true,
    gasColor: '#e2e8f0',
    gasFormula: 'O2',
    isBoiling: true,
    hasPrecipitate: true,
    precipitateColor: '#1e293b',
    precipitateFormula: 'MnO2 (catalyst)',
    isDangerous: false
  },

  // 12. NH3 + HCl -> NH4Cl (Dense White Smoke)
  {
    id: 'nh3_hcl_fumes',
    reactants: ['NH3', 'HCl'],
    equation: 'NH₃(g) + HCl(g) → NH₄Cl(s)',
    reactionType_en: 'Combination / Gas Fumes',
    reactionType_vi: 'Phản ứng hóa hợp tạo khói trắng',
    summary_en: 'Vapors of ammonia and hydrogen chloride meet to form fine airborne crystals of ammonium chloride (dense white smoke).',
    summary_vi: 'Hơi amoniac gặp hơi axit clohiđric tạo các hạt tinh thể muối amoni clorua lơ lửng như làn khói trắng dày đặc.',
    observable_en: 'A dramatic plume of thick white smoke immediately billows above the container mouth.',
    observable_vi: 'Một luồng khói trắng đục cuồn cuộn bốc lên ngay miệng bình thí nghiệm.',
    stoichiometry: { 'NH3': 1, 'HCl': 1 },
    products: { 'NH4Cl': { coeff: 1, state: 's' } },
    deltaH_kJ: -176.0,
    resultingPh: 5.5,
    hasGas: true,
    gasColor: '#ffffff',
    gasFormula: 'NH4Cl (smoke)',
    hasPrecipitate: true,
    precipitateColor: '#ffffff',
    precipitateFormula: 'NH4Cl',
    isDangerous: false
  },

  // 13. Na2CO3 + 2HCl -> 2NaCl + CO2 + H2O
  {
    id: 'na2co3_hcl_gas',
    reactants: ['Na2CO3', 'HCl'],
    equation: 'Na₂CO₃ + 2HCl → 2NaCl + CO₂↑ + H₂O',
    reactionType_en: 'Carbonate-Acid Reaction',
    reactionType_vi: 'Phản ứng muối cacbonat với axit',
    summary_en: 'Instant fizzing as sodium carbonate reacts with hydrochloric acid generating carbon dioxide.',
    summary_vi: 'Phản ứng sủi bọt khí CO2 không màu diễn ra ngay tức khắc.',
    observable_en: 'Sudden bubbling of gas that dies down once the acid is neutralized.',
    observable_vi: 'Sủi bọt khí mạnh mẽ, dung dịch trong suốt không màu.',
    stoichiometry: { 'Na2CO3': 1, 'HCl': 2 },
    products: { 'NaCl': { coeff: 2, state: 'aq' }, 'CO2': { coeff: 1, state: 'g' }, 'H2O': { coeff: 1, state: 'l' } },
    deltaH_kJ: -27.0,
    resultingPh: 7.0,
    hasGas: true,
    gasColor: '#f1f5f9',
    gasFormula: 'CO2',
    isDangerous: false
  },

  // 14. Thermal Decomposition: Cu(OH)2 -> CuO + H2O (Requires Heating)
  {
    id: 'cuoh2_thermal_decomposition',
    reactants: ['Cu(OH)2'],
    requiresHeating: true,
    minTemp_c: 60,
    equation: 'Cu(OH)₂ ⎯⎯t°⎯→ CuO↓ + H₂O',
    reactionType_en: 'Thermal Decomposition',
    reactionType_vi: 'Phản ứng nhiệt phân bazơ không tan',
    summary_en: 'Upon heating with Bunsen burner, blue copper(II) hydroxide decomposes into black copper(II) oxide.',
    summary_vi: 'Khi đun nóng dưới ngọn lửa đèn cồn, kết tủa Cu(OH)2 màu xanh chuyển hóa thành bột CuO màu đen.',
    observable_en: 'The bright blue gelatinous precipitate darkens and converts into a fine black powdery precipitate (CuO).',
    observable_vi: 'Kết tủa màu xanh lam chuyển dần sang màu đen tuyền của đồng(II) oxit.',
    stoichiometry: { 'Cu(OH)2': 1 },
    products: { 'CuO': { coeff: 1, state: 's' }, 'H2O': { coeff: 1, state: 'l' } },
    deltaH_kJ: 42.0,
    hasPrecipitate: true,
    precipitateColor: '#18181b',
    precipitateFormula: 'CuO',
    resultingLiquidColor: '#f8fafc',
    isDangerous: false
  },

  // 15. Iodine Sublimation upon Heating
  {
    id: 'iodine_sublimation',
    reactants: ['I2'],
    requiresHeating: true,
    minTemp_c: 50,
    equation: 'I₂(s) ⎯⎯t°⎯→ I₂(g) (Thăng hoa)',
    reactionType_en: 'Phase Transition (Sublimation)',
    reactionType_vi: 'Hiện tượng vật lý / Thăng hoa Iốt',
    summary_en: 'Solid dark violet iodine crystals sublime directly into rich purple-violet vapor upon heating.',
    summary_vi: 'Tinh thể Iốt màu tím đen thăng hoa trực tiếp thành luồng hơi màu tím hoa cà tuyệt đẹp khi đun nóng.',
    observable_en: 'Stunning deep violet/purple vapor rises from the heated crystals and condenses as shiny crystals on cooler surfaces.',
    observable_vi: 'Hơi màu tím thẫm bốc lên huyền ảo lấp lánh trong bình thí nghiệm.',
    stoichiometry: { 'I2': 1 },
    products: { 'I2': { coeff: 1, state: 'g' } },
    deltaH_kJ: 62.4,
    hasGas: true,
    gasColor: '#9333ea',
    gasFormula: 'I2(vapor)',
    isDangerous: false
  },

  // 15b. Thermal Dehydration: CuSO4·5H2O -> CuSO4 + 5H2O (Requires Heating)
  {
    id: 'cuso4_thermal_dehydration',
    reactants: ['CuSO4'],
    requiresHeating: true,
    minTemp_c: 90,
    equation: 'CuSO₄·5H₂O(s) ⎯⎯t°⎯→ CuSO₄(s) + 5H₂O↑',
    reactionType_en: 'Thermal Dehydration',
    reactionType_vi: 'Phản ứng mất nước kết tinh muối ngậm nước',
    summary_en: 'Upon heating in a crucible, deep-blue copper(II) sulfate pentahydrate crystals lose water of crystallization, turning into white anhydrous powder.',
    summary_vi: 'Khi đun nóng trong chén nung sứ, tinh thể CuSO4 màu xanh lam mất nước kết tinh chuyển thành bột CuSO4 khan màu trắng đục.',
    observable_en: 'Vibrant blue crystals lose color and convert into a chalky-white anhydrous powder as steam escapes.',
    observable_vi: 'Màu xanh lam chuyển dần sang màu trắng ngà của muối đồng sunfat khan khi hơi nước bay lên.',
    stoichiometry: { 'CuSO4': 1 },
    products: { 'CuSO4': { coeff: 1, state: 's' } },
    deltaH_kJ: 78.0,
    hasGas: true,
    gasColor: '#f1f5f9',
    gasFormula: 'H2O(steam)',
    hasPrecipitate: true,
    precipitateColor: '#f8fafc',
    precipitateFormula: 'CuSO4',
    resultingLiquidColor: '#f8fafc',
    isDangerous: false
  },

  // 16. WATER ADDED TO CONC H2SO4 (CRITICAL SAFETY HAZARD)
  {
    id: 'water_into_conc_h2so4_explosion',
    reactants: ['H2SO4 (conc)', 'H2O'],
    equation: 'H₂SO₄(conc) + H₂O → H₃O⁺ + HSO₄⁻ + Q (CựC KỲ NGUY HIỂM)',
    reactionType_en: 'Violent Hydration / Safety Violation',
    reactionType_vi: 'Hiện tượng sôi nổ do hòa tan axit đặc vào nước sai quy cách',
    summary_en: 'CRITICAL SAFETY VIOLATION: Water dropped into dense sulfuric acid floats on top and instantly flashes into steam, causing boiling acid to splatter violently!',
    summary_vi: 'VI PHẠM QUY TẮC AN TOÀN PHÒNG THÍ NGHIỆM: Nước nhẹ hơn nổi lên trên bề mặt axit đặc và bị đun sôi tức thì tạo áp suất hơi nước làm axit đặc bắn tung tóe!',
    observable_en: 'Loud popping sounds, violent steam erupts, dangerous splashing of corrosive acid. NEVER ADD WATER TO ACID! Always add acid slowly down glass rod into water!',
    observable_vi: 'Tiếng nổ lách tách dữ dội, hơi nước bốc lên mù mịt và dung dịch bắn tung tóe. NGUYÊN TẮC VÀNG: Tuyệt đối chỉ được rót từ từ axit vào nước, KHÔNG BAO GIỜ làm ngược lại!',
    stoichiometry: { 'H2SO4 (conc)': 1, 'H2O': 1 },
    products: { 'H2SO4 (dil)': { coeff: 1, state: 'aq' } },
    deltaH_kJ: -95.0,
    resultingPh: 0.2,
    hasGas: true,
    gasColor: '#fecaca',
    isBoiling: true,
    isDangerous: true,
    safetyNotes_en: 'SEVERE THERMAL HAZARD: Can cause catastrophic chemical burns and shatter glassware. Rule: "Add Acid to Water" (AAW / Always Add Water is WRONG).',
    safetyNotes_vi: 'NGUY CƠ BỎNG HÓA CHẤT CỰC NẶNG: Luôn nhớ câu thần chú: "Rót từ từ axit vào nước dọc theo đũa thủy tinh, không bao giờ đổ nước vào axit".'
  },

  // 17. Sodium Metal in Water (Fire / Pop Explosion)
  {
    id: 'sodium_water_reaction',
    reactants: ['Na', 'H2O'],
    equation: '2Na + 2H₂O → 2NaOH + H₂↑ + Q',
    reactionType_en: 'Alkali Metal Oxidation (Hazardous)',
    reactionType_vi: 'Kim loại kiềm tác dụng với nước (Tỏa nhiệt mạnh)',
    summary_en: 'Metallic sodium melts into a silvery sphere, skips furiously across the water surface, and ignites with an intense yellow flame.',
    summary_vi: 'Mẩu natri nóng chảy vo tròn thành viên bi bạc, chạy lướt nhanh trên mặt nước, bốc cháy với ngọn lửa màu vàng và nổ lách tách.',
    observable_en: 'Sodium sphere hisses and glides rapidly over water with white smoke trail, then pops with a bright golden flame!',
    observable_vi: 'Viên bi natri xèo xèo chạy nhanh trên mặt nước, tỏa khói trắng rồi bùng cháy với ngọn lửa vàng cam rực rỡ và nổ bụp!',
    stoichiometry: { 'Na': 2, 'H2O': 2 },
    products: { 'NaOH': { coeff: 2, state: 'aq' }, 'H2': { coeff: 1, state: 'g' } },
    deltaH_kJ: -368.0,
    resultingPh: 14.0,
    hasGas: true,
    gasColor: '#fef08a',
    gasFormula: 'H2',
    isBoiling: true,
    isDangerous: true,
    safetyNotes_en: 'Violent reaction. Produces caustic NaOH and explosive H2. Handle with tweezers under dry conditions.',
    safetyNotes_vi: 'Phản ứng rất mãnh liệt. Tạo bazơ kiềm mạnh NaOH và khí H2 dễ nổ. Dùng panh gắp cẩn thận.'
  },

  // 18. Cu + 4HNO3 (conc) -> Cu(NO3)2 + 2NO2 + 2H2O (Dense Brown NO2 Gas)
  {
    id: 'cu_hno3_conc',
    reactants: ['Cu', 'HNO3'],
    equation: 'Cu + 4HNO₃(đặc) → Cu(NO₃)₂ + 2NO₂↑ + 2H₂O',
    ionic_equation: 'Cu(s) + 4H⁺(aq) + 2NO₃⁻(aq) → Cu²⁺(aq) + 2NO₂(g)↑ + 2H₂O(l)',
    reactionType_en: 'Redox with Oxidizing Acid (Brown NO2 Gas)',
    reactionType_vi: 'Phản ứng oxi hóa khử tạo khí màu nâu đỏ',
    summary_en: 'Copper metal rapidly dissolves in concentrated nitric acid releasing dense brown NO2 gas.',
    summary_vi: 'Đồng tác dụng với axit nitric đặc giải phóng khí nitơ đioxit màu nâu đỏ đậm và dung dịch xanh lục ngọc.',
    observable_en: 'The solution foams vigorously, turning deep green then blue. A dense cloud of pungent reddish-brown NO2 gas billows out and spills over the beaker rim.',
    observable_vi: 'Dung dịch sủi bọt mạnh, chuyển từ xanh ngọc sang xanh lam. Khí NO2 màu nâu đỏ đậm cuộn trào bốc lên, nặng hơn không khí tràn qua miệng cốc rồi chìm xuống mặt bàn.',
    stoichiometry: { 'Cu': 1, 'HNO3': 4 },
    products: { 'Cu(NO3)2': { coeff: 1, state: 'aq' }, 'NO2': { coeff: 2, state: 'g' }, 'H2O': { coeff: 2, state: 'l' } },
    deltaH_kJ: -136.0,
    resultingPh: 0.5,
    hasGas: true,
    gasColor: '#78350f', // Dense reddish-brown NO2
    gasFormula: 'NO2',
    resultingLiquidColor: '#059669', // Emerald turquoise/green to blue
    isDangerous: true,
    safetyNotes_en: 'TOXIC FUMES: NO2 gas causes respiratory irritation. Operate exclusively under a fume hood.',
    safetyNotes_vi: 'KHÍ ĐỘC NGUY HIỂM: Khí NO2 gây kích ứng đường hô hấp dữ dội. Bắt buộc thực hiện trong tủ hút.'
  },

  // 19. Cu + H2SO4 (conc) (Requires Heating)
  {
    id: 'cu_conc_h2so4_heated',
    reactants: ['Cu', 'H2SO4 (conc)'],
    equation: 'Cu + 2H₂SO₄(đặc) —(t°)→ CuSO₄ + SO₂↑ + 2H₂O',
    ionic_equation: 'Cu(s) + 4H⁺ + 2SO₄²⁻ → Cu²⁺ + SO₂↑ + 2H₂O + SO₄²⁻',
    reactionType_en: 'Redox with Oxidizing Acid',
    reactionType_vi: 'Phản ứng oxi hóa - khử với axit có tính oxi hóa mạnh',
    summary_en: 'Copper reacts with hot concentrated sulfuric acid to yield copper(II) sulfate and pungent sulfur dioxide gas.',
    summary_vi: 'Đồng tác dụng với axit sunfuric đặc khi đun nóng sinh ra dung dịch màu xanh của CuSO4 và khí mùi hắc SO2.',
    observable_en: 'Under heating, solution gradually turns deep blue, effervescing with choking SO2 gas while copper dissolves.',
    observable_vi: 'Khi đun nóng, mẩu đồng tan dần, dung dịch chuyển dần sang màu xanh lam và sủi bọt khí SO2 có mùi hắc đặc trưng.',
    stoichiometry: { 'Cu': 1, 'H2SO4 (conc)': 2 },
    products: { 'CuSO4': { coeff: 1, state: 'aq' }, 'SO2': { coeff: 1, state: 'g' }, 'H2O': { coeff: 2, state: 'l' } },
    deltaH_kJ: -84.0,
    requiresHeating: true,
    minTemp_c: 65,
    resultingPh: 1.0,
    hasGas: true,
    gasColor: '#f1f5f9',
    gasFormula: 'SO2',
    resultingLiquidColor: '#38bdf8',
    isDangerous: true,
    safetyNotes_en: 'Perform strictly under ventilation hood; SO2 gas is toxic and suffocating.',
    safetyNotes_vi: 'Thực hiện cẩn trọng; khí SO2 độc hại và gây ngạt đường hô hấp.'
  },

  // 20. Limewater + CO2 (White Milky Precipitate)
  {
    id: 'limewater_co2_milky',
    reactants: ['Ca(OH)2', 'CO2'],
    equation: 'Ca(OH)₂ + CO₂ → CaCO₃↓ + H₂O',
    ionic_equation: 'Ca²⁺(aq) + 2OH⁻(aq) + CO₂(g) → CaCO₃(s)↓ + H₂O(l)',
    reactionType_en: 'Limewater Test for CO2 (Precipitation)',
    reactionType_vi: 'Nhận biết khí CO2 bằng nước vôi trong (Tạo kết tủa)',
    summary_en: 'Carbon dioxide gas turns clear limewater milky due to fine insoluble calcium carbonate precipitate.',
    summary_vi: 'Khí cacbonic làm đục nước vôi trong do tạo kết tủa canxi cacbonat màu trắng.',
    observable_en: 'Clear solution becomes cloudy and milky-white as CaCO3 precipitate forms throughout.',
    observable_vi: 'Dung dịch trong suốt vẩn đục dần rồi chuyển sang màu trắng đục như nước vo gạo.',
    stoichiometry: { 'Ca(OH)2': 1, 'CO2': 1 },
    products: { 'CaCO3': { coeff: 1, state: 's' }, 'H2O': { coeff: 1, state: 'l' } },
    deltaH_kJ: -113.0,
    resultingPh: 7.5,
    hasPrecipitate: true,
    precipitateColor: '#ffffff',
    precipitateFormula: 'CaCO3',
    resultingLiquidColor: '#f8fafc',
    hasGas: false,
    isDangerous: false
  },

  // 21. Excess CO2 with Milky Limewater (Precipitate Re-dissolution / Clarification)
  {
    id: 'caco3_co2_excess_clearing',
    reactants: ['CaCO3', 'CO2'],
    equation: 'CaCO₃ + CO₂ + H₂O → Ca(HCO₃)₂ (Tan trong nước)',
    ionic_equation: 'CaCO₃(s) + CO₂(aq) + H₂O(l) → Ca²⁺(aq) + 2HCO₃⁻(aq)',
    reactionType_en: 'Precipitate Dissolution in Excess CO2',
    reactionType_vi: 'Hiện tượng kết tủa tan khi sục khí CO2 dư',
    summary_en: 'Excess carbon dioxide bubbled into milky limewater converts insoluble CaCO3 into soluble calcium bicarbonate, returning the solution to completely clear!',
    summary_vi: 'Sục khí CO2 liên tục đến dư làm kết tủa CaCO3 tan hoàn toàn tạo canxi hiđrocacbonat, dung dịch từ đục hóa trong suốt trở lại!',
    observable_en: 'The milky-white suspension gradually clears up from top to bottom, becoming crystal-clear transparent once again.',
    observable_vi: 'Hiện tượng kỳ thú: Nước vôi đang đục bỗng trong dần từ trên xuống dưới rồi trở lại trong veo hoàn toàn.',
    stoichiometry: { 'CaCO3': 1, 'CO2': 1 },
    products: { 'Ca(HCO3)2': { coeff: 1, state: 'aq' } },
    deltaH_kJ: -32.0,
    resultingPh: 7.2,
    hasPrecipitate: false,
    resultingLiquidColor: '#f8fafc',
    hasGas: false,
    isDangerous: false
  },

  // 22. Al2(SO4)3 + NaOH -> Amphoteric Al(OH)3 (Forms then Dissolves in Excess Base)
  {
    id: 'al2so4_naoh_amphoteric',
    reactants: ['Al2(SO4)3', 'NaOH'],
    equation: 'Al₂(SO₄)₃ + 6NaOH → 2Al(OH)₃↓ + 3Na₂SO₄; Al(OH)₃ + NaOH → Na[Al(OH)₄]',
    ionic_equation: 'Al³⁺ + 3OH⁻ → Al(OH)₃↓; Al(OH)₃ + OH⁻ → [Al(OH)₄]⁻',
    reactionType_en: 'Amphoteric Hydroxide Formation & Dissolution',
    reactionType_vi: 'Tính chất lưỡng tính của nhôm hiđroxit',
    summary_en: 'Addition of base first precipitates white gelatinous Al(OH)3, which completely redissolves in excess NaOH.',
    summary_vi: 'Ban đầu tạo kết tủa keo trắng Al(OH)3, khi cho kiềm dư kết tủa tan hoàn toàn tạo natri aluminat trong suốt.',
    observable_en: 'White gelatinous precipitate appears like clouds in water, then dissolves smoothly when stirred with excess NaOH.',
    observable_vi: 'Xuất hiện kết tủa keo trắng lơ lửng, sau đó tan biến khi thêm kiềm dư tạo dung dịch trong suốt.',
    stoichiometry: { 'Al2(SO4)3': 1, 'NaOH': 6 },
    products: { 'Al(OH)3': { coeff: 2, state: 's' }, 'Na2SO4': { coeff: 3, state: 'aq' } },
    deltaH_kJ: -88.0,
    resultingPh: 12.0,
    hasPrecipitate: true,
    precipitateColor: '#f8fafc',
    precipitateFormula: 'Al(OH)3',
    resultingLiquidColor: '#f8fafc',
    hasGas: false,
    isDangerous: false
  },

  // 23. CuSO4 + NH3 (Pale Blue Gel -> Vivid Royal Blue Complex)
  {
    id: 'cuso4_nh3_complex',
    reactants: ['CuSO4', 'NH3'],
    equation: 'CuSO₄ + 4NH₃ + H₂O → [Cu(NH₃)₄]SO₄ (Xanh thẫm)',
    ionic_equation: 'Cu²⁺ + 4NH₃ → [Cu(NH₃)₄]²⁺',
    reactionType_en: 'Coordination Complex Formation',
    reactionType_vi: 'Phản ứng tạo phức chất tetraammin đồng(II)',
    summary_en: 'Ammonia first forms light blue precipitate which dissolves into an intensely deep royal blue tetraamminecopper(II) complex.',
    summary_vi: 'Amoniac tác dụng với CuSO4 tạo kết tủa xanh nhạt, sau đó tan trong NH3 dư tạo dung dịch phức màu xanh lam đậm lộng lẫy.',
    observable_en: 'Instant transformation: cloudy pale-blue precipitate dissolves into a breathtaking, crystal-clear midnight royal blue solution.',
    observable_vi: 'Hiện tượng tuyệt đẹp: Dung dịch chuyển sang màu xanh lam đậm huyền ảo rực rỡ đặc trưng của phức đồng.',
    stoichiometry: { 'CuSO4': 1, 'NH3': 4 },
    products: { '[Cu(NH3)4]SO4': { coeff: 1, state: 'aq' } },
    deltaH_kJ: -130.0,
    resultingPh: 10.5,
    hasPrecipitate: false,
    resultingLiquidColor: '#1d4ed8', // Deep royal blue
    hasGas: false,
    isDangerous: false
  },

  // 24. FeCl3 + KSCN -> Blood-Red [Fe(SCN)]2+ Complex
  {
    id: 'fecl3_kscn_complex',
    reactants: ['FeCl3', 'KSCN'],
    equation: 'FeCl₃ + 3KSCN ⇌ Fe(SCN)₃ + 3KCl',
    ionic_equation: 'Fe³⁺(aq) + SCN⁻(aq) ⇌ [Fe(SCN)]²⁺(aq)',
    reactionType_en: 'Complex Ion Equilibrium (Blood-Red Test)',
    reactionType_vi: 'Phản ứng tạo phức chất màu đỏ máu',
    summary_en: 'Sensitive analytical test for iron(III) generating intense blood-red iron thiocyanate complex.',
    summary_vi: 'Thuốc thử siêu nhạy tạo phức chất sắt(III) thioxianat màu đỏ máu kinh điển trong phân tích hóa học.',
    observable_en: 'Upon contact, amber-yellow solution instantly turns dramatic deep blood-red like crimson wine.',
    observable_vi: 'Vừa tiếp xúc, dung dịch màu vàng nâu lập tức bùng nổ chuyển sang màu đỏ máu thẫm tuyệt đẹp.',
    stoichiometry: { 'FeCl3': 1, 'KSCN': 3 },
    products: { 'Fe(SCN)3': { coeff: 1, state: 'aq' }, 'KCl': { coeff: 3, state: 'aq' } },
    deltaH_kJ: -31.0,
    resultingPh: 2.5,
    hasPrecipitate: false,
    resultingLiquidColor: '#881337', // Deep blood-red/burgundy
    hasGas: false,
    isDangerous: false
  },

  // 25. KMnO4 + H2C2O4 + H2SO4 (Autocatalytic Decolorization)
  {
    id: 'kmno4_oxalic_redox',
    reactants: ['KMnO4', 'H2C2O4'],
    equation: '2KMnO₄ + 5H₂C₂O₄ + 3H₂SO₄ → K₂SO₄ + 2MnSO₄ + 10CO₂↑ + 8H₂O',
    reactionType_en: 'Autocatalytic Redox Reaction',
    reactionType_vi: 'Phản ứng oxi hóa khử tự xúc tác',
    summary_en: 'Purple permanganate is reduced by oxalic acid; Mn2+ produced acts as an autocatalyst, accelerating decolorization.',
    summary_vi: 'Kali pemanganat bị axit oxalic khử làm mất màu tím; ion Mn2+ sinh ra tự làm xúc tác thúc đẩy phản ứng tăng tốc.',
    observable_en: 'Deep royal purple solution slowly warms up, then rapidly discharges color to completely clear with gentle CO2 effervescence.',
    observable_vi: 'Màu tím đậm của thuốc tím ban đầu nhạt chậm, sau đó tăng tốc mất màu hoàn toàn trở nên không màu trong suốt.',
    stoichiometry: { 'KMnO4': 2, 'H2C2O4': 5 },
    products: { 'MnSO4': { coeff: 2, state: 'aq' }, 'CO2': { coeff: 10, state: 'g' }, 'H2O': { coeff: 8, state: 'l' } },
    deltaH_kJ: -280.0,
    resultingPh: 2.0,
    hasPrecipitate: false,
    resultingLiquidColor: '#f8fafc',
    hasGas: true,
    gasColor: '#f1f5f9',
    gasFormula: 'CO2',
    isDangerous: false
  },

  // 26. Na2S2O3 + 2HCl -> S (Colloidal Sulfur Disappearing Cross)
  {
    id: 'thiosulfate_acid_clock',
    reactants: ['Na2S2O3', 'HCl'],
    equation: 'Na₂S₂O₃ + 2HCl → 2NaCl + SO₂↑ + S↓ + H₂O',
    reactionType_en: 'Precipitation Clock (Disappearing Cross)',
    reactionType_vi: 'Phản ứng tạo lưu huỳnh keo (Thí nghiệm dấu nhân biến mất)',
    summary_en: 'Acidification of thiosulfate gradually nucleates colloidal sulfur, progressively increasing opacity.',
    summary_vi: 'Axit phân hủy natri thiosunfat tạo lưu huỳnh keo làm dung dịch đục dần từ từ che khuất dấu thập.',
    observable_en: 'Clear solution stays clear for an induction period, then turns opalescent pale-yellow and increasingly opaque.',
    observable_vi: 'Dung dịch trong suốt vài giây đầu, sau đó chuyển sang màu trắng đục ánh vàng sữa che mờ dần đáy cốc.',
    stoichiometry: { 'Na2S2O3': 1, 'HCl': 2 },
    products: { 'S': { coeff: 1, state: 's' }, 'SO2': { coeff: 1, state: 'g' }, 'NaCl': { coeff: 2, state: 'aq' } },
    deltaH_kJ: -42.0,
    resultingPh: 3.5,
    hasPrecipitate: true,
    precipitateColor: '#fef08a',
    precipitateFormula: 'S',
    hasGas: true,
    gasColor: '#f1f5f9',
    gasFormula: 'SO2',
    isDangerous: false
  },

  // 27. Landolt Iodine Clock (Sudden Blue-Black Color Switch)
  {
    id: 'iodine_clock',
    reactants: ['KIO3', 'NaHSO3'],
    optionalAdditions: ['Starch'],
    equation: 'IO₃⁻ + 3HSO₃⁻ → I⁻ + 3SO₄²⁻ + 3H⁺; IO₃⁻ + 5I⁻ + 6H⁺ → 3I₂ + 3H₂O',
    reactionType_en: 'Landolt Iodine Clock Reaction',
    reactionType_vi: 'Phản ứng đồng hồ Iốt Landolt',
    summary_en: 'Classic kinetic clock reaction: solution stays completely clear during bisulfite consumption, then flashes midnight blue-black instantly.',
    summary_vi: 'Phản ứng đồng hồ kinh điển: Dung dịch trong suốt hoàn toàn trong giai đoạn trễ, sau đó chuyển sang màu xanh đen tức thì trong chớp mắt.',
    observable_en: 'Dramatic instantaneous color switch: completely clear liquid flashes into deep midnight blue-black in less than 0.1 seconds!',
    observable_vi: 'Chuyển màu kỳ diệu trong chớp mắt: Dung dịch đang trong suốt bỗng đen sẫm lại tức thì như mực chỉ trong một phần mười giây!',
    stoichiometry: { 'KIO3': 1, 'NaHSO3': 3 },
    products: { 'I2': { coeff: 1, state: 'aq' }, 'Na2SO4': { coeff: 3, state: 'aq' } },
    deltaH_kJ: -120.0,
    resultingPh: 4.0,
    resultingLiquidColor: '#0f172a', // Midnight blue-black
    hasPrecipitate: false,
    hasGas: false,
    isDangerous: false
  },

  // 28. Amphoteric Al(OH)3 Dissolution in Excess NaOH
  {
    id: 'aloh3_naoh_dissolution',
    reactants: ['Al(OH)3', 'NaOH'],
    equation: 'Al(OH)₃ + NaOH → Na[Al(OH)₄] (Tan hoàn toàn)',
    ionic_equation: 'Al(OH)₃(s) + OH⁻(aq) → [Al(OH)₄]⁻(aq)',
    reactionType_en: 'Amphoteric Hydroxide Dissolution',
    reactionType_vi: 'Hòa tan kết tủa nhôm hiđroxit bằng kiềm dư',
    summary_en: 'Insoluble white gelatinous aluminum hydroxide dissolves completely in excess sodium hydroxide forming clear sodium aluminate.',
    summary_vi: 'Kết tủa keo trắng Al(OH)3 tan hoàn toàn trong dung dịch NaOH dư tạo phức natri aluminat trong suốt.',
    observable_en: 'The white gelatinous clouds dissolve smoothly and disappear completely, leaving a crystal clear solution.',
    observable_vi: 'Kết tủa keo trắng tan biến hoàn toàn, dung dịch trở lại trong suốt không màu.',
    stoichiometry: { 'Al(OH)3': 1, 'NaOH': 1 },
    products: { 'Na[Al(OH)4]': { coeff: 1, state: 'aq' } },
    deltaH_kJ: -31.5,
    resultingPh: 12.5,
    hasPrecipitate: false,
    resultingLiquidColor: '#f8fafc',
    hasGas: false,
    isDangerous: false
  },

  // 29. Cu(OH)2 Dissolution in Excess NH3 (Royal Blue Complex)
  {
    id: 'cuoh2_nh3_complex',
    reactants: ['Cu(OH)2', 'NH3'],
    equation: 'Cu(OH)₂ + 4NH₃ → [Cu(NH₃)₄](OH)₂ (Xanh thẫm)',
    ionic_equation: 'Cu(OH)₂(s) + 4NH₃(aq) → [Cu(NH₃)₄]²⁺(aq) + 2OH⁻(aq)',
    reactionType_en: 'Precipitate Dissolution via Complexation',
    reactionType_vi: 'Hòa tan kết tủa đồng hiđroxit tạo phức amoniac',
    summary_en: 'Sky-blue gelatinous copper(II) hydroxide dissolves in excess ammonia forming an intensely vibrant royal-blue solution.',
    summary_vi: 'Kết tủa xanh lam Cu(OH)2 tan trong dung dịch amoniac dư tạo dung dịch phức màu xanh thẫm tuyệt đẹp.',
    observable_en: 'The cloudy blue precipitate dissolves immediately into a luminous, transparent deep midnight-blue solution.',
    observable_vi: 'Kết tủa xanh tan dần tạo thành dung dịch màu xanh lam thẫm trong suốt rực rỡ.',
    stoichiometry: { 'Cu(OH)2': 1, 'NH3': 4 },
    products: { '[Cu(NH3)4](OH)2': { coeff: 1, state: 'aq' } },
    deltaH_kJ: -85.0,
    resultingPh: 11.0,
    hasPrecipitate: false,
    resultingLiquidColor: '#1d4ed8',
    hasGas: false,
    isDangerous: false
  },

  // 30. AgCl Dissolution in Ammonia Complex
  {
    id: 'agcl_nh3_complex',
    reactants: ['AgCl', 'NH3'],
    equation: 'AgCl + 2NH₃ → [Ag(NH₃)₂]Cl (Tan trong suốt)',
    ionic_equation: 'AgCl(s) + 2NH₃(aq) → [Ag(NH₃)₂]⁺(aq) + Cl⁻(aq)',
    reactionType_en: 'Complex Dissolution',
    reactionType_vi: 'Hòa tan kết tủa bạc clorua trong amoniac',
    summary_en: 'Curdy white silver chloride dissolves easily in aqueous ammonia forming diamminesilver(I) complex.',
    summary_vi: 'Kết tủa trắng AgCl tan trong dung dịch amoniac tạo phức bạc amoniac trong suốt.',
    observable_en: 'White curds dissolve away, solution becomes completely clear.',
    observable_vi: 'Kết tủa trắng tan hết, dung dịch trở lại trong suốt hoàn toàn.',
    stoichiometry: { 'AgCl': 1, 'NH3': 2 },
    products: { '[Ag(NH3)2]Cl': { coeff: 1, state: 'aq' } },
    deltaH_kJ: -38.0,
    resultingPh: 9.5,
    hasPrecipitate: false,
    resultingLiquidColor: '#f8fafc',
    hasGas: false,
    isDangerous: false
  },

  // 31. HNO3 + NaOH (Nitric Acid Neutralization)
  {
    id: 'hno3_naoh_neutralization',
    reactants: ['HNO3', 'NaOH'],
    equation: 'HNO₃ + NaOH → NaNO₃ + H₂O',
    ionic_equation: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    reactionType_en: 'Acid-Base Neutralization',
    reactionType_vi: 'Phản ứng trung hòa Axit - Bazơ',
    summary_en: 'Neutralization of nitric acid by sodium hydroxide forming sodium nitrate and water.',
    summary_vi: 'Phản ứng trung hòa axit nitric và natri hiđroxit tạo muối natri nitrat và nước.',
    observable_en: 'Solution warms up. Neutral pH 7.0 reached.',
    observable_vi: 'Dung dịch ấm lên do tỏa nhiệt, pH trở về trung tính.',
    stoichiometry: { 'HNO3': 1, 'NaOH': 1 },
    products: { 'NaNO3': { coeff: 1, state: 'aq' }, 'H2O': { coeff: 1, state: 'l' } },
    deltaH_kJ: -57.1,
    resultingPh: 7.0,
    resultingLiquidColor: '#f8fafc',
    hasPrecipitate: false,
    hasGas: false,
    isDangerous: false
  },

  // 32. FeCl3 + 3NaOH -> Fe(OH)3 (Reddish-Brown Precipitate)
  {
    id: 'fecl3_naoh_precipitate',
    reactants: ['FeCl3', 'NaOH'],
    equation: 'FeCl₃ + 3NaOH → Fe(OH)₃↓ + 3NaCl',
    ionic_equation: 'Fe³⁺(aq) + 3OH⁻(aq) → Fe(OH)₃(s)↓',
    reactionType_en: 'Precipitation Reaction',
    reactionType_vi: 'Phản ứng tạo kết tủa nâu đỏ sắt(III) hiđroxit',
    summary_en: 'Reaction between iron(III) chloride and sodium hydroxide producing characteristic reddish-brown iron(III) hydroxide precipitate.',
    summary_vi: 'Tạo kết tủa màu nâu đỏ của sắt(III) hiđroxit.',
    observable_en: 'Dramatic reddish-brown precipitate forms instantly in solution.',
    observable_vi: 'Xuất hiện ngay lập tức kết tủa màu nâu đỏ đặc trưng của Fe(OH)3.',
    stoichiometry: { 'FeCl3': 1, 'NaOH': 3 },
    products: { 'Fe(OH)3': { coeff: 1, state: 's' }, 'NaCl': { coeff: 3, state: 'aq' } },
    deltaH_kJ: -75.0,
    resultingPh: 8.0,
    hasPrecipitate: true,
    precipitateColor: '#78350f',
    precipitateFormula: 'Fe(OH)3',
    resultingLiquidColor: '#fef3c7',
    hasGas: false,
    isDangerous: false
  },

  // 33. AgNO3 + HCl -> AgCl (Acid-Salt Precipitation)
  {
    id: 'agno3_hcl_precipitate',
    reactants: ['AgNO3', 'HCl'],
    equation: 'AgNO₃ + HCl → AgCl↓ + HNO₃',
    ionic_equation: 'Ag⁺(aq) + Cl⁻(aq) → AgCl(s)↓',
    reactionType_en: 'Precipitation Reaction',
    reactionType_vi: 'Phản ứng tạo kết tủa trắng AgCl',
    summary_en: 'Silver nitrate reacts with hydrochloric acid yielding insoluble silver chloride precipitate.',
    summary_vi: 'Bạc nitrat tác dụng với axit clohiđric tạo kết tủa trắng bạc clorua.',
    observable_en: 'Dense white curdy precipitate forms instantly.',
    observable_vi: 'Xuất hiện kết tủa trắng vón của AgCl.',
    stoichiometry: { 'AgNO3': 1, 'HCl': 1 },
    products: { 'AgCl': { coeff: 1, state: 's' }, 'HNO3': { coeff: 1, state: 'aq' } },
    deltaH_kJ: -65.5,
    resultingPh: 1.0,
    hasPrecipitate: true,
    precipitateColor: '#f1f5f9',
    precipitateFormula: 'AgCl',
    hasGas: false,
    isDangerous: false
  }
];

export function findPendingReaction(
  substances: string[],
  temperature_c: number,
  isHeated: boolean,
  lang: 'en' | 'vi' = 'vi'
) {
  if (!substances || substances.length === 0) return null;
  const match = DETERMINISTIC_REACTIONS.find(r => {
    if (!matchesReactants(substances, r.reactants)) return false;
    if (r.requiresHeating && !isHeated && temperature_c < (r.minTemp_c || 60)) {
      return true;
    }
    return false;
  });
  if (!match) return null;
  return {
    reactionId: match.id,
    equation: match.equation,
    requiredCondition: lang === 'en'
      ? `Requires heating with Bunsen burner (t° ≥ ${match.minTemp_c || 60}°C)`
      : `Cần đun nóng bằng ngọn lửa đèn cồn (t° ≥ ${match.minTemp_c || 60}°C)`,
    minTemp_c: match.minTemp_c || 60,
    reactants: match.reactants
  };
}

export function getCacheKey(substances: string[], isHeated: boolean, temp_c: number, lang: 'en' | 'vi' = 'vi'): string {
  return getCanonicalReactionKey(substances, isHeated, temp_c, lang);
}

export interface MultiStepReactionResult {
  reactionsOccurred: {
    reactionId: string;
    equation: string;
    summary: string;
    xi: number;
    deltaH_kJ: number;
    match: DeterministicReaction;
  }[];
  updatedContents: {
    formula: string;
    moles: number;
    mass_g: number;
    concentration_M?: number;
    volume_ml?: number;
  }[];
  updatedSubstances: string[];
  finalTemperature_c: number;
  finalPh: number;
  finalLiquidColor: string;
  hasPrecipitate: boolean;
  precipitateColor?: string;
  precipitateSubstance?: string;
  precipitateAmount_g?: number;
  hasGas: boolean;
  gasColor?: string;
  gasFormula?: string;
  isBoiling: boolean;
  isExplosion: boolean;
  combinedMixResult: MixResult | null;
}

/**
 * Executes multi-step stoichiometric reactions:
 * - Calculates exact limiting reagents and reaction extents xi
 * - Deducts consumed reactant moles cleanly down to 0
 * - Synthesizes products with their exact stoichiometric moles and masses
 * - Cascades through multi-stage reactions (e.g. Al(OH)3 formation then excess base dissolution)
 * - Computes accurate thermodynamics (heat release), colligative properties, and exact solution pH
 */
export function executeMultiStepReactions(
  initialContents: { formula: string; moles: number; mass_g: number; concentration_M?: number; volume_ml?: number }[],
  initialSubstances: string[],
  volume_ml: number,
  initialTemperature_c: number,
  isHeated: boolean,
  lang: 'en' | 'vi' = 'vi'
): MultiStepReactionResult {
  // 1. Create working copy of contents with reliable moles
  const workingContents: { formula: string; moles: number; mass_g: number; concentration_M?: number; volume_ml?: number }[] = [];
  
  for (const item of (initialContents || [])) {
    workingContents.push({ ...item });
  }

  // Ensure any substance in initialSubstances exists in workingContents
  const firstRx = DETERMINISTIC_REACTIONS.find(r => matchesReactants(initialSubstances, r.reactants));
  for (const sub of initialSubstances) {
    if (normalizeFormulaToken(sub) === 'h2o') continue;
    const exists = workingContents.some(c => chemicalFormulaMatches(c.formula, sub) && c.moles > 1e-6);
    if (!exists) {
      const chem = findChemical(sub);
      const isSolid = chem.type === 'solid';
      let moles = isSolid 
        ? (2.0 / (chem.molarMass || 100)) 
        : ((Math.max(10, volume_ml) / 1000.0) * (chem.defaultConcentration || 1.0));
      
      if (firstRx && firstRx.stoichiometry) {
        for (const [rForm, coeff] of Object.entries(firstRx.stoichiometry)) {
          if (chemicalFormulaMatches(sub, rForm)) {
            moles = coeff * 0.05;
            break;
          }
        }
      }

      workingContents.push({
        formula: chem.formula || sub,
        moles,
        mass_g: moles * (chem.molarMass || 100),
        concentration_M: !isSolid && volume_ml > 0 ? moles / (volume_ml / 1000.0) : undefined
      });
    }
  }

  let currentTemp = initialTemperature_c;
  const reactionsOccurred: {
    reactionId: string;
    equation: string;
    summary: string;
    xi: number;
    deltaH_kJ: number;
    match: DeterministicReaction;
  }[] = [];

  let isExplosionOccurred = false;
  let hasGasOccurred = false;
  let gasColorFinal: string | undefined = undefined;
  let gasFormulaFinal: string | undefined = undefined;

  // Maximum 10 reaction iterations to allow multi-stage cascades without runaway loops
  for (let step = 0; step < 10; step++) {
    const activeSubstances = workingContents.filter(c => c.moles > 1e-5).map(c => c.formula);
    if (activeSubstances.length === 0) break;

    // Find candidate deterministic reaction
    const candidate = DETERMINISTIC_REACTIONS.find(r => {
      if (!matchesReactants(activeSubstances, r.reactants)) return false;
      if (r.requiresHeating && !isHeated && currentTemp < (r.minTemp_c || 50)) return false;
      return true;
    });

    if (!candidate) break;

    // Calculate limiting reagent extent xi based on stoichiometry
    let minXi = Infinity;

    for (const [reactantFormula, coeff] of Object.entries(candidate.stoichiometry)) {
      if (coeff <= 0) continue;
      const found = workingContents.find(c => chemicalFormulaMatches(c.formula, reactantFormula) && c.moles > 1e-5);
      if (!found) {
        minXi = 0;
        break;
      }
      const rXi = found.moles / coeff;
      if (rXi < minXi) {
        minXi = rXi;
      }
    }

    if (minXi <= 1e-6 || minXi === Infinity) {
      break;
    }

    const xi = minXi;

    // Deduct reactants cleanly
    for (const [reactantFormula, coeff] of Object.entries(candidate.stoichiometry)) {
      if (coeff <= 0) continue;
      const item = workingContents.find(c => chemicalFormulaMatches(c.formula, reactantFormula));
      if (item) {
        item.moles = Math.max(0, item.moles - xi * coeff);
        const chem = findChemical(item.formula);
        item.mass_g = Math.max(0, item.moles * (chem.molarMass || 100));
        if (item.moles <= 1e-6) {
          item.moles = 0;
          item.mass_g = 0;
        }
      }
    }

    // Add produced products
    for (const [productFormula, prodInfo] of Object.entries(candidate.products)) {
      const addedMoles = xi * prodInfo.coeff;
      const chem = findChemical(productFormula);
      const existing = workingContents.find(c => chemicalFormulaMatches(c.formula, productFormula));
      if (existing) {
        existing.moles += addedMoles;
        existing.mass_g = existing.moles * (chem.molarMass || 100);
      } else {
        workingContents.push({
          formula: productFormula,
          moles: addedMoles,
          mass_g: addedMoles * (chem.molarMass || 100),
          concentration_M: prodInfo.state === 'aq' && volume_ml > 0 ? addedMoles / (volume_ml / 1000.0) : undefined
        });
      }
    }

    // Thermal rise from reaction enthalpy
    const solnMass_g = Math.max(10.0, volume_ml);
    const totalHeatCap = solnMass_g * 4.184 + 33.2; // J/K
    const heatReleased_J = -candidate.deltaH_kJ * 1000.0 * xi;
    const deltaT = heatReleased_J / totalHeatCap;
    currentTemp = Math.min(102.5, Math.max(25.0, currentTemp + deltaT));

    if (candidate.hasGas) {
      hasGasOccurred = true;
      gasColorFinal = candidate.gasColor || '#ffffff';
      gasFormulaFinal = candidate.gasFormula || 'gas';
    }
    if (candidate.isDangerous && candidate.deltaH_kJ < -300) {
      isExplosionOccurred = true;
    }

    reactionsOccurred.push({
      reactionId: candidate.id,
      equation: candidate.equation,
      summary: lang === 'en' ? candidate.summary_en : candidate.summary_vi,
      xi,
      deltaH_kJ: candidate.deltaH_kJ,
      match: candidate
    });
  }

  // 3. Finalize updated contents and concentrations
  const updatedContents = workingContents
    .filter(c => c.moles > 1e-6 || normalizeFormulaToken(c.formula) === 'h2o')
    .map(c => {
      const concentration_M = volume_ml > 0 ? (c.moles / (volume_ml / 1000.0)) : c.concentration_M;
      return {
        ...c,
        moles: Math.round(c.moles * 10000) / 10000,
        mass_g: Math.round(c.mass_g * 100) / 100,
        concentration_M: concentration_M ? Math.round(concentration_M * 100) / 100 : undefined
      };
    });

  const updatedSubstances = updatedContents
    .filter(c => c.moles > 1e-6 && normalizeFormulaToken(c.formula) !== 'h2o')
    .map(c => c.formula);

  if (updatedSubstances.length === 0 && updatedContents.some(c => normalizeFormulaToken(c.formula) === 'h2o')) {
    updatedSubstances.push('H2O');
  }

  // 4. Calculate accurate pH from remaining strong acids / bases
  let strongAcidH_moles = 0;
  let strongBaseOH_moles = 0;

  for (const item of updatedContents) {
    if (item.moles <= 1e-6) continue;
    const f = item.formula.toUpperCase();
    if (f === 'HCL' || f.includes('HNO3')) {
      strongAcidH_moles += item.moles;
    } else if (f.includes('H2SO4')) {
      strongAcidH_moles += item.moles * 2;
    } else if (f === 'NAOH' || f === 'KOH') {
      strongBaseOH_moles += item.moles;
    } else if (f.includes('CA(OH)2') || f.includes('BA(OH)2')) {
      strongBaseOH_moles += item.moles * 2;
    }
  }

  let finalPh = 7.0;
  const volL = Math.max(0.001, volume_ml / 1000.0);

  if (strongAcidH_moles > strongBaseOH_moles + 1e-5) {
    const netH = strongAcidH_moles - strongBaseOH_moles;
    const concH = netH / volL;
    finalPh = Math.max(0.1, Math.min(6.8, -Math.log10(concH)));
  } else if (strongBaseOH_moles > strongAcidH_moles + 1e-5) {
    const netOH = strongBaseOH_moles - strongAcidH_moles;
    const concOH = netOH / volL;
    const pOH = -Math.log10(concOH);
    finalPh = Math.min(14.0, Math.max(7.2, 14.0 - pOH));
  } else if (reactionsOccurred.length > 0) {
    const lastRx = reactionsOccurred[reactionsOccurred.length - 1].match;
    finalPh = typeof lastRx.resultingPh === 'function' ? lastRx.resultingPh(false, 1) : (lastRx.resultingPh ?? 7.0);
  }

  finalPh = Math.round(finalPh * 10) / 10;

  // 5. Check precipitate presence from insoluble products currently present
  const INSOLUBLE_FORMULAS = [
    'BaSO4', 'AgCl', 'PbI2', 'Cu(OH)2', 'Fe(OH)3', 'Fe(OH)2', 'CaCO3', 'Al(OH)3', 'Cu', 'S', 'CuO'
  ];

  let hasPrecipitate = false;
  let precipitateSubstance: string | undefined = undefined;
  let precipitateColor: string | undefined = undefined;
  let precipitateAmount_g = 0;

  for (const ins of INSOLUBLE_FORMULAS) {
    const found = updatedContents.find(c => chemicalFormulaMatches(c.formula, ins) && c.moles > 1e-6);
    if (found && found.mass_g > 0.005) {
      hasPrecipitate = true;
      precipitateSubstance = found.formula;
      precipitateAmount_g += found.mass_g;

      // Color lookup
      const chem = findChemical(found.formula);
      if (ins === 'BaSO4' || ins === 'AgCl' || ins === 'CaCO3' || ins === 'Al(OH)3') {
        precipitateColor = '#ffffff';
      } else if (ins === 'PbI2') {
        precipitateColor = '#facc15';
      } else if (ins === 'Cu(OH)2') {
        precipitateColor = '#38bdf8';
      } else if (ins === 'Fe(OH)3') {
        precipitateColor = '#78350f';
      } else if (ins === 'Fe(OH)2') {
        precipitateColor = '#15803d';
      } else if (ins === 'Cu') {
        precipitateColor = '#b45309';
      } else if (ins === 'S') {
        precipitateColor = '#fef08a';
      } else if (ins === 'CuO') {
        precipitateColor = '#18181b';
      } else {
        precipitateColor = chem.color || '#ffffff';
      }
    }
  }

  // 6. Liquid color
  const hasPhenol = initialSubstances.some(s => s.toLowerCase().includes('phenolphthalein'));
  let finalLiquidColor = '#f8fafc';

  if (hasPhenol) {
    finalLiquidColor = finalPh >= 8.2 ? '#ec4899' : '#f8fafc';
  } else if (updatedContents.some(c => c.formula.includes('[Cu(NH3)4]') && c.moles > 1e-5)) {
    finalLiquidColor = '#1d4ed8'; // Royal blue
  } else if (updatedContents.some(c => c.formula.includes('Fe(SCN)3') && c.moles > 1e-5)) {
    finalLiquidColor = '#881337'; // Blood red
  } else if (updatedContents.some(c => chemicalFormulaMatches(c.formula, 'CuSO4') && c.moles > 1e-5)) {
    finalLiquidColor = '#38bdf8'; // Blue
  } else if (updatedContents.some(c => chemicalFormulaMatches(c.formula, 'KMnO4') && c.moles > 1e-5)) {
    finalLiquidColor = '#7e22ce'; // Purple
  } else if (updatedContents.some(c => chemicalFormulaMatches(c.formula, 'FeCl3') && c.moles > 1e-5)) {
    finalLiquidColor = '#ca8a04'; // Amber
  } else if (updatedContents.some(c => chemicalFormulaMatches(c.formula, 'FeSO4') && c.moles > 1e-5)) {
    finalLiquidColor = '#bbf7d0'; // Pale green
  } else if (reactionsOccurred.length > 0) {
    const lastRx = reactionsOccurred[reactionsOccurred.length - 1].match;
    finalLiquidColor = lastRx.resultingLiquidColor || '#f8fafc';
  }

  // 7. Combined MixResult for UI display and history
  let combinedMixResult: MixResult | null = null;
  if (reactionsOccurred.length > 0) {
    const lastRx = reactionsOccurred[reactionsOccurred.length - 1].match;
    const combinedEquation = reactionsOccurred.map((r, i) => 
      reactionsOccurred.length > 1 ? `${i + 1}) ${r.equation}` : r.equation
    ).join(' | ');

    const combinedSummary = reactionsOccurred.map(r => r.summary).join(' ');

    combinedMixResult = {
      reaction_id: reactionsOccurred.map(r => r.reactionId).join('__'),
      summary: combinedSummary,
      equation: combinedEquation,
      ionic_equation: lastRx.ionic_equation,
      conditions: isHeated ? (lang === 'en' ? 'Under Bunsen Burner heating' : 'Có đun nóng dưới ngọn lửa') : undefined,
      reactants: initialSubstances,
      products: updatedSubstances,
      safety_notes: lang === 'en' ? (lastRx.safetyNotes_en || 'Standard laboratory PPE required.') : (lastRx.safetyNotes_vi || 'Cần tuân thủ quy tắc bảo hộ trong phòng thí nghiệm.'),
      observable_changes: lang === 'en' ? lastRx.observable_en : lastRx.observable_vi,
      new_vessel_state: {
        liquid_color: finalLiquidColor,
        liquid_level: Math.min(1.0, volume_ml / 250),
        temperature_c: Math.round(currentTemp * 10) / 10,
        has_precipitate: hasPrecipitate,
        precipitate_color: precipitateColor,
        precipitate_substance: precipitateSubstance,
        precipitate_amount_g: precipitateAmount_g > 0 ? Math.round(precipitateAmount_g * 100) / 100 : undefined,
        is_boiling: currentTemp >= 98 || reactionsOccurred.some(r => r.match.isBoiling),
        has_gas: hasGasOccurred,
        gas_color: gasColorFinal,
        is_explosion: isExplosionOccurred
      },
      effects: [
        ...(hasPrecipitate ? [{ type: 'PRECIPITATE' as const, duration: 3, color: precipitateColor }] : []),
        ...(hasGasOccurred ? [{ type: 'GAS' as const, duration: 4, color: gasColorFinal }] : []),
        ...(currentTemp >= 98 ? [{ type: 'BOIL' as const, duration: 5 }] : []),
        { type: 'COLOR_CHANGE' as const, duration: 2, color: finalLiquidColor }
      ],
      confidence: 1.0,
      is_dangerous: isExplosionOccurred || reactionsOccurred.some(r => r.match.isDangerous),
      warning_message: lastRx.isDangerous ? (lang === 'en' ? lastRx.safetyNotes_en : lastRx.safetyNotes_vi) : undefined
    };
  }

  return {
    reactionsOccurred,
    updatedContents,
    updatedSubstances,
    finalTemperature_c: Math.round(currentTemp * 10) / 10,
    finalPh,
    finalLiquidColor,
    hasPrecipitate,
    precipitateColor,
    precipitateSubstance,
    precipitateAmount_g: precipitateAmount_g > 0 ? Math.round(precipitateAmount_g * 100) / 100 : undefined,
    hasGas: hasGasOccurred,
    gasColor: gasColorFinal,
    gasFormula: gasFormulaFinal,
    isBoiling: currentTemp >= 98 || reactionsOccurred.some(r => r.match.isBoiling),
    isExplosion: isExplosionOccurred,
    combinedMixResult
  };
}

export function evaluateLocalChemistry(
  substances: string[], 
  currentVolume_ml: number, 
  temperature_c: number, 
  isHeated: boolean,
  lang: 'en' | 'vi' = 'vi',
  contents?: { formula: string; moles: number; mass_g: number }[]
): MixResult | null {
  if (!substances || substances.length === 0) return null;

  // Quantity-aware canonical key (P2.10)
  const volBucket = Math.round(currentVolume_ml / 10) * 10;
  const canonicalKey = `${getCanonicalReactionKey(substances, isHeated, temperature_c, lang)}_v${volBucket}`;
  const cached = chemistryCache.get(canonicalKey);
  if (cached) {
    return cached;
  }

  const multiStep = executeMultiStepReactions(
    contents || [],
    substances,
    currentVolume_ml,
    temperature_c,
    isHeated,
    lang
  );

  if (multiStep.reactionsOccurred.length > 0 && multiStep.combinedMixResult) {
    if (multiStep.reactionsOccurred.length === 1) {
      multiStep.combinedMixResult.reaction_id = multiStep.reactionsOccurred[0].reactionId;
    }
    chemistryCache.set(canonicalKey, multiStep.combinedMixResult);
    return multiStep.combinedMixResult;
  }

  return null;
}

// Load cached reactions on bootstrap
export function initReactionCache() {
  // chemistryCache automatically hydrates on initialization
}
