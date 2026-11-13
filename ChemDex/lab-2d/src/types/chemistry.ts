/**
 * Core Chemistry Domain Types for ChemDex 2D Virtual Laboratory
 * Strictly typed, unit-documented, and decoupled from UI/rendering logic.
 */

export type PhysicalState = 'aq' | 's' | 'l' | 'g';

export type GHSHazard =
  | 'corrosive'
  | 'flammable'
  | 'toxic'
  | 'oxidizer'
  | 'irritant'
  | 'explosive'
  | 'health_hazard'
  | 'reactive_water';

export type PPEItem = 'goggles' | 'gloves' | 'fume_hood' | 'lab_coat';

export type ChemicalCategory =
  | 'acid'
  | 'base'
  | 'salt'
  | 'indicator'
  | 'metal'
  | 'gas'
  | 'oxide'
  | 'organic'
  | 'solvent';

export type PrecipitateMorphology =
  | 'curdy'
  | 'milky'
  | 'gel'
  | 'floc'
  | 'plates'
  | 'powder'
  | 'granular'
  | 'crystalline'
  | 'gelatinous'
  | 'flocculent'
  | 'colloidal';

export type SolidMorphology =
  | 'granule'
  | 'nail'
  | 'ribbon'
  | 'pellet'
  | 'crystal'
  | 'powder'
  | 'chip'
  | 'wire';

export type IndicatorType =
  | 'phenolphthalein'
  | 'litmus'
  | 'universal'
  | 'bromothymol_blue'
  | 'methyl_orange'
  | 'thymolphthalein';

export type ReactionArchetype =
  | 'acid_base_neutralization'
  | 'precipitation'
  | 'amphoteric_dissolution'
  | 'complexation'
  | 'gas_evolution'
  | 'metal_displacement'
  | 'alkali_water_violent'
  | 'redox_autocatalytic'
  | 'iodine_clock'
  | 'thermal_decomposition'
  | 'sublimation'
  | 'combustion_flash'
  | 'conc_acid_dilution_hazard'
  | 'vapor_interface_smoke'
  | 'esterification_phase'
  | 'silver_mirror'
  | 'physical_mixing';

export type ResolutionTier =
  | 'handcrafted'
  | 'rule-derived'
  | 'cached'
  | 'ai-synthesized'
  | 'fallback';

export interface SolidChunkItem {
  id: string;
  formula: string;
  morphology: SolidMorphology;
  colorHex: string;
  mass_g: number;
  initialMass_g: number;
  xNormalized: number; // 0.15 .. 0.85 across vessel bottom
  coatingColorHex?: string; // e.g., #b85d3b copper plating on Fe nail / Zn granule
  coatingProgress?: number; // 0..1
  isFloating?: boolean; // e.g., Na or K floating on meniscus
}

export interface PrecipitateLayerState {
  formula: string;
  colorHex: string;
  mass_g: number;
  morphology: PrecipitateMorphology;
  turbidity: number; // 0..1 suspended cloudiness
  sedimentHeight_mm: number; // settled bed thickness at bottom
  settlingVelocity_mm_s: number; // Stokes settling speed
  redissolveProgress?: number; // 0..1 when dissolving in excess NH3 or OH-
}

export interface AntoineParameters {
  A: number;
  B: number;
  C: number;
}

export interface SolidAppearanceSpec {
  color: string;
  morphology: SolidMorphology | PrecipitateMorphology;
  glossiness: number; // 0 (matte powder) .. 1 (crystalline/metallic)
  metallic?: boolean;
}

export interface SubstancePhysicalProps {
  Cp_J_kgK: number; // Specific heat capacity J/(kg*K)
  meltingPoint_K?: number;
  boilingPoint_K?: number;
  antoine?: AntoineParameters;
  latentHeatVap_J_kg?: number;
  surfaceTension_N_m?: number; // Pure/standard surface tension N/m at 25C
  viscosity_mPa_s?: number; // Dynamic viscosity mPa*s (cP) at 25C
  Ksp?: number;
  dH_sol_J_mol?: number; // Enthalpy of dissolution (+ = endothermic cooling)
  absorptivity_RGB: [number, number, number]; // Linear Beer-Lambert spectral coefficients
  scatter: number; // Tyndall / colloid scattering factor
  solubility_g_100ml_cold?: number; // ~20C
  solubility_g_100ml_hot?: number; // ~95-100C
  solidAppearance?: SolidAppearanceSpec;
}

export interface ChemicalDefinition {
  id: string;
  formula: string;
  name_en: string;
  name_vi: string;
  category: ChemicalCategory;
  phase_STP: 'solid' | 'liquid' | 'gas' | 'aqueous';
  molarMass_g_mol: number;
  density_g_ml?: number;
  defaultConcentration_M?: number;
  solubility_g_100ml?: number; // at 20-25°C
  ph_default?: number;
  colorHex: string;
  hazards: GHSHazard[];
  ppe: PPEItem[];
  safetyNotes_en?: string;
  safetyNotes_vi?: string;
  description_en?: string;
  description_vi?: string;
  physicalProps?: Partial<SubstancePhysicalProps>;
}

export interface SubstanceQuantity {
  formula: string;
  moles: number;
  mass_g: number;
  volume_ml?: number;
  concentration_M?: number;
  state: PhysicalState;
}

export interface StoichiometricSpecies {
  formula: string;
  coefficient: number;
  state: PhysicalState;
}

export interface ReactionDefinition {
  id: string;
  name_en: string;
  name_vi: string;
  equation: string;
  ionic_equation?: string;
  reactants: StoichiometricSpecies[];
  products: StoichiometricSpecies[];
  deltaH_kJ_mol: number; // Exothermic: negative, Endothermic: positive
  equilibrium?: {
    Ksp?: number;
    Ka?: number;
    Kb?: number;
  };
  requiresHeating?: boolean;
  minTemp_c?: number;
  archetype?: ReactionArchetype;
  controllerId?: string;
  visual: {
    precipitate?: {
      formula: string;
      colorHex: string;
      morphology: PrecipitateMorphology;
    };
    gas?: {
      formula: string;
      colorHex?: string;
      effervescenceSpeed: 'slow' | 'vigorous' | 'instant';
    };
    colorChange?: {
      resultingColorHex: string;
      indicatorDriven?: boolean;
    };
    flame?: {
      colorHex: string;
    };
    surfacePlating?: {
      substrateFormula: string;
      coatingFormula: string;
      coatingColorHex: string;
    };
  };
  observable_en: string;
  observable_vi: string;
  safetyNotes_en?: string;
  safetyNotes_vi?: string;
  isDangerous?: boolean;
}

export interface ReactionExecutionRecord {
  reactionId: string;
  name_en?: string;
  name_vi?: string;
  equation: string;
  ionic_equation?: string;
  extent_moles: number; // xi
  heatReleased_J: number;
  limitingReactant: string;
  excessReactants: Record<string, number>; // formula -> remaining moles
  observable_en: string;
  observable_vi: string;
  tier?: ResolutionTier;
  archetype?: ReactionArchetype;
  controllerId?: string;
}

export interface SimulationResult {
  reactionsOccurred: ReactionExecutionRecord[];
  updatedContents: SubstanceQuantity[];
  finalTemperature_c: number;
  finalPh: number;
  finalLiquidColorHex: string;
  liquidOpacity?: number;
  mixtureViscosity_mPa_s?: number;
  surfaceTension_N_m?: number;
  mixtureCp_J_kgK?: number;
  density_g_ml?: number;
  hasPrecipitate: boolean;
  precipitateInfo?: {
    formula: string;
    colorHex: string;
    mass_g: number;
    morphology: PrecipitateMorphology;
  };
  precipitateLayers?: PrecipitateLayerState[];
  solidChunks?: SolidChunkItem[];
  hasGas: boolean;
  gasInfo?: {
    formula: string;
    molesReleased: number;
    effervescenceSpeed: 'slow' | 'vigorous' | 'instant';
    colorHex?: string;
  };
  isBoiling: boolean;
  isExplosion: boolean;
  isDangerous: boolean;
  warning_en?: string;
  warning_vi?: string;
  hasPhaseSeparation?: boolean;
  organicLayerVolume_ml?: number;
  organicLayerColorHex?: string;
  hasFumes?: boolean;
  fumeType?: 'steam' | 'no2' | 'nh4cl' | 'iodine';
  fumeColorHex?: string;
  turbidity?: number; // 0 (crystal clear) to 1 (opaque milkiness)
  foamHead_mm?: number; // Evolving gas foam head height on meniscus
  flameTestColorHex?: string; // Characteristic emission flame test color
  hasSilverMirror?: boolean; // Tollen's test metallic silver reflective mirror coating
  activeControllerIds?: string[]; // Visual controllers triggered by this reaction pass
  surfacePlating?: {
    substrateFormula: string;
    coatingFormula: string;
    coatingColorHex: string;
    progress: number;
  };
  hasSublimation?: boolean;
  sublimationColorHex?: string;
}
