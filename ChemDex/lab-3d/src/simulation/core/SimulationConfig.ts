import { PrecipitateProfile } from './SimulationTypes';
import { sameMolecularFormula, identifySpecies } from '../../science/speciesIdentity';

export interface SimulationConfig {
  gravity_m_s2: number;
  waterBoilingPoint_c: number;
  ambientTemperature_c: number;
  
  // Evaporation coefficients (Antoine equation / Dalton empirical surface model)
  evaporationLatentHeat_J_g: number;
  evaporationCoefficient: number; // base vaporization factor per cm2
  
  // Boiling nucleation thresholds
  microbubbleTempThreshold_c: number; // ~80°C
  boilingOnsetThreshold_c: number;    // ~95°C
  rollingBoilThreshold_c: number;     // ~98.5°C
  
  // Bubble physics constants
  bubbleMinRadius_m: number;
  bubbleMaxRadius_m: number;
  bubbleBuoyancyAccel_m_s2: number;
  bubbleWobbleFreq_hz: number;
  bubbleCoalescenceDist_m: number;
  
  // Convection current parameters
  convectionOnsetTemp_c: number;
  convectionMaxSpeed_m_s: number;
  
  // Sedimentation & Stokes law
  stokesFluidViscosity_Pa_s: number; // Water ~0.001 Pa·s at 20°C
  
  // Particle budgets per quality tier
  particleBudgets: {
    high: { bubbles: 90; precipitate: 180; evaporation: 60 };
    medium: { bubbles: 45; precipitate: 90; evaporation: 30 };
    low: { bubbles: 20; precipitate: 40; evaporation: 15 };
  };
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  gravity_m_s2: 9.81,
  waterBoilingPoint_c: 100.0,
  ambientTemperature_c: 25.0,
  
  evaporationLatentHeat_J_g: 2260, // 2260 J/g for water
  evaporationCoefficient: 0.00045, // tuned for visible, physically-proportional volume loss
  
  microbubbleTempThreshold_c: 78.0,
  boilingOnsetThreshold_c: 94.5,
  rollingBoilThreshold_c: 98.2,
  
  bubbleMinRadius_m: 0.010,
  bubbleMaxRadius_m: 0.034,
  bubbleBuoyancyAccel_m_s2: 0.85,
  bubbleWobbleFreq_hz: 9.5,
  bubbleCoalescenceDist_m: 0.038,
  
  convectionOnsetTemp_c: 45.0,
  convectionMaxSpeed_m_s: 0.28,
  
  stokesFluidViscosity_Pa_s: 0.001002, // Pa*s
  
  particleBudgets: {
    high: { bubbles: 90, precipitate: 180, evaporation: 60 },
    medium: { bubbles: 45, precipitate: 90, evaporation: 30 },
    low: { bubbles: 20, precipitate: 40, evaporation: 15 }
  }
};

/**
 * Material identities and illustrative transport/appearance profiles.
 * Density is sourced separately from uncalibrated particle size and optics.
 */
export const PRECIPITATE_PROFILES: Record<string, PrecipitateProfile> = {
  // Appearance coverage for products already described by precipitates.ts.
  // Direct mixing does not imply the large needles of recrystallized PbCl2.
  PbCl2: {
    id: 'PbCl2', modelBasis: 'uncalibrated_transport', morphology: 'fine_powder', color: '#f8fafc',
    particleDensity_g_cm3: 5.85, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.001,
    aggregationRate: 0.4, cloudinessFactor: 0.9, specularReflectivity: 0.1, roughness: 0.9,
  },
  Ag2S: {
    id: 'Ag2S', modelBasis: 'uncalibrated_transport', morphology: 'fine_powder', color: '#242225',
    particleDensity_g_cm3: 7.2, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.001,
    aggregationRate: 0.4, cloudinessFactor: 0.95, specularReflectivity: 0.05, roughness: 0.95,
  },
  Pb: {
    id: 'Pb', modelBasis: 'uncalibrated_transport', morphology: 'granular', color: '#8e9397',
    particleDensity_g_cm3: 11.34, baseParticleRadius_mm: 0.01, displayRadius_scene: 0.0015,
    aggregationRate: 0.3, cloudinessFactor: 0.3, specularReflectivity: 0.5, roughness: 0.6, metalness: 1,
  },
  // Appearance-specific colloids; transport is explicitly uncalibrated.
  // See docs/research/ferrocyanide-colloids.vi.md for hydration/composition limits.
  'KFe[Fe(CN)6]': {
    id: 'KFe[Fe(CN)6]', modelBasis: 'uncalibrated_transport',
    morphology: 'fine_powder', color: '#0c4a6e',
    particleDensity_g_cm3: 1.9, baseParticleRadius_mm: 0.00005, displayRadius_scene: 0.001,
    aggregationRate: 0.5, cloudinessFactor: 0.95, specularReflectivity: 0.05, roughness: 0.95,
  },
  'Cu2[Fe(CN)6]': {
    id: 'Cu2[Fe(CN)6]', modelBasis: 'uncalibrated_transport',
    morphology: 'gel_like', color: '#451a03',
    // Retain the previous generic fallback density until a compatible material
    // measurement is available; this is NOT a copper ferrocyanide density claim.
    particleDensity_g_cm3: 4.5, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.0015,
    aggregationRate: 0.8, cloudinessFactor: 0.90, specularReflectivity: 0.05, roughness: 0.85,
  },
  // Brominated organic solids; density sources and size assumptions in research notes.
  'C6H2Br3OH': {
    id: 'C6H2Br3OH', morphology: 'fine_powder', color: '#f8fafc',
    particleDensity_g_cm3: 2.55, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.001,
    aggregationRate: 0.4, cloudinessFactor: 0.85, specularReflectivity: 0.05, roughness: 0.92,
  },
  'C6H2Br3NH2': {
    id: 'C6H2Br3NH2', morphology: 'fine_powder', color: '#f8fafc',
    particleDensity_g_cm3: 2.35, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.001,
    aggregationRate: 0.4, cloudinessFactor: 0.85, specularReflectivity: 0.05, roughness: 0.92,
  },
  // Detached metal fragments only; attached material uses its substrate mesh.
  // Density: RSC periodic table. 10 um radii and optical coefficients are illustrative.
  'Ag': {
    id: 'Ag', morphology: 'granular', color: '#cbd5e1',
    particleDensity_g_cm3: 10.5, baseParticleRadius_mm: 0.01, displayRadius_scene: 0.0015,
    aggregationRate: 0.3, cloudinessFactor: 0.25, specularReflectivity: 0.7,
    roughness: 0.4, metalness: 1,
  },
  'Cu': {
    id: 'Cu', morphology: 'granular', color: '#b45309',
    particleDensity_g_cm3: 8.96, baseParticleRadius_mm: 0.01, displayRadius_scene: 0.0015,
    aggregationRate: 0.3, cloudinessFactor: 0.3, specularReflectivity: 0.6,
    roughness: 0.65, metalness: 1,
  },
  // BaSO4: Heavy fine milky-white micro-powder
  'BaSO4': {
    id: 'BaSO4',
    morphology: 'fine_powder',
    color: '#f8fafc',
    particleDensity_g_cm3: 4.50,
    baseParticleRadius_mm: 0.06,
    aggregationRate: 0.25,
    cloudinessFactor: 0.95,
    specularReflectivity: 0.15,
    roughness: 0.92,
  },
  // AgCl: White curdy precipitate that purples under light
  'AgCl': {
    id: 'AgCl',
    morphology: 'flocculent',
    color: '#f1f5f9',
    particleDensity_g_cm3: 5.56,
    baseParticleRadius_mm: 0.12,
    aggregationRate: 0.65,
    cloudinessFactor: 0.90,
    specularReflectivity: 0.25,
    roughness: 0.85,
  },
  // Silver halides need separate identities: pale yellow AgI is not PbI2.
  // Density: supplier SDS; morphology/color: Western University/RSC.
  // Glyph size and optical coefficients below remain illustrative.
  'AgBr': {
    id: 'AgBr', morphology: 'flocculent', color: '#f5edcd',
    particleDensity_g_cm3: 6.47, baseParticleRadius_mm: 0.12,
    aggregationRate: 0.65, cloudinessFactor: 0.90,
    specularReflectivity: 0.20, roughness: 0.85,
  },
  'AgI': {
    id: 'AgI', morphology: 'flocculent', color: '#f6e58d',
    particleDensity_g_cm3: 5.67, baseParticleRadius_mm: 0.12,
    aggregationRate: 0.65, cloudinessFactor: 0.90,
    specularReflectivity: 0.20, roughness: 0.85,
  },
  // Direct PbI2 precipitation is a fine yellow solid. Plates require a
  // separately identified crystallization route (see getPrecipitateProfile).
  'PbI2': {
    id: 'PbI2',
    morphology: 'fine_powder',
    color: '#eab308',
    particleDensity_g_cm3: 6.16,
    baseParticleRadius_mm: 0.08,
    aggregationRate: 0.35,
    cloudinessFactor: 0.85,
    specularReflectivity: 0.20,
    roughness: 0.85,
  },
  // Cu(OH)2: Azure sky-blue gelatinous fluffy curdy flocs
  // Material density is not the effective density of the hydrated gel network.
  'Al(OH)3': {
    id: 'Al(OH)3', morphology: 'gel_like', color: '#f8fafc',
    particleDensity_g_cm3: 2.42, baseParticleRadius_mm: 0.12,
    aggregationRate: 0.80, cloudinessFactor: 0.85,
    specularReflectivity: 0.05, roughness: 0.80,
  },
  'Zn(OH)2': {
    id: 'Zn(OH)2', morphology: 'gel_like', color: '#f8fafc',
    particleDensity_g_cm3: 3.05, baseParticleRadius_mm: 0.12,
    aggregationRate: 0.80, cloudinessFactor: 0.85,
    specularReflectivity: 0.05, roughness: 0.80,
  },
  // Fresh hydroxide suspensions. Material densities do not describe hydrated
  // floc buoyancy; 1 um sphere radii and optical coefficients are illustrative.
  // Sources and oxidation limits: docs/research/divalent-hydroxides.vi.md.
  'Mg(OH)2': {
    id: 'Mg(OH)2', morphology: 'fine_powder', color: '#f8fafc',
    particleDensity_g_cm3: 2.36, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.001,
    aggregationRate: 0.4, cloudinessFactor: 0.90,
    specularReflectivity: 0.05, roughness: 0.92,
  },
  'Ca(OH)2': {
    id: 'Ca(OH)2', morphology: 'fine_powder', color: '#f8fafc',
    particleDensity_g_cm3: 2.24, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.001,
    aggregationRate: 0.4, cloudinessFactor: 0.90,
    specularReflectivity: 0.05, roughness: 0.92,
  },
  'Ni(OH)2': {
    id: 'Ni(OH)2', morphology: 'gel_like', color: '#65a651',
    particleDensity_g_cm3: 4.1, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.0015,
    aggregationRate: 0.8, cloudinessFactor: 0.85,
    specularReflectivity: 0.05, roughness: 0.80,
  },
  // Stable Co(II) hydroxide; blue basic-salt intermediates need their own ledger.
  'Co(OH)2': {
    id: 'Co(OH)2', morphology: 'gel_like', color: '#d68ca9',
    particleDensity_g_cm3: 3.597, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.0015,
    aggregationRate: 0.8, cloudinessFactor: 0.85,
    specularReflectivity: 0.05, roughness: 0.80,
  },
  'Mn(OH)2': {
    id: 'Mn(OH)2', morphology: 'flocculent', color: '#f3eee9',
    particleDensity_g_cm3: 3.258, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.0015,
    aggregationRate: 0.6, cloudinessFactor: 0.85,
    specularReflectivity: 0.05, roughness: 0.90,
  },
  'Fe(OH)2': {
    id: 'Fe(OH)2', morphology: 'gel_like', color: '#a1b39f',
    particleDensity_g_cm3: 3.4, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.0015,
    aggregationRate: 0.8, cloudinessFactor: 0.85,
    specularReflectivity: 0.05, roughness: 0.80,
  },
  // Cu(OH)2: Azure sky-blue gelatinous fluffy curdy flocs
  'Cu(OH)2': {
    id: 'Cu(OH)2',
    morphology: 'gel_like',
    color: '#6eadd2',
    particleDensity_g_cm3: 3.37,
    baseParticleRadius_mm: 0.28,
    aggregationRate: 0.85, // Highly flocculating gelatinous network
    cloudinessFactor: 0.88,
    specularReflectivity: 0.18,
    roughness: 0.75,
  },
  // Fe(OH)3: Deep reddish-brown rust gelatinous flocculent
  'Fe(OH)3': {
    id: 'Fe(OH)3',
    morphology: 'flocculent',
    color: '#9a3412',
    particleDensity_g_cm3: 3.40,
    baseParticleRadius_mm: 0.25,
    aggregationRate: 0.80,
    cloudinessFactor: 0.92,
    specularReflectivity: 0.12,
    roughness: 0.80,
  },
  // CaCO3: Chalky white fine granular sediment
  'CaCO3': {
    id: 'CaCO3',
    morphology: 'granular',
    color: '#e2e8f0',
    particleDensity_g_cm3: 2.71,
    baseParticleRadius_mm: 0.15,
    aggregationRate: 0.40,
    cloudinessFactor: 0.82,
    specularReflectivity: 0.10,
    roughness: 0.88,
  },
  // CuO: Deep velvety black dense micro-powder from Cu(OH)2 pyrolysis
  // Sulfide primary-particle radii are illustrative, not reaction-calibrated.
  'CuS': {
    id: 'CuS', morphology: 'fine_powder', color: '#18181b',
    particleDensity_g_cm3: 4.6, baseParticleRadius_mm: 0.00005, displayRadius_scene: 0.001,
    aggregationRate: 0.4, cloudinessFactor: 0.95, specularReflectivity: 0.03, roughness: 0.95,
  },
  'PbS': {
    id: 'PbS', morphology: 'fine_powder', color: '#09090b',
    particleDensity_g_cm3: 7.6, baseParticleRadius_mm: 0.0001, displayRadius_scene: 0.001,
    aggregationRate: 0.4, cloudinessFactor: 0.95, specularReflectivity: 0.03, roughness: 0.95,
  },
  'ZnS': {
    id: 'ZnS', morphology: 'fine_powder', color: '#f8fafc',
    particleDensity_g_cm3: 4.09, baseParticleRadius_mm: 0.0001, displayRadius_scene: 0.001,
    aggregationRate: 0.4, cloudinessFactor: 0.90, specularReflectivity: 0.05, roughness: 0.92,
  },
  // See docs/research/cuprous-oxide-and-chromates.vi.md for sources/limits.
  // Equivalent-sphere radius 1 um is illustrative; display size never sets drag.
  'Cu2O': {
    id: 'Cu2O', morphology: 'fine_powder', color: '#b84326',
    particleDensity_g_cm3: 6.0, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.001,
    aggregationRate: 0.4, cloudinessFactor: 0.90, specularReflectivity: 0.05, roughness: 0.92,
  },
  'Ag2CrO4': {
    id: 'Ag2CrO4', morphology: 'fine_powder', color: '#873727',
    particleDensity_g_cm3: 5.62, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.001,
    aggregationRate: 0.4, cloudinessFactor: 0.90, specularReflectivity: 0.05, roughness: 0.92,
  },
  'BaCrO4': {
    id: 'BaCrO4', morphology: 'fine_powder', color: '#e8d341',
    particleDensity_g_cm3: 4.50, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.001,
    aggregationRate: 0.4, cloudinessFactor: 0.90, specularReflectivity: 0.05, roughness: 0.92,
  },
  'PbCrO4': {
    id: 'PbCrO4', morphology: 'fine_powder', color: '#efc62b',
    particleDensity_g_cm3: 6.12, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.001,
    aggregationRate: 0.4, cloudinessFactor: 0.90, specularReflectivity: 0.05, roughness: 0.92,
  },
  // Sources/assumptions: docs/research/sulfate-manganese-sulfur.vi.md.
  // Fresh precipitates are not rendered as macroscopic mineral crystals.
  'PbSO4': {
    id: 'PbSO4', morphology: 'fine_powder', color: '#f8fafc',
    particleDensity_g_cm3: 6.2, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.001,
    aggregationRate: 0.4, cloudinessFactor: 0.90, specularReflectivity: 0.05, roughness: 0.92,
  },
  // Iodide solids: iodine in solution is a separate optical contribution.
  // Radii/optics remain illustrative; see docs/research/copper-bismuth-iodides.vi.md.
  'CuI': {
    id: 'CuI', morphology: 'flocculent', color: '#f2f0e9',
    particleDensity_g_cm3: 5.62, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.001,
    aggregationRate: 0.6, cloudinessFactor: 0.90, specularReflectivity: 0.05, roughness: 0.90,
  },
  'BiI3': {
    id: 'BiI3', morphology: 'fine_powder', color: '#18181b',
    particleDensity_g_cm3: 5.778, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.001,
    aggregationRate: 0.4, cloudinessFactor: 0.95, specularReflectivity: 0.05, roughness: 0.92,
  },
  'MnO2': {
    id: 'MnO2', morphology: 'fine_powder', color: '#3c302a',
    particleDensity_g_cm3: 5.026, baseParticleRadius_mm: 0.001, displayRadius_scene: 0.001,
    aggregationRate: 0.4, cloudinessFactor: 0.95, specularReflectivity: 0.03, roughness: 0.95,
  },
  'S': {
    id: 'S', morphology: 'fine_powder', color: '#eee49b',
    particleDensity_g_cm3: 2.07, baseParticleRadius_mm: 0.0001, displayRadius_scene: 0.001,
    aggregationRate: 0.4, cloudinessFactor: 0.85, specularReflectivity: 0.05, roughness: 0.92,
  },
  // CuO: Deep velvety black dense micro-powder from Cu(OH)2 pyrolysis
  'CuO': {
    id: 'CuO',
    morphology: 'fine_powder',
    color: '#0f172a',
    particleDensity_g_cm3: 6.31,
    baseParticleRadius_mm: 0.08,
    aggregationRate: 0.45,
    cloudinessFactor: 0.98,
    specularReflectivity: 0.05,
    roughness: 0.95,
  }
};

/**
 * Helper to look up or construct a precipitate profile from formula or substance name
 */
export function getPrecipitateProfile(substanceOrColor?: string, formation?: string, declaredColor?: string): PrecipitateProfile {
  if (!substanceOrColor) return PRECIPITATE_PROFILES['BaSO4'];
  
  const upper = substanceOrColor.trim().toUpperCase();
  for (const [key, profile] of Object.entries(PRECIPITATE_PROFILES)) {
    if (sameMolecularFormula(substanceOrColor, key)) {
      return profile.id === 'PbI2' && formation === 'CRYSTAL_PLATE'
        ? { ...profile, morphology: 'crystalline', cloudinessFactor: 0.25,
          specularReflectivity: 0.95, roughness: 0.18 }
        : profile.id === 'PbCl2' && formation === 'CRYSTAL_NEEDLE'
          ? { ...profile, morphology: 'crystalline', cloudinessFactor: 0.25, roughness: 0.25 } : profile;
    }
  }
  
  // Color-based morphology fallback
  if (['GOLD', 'YELLOW'].includes(upper)) {
    return PRECIPITATE_PROFILES['PbI2'];
  }
  if (['BLUE', 'CYAN'].includes(upper)) {
    return PRECIPITATE_PROFILES['Cu(OH)2'];
  }
  if (['BLACK', 'DARK'].includes(upper)) {
    return PRECIPITATE_PROFILES['CuO'];
  }
  if (['BROWN', 'RED'].includes(upper)) {
    return PRECIPITATE_PROFILES['Fe(OH)3'];
  }
  
  // Preserve identity and supplied appearance, but expose that transport
  // coefficients are legacy generic values, not properties of this species.
  return { ...PRECIPITATE_PROFILES['BaSO4'], id: identifySpecies(substanceOrColor).formula,
    color: declaredColor && /^#[0-9a-f]{6}$/i.test(declaredColor) ? declaredColor : '#f8fafc',
    modelBasis: 'generic_fallback' };
}
