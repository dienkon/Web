/**
 * precipitates.ts — Authoritative Morphology and Physical Precipitation Properties (§6.5)
 * 
 * Drives physical sedimentation, bed compaction, particle sizing,
 * and solubility-driven crystallization.
 */

import { PrecipMorphology } from '../vfx/catalog/vocab';

export interface PrecipitateProperty {
  formula: string;
  name_en: string;
  name_vi: string;
  ksp_25c: number | null;
  colorHex: string;
  morphology: PrecipMorphology;
  particleRadius_um_range: [number, number];
  density_g_cm3: number;
  packingFraction_phi: number; // Bed volume porosity multiplier: V_bed = mass / (rho * phi)
  amphoteric?: boolean;
  reversibleHeat?: boolean;
  photodarkening?: boolean;
  specialNotes_en: string;
  specialNotes_vi: string;
}

export const PRECIPITATES_DATABASE: Record<string, PrecipitateProperty> = {
  BaSO4: {
    formula: 'BaSO4',
    name_en: 'Barium Sulfate',
    name_vi: 'Bari sunfat',
    ksp_25c: 1.1e-10,
    colorHex: '#ffffff',
    morphology: 'fine_powder',
    particleRadius_um_range: [0.3, 1.0],
    density_g_cm3: 4.50,
    packingFraction_phi: 0.35,
    specialNotes_en: 'Settles over hours (Stokes r~0.5 um). Highly insoluble, no redissolution.',
    specialNotes_vi: 'Lắng chậm hàng giờ (bột cực mịn). Rất trơ, không tan trong axit loãng.'
  },
  AgCl: {
    formula: 'AgCl',
    name_en: 'Silver Chloride',
    name_vi: 'Bạc clorua',
    ksp_25c: 1.8e-10,
    colorHex: '#ffffff',
    morphology: 'curd',
    particleRadius_um_range: [1.0, 5.0],
    density_g_cm3: 5.56,
    packingFraction_phi: 0.15,
    photodarkening: true,
    specialNotes_en: 'Curdy white clumps. Darkens to purple-gray in light. Dissolves in aqueous NH3.',
    specialNotes_vi: 'Kết tủa vón trắng như sữa chua. Hóa tím xám dưới ánh sáng. Tan trong dung dịch NH₃ tạo phức.'
  },
  AgBr: {
    formula: 'AgBr',
    name_en: 'Silver Bromide',
    name_vi: 'Bạc bromua',
    ksp_25c: 5.4e-13,
    colorHex: '#fef08a', // Pale cream
    morphology: 'curd',
    particleRadius_um_range: [1.0, 5.0],
    density_g_cm3: 6.47,
    packingFraction_phi: 0.15,
    photodarkening: true,
    specialNotes_en: 'Pale cream curdy clumps. Slowly darkens in light. Sparingly soluble in NH3.',
    specialNotes_vi: 'Kết tủa vón màu vàng nhạt/kem. Nhạy sáng. Tan một phần trong NH₃ đặc.'
  },
  AgI: {
    formula: 'AgI',
    name_en: 'Silver Iodide',
    name_vi: 'Bạc iotua',
    ksp_25c: 8.5e-17,
    colorHex: '#facc15', // Pale yellow
    morphology: 'curd',
    particleRadius_um_range: [1.0, 5.0],
    density_g_cm3: 5.68,
    packingFraction_phi: 0.15,
    specialNotes_en: 'Pale yellow curdy precipitate. Insoluble in dilute NH3 (distinct from AgCl/AgBr).',
    specialNotes_vi: 'Kết tủa vón màu vàng đậm. Không tan trong dung dịch NH₃ loãng.'
  },
  PbI2: {
    formula: 'PbI2',
    name_en: 'Lead(II) Iodide',
    name_vi: 'Chì(II) iotua (Mưa vàng)',
    ksp_25c: 9.8e-9,
    colorHex: '#eab308',
    morphology: 'crystal_plate',
    particleRadius_um_range: [20.0, 200.0],
    density_g_cm3: 6.16,
    packingFraction_phi: 0.30,
    reversibleHeat: true,
    specialNotes_en: 'Glittering hexagonal golden plates ("golden rain"). Dissolves on heating and recrystallizes on cooling.',
    specialNotes_vi: 'Vảy tinh thể lục giác lấp lánh như vàng. Tan khi đun nóng và kết tinh lại thành mưa vàng khi để nguội.'
  },
  PbSO4: {
    formula: 'PbSO4',
    name_en: 'Lead(II) Sulfate',
    name_vi: 'Chì(II) sunfat',
    ksp_25c: 2.5e-8,
    colorHex: '#f8fafc',
    morphology: 'fine_powder',
    particleRadius_um_range: [1.0, 10.0],
    density_g_cm3: 6.29,
    packingFraction_phi: 0.30,
    specialNotes_en: 'Heavy white powder. Dissolves in concentrated ammonium acetate or hot NaOH.',
    specialNotes_vi: 'Bột trắng nặng. Tan trong dung dịch amoni axetat đặc hoặc NaOH nóng.'
  },
  PbCl2: {
    formula: 'PbCl2',
    name_en: 'Lead(II) Chloride',
    name_vi: 'Chì(II) clorua',
    ksp_25c: 1.7e-5,
    colorHex: '#ffffff',
    morphology: 'crystal_needle',
    particleRadius_um_range: [5.0, 50.0],
    density_g_cm3: 5.85,
    packingFraction_phi: 0.30,
    reversibleHeat: true,
    specialNotes_en: 'White needle crystals in cold water; dissolves readily in boiling water.',
    specialNotes_vi: 'Tinh thể hình kim màu trắng trong nước lạnh; tan hoàn toàn khi đun sôi.'
  },
  CaCO3: {
    formula: 'CaCO3',
    name_en: 'Calcium Carbonate',
    name_vi: 'Canxi cacbonat',
    ksp_25c: 3.4e-9,
    colorHex: '#ffffff',
    morphology: 'granular',
    particleRadius_um_range: [1.0, 20.0],
    density_g_cm3: 2.71,
    packingFraction_phi: 0.40,
    specialNotes_en: 'Fine chalky grit. Dissolves in excess CO2 (as soluble Ca(HCO3)2) or acids with effervescence.',
    specialNotes_vi: 'Bột phấn trắng dạng hạt. Tan khi sục dư khí CO₂ tạo Ca(HCO₃)₂ hoặc tan trong axit sủi bọt CO₂.'
  },
  'Cu(OH)2': {
    formula: 'Cu(OH)2',
    name_en: 'Copper(II) Hydroxide',
    name_vi: 'Đồng(II) hidroxit',
    ksp_25c: 2.2e-20,
    colorHex: '#38bdf8', // Pale sky blue
    morphology: 'gel',
    particleRadius_um_range: [100.0, 500.0],
    density_g_cm3: 3.37,
    packingFraction_phi: 0.08,
    specialNotes_en: 'Voluminous pale-blue gel. Decomposes to black CuO upon heating (>60 °C). Dissolves in excess NH3 to deep royal blue.',
    specialNotes_vi: 'Dạng keo xanh da trời thể tích lớn. Nhiệt phân thành CuO đen khi đun nóng. Tan trong NH₃ dư tạo phức màu xanh thẫm.'
  },
  'Fe(OH)3': {
    formula: 'Fe(OH)3',
    name_en: 'Iron(III) Hydroxide',
    name_vi: 'Sắt(III) hidroxit',
    ksp_25c: 1.0e-38,
    colorHex: '#9a3412', // Rust brown
    morphology: 'floc',
    particleRadius_um_range: [50.0, 300.0],
    density_g_cm3: 3.40,
    packingFraction_phi: 0.05,
    specialNotes_en: 'Voluminous gelatinous rust-brown flocculent aggregate with very high porosity.',
    specialNotes_vi: 'Bông cặn nhầy màu nâu đỏ, thể tích cồng kềnh, sa lắng và nén đáy rất chậm.'
  },
  'Fe(OH)2': {
    formula: 'Fe(OH)2',
    name_en: 'Iron(II) Hydroxide',
    name_vi: 'Sắt(II) hidroxit',
    ksp_25c: 8.0e-16,
    colorHex: '#ecfdf5', // Dirty green/white
    morphology: 'gel',
    particleRadius_um_range: [50.0, 200.0],
    density_g_cm3: 3.40,
    packingFraction_phi: 0.10,
    specialNotes_en: 'White gelatinous precipitate when fresh; rapidly oxidizes in air to dirty green then brown Fe(OH)3.',
    specialNotes_vi: 'Kết tủa keo trắng xanh khi mới sinh; bị oxy hóa nhanh trong không khí chuyển xanh rêu rồi nâu đỏ Fe(OH)₃.'
  },
  'Al(OH)3': {
    formula: 'Al(OH)3',
    name_en: 'Aluminium Hydroxide',
    name_vi: 'Nhôm hidroxit',
    ksp_25c: 1.0e-33,
    colorHex: '#ffffff',
    morphology: 'gel',
    particleRadius_um_range: [20.0, 150.0],
    density_g_cm3: 2.40,
    packingFraction_phi: 0.08,
    amphoteric: true,
    specialNotes_en: 'Translucent white gelatinous precipitate. Amphoteric: dissolves in excess strong base (Al(OH)4-) and in acids.',
    specialNotes_vi: 'Kết tủa keo trắng bán trong suốt. Lưỡng tính: tan hoàn toàn khi thêm dư kiềm mạnh hoặc axit.'
  },
  'Zn(OH)2': {
    formula: 'Zn(OH)2',
    name_en: 'Zinc Hydroxide',
    name_vi: 'Kẽm hidroxit',
    ksp_25c: 3.0e-17,
    colorHex: '#ffffff',
    morphology: 'gel',
    particleRadius_um_range: [20.0, 150.0],
    density_g_cm3: 3.05,
    packingFraction_phi: 0.08,
    amphoteric: true,
    specialNotes_en: 'White gelatinous precipitate. Dissolves in excess NaOH (zincate) and excess aqueous NH3 (tetraamminezinc).',
    specialNotes_vi: 'Kết tủa keo trắng. Tan trong kiềm dư tạo muối kẽmat và tan trong NH₃ dư tạo phức amin.'
  },
  'Mg(OH)2': {
    formula: 'Mg(OH)2',
    name_en: 'Magnesium Hydroxide',
    name_vi: 'Magie hidroxit (Sữa magie)',
    ksp_25c: 5.6e-12,
    colorHex: '#ffffff',
    morphology: 'fine_powder',
    particleRadius_um_range: [1.0, 10.0],
    density_g_cm3: 2.34,
    packingFraction_phi: 0.10,
    specialNotes_en: 'White suspension. Dissolves in ammonium chloride solutions due to NH4+ buffering.',
    specialNotes_vi: 'Huyền phù trắng. Tan trong dung dịch muối amoni clorua do hạ pH.'
  },
  CuS: {
    formula: 'CuS',
    name_en: 'Copper(II) Sulfide',
    name_vi: 'Đồng(II) sunfua',
    ksp_25c: 6.0e-36,
    colorHex: '#18181b', // Black
    morphology: 'amorphous_black',
    particleRadius_um_range: [0.01, 0.1],
    density_g_cm3: 4.60,
    packingFraction_phi: 0.20,
    specialNotes_en: 'Extremely insoluble black colloidal precipitate. Stays suspended. Insoluble in non-oxidizing acids.',
    specialNotes_vi: 'Kết tủa keo đen huyền cực kỳ khó tan. Lơ lửng lâu, không tan trong HCl/H₂SO₄ loãng.'
  },
  PbS: {
    formula: 'PbS',
    name_en: 'Lead(II) Sulfide',
    name_vi: 'Chì(II) sunfua',
    ksp_25c: 3.0e-28,
    colorHex: '#09090b', // Jet black
    morphology: 'amorphous_black',
    particleRadius_um_range: [0.05, 0.2],
    density_g_cm3: 7.60,
    packingFraction_phi: 0.20,
    specialNotes_en: 'Dense black precipitate formed in lead detection with H2S or sulfide salts.',
    specialNotes_vi: 'Kết tủa đen tuyền dùng trong nhận biết chì với H₂S.'
  },
  Ag2S: {
    formula: 'Ag2S',
    name_en: 'Silver Sulfide',
    name_vi: 'Bạc sunfua',
    ksp_25c: 6.0e-51,
    colorHex: '#020617',
    morphology: 'amorphous_black',
    particleRadius_um_range: [0.02, 0.15],
    density_g_cm3: 7.20,
    packingFraction_phi: 0.20,
    specialNotes_en: 'Tarnish film on silver; extremely insoluble black deposit.',
    specialNotes_vi: 'Lớp màng đen xỉn trên bạc kim loại; độ tan cực kỳ nhỏ.'
  },
  S_colloid: {
    formula: 'S',
    name_en: 'Colloidal Sulfur',
    name_vi: 'Lưu huỳnh keo',
    ksp_25c: null,
    colorHex: '#fef08a', // Milky yellow-white
    morphology: 'colloid',
    particleRadius_um_range: [0.1, 1.0],
    density_g_cm3: 2.07,
    packingFraction_phi: 0.20,
    specialNotes_en: 'Forms with induction delay (Na2S2O3 + HCl). Blue-white opalescence to dense yellow milk; disappearing cross test.',
    specialNotes_vi: 'Sinh ra sau thời gian cảm ứng. Đục sữa làm mờ dấu chữ thập dưới đáy cốc.'
  },
  Ag0: {
    formula: 'Ag',
    name_en: 'Silver Metal (Mirror/Dendrite)',
    name_vi: 'Bạc kim loại (Màng gương/Cây bạc)',
    ksp_25c: null,
    colorHex: '#e2e8f0',
    morphology: 'metallic_film',
    particleRadius_um_range: [5.0, 500.0],
    density_g_cm3: 10.49,
    packingFraction_phi: 0.30,
    specialNotes_en: 'Forms shiny silver mirror on clean glass (Tollens) or metallic dendrites on Cu wire.',
    specialNotes_vi: 'Tráng màng gương bạc óng ánh trên thành kính hoặc mọc cây tinh thể bạc trên dây đồng.'
  },
  Cu0: {
    formula: 'Cu',
    name_en: 'Copper Metal (Deposit)',
    name_vi: 'Đồng kim loại (Bám ngoài)',
    ksp_25c: null,
    colorHex: '#ea580c',
    morphology: 'dendrite',
    particleRadius_um_range: [5.0, 200.0],
    density_g_cm3: 8.96,
    packingFraction_phi: 0.30,
    specialNotes_en: 'Reddish-brown spongy copper deposit on iron nail or zinc granules.',
    specialNotes_vi: 'Lớp kim loại đồng màu đỏ bám xốp ngoài đinh sắt hoặc viên kẽm.'
  },
  Pb0: {
    formula: 'Pb',
    name_en: 'Lead Tree (Dendrite)',
    name_vi: 'Cây chì kim loại',
    ksp_25c: null,
    colorHex: '#94a3b8',
    morphology: 'dendrite',
    particleRadius_um_range: [10.0, 400.0],
    density_g_cm3: 11.34,
    packingFraction_phi: 0.30,
    specialNotes_en: 'Dendritic gray metallic lead tree growing outward from zinc strip in lead(II) solution.',
    specialNotes_vi: 'Cành cây chì màu xám lấp lánh mọc tỏa ra từ miếng kẽm trong dung dịch chì.'
  }
};

import { PRNG } from '../core/rng';

/**
 * Calculates theoretical Stokes sedimentation terminal velocity:
 * v = 2/9 * (rho_p - rho_f) * g * r^2 / mu
 * @param rho_p_g_cm3 Particle density in g/cm^3
 * @param r_um Particle radius in micrometers
 * @param rho_f_g_ml Fluid density in g/mL (default 1.0 for water)
 * @param mu_mPa_s Dynamic viscosity in mPa.s (default 1.0 for water at 20 °C)
 * @returns velocity in m/s
 */
export function calculateStokesVelocity(
  rho_p_g_cm3: number,
  r_um: number,
  rho_f_g_ml: number = 1.0,
  mu_mPa_s: number = 1.0
): number {
  const rho_p = rho_p_g_cm3 * 1000; // kg/m^3
  const rho_f = rho_f_g_ml * 1000;   // kg/m^3
  const deltaRho = Math.max(0, rho_p - rho_f);
  const r = r_um * 1e-6;             // m
  const mu = mu_mPa_s * 1e-3;        // Pa.s
  const g = 9.80665;                 // m/s^2

  return (2 / 9) * (deltaRho * g * r * r) / mu;
}

/**
 * Calculates settled bed height H (cm) from mass m (g), packing fraction phi, and vessel radius R (cm) (§6.1):
 * V_bed = m / (rho * phi), H = V_bed / A_base
 */
export function calculateBedHeight(
  substanceFormula: string,
  mass_g: number,
  vesselRadius_cm: number
): { bedVolume_cm3: number; bedHeight_cm: number } {
  const prop = PRECIPITATES_DATABASE[substanceFormula] || {
    density_g_cm3: 3.5,
    packingFraction_phi: 0.3
  };
  const rho = prop.density_g_cm3;
  const phi = prop.packingFraction_phi;
  const A_base = Math.PI * vesselRadius_cm * vesselRadius_cm;

  const bedVolume_cm3 = mass_g / (rho * phi);
  const bedHeight_cm = bedVolume_cm3 / A_base;

  return { bedVolume_cm3, bedHeight_cm };
}

/**
 * Calculates amphoteric hydroxide mass yield vs added OH- moles (§6.7):
 * Al3+ + 3OH- -> Al(OH)3 (precipitates)
 * Al(OH)3 + OH- -> [Al(OH)4]- (redissolves to 0 when n_OH >= 4 n_Al)
 */
export function computeAmphotericYield(
  metalMoles: number,
  addedOhMoles: number,
  molarMass_g_mol: number = 78.0
): number {
  if (addedOhMoles <= 3 * metalMoles) {
    const n_precip = addedOhMoles / 3;
    return n_precip * molarMass_g_mol;
  } else if (addedOhMoles < 4 * metalMoles) {
    const excess_OH = addedOhMoles - 3 * metalMoles;
    const n_precip = Math.max(0, metalMoles - excess_OH);
    return n_precip * molarMass_g_mol;
  }
  return 0; // Fully redissolved
}

export interface StochasticPrecipitateParticle {
  x: number;
  y: number;
  z: number;
  weight_g: number;
  radius_um: number;
}

/**
 * Generates reproducible stochastic precipitate particles obeying exact mass conservation (§6.1 & §6.4).
 */
export function sampleStochasticPrecipitation(
  seed: number,
  totalMass_g: number,
  count: number = 80,
  substanceFormula: string = 'BaSO4',
  vesselRadius_cm: number = 2.0
): {
  particles: StochasticPrecipitateParticle[];
  totalMass_g: number;
  bedHeight_mm: number;
} {
  const rng = new PRNG(seed);
  const prop = PRECIPITATES_DATABASE[substanceFormula] || PRECIPITATES_DATABASE['BaSO4'];
  const particles: StochasticPrecipitateParticle[] = [];
  const rawWeights: number[] = [];

  const vesselRadius_m = vesselRadius_cm * 0.01;

  for (let i = 0; i < count; i++) {
    const angle = rng.next() * Math.PI * 2;
    const r = Math.sqrt(rng.next()) * vesselRadius_m;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = 0.01 + rng.next() * 0.04;

    const normRand = (rng.next() + rng.next() + rng.next() - 1.5) * 2;
    const baseR = (prop.particleRadius_um_range[0] + prop.particleRadius_um_range[1]) / 2;
    const radius_um = baseR * Math.exp(normRand * 0.25);

    const rawWeight = Math.pow(radius_um, 3);
    rawWeights.push(rawWeight);

    particles.push({ x, y, z, weight_g: 0, radius_um });
  }

  // Renormalize so sum(weight_g) = totalMass_g exactly
  const sumRaw = rawWeights.reduce((a, b) => a + b, 0);
  let accumulatedMass = 0;
  for (let i = 0; i < count; i++) {
    particles[i].weight_g = (rawWeights[i] / sumRaw) * totalMass_g;
    accumulatedMass += particles[i].weight_g;
  }

  const { bedHeight_cm } = calculateBedHeight(substanceFormula, totalMass_g, vesselRadius_cm);
  const bedHeight_mm = bedHeight_cm * 10;

  return { particles, totalMass_g: accumulatedMass, bedHeight_mm };
}
