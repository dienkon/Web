import { SubstanceType } from '../store/useAppStore';

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

export interface ChemicalDefinition {
  formula: string;
  name_en: string;
  name_vi: string;
  type: SubstanceType;
  category?: 'acid' | 'base' | 'salt' | 'indicator' | 'metal' | 'gas' | 'oxide';
  color: string;
  molarMass: number; // g/mol
  density?: number; // g/mL
  defaultConcentration?: number; // M (mol/L)
  ph?: number;
  hazards: GHSHazard[];
  ppe: PPEItem[];
  safetyNotes_en?: string;
  safetyNotes_vi?: string;
}

export interface SubstanceContent {
  formula: string;
  moles: number;
  mass_g: number;
  volume_ml?: number;
  concentration_M?: number;
}

export type VesselType = 'beaker' | 'flask' | 'test_tube' | 'cylinder' | 'burette';

export interface VesselState {
  id: string;
  name: string;
  type: VesselType;
  capacity_ml: number; // e.g. 100, 250, 50
  position: [number, number, number];
  rotationY: number;
  isLocked: boolean;
  
  substances: string[]; // formulas present
  contents: SubstanceContent[];
  volume: number; // normalized 0 to 1 for 3D display
  volume_ml: number; // actual volume in mL
  mass_g: number; // authoritative total mass in grams
  density_g_ml?: number; // density in g/mL (default ~1.0)
  
  temperature_c: number; // in Celsius (ambient ~25°C)
  ph: number; // 0 to 14
  
  liquidColor?: string;
  liquidOpacity?: number;
  
  hasPrecipitate: boolean;
  precipitateColor?: string;
  precipitateAmount_g?: number;
  
  isBoiling: boolean;
  boilingIntensity?: number; // 0 (none) to 1.0 (rolling boil)
  hasGas: boolean;
  gasColor?: string;
  gasRate?: number; // gas generation speed
  foam_ml?: number; // active foam layer volume
  isExplosion?: boolean;

  overflow_ml?: number; // recent overflow volume
  evaporated_ml?: number; // evaporated volume over time
  lastReactionId?: string; // ID of active or most recent reaction
  reactionProgress?: number; // 0 to 1 kinetics progress
}

export type BurnerFlameState = 
  | 'UNLIT' 
  | 'IGNITING' 
  | 'LOW_FLAME' 
  | 'MEDIUM_FLAME' 
  | 'HIGH_FLAME' 
  | 'OUT_OF_FUEL' 
  | 'EXTINGUISHED';

export interface BurnerState {
  id: string;
  position: [number, number, number];
  isOn: boolean;
  intensity: number; // 1 to 5
  flameState?: BurnerFlameState;
  fuelLevel_ml?: number; // ethanol fuel remaining in reservoir (mL)
  maxFuel_ml?: number; // max fuel capacity (e.g. 150 mL)
  heatRadius?: number; // effective thermal radius in meters
  tempOutput_c?: number; // current flame core temperature in °C
}

export interface SpillState {
  id: string;
  position: [number, number, number]; // [x, y, z] on workbench
  substances: string[];
  color: string;
  volume_ml: number;
  mass_g: number;
  radius: number; // radius of wet puddle on table
  isHazard: boolean;
  sourceVesselName?: string;
  timestamp: number;
}

export interface BuretteState {
  id: string;
  position: [number, number, number];
  reagentFormula: string;
  currentVolume_ml: number;
  maxVolume_ml: number;
  concentration_M: number;
  isDispensing: boolean;
  flowRate_ml_s: number; // 0.1 to 2.0 mL/s
  targetVesselId?: string;
}

export interface MeasurementTool {
  id: string;
  type: 'thermometer' | 'ph_meter' | 'balance' | 'pipette' | 'stirring_rod';
  position: [number, number, number];
  targetVesselId?: string;
}

export interface TitrationPoint {
  volumeAdded_ml: number;
  ph: number;
  color: string;
  temperature_c: number;
  timestamp: number;
}

export interface ReactionRecord {
  id: string;
  timestamp: number;
  equation: string;
  ionic_equation?: string;
  summary_en: string;
  summary_vi: string;
  observation_en: string;
  observation_vi: string;
  precipitate?: string;
  gas?: string;
  tempChange: number;
  isDangerous: boolean;
  warning_en?: string;
  warning_vi?: string;
}

export interface LabActionHistory {
  id: string;
  timestamp: number;
  action: 'ADD_VESSEL' | 'REMOVE_VESSEL' | 'POUR' | 'HEAT' | 'MEASURE' | 'RESET' | 'TITRATE';
  description_en: string;
  description_vi: string;
  snapshot: {
    vessels: Record<string, VesselState>;
    burners: Record<string, BurnerState>;
  };
}
