import { PrecipitateProfile } from './SimulationTypes';

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
 * Authentic chemical precipitate profiles
 */
export const PRECIPITATE_PROFILES: Record<string, PrecipitateProfile> = {
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
  // PbI2: "Golden Rain" glittering faceted crystalline hexagonal flakes
  'PbI2': {
    id: 'PbI2',
    morphology: 'crystalline',
    color: '#eab308',
    particleDensity_g_cm3: 6.16,
    baseParticleRadius_mm: 0.22,
    aggregationRate: 0.35,
    cloudinessFactor: 0.70,
    specularReflectivity: 0.95, // Golden glittering glint
    roughness: 0.35,
  },
  // Cu(OH)2: Azure sky-blue gelatinous fluffy curdy flocs
  'Cu(OH)2': {
    id: 'Cu(OH)2',
    morphology: 'flocculent',
    color: '#0284c7',
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
export function getPrecipitateProfile(substanceOrColor?: string): PrecipitateProfile {
  if (!substanceOrColor) return PRECIPITATE_PROFILES['BaSO4'];
  
  const upper = substanceOrColor.toUpperCase();
  for (const [key, profile] of Object.entries(PRECIPITATE_PROFILES)) {
    if (upper.includes(key.toUpperCase())) return profile;
  }
  
  // Color-based morphology fallback
  if (upper.includes('GOLD') || upper.includes('YELLOW') || upper.includes('PBI2')) {
    return PRECIPITATE_PROFILES['PbI2'];
  }
  if (upper.includes('BLUE') || upper.includes('CYAN') || upper.includes('CU(OH)2')) {
    return PRECIPITATE_PROFILES['Cu(OH)2'];
  }
  if (upper.includes('BLACK') || upper.includes('CUO') || upper.includes('DARK')) {
    return PRECIPITATE_PROFILES['CuO'];
  }
  if (upper.includes('BROWN') || upper.includes('RED') || upper.includes('FE(OH)3')) {
    return PRECIPITATE_PROFILES['Fe(OH)3'];
  }
  
  return PRECIPITATE_PROFILES['BaSO4'];
}
