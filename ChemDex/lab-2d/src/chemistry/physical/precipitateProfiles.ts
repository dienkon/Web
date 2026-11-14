/**
 * Species-specific Precipitate & Solid Buoyancy, Stokes Sedimentation,
 * Hydrophobic Surface Flotation, and Bubble-Entrained Flotation Profiles.
 * Mirrors Lab-3D `PRECIPITATE_PROFILES` and Schiller-Naumann / Stokes drag physics.
 */

import { PrecipitateMorphology } from '../../types/chemistry';
import { normalizeFormula } from '../core/formula';

export type BuoyancyMode = 'sink' | 'suspend' | 'float';

export interface PrecipitatePhysicalProfile {
  formula: string;
  colorHex: string;
  morphology: PrecipitateMorphology;
  /** Intrinsic crystal/solid material density (g/cm3). */
  particleDensity_g_cm3: number;
  /** Effective hydrated floc/aggregate density when suspended in aqueous media (g/cm3). */
  effectiveWetDensity_g_cm3: number;
  baseParticleRadius_mm: number;
  cloudinessFactor: number;
  /** True for hydrophobic/waxy/alkali solids that trap air/gas or float on water meniscus. */
  hydrophobicFloat?: boolean;
  /** 0..1 tendency of particles/flocs to catch rising gas bubbles and float while effervescing. */
  bubbleEntrainment: number;
}

export const PRECIPITATE_PROFILES_2D: Record<string, PrecipitatePhysicalProfile> = {
  BASO4: {
    formula: 'BaSO4',
    colorHex: '#ffffff',
    morphology: 'milky',
    particleDensity_g_cm3: 4.5,
    effectiveWetDensity_g_cm3: 4.5,
    baseParticleRadius_mm: 0.0025,
    cloudinessFactor: 0.92,
    bubbleEntrainment: 0.15,
  },
  AGCL: {
    formula: 'AgCl',
    colorHex: '#f8fafc',
    morphology: 'curdy',
    particleDensity_g_cm3: 5.56,
    effectiveWetDensity_g_cm3: 5.2,
    baseParticleRadius_mm: 0.008,
    cloudinessFactor: 0.78,
    bubbleEntrainment: 0.12,
  },
  AGBR: {
    formula: 'AgBr',
    colorHex: '#f5edcd',
    morphology: 'curdy',
    particleDensity_g_cm3: 6.47,
    effectiveWetDensity_g_cm3: 6.0,
    baseParticleRadius_mm: 0.006,
    cloudinessFactor: 0.86,
    bubbleEntrainment: 0.1,
  },
  AGI: {
    formula: 'AgI',
    colorHex: '#f6e58d',
    morphology: 'curdy',
    particleDensity_g_cm3: 5.67,
    effectiveWetDensity_g_cm3: 5.4,
    baseParticleRadius_mm: 0.006,
    cloudinessFactor: 0.88,
    bubbleEntrainment: 0.1,
  },
  PBI2: {
    formula: 'PbI2',
    colorHex: '#eab308',
    morphology: 'plates',
    particleDensity_g_cm3: 6.16,
    effectiveWetDensity_g_cm3: 6.16,
    baseParticleRadius_mm: 0.035,
    cloudinessFactor: 0.35,
    bubbleEntrainment: 0.08,
  },
  PBCL2: {
    formula: 'PbCl2',
    colorHex: '#f8fafc',
    morphology: 'crystalline',
    particleDensity_g_cm3: 5.85,
    effectiveWetDensity_g_cm3: 5.85,
    baseParticleRadius_mm: 0.025,
    cloudinessFactor: 0.35,
    bubbleEntrainment: 0.08,
  },
  PBSO4: {
    formula: 'PbSO4',
    colorHex: '#ffffff',
    morphology: 'powder',
    particleDensity_g_cm3: 6.29,
    effectiveWetDensity_g_cm3: 6.2,
    baseParticleRadius_mm: 0.004,
    cloudinessFactor: 0.9,
    bubbleEntrainment: 0.1,
  },
  PBS: {
    formula: 'PbS',
    colorHex: '#09090b',
    morphology: 'powder',
    particleDensity_g_cm3: 7.6,
    effectiveWetDensity_g_cm3: 7.5,
    baseParticleRadius_mm: 0.003,
    cloudinessFactor: 0.95,
    bubbleEntrainment: 0.05,
  },
  AG2S: {
    formula: 'Ag2S',
    colorHex: '#18181b',
    morphology: 'powder',
    particleDensity_g_cm3: 7.2,
    effectiveWetDensity_g_cm3: 7.1,
    baseParticleRadius_mm: 0.003,
    cloudinessFactor: 0.95,
    bubbleEntrainment: 0.05,
  },
  CUS: {
    formula: 'CuS',
    colorHex: '#09090b',
    morphology: 'powder',
    particleDensity_g_cm3: 4.6,
    effectiveWetDensity_g_cm3: 4.4,
    baseParticleRadius_mm: 0.002,
    cloudinessFactor: 0.95,
    bubbleEntrainment: 0.12,
  },
  ZNS: {
    formula: 'ZnS',
    colorHex: '#f8fafc',
    morphology: 'powder',
    particleDensity_g_cm3: 4.09,
    effectiveWetDensity_g_cm3: 3.9,
    baseParticleRadius_mm: 0.0025,
    cloudinessFactor: 0.9,
    bubbleEntrainment: 0.18,
  },
  'CU(OH)2': {
    formula: 'Cu(OH)2',
    colorHex: '#38bdf8',
    morphology: 'gel',
    particleDensity_g_cm3: 3.37,
    effectiveWetDensity_g_cm3: 1.07, // Hydrated gel envelope traps water
    baseParticleRadius_mm: 0.004,
    cloudinessFactor: 0.85,
    bubbleEntrainment: 0.65,
  },
  'FE(OH)3': {
    formula: 'Fe(OH)3',
    colorHex: '#9a3412',
    morphology: 'floc',
    particleDensity_g_cm3: 3.4,
    effectiveWetDensity_g_cm3: 1.08,
    baseParticleRadius_mm: 0.005,
    cloudinessFactor: 0.9,
    bubbleEntrainment: 0.68,
  },
  'FE(OH)2': {
    formula: 'Fe(OH)2',
    colorHex: '#d9f99d',
    morphology: 'floc',
    particleDensity_g_cm3: 3.4,
    effectiveWetDensity_g_cm3: 1.08,
    baseParticleRadius_mm: 0.004,
    cloudinessFactor: 0.85,
    bubbleEntrainment: 0.65,
  },
  'AL(OH)3': {
    formula: 'Al(OH)3',
    colorHex: '#f1f5f9',
    morphology: 'gel',
    particleDensity_g_cm3: 2.42,
    effectiveWetDensity_g_cm3: 1.03, // High porosity hydrated alum gel (floats in dense brines)
    baseParticleRadius_mm: 0.003,
    cloudinessFactor: 0.82,
    bubbleEntrainment: 0.78,
  },
  'ZN(OH)2': {
    formula: 'Zn(OH)2',
    colorHex: '#f1f5f9',
    morphology: 'gel',
    particleDensity_g_cm3: 3.05,
    effectiveWetDensity_g_cm3: 1.06,
    baseParticleRadius_mm: 0.0035,
    cloudinessFactor: 0.82,
    bubbleEntrainment: 0.7,
  },
  'MG(OH)2': {
    formula: 'Mg(OH)2',
    colorHex: '#ffffff',
    morphology: 'gel',
    particleDensity_g_cm3: 2.34,
    effectiveWetDensity_g_cm3: 1.03,
    baseParticleRadius_mm: 0.003,
    cloudinessFactor: 0.88,
    bubbleEntrainment: 0.82,
  },
  'CA(OH)2': {
    formula: 'Ca(OH)2',
    colorHex: '#f8fafc',
    morphology: 'milky',
    particleDensity_g_cm3: 2.24,
    effectiveWetDensity_g_cm3: 1.25,
    baseParticleRadius_mm: 0.004,
    cloudinessFactor: 0.88,
    bubbleEntrainment: 0.45,
  },
  'NI(OH)2': {
    formula: 'Ni(OH)2',
    colorHex: '#4ade80',
    morphology: 'gel',
    particleDensity_g_cm3: 4.1,
    effectiveWetDensity_g_cm3: 1.12,
    baseParticleRadius_mm: 0.004,
    cloudinessFactor: 0.84,
    bubbleEntrainment: 0.55,
  },
  'CO(OH)2': {
    formula: 'Co(OH)2',
    colorHex: '#f472b6',
    morphology: 'gel',
    particleDensity_g_cm3: 3.6,
    effectiveWetDensity_g_cm3: 1.1,
    baseParticleRadius_mm: 0.004,
    cloudinessFactor: 0.84,
    bubbleEntrainment: 0.58,
  },
  CACO3: {
    formula: 'CaCO3',
    colorHex: '#f8fafc',
    morphology: 'milky',
    particleDensity_g_cm3: 2.71,
    effectiveWetDensity_g_cm3: 2.55,
    baseParticleRadius_mm: 0.006,
    cloudinessFactor: 0.82,
    bubbleEntrainment: 0.6,
  },
  BACO3: {
    formula: 'BaCO3',
    colorHex: '#f8fafc',
    morphology: 'milky',
    particleDensity_g_cm3: 4.29,
    effectiveWetDensity_g_cm3: 4.1,
    baseParticleRadius_mm: 0.005,
    cloudinessFactor: 0.86,
    bubbleEntrainment: 0.3,
  },
  AG2CRO4: {
    formula: 'Ag2CrO4',
    colorHex: '#991b1b',
    morphology: 'powder',
    particleDensity_g_cm3: 5.62,
    effectiveWetDensity_g_cm3: 5.5,
    baseParticleRadius_mm: 0.004,
    cloudinessFactor: 0.88,
    bubbleEntrainment: 0.1,
  },
  BACRO4: {
    formula: 'BaCrO4',
    colorHex: '#facc15',
    morphology: 'powder',
    particleDensity_g_cm3: 4.5,
    effectiveWetDensity_g_cm3: 4.4,
    baseParticleRadius_mm: 0.004,
    cloudinessFactor: 0.88,
    bubbleEntrainment: 0.1,
  },
  PBCRO4: {
    formula: 'PbCrO4',
    colorHex: '#eab308',
    morphology: 'powder',
    particleDensity_g_cm3: 6.12,
    effectiveWetDensity_g_cm3: 6.0,
    baseParticleRadius_mm: 0.004,
    cloudinessFactor: 0.9,
    bubbleEntrainment: 0.1,
  },
  CU2O: {
    formula: 'Cu2O',
    colorHex: '#b84326',
    morphology: 'powder',
    particleDensity_g_cm3: 6.0,
    effectiveWetDensity_g_cm3: 5.9,
    baseParticleRadius_mm: 0.005,
    cloudinessFactor: 0.85,
    bubbleEntrainment: 0.1,
  },
  CUO: {
    formula: 'CuO',
    colorHex: '#18181b',
    morphology: 'powder',
    particleDensity_g_cm3: 6.31,
    effectiveWetDensity_g_cm3: 6.2,
    baseParticleRadius_mm: 0.004,
    cloudinessFactor: 0.95,
    bubbleEntrainment: 0.08,
  },
  MNO2: {
    formula: 'MnO2',
    colorHex: '#18181b',
    morphology: 'powder',
    particleDensity_g_cm3: 5.03,
    effectiveWetDensity_g_cm3: 4.9,
    baseParticleRadius_mm: 0.005,
    cloudinessFactor: 0.95,
    bubbleEntrainment: 0.45,
  },
  AG: {
    formula: 'Ag',
    colorHex: '#e2e8f0',
    morphology: 'crystalline',
    particleDensity_g_cm3: 10.49,
    effectiveWetDensity_g_cm3: 10.49,
    baseParticleRadius_mm: 0.01,
    cloudinessFactor: 0.25,
    bubbleEntrainment: 0.0,
  },
  S: {
    formula: 'S',
    colorHex: '#fef08a',
    morphology: 'colloidal',
    particleDensity_g_cm3: 2.07,
    effectiveWetDensity_g_cm3: 0.94, // Hydrophobic sulfur traps micro-air film & floats on water surface/froth
    baseParticleRadius_mm: 0.002,
    cloudinessFactor: 0.85,
    hydrophobicFloat: true,
    bubbleEntrainment: 0.92,
  },
  C: {
    formula: 'C',
    colorHex: '#1e293b',
    morphology: 'powder',
    particleDensity_g_cm3: 0.85, // Porous charcoal / carbon black traps air pockets -> floats at meniscus
    effectiveWetDensity_g_cm3: 0.72,
    baseParticleRadius_mm: 0.006,
    cloudinessFactor: 0.7,
    hydrophobicFloat: true,
    bubbleEntrainment: 0.9,
  },
  'CA(C17H35COO)2': {
    formula: 'Ca(C17H35COO)2',
    colorHex: '#f8fafc',
    morphology: 'curdy',
    particleDensity_g_cm3: 0.88, // Waxy calcium stearate soap curd < water density -> floats prominently!
    effectiveWetDensity_g_cm3: 0.82,
    baseParticleRadius_mm: 0.015,
    cloudinessFactor: 0.65,
    hydrophobicFloat: true,
    bubbleEntrainment: 0.95,
  },
  'MG(C17H35COO)2': {
    formula: 'Mg(C17H35COO)2',
    colorHex: '#f1f5f9',
    morphology: 'curdy',
    particleDensity_g_cm3: 0.87,
    effectiveWetDensity_g_cm3: 0.81,
    baseParticleRadius_mm: 0.015,
    cloudinessFactor: 0.65,
    hydrophobicFloat: true,
    bubbleEntrainment: 0.95,
  },
  C6H2BR3OH: {
    formula: 'C6H2Br3OH',
    colorHex: '#f8fafc',
    morphology: 'floc',
    particleDensity_g_cm3: 1.15,
    effectiveWetDensity_g_cm3: 0.92, // Waxy hydrophobic organic tribromophenol curds float partially in foam
    baseParticleRadius_mm: 0.01,
    cloudinessFactor: 0.82,
    hydrophobicFloat: true,
    bubbleEntrainment: 0.8,
  },
  C6H2BR3NH2: {
    formula: 'C6H2Br3NH2',
    colorHex: '#f8fafc',
    morphology: 'floc',
    particleDensity_g_cm3: 1.12,
    effectiveWetDensity_g_cm3: 0.9,
    baseParticleRadius_mm: 0.01,
    cloudinessFactor: 0.82,
    hydrophobicFloat: true,
    bubbleEntrainment: 0.8,
  },
};

export function getPrecipitateProfile2D(formula: string, fallbackColor = '#ffffff', fallbackMorph: PrecipitateMorphology = 'powder'): PrecipitatePhysicalProfile {
  const norm = normalizeFormula(formula);
  const direct = PRECIPITATE_PROFILES_2D[norm];
  if (direct) return direct;

  return {
    formula,
    colorHex: fallbackColor,
    morphology: fallbackMorph,
    particleDensity_g_cm3: 3.2,
    effectiveWetDensity_g_cm3: fallbackMorph === 'gel' || fallbackMorph === 'floc' ? 1.07 : 2.8,
    baseParticleRadius_mm: 0.004,
    cloudinessFactor: 0.8,
    bubbleEntrainment: fallbackMorph === 'gel' || fallbackMorph === 'floc' ? 0.6 : 0.25,
  };
}

export interface BuoyancyResult2D {
  buoyancy: BuoyancyMode;
  density_g_cm3: number;
  /** Signed vertical normalized velocity impulse (>0 sinks downward, <0 floats upward). */
  signedSettlingSpeed: number;
}

/**
 * Computes physical Stokes sedimentation vs Archimedes flotation for any precipitate or solid suspension.
 * - If effectiveWetDensity < fluidDensity (or hydrophobic/soap scum), Δρ < 0 => particle rises & forms a top floating raft.
 * - If gas effervescence is active and particle has high bubbleEntrainment, micro-bubbles buoy flocs upward until bubbling ends.
 * - Dense crystals/salts (BaSO4, PbI2, AgCl, CuS) have Δρ > 0 => sink cleanly to bottom sediment cake.
 */
export function computeParticleBuoyancy(
  formula: string,
  fluidDensity_g_ml = 1.0,
  hasGas = false,
  viscosity_mPa_s = 0.89,
  fallbackColor = '#ffffff',
  fallbackMorph: PrecipitateMorphology = 'powder'
): BuoyancyResult2D {
  const prof = getPrecipitateProfile2D(formula, fallbackColor, fallbackMorph);
  const rhoFluid = Math.max(0.65, fluidDensity_g_ml);
  const deltaRho = prof.effectiveWetDensity_g_cm3 - rhoFluid;
  const viscScale = Math.max(0.2, Math.min(1.5, 0.89 / Math.max(0.35, viscosity_mPa_s)));

  // Gas-bubble flotation transiently lifts hydrophobic & light gelatinous flocs to the meniscus
  if (hasGas && prof.bubbleEntrainment >= 0.55) {
    return {
      buoyancy: 'float',
      density_g_cm3: prof.effectiveWetDensity_g_cm3,
      signedSettlingSpeed: -(0.09 + prof.bubbleEntrainment * 0.14) * viscScale,
    };
  }

  // Inherently buoyant species: ρ_eff < ρ_fluid (e.g. hydrophobic S film, charcoal C, Ca/Mg soap curds, or gel flocs in heavy brine/acid)
  if (prof.hydrophobicFloat || deltaRho < -0.02) {
    const upwardMag = Math.max(0.05, Math.min(0.24, Math.abs(deltaRho) * 0.22 + (prof.hydrophobicFloat ? 0.08 : 0.03)));
    return {
      buoyancy: 'float',
      density_g_cm3: prof.effectiveWetDensity_g_cm3,
      signedSettlingSpeed: -upwardMag * viscScale,
    };
  }

  // Neutrally buoyant hydrated colloids / gels stay suspended and swirl easily
  if (
    deltaRho < 0.14 &&
    (prof.morphology === 'gel' || prof.morphology === 'gelatinous' || prof.morphology === 'floc' || prof.morphology === 'flocculent' || prof.morphology === 'colloidal')
  ) {
    return {
      buoyancy: 'suspend',
      density_g_cm3: prof.effectiveWetDensity_g_cm3,
      signedSettlingSpeed: Math.max(0.015, deltaRho * 0.18) * viscScale,
    };
  }

  // Heavy powders, curds, and hexagonal plates settle toward the bottom sediment cake via Stokes drag
  const baseSink =
    prof.morphology === 'plates' || prof.morphology === 'crystalline'
      ? 0.085
      : prof.morphology === 'curdy'
        ? 0.17
        : 0.075 + Math.min(0.18, deltaRho * 0.03);

  return {
    buoyancy: 'sink',
    density_g_cm3: prof.effectiveWetDensity_g_cm3,
    signedSettlingSpeed: baseSink * viscScale,
  };
}
