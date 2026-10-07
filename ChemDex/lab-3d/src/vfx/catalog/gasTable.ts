/**
 * gasTable.ts — Authoritative Gas & Fume Physical Properties (§4.0)
 * 
 * Defines optical absorption, condensation/aerosol status, density ratios vs air,
 * buoyancy, hazards, and Graham diffusion ratio calculation.
 */

export interface GasPhysicalEntry {
  species: string;
  formula: string;
  visible: boolean;
  colorHex?: string;
  colorHexDense?: string;
  opacityModel: 'none' | 'absorber' | 'aerosol' | 'particulate' | 'schlieren';
  absorptionCrossSection_sigma?: number;
  molarMass_g_mol: number;
  densityRatioAir: number; // M / 28.96 at 25 °C
  buoyancyBehavior: 'rises_fast' | 'rises' | 'neutral' | 'sinks_heavy' | 'cascades_very_heavy';
  flammable: boolean;
  toxicity: 'none' | 'irritant' | 'toxic' | 'asphyxiant' | 'lethal';
  odorTag_en: string;
  odorTag_vi: string;
  notes_en: string;
  notes_vi: string;
}

export const GAS_FUME_TABLE: Record<string, GasPhysicalEntry> = {
  H2: {
    species: 'H2',
    formula: 'H₂',
    visible: false,
    opacityModel: 'schlieren',
    molarMass_g_mol: 2.016,
    densityRatioAir: 0.07,
    buoyancyBehavior: 'rises_fast',
    flammable: true,
    toxicity: 'asphyxiant',
    odorTag_en: 'Odorless',
    odorTag_vi: 'Không mùi',
    notes_en: 'Rises rapidly, invisible. Squeaky pop when ignited with flame.',
    notes_vi: 'Bay lên rất nhanh, không màu. Nổ tiếng "bộp" đặc trưng khi gặp lửa.'
  },
  O2: {
    species: 'O2',
    formula: 'O₂',
    visible: false,
    opacityModel: 'none',
    molarMass_g_mol: 31.999,
    densityRatioAir: 1.10,
    buoyancyBehavior: 'neutral',
    flammable: false,
    toxicity: 'none',
    odorTag_en: 'Odorless',
    odorTag_vi: 'Không mùi',
    notes_en: 'Slightly heavier than air. Relights a glowing splint.',
    notes_vi: 'Nặng hơn không khí một chút. Làm bùng cháy que đóm còn tàn đỏ.'
  },
  CO2: {
    species: 'CO2',
    formula: 'CO₂',
    visible: false,
    colorHex: '#e8f0f5', // Aerosol fog only when cold / from dry ice
    opacityModel: 'none',
    molarMass_g_mol: 44.01,
    densityRatioAir: 1.52,
    buoyancyBehavior: 'sinks_heavy',
    flammable: false,
    toxicity: 'asphyxiant',
    odorTag_en: 'Odorless, slightly acidic',
    odorTag_vi: 'Không mùi, vị chua nhẹ',
    notes_en: 'Sinks and pools in lower vessels. Extinguishes flame. Turns limewater milky.',
    notes_vi: 'Chìm xuống đáy bình, làm tắt que đóm. Làm đục nước vôi trong.'
  },
  Cl2: {
    species: 'Cl2',
    formula: 'Cl₂',
    visible: true,
    colorHex: '#c6d84a',
    colorHexDense: '#9fb52a',
    opacityModel: 'absorber',
    absorptionCrossSection_sigma: 0.9,
    molarMass_g_mol: 70.90,
    densityRatioAir: 2.45,
    buoyancyBehavior: 'sinks_heavy',
    flammable: false,
    toxicity: 'toxic',
    odorTag_en: 'Pungent, suffocating bleach-like',
    odorTag_vi: 'Mùi hắc nồng, xốc sực như thuốc tẩy',
    notes_en: 'Heavy yellow-green gas, hugs table surface. Toxic, bleaches damp litmus.',
    notes_vi: 'Khí màu vàng lục nặng, là là mặt bàn. Độc, tẩy màu quỳ tím ẩm.'
  },
  Br2: {
    species: 'Br2',
    formula: 'Br₂',
    visible: true,
    colorHex: '#a8321c',
    colorHexDense: '#6e1d10',
    opacityModel: 'absorber',
    absorptionCrossSection_sigma: 1.3,
    molarMass_g_mol: 159.81,
    densityRatioAir: 5.52,
    buoyancyBehavior: 'cascades_very_heavy',
    flammable: false,
    toxicity: 'toxic',
    odorTag_en: 'Choking, pungent halogen odor',
    odorTag_vi: 'Mùi cay hắc nghẹt thở',
    notes_en: 'Extremely dense red-brown vapor, pours downward like liquid. Highly corrosive.',
    notes_vi: 'Hơi màu nâu đỏ rất nặng, rót chảy xuống như chất lỏng. Ăn mòn da mạnh.'
  },
  I2: {
    species: 'I2',
    formula: 'I₂',
    visible: true,
    colorHex: '#7a3fa8',
    colorHexDense: '#4b1f73',
    opacityModel: 'absorber',
    absorptionCrossSection_sigma: 1.1,
    molarMass_g_mol: 253.81,
    densityRatioAir: 8.76,
    buoyancyBehavior: 'cascades_very_heavy',
    flammable: false,
    toxicity: 'irritant',
    odorTag_en: 'Sharp, iodine medicinal odor',
    odorTag_vi: 'Mùi cồn i-ốt sát trùng đặc trưng',
    notes_en: 'Deep violet vapor from sublimation. Deposits dark lustrous crystals on cold glass.',
    notes_vi: 'Hơi màu tím thẫm do thăng hoa. Đọng lại tinh thể ánh kim đen tím trên kính lạnh.'
  },
  NO2: {
    species: 'NO2',
    formula: 'NO₂',
    visible: true,
    colorHex: '#b8501a',
    colorHexDense: '#7a2f0a',
    opacityModel: 'absorber',
    absorptionCrossSection_sigma: 1.0,
    molarMass_g_mol: 46.01,
    densityRatioAir: 1.59,
    buoyancyBehavior: 'sinks_heavy',
    flammable: false,
    toxicity: 'toxic',
    odorTag_en: 'Pungent, biting nitric odor',
    odorTag_vi: 'Mùi hắc gắt đặc trưng của axit nitric',
    notes_en: 'Red-brown toxic gas from Cu + conc. HNO3. Temperature dependent color (dimerizes to N2O4).',
    notes_vi: 'Khí màu nâu đỏ độc hại. Màu đậm dần khi nóng và nhạt dần khi làm lạnh.'
  },
  NO: {
    species: 'NO',
    formula: 'NO',
    visible: false,
    colorHex: '#b8501a', // Brown when oxidized at mouth
    opacityModel: 'none',
    molarMass_g_mol: 30.01,
    densityRatioAir: 1.04,
    buoyancyBehavior: 'neutral',
    flammable: false,
    toxicity: 'toxic',
    odorTag_en: 'Odorless initially, biting when oxidized',
    odorTag_vi: 'Ban đầu không mùi, hắc gắt khi hóa nâu',
    notes_en: 'Colorless inside vessel; turns red-brown NO2 instantly upon contact with atmospheric O2.',
    notes_vi: 'Không màu trong bình; ngay lập tức hóa nâu đỏ NO₂ khi tiếp xúc oxy không khí ở miệng bình.'
  },
  SO2: {
    species: 'SO2',
    formula: 'SO₂',
    visible: false,
    colorHex: '#f1f5f9',
    opacityModel: 'none',
    molarMass_g_mol: 64.07,
    densityRatioAir: 2.21,
    buoyancyBehavior: 'sinks_heavy',
    flammable: false,
    toxicity: 'toxic',
    odorTag_en: 'Pungent, burning sulfur matches',
    odorTag_vi: 'Mùi hắc nồng que diêm cháy',
    notes_en: 'Heavy suffocating gas. Faint haze in moist air. Turns moist litmus paper red.',
    notes_vi: 'Khí nặng, mùi hắc gây ngạt. Làm quỳ tím ẩm hóa đỏ.'
  },
  H2S: {
    species: 'H2S',
    formula: 'H₂S',
    visible: false,
    opacityModel: 'none',
    molarMass_g_mol: 34.08,
    densityRatioAir: 1.18,
    buoyancyBehavior: 'sinks_heavy',
    flammable: true,
    toxicity: 'toxic',
    odorTag_en: 'Foul rotten-egg odor',
    odorTag_vi: 'Mùi trứng thối đặc trưng',
    notes_en: 'Colorless toxic gas. Blackens lead(II) acetate paper with PbS precipitate.',
    notes_vi: 'Khí độc không màu. Làm đen giấy tẩm chì axetat tạo kết tủa PbS.'
  },
  NH3: {
    species: 'NH3',
    formula: 'NH₃',
    visible: false,
    opacityModel: 'schlieren',
    molarMass_g_mol: 17.03,
    densityRatioAir: 0.59,
    buoyancyBehavior: 'rises',
    flammable: false,
    toxicity: 'irritant',
    odorTag_en: 'Sharp, pungent ammonia smell',
    odorTag_vi: 'Mùi khai nồng xộc mũi',
    notes_en: 'Light gas, rises rapidly. Highly soluble in water. Turns moist red litmus blue.',
    notes_vi: 'Khí nhẹ hơn không khí, bay lên nhanh. Rất tan trong nước. Làm quỳ tím ẩm hóa xanh.'
  },
  HCl: {
    species: 'HCl',
    formula: 'HCl',
    visible: false,
    colorHex: '#f8fafc',
    opacityModel: 'aerosol',
    molarMass_g_mol: 36.46,
    densityRatioAir: 1.26,
    buoyancyBehavior: 'sinks_heavy',
    flammable: false,
    toxicity: 'corrosive' as any,
    odorTag_en: 'Pungent acid vapor',
    odorTag_vi: 'Mùi axit xộc hắc',
    notes_en: 'Fumes white aerosol droplets in humid air. Dense, rolls over bottle mouth.',
    notes_vi: 'Bốc khói trắng trong không khí ẩm do tạo vi giọt axit. Khí nặng tràn qua miệng lọ.'
  },
  NH4Cl: {
    species: 'NH4Cl',
    formula: 'NH₄Cl',
    visible: true,
    colorHex: '#f8fafc',
    opacityModel: 'particulate',
    molarMass_g_mol: 53.49,
    densityRatioAir: 1.85,
    buoyancyBehavior: 'neutral',
    flammable: false,
    toxicity: 'irritant',
    odorTag_en: 'Faint ammoniacal smoke',
    odorTag_vi: 'Khói trắng hơi khai',
    notes_en: 'Dense white particulate smoke where gaseous NH3 and HCl meet.',
    notes_vi: 'Khói trắng dày đặc gồm vi tinh thể muối khi khí NH₃ và HCl gặp nhau.'
  },
  SO3: {
    species: 'SO3',
    formula: 'SO₃',
    visible: true,
    colorHex: '#ffffff',
    opacityModel: 'aerosol',
    molarMass_g_mol: 80.06,
    densityRatioAir: 2.76,
    buoyancyBehavior: 'sinks_heavy',
    flammable: false,
    toxicity: 'toxic',
    odorTag_en: 'Extremely choking acid fumes',
    odorTag_vi: 'Khói axit nồng nghẹt',
    notes_en: 'Dense white oleum fumes. Reacts violently with water droplets.',
    notes_vi: 'Khói trắng oleum dày đặc, phản ứng mãnh liệt tỏa nhiệt với hơi ẩm.'
  },
  Steam: {
    species: 'Steam',
    formula: 'H₂O(l)',
    visible: true,
    colorHex: '#ffffff',
    opacityModel: 'aerosol',
    molarMass_g_mol: 18.015,
    densityRatioAir: 0.62,
    buoyancyBehavior: 'rises',
    flammable: false,
    toxicity: 'none',
    odorTag_en: 'Odorless',
    odorTag_vi: 'Không mùi',
    notes_en: 'Visible white fog of condensed liquid droplets with a clear gap near hot surface.',
    notes_vi: 'Màn sương trắng gồm các hạt nước ngưng tụ, có khoảng trống trong suốt sát bề mặt nóng.'
  },
  MgO_smoke: {
    species: 'MgO',
    formula: 'MgO(s)',
    visible: true,
    colorHex: '#ffffff',
    opacityModel: 'particulate',
    molarMass_g_mol: 40.30,
    densityRatioAir: 1.39,
    buoyancyBehavior: 'rises',
    flammable: false,
    toxicity: 'none',
    odorTag_en: 'Burning metal smoke',
    odorTag_vi: 'Khói bột oxit kim loại cháy',
    notes_en: 'Dense blinding white smoke rising from burning magnesium ribbon.',
    notes_vi: 'Khói trắng dày bốc lên từ ngọn lửa chói lòa khi đốt dây magie.'
  },
  Soot: {
    species: 'C_soot',
    formula: 'C(s)',
    visible: true,
    colorHex: '#111418',
    opacityModel: 'particulate',
    molarMass_g_mol: 12.01,
    densityRatioAir: 1.0,
    buoyancyBehavior: 'rises',
    flammable: false,
    toxicity: 'irritant',
    odorTag_en: 'Smoky, charred soot',
    odorTag_vi: 'Mùi muội than khét',
    notes_en: 'Black carbon smoke from incomplete combustion. Deposits black ring on glass.',
    notes_vi: 'Khói đen mịn từ quá trình cháy không hoàn toàn, tạo vết muội đen trên thủy tinh.'
  },
  N2: {
    species: 'N2',
    formula: 'N₂',
    visible: false,
    opacityModel: 'none',
    molarMass_g_mol: 28.013,
    densityRatioAir: 0.97,
    buoyancyBehavior: 'neutral',
    flammable: false,
    toxicity: 'asphyxiant',
    odorTag_en: 'Odorless',
    odorTag_vi: 'Không mùi',
    notes_en: 'Major component of air. Colorless, odorless, chemically inert at room temp.',
    notes_vi: 'Thành phần chính của không khí, không màu, không mùi, trơ về mặt hóa học ở nhiệt độ phòng.'
  },
  CH4: {
    species: 'CH4',
    formula: 'CH₄',
    visible: false,
    opacityModel: 'schlieren',
    molarMass_g_mol: 16.04,
    densityRatioAir: 0.55,
    buoyancyBehavior: 'rises',
    flammable: true,
    toxicity: 'asphyxiant',
    odorTag_en: 'Odorless gas (sweetish)',
    odorTag_vi: 'Không mùi, cháy ngọn lửa xanh',
    notes_en: 'Lighter than air, rises rapidly. Highly flammable hydrocarbon.',
    notes_vi: 'Nhẹ hơn không khí, bay lên nhanh. Khí mê-tan dễ cháy nổ.'
  }
};

/**
 * Computes gas density ratio relative to dry air (28.96 g/mol at 25 °C, 1 atm):
 * rho_g / rho_air = (M / 28.96) * (298.15 / T_K) * (P / 1 atm)
 */
export function calculateGasDensityRatioAir(molarMass: number, tempK: number = 298.15, pressureAtm: number = 1.0): number {
  return (molarMass / 28.96) * (298.15 / tempK) * pressureAtm;
}

/**
 * Computes the Graham's law diffusion distance ratio between two gases:
 * d1 / d2 = sqrt(M2 / M1)
 */
export function calculateGrahamsRatio(molarMass1: number, molarMass2: number): number {
  if (molarMass1 <= 0 || molarMass2 <= 0) return 1.0;
  return Math.sqrt(molarMass2 / molarMass1);
}

/**
 * Theoretical Graham ratio for NH3 and HCl:
 * d_NH3 / d_HCl = sqrt(36.46 / 17.03) = 1.463
 */
export const GRAHAM_NH3_HCL_RATIO = calculateGrahamsRatio(17.03, 36.46);
