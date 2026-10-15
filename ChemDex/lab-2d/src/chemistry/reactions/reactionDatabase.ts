/**
 * Standard Verified Reaction Database for ChemDex 2D Laboratory
 * All equations are stoichiometrically balanced with documented reaction enthalpies,
 * product states, and visual phenomena indicators.
 */

import { ReactionDefinition } from '../../types/chemistry';

export const REACTION_DATABASE: ReactionDefinition[] = [
  // 1. HCl + NaOH -> NaCl + H2O (Acid-Base Neutralization)
  {
    id: 'rx_hcl_naoh_neutralization',
    name_en: 'Hydrochloric Acid and Sodium Hydroxide Neutralization',
    name_vi: 'Phản ứng trung hòa Axit clohiđric và Natri hiđroxit',
    equation: 'HCl + NaOH → NaCl + H₂O',
    ionic_equation: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    reactants: [
      { formula: 'HCl', coefficient: 1, state: 'aq' },
      { formula: 'NaOH', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'NaCl', coefficient: 1, state: 'aq' },
      { formula: 'H2O', coefficient: 1, state: 'l' },
    ],
    deltaH_kJ_mol: -57.1, // Classic enthalpy of neutralization
    visual: {
      colorChange: { resultingColorHex: '#f8fafc', indicatorDriven: true },
    },
    observable_en: 'The solution warms up distinctly. If phenolphthalein indicator is present, pink turns to colorless at the equivalence point.',
    observable_vi: 'Dung dịch tỏa nhiệt ấm lên rõ rệt. Nếu có phenolphtalein, màu hồng cánh sen biến mất chuyển thành không màu khi đạt điểm tương đương.',
  },

  // 2. H2SO4 + 2NaOH -> Na2SO4 + 2H2O (Diprotic Neutralization)
  {
    id: 'rx_h2so4_naoh_neutralization',
    name_en: 'Sulfuric Acid and Sodium Hydroxide Neutralization',
    name_vi: 'Phản ứng trung hòa Axit sunfuric và Natri hiđroxit',
    equation: 'H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O',
    ionic_equation: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    reactants: [
      { formula: 'H2SO4', coefficient: 1, state: 'aq' },
      { formula: 'NaOH', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'Na2SO4', coefficient: 1, state: 'aq' },
      { formula: 'H2O', coefficient: 2, state: 'l' },
    ],
    deltaH_kJ_mol: -114.2,
    visual: {
      colorChange: { resultingColorHex: '#f8fafc', indicatorDriven: true },
    },
    observable_en: 'Significant release of heat. Neutral sulfate solution formed.',
    observable_vi: 'Tỏa nhiệt rất mạnh. Tạo dung dịch muối natri sunfat trung tính.',
  },

  // 3. AgNO3 + NaCl -> AgCl(s) + NaNO3 (Silver Chloride Precipitation)
  {
    id: 'rx_agno3_nacl_precipitation',
    name_en: 'Silver Nitrate and Sodium Chloride Precipitation',
    name_vi: 'Phản ứng tạo kết tủa Bạc clorua',
    equation: 'AgNO₃ + NaCl → AgCl↓ + NaNO₃',
    ionic_equation: 'Ag⁺(aq) + Cl⁻(aq) → AgCl(s)↓',
    reactants: [
      { formula: 'AgNO3', coefficient: 1, state: 'aq' },
      { formula: 'NaCl', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'AgCl', coefficient: 1, state: 's' },
      { formula: 'NaNO3', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -65.7,
    equilibrium: { Ksp: 1.77e-10 },
    visual: {
      precipitate: {
        formula: 'AgCl',
        colorHex: '#ffffff',
        morphology: 'curdy',
      },
    },
    observable_en: 'Immediate dense white curdy precipitate of AgCl forms and settles at the bottom.',
    observable_vi: 'Ngay lập tức xuất hiện kết tủa trắng vón cục dạng váng sữa (AgCl), sau đó lắng xuống đáy cốc.',
  },

  // 4. CuSO4 + 2NaOH -> Cu(OH)2(s) + Na2SO4 (Copper Hydroxide Precipitation)
  {
    id: 'rx_cuso4_naoh_precipitation',
    name_en: 'Copper(II) Sulfate and Sodium Hydroxide Precipitation',
    name_vi: 'Phản ứng tạo kết tủa Đồng(II) hiđroxit',
    equation: 'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄',
    ionic_equation: 'Cu²⁺(aq) + 2OH⁻(aq) → Cu(OH)₂(s)↓',
    reactants: [
      { formula: 'CuSO4', coefficient: 1, state: 'aq' },
      { formula: 'NaOH', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'Cu(OH)2', coefficient: 1, state: 's' },
      { formula: 'Na2SO4', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -50.2,
    equilibrium: { Ksp: 2.2e-20 },
    visual: {
      precipitate: {
        formula: 'Cu(OH)2',
        colorHex: '#38bdf8', // Characteristic light cyan/blue
        morphology: 'gel',
      },
    },
    observable_en: 'Gelatinous bright blue precipitate of Cu(OH)2 forms immediately.',
    observable_vi: 'Tạo kết tủa dạng keo màu xanh lam sáng đặc trưng của Cu(OH)₂.',
  },

  // 5. NaHCO3 + HCl -> NaCl + CO2(g) + H2O (Bicarbonate Effervescence)
  {
    id: 'rx_nahco3_hcl_gas',
    name_en: 'Sodium Bicarbonate and Hydrochloric Acid Effervescence',
    name_vi: 'Phản ứng tạo khí Cacbonic từ Natri hiđrocacbonat và Axit',
    equation: 'NaHCO₃ + HCl → NaCl + CO₂↑ + H₂O',
    ionic_equation: 'HCO₃⁻(aq) + H⁺(aq) → CO₂(g)↑ + H₂O(l)',
    reactants: [
      { formula: 'NaHCO3', coefficient: 1, state: 'aq' },
      { formula: 'HCl', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'NaCl', coefficient: 1, state: 'aq' },
      { formula: 'CO2', coefficient: 1, state: 'g' },
      { formula: 'H2O', coefficient: 1, state: 'l' },
    ],
    deltaH_kJ_mol: -12.5,
    visual: {
      gas: {
        formula: 'CO2',
        colorHex: '#ffffff',
        effervescenceSpeed: 'vigorous',
      },
    },
    observable_en: 'Vigorous effervescence with countless colorless CO2 gas bubbles rising rapidly.',
    observable_vi: 'Sủi bọt khí mãnh liệt, vô số bọt khí CO₂ không màu thoát ra nhanh chóng.',
  },

  // 6. CaCO3 + 2HCl -> CaCl2 + CO2(g) + H2O (Limestone Acid Dissolution)
  {
    id: 'rx_caco3_hcl_gas',
    name_en: 'Calcium Carbonate and Hydrochloric Acid Reaction',
    name_vi: 'Phản ứng hòa tan Canxi cacbonat (Đá vôi) trong Axit clohiđric',
    equation: 'CaCO₃ + 2HCl → CaCl₂ + CO₂↑ + H₂O',
    ionic_equation: 'CaCO₃(s) + 2H⁺(aq) → Ca²⁺(aq) + CO₂(g)↑ + H₂O(l)',
    reactants: [
      { formula: 'CaCO3', coefficient: 1, state: 's' },
      { formula: 'HCl', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'CaCl2', coefficient: 1, state: 'aq' },
      { formula: 'CO2', coefficient: 1, state: 'g' },
      { formula: 'H2O', coefficient: 1, state: 'l' },
    ],
    deltaH_kJ_mol: -15.2,
    visual: {
      gas: {
        formula: 'CO2',
        effervescenceSpeed: 'vigorous',
      },
    },
    observable_en: 'Solid limestone dissolves while releasing continuous streams of CO2 gas bubbles.',
    observable_vi: 'Chất rắn đá vôi tan dần kèm theo hiện tượng sủi bọt khí CO₂ liên tục.',
  },

  // 7. BaCl2 + Na2SO4 -> BaSO4(s) + 2NaCl (Barium Sulfate Precipitation)
  {
    id: 'rx_bacl2_na2so4_precipitation',
    name_en: 'Barium Chloride and Sodium Sulfate Precipitation',
    name_vi: 'Phản ứng tạo kết tủa Bari sunfat',
    equation: 'BaCl₂ + Na₂SO₄ → BaSO₄↓ + 2NaCl',
    ionic_equation: 'Ba²⁺(aq) + SO₄²⁻(aq) → BaSO₄(s)↓',
    reactants: [
      { formula: 'BaCl2', coefficient: 1, state: 'aq' },
      { formula: 'Na2SO4', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'BaSO4', coefficient: 1, state: 's' },
      { formula: 'NaCl', coefficient: 2, state: 'aq' },
    ],
    deltaH_kJ_mol: -26.0,
    equilibrium: { Ksp: 1.1e-10 },
    visual: {
      precipitate: {
        formula: 'BaSO4',
        colorHex: '#ffffff',
        morphology: 'milky',
      },
    },
    observable_en: 'Fine milky white precipitate of BaSO4 appears, insoluble in acids.',
    observable_vi: 'Xuất hiện kết tủa trắng đục như sữa (BaSO₄), không tan trong axit.',
  },

  // 8. CaCl2 + Na2CO3 -> CaCO3(s) + 2NaCl (Calcium Carbonate Precipitation)
  {
    id: 'rx_cacl2_na2co3_precipitation',
    name_en: 'Calcium Chloride and Sodium Carbonate Precipitation',
    name_vi: 'Phản ứng tạo kết tủa Canxi cacbonat',
    equation: 'CaCl₂ + Na₂CO₃ → CaCO₃↓ + 2NaCl',
    ionic_equation: 'Ca²⁺(aq) + CO₃²⁻(aq) → CaCO₃(s)↓',
    reactants: [
      { formula: 'CaCl2', coefficient: 1, state: 'aq' },
      { formula: 'Na2CO3', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'CaCO3', coefficient: 1, state: 's' },
      { formula: 'NaCl', coefficient: 2, state: 'aq' },
    ],
    deltaH_kJ_mol: -12.0,
    equilibrium: { Ksp: 3.3e-9 },
    visual: {
      precipitate: {
        formula: 'CaCO3',
        colorHex: '#ffffff',
        morphology: 'powder',
      },
    },
    observable_en: 'White precipitate of CaCO3 forms rapidly.',
    observable_vi: 'Xuất hiện kết tủa màu trắng của canxi cacbonat.',
  },

  // 9. FeCl3 + 3NaOH -> Fe(OH)3(s) + 3NaCl (Iron(III) Hydroxide Precipitation)
  {
    id: 'rx_fecl3_naoh_precipitation',
    name_en: 'Iron(III) Chloride and Sodium Hydroxide Precipitation',
    name_vi: 'Phản ứng tạo kết tủa Sắt(III) hiđroxit',
    equation: 'FeCl₃ + 3NaOH → Fe(OH)₃↓ + 3NaCl',
    ionic_equation: 'Fe³⁺(aq) + 3OH⁻(aq) → Fe(OH)₃(s)↓',
    reactants: [
      { formula: 'FeCl3', coefficient: 1, state: 'aq' },
      { formula: 'NaOH', coefficient: 3, state: 'aq' },
    ],
    products: [
      { formula: 'Fe(OH)3', coefficient: 1, state: 's' },
      { formula: 'NaCl', coefficient: 3, state: 'aq' },
    ],
    deltaH_kJ_mol: -85.0,
    visual: {
      precipitate: {
        formula: 'Fe(OH)3',
        colorHex: '#78350f', // Reddish-brown
        morphology: 'floc',
      },
    },
    observable_en: 'Distinctive reddish-brown flocculent precipitate of Fe(OH)3 forms instantly.',
    observable_vi: 'Tạo kết tủa màu nâu đỏ đặc trưng dạng bông của Fe(OH)₃.',
  },

  // 10. Zn + 2HCl -> ZnCl2 + H2(g) (Active Metal Acid Displacement)
  {
    id: 'rx_zn_hcl_gas',
    name_en: 'Zinc Metal and Hydrochloric Acid Displacement',
    name_vi: 'Phản ứng kim loại Kẽm tác dụng với Axit clohiđric giải phóng Hiđro',
    equation: 'Zn + 2HCl → ZnCl₂ + H₂↑',
    ionic_equation: 'Zn(s) + 2H⁺(aq) → Zn²⁺(aq) + H₂(g)↑',
    reactants: [
      { formula: 'Zn', coefficient: 1, state: 's' },
      { formula: 'HCl', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'ZnCl2', coefficient: 1, state: 'aq' },
      { formula: 'H2', coefficient: 1, state: 'g' },
    ],
    deltaH_kJ_mol: -152.4,
    visual: {
      gas: {
        formula: 'H2',
        effervescenceSpeed: 'instant',
      },
    },
    observable_en: 'Zinc pieces slowly dissolve with steady bubbling of hydrogen gas (H2). Reaction is exothermic.',
    observable_vi: 'Hạt kẽm tan dần, có bọt khí hiđro (H₂) không màu thoát ra liên tục trên bề mặt hạt kẽm. Bình ấm lên.',
  },

  // 11. Cu(OH)2 -> CuO + H2O (Thermal Decomposition of Insoluble Hydroxide)
  {
    id: 'rx_cuoh2_thermal_decomposition',
    name_en: 'Thermal Decomposition of Copper(II) Hydroxide',
    name_vi: 'Phản ứng nhiệt phân Đồng(II) hiđroxit',
    equation: 'Cu(OH)₂ → CuO↓ + H₂O',
    ionic_equation: 'Cu(OH)₂(s) → CuO(s)↓ + H₂O(l)',
    reactants: [
      { formula: 'Cu(OH)2', coefficient: 1, state: 's' },
    ],
    products: [
      { formula: 'CuO', coefficient: 1, state: 's' },
      { formula: 'H2O', coefficient: 1, state: 'l' },
    ],
    requiresHeating: true,
    minTemp_c: 65.0,
    deltaH_kJ_mol: 43.0, // Endothermic decomposition
    visual: {
      precipitate: {
        formula: 'CuO',
        colorHex: '#18181b', // Black precipitate
        morphology: 'powder',
      },
    },
    observable_en: 'Upon heating above 65°C, the blue Cu(OH)2 precipitate turns into a dense black powder of CuO.',
    observable_vi: 'Khi đun nóng trên 65°C, kết tủa Cu(OH)₂ màu xanh lam nhanh chóng chuyển thành bột CuO màu đen lắng xuống.',
  },
];
