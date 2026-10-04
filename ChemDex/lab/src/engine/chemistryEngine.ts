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
  return f.replace(/\s*\([a-z]+\)/gi, '').trim().toLowerCase();
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

export function evaluateLocalChemistry(
  substances: string[], 
  currentVolume_ml: number, 
  temperature_c: number, 
  isHeated: boolean,
  lang: 'en' | 'vi' = 'vi'
): MixResult | null {
  if (!substances || substances.length === 0) return null;

  const canonicalKey = getCanonicalReactionKey(substances, isHeated, temperature_c, lang);
  const cached = chemistryCache.get(canonicalKey);
  if (cached) {
    return cached;
  }

  // Find matching deterministic reaction
  const match = DETERMINISTIC_REACTIONS.find(r => {
    // Check reactants
    if (!matchesReactants(substances, r.reactants)) return false;
    // Check heating requirement
    if (r.requiresHeating) {
      if (!isHeated && temperature_c < (r.minTemp_c || 50)) return false;
    }
    return true;
  });

  if (!match) return null;

  // Compute indicator effect: Phenolphthalein
  const hasPhenol = substances.some(s => s.toLowerCase().includes('phenolphthalein'));
  let liquidColor = match.resultingLiquidColor || '#f8fafc';
  const ph = typeof match.resultingPh === 'function' ? match.resultingPh(true, 1) : (match.resultingPh ?? 7.0);

  if (hasPhenol) {
    if (ph >= 8.2) {
      liquidColor = '#ec4899'; // Bright vivid magenta/fuchsia pink
    } else {
      liquidColor = '#f8fafc'; // Colorless in neutral/acid
    }
  }

  // Compute temperature change: deltaT
  const deltaT = Math.abs(match.deltaH_kJ) / 10;
  const newTemp = Math.min(100, Math.max(25, temperature_c + (match.deltaH_kJ < 0 ? deltaT : -deltaT)));

  const result: MixResult = {
    reaction_id: match.id,
    summary: lang === 'en' ? match.summary_en : match.summary_vi,
    equation: match.equation,
    ionic_equation: match.ionic_equation,
    conditions: isHeated ? (lang === 'en' ? 'Under Bunsen Burner heating' : 'Có đun nóng dưới ngọn lửa') : undefined,
    reactants: match.reactants,
    products: Object.keys(match.products),
    safety_notes: lang === 'en' ? (match.safetyNotes_en || 'Standard laboratory PPE required.') : (match.safetyNotes_vi || 'Cần tuân thủ quy tắc bảo hộ trong phòng thí nghiệm.'),
    observable_changes: lang === 'en' ? match.observable_en : match.observable_vi,
    new_vessel_state: {
      liquid_color: liquidColor,
      liquid_level: Math.min(1.0, currentVolume_ml / 100),
      has_precipitate: match.hasPrecipitate || false,
      precipitate_color: match.precipitateColor,
      is_boiling: match.isBoiling || newTemp >= 95,
      has_gas: match.hasGas || false,
      gas_color: match.gasColor,
      is_explosion: match.id.includes('explosion') || (match.isDangerous && match.deltaH_kJ < -300)
    },
    effects: [
      ...(match.hasPrecipitate ? [{ type: 'PRECIPITATE' as const, duration: 3, color: match.precipitateColor }] : []),
      ...(match.hasGas ? [{ type: 'GAS' as const, duration: 4, color: match.gasColor }] : []),
      ...(match.isBoiling ? [{ type: 'BOIL' as const, duration: 5 }] : []),
      { type: 'COLOR_CHANGE' as const, duration: 2, color: liquidColor }
    ],
    confidence: 1.0,
    is_dangerous: match.isDangerous || false,
    warning_message: match.isDangerous ? (lang === 'en' ? match.safetyNotes_en : match.safetyNotes_vi) : undefined
  };

  // Cache in tiered memory + localStorage wrapper
  chemistryCache.set(canonicalKey, result);

  return result;
}

// Load cached reactions on bootstrap
export function initReactionCache() {
  // chemistryCache automatically hydrates on initialization
}
