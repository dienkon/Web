/**
 * Physical, Thermodynamic, Optical & Transport Substance Properties (lab-3d parity).
 * Provides temperature-dependent viscosity (IAPWS water + Andrade/Kendall-Monroe mixing),
 * surface tension, heat capacity Cp, Antoine vapor pressure constants, enthalpy of dissolution,
 * Ksp / solubility temperature curves, solid morphologies, and Beer-Lambert RGB absorptivities.
 */

import { SubstancePhysicalProps, SubstanceQuantity } from '../../types/chemistry';
import { normalizeFormula } from '../core/formula';

export type SubstancePhysicalEntry = SubstancePhysicalProps & {
  formula: string;
  density_g_ml: number;
};

export const PHYSICAL_SUBSTANCES: Record<string, SubstancePhysicalEntry> = {
  H2O: {
    formula: 'H2O',
    density_g_ml: 0.9982,
    Cp_J_kgK: 4184,
    meltingPoint_K: 273.15,
    boilingPoint_K: 373.15,
    antoine: { A: 8.07131, B: 1730.63, C: 233.426 },
    latentHeatVap_J_kg: 2257000,
    surfaceTension_N_m: 0.0728,
    viscosity_mPa_s: 0.890,
    absorptivity_RGB: [0.0005, 0.0002, 0.0001],
    scatter: 0,
  },
  HCl: {
    formula: 'HCl',
    density_g_ml: 1.05,
    Cp_J_kgK: 3980,
    boilingPoint_K: 381.0,
    surfaceTension_N_m: 0.0715,
    viscosity_mPa_s: 1.08,
    absorptivity_RGB: [0.0, 0.0, 0.0],
    scatter: 0,
  },
  H2SO4: {
    formula: 'H2SO4',
    density_g_ml: 1.84,
    Cp_J_kgK: 1380,
    meltingPoint_K: 283.46,
    boilingPoint_K: 610.0,
    surfaceTension_N_m: 0.0551,
    viscosity_mPa_s: 24.5, // Viscous oily concentrated acid; dilute values blend with water
    dH_sol_J_mol: -95300, // Exothermic dilution hazard
    absorptivity_RGB: [0.002, 0.003, 0.008],
    scatter: 0,
  },
  HNO3: {
    formula: 'HNO3',
    density_g_ml: 1.41,
    Cp_J_kgK: 1760,
    boilingPoint_K: 356.15,
    surfaceTension_N_m: 0.0412,
    viscosity_mPa_s: 1.15,
    absorptivity_RGB: [0.001, 0.003, 0.015],
    scatter: 0,
  },
  CH3COOH: {
    formula: 'CH3COOH',
    density_g_ml: 1.049,
    Cp_J_kgK: 2040,
    meltingPoint_K: 289.8,
    boilingPoint_K: 391.1,
    surfaceTension_N_m: 0.0276,
    viscosity_mPa_s: 1.12,
    absorptivity_RGB: [0.0, 0.0, 0.0],
    scatter: 0,
  },
  NaOH: {
    formula: 'NaOH',
    density_g_ml: 2.13,
    Cp_J_kgK: 1490,
    dH_sol_J_mol: -44500, // Strongly exothermic dissolution
    surfaceTension_N_m: 0.0745,
    viscosity_mPa_s: 1.25,
    absorptivity_RGB: [0.0, 0.0, 0.0],
    scatter: 0,
    solidAppearance: { color: '#f8fafc', morphology: 'pellet', glossiness: 0.35 },
  },
  KOH: {
    formula: 'KOH',
    density_g_ml: 2.12,
    Cp_J_kgK: 1180,
    dH_sol_J_mol: -57600,
    absorptivity_RGB: [0.0, 0.0, 0.0],
    scatter: 0,
    solidAppearance: { color: '#f8fafc', morphology: 'pellet', glossiness: 0.35 },
  },
  NH3: {
    formula: 'NH3',
    density_g_ml: 0.91,
    Cp_J_kgK: 4200,
    surfaceTension_N_m: 0.064,
    viscosity_mPa_s: 0.92,
    absorptivity_RGB: [0.0, 0.0, 0.0],
    scatter: 0,
  },
  NaCl: {
    formula: 'NaCl',
    density_g_ml: 2.165,
    Cp_J_kgK: 853,
    dH_sol_J_mol: 3880, // Mildly endothermic
    solubility_g_100ml_cold: 35.9,
    solubility_g_100ml_hot: 39.1,
    absorptivity_RGB: [0.0, 0.0, 0.0],
    scatter: 0,
    solidAppearance: { color: '#ffffff', morphology: 'crystal', glossiness: 0.55 },
  },
  NH4Cl: {
    formula: 'NH4Cl',
    density_g_ml: 1.527,
    Cp_J_kgK: 1570,
    dH_sol_J_mol: 14800, // Noticeable cooling upon dissolution
    solubility_g_100ml_cold: 37.2,
    solubility_g_100ml_hot: 77.3,
    absorptivity_RGB: [0.01, 0.01, 0.01],
    scatter: 12.0,
    solidAppearance: { color: '#ffffff', morphology: 'powder', glossiness: 0.2 },
  },
  KNO3: {
    formula: 'KNO3',
    density_g_ml: 2.109,
    Cp_J_kgK: 950,
    dH_sol_J_mol: 34900, // Strong endothermic dissolution!
    solubility_g_100ml_cold: 31.6,
    solubility_g_100ml_hot: 245.0,
    absorptivity_RGB: [0.0, 0.0, 0.0],
    scatter: 0,
    solidAppearance: { color: '#f8fafc', morphology: 'crystal', glossiness: 0.6 },
  },
  NH4NO3: {
    formula: 'NH4NO3',
    density_g_ml: 1.725,
    Cp_J_kgK: 1740,
    dH_sol_J_mol: 25690, // Classic cold-pack salt!
    solubility_g_100ml_cold: 192.0,
    solubility_g_100ml_hot: 871.0,
    absorptivity_RGB: [0.0, 0.0, 0.0],
    scatter: 0,
    solidAppearance: { color: '#f8fafc', morphology: 'pellet', glossiness: 0.35 },
  },
  CuSO4: {
    formula: 'CuSO4',
    density_g_ml: 2.286,
    Cp_J_kgK: 790,
    solubility_g_100ml_cold: 22.0,
    solubility_g_100ml_hot: 75.4,
    // Absorbs red light strongly (~650-800 nm) -> authentic sky/azure cyan-blue
    absorptivity_RGB: [0.68, 0.14, 0.015],
    scatter: 0,
    solidAppearance: { color: '#0ea5e9', morphology: 'crystal', glossiness: 0.72 },
  },
  CuCl2: {
    formula: 'CuCl2',
    density_g_ml: 3.386,
    Cp_J_kgK: 580,
    // Green-cyan [CuCl4]2- / [Cu(H2O)6]2+ equilibrium
    absorptivity_RGB: [0.58, 0.08, 0.28],
    scatter: 0,
    solidAppearance: { color: '#0d9488', morphology: 'crystal', glossiness: 0.6 },
  },
  'Cu(NO3)2': {
    formula: 'Cu(NO3)2',
    density_g_ml: 2.32,
    Cp_J_kgK: 760,
    absorptivity_RGB: [0.66, 0.12, 0.015],
    scatter: 0,
    solidAppearance: { color: '#0284c7', morphology: 'crystal', glossiness: 0.65 },
  },
  'Cu(NH3)4SO4': {
    formula: 'Cu(NH3)4SO4',
    density_g_ml: 1.81,
    Cp_J_kgK: 920,
    // Intense ligand-field absorption peaking around orange/yellow -> deep royal azure blue (#1d4ed8)
    absorptivity_RGB: [2.25, 0.85, 0.04],
    scatter: 0,
  },
  'Cu(OH)2': {
    formula: 'Cu(OH)2',
    density_g_ml: 3.37,
    Cp_J_kgK: 650,
    Ksp: 2.2e-20,
    absorptivity_RGB: [0.52, 0.11, 0.02],
    scatter: 18.0,
    solidAppearance: { color: '#38bdf8', morphology: 'gel', glossiness: 0.35 },
  },
  CuO: {
    formula: 'CuO',
    density_g_ml: 6.31,
    Cp_J_kgK: 531,
    absorptivity_RGB: [1.8, 1.8, 1.8],
    scatter: 24.0,
    solidAppearance: { color: '#18181b', morphology: 'powder', glossiness: 0.1 },
  },
  FeCl3: {
    formula: 'FeCl3',
    density_g_ml: 2.90,
    Cp_J_kgK: 600,
    // Amber yellow-brown charge transfer (absorbs blue/violet strongly)
    absorptivity_RGB: [0.06, 0.28, 0.96],
    scatter: 0,
    solidAppearance: { color: '#b45309', morphology: 'crystal', glossiness: 0.45 },
  },
  'Fe(NO3)3': {
    formula: 'Fe(NO3)3',
    density_g_ml: 1.68,
    Cp_J_kgK: 640,
    absorptivity_RGB: [0.05, 0.24, 0.82],
    scatter: 0,
  },
  FeSO4: {
    formula: 'FeSO4',
    density_g_ml: 1.898,
    Cp_J_kgK: 750,
    // Pale seafoam / celadon green
    absorptivity_RGB: [0.16, 0.025, 0.11],
    scatter: 0,
    solidAppearance: { color: '#86efac', morphology: 'crystal', glossiness: 0.55 },
  },
  FeCl2: {
    formula: 'FeCl2',
    density_g_ml: 3.16,
    Cp_J_kgK: 620,
    absorptivity_RGB: [0.18, 0.03, 0.12],
    scatter: 0,
  },
  'Fe(SCN)3': {
    formula: 'Fe(SCN)3',
    density_g_ml: 1.05,
    Cp_J_kgK: 4050,
    // Intense 447 nm absorption -> brilliant blood-red complex
    absorptivity_RGB: [0.08, 2.45, 2.85],
    scatter: 0,
  },
  '[Fe(SCN)]2+': {
    formula: '[Fe(SCN)]2+',
    density_g_ml: 1.05,
    Cp_J_kgK: 4050,
    absorptivity_RGB: [0.08, 2.45, 2.85],
    scatter: 0,
  },
  'Fe(OH)3': {
    formula: 'Fe(OH)3',
    density_g_ml: 3.40,
    Cp_J_kgK: 650,
    Ksp: 2.79e-39,
    absorptivity_RGB: [0.05, 0.42, 1.05],
    scatter: 22.0,
    solidAppearance: { color: '#9a3412', morphology: 'floc', glossiness: 0.18 },
  },
  'Fe(OH)2': {
    formula: 'Fe(OH)2',
    density_g_ml: 3.40,
    Cp_J_kgK: 600,
    Ksp: 4.87e-17,
    absorptivity_RGB: [0.35, 0.12, 0.32],
    scatter: 16.0,
    solidAppearance: { color: '#84cc16', morphology: 'floc', glossiness: 0.2 },
  },
  KMnO4: {
    formula: 'KMnO4',
    density_g_ml: 2.703,
    Cp_J_kgK: 750,
    solubility_g_100ml_cold: 7.6,
    solubility_g_100ml_hot: 25.0,
    // Strong green absorption (525-545 nm) -> intense magenta-purple
    absorptivity_RGB: [0.42, 3.85, 0.18],
    scatter: 0,
    solidAppearance: { color: '#581c87', morphology: 'crystal', glossiness: 0.85 },
  },
  K2Cr2O7: {
    formula: 'K2Cr2O7',
    density_g_ml: 2.676,
    Cp_J_kgK: 745,
    solubility_g_100ml_cold: 15.1,
    solubility_g_100ml_hot: 102.0,
    // Deep blue & green absorption -> fiery orange
    absorptivity_RGB: [0.03, 0.62, 2.15],
    scatter: 0,
    solidAppearance: { color: '#ea580c', morphology: 'crystal', glossiness: 0.72 },
  },
  K2CrO4: {
    formula: 'K2CrO4',
    density_g_ml: 2.732,
    Cp_J_kgK: 750,
    // Pure blue absorption -> vibrant canary yellow
    absorptivity_RGB: [0.015, 0.12, 1.85],
    scatter: 0,
    solidAppearance: { color: '#facc15', morphology: 'crystal', glossiness: 0.65 },
  },
  CoCl2: {
    formula: 'CoCl2',
    density_g_ml: 3.356,
    Cp_J_kgK: 605,
    // Octahedral rose-pink [Co(H2O)6]2+ absorbs green/blue softly
    absorptivity_RGB: [0.04, 0.58, 0.34],
    scatter: 0,
    solidAppearance: { color: '#f43f5e', morphology: 'crystal', glossiness: 0.6 },
  },
  NiSO4: {
    formula: 'NiSO4',
    density_g_ml: 2.07,
    Cp_J_kgK: 780,
    // Emerald green [Ni(H2O)6]2+ absorbs red and blue
    absorptivity_RGB: [0.55, 0.04, 0.38],
    scatter: 0,
    solidAppearance: { color: '#10b981', morphology: 'crystal', glossiness: 0.65 },
  },
  PbI2: {
    formula: 'PbI2',
    density_g_ml: 6.16,
    Cp_J_kgK: 210,
    Ksp: 9.8e-9,
    dH_sol_J_mol: 46500, // Solubility explodes on heating -> Golden Rain upon cooling!
    solubility_g_100ml_cold: 0.075,
    solubility_g_100ml_hot: 0.43,
    absorptivity_RGB: [0.02, 0.14, 1.35],
    scatter: 14.0,
    solidAppearance: { color: '#eab308', morphology: 'crystal', glossiness: 0.92 },
  },
  AgCl: {
    formula: 'AgCl',
    density_g_ml: 5.56,
    Cp_J_kgK: 355,
    Ksp: 1.77e-10,
    absorptivity_RGB: [0.01, 0.01, 0.01],
    scatter: 22.0,
    solidAppearance: { color: '#ffffff', morphology: 'curdy', glossiness: 0.25 },
  },
  AgI: {
    formula: 'AgI',
    density_g_ml: 5.68,
    Cp_J_kgK: 230,
    Ksp: 8.52e-17,
    absorptivity_RGB: [0.01, 0.04, 0.48],
    scatter: 20.0,
    solidAppearance: { color: '#fef08a', morphology: 'curdy', glossiness: 0.2 },
  },
  BaSO4: {
    formula: 'BaSO4',
    density_g_ml: 4.50,
    Cp_J_kgK: 438,
    Ksp: 1.1e-10,
    absorptivity_RGB: [0.005, 0.005, 0.005],
    scatter: 32.0,
    solidAppearance: { color: '#ffffff', morphology: 'powder', glossiness: 0.15 },
  },
  CaCO3: {
    formula: 'CaCO3',
    density_g_ml: 2.71,
    Cp_J_kgK: 818,
    Ksp: 3.36e-9,
    absorptivity_RGB: [0.01, 0.01, 0.01],
    scatter: 26.0,
    solidAppearance: { color: '#f8fafc', morphology: 'granular', glossiness: 0.25 },
  },
  'Al(OH)3': {
    formula: 'Al(OH)3',
    density_g_ml: 2.42,
    Cp_J_kgK: 1190,
    Ksp: 1.3e-33,
    absorptivity_RGB: [0.01, 0.01, 0.01],
    scatter: 18.0,
    solidAppearance: { color: '#f8fafc', morphology: 'gel', glossiness: 0.3 },
  },
  MnO2: {
    formula: 'MnO2',
    density_g_ml: 5.026,
    Cp_J_kgK: 620,
    absorptivity_RGB: [1.5, 1.5, 1.5],
    scatter: 22.0,
    solidAppearance: { color: '#18181b', morphology: 'powder', glossiness: 0.12 },
  },
  S: {
    formula: 'S',
    density_g_ml: 2.07,
    Cp_J_kgK: 710,
    absorptivity_RGB: [0.02, 0.06, 0.55],
    scatter: 28.0,
    solidAppearance: { color: '#fef08a', morphology: 'powder', glossiness: 0.18 },
  },
  I2: {
    formula: 'I2',
    density_g_ml: 4.933,
    Cp_J_kgK: 214,
    meltingPoint_K: 386.85,
    boilingPoint_K: 457.4,
    solubility_g_100ml_cold: 0.03,
    solubility_g_100ml_hot: 0.09,
    absorptivity_RGB: [0.22, 1.55, 2.25], // Amber-brown in aqueous I3-/I2
    scatter: 0,
    solidAppearance: { color: '#2e1065', morphology: 'crystal', glossiness: 0.85 },
  },
  Br2: {
    formula: 'Br2',
    density_g_ml: 3.102,
    Cp_J_kgK: 474,
    boilingPoint_K: 331.95,
    surfaceTension_N_m: 0.0415,
    viscosity_mPa_s: 0.94,
    absorptivity_RGB: [0.08, 0.95, 1.95], // Red-orange halogen water
    scatter: 0,
  },
  Na: {
    formula: 'Na',
    density_g_ml: 0.971,
    Cp_J_kgK: 1230,
    meltingPoint_K: 370.94,
    boilingPoint_K: 1156,
    absorptivity_RGB: [0, 0, 0],
    scatter: 0,
    solidAppearance: { color: '#cbd5e1', morphology: 'pellet', glossiness: 0.85, metallic: true },
  },
  K: {
    formula: 'K',
    density_g_ml: 0.862,
    Cp_J_kgK: 757,
    meltingPoint_K: 336.7,
    boilingPoint_K: 1032,
    absorptivity_RGB: [0, 0, 0],
    scatter: 0,
    solidAppearance: { color: '#e2e8f0', morphology: 'pellet', glossiness: 0.82, metallic: true },
  },
  Fe: {
    formula: 'Fe',
    density_g_ml: 7.874,
    Cp_J_kgK: 449,
    meltingPoint_K: 1811,
    absorptivity_RGB: [0, 0, 0],
    scatter: 0,
    solidAppearance: { color: '#64748b', morphology: 'nail', glossiness: 0.72, metallic: true },
  },
  Zn: {
    formula: 'Zn',
    density_g_ml: 7.14,
    Cp_J_kgK: 388,
    meltingPoint_K: 692.68,
    absorptivity_RGB: [0, 0, 0],
    scatter: 0,
    solidAppearance: { color: '#94a3b8', morphology: 'granular', glossiness: 0.68, metallic: true },
  },
  Mg: {
    formula: 'Mg',
    density_g_ml: 1.738,
    Cp_J_kgK: 1023,
    meltingPoint_K: 923,
    absorptivity_RGB: [0, 0, 0],
    scatter: 0,
    solidAppearance: { color: '#cbd5e1', morphology: 'ribbon', glossiness: 0.85, metallic: true },
  },
  Al: {
    formula: 'Al',
    density_g_ml: 2.70,
    Cp_J_kgK: 897,
    meltingPoint_K: 933.47,
    absorptivity_RGB: [0, 0, 0],
    scatter: 0,
    solidAppearance: { color: '#e2e8f0', morphology: 'ribbon', glossiness: 0.88, metallic: true },
  },
  Cu: {
    formula: 'Cu',
    density_g_ml: 8.96,
    Cp_J_kgK: 385,
    meltingPoint_K: 1357.77,
    absorptivity_RGB: [0, 0, 0],
    scatter: 0,
    solidAppearance: { color: '#d97706', morphology: 'wire', glossiness: 0.85, metallic: true },
  },
  CH3CH2OH: {
    formula: 'CH3CH2OH',
    density_g_ml: 0.789,
    Cp_J_kgK: 2440,
    boilingPoint_K: 351.52,
    antoine: { A: 8.20417, B: 1642.89, C: 230.300 },
    latentHeatVap_J_kg: 841000,
    surfaceTension_N_m: 0.0223,
    viscosity_mPa_s: 1.074,
    absorptivity_RGB: [0, 0, 0],
    scatter: 0,
  },
  C2H5OH: {
    formula: 'C2H5OH',
    density_g_ml: 0.789,
    Cp_J_kgK: 2440,
    boilingPoint_K: 351.52,
    antoine: { A: 8.20417, B: 1642.89, C: 230.300 },
    latentHeatVap_J_kg: 841000,
    surfaceTension_N_m: 0.0223,
    viscosity_mPa_s: 1.074,
    absorptivity_RGB: [0, 0, 0],
    scatter: 0,
  },
  'C3H5(OH)3': {
    formula: 'C3H5(OH)3',
    density_g_ml: 1.261,
    Cp_J_kgK: 2400,
    boilingPoint_K: 563.0,
    surfaceTension_N_m: 0.0634,
    viscosity_mPa_s: 934.0, // Extremely viscous syrup!
    absorptivity_RGB: [0.001, 0.001, 0.001],
    scatter: 0,
  },
  'Cu(C3H7O3)2': {
    formula: 'Cu(C3H7O3)2',
    density_g_ml: 1.20,
    Cp_J_kgK: 3200,
    viscosity_mPa_s: 18.0,
    absorptivity_RGB: [1.85, 0.72, 0.06],
    scatter: 0,
  },
  C6H14: {
    formula: 'C6H14',
    density_g_ml: 0.659, // Floats on water
    Cp_J_kgK: 2260,
    boilingPoint_K: 341.9,
    surfaceTension_N_m: 0.0184,
    viscosity_mPa_s: 0.30,
    absorptivity_RGB: [0, 0, 0],
    scatter: 0,
  },
  CCl4: {
    formula: 'CCl4',
    density_g_ml: 1.589, // Sinks cleanly below water
    Cp_J_kgK: 850,
    boilingPoint_K: 349.9,
    surfaceTension_N_m: 0.0268,
    viscosity_mPa_s: 0.90,
    absorptivity_RGB: [0, 0, 0],
    scatter: 0,
  },
  CH3COOC2H5: {
    formula: 'CH3COOC2H5',
    density_g_ml: 0.902, // Ester layer floating on water
    Cp_J_kgK: 1920,
    boilingPoint_K: 350.2,
    surfaceTension_N_m: 0.0238,
    viscosity_mPa_s: 0.426,
    absorptivity_RGB: [0.002, 0.001, 0.004],
    scatter: 0,
  },
  Starch: {
    formula: 'Starch',
    density_g_ml: 1.50,
    Cp_J_kgK: 1500,
    viscosity_mPa_s: 4.5, // Slightly thick colloidal solution
    absorptivity_RGB: [0.005, 0.005, 0.008],
    scatter: 3.5,
  },
  H2O2: {
    formula: 'H2O2',
    density_g_ml: 1.11,
    Cp_J_kgK: 3800,
    boilingPoint_K: 423.3,
    surfaceTension_N_m: 0.0755,
    viscosity_mPa_s: 1.18,
    absorptivity_RGB: [0.001, 0.001, 0.001],
    scatter: 0,
  },
  SDS: {
    formula: 'SDS',
    density_g_ml: 1.01,
    Cp_J_kgK: 3900,
    surfaceTension_N_m: 0.0285, // Strong surfactant lowering interfacial tension for foam stability
    viscosity_mPa_s: 3.4,
    absorptivity_RGB: [0.001, 0.001, 0.001],
    scatter: 0.35,
  },
  C17H35COONa: {
    formula: 'C17H35COONa',
    density_g_ml: 1.01,
    Cp_J_kgK: 3850,
    surfaceTension_N_m: 0.032,
    viscosity_mPa_s: 2.2,
    absorptivity_RGB: [0.002, 0.002, 0.002],
    scatter: 0.25,
  },
  CH3COOCH3: {
    formula: 'CH3COOCH3',
    density_g_ml: 0.932,
    Cp_J_kgK: 1960,
    boilingPoint_K: 330.1,
    surfaceTension_N_m: 0.0246,
    viscosity_mPa_s: 0.364,
    absorptivity_RGB: [0.002, 0.001, 0.003],
    scatter: 0,
  },
  CH3OH: {
    formula: 'CH3OH',
    density_g_ml: 0.792,
    Cp_J_kgK: 2530,
    boilingPoint_K: 337.8,
    surfaceTension_N_m: 0.0226,
    viscosity_mPa_s: 0.544,
    absorptivity_RGB: [0, 0, 0],
    scatter: 0,
  },
  Cu2O: {
    formula: 'Cu2O',
    density_g_ml: 6.0,
    Cp_J_kgK: 490,
    meltingPoint_K: 1508,
    absorptivity_RGB: [0.1, 1.5, 1.9],
    scatter: 2.8,
    solidAppearance: { color: '#dc2626', morphology: 'powder', glossiness: 0.2 },
  },
  C6H2Br3OH: {
    formula: 'C6H2Br3OH',
    density_g_ml: 2.55,
    Cp_J_kgK: 1100,
    absorptivity_RGB: [0.02, 0.02, 0.02],
    scatter: 2.4,
    solidAppearance: { color: '#ffffff', morphology: 'crystalline', glossiness: 0.45 },
  },
  C6H2Br3NH2: {
    formula: 'C6H2Br3NH2',
    density_g_ml: 2.35,
    Cp_J_kgK: 1150,
    absorptivity_RGB: [0.02, 0.02, 0.02],
    scatter: 2.4,
    solidAppearance: { color: '#ffffff', morphology: 'crystalline', glossiness: 0.45 },
  },
  Fe2O3: {
    formula: 'Fe2O3',
    density_g_ml: 5.24,
    Cp_J_kgK: 650,
    absorptivity_RGB: [0.4, 1.6, 2.2],
    scatter: 2.2,
    solidAppearance: { color: '#9a3412', morphology: 'powder', glossiness: 0.15 },
  },
  CaO: {
    formula: 'CaO',
    density_g_ml: 3.34,
    Cp_J_kgK: 750,
    dH_sol_J_mol: -82000,
    absorptivity_RGB: [0.02, 0.02, 0.02],
    scatter: 1.8,
    solidAppearance: { color: '#f8fafc', morphology: 'granular', glossiness: 0.1 },
  },
  'Ca(OH)2': {
    formula: 'Ca(OH)2',
    density_g_ml: 2.21,
    Cp_J_kgK: 1180,
    solubility_g_100ml_cold: 0.173,
    solubility_g_100ml_hot: 0.077,
    Ksp: 5.5e-6,
    absorptivity_RGB: [0.01, 0.01, 0.01],
    scatter: 1.9,
    solidAppearance: { color: '#ffffff', morphology: 'powder', glossiness: 0.15 },
  },
  'Cu(C6H11O6)2': {
    formula: 'Cu(C6H11O6)2',
    density_g_ml: 1.09,
    Cp_J_kgK: 3850,
    viscosity_mPa_s: 1.25,
    absorptivity_RGB: [2.8, 1.35, 0.1],
    scatter: 0,
  },
};

export function getPhysicalSubstance(formula: string): SubstancePhysicalEntry | undefined {
  const clean = normalizeFormula(formula);
  if (PHYSICAL_SUBSTANCES[clean]) return PHYSICAL_SUBSTANCES[clean];
  if (clean === 'TINHBOT' || clean === 'C6H10O5') return PHYSICAL_SUBSTANCES.Starch;
  if (clean === 'C3H8O3') return PHYSICAL_SUBSTANCES['C3H5(OH)3'];
  if (clean === '[CU(NH3)4]SO4') return PHYSICAL_SUBSTANCES['Cu(NH3)4SO4'];
  // Match stripped hydrates / stripped states e.g. CuSO4.5H2O -> CuSO4, BaSO4(s) -> BaSO4
  const base = clean.replace(/(\(s\)|\(aq\)|\(l\)|\(g\))$/i, '').split('.')[0];
  if (PHYSICAL_SUBSTANCES[base]) return PHYSICAL_SUBSTANCES[base];
  const lower = base.toLowerCase();
  const key = Object.keys(PHYSICAL_SUBSTANCES).find(k => k.toLowerCase() === lower);
  return key ? PHYSICAL_SUBSTANCES[key] : undefined;
}

/**
 * Pure liquid water dynamic viscosity in mPa*s (cP) across 0..100+ °C
 * Matches IAPWS R12-08 within <1.2% using Vogel equation:
 * mu = 0.02414 * 10^(247.8 / (T_K - 140))
 */
export function waterViscosity_mPa_s(temp_c: number): number {
  const T_K = Math.max(265, Math.min(450, temp_c + 273.15));
  return 0.02414 * Math.pow(10, 247.8 / (T_K - 140));
}

export interface MixturePhysicalProperties {
  viscosity_mPa_s: number;
  surfaceTension_N_m: number;
  density_g_ml: number;
  cp_J_kgK: number;
}

/**
 * Computes effective thermodynamic and transport properties of a vessel's liquid phase:
 * - Arrhenius/Kendall-Monroe log-viscosity mixing rule (adjusted for solute & T)
 * - Mass-weighted specific heat capacity Cp
 * - Surfactant-adjusted surface tension
 */
export function calculateMixturePhysicalProperties(
  contents: SubstanceQuantity[],
  volume_ml: number,
  temp_c: number
): MixturePhysicalProperties {
  const baseWaterVisc = waterViscosity_mPa_s(temp_c);
  if (volume_ml <= 1e-6 || contents.length === 0) {
    return {
      viscosity_mPa_s: baseWaterVisc,
      surfaceTension_N_m: 0.0728,
      density_g_ml: 0.998,
      cp_J_kgK: 4184,
    };
  }

  let totalLiquidMass = 0;
  let weightedCp = 0;
  let weightedLnVisc = 0;
  let weightedSigma = 0;
  let solidSuspensionMass = 0;
  let dissolvedIonicMolarity = 0;

  const tempRatio = (298.15 / Math.max(265, temp_c + 273.15));

  for (const item of contents) {
    if (item.mass_g <= 0) continue;
    if (item.state === 'g') continue;
    if (item.state === 's') {
      solidSuspensionMass += item.mass_g;
      continue;
    }

    const phys = getPhysicalSubstance(item.formula);
    const m = item.mass_g;
    totalLiquidMass += m;

    const cp = phys?.Cp_J_kgK ?? 3950;
    weightedCp += m * cp;

    // Temperature-scaled species viscosity
    const refVisc = phys?.formula === 'H2O'
      ? baseWaterVisc
      : (phys?.viscosity_mPa_s ?? baseWaterVisc) * Math.pow(Math.max(0.25, tempRatio), 2.2);
    weightedLnVisc += m * Math.log(Math.max(0.15, refVisc));

    const sigma = phys?.surfaceTension_N_m ?? 0.072;
    weightedSigma += m * sigma;

    if (item.state === 'aq' && item.formula !== 'H2O') {
      dissolvedIonicMolarity += (item.moles / (volume_ml / 1000));
    }
  }

  // Fallback aqueous bulk mass from vessel volume if H2O wasn't listed explicitly
  const inferredWaterMass = Math.max(0, volume_ml * 0.998 - totalLiquidMass);
  if (inferredWaterMass > 0.01) {
    totalLiquidMass += inferredWaterMass;
    weightedCp += inferredWaterMass * 4184;
    weightedLnVisc += inferredWaterMass * Math.log(baseWaterVisc);
    weightedSigma += inferredWaterMass * 0.0728;
  }

  if (totalLiquidMass <= 1e-6) {
    return {
      viscosity_mPa_s: baseWaterVisc,
      surfaceTension_N_m: 0.0728,
      density_g_ml: 0.998,
      cp_J_kgK: 4184,
    };
  }

  // Einstein viscosity boost for suspended solid precipitates + Jones-Dole electrostriction
  const solidVolFraction = Math.min(0.25, (solidSuspensionMass / 3.0) / Math.max(1, volume_ml));
  const suspensionMultiplier = 1 + 2.5 * solidVolFraction + Math.min(0.35, dissolvedIonicMolarity * 0.06);

  const visc = Math.exp(weightedLnVisc / totalLiquidMass) * suspensionMultiplier;
  const density = Math.max(0.55, Math.min(2.2, (totalLiquidMass + solidSuspensionMass * 0.25) / volume_ml));

  return {
    viscosity_mPa_s: Number(Math.max(0.2, Math.min(1200, visc)).toFixed(3)),
    surfaceTension_N_m: Number(Math.max(0.018, Math.min(0.085, weightedSigma / totalLiquidMass)).toFixed(4)),
    density_g_ml: Number(density.toFixed(4)),
    cp_J_kgK: Number(Math.max(1100, Math.min(4300, weightedCp / totalLiquidMass)).toFixed(1)),
  };
}

/**
 * Temperature-dependent solubility in g / 100 mL H2O.
 * Captures strong positive van 't Hoff solubility (PbI2, KNO3, CuSO4, NH4Cl)
 * enabling hot dissolution and cooling crystallization ("golden rain").
 */
export function solubilityAtTemperature_g_100ml(formula: string, temp_c: number): number | null {
  const phys = getPhysicalSubstance(formula);
  if (!phys || phys.solubility_g_100ml_cold === undefined) return null;
  const cold = phys.solubility_g_100ml_cold;
  const hot = phys.solubility_g_100ml_hot ?? cold;
  const frac = Math.max(0, Math.min(1, (temp_c - 20) / 80));
  // Exponential-like solubility increase with temperature for salt dissolution
  const curved = cold * Math.pow(Math.max(1, hot / Math.max(1e-5, cold)), frac);
  return Math.min(hot * 1.15, Math.max(cold * 0.65, curved));
}
