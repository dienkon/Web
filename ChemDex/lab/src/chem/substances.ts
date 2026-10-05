/**
 * CHEMDEX PHYSICAL SUBSTANCES DATABASE
 * SI Units internally:
 * - molarMass: kg/mol (converted from g/mol by dividing by 1000)
 * - density: kg/m^3
 * - Cp: J/(kg·K)
 * - latentHeatVap: J/kg
 * - surfaceTension: N/m
 * - viscosity: Pa·s (at 298.15 K)
 * - Ksp: thermodynamic solubility product at 298.15 K
 * - dH_sol: J/mol (enthalpy of dissolution)
 * - optical: absorptivity_RGB in m^2/mol (Beer-Lambert extinction in linear sRGB)
 */

import { CONSTANTS, gramsToKg, mlToM3 } from '../core/units';

export type PhaseSTP = 'solid' | 'liquid' | 'gas' | 'aqueous';
export type Morphology = 'crystal' | 'powder' | 'granular' | 'ribbon' | 'chunk' | 'floc' | 'gel' | 'curdy';

export interface IonSpecies {
  species: string;
  n: number;
  charge: number;
}

export interface AntoineParams {
  A: number;
  B: number;
  C: number; // T in Celsius, P in mmHg: log10(P) = A - B / (C + T_C)
}

export interface OpticalProperties {
  absorptivity_RGB: [number, number, number]; // Extinction coefficients [R, G, B] in m^2/mol
  spectrum?: number[];                         // Optional 16-band spectrum (400-700 nm)
  scatter: number;                             // Turbidity scattering coefficient m^2/mol or m^-1
}

export interface SolidAppearance {
  color: string;
  morphology: Morphology;
  glossiness: number;
  metallic?: boolean;
}

export interface PhysicalSubstance {
  id: string;
  formula: string;
  name: string;
  name_vi: string;
  phase_STP: PhaseSTP;
  molarMass: number;                           // kg/mol
  density: number;                             // kg/m^3 (pure or partial molar)
  Cp: number;                                  // J/(kg·K)
  meltingPoint?: number;                       // K
  boilingPoint?: number;                       // K
  antoine?: AntoineParams;
  latentHeatVap?: number;                      // J/kg
  surfaceTension?: number;                     // N/m
  viscosity?: number;                          // Pa·s at 298.15 K
  solubilityCurve?: [number, number][];        // [[T_C, g_per_100g_water], ...]
  Ksp?: number;                                // at 298.15 K
  dH_sol?: number;                             // J/mol
  Ka?: number[];                               // Acid dissociation constants [Ka1, Ka2, ...]
  Kb?: number[];                               // Base dissociation constants
  ions?: IonSpecies[];                         // Dissociated ions for aqueous salts/acids/bases
  optical: OpticalProperties;
  solidAppearance?: SolidAppearance;
  hazards: string[];
}

export const SUBSTANCE_DATABASE: Record<string, PhysicalSubstance> = {
  // 1. Water (Universal Solvent)
  'H2O': {
    id: 'H2O',
    formula: 'H2O',
    name: 'Water',
    name_vi: 'Nước cất',
    phase_STP: 'liquid',
    molarMass: 0.018015,
    density: 998.2,
    Cp: 4184.0,
    meltingPoint: 273.15,
    boilingPoint: 373.15,
    antoine: { A: 8.07131, B: 1730.63, C: 233.426 },
    latentHeatVap: 2.257e6,
    surfaceTension: 0.0728,
    viscosity: 1.002e-3,
    optical: { absorptivity_RGB: [0.0001, 0.00005, 0.00002], scatter: 0.0 },
    hazards: []
  },

  // 2. Hydrochloric acid
  'HCl': {
    id: 'HCl',
    formula: 'HCl',
    name: 'Hydrochloric Acid',
    name_vi: 'Axit Clohiđric',
    phase_STP: 'aqueous',
    molarMass: 0.03646,
    density: 1020.0,
    Cp: 4050.0,
    boilingPoint: 381.15,
    viscosity: 1.05e-3,
    Ka: [1.0e7], // Strong acid
    ions: [
      { species: 'H+', n: 1, charge: 1 },
      { species: 'Cl-', n: 1, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 },
    hazards: ['corrosive', 'irritant']
  },

  // 3. Sulfuric acid
  'H2SO4': {
    id: 'H2SO4',
    formula: 'H2SO4',
    name: 'Sulfuric Acid',
    name_vi: 'Axit Sunfuric',
    phase_STP: 'aqueous',
    molarMass: 0.09808,
    density: 1840.0,
    Cp: 3800.0,
    boilingPoint: 610.15,
    viscosity: 2.1e-3,
    dH_sol: -95300, // Highly exothermic hydration
    Ka: [1.0e9, 1.2e-2], // Diprotic
    ions: [
      { species: 'H+', n: 2, charge: 1 },
      { species: 'SO4 2-', n: 1, charge: -2 }
    ],
    optical: { absorptivity_RGB: [0.002, 0.001, 0.001], scatter: 0.0 },
    hazards: ['corrosive', 'reactive_water']
  },

  // 4. Nitric acid
  'HNO3': {
    id: 'HNO3',
    formula: 'HNO3',
    name: 'Nitric Acid',
    name_vi: 'Axit Nitric',
    phase_STP: 'aqueous',
    molarMass: 0.06301,
    density: 1410.0,
    Cp: 3900.0,
    boilingPoint: 356.15,
    viscosity: 1.15e-3,
    Ka: [2.4e1],
    ions: [
      { species: 'H+', n: 1, charge: 1 },
      { species: 'NO3-', n: 1, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.005, 0.005, 0.001], scatter: 0.0 },
    hazards: ['corrosive', 'oxidizer', 'toxic']
  },

  // 5. Acetic acid
  'CH3COOH': {
    id: 'CH3COOH',
    formula: 'CH3COOH',
    name: 'Acetic Acid',
    name_vi: 'Axit Axetic (Giấm)',
    phase_STP: 'aqueous',
    molarMass: 0.06005,
    density: 1049.0,
    Cp: 4120.0,
    boilingPoint: 391.0,
    viscosity: 1.16e-3,
    Ka: [1.75e-5], // pKa = 4.76
    ions: [
      { species: 'H+', n: 1, charge: 1 },
      { species: 'CH3COO-', n: 1, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 },
    hazards: ['irritant']
  },

  // 6. Sodium hydroxide
  'NaOH': {
    id: 'NaOH',
    formula: 'NaOH',
    name: 'Sodium Hydroxide',
    name_vi: 'Natri Hiđroxit',
    phase_STP: 'aqueous',
    molarMass: 0.039997,
    density: 1040.0,
    Cp: 4100.0,
    boilingPoint: 375.0,
    viscosity: 1.1e-3,
    dH_sol: -44500, // Exothermic dissolution
    Kb: [1.0e7], // Strong base
    ions: [
      { species: 'Na+', n: 1, charge: 1 },
      { species: 'OH-', n: 1, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 },
    solidAppearance: { color: '#ffffff', morphology: 'pellet' as any, glossiness: 0.4 },
    hazards: ['corrosive']
  },

  // 6b. Potassium hydroxide
  'KOH': {
    id: 'KOH',
    formula: 'KOH',
    name: 'Potassium Hydroxide',
    name_vi: 'Kali Hiđroxit',
    phase_STP: 'aqueous',
    molarMass: 0.056105,
    density: 2040.0,
    Cp: 4050.0,
    boilingPoint: 378.0,
    viscosity: 1.15e-3,
    dH_sol: -57600, // Strongly exothermic dissolution
    Kb: [1.0e7], // Strong base
    ions: [
      { species: 'K+', n: 1, charge: 1 },
      { species: 'OH-', n: 1, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 },
    solidAppearance: { color: '#ffffff', morphology: 'pellet' as any, glossiness: 0.4 },
    hazards: ['corrosive']
  },

  // 7. Ammonia solution
  'NH3': {
    id: 'NH3',
    formula: 'NH3',
    name: 'Aqueous Ammonia',
    name_vi: 'Dung dịch Amoniac',
    phase_STP: 'aqueous',
    molarMass: 0.01703,
    density: 910.0,
    Cp: 4250.0,
    boilingPoint: 310.0,
    Kb: [1.77e-5], // pKb = 4.75
    ions: [
      { species: 'NH4+', n: 1, charge: 1 },
      { species: 'OH-', n: 1, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 },
    hazards: ['corrosive', 'toxic']
  },

  // 8. Calcium hydroxide (Limewater)
  'Ca(OH)2': {
    id: 'Ca(OH)2',
    formula: 'Ca(OH)2',
    name: 'Calcium Hydroxide',
    name_vi: 'Nước vôi trong',
    phase_STP: 'aqueous',
    molarMass: 0.07409,
    density: 1005.0,
    Cp: 4180.0,
    Ksp: 5.5e-6,
    ions: [
      { species: 'Ca2+', n: 1, charge: 2 },
      { species: 'OH-', n: 2, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 },
    hazards: ['irritant']
  },

  // 9. Sodium chloride
  'NaCl': {
    id: 'NaCl',
    formula: 'NaCl',
    name: 'Sodium Chloride',
    name_vi: 'Natri Clorua (Muối ăn)',
    phase_STP: 'aqueous',
    molarMass: 0.05844,
    density: 2165.0,
    Cp: 4000.0,
    meltingPoint: 1074.0,
    dH_sol: 3880, // Slightly endothermic
    solubilityCurve: [[0, 35.7], [20, 36.0], [40, 36.6], [60, 37.3], [80, 38.4], [100, 39.8]],
    ions: [
      { species: 'Na+', n: 1, charge: 1 },
      { species: 'Cl-', n: 1, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    solidAppearance: { color: '#ffffff', morphology: 'crystal', glossiness: 0.6 },
    hazards: []
  },

  // 9b. Sodium nitrate
  'NaNO3': {
    id: 'NaNO3',
    formula: 'NaNO3',
    name: 'Sodium Nitrate',
    name_vi: 'Natri Nitrat',
    phase_STP: 'aqueous',
    molarMass: 0.08499,
    density: 2260.0,
    Cp: 4020.0,
    meltingPoint: 581.0,
    dH_sol: 20500, // Endothermic dissolution
    ions: [
      { species: 'Na+', n: 1, charge: 1 },
      { species: 'NO3-', n: 1, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    solidAppearance: { color: '#ffffff', morphology: 'crystal', glossiness: 0.5 },
    hazards: ['oxidizer']
  },

  // 10. Silver nitrate
  'AgNO3': {
    id: 'AgNO3',
    formula: 'AgNO3',
    name: 'Silver Nitrate',
    name_vi: 'Bạc Nitrat',
    phase_STP: 'aqueous',
    molarMass: 0.16987,
    density: 4350.0,
    Cp: 3950.0,
    ions: [
      { species: 'Ag+', n: 1, charge: 1 },
      { species: 'NO3-', n: 1, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 },
    solidAppearance: { color: '#f8fafc', morphology: 'crystal', glossiness: 0.7 },
    hazards: ['corrosive', 'oxidizer']
  },

  // 11. Silver chloride (Curdy precipitate)
  'AgCl(s)': {
    id: 'AgCl(s)',
    formula: 'AgCl',
    name: 'Silver Chloride',
    name_vi: 'Bạc Clorua (Kết tủa trắng vón)',
    phase_STP: 'solid',
    molarMass: 0.14332,
    density: 5560.0,
    Cp: 350.0,
    Ksp: 1.77e-10, // Solubility in water ~ 1.33e-5 M
    dH_sol: 65500,
    optical: { absorptivity_RGB: [0.05, 0.05, 0.05], scatter: 18.0 },
    solidAppearance: { color: '#f8fafc', morphology: 'curdy', glossiness: 0.2 },
    hazards: []
  },

  // 12. Silver bromide (Pale yellow precipitate)
  'AgBr(s)': {
    id: 'AgBr(s)',
    formula: 'AgBr',
    name: 'Silver Bromide',
    name_vi: 'Bạc Bromua (Kết tủa vàng nhạt)',
    phase_STP: 'solid',
    molarMass: 0.18777,
    density: 6470.0,
    Cp: 270.0,
    Ksp: 5.35e-13,
    optical: { absorptivity_RGB: [0.12, 0.10, 0.02], scatter: 16.0 },
    solidAppearance: { color: '#fef08a', morphology: 'curdy', glossiness: 0.2 },
    hazards: []
  },

  // 13. Silver iodide (Bright yellow precipitate)
  'AgI(s)': {
    id: 'AgI(s)',
    formula: 'AgI',
    name: 'Silver Iodide',
    name_vi: 'Bạc Iođua (Kết tủa vàng đậm)',
    phase_STP: 'solid',
    molarMass: 0.23477,
    density: 5680.0,
    Cp: 240.0,
    Ksp: 8.52e-17,
    optical: { absorptivity_RGB: [0.25, 0.20, 0.01], scatter: 16.0 },
    solidAppearance: { color: '#facc15', morphology: 'powder', glossiness: 0.2 },
    hazards: []
  },

  // 14. Barium chloride
  'BaCl2': {
    id: 'BaCl2',
    formula: 'BaCl2',
    name: 'Barium Chloride',
    name_vi: 'Bari Clorua',
    phase_STP: 'aqueous',
    molarMass: 0.20823,
    density: 3860.0,
    Cp: 4000.0,
    ions: [
      { species: 'Ba2+', n: 1, charge: 2 },
      { species: 'Cl-', n: 2, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    hazards: ['toxic']
  },

  // 15. Sodium sulfate
  'Na2SO4': {
    id: 'Na2SO4',
    formula: 'Na2SO4',
    name: 'Sodium Sulfate',
    name_vi: 'Natri Sunfat',
    phase_STP: 'aqueous',
    molarMass: 0.14204,
    density: 2660.0,
    Cp: 4050.0,
    ions: [
      { species: 'Na+', n: 2, charge: 1 },
      { species: 'SO4 2-', n: 1, charge: -2 }
    ],
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    hazards: []
  },

  // 16. Barium sulfate (Fine milky precipitate)
  'BaSO4(s)': {
    id: 'BaSO4(s)',
    formula: 'BaSO4',
    name: 'Barium Sulfate',
    name_vi: 'Bari Sunfat (Kết tủa trắng mịn)',
    phase_STP: 'solid',
    molarMass: 0.23339,
    density: 4500.0,
    Cp: 440.0,
    Ksp: 1.08e-10,
    optical: { absorptivity_RGB: [0.02, 0.02, 0.02], scatter: 24.0 }, // High milky turbidity
    solidAppearance: { color: '#ffffff', morphology: 'powder', glossiness: 0.1 },
    hazards: []
  },

  // 17. Copper(II) sulfate (Bright blue solution)
  'CuSO4': {
    id: 'CuSO4',
    formula: 'CuSO4',
    name: 'Copper(II) Sulfate',
    name_vi: 'Đồng(II) Sunfat',
    phase_STP: 'aqueous',
    molarMass: 0.15961,
    density: 3600.0,
    Cp: 3950.0,
    solubilityCurve: [[0, 14.3], [20, 20.7], [40, 28.5], [60, 40.0], [80, 55.0], [100, 75.0]],
    ions: [
      { species: 'Cu2+', n: 1, charge: 2 },
      { species: 'SO4 2-', n: 1, charge: -2 }
    ],
    // Strong red/green absorption -> pure sky/royal blue
    optical: { absorptivity_RGB: [0.85, 0.25, 0.02], scatter: 0.0 },
    solidAppearance: { color: '#2563eb', morphology: 'crystal', glossiness: 0.7 },
    hazards: ['irritant', 'toxic']
  },

  // 18. Copper(II) hydroxide (Gelatinous pale blue precipitate)
  'Cu(OH)2(s)': {
    id: 'Cu(OH)2(s)',
    formula: 'Cu(OH)2',
    name: 'Copper(II) Hydroxide',
    name_vi: 'Đồng(II) Hiđroxit (Kết tủa xanh lam dạng keo)',
    phase_STP: 'solid',
    molarMass: 0.09756,
    density: 3370.0,
    Cp: 420.0,
    Ksp: 2.2e-20,
    optical: { absorptivity_RGB: [0.45, 0.15, 0.05], scatter: 12.0 },
    solidAppearance: { color: '#38bdf8', morphology: 'gel', glossiness: 0.3 },
    hazards: []
  },

  // 19. Copper(II) oxide (Black solid from heating Cu(OH)2)
  'CuO(s)': {
    id: 'CuO(s)',
    formula: 'CuO',
    name: 'Copper(II) Oxide',
    name_vi: 'Đồng(II) Oxit (Bột đen)',
    phase_STP: 'solid',
    molarMass: 0.07955,
    density: 6310.0,
    Cp: 530.0,
    meltingPoint: 1599.0,
    optical: { absorptivity_RGB: [0.95, 0.95, 0.95], scatter: 10.0 },
    solidAppearance: { color: '#18181b', morphology: 'powder', glossiness: 0.15 },
    hazards: []
  },

  // 20. Tetraamminecopper(II) complex [Cu(NH3)4]2+ (Deep royal blue)
  '[Cu(NH3)4]2+': {
    id: '[Cu(NH3)4]2+',
    formula: '[Cu(NH3)4]2+',
    name: 'Tetraamminecopper(II) Ion',
    name_vi: 'Phức đồng amoniac (Xanh thẫm)',
    phase_STP: 'aqueous',
    molarMass: 0.2277,
    density: 1040.0,
    Cp: 4000.0,
    optical: { absorptivity_RGB: [1.85, 0.65, 0.01], scatter: 0.0 },
    hazards: []
  },

  // 21. Diamminesilver(I) complex [Ag(NH3)2]+
  '[Ag(NH3)2]+': {
    id: '[Ag(NH3)2]+',
    formula: '[Ag(NH3)2]+',
    name: 'Diamminesilver(I) Ion',
    name_vi: 'Phức bạc amoniac (Không màu)',
    phase_STP: 'aqueous',
    molarMass: 0.14193,
    density: 1020.0,
    Cp: 4100.0,
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 },
    hazards: []
  },

  // 22. Potassium iodide
  'KI': {
    id: 'KI',
    formula: 'KI',
    name: 'Potassium Iodide',
    name_vi: 'Kali Iođua',
    phase_STP: 'aqueous',
    molarMass: 0.1660,
    density: 3120.0,
    Cp: 4000.0,
    ions: [
      { species: 'K+', n: 1, charge: 1 },
      { species: 'I-', n: 1, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 },
    hazards: []
  },

  // 23. Lead(II) nitrate
  'Pb(NO3)2': {
    id: 'Pb(NO3)2',
    formula: 'Pb(NO3)2',
    name: 'Lead(II) Nitrate',
    name_vi: 'Chì(II) Nitrat',
    phase_STP: 'aqueous',
    molarMass: 0.3312,
    density: 4530.0,
    Cp: 3900.0,
    ions: [
      { species: 'Pb2+', n: 1, charge: 2 },
      { species: 'NO3-', n: 2, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 },
    hazards: ['toxic']
  },

  // 24. Lead(II) iodide (Golden Rain glittering plates)
  'PbI2(s)': {
    id: 'PbI2(s)',
    formula: 'PbI2',
    name: 'Lead(II) Iodide (Golden Rain)',
    name_vi: 'Chì(II) Iođua (Mưa vàng)',
    phase_STP: 'solid',
    molarMass: 0.4610,
    density: 6160.0,
    Cp: 170.0,
    Ksp: 9.8e-9, // At 298 K; strongly temperature dependent
    dH_sol: 46500, // Strongly endothermic -> redissolves hot!
    solubilityCurve: [[0, 0.044], [20, 0.076], [40, 0.124], [60, 0.194], [80, 0.294], [100, 0.420]],
    optical: { absorptivity_RGB: [0.05, 0.05, 0.95], scatter: 22.0 },
    solidAppearance: { color: '#fbbf24', morphology: 'crystal', glossiness: 0.95 },
    hazards: ['toxic']
  },

  // 25. Sodium carbonate
  'Na2CO3': {
    id: 'Na2CO3',
    formula: 'Na2CO3',
    name: 'Sodium Carbonate',
    name_vi: 'Natri Cacbonat',
    phase_STP: 'aqueous',
    molarMass: 0.10599,
    density: 2540.0,
    Cp: 4050.0,
    ions: [
      { species: 'Na+', n: 2, charge: 1 },
      { species: 'CO3 2-', n: 1, charge: -2 }
    ],
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    hazards: ['irritant']
  },

  // 26. Sodium bicarbonate
  'NaHCO3': {
    id: 'NaHCO3',
    formula: 'NaHCO3',
    name: 'Sodium Bicarbonate',
    name_vi: 'Natri Hiđrocacbonat (Baking Soda)',
    phase_STP: 'aqueous',
    molarMass: 0.08401,
    density: 2200.0,
    Cp: 4100.0,
    dH_sol: 16700, // Endothermic
    ions: [
      { species: 'Na+', n: 1, charge: 1 },
      { species: 'HCO3-', n: 1, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    hazards: []
  },

  // 27. Calcium carbonate (Marble chips / chalk)
  'CaCO3(s)': {
    id: 'CaCO3(s)',
    formula: 'CaCO3',
    name: 'Calcium Carbonate',
    name_vi: 'Canxi Cacbonat (Đá vôi)',
    phase_STP: 'solid',
    molarMass: 0.10009,
    density: 2710.0,
    Cp: 820.0,
    Ksp: 3.36e-9,
    optical: { absorptivity_RGB: [0.02, 0.02, 0.02], scatter: 18.0 },
    solidAppearance: { color: '#f1f5f9', morphology: 'chunk', glossiness: 0.2 },
    hazards: []
  },

  // 28. Calcium chloride
  'CaCl2': {
    id: 'CaCl2',
    formula: 'CaCl2',
    name: 'Calcium Chloride',
    name_vi: 'Canxi Clorua',
    phase_STP: 'aqueous',
    molarMass: 0.11098,
    density: 2150.0,
    Cp: 4000.0,
    dH_sol: -82800, // Highly exothermic dissolution
    ions: [
      { species: 'Ca2+', n: 1, charge: 2 },
      { species: 'Cl-', n: 2, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    hazards: ['irritant']
  },

  // 29. Iron metal
  'Fe(s)': {
    id: 'Fe(s)',
    formula: 'Fe',
    name: 'Iron (Granules/Filings)',
    name_vi: 'Sắt (Đinh/Mạt sắt)',
    phase_STP: 'solid',
    molarMass: 0.055845,
    density: 7874.0,
    Cp: 450.0,
    meltingPoint: 1811.0,
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    solidAppearance: { color: '#64748b', morphology: 'granular', glossiness: 0.75, metallic: true },
    hazards: []
  },

  // 30. Copper metal
  'Cu(s)': {
    id: 'Cu(s)',
    formula: 'Cu',
    name: 'Copper (Foil/Wire)',
    name_vi: 'Đồng kim loại (Mảnh/Dây)',
    phase_STP: 'solid',
    molarMass: 0.063546,
    density: 8960.0,
    Cp: 385.0,
    meltingPoint: 1358.0,
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    solidAppearance: { color: '#b45309', morphology: 'ribbon', glossiness: 0.9, metallic: true },
    hazards: []
  },

  // 31. Zinc metal
  'Zn(s)': {
    id: 'Zn(s)',
    formula: 'Zn',
    name: 'Zinc (Granules)',
    name_vi: 'Kẽm (Hạt)',
    phase_STP: 'solid',
    molarMass: 0.06538,
    density: 7140.0,
    Cp: 390.0,
    meltingPoint: 692.68,
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    solidAppearance: { color: '#94a3b8', morphology: 'granular', glossiness: 0.8, metallic: true },
    hazards: []
  },

  // 32. Magnesium ribbon
  'Mg(s)': {
    id: 'Mg(s)',
    formula: 'Mg',
    name: 'Magnesium Ribbon',
    name_vi: 'Dải Magie',
    phase_STP: 'solid',
    molarMass: 0.024305,
    density: 1738.0,
    Cp: 1020.0,
    meltingPoint: 923.0,
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    solidAppearance: { color: '#cbd5e1', morphology: 'ribbon', glossiness: 0.85, metallic: true },
    hazards: ['flammable']
  },

  // 33. Sodium metal
  'Na(s)': {
    id: 'Na(s)',
    formula: 'Na',
    name: 'Sodium Metal',
    name_vi: 'Natri Kim Loại',
    phase_STP: 'solid',
    molarMass: 0.02299,
    density: 968.0, // FLOATS ON WATER (density < 1000 kg/m^3)!
    Cp: 1230.0,
    meltingPoint: 370.87, // Melts at 97.7 °C into silvery molten sphere!
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    solidAppearance: { color: '#e2e8f0', morphology: 'chunk', glossiness: 0.9, metallic: true },
    hazards: ['reactive_water', 'flammable', 'corrosive']
  },

  // 34. Potassium metal
  'K(s)': {
    id: 'K(s)',
    formula: 'K',
    name: 'Potassium Metal',
    name_vi: 'Kali Kim Loại',
    phase_STP: 'solid',
    molarMass: 0.039098,
    density: 862.0, // Floats on water
    Cp: 750.0,
    meltingPoint: 336.53, // Melts at 63.5 °C
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    solidAppearance: { color: '#cbd5e1', morphology: 'chunk', glossiness: 0.85, metallic: true },
    hazards: ['reactive_water', 'flammable', 'corrosive']
  },

  // 35. Aluminum metal
  'Al(s)': {
    id: 'Al(s)',
    formula: 'Al',
    name: 'Aluminum Foil',
    name_vi: 'Nhôm Kim Loại',
    phase_STP: 'solid',
    molarMass: 0.02698,
    density: 2700.0,
    Cp: 900.0,
    meltingPoint: 933.47,
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    solidAppearance: { color: '#e2e8f0', morphology: 'ribbon', glossiness: 0.85, metallic: true },
    hazards: []
  },

  // 36. Aluminum hydroxide (Amphoteric gelatinous white)
  'Al(OH)3(s)': {
    id: 'Al(OH)3(s)',
    formula: 'Al(OH)3',
    name: 'Aluminum Hydroxide',
    name_vi: 'Nhôm Hiđroxit (Kết tủa keo trắng)',
    phase_STP: 'solid',
    molarMass: 0.07800,
    density: 2420.0,
    Cp: 1180.0,
    Ksp: 1.3e-33,
    optical: { absorptivity_RGB: [0.01, 0.01, 0.01], scatter: 14.0 },
    solidAppearance: { color: '#ffffff', morphology: 'gel', glossiness: 0.2 },
    hazards: []
  },

  // 37. Zinc hydroxide (Amphoteric gelatinous white)
  'Zn(OH)2(s)': {
    id: 'Zn(OH)2(s)',
    formula: 'Zn(OH)2',
    name: 'Zinc Hydroxide',
    name_vi: 'Kẽm Hiđroxit (Kết tủa trắng)',
    phase_STP: 'solid',
    molarMass: 0.09942,
    density: 3050.0,
    Cp: 720.0,
    Ksp: 3.0e-17,
    optical: { absorptivity_RGB: [0.01, 0.01, 0.01], scatter: 14.0 },
    solidAppearance: { color: '#f8fafc', morphology: 'gel', glossiness: 0.2 },
    hazards: []
  },

  // 38. Iron(II) sulfate
  'FeSO4': {
    id: 'FeSO4',
    formula: 'FeSO4',
    name: 'Iron(II) Sulfate',
    name_vi: 'Sắt(II) Sunfat',
    phase_STP: 'aqueous',
    molarMass: 0.15191,
    density: 2840.0,
    Cp: 4000.0,
    ions: [
      { species: 'Fe2+', n: 1, charge: 2 },
      { species: 'SO4 2-', n: 1, charge: -2 }
    ],
    // Pale light green
    optical: { absorptivity_RGB: [0.15, 0.02, 0.12], scatter: 0.0 },
    hazards: ['irritant']
  },

  // 39. Iron(II) hydroxide (Dirty green precipitate, oxidizes in air)
  'Fe(OH)2(s)': {
    id: 'Fe(OH)2(s)',
    formula: 'Fe(OH)2',
    name: 'Iron(II) Hydroxide',
    name_vi: 'Sắt(II) Hiđroxit (Kết tủa trắng xanh)',
    phase_STP: 'solid',
    molarMass: 0.08986,
    density: 3400.0,
    Cp: 600.0,
    Ksp: 4.87e-17,
    optical: { absorptivity_RGB: [0.35, 0.12, 0.32], scatter: 15.0 },
    solidAppearance: { color: '#84cc16', morphology: 'floc', glossiness: 0.2 },
    hazards: []
  },

  // 40. Iron(III) chloride
  'FeCl3': {
    id: 'FeCl3',
    formula: 'FeCl3',
    name: 'Iron(III) Chloride',
    name_vi: 'Sắt(III) Clorua',
    phase_STP: 'aqueous',
    molarMass: 0.1622,
    density: 2900.0,
    Cp: 3950.0,
    ions: [
      { species: 'Fe3+', n: 1, charge: 3 },
      { species: 'Cl-', n: 3, charge: -1 }
    ],
    // Yellow-brown
    optical: { absorptivity_RGB: [0.05, 0.22, 0.85], scatter: 0.0 },
    hazards: ['corrosive']
  },

  // 41. Iron(III) hydroxide (Rust-brown flocculent precipitate)
  'Fe(OH)3(s)': {
    id: 'Fe(OH)3(s)',
    formula: 'Fe(OH)3',
    name: 'Iron(III) Hydroxide',
    name_vi: 'Sắt(III) Hiđroxit (Kết tủa nâu đỏ)',
    phase_STP: 'solid',
    molarMass: 0.10687,
    density: 3400.0,
    Cp: 650.0,
    Ksp: 2.79e-39,
    optical: { absorptivity_RGB: [0.02, 0.35, 0.95], scatter: 20.0 },
    solidAppearance: { color: '#9a3412', morphology: 'floc', glossiness: 0.2 },
    hazards: []
  },

  // 42. Potassium permanganate (Intense violet/purple)
  'KMnO4': {
    id: 'KMnO4',
    formula: 'KMnO4',
    name: 'Potassium Permanganate',
    name_vi: 'Thuốc tím (Kali Pemanganat)',
    phase_STP: 'aqueous',
    molarMass: 0.15803,
    density: 2700.0,
    Cp: 4000.0,
    ions: [
      { species: 'K+', n: 1, charge: 1 },
      { species: 'MnO4-', n: 1, charge: -1 }
    ],
    // High absorptivity in green (525-545 nm) -> intense purple/magenta
    optical: { absorptivity_RGB: [0.12, 1.95, 0.08], scatter: 0.0 },
    solidAppearance: { color: '#581c87', morphology: 'crystal', glossiness: 0.8 },
    hazards: ['oxidizer', 'toxic']
  },

  // 43. Manganese dioxide (Black catalyst powder)
  'MnO2(s)': {
    id: 'MnO2(s)',
    formula: 'MnO2',
    name: 'Manganese Dioxide',
    name_vi: 'Mangan Đioxit (Bột đen xúc tác)',
    phase_STP: 'solid',
    molarMass: 0.08694,
    density: 5026.0,
    Cp: 620.0,
    optical: { absorptivity_RGB: [0.95, 0.95, 0.95], scatter: 20.0 },
    solidAppearance: { color: '#09090b', morphology: 'powder', glossiness: 0.1 },
    hazards: ['oxidizer', 'irritant']
  },

  // 44. Potassium dichromate (Orange solution)
  'K2Cr2O7': {
    id: 'K2Cr2O7',
    formula: 'K2Cr2O7',
    name: 'Potassium Dichromate',
    name_vi: 'Kali Đicromat (Cam)',
    phase_STP: 'aqueous',
    molarMass: 0.29418,
    density: 2680.0,
    Cp: 3950.0,
    ions: [
      { species: 'K+', n: 2, charge: 1 },
      { species: 'Cr2O7 2-', n: 1, charge: -2 }
    ],
    optical: { absorptivity_RGB: [0.02, 0.45, 1.45], scatter: 0.0 },
    solidAppearance: { color: '#ea580c', morphology: 'crystal', glossiness: 0.7 },
    hazards: ['toxic', 'oxidizer', 'corrosive']
  },

  // 45. Potassium chromate (Yellow solution)
  'K2CrO4': {
    id: 'K2CrO4',
    formula: 'K2CrO4',
    name: 'Potassium Chromate',
    name_vi: 'Kali Cromat (Vàng chanh)',
    phase_STP: 'aqueous',
    molarMass: 0.19419,
    density: 2730.0,
    Cp: 4000.0,
    ions: [
      { species: 'K+', n: 2, charge: 1 },
      { species: 'CrO4 2-', n: 1, charge: -2 }
    ],
    optical: { absorptivity_RGB: [0.01, 0.15, 1.25], scatter: 0.0 },
    hazards: ['toxic', 'oxidizer']
  },

  // 46. Hydrogen peroxide
  'H2O2': {
    id: 'H2O2',
    formula: 'H2O2',
    name: 'Hydrogen Peroxide (30%)',
    name_vi: 'Oxi già (Hiđro Peoxit 30%)',
    phase_STP: 'liquid',
    molarMass: 0.03401,
    density: 1110.0,
    Cp: 3800.0,
    boilingPoint: 423.0,
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 },
    hazards: ['oxidizer', 'corrosive']
  },

  // 47. Sodium thiosulfate
  'Na2S2O3': {
    id: 'Na2S2O3',
    formula: 'Na2S2O3',
    name: 'Sodium Thiosulfate',
    name_vi: 'Natri Thiosunfat',
    phase_STP: 'aqueous',
    molarMass: 0.15811,
    density: 1670.0,
    Cp: 4000.0,
    ions: [
      { species: 'Na+', n: 2, charge: 1 },
      { species: 'S2O3 2-', n: 1, charge: -2 }
    ],
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    hazards: []
  },

  // 48. Colloidal sulfur (Disappearing cross turbidity)
  'S(colloid)': {
    id: 'S(colloid)',
    formula: 'S',
    name: 'Colloidal Sulfur',
    name_vi: 'Lưu huỳnh dạng keo (Đục sữa vàng)',
    phase_STP: 'solid',
    molarMass: 0.03206,
    density: 2070.0,
    Cp: 710.0,
    optical: { absorptivity_RGB: [0.02, 0.05, 0.45], scatter: 28.0 },
    solidAppearance: { color: '#fef08a', morphology: 'powder', glossiness: 0.1 },
    hazards: []
  },

  // 49. Carbon dioxide gas
  'CO2(g)': {
    id: 'CO2(g)',
    formula: 'CO2',
    name: 'Carbon Dioxide',
    name_vi: 'Khí Cacbonic',
    phase_STP: 'gas',
    molarMass: 0.04401,
    density: 1.98, // Heavier than air (1.20 kg/m^3) -> POURS over lip!
    Cp: 840.0,
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    hazards: []
  },

  // 50. Hydrogen gas
  'H2(g)': {
    id: 'H2(g)',
    formula: 'H2',
    name: 'Hydrogen Gas',
    name_vi: 'Khí Hiđro',
    phase_STP: 'gas',
    molarMass: 0.002016,
    density: 0.0899, // Extremely light -> shoots upward
    Cp: 14300.0,
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    hazards: ['flammable']
  },

  // 51. Oxygen gas
  'O2(g)': {
    id: 'O2(g)',
    formula: 'O2',
    name: 'Oxygen Gas',
    name_vi: 'Khí Oxi',
    phase_STP: 'gas',
    molarMass: 0.03200,
    density: 1.429,
    Cp: 920.0,
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    hazards: ['oxidizer']
  },

  // 52. Nitrogen dioxide brown gas
  'NO2(g)': {
    id: 'NO2(g)',
    formula: 'NO2',
    name: 'Nitrogen Dioxide',
    name_vi: 'Khí Nitơ Đioxit (Màu nâu đỏ)',
    phase_STP: 'gas',
    molarMass: 0.04601,
    density: 2.05, // Heavy brown gas
    Cp: 800.0,
    // Intense reddish-brown absorption: blocks blue/green strongly
    optical: { absorptivity_RGB: [0.05, 0.65, 1.85], scatter: 0.2 },
    hazards: ['toxic', 'corrosive', 'oxidizer']
  },

  // 53. Sulfur dioxide gas
  'SO2(g)': {
    id: 'SO2(g)',
    formula: 'SO2',
    name: 'Sulfur Dioxide',
    name_vi: 'Khí Khí Sunfurơ (Mùi hắc)',
    phase_STP: 'gas',
    molarMass: 0.06406,
    density: 2.92,
    Cp: 620.0,
    optical: { absorptivity_RGB: [0.0, 0.0, 0.0], scatter: 0.0 },
    hazards: ['toxic', 'corrosive']
  },

  // 54. Ammonium chloride
  'NH4Cl': {
    id: 'NH4Cl',
    formula: 'NH4Cl',
    name: 'Ammonium Chloride (White Smoke/Salt)',
    name_vi: 'Amoni Clorua (Khói trắng / Muối)',
    phase_STP: 'solid',
    molarMass: 0.05349,
    density: 1530.0,
    Cp: 1570.0,
    dH_sol: 14800, // Strongly endothermic cooling!
    ions: [
      { species: 'NH4+', n: 1, charge: 1 },
      { species: 'Cl-', n: 1, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.01, 0.01, 0.01], scatter: 12.0 },
    solidAppearance: { color: '#ffffff', morphology: 'powder', glossiness: 0.2 },
    hazards: ['irritant']
  },

  // 55. Iodine
  'I2': {
    id: 'I2',
    formula: 'I2',
    name: 'Iodine (Violet Vapor / Crystal)',
    name_vi: 'Iot (Hơi tím thăng hoa / Tinh thể)',
    phase_STP: 'solid',
    molarMass: 0.2538,
    density: 4933.0,
    Cp: 430.0,
    meltingPoint: 386.85,
    boilingPoint: 457.4,
    // Deep violet absorption: blocks green strongly
    optical: { absorptivity_RGB: [0.15, 1.45, 0.25], scatter: 0.0 },
    solidAppearance: { color: '#2e1065', morphology: 'crystal', glossiness: 0.8 },
    hazards: ['toxic', 'irritant']
  },

  // 56. Phenolphthalein Indicator
  'Phenolphthalein': {
    id: 'Phenolphthalein',
    formula: 'C20H14O4',
    name: 'Phenolphthalein',
    name_vi: 'Chỉ thị Phenolphtalein',
    phase_STP: 'aqueous',
    molarMass: 0.31832,
    density: 950.0,
    Cp: 4180.0,
    Ka: [3.98e-10], // pKa ≈ 9.4
    // Acid form is colorless; base form In2- is intense magenta (absorbs green ~550 nm)
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 },
    hazards: ['flammable']
  },

  // 57. Potassium Thiocyanate (KSCN)
  'KSCN': {
    id: 'KSCN',
    formula: 'KSCN',
    name: 'Potassium Thiocyanate',
    name_vi: 'Kali Thioxianat',
    phase_STP: 'aqueous',
    molarMass: 0.09718,
    density: 1020.0,
    Cp: 4100.0,
    ions: [
      { species: 'K+', n: 1, charge: 1 },
      { species: 'SCN-', n: 1, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 },
    hazards: ['irritant']
  },

  // 58. Oxalic Acid (H2C2O4)
  'H2C2O4': {
    id: 'H2C2O4',
    formula: 'H2C2O4',
    name: 'Oxalic Acid',
    name_vi: 'Axit Oxalic',
    phase_STP: 'aqueous',
    molarMass: 0.09003,
    density: 1010.0,
    Cp: 4120.0,
    Ka: [0.054, 5.4e-5],
    ions: [
      { species: 'H+', n: 2, charge: 1 },
      { species: 'C2O4^2-', n: 1, charge: -2 }
    ],
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 },
    hazards: ['toxic', 'corrosive']
  },

  // 59. Potassium Iodate (KIO3)
  'KIO3': {
    id: 'KIO3',
    formula: 'KIO3',
    name: 'Potassium Iodate',
    name_vi: 'Kali Iodat',
    phase_STP: 'aqueous',
    molarMass: 0.214,
    density: 1020.0,
    Cp: 4100.0,
    ions: [
      { species: 'K+', n: 1, charge: 1 },
      { species: 'IO3-', n: 1, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 },
    hazards: ['oxidizer']
  },

  // 60. Sodium Bisulfite (NaHSO3)
  'NaHSO3': {
    id: 'NaHSO3',
    formula: 'NaHSO3',
    name: 'Sodium Bisulfite',
    name_vi: 'Natri Bisunfit',
    phase_STP: 'aqueous',
    molarMass: 0.10406,
    density: 1020.0,
    Cp: 4100.0,
    ions: [
      { species: 'Na+', n: 1, charge: 1 },
      { species: 'HSO3-', n: 1, charge: -1 }
    ],
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 },
    hazards: ['irritant']
  },

  // 61. Aluminum Sulfate (Al2(SO4)3)
  'Al2(SO4)3': {
    id: 'Al2(SO4)3',
    formula: 'Al2(SO4)3',
    name: 'Aluminum Sulfate',
    name_vi: 'Nhôm Sunfat',
    phase_STP: 'aqueous',
    molarMass: 0.34215,
    density: 1030.0,
    Cp: 4050.0,
    ions: [
      { species: 'Al3+', n: 2, charge: 3 },
      { species: 'SO4^2-', n: 3, charge: -2 }
    ],
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 },
    hazards: ['irritant']
  },

  // 62. Iron(III) Thiocyanate Complex Ion
  'Fe(SCN)2+': {
    id: 'Fe(SCN)2+',
    formula: '[Fe(SCN)]2+',
    name: 'Iron(III) Thiocyanate Complex',
    name_vi: 'Phức chất Sắt(III) Thioxianat',
    phase_STP: 'aqueous',
    molarMass: 0.114,
    density: 1020.0,
    Cp: 4100.0,
    optical: { absorptivity_RGB: [0.05, 1.85, 1.95], scatter: 0.0 }, // Brilliant Blood Red
    hazards: []
  },

  // 63. Manganese(II) Sulfate (MnSO4)
  'MnSO4': {
    id: 'MnSO4',
    formula: 'MnSO4',
    name: 'Manganese(II) Sulfate',
    name_vi: 'Mangan(II) Sunfat',
    phase_STP: 'aqueous',
    molarMass: 0.151,
    density: 1020.0,
    Cp: 4100.0,
    ions: [
      { species: 'Mn2+', n: 1, charge: 2 },
      { species: 'SO4^2-', n: 1, charge: -2 }
    ],
    optical: { absorptivity_RGB: [0.001, 0.001, 0.001], scatter: 0.0 }, // Pale/Colorless
    hazards: []
  }
};

/**
 * Validates physical properties of a substance
 */
export function validateSubstance(s: PhysicalSubstance): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!s.id || !s.formula || !s.name) errors.push(`Substance missing required identity fields`);
  if (s.molarMass <= 0) errors.push(`${s.id}: Invalid molarMass ${s.molarMass} kg/mol`);
  if (s.density <= 0) errors.push(`${s.id}: Invalid density ${s.density} kg/m^3`);
  if (s.Cp <= 0) errors.push(`${s.id}: Invalid Cp ${s.Cp} J/(kg·K)`);
  if (s.antoine) {
    if (s.antoine.A <= 0 || s.antoine.B <= 0) {
      errors.push(`${s.id}: Invalid Antoine parameters`);
    }
  }
  if (s.ions) {
    const netCharge = s.ions.reduce((acc, ion) => acc + ion.n * ion.charge, 0);
    // Aqueous salts must have balanced charge
    if (Math.abs(netCharge) > 1e-4) {
      errors.push(`${s.id}: Net ionic charge is not neutral (net charge = ${netCharge})`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Run schema validation across entire substance database on bootstrap
 */
export function validateSubstanceDatabase(): { total: number; valid: boolean; errors: string[] } {
  const allErrors: string[] = [];
  const entries = Object.values(SUBSTANCE_DATABASE);
  for (const s of entries) {
    const { valid, errors } = validateSubstance(s);
    if (!valid) allErrors.push(...errors);
  }
  return { total: entries.length, valid: allErrors.length === 0, errors: allErrors };
}
