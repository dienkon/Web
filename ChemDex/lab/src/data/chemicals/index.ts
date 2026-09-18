import { ChemicalDefinition } from '../../types/chemistry';

export const CHEMICAL_LIBRARY: Record<string, ChemicalDefinition> = {
  // ACIDS
  HCl: {
    id: 'HCl',
    formula: 'HCl',
    nameEn: 'Hydrochloric acid',
    nameVi: 'Axit clohidric',
    category: 'acid',
    phase: 'aqueous',
    molarMass: 36.46,
    density: 1.18,
    defaultConcentration: 1.0, // 1M
    defaultColor: { r: 215, g: 235, b: 250, a: 0.38, hex: '#d7ebfa' },
    pHContribution: 0.0,
    hazards: ['corrosive', 'toxic'],
    requiredPPE: ['safety_goggles', 'lab_coat', 'nitrile_gloves'],
    wasteClass: 'acid_waste',
    storageNotesVi: 'Bảo quản nơi thoáng gió, tránh xa bazơ và kim loại hoạt động mạnh.'
  },
  H2SO4: {
    id: 'H2SO4',
    formula: 'H₂SO₄',
    nameEn: 'Sulfuric acid',
    nameVi: 'Axit sunfuric',
    category: 'acid',
    phase: 'aqueous',
    molarMass: 98.08,
    density: 1.84,
    defaultConcentration: 1.0,
    defaultColor: { r: 215, g: 235, b: 250, a: 0.42, hex: '#d7ebfa' },
    pHContribution: 0.0,
    hazards: ['corrosive', 'oxidizer'],
    requiredPPE: ['safety_goggles', 'lab_coat', 'nitrile_gloves', 'face_shield'],
    wasteClass: 'acid_waste',
    storageNotesVi: 'Cực kỳ háo nước. Tuyệt đối rót từ từ axit vào nước, không làm ngược lại!'
  },
  HNO3: {
    id: 'HNO3',
    formula: 'HNO₃',
    nameEn: 'Nitric acid',
    nameVi: 'Axit nitric',
    category: 'acid',
    phase: 'aqueous',
    molarMass: 63.01,
    density: 1.42,
    defaultConcentration: 1.0,
    defaultColor: { r: 255, g: 250, b: 235, a: 0.15, hex: '#fffbeb' },
    pHContribution: 0.0,
    hazards: ['corrosive', 'oxidizer', 'toxic'],
    requiredPPE: ['safety_goggles', 'lab_coat', 'nitrile_gloves'],
    wasteClass: 'acid_waste',
    storageNotesVi: 'Bảo quản trong chai thủy tinh sẫm màu tránh ánh sáng.'
  },
  CH3COOH: {
    id: 'CH3COOH',
    formula: 'CH₃COOH',
    nameEn: 'Acetic acid',
    nameVi: 'Axit axetic (Giấm ăn)',
    category: 'acid',
    phase: 'aqueous',
    molarMass: 60.05,
    density: 1.05,
    defaultConcentration: 1.0,
    defaultColor: { r: 250, g: 250, b: 250, a: 0.1, hex: '#fafafa' },
    pHContribution: 2.4,
    hazards: ['corrosive', 'flammable'],
    requiredPPE: ['safety_goggles', 'lab_coat'],
    wasteClass: 'acid_waste',
    storageNotesVi: 'Axit yếu, có mùi giấm đặc trưng.'
  },

  // BASES
  NaOH: {
    id: 'NaOH',
    formula: 'NaOH',
    nameEn: 'Sodium hydroxide',
    nameVi: 'Natri hidroxit (Xút)',
    category: 'base',
    phase: 'aqueous',
    molarMass: 39.997,
    density: 2.13,
    defaultConcentration: 1.0,
    defaultColor: { r: 215, g: 235, b: 250, a: 0.38, hex: '#d7ebfa' },
    pHContribution: 14.0,
    hazards: ['corrosive'],
    requiredPPE: ['safety_goggles', 'lab_coat', 'nitrile_gloves'],
    wasteClass: 'base_waste',
    storageNotesVi: 'Dễ chảy rữa và hút khí CO₂ trong không khí. Đóng kín nắp sau khi dùng.'
  },
  KOH: {
    id: 'KOH',
    formula: 'KOH',
    nameEn: 'Potassium hydroxide',
    nameVi: 'Kali hidroxit',
    category: 'base',
    phase: 'aqueous',
    molarMass: 56.11,
    defaultConcentration: 1.0,
    defaultColor: { r: 215, g: 235, b: 250, a: 0.38, hex: '#d7ebfa' },
    pHContribution: 14.0,
    hazards: ['corrosive'],
    requiredPPE: ['safety_goggles', 'lab_coat', 'nitrile_gloves'],
    wasteClass: 'base_waste'
  },
  BaOH2: {
    id: 'BaOH2',
    formula: 'Ba(OH)₂',
    nameEn: 'Barium hydroxide',
    nameVi: 'Bari hidroxit',
    category: 'base',
    phase: 'aqueous',
    molarMass: 171.34,
    defaultConcentration: 0.5,
    defaultColor: { r: 250, g: 250, b: 255, a: 0.1, hex: '#fafaff' },
    pHContribution: 13.7,
    hazards: ['corrosive', 'toxic'],
    requiredPPE: ['safety_goggles', 'lab_coat', 'nitrile_gloves'],
    wasteClass: 'heavy_metal_waste'
  },
  CaOH2: {
    id: 'CaOH2',
    formula: 'Ca(OH)₂',
    nameEn: 'Calcium hydroxide',
    nameVi: 'Nước vôi trong',
    category: 'base',
    phase: 'aqueous',
    molarMass: 74.09,
    defaultConcentration: 0.02,
    defaultColor: { r: 255, g: 255, b: 255, a: 0.12, hex: '#ffffff' },
    pHContribution: 12.4,
    hazards: ['irritant'],
    requiredPPE: ['safety_goggles', 'lab_coat'],
    wasteClass: 'base_waste'
  },
  NH3: {
    id: 'NH3',
    formula: 'NH₃',
    nameEn: 'Ammonia solution',
    nameVi: 'Dung dịch amoniac',
    category: 'base',
    phase: 'aqueous',
    molarMass: 17.03,
    defaultConcentration: 1.0,
    defaultColor: { r: 250, g: 250, b: 255, a: 0.1, hex: '#fafaff' },
    pHContribution: 11.6,
    hazards: ['corrosive', 'toxic'],
    requiredPPE: ['safety_goggles', 'lab_coat', 'fume_hood'],
    wasteClass: 'base_waste'
  },

  // SALTS
  CuSO4: {
    id: 'CuSO4',
    formula: 'CuSO₄',
    nameEn: 'Copper(II) sulfate',
    nameVi: 'Đồng(II) sunfat',
    category: 'salt',
    phase: 'aqueous',
    molarMass: 159.61,
    defaultConcentration: 0.5,
    defaultColor: { r: 14, g: 165, b: 233, a: 0.7, hex: '#0ea5e9' }, // vibrant clear blue
    pHContribution: 4.5,
    hazards: ['toxic', 'environmental_hazard'],
    requiredPPE: ['safety_goggles', 'lab_coat', 'nitrile_gloves'],
    wasteClass: 'heavy_metal_waste',
    storageNotesVi: 'Dung dịch có màu xanh lam đặc trưng của ion Cu²⁺.'
  },
  FeSO4: {
    id: 'FeSO4',
    formula: 'FeSO₄',
    nameEn: 'Iron(II) sulfate',
    nameVi: 'Sắt(II) sunfat',
    category: 'salt',
    phase: 'aqueous',
    molarMass: 151.91,
    defaultConcentration: 0.5,
    defaultColor: { r: 134, g: 239, b: 172, a: 0.5, hex: '#86efac' }, // pale green
    pHContribution: 4.0,
    hazards: ['irritant'],
    requiredPPE: ['safety_goggles', 'lab_coat'],
    wasteClass: 'heavy_metal_waste'
  },
  FeCl3: {
    id: 'FeCl3',
    formula: 'FeCl₃',
    nameEn: 'Iron(III) chloride',
    nameVi: 'Sắt(III) clorua',
    category: 'salt',
    phase: 'aqueous',
    molarMass: 162.2,
    defaultConcentration: 0.5,
    defaultColor: { r: 202, g: 138, b: 4, a: 0.7, hex: '#ca8a04' }, // yellow-brown
    pHContribution: 2.0,
    hazards: ['corrosive', 'irritant'],
    requiredPPE: ['safety_goggles', 'lab_coat', 'nitrile_gloves'],
    wasteClass: 'heavy_metal_waste'
  },
  AgNO3: {
    id: 'AgNO3',
    formula: 'AgNO₃',
    nameEn: 'Silver nitrate',
    nameVi: 'Bạc nitrat',
    category: 'salt',
    phase: 'aqueous',
    molarMass: 169.87,
    defaultConcentration: 0.1,
    defaultColor: { r: 245, g: 250, b: 255, a: 0.1, hex: '#f5faff' },
    pHContribution: 6.0,
    hazards: ['corrosive', 'oxidizer', 'environmental_hazard'],
    requiredPPE: ['safety_goggles', 'lab_coat', 'nitrile_gloves'],
    wasteClass: 'heavy_metal_waste',
    storageNotesVi: 'Để dính vào da sẽ tạo vết đen do Ag kim loại giải phóng.'
  },
  BaCl2: {
    id: 'BaCl2',
    formula: 'BaCl₂',
    nameEn: 'Barium chloride',
    nameVi: 'Bari clorua',
    category: 'salt',
    phase: 'aqueous',
    molarMass: 208.23,
    defaultConcentration: 0.5,
    defaultColor: { r: 250, g: 250, b: 255, a: 0.1, hex: '#fafaff' },
    pHContribution: 6.5,
    hazards: ['toxic'],
    requiredPPE: ['safety_goggles', 'lab_coat', 'nitrile_gloves'],
    wasteClass: 'heavy_metal_waste',
    storageNotesVi: 'Hợp chất hòa tan của Bari có độc tính cao, dùng nhận biết ion sunfat.'
  },
  PbNO32: {
    id: 'PbNO32',
    formula: 'Pb(NO₃)₂',
    nameEn: 'Lead(II) nitrate',
    nameVi: 'Chì(II) nitrat',
    category: 'salt',
    phase: 'aqueous',
    molarMass: 331.2,
    defaultConcentration: 0.2,
    defaultColor: { r: 250, g: 250, b: 255, a: 0.1, hex: '#fafaff' },
    pHContribution: 4.5,
    hazards: ['toxic', 'environmental_hazard'],
    requiredPPE: ['safety_goggles', 'lab_coat', 'nitrile_gloves'],
    wasteClass: 'heavy_metal_waste'
  },
  KI: {
    id: 'KI',
    formula: 'KI',
    nameEn: 'Potassium iodide',
    nameVi: 'Kali iotua',
    category: 'salt',
    phase: 'aqueous',
    molarMass: 166.0,
    defaultConcentration: 0.5,
    defaultColor: { r: 250, g: 250, b: 255, a: 0.1, hex: '#fafaff' },
    pHContribution: 7.0,
    hazards: ['irritant'],
    requiredPPE: ['safety_goggles', 'lab_coat'],
    wasteClass: 'neutral_drain'
  },
  NaCl: {
    id: 'NaCl',
    formula: 'NaCl',
    nameEn: 'Sodium chloride',
    nameVi: 'Natri clorua (Muối ăn)',
    category: 'salt',
    phase: 'aqueous',
    molarMass: 58.44,
    defaultConcentration: 1.0,
    defaultColor: { r: 250, g: 250, b: 255, a: 0.08, hex: '#fafaff' },
    pHContribution: 7.0,
    hazards: ['none'],
    requiredPPE: ['safety_goggles'],
    wasteClass: 'neutral_drain'
  },
  Na2SO4: {
    id: 'Na2SO4',
    formula: 'Na₂SO₄',
    nameEn: 'Sodium sulfate',
    nameVi: 'Natri sunfat',
    category: 'salt',
    phase: 'aqueous',
    molarMass: 142.04,
    defaultConcentration: 0.5,
    defaultColor: { r: 250, g: 250, b: 255, a: 0.08, hex: '#fafaff' },
    pHContribution: 7.0,
    hazards: ['none'],
    requiredPPE: ['safety_goggles'],
    wasteClass: 'neutral_drain'
  },
  Na2CO3: {
    id: 'Na2CO3',
    formula: 'Na₂CO₃',
    nameEn: 'Sodium carbonate',
    nameVi: 'Natri cacbonat (Soda)',
    category: 'salt',
    phase: 'aqueous',
    molarMass: 105.99,
    defaultConcentration: 0.5,
    defaultColor: { r: 250, g: 250, b: 255, a: 0.08, hex: '#fafaff' },
    pHContribution: 11.5,
    hazards: ['irritant'],
    requiredPPE: ['safety_goggles', 'lab_coat'],
    wasteClass: 'base_waste'
  },
  KMnO4: {
    id: 'KMnO4',
    formula: 'KMnO₄',
    nameEn: 'Potassium permanganate',
    nameVi: 'Thuốc tím',
    category: 'salt',
    phase: 'aqueous',
    molarMass: 158.03,
    defaultConcentration: 0.05,
    defaultColor: { r: 147, g: 51, b: 234, a: 0.85, hex: '#9333ea' }, // deep purple
    pHContribution: 7.0,
    hazards: ['oxidizer', 'environmental_hazard'],
    requiredPPE: ['safety_goggles', 'lab_coat', 'nitrile_gloves'],
    wasteClass: 'heavy_metal_waste'
  },

  // SOLIDS & METALS
  CaCO3: {
    id: 'CaCO3',
    formula: 'CaCO₃',
    nameEn: 'Calcium carbonate',
    nameVi: 'Canxi cacbonat (Đá vôi)',
    category: 'salt',
    phase: 'solid',
    molarMass: 100.09,
    density: 2.71,
    defaultColor: { r: 248, g: 250, b: 252, a: 1.0, hex: '#f8fafc' }, // white solid chips
    hazards: ['none'],
    requiredPPE: ['safety_goggles'],
    wasteClass: 'neutral_drain'
  },
  Fe: {
    id: 'Fe',
    formula: 'Fe',
    nameEn: 'Iron (Nail / Powder)',
    nameVi: 'Đinh sắt / Bột sắt',
    category: 'metal',
    phase: 'solid',
    molarMass: 55.845,
    density: 7.87,
    defaultColor: { r: 71, g: 85, b: 105, a: 1.0, hex: '#475569' }, // metallic dark gray
    hazards: ['none'],
    requiredPPE: ['safety_goggles'],
    wasteClass: 'neutral_drain'
  },
  Zn: {
    id: 'Zn',
    formula: 'Zn',
    nameEn: 'Zinc (Granules)',
    nameVi: 'Kẽm hạt',
    category: 'metal',
    phase: 'solid',
    molarMass: 65.38,
    density: 7.14,
    defaultColor: { r: 148, g: 163, b: 184, a: 1.0, hex: '#94a3b8' }, // zinc silver
    hazards: ['environmental_hazard'],
    requiredPPE: ['safety_goggles'],
    wasteClass: 'heavy_metal_waste'
  },
  Cu: {
    id: 'Cu',
    formula: 'Cu',
    nameEn: 'Copper (Sheet / Wire)',
    nameVi: 'Đồng miếng / Dây đồng',
    category: 'metal',
    phase: 'solid',
    molarMass: 63.546,
    density: 8.96,
    defaultColor: { r: 217, g: 119, b: 6, a: 1.0, hex: '#d97706' }, // reddish copper
    hazards: ['none'],
    requiredPPE: ['safety_goggles'],
    wasteClass: 'neutral_drain'
  },
  Mg: {
    id: 'Mg',
    formula: 'Mg',
    nameEn: 'Magnesium (Ribbon)',
    nameVi: 'Dải Magie',
    category: 'metal',
    phase: 'solid',
    molarMass: 24.305,
    density: 1.74,
    defaultColor: { r: 203, g: 213, b: 225, a: 1.0, hex: '#cbd5e1' }, // shiny silver
    hazards: ['flammable'],
    requiredPPE: ['safety_goggles', 'lab_coat'],
    wasteClass: 'neutral_drain'
  },

  // SOLVENTS
  H2O: {
    id: 'H2O',
    formula: 'H₂O',
    nameEn: 'Distilled water',
    nameVi: 'Nước cất',
    category: 'solvent',
    phase: 'liquid',
    molarMass: 18.015,
    density: 1.0,
    defaultColor: { r: 240, g: 249, b: 255, a: 0.08, hex: '#f0f9ff' },
    pHContribution: 7.0,
    hazards: ['none'],
    requiredPPE: [],
    wasteClass: 'neutral_drain'
  },

  // INDICATORS
  Phenolphthalein: {
    id: 'Phenolphthalein',
    formula: 'Phenolphthalein',
    nameEn: 'Phenolphthalein solution',
    nameVi: 'Chỉ thị Phenolphthalein',
    category: 'indicator',
    phase: 'liquid',
    molarMass: 318.32,
    defaultColor: { r: 255, g: 255, b: 255, a: 0.05, hex: '#ffffff' },
    pHContribution: 7.0,
    hazards: ['none'],
    requiredPPE: ['safety_goggles'],
    wasteClass: 'neutral_drain',
    isIndicator: true,
    storageNotesVi: 'Không màu trong môi trường axit và trung tính; chuyển màu hồng đậm/tím trong môi trường kiềm (pH > 8.3).'
  },
  Litmus: {
    id: 'Litmus',
    formula: 'Litmus',
    nameEn: 'Litmus solution',
    nameVi: 'Dung dịch quỳ tím',
    category: 'indicator',
    phase: 'liquid',
    molarMass: 330.0,
    defaultColor: { r: 168, g: 85, b: 247, a: 0.4, hex: '#a855f7' }, // purple
    pHContribution: 7.0,
    hazards: ['none'],
    requiredPPE: ['safety_goggles'],
    wasteClass: 'neutral_drain',
    isIndicator: true,
    storageNotesVi: 'Đổi màu đỏ trong axit (pH < 4.5), màu tím ở trung tính (5.0 - 8.0), màu xanh lam trong bazơ (pH > 8.3).'
  }
};

/**
 * Normalizes user/formula inputs into canonical chemical ID
 */
export function normalizeChemicalId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  
  // Direct match
  if (CHEMICAL_LIBRARY[trimmed]) return trimmed;

  // Formula string normalization (handling subscript unicode like ₂ -> 2)
  const asciiFormula = trimmed
    .replace(/₀/g, '0').replace(/₁/g, '1').replace(/₂/g, '2')
    .replace(/₃/g, '3').replace(/₄/g, '4').replace(/₅/g, '5')
    .replace(/₆/g, '6').replace(/₇/g, '7').replace(/₈/g, '8').replace(/₉/g, '9');

  for (const [id, chem] of Object.entries(CHEMICAL_LIBRARY)) {
    if (id.toLowerCase() === trimmed.toLowerCase()) return id;
    if (id.toLowerCase() === asciiFormula.toLowerCase()) return id;
    if (chem.formula.toLowerCase() === trimmed.toLowerCase()) return id;
    if (chem.nameEn.toLowerCase() === trimmed.toLowerCase()) return id;
    if (chem.nameVi.toLowerCase() === trimmed.toLowerCase()) return id;
  }

  // Alias maps
  const aliases: Record<string, string> = {
    'hydrochloric': 'HCl',
    'hydrochloric acid': 'HCl',
    'axit clohidric': 'HCl',
    'sulfuric': 'H2SO4',
    'sulfuric acid': 'H2SO4',
    'sodium hydroxide': 'NaOH',
    'natri hidroxit': 'NaOH',
    'xut': 'NaOH',
    'xút': 'NaOH',
    'copper sulfate': 'CuSO4',
    'dong sunfat': 'CuSO4',
    'water': 'H2O',
    'nuoc': 'H2O',
    'nước': 'H2O',
    'phenolphthalein': 'Phenolphthalein',
    'pp': 'Phenolphthalein',
    'quy tim': 'Litmus',
    'quỳ tím': 'Litmus',
    'litmus': 'Litmus'
  };

  const lower = trimmed.toLowerCase();
  if (aliases[lower]) return aliases[lower];

  return null;
}
