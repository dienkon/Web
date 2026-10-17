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
  | 'crystalline';

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
  extent_moles: number; // xi
  heatReleased_J: number;
  limitingReactant: string;
  excessReactants: Record<string, number>; // formula -> remaining moles
  observable_en: string;
  observable_vi: string;
}

export interface SimulationResult {
  reactionsOccurred: ReactionExecutionRecord[];
  updatedContents: SubstanceQuantity[];
  finalTemperature_c: number;
  finalPh: number;
  finalLiquidColorHex: string;
  hasPrecipitate: boolean;
  precipitateInfo?: {
    formula: string;
    colorHex: string;
    mass_g: number;
    morphology: PrecipitateMorphology;
  };
  hasGas: boolean;
  gasInfo?: {
    formula: string;
    molesReleased: number;
    effervescenceSpeed: 'slow' | 'vigorous' | 'instant';
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
}

