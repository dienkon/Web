/**
 * Experiment & Curriculum Domain Types
 */

import { EquipmentType } from './equipment';

export interface ExperimentStep {
  stepNumber: number;
  title_en: string;
  title_vi: string;
  instruction_en: string;
  instruction_vi: string;
  hint_en?: string;
  hint_vi?: string;
  // State-based validator function signature / target criteria
  validationCriteria: {
    targetEquipment?: EquipmentType;
    requiredFormulas?: string[];
    minVolume_ml?: number;
    maxVolume_ml?: number;
    minMass_g?: number;
    targetPhMin?: number;
    targetPhMax?: number;
    minTemp_c?: number;
    mustHavePrecipitate?: boolean;
    precipitateFormula?: string;
    mustHaveGas?: boolean;
    requiredReactionId?: string;
  };
  theory_en?: string;
  theory_vi?: string;
}

export interface GuidedExperiment {
  id: string;
  title_en: string;
  title_vi: string;
  category_en: string;
  category_vi: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  durationMinutes: number;
  description_en: string;
  description_vi: string;
  objectives_en: string[];
  objectives_vi: string[];
  requiredEquipment: EquipmentType[];
  requiredChemicals: string[]; // chemical IDs or formulas
  safetyNotes_en: string[];
  safetyNotes_vi: string[];
  steps: ExperimentStep[];
  conclusion_en?: string;
  conclusion_vi?: string;
}

export interface LabLogEntry {
  id: string;
  timestamp: number;
  actionType: 'ADD_EQUIPMENT' | 'ADD_CHEMICAL' | 'TRANSFER' | 'HEAT' | 'MEASURE' | 'REACTION' | 'RESET';
  details_en: string;
  details_vi: string;
  vesselId?: string;
  measurements?: {
    volume_ml?: number;
    mass_g?: number;
    temperature_c?: number;
    ph?: number;
  };
}
