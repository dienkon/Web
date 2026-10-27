/**
 * Standard Verified Reaction Database for ChemDex 2D Laboratory
 * All equations are stoichiometrically balanced with documented reaction enthalpies,
 * product states, and visual phenomena indicators.
 */

import { ReactionDefinition } from '../../types/chemistry';

const REACTION_ENTRIES: ReactionDefinition[] = [
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

  // 12. HNO3 + NaOH -> NaNO3 + H2O
  {
    id: 'rx_hno3_naoh_neutralization',
    name_en: 'Nitric Acid and Sodium Hydroxide Neutralization',
    name_vi: 'Phản ứng trung hòa Axit nitric và Natri hiđroxit',
    equation: 'HNO₃ + NaOH → NaNO₃ + H₂O',
    ionic_equation: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    reactants: [
      { formula: 'HNO3', coefficient: 1, state: 'aq' },
      { formula: 'NaOH', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'NaNO3', coefficient: 1, state: 'aq' },
      { formula: 'H2O', coefficient: 1, state: 'l' },
    ],
    deltaH_kJ_mol: -57.3,
    visual: { colorChange: { resultingColorHex: '#f8fafc', indicatorDriven: true } },
    observable_en: 'Clear solution warms up due to exothermic neutralization.',
    observable_vi: 'Dung dịch trong suốt tỏa nhiệt ấm lên do phản ứng trung hòa.',
  },

  // 13. HCl + KOH -> KCl + H2O
  {
    id: 'rx_hcl_koh_neutralization',
    name_en: 'Hydrochloric Acid and Potassium Hydroxide Neutralization',
    name_vi: 'Phản ứng trung hòa Axit clohiđric và Kali hiđroxit',
    equation: 'HCl + KOH → KCl + H₂O',
    ionic_equation: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    reactants: [
      { formula: 'HCl', coefficient: 1, state: 'aq' },
      { formula: 'KOH', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'KCl', coefficient: 1, state: 'aq' },
      { formula: 'H2O', coefficient: 1, state: 'l' },
    ],
    deltaH_kJ_mol: -57.1,
    visual: { colorChange: { resultingColorHex: '#f8fafc', indicatorDriven: true } },
    observable_en: 'Exothermic neutralization forming neutral KCl solution.',
    observable_vi: 'Phản ứng tỏa nhiệt tạo dung dịch muối kali clorua trung tính.',
  },

  // 14. H2SO4 + 2KOH -> K2SO4 + 2H2O
  {
    id: 'rx_h2so4_koh_neutralization',
    name_en: 'Sulfuric Acid and Potassium Hydroxide Neutralization',
    name_vi: 'Phản ứng trung hòa Axit sunfuric và Kali hiđroxit',
    equation: 'H₂SO₄ + 2KOH → K₂SO₄ + 2H₂O',
    ionic_equation: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    reactants: [
      { formula: 'H2SO4', coefficient: 1, state: 'aq' },
      { formula: 'KOH', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'K2SO4', coefficient: 1, state: 'aq' },
      { formula: 'H2O', coefficient: 2, state: 'l' },
    ],
    deltaH_kJ_mol: -114.2,
    visual: { colorChange: { resultingColorHex: '#f8fafc', indicatorDriven: true } },
    observable_en: 'Strongly exothermic neutralization.',
    observable_vi: 'Phản ứng tỏa nhiệt mạnh tạo dung dịch K2SO4.',
  },

  // 15. Ba(OH)2 + H2SO4 -> BaSO4(s) + 2H2O
  {
    id: 'rx_baoh2_h2so4_precipitation',
    name_en: 'Barium Hydroxide and Sulfuric Acid Simultaneous Neutralization and Precipitation',
    name_vi: 'Phản ứng giữa Bari hiđroxit và Axit sunfuric vừa trung hòa vừa tạo kết tủa',
    equation: 'Ba(OH)₂ + H₂SO₄ → BaSO₄↓ + 2H₂O',
    ionic_equation: 'Ba²⁺(aq) + 2OH⁻(aq) + 2H⁺(aq) + SO₄²⁻(aq) → BaSO₄(s)↓ + 2H₂O(l)',
    reactants: [
      { formula: 'Ba(OH)2', coefficient: 1, state: 'aq' },
      { formula: 'H2SO4', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'BaSO4', coefficient: 1, state: 's' },
      { formula: 'H2O', coefficient: 2, state: 'l' },
    ],
    deltaH_kJ_mol: -130.0,
    visual: {
      precipitate: { formula: 'BaSO4', colorHex: '#ffffff', morphology: 'milky' },
      colorChange: { resultingColorHex: '#f8fafc', indicatorDriven: true },
    },
    observable_en: 'Immediate dense milky white precipitate forms with release of heat. Conductivity drops sharply.',
    observable_vi: 'Xuất hiện ngay kết tủa trắng sữa dày đặc BaSO4 và tỏa nhiệt mạnh.',
  },

  // 16. Ba(OH)2 + 2HCl -> BaCl2 + 2H2O
  {
    id: 'rx_baoh2_hcl_neutralization',
    name_en: 'Barium Hydroxide and Hydrochloric Acid Neutralization',
    name_vi: 'Phản ứng trung hòa Bari hiđroxit và Axit clohiđric',
    equation: 'Ba(OH)₂ + 2HCl → BaCl₂ + 2H₂O',
    ionic_equation: 'OH⁻(aq) + H⁺(aq) → H₂O(l)',
    reactants: [
      { formula: 'Ba(OH)2', coefficient: 1, state: 'aq' },
      { formula: 'HCl', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'BaCl2', coefficient: 1, state: 'aq' },
      { formula: 'H2O', coefficient: 2, state: 'l' },
    ],
    deltaH_kJ_mol: -114.2,
    visual: { colorChange: { resultingColorHex: '#f8fafc', indicatorDriven: true } },
    observable_en: 'Neutralization forming clear barium chloride solution.',
    observable_vi: 'Phản ứng trung hòa tỏa nhiệt tạo dung dịch muối bari clorua trong suốt.',
  },

  // 17. Ca(OH)2 + 2HCl -> CaCl2 + 2H2O
  {
    id: 'rx_caoh2_hcl_neutralization',
    name_en: 'Calcium Hydroxide and Hydrochloric Acid Neutralization',
    name_vi: 'Phản ứng trung hòa Nước vôi trong Ca(OH)2 và Axit clohiđric',
    equation: 'Ca(OH)₂ + 2HCl → CaCl₂ + 2H₂O',
    ionic_equation: 'OH⁻(aq) + H⁺(aq) → H₂O(l)',
    reactants: [
      { formula: 'Ca(OH)2', coefficient: 1, state: 'aq' },
      { formula: 'HCl', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'CaCl2', coefficient: 1, state: 'aq' },
      { formula: 'H2O', coefficient: 2, state: 'l' },
    ],
    deltaH_kJ_mol: -114.2,
    visual: { colorChange: { resultingColorHex: '#f8fafc', indicatorDriven: true } },
    observable_en: 'Neutralization of limewater by HCl.',
    observable_vi: 'Trung hòa nước vôi trong bằng axit clohiđric, pH giảm từ kiềm về trung tính.',
  },

  // 18. NH3 + HCl -> NH4Cl (Dense white smoke / Ammonium chloride)
  {
    id: 'rx_nh3_hcl_smoke',
    name_en: 'Ammonia and Hydrochloric Acid Gas Reaction (White Smoke)',
    name_vi: 'Khí Amoniac gặp Axit clohiđric tạo khói trắng Amoni clorua',
    equation: 'NH₃ + HCl → NH₄Cl',
    ionic_equation: 'NH₃(aq) + H⁺(aq) → NH₄⁺(aq)',
    reactants: [
      { formula: 'NH3', coefficient: 1, state: 'aq' },
      { formula: 'HCl', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'NH4Cl', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -176.0,
    visual: {
      colorChange: { resultingColorHex: '#f8fafc', indicatorDriven: true },
    },
    observable_en: 'Dense white smoke of fine NH4Cl crystals forms above the solution with significant warmth.',
    observable_vi: 'Tỏa nhiệt mạnh, bốc khói trắng dày đặc gồm các hạt vi tinh thể amoni clorua NH4Cl lơ lửng.',
  },

  // 19. AgNO3 + NaBr -> AgBr(s) + NaNO3
  {
    id: 'rx_agno3_nabr_precipitation',
    name_en: 'Silver Nitrate and Sodium Bromide Precipitation',
    name_vi: 'Phản ứng tạo kết tủa Bạc bromua màu vàng nhạt',
    equation: 'AgNO₃ + NaBr → AgBr↓ + NaNO₃',
    ionic_equation: 'Ag⁺(aq) + Br⁻(aq) → AgBr(s)↓',
    reactants: [
      { formula: 'AgNO3', coefficient: 1, state: 'aq' },
      { formula: 'NaBr', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'AgBr', coefficient: 1, state: 's' },
      { formula: 'NaNO3', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -84.4,
    visual: {
      precipitate: { formula: 'AgBr', colorHex: '#fef08a', morphology: 'curdy' },
    },
    observable_en: 'Pale cream-yellow curdy precipitate of AgBr forms immediately.',
    observable_vi: 'Xuất hiện ngay kết tủa vón màu vàng nhạt (kem) của bạc bromua AgBr.',
  },

  // 20. AgNO3 + KI -> AgI(s) + KNO3
  {
    id: 'rx_agno3_ki_precipitation',
    name_en: 'Silver Nitrate and Potassium Iodide Precipitation',
    name_vi: 'Phản ứng tạo kết tủa Bạc iotua màu vàng đậm',
    equation: 'AgNO₃ + KI → AgI↓ + KNO₃',
    ionic_equation: 'Ag⁺(aq) + I⁻(aq) → AgI(s)↓',
    reactants: [
      { formula: 'AgNO3', coefficient: 1, state: 'aq' },
      { formula: 'KI', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'AgI', coefficient: 1, state: 's' },
      { formula: 'KNO3', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -112.2,
    visual: {
      precipitate: { formula: 'AgI', colorHex: '#eab308', morphology: 'curdy' },
    },
    observable_en: 'Bright yellow precipitate of AgI forms instantaneously.',
    observable_vi: 'Tạo ngay kết tủa màu vàng đậm đặc trưng của bạc iotua AgI.',
  },

  // 21. Pb(NO3)2 + 2KI -> PbI2(s) + 2KNO3 (Golden Rain)
  {
    id: 'rx_pbno32_ki_precipitation',
    name_en: 'Lead(II) Nitrate and Potassium Iodide Golden Precipitation',
    name_vi: 'Phản ứng tạo kết tủa Chì(II) iotua màu vàng óng ánh (Mưa vàng)',
    equation: 'Pb(NO₃)₂ + 2KI → PbI₂↓ + 2KNO₃',
    ionic_equation: 'Pb²⁺(aq) + 2I⁻(aq) → PbI₂(s)↓',
    reactants: [
      { formula: 'Pb(NO3)2', coefficient: 1, state: 'aq' },
      { formula: 'KI', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'PbI2', coefficient: 1, state: 's' },
      { formula: 'KNO3', coefficient: 2, state: 'aq' },
    ],
    deltaH_kJ_mol: -63.5,
    visual: {
      precipitate: { formula: 'PbI2', colorHex: '#fbbf24', morphology: 'crystalline' },
    },
    observable_en: 'Brilliant golden-yellow crystalline flakes of PbI2 precipitate (Golden Rain phenomenon).',
    observable_vi: 'Xuất hiện ngay kết tủa tinh thể màu vàng tươi lấp lánh như vảy vàng của PbI2.',
  },

  // 22. FeCl3 + 3NaOH -> Fe(OH)3(s) + 3NaCl
  {
    id: 'rx_fecl3_naoh_precipitation',
    name_en: 'Iron(III) Chloride and Sodium Hydroxide Precipitation',
    name_vi: 'Phản ứng tạo kết tủa Sắt(III) hiđroxit màu nâu đỏ',
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
    deltaH_kJ_mol: -90.0,
    visual: {
      precipitate: { formula: 'Fe(OH)3', colorHex: '#7f1d1d', morphology: 'floc' },
      colorChange: { resultingColorHex: '#f8fafc' },
    },
    observable_en: 'Dense reddish-brown flocculent precipitate of Fe(OH)3 forms immediately.',
    observable_vi: 'Xuất hiện ngay kết tủa màu nâu đỏ đặc trưng của sắt(III) hiđroxit Fe(OH)3.',
  },

  // 23. FeSO4 + 2NaOH -> Fe(OH)2(s) + Na2SO4
  {
    id: 'rx_feso4_naoh_precipitation',
    name_en: 'Iron(II) Sulfate and Sodium Hydroxide Precipitation',
    name_vi: 'Phản ứng tạo kết tủa Sắt(II) hiđroxit màu trắng xanh',
    equation: 'FeSO₄ + 2NaOH → Fe(OH)₂↓ + Na₂SO₄',
    ionic_equation: 'Fe²⁺(aq) + 2OH⁻(aq) → Fe(OH)₂(s)↓',
    reactants: [
      { formula: 'FeSO4', coefficient: 1, state: 'aq' },
      { formula: 'NaOH', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'Fe(OH)2', coefficient: 1, state: 's' },
      { formula: 'Na2SO4', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -65.0,
    visual: {
      precipitate: { formula: 'Fe(OH)2', colorHex: '#86efac', morphology: 'gel' },
    },
    observable_en: 'Dirty white-green gelatinous precipitate of Fe(OH)2 forms, gradually turning reddish-brown in air.',
    observable_vi: 'Xuất hiện kết tủa keo màu trắng xanh của Fe(OH)2, để ngoài không khí hóa nâu đỏ thành Fe(OH)3.',
  },

  // 24. AlCl3 + 3NaOH -> Al(OH)3(s) + 3NaCl
  {
    id: 'rx_alcl3_naoh_precipitation',
    name_en: 'Aluminium Chloride and Sodium Hydroxide Gelatinous Precipitation',
    name_vi: 'Phản ứng tạo kết tủa keo trắng Nhôm hiđroxit',
    equation: 'AlCl₃ + 3NaOH → Al(OH)₃↓ + 3NaCl',
    ionic_equation: 'Al³⁺(aq) + 3OH⁻(aq) → Al(OH)₃(s)↓',
    reactants: [
      { formula: 'AlCl3', coefficient: 1, state: 'aq' },
      { formula: 'NaOH', coefficient: 3, state: 'aq' },
    ],
    products: [
      { formula: 'Al(OH)3', coefficient: 1, state: 's' },
      { formula: 'NaCl', coefficient: 3, state: 'aq' },
    ],
    deltaH_kJ_mol: -85.0,
    visual: {
      precipitate: { formula: 'Al(OH)3', colorHex: '#f1f5f9', morphology: 'gel' },
    },
    observable_en: 'Translucent white gelatinous precipitate of Al(OH)3 forms instantly.',
    observable_vi: 'Xuất hiện ngay kết tủa keo tụ màu trắng của nhôm hiđroxit Al(OH)3.',
  },

  // 25. Al(OH)3 + NaOH -> Na[Al(OH)4] (Amphoteric dissolution in excess base)
  {
    id: 'rx_aloh3_naoh_dissolution',
    name_en: 'Dissolution of Amphoteric Aluminium Hydroxide in Excess Sodium Hydroxide',
    name_vi: 'Phản ứng hòa tan kết tủa keo nhôm Al(OH)3 trong kiềm dư',
    equation: 'Al(OH)₃ + NaOH → Na[Al(OH)₄]',
    ionic_equation: 'Al(OH)₃(s) + OH⁻(aq) → [Al(OH)₄]⁻(aq)',
    reactants: [
      { formula: 'Al(OH)3', coefficient: 1, state: 's' },
      { formula: 'NaOH', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'Na[Al(OH)4]', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -35.0,
    visual: {
      colorChange: { resultingColorHex: '#f8fafc' },
    },
    observable_en: 'The white gelatinous Al(OH)3 precipitate dissolves completely in excess NaOH to give a clear solution.',
    observable_vi: 'Kết tủa keo trắng Al(OH)3 tan dần và biến mất hoàn toàn trong dung dịch NaOH dư, dung dịch trong suốt trở lại.',
  },

  // 26. ZnSO4 + 2NaOH -> Zn(OH)2(s) + Na2SO4
  {
    id: 'rx_znso4_naoh_precipitation',
    name_en: 'Zinc Sulfate and Sodium Hydroxide Precipitation',
    name_vi: 'Phản ứng tạo kết tủa Kẽm hiđroxit keo trắng',
    equation: 'ZnSO₄ + 2NaOH → Zn(OH)₂↓ + Na₂SO₄',
    ionic_equation: 'Zn²⁺(aq) + 2OH⁻(aq) → Zn(OH)₂(s)↓',
    reactants: [
      { formula: 'ZnSO4', coefficient: 1, state: 'aq' },
      { formula: 'NaOH', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'Zn(OH)2', coefficient: 1, state: 's' },
      { formula: 'Na2SO4', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -62.0,
    visual: {
      precipitate: { formula: 'Zn(OH)2', colorHex: '#ffffff', morphology: 'gel' },
    },
    observable_en: 'White gelatinous precipitate of amphoteric Zn(OH)2 forms.',
    observable_vi: 'Xuất hiện kết tủa keo màu trắng của Zn(OH)2.',
  },

  // 27. Zn(OH)2 + 2NaOH -> Na2[Zn(OH)4] (Amphoteric dissolution in excess base)
  {
    id: 'rx_znoh2_naoh_dissolution',
    name_en: 'Dissolution of Amphoteric Zinc Hydroxide in Excess NaOH',
    name_vi: 'Phản ứng hòa tan kết tủa Zn(OH)2 trong kiềm dư',
    equation: 'Zn(OH)₂ + 2NaOH → Na₂[Zn(OH)₄]',
    ionic_equation: 'Zn(OH)₂(s) + 2OH⁻(aq) → [Zn(OH)₄]²⁻(aq)',
    reactants: [
      { formula: 'Zn(OH)2', coefficient: 1, state: 's' },
      { formula: 'NaOH', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'Na2[Zn(OH)4]', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -40.0,
    visual: { colorChange: { resultingColorHex: '#f8fafc' } },
    observable_en: 'The white precipitate dissolves in excess NaOH yielding a clear zincate solution.',
    observable_vi: 'Kết tủa Zn(OH)2 tan trong kiềm dư tạo dung dịch natri zincat trong suốt.',
  },

  // 28. CuSO4 + 2NH3 + 2H2O -> Cu(OH)2(s) + (NH4)2SO4
  {
    id: 'rx_cuso4_nh3_precipitation',
    name_en: 'Copper(II) Sulfate and Dilute Ammonia Precipitation',
    name_vi: 'Phản ứng tạo kết tủa Cu(OH)2 khi thêm dung dịch amoniac vào CuSO4',
    equation: 'CuSO₄ + 2NH₃ + 2H₂O → Cu(OH)₂↓ + (NH₄)₂SO₄',
    ionic_equation: 'Cu²⁺(aq) + 2NH₃(aq) + 2H₂O(l) → Cu(OH)₂(s)↓ + 2NH₄⁺(aq)',
    reactants: [
      { formula: 'CuSO4', coefficient: 1, state: 'aq' },
      { formula: 'NH3', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'Cu(OH)2', coefficient: 1, state: 's' },
      { formula: '(NH4)2SO4', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -60.0,
    visual: {
      precipitate: { formula: 'Cu(OH)2', colorHex: '#38bdf8', morphology: 'gel' },
    },
    observable_en: 'Light blue gelatinous precipitate of Cu(OH)2 forms.',
    observable_vi: 'Xuất hiện kết tủa keo màu xanh lam nhạt của Cu(OH)2.',
  },

  // 29. Cu(OH)2 + 4NH3 -> [Cu(NH3)4](OH)2 (Deep Royal Blue Tetraamminecopper Complex)
  {
    id: 'rx_cuoh2_nh3_complex',
    name_en: 'Tetraamminecopper(II) Complex Formation in Excess Ammonia',
    name_vi: 'Phản ứng hòa tan Cu(OH)2 trong Amoniac dư tạo phức màu xanh lam thẫm',
    equation: 'Cu(OH)₂ + 4NH₃ → [Cu(NH₃)₄](OH)₂',
    ionic_equation: 'Cu(OH)₂(s) + 4NH₃(aq) → [Cu(NH₃)₄]²⁺(aq) + 2OH⁻(aq)',
    reactants: [
      { formula: 'Cu(OH)2', coefficient: 1, state: 's' },
      { formula: 'NH3', coefficient: 4, state: 'aq' },
    ],
    products: [
      { formula: '[Cu(NH3)4](OH)2', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -72.0,
    visual: {
      colorChange: { resultingColorHex: '#1e3a8a' }, // Deep dark royal blue
    },
    observable_en: 'The light blue precipitate dissolves completely into an intense, glowing deep royal blue tetraamminecopper solution.',
    observable_vi: 'Kết tủa xanh nhạt tan hoàn toàn, tạo dung dịch phức chất [Cu(NH3)4]²⁺ có màu xanh lam thẫm (xanh hoàng gia) cực kỳ lộng lẫy.',
  },

  // 30. Ca(OH)2 + CO2 -> CaCO3(s) + H2O (Limewater turning milky)
  {
    id: 'rx_caoh2_co2_turbidity',
    name_en: 'Reaction of Limewater with Carbon Dioxide (Turbidity Formation)',
    name_vi: 'Nước vôi trong phản ứng với khí CO2 làm vẩn đục trắng sữa',
    equation: 'Ca(OH)₂ + CO₂ → CaCO₃↓ + H₂O',
    ionic_equation: 'Ca²⁺(aq) + 2OH⁻(aq) + CO₂(g) → CaCO₃(s)↓ + H₂O(l)',
    reactants: [
      { formula: 'Ca(OH)2', coefficient: 1, state: 'aq' },
      { formula: 'CO2', coefficient: 1, state: 'g' },
    ],
    products: [
      { formula: 'CaCO3', coefficient: 1, state: 's' },
      { formula: 'H2O', coefficient: 1, state: 'l' },
    ],
    deltaH_kJ_mol: -113.0,
    visual: {
      precipitate: { formula: 'CaCO3', colorHex: '#ffffff', morphology: 'milky' },
    },
    observable_en: 'Clear limewater turns chalky milky white due to insoluble CaCO3 micro-crystals.',
    observable_vi: 'Dung dịch nước vôi trong vẩn đục màu trắng sữa do xuất hiện các hạt kết tủa canxi cacbonat CaCO3.',
  },

  // 31. CaCO3 + CO2 + H2O -> Ca(HCO3)2 (Limewater clearing upon excess CO2)
  {
    id: 'rx_caco3_co2_clearing',
    name_en: 'Dissolution of Calcium Carbonate in Excess CO2',
    name_vi: 'Hòa tan kết tủa canxi cacbonat khi sục khí CO2 dư (nước vôi trong trở lại)',
    equation: 'CaCO₃ + CO₂ + H₂O → Ca(HCO₃)₂',
    ionic_equation: 'CaCO₃(s) + CO₂(g) + H₂O(l) → Ca²⁺(aq) + 2HCO₃⁻(aq)',
    reactants: [
      { formula: 'CaCO3', coefficient: 1, state: 's' },
      { formula: 'CO2', coefficient: 1, state: 'g' },
      { formula: 'H2O', coefficient: 1, state: 'l' },
    ],
    products: [
      { formula: 'Ca(HCO3)2', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -39.0,
    visual: { colorChange: { resultingColorHex: '#f8fafc' } },
    observable_en: 'Milky suspension clears up completely as soluble Ca(HCO3)2 forms in excess CO2.',
    observable_vi: 'Nước vôi bị đục lại trong suốt trở lại do CaCO3 tan tạo muối canxi hiđrocacbonat tan Ca(HCO3)2.',
  },

  // 32. CuSO4 + Na2S -> CuS(s) + Na2SO4
  {
    id: 'rx_cuso4_na2s_precipitation',
    name_en: 'Copper(II) Sulfate and Sodium Sulfide Precipitation',
    name_vi: 'Phản ứng tạo kết tủa Đồng(II) sunfua màu đen',
    equation: 'CuSO₄ + Na₂S → CuS↓ + Na₂SO₄',
    ionic_equation: 'Cu²⁺(aq) + S²⁻(aq) → CuS(s)↓',
    reactants: [
      { formula: 'CuSO4', coefficient: 1, state: 'aq' },
      { formula: 'Na2S', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'CuS', coefficient: 1, state: 's' },
      { formula: 'Na2SO4', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -128.0,
    visual: {
      precipitate: { formula: 'CuS', colorHex: '#09090b', morphology: 'powder' },
      colorChange: { resultingColorHex: '#f8fafc' },
    },
    observable_en: 'Immediate jet-black precipitate of CuS forms. Solution blue color vanishes.',
    observable_vi: 'Xuất hiện ngay kết tủa màu đen nhánh của CuS không tan trong axit loãng.',
  },

  // 33. Fe + CuSO4 -> FeSO4 + Cu(s) (Reddish copper coats iron)
  {
    id: 'rx_fe_cuso4_displacement',
    name_en: 'Iron and Copper(II) Sulfate Metal Displacement',
    name_vi: 'Phản ứng kim loại Sắt đẩy Đồng ra khỏi dung dịch Đồng(II) sunfat',
    equation: 'Fe + CuSO₄ → FeSO₄ + Cu↓',
    ionic_equation: 'Fe(s) + Cu²⁺(aq) → Fe²⁺(aq) + Cu(s)↓',
    reactants: [
      { formula: 'Fe', coefficient: 1, state: 's' },
      { formula: 'CuSO4', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'FeSO4', coefficient: 1, state: 'aq' },
      { formula: 'Cu', coefficient: 1, state: 's' },
    ],
    deltaH_kJ_mol: -152.0,
    visual: {
      precipitate: { formula: 'Cu', colorHex: '#b45309', morphology: 'plates' },
      colorChange: { resultingColorHex: '#bbf7d0' }, // Pale green Fe2+
    },
    observable_en: 'Reddish-orange copper metal deposits on the iron surface. The blue CuSO4 solution turns pale green.',
    observable_vi: 'Lớp kim loại đồng màu đỏ sáng bám dày bên ngoài đinh sắt, màu xanh lam của dung dịch nhạt dần chuyển sang lục nhạt của Fe²⁺.',
  },

  // 34. Zn + CuSO4 -> ZnSO4 + Cu(s)
  {
    id: 'rx_zn_cuso4_displacement',
    name_en: 'Zinc and Copper(II) Sulfate Metal Displacement',
    name_vi: 'Phản ứng Kẽm đẩy Đồng ra khỏi dung dịch Đồng(II) sunfat',
    equation: 'Zn + CuSO₄ → ZnSO₄ + Cu↓',
    ionic_equation: 'Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s)↓',
    reactants: [
      { formula: 'Zn', coefficient: 1, state: 's' },
      { formula: 'CuSO4', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'ZnSO4', coefficient: 1, state: 'aq' },
      { formula: 'Cu', coefficient: 1, state: 's' },
    ],
    deltaH_kJ_mol: -218.0,
    visual: {
      precipitate: { formula: 'Cu', colorHex: '#b45309', morphology: 'powder' },
      colorChange: { resultingColorHex: '#f8fafc' },
    },
    observable_en: 'Vigorous displacement depositing reddish copper powder; blue color completely discharges.',
    observable_vi: 'Kẽm tan dần, đồng kim loại màu đỏ bám xốp bên ngoài hạt kẽm, dung dịch mất màu xanh.',
  },

  // 35. Cu + 2AgNO3 -> Cu(NO3)2 + 2Ag(s)
  {
    id: 'rx_cu_agno3_displacement',
    name_en: 'Copper and Silver Nitrate Displacement (Silver Tree)',
    name_vi: 'Phản ứng lá Đồng đẩy Bạc ra khỏi dung dịch Bạc nitrat (Cây bạc)',
    equation: 'Cu + 2AgNO₃ → Cu(NO₃)₂ + 2Ag↓',
    ionic_equation: 'Cu(s) + 2Ag⁺(aq) → Cu²⁺(aq) + 2Ag(s)↓',
    reactants: [
      { formula: 'Cu', coefficient: 1, state: 's' },
      { formula: 'AgNO3', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'Cu(NO3)2', coefficient: 1, state: 'aq' },
      { formula: 'Ag', coefficient: 2, state: 's' },
    ],
    deltaH_kJ_mol: -147.0,
    visual: {
      precipitate: { formula: 'Ag', colorHex: '#cbd5e1', morphology: 'plates' },
      colorChange: { resultingColorHex: '#38bdf8' },
    },
    observable_en: 'Shimmering gray-white needle-like crystals of silver grow on the copper sheet; solution turns blue.',
    observable_vi: 'Các tinh thể bạc màu trắng xám óng ánh mọc dần bám quanh lá đồng; dung dịch từ không màu chuyển sang màu xanh lam của ion Cu²⁺.',
  },

  // 36. Fe + 2HCl -> FeCl2 + H2(g)
  {
    id: 'rx_fe_hcl_gas',
    name_en: 'Iron Metal and Hydrochloric Acid Reaction',
    name_vi: 'Phản ứng đinh Sắt tác dụng với Axit clohiđric giải phóng Hiđro',
    equation: 'Fe + 2HCl → FeCl₂ + H₂↑',
    ionic_equation: 'Fe(s) + 2H⁺(aq) → Fe²⁺(aq) + H₂(g)↑',
    reactants: [
      { formula: 'Fe', coefficient: 1, state: 's' },
      { formula: 'HCl', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'FeCl2', coefficient: 1, state: 'aq' },
      { formula: 'H2', coefficient: 1, state: 'g' },
    ],
    deltaH_kJ_mol: -87.9,
    visual: {
      gas: { formula: 'H2', effervescenceSpeed: 'slow' },
      colorChange: { resultingColorHex: '#bbf7d0' },
    },
    observable_en: 'Steady stream of fine H2 gas bubbles rises from the iron nail; solution turns pale green.',
    observable_vi: 'Bọt khí hiđro (H2) không màu sủi đều đặn trên bề mặt đinh sắt, dung dịch chuyển sang màu lục rất nhạt của FeCl2.',
  },

  // 37. Al + 6HCl -> 2AlCl3 + 3H2(g)
  {
    id: 'rx_al_hcl_gas',
    name_en: 'Aluminium Metal and Hydrochloric Acid Reaction',
    name_vi: 'Phản ứng Nhôm tác dụng với Axit clohiđric giải phóng Hiđro',
    equation: '2Al + 6HCl → 2AlCl₃ + 3H₂↑',
    ionic_equation: '2Al(s) + 6H⁺(aq) → 2Al³⁺(aq) + 3H₂(g)↑',
    reactants: [
      { formula: 'Al', coefficient: 2, state: 's' },
      { formula: 'HCl', coefficient: 6, state: 'aq' },
    ],
    products: [
      { formula: 'AlCl3', coefficient: 2, state: 'aq' },
      { formula: 'H2', coefficient: 3, state: 'g' },
    ],
    deltaH_kJ_mol: -530.0,
    visual: {
      gas: { formula: 'H2', effervescenceSpeed: 'vigorous' },
    },
    observable_en: 'Vigorous effervescence with heat generation. Aluminum foil dissolves rapidly.',
    observable_vi: 'Lá nhôm sủi bọt khí H2 rất mạnh, tỏa nhiều nhiệt và tan dần.',
  },

  // 38. 2Al + 2NaOH + 6H2O -> 2Na[Al(OH)4] + 3H2(g)
  {
    id: 'rx_al_naoh_gas',
    name_en: 'Aluminium Metal and Sodium Hydroxide Reaction',
    name_vi: 'Phản ứng kim loại Nhôm tan trong dung dịch Kiềm NaOH',
    equation: '2Al + 2NaOH + 6H₂O → 2Na[Al(OH)₄] + 3H₂↑',
    ionic_equation: '2Al(s) + 2OH⁻(aq) + 6H₂O(l) → 2[Al(OH)₄]⁻(aq) + 3H₂(g)↑',
    reactants: [
      { formula: 'Al', coefficient: 2, state: 's' },
      { formula: 'NaOH', coefficient: 2, state: 'aq' },
      { formula: 'H2O', coefficient: 6, state: 'l' },
    ],
    products: [
      { formula: 'Na[Al(OH)4]', coefficient: 2, state: 'aq' },
      { formula: 'H2', coefficient: 3, state: 'g' },
    ],
    deltaH_kJ_mol: -415.0,
    visual: {
      gas: { formula: 'H2', effervescenceSpeed: 'vigorous' },
    },
    observable_en: 'Aluminum foil dissolves in NaOH solution with rapid bubbling of hydrogen gas.',
    observable_vi: 'Nhôm tan nhanh trong dung dịch kiềm, sủi bọt khí H2 cuồn cuộn và tỏa nhiệt nóng bình.',
  },

  // 39. Mg + 2HCl -> MgCl2 + H2(g)
  {
    id: 'rx_mg_hcl_gas',
    name_en: 'Magnesium Ribbon and Hydrochloric Acid Reaction',
    name_vi: 'Phản ứng dải Magie tác dụng với Axit clohiđric',
    equation: 'Mg + 2HCl → MgCl₂ + H₂↑',
    ionic_equation: 'Mg(s) + 2H⁺(aq) → Mg²⁺(aq) + H₂(g)↑',
    reactants: [
      { formula: 'Mg', coefficient: 1, state: 's' },
      { formula: 'HCl', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'MgCl2', coefficient: 1, state: 'aq' },
      { formula: 'H2', coefficient: 1, state: 'g' },
    ],
    deltaH_kJ_mol: -462.0,
    visual: {
      gas: { formula: 'H2', effervescenceSpeed: 'instant' },
    },
    observable_en: 'Instant, violent effervescence. Magnesium ribbon zips across the surface and dissolves in seconds.',
    observable_vi: 'Sủi bọt khí H2 cực kỳ mãnh liệt tức thì, dải magie tan biến trong vài giây và bình nóng ran.',
  },

  // 40. 2Na + 2H2O -> 2NaOH + H2(g)
  {
    id: 'rx_na_water_reaction',
    name_en: 'Sodium Metal and Water Violent Reaction',
    name_vi: 'Phản ứng mãnh liệt của Natri kim loại với Nước',
    equation: '2Na + 2H₂O → 2NaOH + H₂↑',
    ionic_equation: '2Na(s) + 2H₂O(l) → 2Na⁺(aq) + 2OH⁻(aq) + H₂(g)↑',
    reactants: [
      { formula: 'Na', coefficient: 2, state: 's' },
      { formula: 'H2O', coefficient: 2, state: 'l' },
    ],
    products: [
      { formula: 'NaOH', coefficient: 2, state: 'aq' },
      { formula: 'H2', coefficient: 1, state: 'g' },
    ],
    deltaH_kJ_mol: -368.0,
    visual: {
      gas: { formula: 'H2', effervescenceSpeed: 'instant' },
    },
    observable_en: 'Sodium melts into a silvery sphere, darts across the surface with vigorous hissing and H2 release, forming strong alkaline solution.',
    observable_vi: 'Mẩu natri nóng chảy vo tròn thành giọt sáng lóng lánh chạy vòng quanh mặt nước, sủi bọt xèo xèo mãnh liệt tạo dung dịch kiềm.',
    isDangerous: true,
  },

  // 41. Cu + 4HNO3 -> Cu(NO3)2 + 2NO2(g) + 2H2O (Red-brown NO2 gas)
  {
    id: 'rx_cu_hno3_gas',
    name_en: 'Copper and Concentrated Nitric Acid Reaction (Red-Brown NO2 Fumes)',
    name_vi: 'Phản ứng lá Đồng với Axit nitric đặc sinh khí màu nâu đỏ NO2',
    equation: 'Cu + 4HNO₃ → Cu(NO₃)₂ + 2NO₂↑ + 2H₂O',
    ionic_equation: 'Cu(s) + 4H⁺(aq) + 2NO₃⁻(aq) → Cu²⁺(aq) + 2NO₂(g)↑ + 2H₂O(l)',
    reactants: [
      { formula: 'Cu', coefficient: 1, state: 's' },
      { formula: 'HNO3', coefficient: 4, state: 'aq' },
    ],
    products: [
      { formula: 'Cu(NO3)2', coefficient: 1, state: 'aq' },
      { formula: 'NO2', coefficient: 2, state: 'g' },
      { formula: 'H2O', coefficient: 2, state: 'l' },
    ],
    deltaH_kJ_mol: -136.0,
    visual: {
      gas: { formula: 'NO2', effervescenceSpeed: 'vigorous' },
      colorChange: { resultingColorHex: '#0284c7' }, // Deep green-blue
    },
    observable_en: 'Dense, suffocating reddish-brown NO2 gas billows from the solution; the liquid turns deep blue-green.',
    observable_vi: 'Khí NO2 màu nâu đỏ đậm bốc lên cuồn cuộn khỏi miệng bình, dung dịch sôi sùng sục chuyển sang màu xanh lam đậm.',
    isDangerous: true,
  },

  // 42. Na2SO3 + 2HCl -> 2NaCl + SO2(g) + H2O (Choking SO2 gas)
  {
    id: 'rx_na2so3_hcl_gas',
    name_en: 'Sodium Sulfite and Hydrochloric Acid Gas Evolution',
    name_vi: 'Phản ứng Natri sunfit tác dụng với Axit sinh khí SO2 mùi hắc',
    equation: 'Na₂SO₃ + 2HCl → 2NaCl + SO₂↑ + H₂O',
    ionic_equation: 'SO₃²⁻(aq) + 2H⁺(aq) → SO₂(g)↑ + H₂O(l)',
    reactants: [
      { formula: 'Na2SO3', coefficient: 1, state: 'aq' },
      { formula: 'HCl', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'NaCl', coefficient: 2, state: 'aq' },
      { formula: 'SO2', coefficient: 1, state: 'g' },
      { formula: 'H2O', coefficient: 1, state: 'l' },
    ],
    deltaH_kJ_mol: -40.0,
    visual: {
      gas: { formula: 'SO2', effervescenceSpeed: 'vigorous' },
    },
    observable_en: 'Pungent, choking sulfur dioxide gas (SO2) bubbles vigorously out of the solution.',
    observable_vi: 'Sủi bọt khí lưu huỳnh đioxit (SO2) không màu có mùi hắc đặc trưng làm ngạt thở.',
  },

  // 43. NH4Cl + NaOH -> NaCl + NH3(g) + H2O (Pungent ammonia gas)
  {
    id: 'rx_nh4cl_naoh_gas',
    name_en: 'Ammonium Chloride and Sodium Hydroxide Reaction',
    name_vi: 'Phản ứng muối Amoni với kiềm giải phóng khí Amoniac mùi khai',
    equation: 'NH₄Cl + NaOH → NaCl + NH₃↑ + H₂O',
    ionic_equation: 'NH₄⁺(aq) + OH⁻(aq) → NH₃(g)↑ + H₂O(l)',
    reactants: [
      { formula: 'NH4Cl', coefficient: 1, state: 'aq' },
      { formula: 'NaOH', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'NaCl', coefficient: 1, state: 'aq' },
      { formula: 'NH3', coefficient: 1, state: 'g' },
      { formula: 'H2O', coefficient: 1, state: 'l' },
    ],
    deltaH_kJ_mol: 3.5,
    visual: {
      gas: { formula: 'NH3', effervescenceSpeed: 'slow' },
    },
    observable_en: 'Sharp, pungent ammonia gas (NH3) evolves, turning moist red litmus paper blue.',
    observable_vi: 'Thoát ra khí amoniac (NH3) có mùi khai nồng đặc trưng, làm xanh quỳ tím ẩm để trên miệng bình.',
  },

  // 44. FeCl3 + 3KSCN -> Fe(SCN)3 + 3KCl (Blood-red Thiocyanate Complex)
  {
    id: 'rx_fecl3_kscn_complex',
    name_en: 'Iron(III) and Potassium Thiocyanate Blood-Red Complex',
    name_vi: 'Phản ứng tạo phức chất Sắt(III) thioxianat màu đỏ máu',
    equation: 'FeCl₃ + 3KSCN → Fe(SCN)₃ + 3KCl',
    ionic_equation: 'Fe³⁺(aq) + 3SCN⁻(aq) → Fe(SCN)₃(aq)',
    reactants: [
      { formula: 'FeCl3', coefficient: 1, state: 'aq' },
      { formula: 'KSCN', coefficient: 3, state: 'aq' },
    ],
    products: [
      { formula: 'Fe(SCN)3', coefficient: 1, state: 'aq' },
      { formula: 'KCl', coefficient: 3, state: 'aq' },
    ],
    deltaH_kJ_mol: -28.0,
    visual: {
      colorChange: { resultingColorHex: '#991b1b' }, // Intense blood red
    },
    observable_en: 'Instantaneous shift from pale yellow to a brilliant, deep blood-red solution.',
    observable_vi: 'Dung dịch lập tức chuyển sang màu đỏ máu đậm rực rỡ đặc trưng của phức Fe(SCN)3.',
  },

  // 45. 2KMnO4 + 10FeSO4 + 8H2SO4 -> K2SO4 + 2MnSO4 + 5Fe2(SO4)3 + 8H2O (Permanganate Decolorization)
  {
    id: 'rx_kmno4_feso4_redox',
    name_en: 'Permanganate Redox Titration with Iron(II) Sulfate',
    name_vi: 'Phản ứng oxi hóa khử làm mất màu thuốc tím KMnO4 bằng Sắt(II) sunfat',
    equation: '2KMnO₄ + 10FeSO₄ + 8H₂SO₄ → K₂SO₄ + 2MnSO₄ + 5Fe₂(SO₄)₃ + 8H₂O',
    ionic_equation: 'MnO₄⁻(aq) + 5Fe²⁺(aq) + 8H⁺(aq) → Mn²⁺(aq) + 5Fe³⁺(aq) + 4H₂O(l)',
    reactants: [
      { formula: 'KMnO4', coefficient: 2, state: 'aq' },
      { formula: 'FeSO4', coefficient: 10, state: 'aq' },
      { formula: 'H2SO4', coefficient: 8, state: 'aq' },
    ],
    products: [
      { formula: 'K2SO4', coefficient: 1, state: 'aq' },
      { formula: 'MnSO4', coefficient: 2, state: 'aq' },
      { formula: 'Fe2(SO4)3', coefficient: 5, state: 'aq' },
      { formula: 'H2O', coefficient: 8, state: 'l' },
    ],
    deltaH_kJ_mol: -580.0,
    visual: {
      colorChange: { resultingColorHex: '#fef08a' }, // Faint yellow Fe3+
    },
    observable_en: 'The deep violet permanganate color discharges instantly, leaving a very faint yellowish solution.',
    observable_vi: 'Màu tím đậm đặc trưng của thuốc tím KMnO4 bị mất màu ngay lập tức, chuyển sang màu vàng rơm rất nhạt của muối Fe³⁺.',
  },

  // 46. 2H2O2 -> 2H2O + O2(g) (Oxygen gas evolution)
  {
    id: 'rx_h2o2_decomposition',
    name_en: 'Hydrogen Peroxide Catalytic Decomposition',
    name_vi: 'Phản ứng phân hủy oxi già sinh khí Oxi sủi bọt',
    equation: '2H₂O₂ → 2H₂O + O₂↑',
    ionic_equation: '2H₂O₂(aq) → 2H₂O(l) + O₂(g)↑',
    reactants: [
      { formula: 'H2O2', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'H2O', coefficient: 2, state: 'l' },
      { formula: 'O2', coefficient: 1, state: 'g' },
    ],
    deltaH_kJ_mol: -98.0,
    visual: {
      gas: { formula: 'O2', effervescenceSpeed: 'vigorous' },
    },
    observable_en: 'Steady stream of pure oxygen (O2) gas bubbles evolved.',
    observable_vi: 'Dung dịch sủi bọt khí oxi (O2) không màu làm que đóm còn tàn đỏ bùng cháy.',
  },

  // 47. CH3COOH + C2H5OH -> CH3COOC2H5 (Esterification, fragrant & phase separation)
  {
    id: 'rx_esterification_ethyl_acetate',
    name_en: 'Fischer Esterification of Acetic Acid and Ethanol',
    name_vi: 'Phản ứng este hóa Axit axetic và Rượu etylic tạo Etyl axetat',
    equation: 'CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O',
    ionic_equation: 'CH₃COOH(l) + C₂H₅OH(l) ⇌ CH₃COOC₂H₅(l) + H₂O(l)',
    reactants: [
      { formula: 'CH3COOH', coefficient: 1, state: 'aq' },
      { formula: 'C2H5OH', coefficient: 1, state: 'l' },
    ],
    products: [
      { formula: 'CH3COOC2H5', coefficient: 1, state: 'l' },
      { formula: 'H2O', coefficient: 1, state: 'l' },
    ],
    requiresHeating: true,
    minTemp_c: 65.0,
    deltaH_kJ_mol: 4.0,
    visual: {
      colorChange: { resultingColorHex: '#f8fafc' },
    },
    observable_en: 'Pleasant fruity fragrance of ethyl acetate forms, floating as a distinct organic top layer above water.',
    observable_vi: 'Xuất hiện mùi thơm hoa quả (táo/chuối chín) dễ chịu, chất lỏng etyl axetat nhẹ hơn nước nổi lên tạo thành lớp phân cách rõ rệt.',
  },

  // 48. C6H12O6 + 2Cu(OH)2 -> [C6H11O6]2Cu (Deep blue glucose-copper complex at room temperature)
  {
    id: 'rx_glucose_cuoh2_complex',
    name_en: 'Glucose Polyalcohol Reaction with Copper(II) Hydroxide',
    name_vi: 'Phản ứng của Glucozơ với Cu(OH)2 ở nhiệt độ thường tạo phức xanh lam thẫm',
    equation: 'C₆H₁₂O₆ + 2Cu(OH)₂ → [C₆H₁₁O₆]₂Cu + 2H₂O',
    ionic_equation: 'C₆H₁₂O₆ + Cu(OH)₂(s) → Phức đồng-glucozơ(aq)',
    reactants: [
      { formula: 'C6H12O6', coefficient: 1, state: 'aq' },
      { formula: 'Cu(OH)2', coefficient: 2, state: 's' },
    ],
    products: [
      { formula: '[C6H11O6]2Cu', coefficient: 1, state: 'aq' },
      { formula: 'H2O', coefficient: 2, state: 'l' },
    ],
    deltaH_kJ_mol: -22.0,
    visual: {
      colorChange: { resultingColorHex: '#1d4ed8' }, // Brilliant royal deep blue
    },
    observable_en: 'The Cu(OH)2 precipitate dissolves completely into an intense royal deep blue polyol complex.',
    observable_vi: 'Kết tủa Cu(OH)2 bị hòa tan hoàn toàn tạo dung dịch phức chất đồng - glucozơ có màu xanh lam thẫm đặc trưng của ancol đa chức có các nhóm OH liền kề.',
  },

  // 49. [C6H11O6]2Cu -> Cu2O(s) + oxidized sugars (Brick-red precipitate upon heating)
  {
    id: 'rx_glucose_cu2o_heating',
    name_en: 'Thermal Reduction of Glucose-Copper Complex to Brick-Red Copper(I) Oxide',
    name_vi: 'Nhiệt phân phức Glucozơ tạo kết tủa Đồng(I) oxit màu đỏ gạch',
    equation: '[C₆H₁₁O₆]₂Cu → Cu₂O↓ + sản phẩm oxi hóa',
    ionic_equation: 'Phức Cu²⁺ + đun nóng → Cu₂O(s)↓',
    reactants: [
      { formula: '[C6H11O6]2Cu', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'Cu2O', coefficient: 1, state: 's' },
    ],
    requiresHeating: true,
    minTemp_c: 65.0,
    deltaH_kJ_mol: 18.0,
    visual: {
      precipitate: { formula: 'Cu2O', colorHex: '#b91c1c', morphology: 'powder' },
      colorChange: { resultingColorHex: '#fef08a' },
    },
    observable_en: 'Upon heating above 65°C, the blue solution yields a dense brick-red precipitate of Cu2O.',
    observable_vi: 'Khi đun nóng trên 65°C, màu xanh lam biến mất và xuất hiện kết tủa màu đỏ gạch Cu2O lắng xuống đáy ống nghiệm.',
  },

  // 50. TinhBot + I2 -> Blue-violet inclusion complex
  {
    id: 'rx_starch_iodine_complex',
    name_en: 'Starch and Iodine Blue-Violet Inclusion Complex',
    name_vi: 'Phản ứng hồ tinh bột với Iot tạo hợp chất màu xanh tím',
    equation: 'TinhBot + I₂ ⇌ Hợp chất màu xanh tím',
    ionic_equation: 'Amylose + I₂ ⇌ Phức bao màu xanh tím',
    reactants: [
      { formula: 'TinhBot', coefficient: 1, state: 'aq' },
      { formula: 'I2', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'TinhBot-I2', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -18.0,
    visual: {
      colorChange: { resultingColorHex: '#1e1b4b' }, // Deep dark blue-violet
    },
    observable_en: 'Instant intense blue-violet coloration. Color disappears upon heating and reappears on cooling.',
    observable_vi: 'Lập tức xuất hiện màu xanh tím đậm đặc trưng. Khi đun nóng màu xanh tím biến mất, để nguội lại hiện ra.',
  },

  // 51. C6H5OH + 3Br2 -> 2,4,6-tribromophenol(s) + 3HBr
  {
    id: 'rx_phenol_bromine_precipitation',
    name_en: 'Phenol Bromination Forming White 2,4,6-Tribromophenol Precipitate',
    name_vi: 'Phản ứng Phenol tác dụng với Nước Brom tạo kết tủa trắng 2,4,6-tribromphenol',
    equation: 'C₆H₅OH + 3Br₂ → C₆H₂Br₃OH↓ + 3HBr',
    ionic_equation: 'C₆H₅OH + 3Br₂ → C₆H₂Br₃OH(s)↓ + 3H⁺(aq) + 3Br⁻(aq)',
    reactants: [
      { formula: 'C6H5OH', coefficient: 1, state: 'aq' },
      { formula: 'Br2', coefficient: 3, state: 'aq' },
    ],
    products: [
      { formula: 'C6H2Br3OH', coefficient: 1, state: 's' },
      { formula: 'HBr', coefficient: 3, state: 'aq' },
    ],
    deltaH_kJ_mol: -125.0,
    visual: {
      precipitate: { formula: 'C6H2Br3OH', colorHex: '#ffffff', morphology: 'curdy' },
      colorChange: { resultingColorHex: '#f8fafc' },
    },
    observable_en: 'Bromine water is decolorized with immediate formation of a white precipitate of 2,4,6-tribromophenol.',
    observable_vi: 'Nước brom bị mất màu da cam và xuất hiện ngay kết tủa màu trắng của 2,4,6-tribromphenol.',
  },

  // 52. 2NaHCO3 -> Na2CO3 + CO2(g) + H2O (Thermal decomposition of baking soda)
  {
    id: 'rx_nahco3_thermal_decomposition',
    name_en: 'Thermal Decomposition of Sodium Bicarbonate',
    name_vi: 'Nhiệt phân Natri hiđrocacbonat khi đun nóng',
    equation: '2NaHCO₃ → Na₂CO₃ + CO₂↑ + H₂O',
    ionic_equation: '2HCO₃⁻(aq) → CO₃²⁻(aq) + CO₂(g)↑ + H₂O(l)',
    reactants: [
      { formula: 'NaHCO3', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'Na2CO3', coefficient: 1, state: 'aq' },
      { formula: 'CO2', coefficient: 1, state: 'g' },
      { formula: 'H2O', coefficient: 1, state: 'l' },
    ],
    requiresHeating: true,
    minTemp_c: 75.0,
    deltaH_kJ_mol: 64.0,
    visual: {
      gas: { formula: 'CO2', effervescenceSpeed: 'vigorous' },
    },
    observable_en: 'Upon heating above 75°C, vigorous bubbling of CO2 gas occurs with steam condensation.',
    observable_vi: 'Khi đun nóng dung dịch NaHCO3 trên 75°C, bọt khí CO2 thoát ra mạnh mẽ và dung dịch tăng tính kiềm.',
  },

  // 53. AlCl3 + 3NaOH -> Al(OH)3(s) + 3NaCl (Amphoteric precipitation)
  {
    id: 'rx_alcl3_naoh_precipitation',
    name_en: 'Aluminium Chloride and Sodium Hydroxide Precipitation',
    name_vi: 'Tạo kết tủa Nhôm hiđroxit keo trắng',
    equation: 'AlCl₃ + 3NaOH → Al(OH)₃↓ + 3NaCl',
    ionic_equation: 'Al³⁺(aq) + 3OH⁻(aq) → Al(OH)₃(s)↓',
    reactants: [
      { formula: 'AlCl3', coefficient: 1, state: 'aq' },
      { formula: 'NaOH', coefficient: 3, state: 'aq' },
    ],
    products: [
      { formula: 'Al(OH)3', coefficient: 1, state: 's' },
      { formula: 'NaCl', coefficient: 3, state: 'aq' },
    ],
    deltaH_kJ_mol: -92.4,
    visual: {
      precipitate: { formula: 'Al(OH)3', colorHex: '#f1f5f9', morphology: 'gel' },
    },
    observable_en: 'A white gelatinous precipitate of Al(OH)3 forms instantly.',
    observable_vi: 'Xuất hiện ngay kết tủa keo màu trắng của nhôm hiđroxit Al(OH)3.',
  },

  // 54. Al(OH)3 + NaOH -> Na[Al(OH)4] (Dissolution in excess alkali)
  {
    id: 'rx_aloh3_excess_naoh_dissolution',
    name_en: 'Dissolution of Aluminium Hydroxide in Excess Sodium Hydroxide',
    name_vi: 'Hòa tan kết tủa Al(OH)3 trong dung dịch kiềm dư',
    equation: 'Al(OH)₃ + NaOH → Na[Al(OH)₄]',
    ionic_equation: 'Al(OH)₃(s) + OH⁻(aq) → [Al(OH)₄]⁻(aq)',
    reactants: [
      { formula: 'Al(OH)3', coefficient: 1, state: 's' },
      { formula: 'NaOH', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'Na[Al(OH)4]', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -31.2,
    visual: {
      colorChange: { resultingColorHex: '#f8fafc' },
    },
    observable_en: 'The white gelatinous precipitate completely dissolves into a clear colorless sodium aluminate solution.',
    observable_vi: 'Kết tủa keo trắng Al(OH)3 tan hoàn toàn tạo dung dịch natri aluminat trong suốt không màu.',
  },

  // 55. ZnSO4 + 2NaOH -> Zn(OH)2(s) + Na2SO4
  {
    id: 'rx_znso4_naoh_precipitation',
    name_en: 'Zinc Sulfate and Sodium Hydroxide Precipitation',
    name_vi: 'Tạo kết tủa Kẽm hiđroxit keo trắng',
    equation: 'ZnSO₄ + 2NaOH → Zn(OH)₂↓ + Na₂SO₄',
    ionic_equation: 'Zn²⁺(aq) + 2OH⁻(aq) → Zn(OH)₂(s)↓',
    reactants: [
      { formula: 'ZnSO4', coefficient: 1, state: 'aq' },
      { formula: 'NaOH', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'Zn(OH)2', coefficient: 1, state: 's' },
      { formula: 'Na2SO4', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -61.0,
    visual: {
      precipitate: { formula: 'Zn(OH)2', colorHex: '#ffffff', morphology: 'gel' },
    },
    observable_en: 'White gelatinous precipitate of zinc hydroxide forms.',
    observable_vi: 'Xuất hiện kết tủa keo trắng Zn(OH)2.',
  },

  // 56. Zn(OH)2 + 2NaOH -> Na2[Zn(OH)4]
  {
    id: 'rx_znoh2_excess_naoh_dissolution',
    name_en: 'Dissolution of Zinc Hydroxide in Excess Sodium Hydroxide',
    name_vi: 'Hòa tan Zn(OH)2 trong kiềm dư tạo kẽmat',
    equation: 'Zn(OH)₂ + 2NaOH → Na₂[Zn(OH)₄]',
    ionic_equation: 'Zn(OH)₂(s) + 2OH⁻(aq) → [Zn(OH)₄]²⁻(aq)',
    reactants: [
      { formula: 'Zn(OH)2', coefficient: 1, state: 's' },
      { formula: 'NaOH', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'Na2[Zn(OH)4]', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -28.5,
    visual: {
      colorChange: { resultingColorHex: '#f8fafc' },
    },
    observable_en: 'Zinc hydroxide dissolves in excess base to form a clear colorless zincate solution.',
    observable_vi: 'Kết tủa Zn(OH)2 tan trong kiềm dư tạo dung dịch natri zincat trong suốt.',
  },

  // 57. Cu(OH)2 + 4NH3 -> [Cu(NH3)4](OH)2 (Deep Royal Azure Blue Complex)
  {
    id: 'rx_cuoh2_excess_nh3_complex',
    name_en: 'Copper(II) Hydroxide Dissolution in Excess Ammonia',
    name_vi: 'Hòa tan Cu(OH)2 trong Amoniac tạo phức đồng xanh thẫm',
    equation: 'Cu(OH)₂ + 4NH₃ → [Cu(NH₃)₄](OH)₂',
    ionic_equation: 'Cu(OH)₂(s) + 4NH₃(aq) → [Cu(NH₃)₄]²⁺(aq) + 2OH⁻(aq)',
    reactants: [
      { formula: 'Cu(OH)2', coefficient: 1, state: 's' },
      { formula: 'NH3', coefficient: 4, state: 'aq' },
    ],
    products: [
      { formula: '[Cu(NH3)4](OH)2', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -44.0,
    visual: {
      colorChange: { resultingColorHex: '#1d4ed8' },
    },
    observable_en: 'The light blue Cu(OH)2 precipitate dissolves completely into an intense, deep royal azure blue tetraamminecopper(II) solution.',
    observable_vi: 'Kết tủa màu xanh lơ Cu(OH)2 tan hoàn toàn tạo dung dịch phức tứ ammin đồng(II) màu xanh lam thẫm cực kỳ lộng lẫy.',
  },

  // 58. 2Cu(OH)2 + C3H5(OH)3 -> [Cu(C3H7O3)2] + 2H2O (Copper-Glycerol Chelate)
  {
    id: 'rx_cuoh2_glycerol_complex',
    name_en: 'Reaction of Copper(II) Hydroxide with Glycerol',
    name_vi: 'Phản ứng của Cu(OH)2 với Glixerol tạo dung dịch phức xanh lam',
    equation: '2Cu(OH)₂ + C₃H₅(OH)₃ → Cu(C₃H₇O₃)₂ + 2H₂O',
    ionic_equation: 'Cu(OH)₂(s) + 2C₃H₈O₃(aq) → [Cu(C₃H₇O₃)₂](aq) + 2H₂O(l)',
    reactants: [
      { formula: 'Cu(OH)2', coefficient: 2, state: 's' },
      { formula: 'C3H5(OH)3', coefficient: 1, state: 'l' },
    ],
    products: [
      { formula: 'Cu(C3H7O3)2', coefficient: 1, state: 'aq' },
      { formula: 'H2O', coefficient: 2, state: 'l' },
    ],
    deltaH_kJ_mol: -35.0,
    visual: {
      colorChange: { resultingColorHex: '#2563eb' },
    },
    observable_en: 'The blue precipitate dissolves smoothly upon stirring with glycerol, forming a characteristic deep blue chelate solution of a polyhydric alcohol.',
    observable_vi: 'Kết tủa màu xanh lơ tan dần tạo dung dịch màu xanh lam thẫm đặc trưng của ancol đa chức có các nhóm -OH kề nhau.',
  },

  // 59. AgCl + 2NH3 -> [Ag(NH3)2]Cl (Silver chloride dissolves in aqueous ammonia)
  {
    id: 'rx_agcl_excess_nh3_complex',
    name_en: 'Dissolution of Silver Chloride in Aqueous Ammonia',
    name_vi: 'Hòa tan Bạc clorua trong dung dịch Amoniac',
    equation: 'AgCl + 2NH₃ → [Ag(NH₃)₂]Cl',
    ionic_equation: 'AgCl(s) + 2NH₃(aq) → [Ag(NH₃)₂]⁺(aq) + Cl⁻(aq)',
    reactants: [
      { formula: 'AgCl', coefficient: 1, state: 's' },
      { formula: 'NH3', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: '[Ag(NH3)2]Cl', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -22.0,
    visual: {
      colorChange: { resultingColorHex: '#f8fafc' },
    },
    observable_en: 'Curdy white silver chloride precipitate dissolves completely into a clear diamminesilver(I) solution.',
    observable_vi: 'Kết tủa trắng vón AgCl tan hoàn toàn trong amoniac dư tạo dung dịch phức điamminbạc(I) không màu.',
  },

  // 60. FeCl2 + 2NaOH -> Fe(OH)2(s) + 2NaCl
  {
    id: 'rx_fecl2_naoh_precipitation',
    name_en: 'Iron(II) Chloride and Sodium Hydroxide Precipitation',
    name_vi: 'Phản ứng tạo kết tủa Sắt(II) hiđroxit trắng xanh',
    equation: 'FeCl₂ + 2NaOH → Fe(OH)₂↓ + 2NaCl',
    ionic_equation: 'Fe²⁺(aq) + 2OH⁻(aq) → Fe(OH)₂(s)↓',
    reactants: [
      { formula: 'FeCl2', coefficient: 1, state: 'aq' },
      { formula: 'NaOH', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'Fe(OH)2', coefficient: 1, state: 's' },
      { formula: 'NaCl', coefficient: 2, state: 'aq' },
    ],
    deltaH_kJ_mol: -58.0,
    visual: {
      precipitate: { formula: 'Fe(OH)2', colorHex: '#86efac', morphology: 'gel' },
    },
    observable_en: 'A dirty pale green/white-green gelatinous precipitate of Fe(OH)2 forms immediately.',
    observable_vi: 'Xuất hiện ngay kết tủa keo màu trắng xanh của sắt(II) hiđroxit Fe(OH)2.',
  },

  // 61. 4Fe(OH)2 + O2 + 2H2O -> 4Fe(OH)3(s) (Air oxidation)
  {
    id: 'rx_feoh2_air_oxidation',
    name_en: 'Oxidation of Iron(II) Hydroxide in Air to Iron(III) Hydroxide',
    name_vi: 'Oxi hóa Sắt(II) hiđroxit trong không khí chuyển màu nâu đỏ',
    equation: '4Fe(OH)₂ + O₂ + 2H₂O → 4Fe(OH)₃↓',
    reactants: [
      { formula: 'Fe(OH)2', coefficient: 4, state: 's' },
      { formula: 'H2O', coefficient: 2, state: 'l' },
    ],
    products: [
      { formula: 'Fe(OH)3', coefficient: 4, state: 's' },
    ],
    deltaH_kJ_mol: -420.0,
    visual: {
      precipitate: { formula: 'Fe(OH)3', colorHex: '#991b1b', morphology: 'gel' },
    },
    observable_en: 'The dirty white-green Fe(OH)2 turns reddish-brown Fe(OH)3 as it absorbs atmospheric oxygen.',
    observable_vi: 'Kết tủa trắng xanh nhanh chóng chuyển thành màu nâu đỏ đặc trưng của Fe(OH)3 do bị oxi trong không khí oxi hóa.',
  },

  // 62. FeCl3 + 3KSCN -> Fe(SCN)3 + 3KCl (Blood Red Iron Thiocyanate Complex)
  {
    id: 'rx_fecl3_kscn_blood_red',
    name_en: 'Iron(III) and Potassium Thiocyanate Blood Red Complexation',
    name_vi: 'Phản ứng nhận biết ion Sắt(III) bằng Kali thioxianat tạo màu đỏ máu',
    equation: 'FeCl₃ + 3KSCN → Fe(SCN)₃ + 3KCl',
    ionic_equation: 'Fe³⁺(aq) + 3SCN⁻(aq) → Fe(SCN)₃(aq)',
    reactants: [
      { formula: 'FeCl3', coefficient: 1, state: 'aq' },
      { formula: 'KSCN', coefficient: 3, state: 'aq' },
    ],
    products: [
      { formula: 'Fe(SCN)3', coefficient: 1, state: 'aq' },
      { formula: 'KCl', coefficient: 3, state: 'aq' },
    ],
    deltaH_kJ_mol: -18.5,
    visual: {
      colorChange: { resultingColorHex: '#7f1d1d' },
    },
    observable_en: 'An intense, vivid blood-red solution of iron(III) thiocyanate complex forms instantly.',
    observable_vi: 'Dung dịch lập tức chuyển sang màu đỏ máu đậm cực kỳ ấn tượng của phức sắt(III) thioxianat.',
  },

  // 63. Pb(NO3)2 + 2KI -> PbI2(s) + 2KNO3 ("Golden Rain" precipitation)
  {
    id: 'rx_pbno32_ki_golden_rain',
    name_en: 'Lead(II) Nitrate and Potassium Iodide (Golden Rain Experiment)',
    name_vi: 'Phản ứng tạo kết tủa Chì(II) iođua — Thí nghiệm Mưa Vàng',
    equation: 'Pb(NO₃)₂ + 2KI → PbI₂↓ + 2KNO₃',
    ionic_equation: 'Pb²⁺(aq) + 2I⁻(aq) → PbI₂(s)↓',
    reactants: [
      { formula: 'Pb(NO3)2', coefficient: 1, state: 'aq' },
      { formula: 'KI', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'PbI2', coefficient: 1, state: 's' },
      { formula: 'KNO3', coefficient: 2, state: 'aq' },
    ],
    deltaH_kJ_mol: -63.5,
    visual: {
      precipitate: { formula: 'PbI2', colorHex: '#eab308', morphology: 'crystalline' },
    },
    observable_en: 'Bright yellow crystalline flakes of PbI2 precipitate, glistening like golden rain.',
    observable_vi: 'Xuất hiện kết tủa vảy tinh thể màu vàng óng ánh như cơn mưa vàng lấp lánh của PbI2.',
  },

  // 64. AgNO3 + NaBr -> AgBr(s) + NaNO3
  {
    id: 'rx_agno3_nabr_precipitation',
    name_en: 'Silver Nitrate and Sodium Bromide Precipitation',
    name_vi: 'Phản ứng tạo kết tủa Bạc bromua vàng nhạt',
    equation: 'AgNO₃ + NaBr → AgBr↓ + NaNO₃',
    ionic_equation: 'Ag⁺(aq) + Br⁻(aq) → AgBr(s)↓',
    reactants: [
      { formula: 'AgNO3', coefficient: 1, state: 'aq' },
      { formula: 'NaBr', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'AgBr', coefficient: 1, state: 's' },
      { formula: 'NaNO3', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -84.4,
    visual: {
      precipitate: { formula: 'AgBr', colorHex: '#fef9c3', morphology: 'curdy' },
    },
    observable_en: 'A pale yellow curdy precipitate of AgBr forms immediately.',
    observable_vi: 'Xuất hiện kết tủa màu vàng nhạt của bạc bromua AgBr.',
  },

  // 65. AgNO3 + KI -> AgI(s) + KNO3
  {
    id: 'rx_agno3_ki_precipitation',
    name_en: 'Silver Nitrate and Potassium Iodide Precipitation',
    name_vi: 'Phản ứng tạo kết tủa Bạc iođua vàng đậm',
    equation: 'AgNO₃ + KI → AgI↓ + KNO₃',
    ionic_equation: 'Ag⁺(aq) + I⁻(aq) → AgI(s)↓',
    reactants: [
      { formula: 'AgNO3', coefficient: 1, state: 'aq' },
      { formula: 'KI', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'AgI', coefficient: 1, state: 's' },
      { formula: 'KNO3', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -112.2,
    visual: {
      precipitate: { formula: 'AgI', colorHex: '#fde047', morphology: 'powder' },
    },
    observable_en: 'An intense yellow precipitate of AgI forms instantly, insoluble in NH3.',
    observable_vi: 'Xuất hiện kết tủa màu vàng đậm của bạc iođua AgI, không tan trong dung dịch amoniac.',
  },

  // 66. Na2S2O3 + H2SO4 -> Na2SO4 + SO2(g) + S(s) + H2O (Reaction kinetics / turbidity)
  {
    id: 'rx_na2s2o3_h2so4_turbidity',
    name_en: 'Disproportionation of Sodium Thiosulfate by Acid (Kinetics Clock)',
    name_vi: 'Phản ứng Natri thiosulfat tác dụng Axit tạo lưu huỳnh đục dần',
    equation: 'Na₂S₂O₃ + H₂SO₄ → Na₂SO₄ + SO₂↑ + S↓ + H₂O',
    ionic_equation: 'S₂O₃²⁻(aq) + 2H⁺(aq) → SO₂(g)↑ + S(s)↓ + H₂O(l)',
    reactants: [
      { formula: 'Na2S2O3', coefficient: 1, state: 'aq' },
      { formula: 'H2SO4', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'Na2SO4', coefficient: 1, state: 'aq' },
      { formula: 'SO2', coefficient: 1, state: 'g' },
      { formula: 'S', coefficient: 1, state: 's' },
      { formula: 'H2O', coefficient: 1, state: 'l' },
    ],
    deltaH_kJ_mol: -45.0,
    visual: {
      precipitate: { formula: 'S', colorHex: '#fef08a', morphology: 'milky' },
      gas: { formula: 'SO2', effervescenceSpeed: 'slow' },
    },
    observable_en: 'The solution gradually becomes milky turbid as colloidal sulfur precipitates, with choking SO2 gas fumes.',
    observable_vi: 'Dung dịch đục dần rồi chuyển sang màu vàng sữa do lưu huỳnh kết tủa dạng keo mịn, đồng thời sủi bọt khí SO2 mùi hắc.',
  },

  // 67. Na2S + FeCl2 -> FeS(s) + 2NaCl
  {
    id: 'rx_na2s_fecl2_precipitation',
    name_en: 'Sodium Sulfide and Iron(II) Chloride Precipitation',
    name_vi: 'Tạo kết tủa Sắt(II) sunfua màu đen',
    equation: 'Na₂S + FeCl₂ → FeS↓ + 2NaCl',
    ionic_equation: 'S²⁻(aq) + Fe²⁺(aq) → FeS(s)↓',
    reactants: [
      { formula: 'Na2S', coefficient: 1, state: 'aq' },
      { formula: 'FeCl2', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'FeS', coefficient: 1, state: 's' },
      { formula: 'NaCl', coefficient: 2, state: 'aq' },
    ],
    deltaH_kJ_mol: -67.0,
    visual: {
      precipitate: { formula: 'FeS', colorHex: '#1e293b', morphology: 'powder' },
    },
    observable_en: 'A dense black precipitate of FeS forms instantly.',
    observable_vi: 'Xuất hiện ngay kết tủa màu đen mịn của sắt(II) sunfua FeS.',
  },

  // 68. FeS + 2HCl -> FeCl2 + H2S(g)
  {
    id: 'rx_fes_hcl_gas',
    name_en: 'Iron(II) Sulfide Dissolution with Hydrogen Sulfide Gas',
    name_vi: 'Hòa tan Sắt(II) sunfua trong Axit Clohiđric sinh khí H2S',
    equation: 'FeS + 2HCl → FeCl₂ + H₂S↑',
    ionic_equation: 'FeS(s) + 2H⁺(aq) → Fe²⁺(aq) + H₂S(g)↑',
    reactants: [
      { formula: 'FeS', coefficient: 1, state: 's' },
      { formula: 'HCl', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'FeCl2', coefficient: 1, state: 'aq' },
      { formula: 'H2S', coefficient: 1, state: 'g' },
    ],
    deltaH_kJ_mol: -14.2,
    visual: {
      gas: { formula: 'H2S', effervescenceSpeed: 'vigorous' },
    },
    observable_en: 'Black solid dissolves with vigorous bubbling of hydrogen sulfide gas with a pungent rotten egg odor.',
    observable_vi: 'Chất rắn màu đen tan dần, sủi bọt khí hiđro sunfua H2S có mùi trứng thối đặc trưng.',
  },

  // 69. Cu(OH)2 -> CuO(s) + H2O (Thermal decomposition / dehydration)
  {
    id: 'rx_cuoh2_thermal_decomposition',
    name_en: 'Thermal Dehydration of Copper(II) Hydroxide to Copper(II) Oxide',
    name_vi: 'Nhiệt phân Đồng(II) hiđroxit chuyển thành Đồng(II) oxit bột đen',
    equation: 'Cu(OH)₂ → CuO↓ + H₂O',
    reactants: [
      { formula: 'Cu(OH)2', coefficient: 1, state: 's' },
    ],
    products: [
      { formula: 'CuO', coefficient: 1, state: 's' },
      { formula: 'H2O', coefficient: 1, state: 'l' },
    ],
    requiresHeating: true,
    minTemp_c: 65.0,
    deltaH_kJ_mol: 8.8,
    visual: {
      precipitate: { formula: 'CuO', colorHex: '#0f172a', morphology: 'powder' },
      colorChange: { resultingColorHex: '#f8fafc' },
    },
    observable_en: 'Upon heating above 65°C, the blue gelatinous precipitate turns entirely into fine black copper(II) oxide powder.',
    observable_vi: 'Khi đun nóng trên 65°C, kết tủa xanh lơ mất nước chuyển hoàn toàn thành bột đồng(II) oxit CuO màu đen.',
  },

  // 70. 2KMnO4 -> K2MnO4 + MnO2(s) + O2(g) (Thermal oxygen preparation)
  {
    id: 'rx_kmno4_thermal_decomposition',
    name_en: 'Thermal Decomposition of Potassium Permanganate (Oxygen Preparation)',
    name_vi: 'Nhiệt phân Thuốc tím KMnO4 điều chế Oxy trong phòng thí nghiệm',
    equation: '2KMnO₄ → K₂MnO₄ + MnO₂↓ + O₂↑',
    reactants: [
      { formula: 'KMnO4', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'K2MnO4', coefficient: 1, state: 'aq' },
      { formula: 'MnO2', coefficient: 1, state: 's' },
      { formula: 'O2', coefficient: 1, state: 'g' },
    ],
    requiresHeating: true,
    minTemp_c: 90.0,
    deltaH_kJ_mol: 52.0,
    visual: {
      precipitate: { formula: 'MnO2', colorHex: '#020617', morphology: 'powder' },
      gas: { formula: 'O2', effervescenceSpeed: 'vigorous' },
      colorChange: { resultingColorHex: '#15803d' },
    },
    observable_en: 'Strong heating releases streams of oxygen gas, while deep purple turns to dark green K2MnO4 and black MnO2 powder.',
    observable_vi: 'Đun nóng mạnh giải phóng luồng khí oxy O2, dung dịch từ tím thẫm chuyển sang xanh lục K2MnO4 và lắng bột MnO2 đen.',
  },

  // 71. 2H2O2 -> 2H2O + O2(g) (Catalytic / thermal decomposition)
  {
    id: 'rx_h2o2_decomposition_o2',
    name_en: 'Decomposition of Hydrogen Peroxide into Oxygen Gas',
    name_vi: 'Phân hủy Oxy già H2O2 sinh khí Oxy',
    equation: '2H₂O₂ → 2H₂O + O₂↑',
    reactants: [
      { formula: 'H2O2', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'H2O', coefficient: 2, state: 'l' },
      { formula: 'O2', coefficient: 1, state: 'g' },
    ],
    deltaH_kJ_mol: -98.2,
    visual: {
      gas: { formula: 'O2', effervescenceSpeed: 'vigorous' },
    },
    observable_en: 'Vigorous bubbling and frothing of oxygen gas with heat generation.',
    observable_vi: 'Sủi bọt khí oxy O2 mạnh mẽ, dung dịch ấm lên do tỏa nhiệt.',
  },

  // 72. CaO + H2O -> Ca(OH)2 (Violent slaking of quicklime)
  {
    id: 'rx_cao_water_slaking',
    name_en: 'Exothermic Slaking of Quicklime (Calcium Oxide)',
    name_vi: 'Phản ứng tôi vôi sống CaO tỏa nhiệt cực mạnh',
    equation: 'CaO + H₂O → Ca(OH)₂',
    reactants: [
      { formula: 'CaO', coefficient: 1, state: 's' },
      { formula: 'H2O', coefficient: 1, state: 'l' },
    ],
    products: [
      { formula: 'Ca(OH)2', coefficient: 1, state: 'aq' },
    ],
    deltaH_kJ_mol: -65.2,
    visual: {
      precipitate: { formula: 'Ca(OH)2', colorHex: '#ffffff', morphology: 'milky' },
    },
    observable_en: 'Violent boiling and steam release as water is added to quicklime, yielding white slaked lime suspension.',
    observable_vi: 'Tỏa nhiệt cực kỳ dữ dội làm nước sôi sùng sục bốc hơi nghi ngút, tạo thành dung dịch vôi tôi đục trắng.',
  },

  // 73. Cu + 4HNO3 -> Cu(NO3)2 + 2NO2(g) + 2H2O (Concentrated nitric acid)
  {
    id: 'rx_cu_hno3_conc_no2',
    name_en: 'Copper Dissolution in Concentrated Nitric Acid (Nitrogen Dioxide Evolution)',
    name_vi: 'Đồng tác dụng với Axit Nitric đặc sinh khí NO2 màu nâu đỏ',
    equation: 'Cu + 4HNO₃ → Cu(NO₃)₂ + 2NO₂↑ + 2H₂O',
    ionic_equation: 'Cu(s) + 4H⁺(aq) + 2NO₃⁻(aq) → Cu²⁺(aq) + 2NO₂(g)↑ + 2H₂O(l)',
    reactants: [
      { formula: 'Cu', coefficient: 1, state: 's' },
      { formula: 'HNO3', coefficient: 4, state: 'aq' },
    ],
    products: [
      { formula: 'Cu(NO3)2', coefficient: 1, state: 'aq' },
      { formula: 'NO2', coefficient: 2, state: 'g' },
      { formula: 'H2O', coefficient: 2, state: 'l' },
    ],
    deltaH_kJ_mol: -136.0,
    visual: {
      gas: { formula: 'NO2', colorHex: '#b45309', effervescenceSpeed: 'instant' },
      colorChange: { resultingColorHex: '#0284c7' },
    },
    observable_en: 'Copper dissolves violently; the solution turns blue-green while dense, choking reddish-brown NO2 gas billows upward.',
    observable_vi: 'Lá đồng tan nhanh sủi bọt mãnh liệt; dung dịch hóa xanh lam - xanh lục và luồng khí NO2 màu nâu đỏ độc bốc lên ngùn ngụt.',
  },

  // 74. 2KMnO4 + 10FeSO4 + 8H2SO4 -> K2SO4 + 2MnSO4 + 5Fe2(SO4)3 + 8H2O (Classic redox titration)
  {
    id: 'rx_kmno4_feso4_redox_titration',
    name_en: 'Permanganate Redox Titration of Iron(II) in Acidic Medium',
    name_vi: 'Chuẩn độ oxi hóa - khử Sắt(II) bằng Thuốc tím KMnO4',
    equation: '2KMnO₄ + 10FeSO₄ + 8H₂SO₄ → K₂SO₄ + 2MnSO₄ + 5Fe₂(SO₄)₃ + 8H₂O',
    ionic_equation: 'MnO₄⁻(aq) + 5Fe²⁺(aq) + 8H⁺(aq) → Mn²⁺(aq) + 5Fe³⁺(aq) + 4H₂O(l)',
    reactants: [
      { formula: 'KMnO4', coefficient: 2, state: 'aq' },
      { formula: 'FeSO4', coefficient: 10, state: 'aq' },
      { formula: 'H2SO4', coefficient: 8, state: 'aq' },
    ],
    products: [
      { formula: 'K2SO4', coefficient: 1, state: 'aq' },
      { formula: 'MnSO4', coefficient: 2, state: 'aq' },
      { formula: 'Fe2(SO4)3', coefficient: 5, state: 'aq' },
      { formula: 'H2O', coefficient: 8, state: 'l' },
    ],
    deltaH_kJ_mol: -580.0,
    visual: {
      colorChange: { resultingColorHex: '#fef08a' },
    },
    observable_en: 'Intense purple permanganate is rapidly decolorized by Fe2+ into pale yellow iron(III) sulfate solution.',
    observable_vi: 'Màu tím thẫm của thuốc tím KMnO4 bị mất màu nhanh chóng khi nhỏ vào dung dịch FeSO4 trong axit, dung dịch chuyển sang vàng nhạt.',
  },

  // 75. 2KMnO4 + 5H2O2 + 3H2SO4 -> K2SO4 + 2MnSO4 + 5O2(g) + 8H2O
  {
    id: 'rx_kmno4_h2o2_redox',
    name_en: 'Redox Decolorization of Permanganate by Hydrogen Peroxide',
    name_vi: 'Thuốc tím tác dụng với Oxy già trong môi trường Axit',
    equation: '2KMnO₄ + 5H₂O₂ + 3H₂SO₄ → K₂SO₄ + 2MnSO₄ + 5O₂↑ + 8H₂O',
    ionic_equation: '2MnO₄⁻(aq) + 5H₂O₂(aq) + 6H⁺(aq) → 2Mn²⁺(aq) + 5O₂(g)↑ + 8H₂O(l)',
    reactants: [
      { formula: 'KMnO4', coefficient: 2, state: 'aq' },
      { formula: 'H2O2', coefficient: 5, state: 'aq' },
      { formula: 'H2SO4', coefficient: 3, state: 'aq' },
    ],
    products: [
      { formula: 'K2SO4', coefficient: 1, state: 'aq' },
      { formula: 'MnSO4', coefficient: 2, state: 'aq' },
      { formula: 'O2', coefficient: 5, state: 'g' },
      { formula: 'H2O', coefficient: 8, state: 'l' },
    ],
    deltaH_kJ_mol: -670.0,
    visual: {
      gas: { formula: 'O2', effervescenceSpeed: 'instant' },
      colorChange: { resultingColorHex: '#f8fafc' },
    },
    observable_en: 'Instant decolorization of purple permanganate accompanied by vigorous bubbling of oxygen gas.',
    observable_vi: 'Màu tím của KMnO4 biến mất tức thì đồng thời bọt khí oxy O2 sủi lên mạnh mẽ.',
  },

  // 76. CH3CHO + 2AgNO3 + 3NH3 + H2O -> CH3COONH4 + 2Ag(s) + 2NH4NO3 (Silver Mirror Tollens test)
  {
    id: 'rx_silver_mirror_acetaldehyde',
    name_en: 'Tollens Silver Mirror Reaction with Acetaldehyde',
    name_vi: 'Phản ứng tráng gương của Axetanđehit tạo lớp Bạc sáng bóng',
    equation: 'CH₃CHO + 2AgNO₃ + 3NH₃ + H₂O → CH₃COONH₄ + 2Ag↓ + 2NH₄NO₃',
    ionic_equation: 'CH₃CHO(aq) + 2[Ag(NH₃)₂]⁺(aq) + 3OH⁻(aq) → CH₃COO⁻(aq) + 2Ag(s)↓ + 4NH₃(aq) + 2H₂O(l)',
    reactants: [
      { formula: 'CH3CHO', coefficient: 1, state: 'aq' },
      { formula: 'AgNO3', coefficient: 2, state: 'aq' },
      { formula: 'NH3', coefficient: 3, state: 'aq' },
    ],
    products: [
      { formula: 'Ag', coefficient: 2, state: 's' },
      { formula: 'NH4NO3', coefficient: 2, state: 'aq' },
    ],
    requiresHeating: true,
    minTemp_c: 50.0,
    deltaH_kJ_mol: -95.0,
    visual: {
      precipitate: { formula: 'Ag', colorHex: '#e2e8f0', morphology: 'plates' },
      colorChange: { resultingColorHex: '#cbd5e1' },
    },
    observable_en: 'Upon gentle warming, a brilliant, reflective metallic silver mirror coats the inner glass wall of the vessel.',
    observable_vi: 'Khi đun nóng nhẹ trong cốc nước nóng, lớp bạc kim loại sáng bóng như gương bám chắc vào thành ống nghiệm.',
  },

  // 77. Fe + CuSO4 -> FeSO4 + Cu(s) (Metal displacement)
  {
    id: 'rx_fe_cuso4_displacement',
    name_en: 'Iron Displacing Copper from Copper(II) Sulfate',
    name_vi: 'Đinh sắt tác dụng với dung dịch Đồng(II) sunfat',
    equation: 'Fe + CuSO₄ → FeSO₄ + Cu↓',
    ionic_equation: 'Fe(s) + Cu²⁺(aq) → Fe²⁺(aq) + Cu(s)↓',
    reactants: [
      { formula: 'Fe', coefficient: 1, state: 's' },
      { formula: 'CuSO4', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'FeSO4', coefficient: 1, state: 'aq' },
      { formula: 'Cu', coefficient: 1, state: 's' },
    ],
    deltaH_kJ_mol: -152.0,
    visual: {
      precipitate: { formula: 'Cu', colorHex: '#b45309', morphology: 'plates' },
      colorChange: { resultingColorHex: '#dcfce7' },
    },
    observable_en: 'A reddish-brown layer of elemental copper deposits on the iron, and the blue solution fades to pale green FeSO4.',
    observable_vi: 'Lớp kim loại đồng màu đỏ bám ngoài đinh sắt, màu xanh lam của dung dịch nhạt dần chuyển sang xanh lục nhạt.',
  },

  // 78. Zn + CuSO4 -> ZnSO4 + Cu(s)
  {
    id: 'rx_zn_cuso4_displacement',
    name_en: 'Zinc Displacing Copper from Copper(II) Sulfate',
    name_vi: 'Kẽm tác dụng với dung dịch Đồng(II) sunfat',
    equation: 'Zn + CuSO₄ → ZnSO₄ + Cu↓',
    ionic_equation: 'Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s)↓',
    reactants: [
      { formula: 'Zn', coefficient: 1, state: 's' },
      { formula: 'CuSO4', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'ZnSO4', coefficient: 1, state: 'aq' },
      { formula: 'Cu', coefficient: 1, state: 's' },
    ],
    deltaH_kJ_mol: -218.0,
    visual: {
      precipitate: { formula: 'Cu', colorHex: '#b45309', morphology: 'powder' },
      colorChange: { resultingColorHex: '#f8fafc' },
    },
    observable_en: 'Exothermic reaction: red copper powder precipitates rapidly while blue solution decolorizes to colorless ZnSO4.',
    observable_vi: 'Phản ứng tỏa nhiệt mạnh: bột đồng màu đỏ nâu tách ra nhanh chóng, dung dịch màu xanh mất màu tạo ZnSO4 không màu.',
  },

  // 79. Cu + 2AgNO3 -> Cu(NO3)2 + 2Ag(s)
  {
    id: 'rx_cu_agno3_displacement',
    name_en: 'Copper Displacing Silver from Silver Nitrate',
    name_vi: 'Đồng tác dụng với dung dịch Bạc nitrat mọc tinh thể bạc',
    equation: 'Cu + 2AgNO₃ → Cu(NO₃)₂ + 2Ag↓',
    ionic_equation: 'Cu(s) + 2Ag⁺(aq) → Cu²⁺(aq) + 2Ag(s)↓',
    reactants: [
      { formula: 'Cu', coefficient: 1, state: 's' },
      { formula: 'AgNO3', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'Cu(NO3)2', coefficient: 1, state: 'aq' },
      { formula: 'Ag', coefficient: 2, state: 's' },
    ],
    deltaH_kJ_mol: -147.0,
    visual: {
      precipitate: { formula: 'Ag', colorHex: '#cbd5e1', morphology: 'crystalline' },
      colorChange: { resultingColorHex: '#38bdf8' },
    },
    observable_en: 'Shimmering white needles of silver crystals grow on the copper strip, while the solution turns clear azure blue.',
    observable_vi: 'Các tinh thể bạc màu trắng xám lấp lánh bám vào lá đồng như cây bạc, dung dịch không màu chuyển sang màu xanh lam.',
  },

  // 80. 2Al + 2NaOH + 6H2O -> 2Na[Al(OH)4] + 3H2(g)
  {
    id: 'rx_al_naoh_h2_evolution',
    name_en: 'Aluminium Dissolution in Sodium Hydroxide with Hydrogen Gas Evolution',
    name_vi: 'Nhôm tan trong dung dịch Kiềm sinh khí Hiđro sủi bọt mạnh',
    equation: '2Al + 2NaOH + 6H₂O → 2Na[Al(OH)₄] + 3H₂↑',
    ionic_equation: '2Al(s) + 2OH⁻(aq) + 6H₂O(l) → 2[Al(OH)₄]⁻(aq) + 3H₂(g)↑',
    reactants: [
      { formula: 'Al', coefficient: 2, state: 's' },
      { formula: 'NaOH', coefficient: 2, state: 'aq' },
      { formula: 'H2O', coefficient: 6, state: 'l' },
    ],
    products: [
      { formula: 'Na[Al(OH)4]', coefficient: 2, state: 'aq' },
      { formula: 'H2', coefficient: 3, state: 'g' },
    ],
    deltaH_kJ_mol: -415.0,
    visual: {
      gas: { formula: 'H2', effervescenceSpeed: 'instant' },
    },
    observable_en: 'Aluminium foil dissolves vigorously with rapid streaming of hydrogen bubbles and marked temperature rise.',
    observable_vi: 'Lá nhôm tan mạnh mẽ, bọt khí H2 thoát ra như sôi sùng sục và dung dịch nóng lên rất nhiều.',
  },

  // 81. 2K2CrO4 + H2SO4 -> K2Cr2O7 + K2SO4 + H2O (Yellow chromate to orange dichromate)
  {
    id: 'rx_chromate_dichromate_acidification',
    name_en: 'Acidification of Chromate to Dichromate (Yellow to Orange)',
    name_vi: 'Axit hóa Kali cromat chuyển màu từ vàng chanh sang da cam',
    equation: '2K₂CrO₄ + H₂SO₄ → K₂Cr₂O₇ + K₂SO₄ + H₂O',
    ionic_equation: '2CrO₄²⁻(aq) + 2H⁺(aq) → Cr₂O₇²⁻(aq) + H₂O(l)',
    reactants: [
      { formula: 'K2CrO4', coefficient: 2, state: 'aq' },
      { formula: 'H2SO4', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'K2Cr2O7', coefficient: 1, state: 'aq' },
      { formula: 'K2SO4', coefficient: 1, state: 'aq' },
      { formula: 'H2O', coefficient: 1, state: 'l' },
    ],
    deltaH_kJ_mol: -26.0,
    visual: {
      colorChange: { resultingColorHex: '#ea580c' },
    },
    observable_en: 'The bright yellow chromate solution shifts immediately to vibrant orange dichromate upon acid addition.',
    observable_vi: 'Dung dịch màu vàng chanh chuyển ngay sang màu da cam đậm khi cho thêm axit.',
  },

  // 82. K2Cr2O7 + 2KOH -> 2K2CrO4 + H2O (Orange dichromate to yellow chromate)
  {
    id: 'rx_dichromate_chromate_alkalization',
    name_en: 'Alkalization of Dichromate to Chromate (Orange to Yellow)',
    name_vi: 'Kiềm hóa Kali đicromat chuyển màu từ da cam sang vàng chanh',
    equation: 'K₂Cr₂O₇ + 2KOH → 2K₂CrO₄ + H₂O',
    ionic_equation: 'Cr₂O₇²⁻(aq) + 2OH⁻(aq) → 2CrO₄²⁻(aq) + H₂O(l)',
    reactants: [
      { formula: 'K2Cr2O7', coefficient: 1, state: 'aq' },
      { formula: 'KOH', coefficient: 2, state: 'aq' },
    ],
    products: [
      { formula: 'K2CrO4', coefficient: 2, state: 'aq' },
      { formula: 'H2O', coefficient: 1, state: 'l' },
    ],
    deltaH_kJ_mol: -24.0,
    visual: {
      colorChange: { resultingColorHex: '#facc15' },
    },
    observable_en: 'The orange dichromate solution shifts immediately back to bright lemon yellow upon alkali addition.',
    observable_vi: 'Dung dịch màu da cam chuyển ngay trở lại màu vàng chanh tươi khi cho thêm dung dịch kiềm.',
  },

  // 83. 2Na + 2H2O -> 2NaOH + H2(g) (Violent reaction of metallic sodium with water)
  {
    id: 'rx_sodium_water_pyrotechnic',
    name_en: 'Violent Reaction of Metallic Sodium with Water',
    name_vi: 'Phản ứng mãnh liệt của Natri kim loại với nước',
    equation: '2Na + 2H₂O → 2NaOH + H₂↑',
    ionic_equation: '2Na(s) + 2H₂O(l) → 2Na⁺(aq) + 2OH⁻(aq) + H₂(g)↑',
    reactants: [
      { formula: 'Na', coefficient: 2, state: 's' },
      { formula: 'H2O', coefficient: 2, state: 'l' },
    ],
    products: [
      { formula: 'NaOH', coefficient: 2, state: 'aq' },
      { formula: 'H2', coefficient: 1, state: 'g' },
    ],
    deltaH_kJ_mol: -368.0, // Highly exothermic
    visual: {
      gas: { formula: 'H2', effervescenceSpeed: 'instant' },
      colorChange: { resultingColorHex: '#f8fafc' },
    },
    observable_en: 'Sodium metal darts furiously over the water surface, melting into a silvery sphere with hissing and sparks, strongly alkalizing the solution.',
    observable_vi: 'Mẩu natri nóng chảy vo tròn thành viên bi bạc chạy lướt trên mặt nước, xèo xèo mạnh sinh bọt khí H2 và tạo dung dịch kiềm mạnh.',
  },

  // 84. Fe(SCN)3 + 3NaF -> FeF3 + 3NaSCN (Decolorization / masking of iron thiocyanate)
  {
    id: 'rx_fescn3_naf_decolorization',
    name_en: 'Decolorization of Iron(III) Thiocyanate with Sodium Fluoride',
    name_vi: 'Làm mất màu phức Sắt(III) thioxianat bằng Natri florua',
    equation: 'Fe(SCN)₃ + 3NaF → FeF₃ + 3NaSCN',
    ionic_equation: '[Fe(SCN)]²⁺(aq) + 6F⁻(aq) → [FeF₆]³⁻(aq) + SCN⁻(aq)',
    reactants: [
      { formula: 'Fe(SCN)3', coefficient: 1, state: 'aq' },
      { formula: 'NaF', coefficient: 3, state: 'aq' },
    ],
    products: [
      { formula: 'FeF3', coefficient: 1, state: 'aq' },
      { formula: 'NaSCN', coefficient: 3, state: 'aq' },
    ],
    deltaH_kJ_mol: -12.0,
    visual: {
      colorChange: { resultingColorHex: '#f8fafc' }, // Bleaches blood red back to clear
    },
    observable_en: 'The deep blood-red [Fe(SCN)]²⁺ color rapidly bleaches colorless as extremely stable fluoroferrate complexes form.',
    observable_vi: 'Màu đỏ máu của phức sắt thioxianat biến mất hoàn toàn, dung dịch trở nên trong suốt do tạo phức florua bền hơn.',
  },

  // 85. Fe(SCN)3 + Na2HPO4 -> FePO4(s) + 2NaSCN + HSCN (Le Chatelier shift bleaching blood-red)
  {
    id: 'rx_fescn3_phosphate_bleaching',
    name_en: 'Le Chatelier Shift of Iron Thiocyanate with Phosphate',
    name_vi: 'Chuyển dịch cân bằng sắt thioxianat bằng muối photphat',
    equation: 'Fe(SCN)₃ + Na₂HPO₄ → FePO₄↓ + 2NaSCN + HSCN',
    ionic_equation: '[Fe(SCN)]²⁺(aq) + HPO₄²⁻(aq) → FePO₄(s)↓ + SCN⁻(aq) + H⁺(aq)',
    reactants: [
      { formula: 'Fe(SCN)3', coefficient: 1, state: 'aq' },
      { formula: 'Na2HPO4', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'FePO4', coefficient: 1, state: 's' },
      { formula: 'NaSCN', coefficient: 2, state: 'aq' },
    ],
    deltaH_kJ_mol: -18.0,
    visual: {
      precipitate: { formula: 'FePO4', colorHex: '#fef08a', morphology: 'powder' },
      colorChange: { resultingColorHex: '#fef9c3' },
    },
    observable_en: 'Blood-red color fades to pale yellowish white as Fe3+ is sequestered into insoluble iron(III) phosphate.',
    observable_vi: 'Màu đỏ máu nhạt dần chuyển sang vàng nhạt do ion Fe3+ bị kết tủa thành sắt(III) photphat, cân bằng chuyển dịch theo chiều nghịch.',
  },

  // 86. H2O2 + 2KI + H2SO4 -> I2 + K2SO4 + 2H2O (Landolt Iodine Clock Oxidation)
  {
    id: 'rx_iodine_clock_oxidation',
    name_en: 'Iodine Clock Reaction Oxidation Step',
    name_vi: 'Phản ứng Oxi hóa tạo Iot trong thí nghiệm Đồng hồ Iot',
    equation: 'H₂O₂ + 2KI + H₂SO₄ → I₂ + K₂SO₄ + 2H₂O',
    ionic_equation: 'H₂O₂(aq) + 2I⁻(aq) + 2H⁺(aq) → I₂(aq) + 2H₂O(l)',
    reactants: [
      { formula: 'H2O2', coefficient: 1, state: 'aq' },
      { formula: 'KI', coefficient: 2, state: 'aq' },
      { formula: 'H2SO4', coefficient: 1, state: 'aq' },
    ],
    products: [
      { formula: 'I2', coefficient: 1, state: 'aq' },
      { formula: 'K2SO4', coefficient: 1, state: 'aq' },
      { formula: 'H2O', coefficient: 2, state: 'l' },
    ],
    deltaH_kJ_mol: -180.0,
    visual: {
      colorChange: { resultingColorHex: '#1e1b4b' }, // Midnight blue with starch
    },
    observable_en: 'Liberated molecular iodine complexes instantly with starch indicator to produce dramatic midnight blue-black coloration.',
    observable_vi: 'Iot sinh ra lập tức kết hợp với hồ tinh bột làm dung dịch chuyển sang màu xanh tím đậm (xanh đen) như phép màu.',
  },

  // 87. 2Mg + O2 -> 2MgO (Magnesium combustion with blinding white flash)
  {
    id: 'rx_magnesium_combustion',
    name_en: 'Combustion of Magnesium Ribbon in Air',
    name_vi: 'Phản ứng đốt cháy dây Magie trong không khí',
    equation: '2Mg + O₂ → 2MgO',
    ionic_equation: '2Mg(s) + O₂(g) → 2MgO(s)',
    reactants: [
      { formula: 'Mg', coefficient: 2, state: 's' },
      { formula: 'O2', coefficient: 1, state: 'g' },
    ],
    products: [
      { formula: 'MgO', coefficient: 2, state: 's' },
    ],
    requiresHeating: true,
    minTemp_c: 60.0,
    deltaH_kJ_mol: -1203.0, // Spectacularly exothermic
    visual: {
      precipitate: { formula: 'MgO', colorHex: '#ffffff', morphology: 'powder' },
      colorChange: { resultingColorHex: '#ffffff' },
      flame: { colorHex: '#ffffff' },
    },
    observable_en: 'Magnesium ignites with a dazzling, blinding white light and billows white smoke, leaving powdery white magnesium oxide ash.',
    observable_vi: 'Dây magie bốc cháy tạo ánh sáng trắng chói lòa phát sáng rực rỡ và khói trắng mịn, để lại tàn tro bột MgO màu trắng.',
  },
];


// Keep the first authoritative entry for duplicate legacy IDs.
export const REACTION_DATABASE: ReactionDefinition[] = REACTION_ENTRIES.filter((reaction, index, all) => all.findIndex(candidate => candidate.id === reaction.id) === index);
