/**
 * CHEMDEX PHYSICAL REACTION DATABASE
 * Grounded in chemical stoichiometry, thermodynamics, kinetics, and optics (§19).
 * Every reaction tracks:
 * - reactants and products with stoichiometric coefficients (n) and phase
 * - dH: reaction enthalpy (J/mol of reaction; negative = exothermic)
 * - kinetics: Arrhenius pre-exponential factor A and activation energy Ea (J/mol)
 * - equilibrium: Ksp or Keq
 * - visual: precipitate morphology, particle radii, gas color, flame properties
 * - audio: procedural sound profile
 */

import { SUBSTANCE_DATABASE } from './substances';

export type ReactionType =
  | 'precipitation'
  | 'gas_evolution'
  | 'neutralization'
  | 'redox'
  | 'displacement'
  | 'decomposition'
  | 'combustion'
  | 'complexation'
  | 'dissolution';

export interface StoichSpecies {
  s: string;   // Substance ID matching SUBSTANCE_DATABASE
  n: number;   // Stoichiometric coefficient
  state: 'aq' | 's' | 'g' | 'l';
}

export interface KineticsConfig {
  model: 'instant' | 'arrhenius' | 'rateLaw';
  A?: number;                         // Pre-exponential factor
  Ea?: number;                        // Activation energy in J/mol
  orders?: Record<string, number>;    // Reaction order with respect to species
  catalysts?: string[];               // Catalysts that accelerate k
  catalystMultiplier?: number;
}

export interface VisualOutcome {
  precipitate?: {
    substanceId: string;
    color: string;
    morphology: 'curdy' | 'milky' | 'gel' | 'floc' | 'plates' | 'powder';
    particleRadius_um: [number, number];
    photosensitive?: string;
  } | null;
  gas?: {
    substanceId: string;
    color: string;
    density_rel_air: number;
    dissolvedBubbleSize_mm: [number, number];
  } | null;
  colorChange?: {
    resultingAbsorptivity_RGB?: [number, number, number];
    indicatorDriven?: boolean;
  } | null;
  flame?: {
    color: string;
    emissionWavelength_nm?: number;
    sparks?: boolean;
    temperature_K?: number;
  } | null;
}

export interface AudioProfile {
  profile: 'none' | 'fizz' | 'boil' | 'pour' | 'pop' | 'hiss' | 'roar' | 'sparkle';
  intensity: number;
}

export interface PhysicalReaction {
  id: string;
  name: string;
  name_vi: string;
  equation: string;
  ionic_equation?: string;
  type: ReactionType;
  reactants: StoichSpecies[];
  products: StoichSpecies[];
  dH: number;                          // J/mol (standard reaction enthalpy)
  kinetics: KineticsConfig;
  equilibrium?: {
    Ksp?: number;
    Keq?: number;
    Ka?: number;
  };
  conditions?: {
    minT_K?: number;
    catalyst?: string;
    light?: boolean;
    stirring?: 'accelerates' | 'required' | 'none';
  };
  visual: VisualOutcome;
  audio: AudioProfile;
  hazards: string[];
}

export const REACTION_DATABASE: Record<string, PhysicalReaction> = {
  // 1. AgNO3 + NaCl -> AgCl(s) + NaNO3 (Curdy white precipitation)
  'AgNO3+NaCl': {
    id: 'AgNO3+NaCl',
    name: 'Silver Chloride Precipitation',
    name_vi: 'Kết tủa Bạc Clorua (Trắng vón)',
    equation: 'AgNO₃ + NaCl → AgCl↓ + NaNO₃',
    ionic_equation: 'Ag⁺(aq) + Cl⁻(aq) → AgCl(s)↓',
    type: 'precipitation',
    reactants: [
      { s: 'AgNO3', n: 1, state: 'aq' },
      { s: 'NaCl', n: 1, state: 'aq' }
    ],
    products: [
      { s: 'AgCl(s)', n: 1, state: 's' },
      { s: 'NaNO3', n: 1, state: 'aq' }
    ],
    dH: -65700, // Exothermic precipitation
    kinetics: {
      model: 'instant',
      A: 1e11,
      Ea: 8000,
      orders: { 'Ag+': 1, 'Cl-': 1 }
    },
    equilibrium: { Ksp: 1.77e-10 },
    visual: {
      precipitate: {
        substanceId: 'AgCl(s)',
        color: '#f8fafc',
        morphology: 'curdy',
        particleRadius_um: [0.3, 3.0],
        photosensitive: 'darkens to grey-violet in light'
      }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: []
  },

  // 2. AgNO3 + KI -> AgI(s) (Yellow precipitation)
  'AgNO3+KI': {
    id: 'AgNO3+KI',
    name: 'Silver Iodide Precipitation',
    name_vi: 'Kết tủa Bạc Iođua (Vàng đậm)',
    equation: 'AgNO₃ + KI → AgI↓ + KNO₃',
    ionic_equation: 'Ag⁺(aq) + I⁻(aq) → AgI(s)↓',
    type: 'precipitation',
    reactants: [
      { s: 'AgNO3', n: 1, state: 'aq' },
      { s: 'KI', n: 1, state: 'aq' }
    ],
    products: [
      { s: 'AgI(s)', n: 1, state: 's' }
    ],
    dH: -112000,
    kinetics: { model: 'instant', A: 1e11, Ea: 6000 },
    equilibrium: { Ksp: 8.52e-17 },
    visual: {
      precipitate: {
        substanceId: 'AgI(s)',
        color: '#facc15',
        morphology: 'curdy',
        particleRadius_um: [0.2, 2.5]
      }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: []
  },

  // 3. BaCl2 + Na2SO4 -> BaSO4(s) (Fine milky white)
  'BaCl2+Na2SO4': {
    id: 'BaCl2+Na2SO4',
    name: 'Barium Sulfate Milky Precipitation',
    name_vi: 'Kết tủa Bari Sunfat (Trắng sữa mịn)',
    equation: 'BaCl₂ + Na₂SO₄ → BaSO₄↓ + 2NaCl',
    ionic_equation: 'Ba²⁺(aq) + SO₄²⁻(aq) → BaSO₄(s)↓',
    type: 'precipitation',
    reactants: [
      { s: 'BaCl2', n: 1, state: 'aq' },
      { s: 'Na2SO4', n: 1, state: 'aq' }
    ],
    products: [
      { s: 'BaSO4(s)', n: 1, state: 's' },
      { s: 'NaCl', n: 2, state: 'aq' }
    ],
    dH: -24800,
    kinetics: { model: 'instant', A: 5e10, Ea: 10000 },
    equilibrium: { Ksp: 1.08e-10 },
    visual: {
      precipitate: {
        substanceId: 'BaSO4(s)',
        color: '#ffffff',
        morphology: 'milky',
        particleRadius_um: [0.1, 1.0]
      }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: []
  },

  // 4. CuSO4 + 2NaOH -> Cu(OH)2(s) (Gelatinous pale blue)
  'CuSO4+NaOH': {
    id: 'CuSO4+NaOH',
    name: 'Copper(II) Hydroxide Precipitation',
    name_vi: 'Kết tủa Đồng(II) Hiđroxit (Xanh keo)',
    equation: 'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄',
    ionic_equation: 'Cu²⁺(aq) + 2OH⁻(aq) → Cu(OH)₂(s)↓',
    type: 'precipitation',
    reactants: [
      { s: 'CuSO4', n: 1, state: 'aq' },
      { s: 'NaOH', n: 2, state: 'aq' }
    ],
    products: [
      { s: 'Cu(OH)2(s)', n: 1, state: 's' },
      { s: 'Na2SO4', n: 1, state: 'aq' }
    ],
    dH: -56000,
    kinetics: { model: 'instant', A: 1e10, Ea: 8000 },
    equilibrium: { Ksp: 2.2e-20 },
    visual: {
      precipitate: {
        substanceId: 'Cu(OH)2(s)',
        color: '#38bdf8',
        morphology: 'gel',
        particleRadius_um: [0.5, 4.0]
      }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: []
  },

  // 5. Cu(OH)2 heating -> CuO(s) + H2O (Thermal decomposition)
  'Cu(OH)2_heating': {
    id: 'Cu(OH)2_heating',
    name: 'Pyrolysis of Copper(II) Hydroxide',
    name_vi: 'Nhiệt phân Đồng(II) Hiđroxit thành bột đen CuO',
    equation: 'Cu(OH)₂ ⎯⎯t°⎯→ CuO↓ + H₂O',
    type: 'decomposition',
    reactants: [
      { s: 'Cu(OH)2(s)', n: 1, state: 's' }
    ],
    products: [
      { s: 'CuO(s)', n: 1, state: 's' },
      { s: 'H2O', n: 1, state: 'l' }
    ],
    dH: 8900, // Endothermic decomposition
    kinetics: { model: 'arrhenius', A: 4e7, Ea: 68000 },
    conditions: { minT_K: 333.15 }, // Occurs above 60 °C
    visual: {
      precipitate: {
        substanceId: 'CuO(s)',
        color: '#18181b',
        morphology: 'powder',
        particleRadius_um: [0.2, 1.5]
      }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: []
  },

  // 6. CuSO4 + 4NH3 -> [Cu(NH3)4]2+ (Complexation deep royal blue)
  'CuSO4+NH3_excess': {
    id: 'CuSO4+NH3_excess',
    name: 'Tetraamminecopper(II) Complexation',
    name_vi: 'Tạo phức đồng amoniac xanh thẫm',
    equation: 'Cu²⁺ + 4NH₃ ⇌ [Cu(NH₃)₄]²⁺',
    type: 'complexation',
    reactants: [
      { s: 'CuSO4', n: 1, state: 'aq' },
      { s: 'NH3', n: 4, state: 'aq' }
    ],
    products: [
      { s: '[Cu(NH3)4]2+', n: 1, state: 'aq' }
    ],
    dH: -89000,
    kinetics: { model: 'instant', A: 1e9, Ea: 12000 },
    equilibrium: { Keq: 2.1e13 },
    visual: {
      colorChange: { resultingAbsorptivity_RGB: [1.85, 0.65, 0.01] }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: []
  },

  // 7. FeCl3 + 3NaOH -> Fe(OH)3(s) (Rust-brown flocculent)
  'FeCl3+NaOH': {
    id: 'FeCl3+NaOH',
    name: 'Iron(III) Hydroxide Rust Precipitation',
    name_vi: 'Kết tủa Sắt(III) Hiđroxit nâu đỏ',
    equation: 'FeCl₃ + 3NaOH → Fe(OH)₃↓ + 3NaCl',
    ionic_equation: 'Fe³⁺(aq) + 3OH⁻(aq) → Fe(OH)₃(s)↓',
    type: 'precipitation',
    reactants: [
      { s: 'FeCl3', n: 1, state: 'aq' },
      { s: 'NaOH', n: 3, state: 'aq' }
    ],
    products: [
      { s: 'Fe(OH)3(s)', n: 1, state: 's' },
      { s: 'NaCl', n: 3, state: 'aq' }
    ],
    dH: -98000,
    kinetics: { model: 'instant', A: 1e10, Ea: 9000 },
    equilibrium: { Ksp: 2.79e-39 },
    visual: {
      precipitate: {
        substanceId: 'Fe(OH)3(s)',
        color: '#9a3412',
        morphology: 'floc',
        particleRadius_um: [0.5, 5.0]
      }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: []
  },

  // 8. FeSO4 + 2NaOH -> Fe(OH)2(s) (Pale dirty green)
  'FeSO4+NaOH': {
    id: 'FeSO4+NaOH',
    name: 'Iron(II) Hydroxide Precipitation',
    name_vi: 'Kết tủa Sắt(II) Hiđroxit trắng xanh',
    equation: 'FeSO₄ + 2NaOH → Fe(OH)₂↓ + Na₂SO₄',
    ionic_equation: 'Fe²⁺(aq) + 2OH⁻(aq) → Fe(OH)₂(s)↓',
    type: 'precipitation',
    reactants: [
      { s: 'FeSO4', n: 1, state: 'aq' },
      { s: 'NaOH', n: 2, state: 'aq' }
    ],
    products: [
      { s: 'Fe(OH)2(s)', n: 1, state: 's' },
      { s: 'Na2SO4', n: 1, state: 'aq' }
    ],
    dH: -62000,
    kinetics: { model: 'instant', A: 1e10, Ea: 9500 },
    equilibrium: { Ksp: 4.87e-17 },
    visual: {
      precipitate: {
        substanceId: 'Fe(OH)2(s)',
        color: '#84cc16',
        morphology: 'floc',
        particleRadius_um: [0.3, 3.0]
      }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: []
  },

  // 9. Pb(NO3)2 + 2KI -> PbI2(s) (Golden rain)
  'Pb(NO3)2+KI': {
    id: 'Pb(NO3)2+KI',
    name: 'Golden Rain (Lead(II) Iodide)',
    name_vi: 'Thí nghiệm Mưa Vàng (Chì(II) Iođua)',
    equation: 'Pb(NO₃)₂ + 2KI → PbI₂↓ + 2KNO₃',
    ionic_equation: 'Pb²⁺(aq) + 2I⁻(aq) → PbI₂(s)↓',
    type: 'precipitation',
    reactants: [
      { s: 'Pb(NO3)2', n: 1, state: 'aq' },
      { s: 'KI', n: 2, state: 'aq' }
    ],
    products: [
      { s: 'PbI2(s)', n: 1, state: 's' }
    ],
    dH: -46500,
    kinetics: { model: 'arrhenius', A: 5e9, Ea: 15000 },
    equilibrium: { Ksp: 9.8e-9 },
    visual: {
      precipitate: {
        substanceId: 'PbI2(s)',
        color: '#fbbf24',
        morphology: 'plates',
        particleRadius_um: [1.0, 15.0]
      }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: ['toxic']
  },

  // 10. CaCl2 + Na2CO3 -> CaCO3(s) (Fine white chalk)
  'CaCl2+Na2CO3': {
    id: 'CaCl2+Na2CO3',
    name: 'Calcium Carbonate Precipitation',
    name_vi: 'Kết tủa Canxi Cacbonat',
    equation: 'CaCl₂ + Na₂CO₃ → CaCO₃↓ + 2NaCl',
    ionic_equation: 'Ca²⁺(aq) + CO₃²⁻(aq) → CaCO₃(s)↓',
    type: 'precipitation',
    reactants: [
      { s: 'CaCl2', n: 1, state: 'aq' },
      { s: 'Na2CO3', n: 1, state: 'aq' }
    ],
    products: [
      { s: 'CaCO3(s)', n: 1, state: 's' },
      { s: 'NaCl', n: 2, state: 'aq' }
    ],
    dH: -13000,
    kinetics: { model: 'instant', A: 2e10, Ea: 12000 },
    equilibrium: { Ksp: 3.36e-9 },
    visual: {
      precipitate: {
        substanceId: 'CaCO3(s)',
        color: '#f8fafc',
        morphology: 'powder',
        particleRadius_um: [0.2, 2.0]
      }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: []
  },

  // 11. Ca(OH)2 + CO2 -> CaCO3(s) + H2O (Limewater turns cloudy)
  'Ca(OH)2+CO2': {
    id: 'Ca(OH)2+CO2',
    name: 'Limewater Test for CO2',
    name_vi: 'Khí CO2 làm vẩn đục nước vôi trong',
    equation: 'Ca(OH)₂ + CO₂ → CaCO₃↓ + H₂O',
    type: 'precipitation',
    reactants: [
      { s: 'Ca(OH)2', n: 1, state: 'aq' },
      { s: 'CO2(g)', n: 1, state: 'g' }
    ],
    products: [
      { s: 'CaCO3(s)', n: 1, state: 's' },
      { s: 'H2O', n: 1, state: 'l' }
    ],
    dH: -113000,
    kinetics: { model: 'arrhenius', A: 8e8, Ea: 18000 },
    equilibrium: { Ksp: 3.36e-9 },
    visual: {
      precipitate: {
        substanceId: 'CaCO3(s)',
        color: '#ffffff',
        morphology: 'milky',
        particleRadius_um: [0.1, 1.2]
      }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: []
  },

  // 12. Na2S2O3 + 2HCl -> S(colloid) + SO2 + 2NaCl + H2O (Disappearing cross)
  'Na2S2O3+HCl': {
    id: 'Na2S2O3+HCl',
    name: 'Thiosulfate Acid Decomposition (Disappearing Cross)',
    name_vi: 'Phản ứng tạo lưu huỳnh keo che mất dấu chữ thập',
    equation: 'Na₂S₂O₃ + 2HCl → 2NaCl + S↓ + SO₂↑ + H₂O',
    type: 'decomposition',
    reactants: [
      { s: 'Na2S2O3', n: 1, state: 'aq' },
      { s: 'HCl', n: 2, state: 'aq' }
    ],
    products: [
      { s: 'S(colloid)', n: 1, state: 's' },
      { s: 'SO2(g)', n: 1, state: 'g' },
      { s: 'NaCl', n: 2, state: 'aq' },
      { s: 'H2O', n: 1, state: 'l' }
    ],
    dH: -32000,
    kinetics: {
      model: 'arrhenius',
      A: 1.2e8,
      Ea: 62000, // Observable rate dependent on temperature and concentration!
      orders: { 'Na2S2O3': 1, 'HCl': 0.5 }
    },
    visual: {
      precipitate: {
        substanceId: 'S(colloid)',
        color: '#fef08a',
        morphology: 'milky',
        particleRadius_um: [0.05, 0.8]
      },
      gas: {
        substanceId: 'SO2(g)',
        color: '#ffffff',
        density_rel_air: 2.4,
        dissolvedBubbleSize_mm: [0.5, 1.5]
      }
    },
    audio: { profile: 'fizz', intensity: 0.25 },
    hazards: ['toxic']
  },

  // 13. CaCO3 + 2HCl -> CaCl2 + CO2(g) + H2O (Steady effervescence)
  'CaCO3+HCl': {
    id: 'CaCO3+HCl',
    name: 'Marble Chips Acid Dissolution (CO2 Gas)',
    name_vi: 'Đá vôi tác dụng axit HCl sinh khí CO2',
    equation: 'CaCO₃(s) + 2HCl → CaCl₂ + CO₂↑ + H₂O',
    type: 'gas_evolution',
    reactants: [
      { s: 'CaCO3(s)', n: 1, state: 's' },
      { s: 'HCl', n: 2, state: 'aq' }
    ],
    products: [
      { s: 'CaCl2', n: 1, state: 'aq' },
      { s: 'CO2(g)', n: 1, state: 'g' },
      { s: 'H2O', n: 1, state: 'l' }
    ],
    dH: -15400,
    kinetics: {
      model: 'arrhenius',
      A: 3.5e7,
      Ea: 38000,
      orders: { 'HCl': 1.0 }
    },
    visual: {
      gas: {
        substanceId: 'CO2(g)',
        color: '#f8fafc',
        density_rel_air: 1.52, // Heavier than air, overflows beaker rim
        dissolvedBubbleSize_mm: [1.2, 3.5]
      }
    },
    audio: { profile: 'fizz', intensity: 0.65 },
    hazards: []
  },

  // 14. NaHCO3 + HCl -> NaCl + CO2(g) + H2O (Vigorous endothermic fizz)
  'NaHCO3+HCl': {
    id: 'NaHCO3+HCl',
    name: 'Baking Soda and Acid Fizz',
    name_vi: 'Baking soda tác dụng axit sủi bọt mạnh',
    equation: 'NaHCO₃ + HCl → NaCl + CO₂↑ + H₂O',
    type: 'gas_evolution',
    reactants: [
      { s: 'NaHCO3', n: 1, state: 'aq' },
      { s: 'HCl', n: 1, state: 'aq' }
    ],
    products: [
      { s: 'NaCl', n: 1, state: 'aq' },
      { s: 'CO2(g)', n: 1, state: 'g' },
      { s: 'H2O', n: 1, state: 'l' }
    ],
    dH: -12800, // Small net enthalpy
    kinetics: { model: 'arrhenius', A: 5e8, Ea: 15000 },
    visual: {
      gas: {
        substanceId: 'CO2(g)',
        color: '#ffffff',
        density_rel_air: 1.52,
        dissolvedBubbleSize_mm: [0.8, 2.5]
      }
    },
    audio: { profile: 'fizz', intensity: 0.8 },
    hazards: []
  },

  // 15. Zn + 2HCl -> ZnCl2 + H2(g)
  'Zn+HCl': {
    id: 'Zn+HCl',
    name: 'Zinc Metal in Acid (H2 Gas)',
    name_vi: 'Kẽm tác dụng axit clohiđric giải phóng khí H2',
    equation: 'Zn + 2HCl → ZnCl₂ + H₂↑',
    ionic_equation: 'Zn(s) + 2H⁺(aq) → Zn²⁺(aq) + H₂(g)↑',
    type: 'gas_evolution',
    reactants: [
      { s: 'Zn(s)', n: 1, state: 's' },
      { s: 'HCl', n: 2, state: 'aq' }
    ],
    products: [
      { s: 'H2(g)', n: 1, state: 'g' }
    ],
    dH: -153900, // Exothermic warming
    kinetics: { model: 'arrhenius', A: 4e7, Ea: 42000 },
    visual: {
      gas: {
        substanceId: 'H2(g)',
        color: '#ffffff',
        density_rel_air: 0.07, // Light gas rising fast
        dissolvedBubbleSize_mm: [1.0, 3.0]
      }
    },
    audio: { profile: 'fizz', intensity: 0.6 },
    hazards: ['flammable']
  },

  // 16. Mg + 2HCl -> MgCl2 + H2(g) (Vigorous warming)
  'Mg+HCl': {
    id: 'Mg+HCl',
    name: 'Magnesium Ribbon in Acid (Vigorous H2)',
    name_vi: 'Magie tác dụng axit rất mãnh liệt, tỏa nhiệt lớn',
    equation: 'Mg + 2HCl → MgCl₂ + H₂↑',
    ionic_equation: 'Mg(s) + 2H⁺(aq) → Mg²⁺(aq) + H₂(g)↑',
    type: 'gas_evolution',
    reactants: [
      { s: 'Mg(s)', n: 1, state: 's' },
      { s: 'HCl', n: 2, state: 'aq' }
    ],
    products: [
      { s: 'H2(g)', n: 1, state: 'g' }
    ],
    dH: -467000, // Strongly exothermic (deltaH = -467 kJ/mol)! Solution boils!
    kinetics: { model: 'arrhenius', A: 1e9, Ea: 28000 },
    visual: {
      gas: {
        substanceId: 'H2(g)',
        color: '#ffffff',
        density_rel_air: 0.07,
        dissolvedBubbleSize_mm: [1.5, 4.5]
      }
    },
    audio: { profile: 'fizz', intensity: 0.95 },
    hazards: ['flammable', 'irritant']
  },

  // 17. 2H2O2 ⎯MnO2⎯> 2H2O + O2(g) (Exothermic catalytic decomposition with steam)
  'H2O2+MnO2': {
    id: 'H2O2+MnO2',
    name: 'Catalytic Decomposition of H2O2 (Elephant Toothpaste)',
    name_vi: 'Nhiệt phân Oxi già có xúc tác MnO2 sinh khí Oxi và hơi nước nóng',
    equation: '2H₂O₂ ⎯⎯MnO₂⎯→ 2H₂O + O₂↑',
    type: 'decomposition',
    reactants: [
      { s: 'H2O2', n: 2, state: 'l' }
    ],
    products: [
      { s: 'H2O', n: 2, state: 'l' },
      { s: 'O2(g)', n: 1, state: 'g' }
    ],
    dH: -98200, // per mol H2O2 -> strong heating (temp climbs to 80-90°C)
    kinetics: {
      model: 'arrhenius',
      A: 8e8,
      Ea: 24000,
      catalysts: ['MnO2(s)', 'KI'],
      catalystMultiplier: 150.0
    },
    visual: {
      gas: {
        substanceId: 'O2(g)',
        color: '#ffffff',
        density_rel_air: 1.1,
        dissolvedBubbleSize_mm: [1.5, 5.0]
      }
    },
    audio: { profile: 'hiss', intensity: 0.85 },
    hazards: ['oxidizer']
  },

  // 18. HCl + NaOH -> NaCl + H2O (Neutralization dT ~ 6.8 K)
  'HCl+NaOH': {
    id: 'HCl+NaOH',
    name: 'Strong Acid - Strong Base Neutralization',
    name_vi: 'Phản ứng trung hòa Axit Clohiđric và Natri Hiđroxit',
    equation: 'HCl + NaOH → NaCl + H₂O',
    ionic_equation: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    type: 'neutralization',
    reactants: [
      { s: 'HCl', n: 1, state: 'aq' },
      { s: 'NaOH', n: 1, state: 'aq' }
    ],
    products: [
      { s: 'NaCl', n: 1, state: 'aq' },
      { s: 'H2O', n: 1, state: 'l' }
    ],
    dH: -57100, // -57.1 kJ/mol neutralization
    kinetics: { model: 'instant', A: 1e11, Ea: 5000 },
    equilibrium: { Ka: 1e14 }, // Kw = 1e-14
    visual: {
      colorChange: { indicatorDriven: true }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: []
  },

  // 19. H2SO4 + 2NaOH -> Na2SO4 + 2H2O
  'H2SO4+NaOH': {
    id: 'H2SO4+NaOH',
    name: 'Sulfuric Acid Neutralization',
    name_vi: 'Trung hòa Axit Sunfuric tỏa nhiệt mạnh',
    equation: 'H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O',
    type: 'neutralization',
    reactants: [
      { s: 'H2SO4', n: 1, state: 'aq' },
      { s: 'NaOH', n: 2, state: 'aq' }
    ],
    products: [
      { s: 'Na2SO4', n: 1, state: 'aq' },
      { s: 'H2O', n: 2, state: 'l' }
    ],
    dH: -114200,
    kinetics: { model: 'instant', A: 1e11, Ea: 5000 },
    visual: {
      colorChange: { indicatorDriven: true }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: []
  },

  // 20. Fe + CuSO4 -> FeSO4 + Cu (Displacement with copper coating)
  'Fe+CuSO4': {
    id: 'Fe+CuSO4',
    name: 'Iron - Copper Sulfate Single Displacement',
    name_vi: 'Đinh sắt tác dụng CuSO4 bám đồng đỏ và nhạt màu xanh',
    equation: 'Fe + CuSO₄ → FeSO₄ + Cu↓',
    ionic_equation: 'Fe(s) + Cu²⁺(aq) → Fe²⁺(aq) + Cu(s)↓',
    type: 'displacement',
    reactants: [
      { s: 'Fe(s)', n: 1, state: 's' },
      { s: 'CuSO4', n: 1, state: 'aq' }
    ],
    products: [
      { s: 'FeSO4', n: 1, state: 'aq' },
      { s: 'Cu(s)', n: 1, state: 's' }
    ],
    dH: -152000,
    kinetics: { model: 'arrhenius', A: 2e6, Ea: 36000 },
    visual: {
      precipitate: {
        substanceId: 'Cu(s)',
        color: '#b45309',
        morphology: 'powder',
        particleRadius_um: [0.5, 3.0]
      }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: []
  },

  // 21. Zn + CuSO4 -> ZnSO4 + Cu
  'Zn+CuSO4': {
    id: 'Zn+CuSO4',
    name: 'Zinc - Copper Sulfate Displacement (Cu Dendrites)',
    name_vi: 'Kẽm đẩy đồng, mọc cành cây đồng đỏ và dung dịch mất màu xanh',
    equation: 'Zn + CuSO₄ → ZnSO₄ + Cu↓',
    type: 'displacement',
    reactants: [
      { s: 'Zn(s)', n: 1, state: 's' },
      { s: 'CuSO4', n: 1, state: 'aq' }
    ],
    products: [
      { s: 'Cu(s)', n: 1, state: 's' }
    ],
    dH: -218000, // Strongly exothermic
    kinetics: { model: 'arrhenius', A: 5e6, Ea: 28000 },
    visual: {
      precipitate: {
        substanceId: 'Cu(s)',
        color: '#9a3412',
        morphology: 'floc',
        particleRadius_um: [1.0, 8.0]
      }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: []
  },

  // 22. 2Na + 2H2O -> 2NaOH + H2(g) (Controlled alkali skating metal)
  'Na+H2O': {
    id: 'Na+H2O',
    name: 'Sodium Reaction with Water (Skating & H2)',
    name_vi: 'Natri chạy xèo xèo trên mặt nước tạo bazơ kiềm và khí H2',
    equation: '2Na + 2H₂O → 2NaOH + H₂↑ + Q',
    type: 'redox',
    reactants: [
      { s: 'Na(s)', n: 2, state: 's' },
      { s: 'H2O', n: 2, state: 'l' }
    ],
    products: [
      { s: 'NaOH', n: 2, state: 'aq' },
      { s: 'H2(g)', n: 1, state: 'g' }
    ],
    dH: -368000, // Extremely exothermic (-184 kJ/mol Na) -> melts Na at 98°C!
    kinetics: { model: 'arrhenius', A: 1e10, Ea: 14000 },
    visual: {
      gas: {
        substanceId: 'H2(g)',
        color: '#fef08a',
        density_rel_air: 0.07,
        dissolvedBubbleSize_mm: [1.5, 4.0]
      },
      flame: {
        color: '#f59e0b',
        emissionWavelength_nm: 589.0, // Sodium D-line 589 nm
        temperature_K: 1600
      }
    },
    audio: { profile: 'hiss', intensity: 0.9 },
    hazards: ['flammable', 'corrosive', 'reactive_water']
  },

  // 23. 2K + 2H2O -> 2KOH + H2(g) (Potassium lilac flame)
  'K+H2O': {
    id: 'K+H2O',
    name: 'Potassium Reaction with Water (Lilac Flame)',
    name_vi: 'Kali phản ứng mãnh liệt bốc cháy với ngọn lửa màu tím hoa cà',
    equation: '2K + 2H₂O → 2KOH + H₂↑ + Q',
    type: 'redox',
    reactants: [
      { s: 'K(s)', n: 2, state: 's' },
      { s: 'H2O', n: 2, state: 'l' }
    ],
    products: [
      { s: 'KOH', n: 2, state: 'aq' },
      { s: 'H2(g)', n: 1, state: 'g' }
    ],
    dH: -392000,
    kinetics: { model: 'arrhenius', A: 2e10, Ea: 10000 },
    visual: {
      flame: {
        color: '#c084fc', // Lilac flame 766 nm
        emissionWavelength_nm: 766.0,
        temperature_K: 1800
      }
    },
    audio: { profile: 'pop', intensity: 0.95 },
    hazards: ['flammable', 'corrosive', 'reactive_water']
  },

  // 24. Cu + 4HNO3(conc) -> Cu(NO3)2 + 2NO2(g) + 2H2O (Brown NO2 gas)
  'Cu+HNO3_conc': {
    id: 'Cu+HNO3_conc',
    name: 'Copper in Concentrated Nitric Acid (Dense Brown NO2)',
    name_vi: 'Đồng tan trong axit HNO3 đặc tỏa khí NO2 màu nâu đỏ cuộn trào',
    equation: 'Cu + 4HNO₃(đặc) → Cu(NO₃)₂ + 2NO₂↑ + 2H₂O',
    type: 'redox',
    reactants: [
      { s: 'Cu(s)', n: 1, state: 's' },
      { s: 'HNO3', n: 4, state: 'aq' }
    ],
    products: [
      { s: 'NO2(g)', n: 2, state: 'g' },
      { s: 'H2O', n: 2, state: 'l' }
    ],
    dH: -136000,
    kinetics: { model: 'arrhenius', A: 6e7, Ea: 32000 },
    visual: {
      gas: {
        substanceId: 'NO2(g)',
        color: '#78350f', // Deep pungent reddish-brown
        density_rel_air: 2.05,
        dissolvedBubbleSize_mm: [1.2, 3.8]
      },
      colorChange: { resultingAbsorptivity_RGB: [0.65, 0.15, 0.05] }
    },
    audio: { profile: 'boil', intensity: 0.75 },
    hazards: ['toxic', 'corrosive', 'oxidizer']
  },

  // 25. Cu + 2H2SO4(conc) -> CuSO4 + SO2(g) + 2H2O (Hot)
  'Cu+H2SO4_conc': {
    id: 'Cu+H2SO4_conc',
    name: 'Copper in Hot Concentrated Sulfuric Acid',
    name_vi: 'Đồng tác dụng axit sunfuric đặc nóng sinh khí SO2 mùi hắc',
    equation: 'Cu + 2H₂SO₄(đặc) ⎯⎯t°⎯→ CuSO₄ + SO₂↑ + 2H₂O',
    type: 'redox',
    reactants: [
      { s: 'Cu(s)', n: 1, state: 's' },
      { s: 'H2SO4', n: 2, state: 'aq' }
    ],
    products: [
      { s: 'SO2(g)', n: 1, state: 'g' },
      { s: 'H2O', n: 2, state: 'l' }
    ],
    dH: -84000,
    kinetics: { model: 'arrhenius', A: 1.5e7, Ea: 54000 },
    conditions: { minT_K: 338.15 },
    visual: {
      gas: {
        substanceId: 'SO2(g)',
        color: '#f8fafc',
        density_rel_air: 2.92,
        dissolvedBubbleSize_mm: [0.8, 2.2]
      }
    },
    audio: { profile: 'fizz', intensity: 0.5 },
    hazards: ['toxic', 'corrosive']
  },

  // 26. K2Cr2O7 + 2NaOH ⇌ 2K2CrO4 + H2O (Orange to Yellow equilibrium)
  'Cr2O7+OH_equilibrium': {
    id: 'Cr2O7+OH_equilibrium',
    name: 'Dichromate - Chromate pH Equilibrium',
    name_vi: 'Cân bằng chuyển dịch da cam (Cr2O7 2-) sang vàng (CrO4 2-)',
    equation: 'Cr₂O₇²⁻ + 2OH⁻ ⇌ 2CrO₄²⁻ + H₂O',
    type: 'neutralization',
    reactants: [
      { s: 'K2Cr2O7', n: 1, state: 'aq' },
      { s: 'NaOH', n: 2, state: 'aq' }
    ],
    products: [
      { s: 'K2CrO4', n: 2, state: 'aq' },
      { s: 'H2O', n: 1, state: 'l' }
    ],
    dH: -18500,
    kinetics: { model: 'instant', A: 1e9, Ea: 10000 },
    equilibrium: { Keq: 1.2e14 },
    visual: {
      colorChange: { resultingAbsorptivity_RGB: [0.01, 0.15, 1.25] }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: ['toxic', 'oxidizer']
  },

  // 27. NH3(g) + HCl(g) -> NH4Cl(s) (Dense white smoke)
  'NH3+HCl_fumes': {
    id: 'NH3+HCl_fumes',
    name: 'Ammonium Chloride White Fume Formation',
    name_vi: 'Khí Amoniac gặp khí HCl tạo khói trắng Amoni Clorua',
    equation: 'NH₃(k) + HCl(k) → NH₄Cl(r)',
    type: 'precipitation',
    reactants: [
      { s: 'NH3', n: 1, state: 'aq' },
      { s: 'HCl', n: 1, state: 'aq' }
    ],
    products: [
      { s: 'NH4Cl', n: 1, state: 's' }
    ],
    dH: -176000,
    kinetics: { model: 'instant', A: 1e11, Ea: 4000 },
    visual: {
      precipitate: {
        substanceId: 'NH4Cl',
        color: '#ffffff',
        morphology: 'powder',
        particleRadius_um: [0.1, 0.8]
      }
    },
    audio: { profile: 'hiss', intensity: 0.2 },
    hazards: ['irritant']
  },

  // 28. 2Mg + O2 -> 2MgO (Blinding white flame test / burning ribbon)
  'Mg+O2_burning': {
    id: 'Mg+O2_burning',
    name: 'Combustion of Magnesium Ribbon',
    name_vi: 'Đốt cháy dải Magie phát ra ánh sáng trắng chói lòa',
    equation: '2Mg + O₂ ⎯⎯t°⎯→ 2MgO(r) + Q',
    type: 'combustion',
    reactants: [
      { s: 'Mg(s)', n: 2, state: 's' },
      { s: 'O2(g)', n: 1, state: 'g' }
    ],
    products: [
      { s: 'CaCO3(s)', n: 0, state: 's' } // White ash
    ],
    dH: -1203000, // Extremely exothermic (-601.5 kJ/mol MgO)!
    kinetics: { model: 'arrhenius', A: 2e10, Ea: 45000 },
    conditions: { minT_K: 923.15 }, // Ignites around 650 °C
    visual: {
      flame: {
        color: '#ffffff',
        temperature_K: 3100, // Blinding white flame 3100 K
        sparks: true
      }
    },
    audio: { profile: 'roar', intensity: 0.95 },
    hazards: ['flammable']
  },

  // 29. H2SO4(conc) + H2O (Violent explosive boiling if water added to acid)
  'H2SO4_water_explosion': {
    id: 'H2SO4_water_explosion',
    name: 'Water into Concentrated H2SO4 Splatter',
    name_vi: 'Rót nước vào axit H2SO4 đặc gây sôi cục bộ bắn tung tóe',
    equation: 'H₂SO₄(đặc) + H₂O → H₃O⁺ + HSO₄⁻ + Q (CỰC KỲ NGUY HIỂM)',
    type: 'dissolution',
    reactants: [
      { s: 'H2SO4', n: 1, state: 'aq' },
      { s: 'H2O', n: 1, state: 'l' }
    ],
    products: [
      { s: 'H2SO4', n: 1, state: 'aq' }
    ],
    dH: -95300,
    kinetics: { model: 'instant', A: 1e12, Ea: 1000 },
    visual: {
      gas: {
        substanceId: 'CO2(g)',
        color: '#ffffff',
        density_rel_air: 1.0,
        dissolvedBubbleSize_mm: [2.0, 6.0]
      }
    },
    audio: { profile: 'pop', intensity: 0.9 },
    hazards: ['corrosive', 'reactive_water']
  },

  // 30. Iodine Sublimation I2(s) -> I2(g)
  'I2_sublimation': {
    id: 'I2_sublimation',
    name: 'Iodine Sublimation',
    name_vi: 'Iot thăng hoa thành hơi màu tím',
    equation: 'I₂(r) ⎯⎯t°⎯→ I₂(k)',
    type: 'decomposition',
    reactants: [
      { s: 'I2', n: 1, state: 's' }
    ],
    products: [
      { s: 'I2', n: 1, state: 'g' }
    ],
    dH: 62400, // Heat of sublimation
    kinetics: { model: 'arrhenius', A: 1e8, Ea: 48000 },
    conditions: { minT_K: 353.15 },
    visual: {
      gas: {
        substanceId: 'I2',
        color: '#581c87', // Rich violet vapor
        density_rel_air: 8.8,
        dissolvedBubbleSize_mm: [0.5, 1.5]
      }
    },
    audio: { profile: 'hiss', intensity: 0.15 },
    hazards: ['toxic', 'irritant']
  },

  // 31. FeCl3 + KSCN -> [Fe(SCN)]2+ (Blood-red iron thiocyanate complex equilibrium)
  'FeCl3+KSCN': {
    id: 'FeCl3+KSCN',
    name: 'Iron(III) Thiocyanate Complex Equilibrium',
    name_vi: 'Cân bằng tạo phức chất Sắt(III) Thioxianat màu đỏ máu',
    equation: 'FeCl₃ + KSCN ⇌ [Fe(SCN)]Cl₂ + KCl',
    ionic_equation: 'Fe³⁺(aq) + SCN⁻(aq) ⇌ [Fe(SCN)]²⁺(aq)',
    type: 'complexation',
    reactants: [
      { s: 'FeCl3', n: 1, state: 'aq' },
      { s: 'KSCN', n: 1, state: 'aq' }
    ],
    products: [
      { s: 'Fe(SCN)2+', n: 1, state: 'aq' }
    ],
    dH: -24000,
    kinetics: { model: 'instant', A: 1e9, Ea: 12000 },
    equilibrium: { Keq: 890 },
    visual: {
      colorChange: {
        resultingAbsorptivity_RGB: [0.05, 1.85, 1.95]
      }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: []
  },

  // 32. 2KMnO4 + 5H2C2O4 + 3H2SO4 -> K2SO4 + 2MnSO4 + 10CO2 + 8H2O (Autocatalytic redox)
  'KMnO4+H2C2O4': {
    id: 'KMnO4+H2C2O4',
    name: 'Permanganate-Oxalate Autocatalytic Redox',
    name_vi: 'Phản ứng Oxi hóa Khử Tự Xúc Tác giữa Thuốc Tím và Axit Oxalic',
    equation: '2KMnO₄ + 5H₂C₂O₄ + 3H₂SO₄ → K₂SO₄ + 2MnSO₄ + 10CO₂↑ + 8H₂O',
    type: 'redox',
    reactants: [
      { s: 'KMnO4', n: 2, state: 'aq' },
      { s: 'H2C2O4', n: 5, state: 'aq' }
    ],
    products: [
      { s: 'MnSO4', n: 2, state: 'aq' },
      { s: 'CO2(g)', n: 10, state: 'g' }
    ],
    dH: -320000,
    kinetics: {
      model: 'arrhenius',
      A: 3e8,
      Ea: 42000,
      catalysts: ['Mn2+'],
      catalystMultiplier: 80.0
    },
    visual: {
      colorChange: {
        resultingAbsorptivity_RGB: [0.001, 0.001, 0.001]
      },
      gas: {
        substanceId: 'CO2(g)',
        color: '#ffffff',
        density_rel_air: 1.5,
        dissolvedBubbleSize_mm: [0.5, 1.5]
      }
    },
    audio: { profile: 'fizz', intensity: 0.25 },
    hazards: ['toxic']
  },

  // 33. 2KIO3 + 5NaHSO3 -> I2 + Starch -> Deep Midnight Blue (Landolt clock)
  'KIO3+NaHSO3_starch': {
    id: 'KIO3+NaHSO3_starch',
    name: 'Landolt Iodine Clock Reaction',
    name_vi: 'Phản ứng Đồng hồ Iốt Landolt (Đổi màu xanh đen đột ngột)',
    equation: '2KIO₃ + 5NaHSO₃ → I₂ + 5NaHSO₄ + K₂SO₄ + H₂O',
    type: 'redox',
    reactants: [
      { s: 'KIO3', n: 2, state: 'aq' },
      { s: 'NaHSO3', n: 5, state: 'aq' }
    ],
    products: [
      { s: 'I2', n: 1, state: 'aq' }
    ],
    dH: -185000,
    kinetics: { model: 'arrhenius', A: 5e7, Ea: 38000 },
    visual: {
      colorChange: {
        resultingAbsorptivity_RGB: [1.8, 1.8, 0.2]
      }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: []
  },

  // 34. Al2(SO4)3 + 6NaOH -> 2Al(OH)3(s) + 3Na2SO4 (Amphoteric precipitation)
  'Al2(SO4)3+NaOH': {
    id: 'Al2(SO4)3+NaOH',
    name: 'Aluminum Hydroxide Amphoteric Precipitation',
    name_vi: 'Kết tủa keo trắng Nhôm Hiđroxit Lưỡng tính',
    equation: 'Al₂(SO₄)₃ + 6NaOH → 2Al(OH)₃↓ + 3Na₂SO₄',
    ionic_equation: 'Al³⁺(aq) + 3OH⁻(aq) → Al(OH)₃(s)↓',
    type: 'precipitation',
    reactants: [
      { s: 'Al2(SO4)3', n: 1, state: 'aq' },
      { s: 'NaOH', n: 6, state: 'aq' }
    ],
    products: [
      { s: 'Al(OH)3(s)', n: 2, state: 's' }
    ],
    dH: -128000,
    kinetics: { model: 'instant', A: 2e10, Ea: 8000 },
    equilibrium: { Ksp: 3.0e-34 },
    visual: {
      precipitate: {
        substanceId: 'Al(OH)3(s)',
        color: '#ffffff',
        morphology: 'gel',
        particleRadius_um: [0.5, 4.0]
      }
    },
    audio: { profile: 'none', intensity: 0.0 },
    hazards: []
  }
};

/**
 * Validates reaction definition (stoichiometry, enthalpy, kinetics)
 */
export function validateReaction(r: PhysicalReaction): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!r.id || !r.name || !r.equation) errors.push(`Reaction missing ID or equation`);
  if (!r.reactants || r.reactants.length === 0) errors.push(`${r.id}: No reactants specified`);
  if (!r.products || r.products.length === 0) errors.push(`${r.id}: No products specified`);

  // Check all reactants and products exist in substance database
  for (const item of [...r.reactants, ...r.products]) {
    if (item.n > 0 && !SUBSTANCE_DATABASE[item.s]) {
      errors.push(`${r.id}: Unknown substance reference '${item.s}'`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate all reactions on bootstrap
 */
export function validateReactionDatabase(): { total: number; valid: boolean; errors: string[] } {
  const allErrors: string[] = [];
  const entries = Object.values(REACTION_DATABASE);
  for (const r of entries) {
    const { valid, errors } = validateReaction(r);
    if (!valid) allErrors.push(...errors);
  }
  return { total: entries.length, valid: allErrors.length === 0, errors: allErrors };
}
