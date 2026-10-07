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

export type SolidMorphology = 
  | 'POWDER' 
  | 'RIBBON' 
  | 'TURNINGS' 
  | 'FILINGS' 
  | 'GRANULES' 
  | 'PELLET' 
  | 'CHIPS' 
  | 'CUBIC_CRYSTAL' 
  | 'PRISMATIC_CRYSTAL' 
  | 'TABULAR_CRYSTAL' 
  | 'HYDRATE_CRYSTAL' 
  | 'LUSTROUS_PLATES';

export interface ChemicalDefinition {
  formula: string;
  name_en: string;
  name_vi: string;
  type: SubstanceType;
  category?: 'acid' | 'base' | 'salt' | 'indicator' | 'metal' | 'gas' | 'oxide' | 'organic';
  color: string;
  molarMass: number; // g/mol
  density?: number; // g/mL
  defaultConcentration?: number; // M (mol/L)
  ph?: number;
  hazards: GHSHazard[];
  ppe: PPEItem[];
  safetyNotes_en?: string;
  safetyNotes_vi?: string;
  solidMorphology?: SolidMorphology;
}

export interface SubstanceContent {
  formula: string;
  moles: number;
  mass_g: number;
  volume_ml?: number;
  concentration_M?: number;
  phase?: string;
  state?: string;
  initialMoles?: number;
  initialMass_g?: number;
}

export type VesselType = 
  | 'beaker' 
  | 'flask' 
  | 'test_tube' 
  | 'cylinder' 
  | 'burette' 
  | 'watch_glass' 
  | 'evaporating_dish' 
  | 'crucible' 
  | 'petri_dish'
  | 'volumetric_flask'
  | 'separatory_funnel'
  | 'filter_funnel'
  | 'mortar_pestle'
  | 'condenser'
  | 'test_tube_rack'
  | 'wash_bottle'
  | 'tongs'
  | 'retort_stand'
  | 'retort_clamp'
  | 'stopper'
  | 'pneumatic_trough'
  | 'hot_plate';

export interface VesselState {
  id: string;
  name: string;
  type: VesselType;
  capacity_ml: number; // e.g. 100, 250, 50
  position: [number, number, number];
  rotationY: number;
  rotationZ?: number;
  isLocked: boolean;
  
  substances: string[]; // formulas present
  contents: SubstanceContent[];
  volume: number; // normalized 0 to 1 for 3D display
  volume_ml: number; // actual volume in mL
  mass_g: number; // authoritative total mass in grams
  tare_g?: number; // tare weight of empty vessel in grams
  density_g_ml?: number; // density in g/mL (default ~1.0)
  
  temperature_c: number; // in Celsius (ambient ~25°C)
  ph: number; // 0 to 14
  
  liquidColor?: string;
  liquidOpacity?: number;
  turbidity?: number;
  
  hasPrecipitate: boolean;
  precipitateColor?: string;
  precipitateSubstance?: string;
  precipitateMorphology?: string;
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

  // Realistic Physical Mechanisms & Phenomena
  isShattered?: boolean; // Vessel shattered from thermal shock / overpressure
  shatterReason?: string;
  stainColor?: string; // Solute residue ring on vessel walls
  stainIntensity?: number; // 0 to 1 opacity of ring deposit
  stainHeight?: number; // 0 to 1 height where evaporation ring formed
  condensationMist?: number; // 0 to 1 fogging droplet condensation on cool headspace (T > 55°C)
  isSuperheated?: boolean; // Superheated beyond 100°C without nucleation
  bumpingSurge?: boolean; // Active violent ebullition surge (bumping)
  isPulverized?: boolean; // Solid crystals in mortar ground into fine reactive powder
  immiscibleOrganicVolume_ml?: number; // Organic layer in separatory funnel
  immiscibleOrganicColor?: string;
  stopcockOpen?: boolean; // Separatory funnel stopcock valve position
  fumingIntensity?: number; // Acid/base fuming aerosol smoke intensity (0 to 1)
  fumingColor?: string;
  solidMorphology?: SolidMorphology;
  isFiltrating?: boolean; // Filter funnel active filtration
  filterPaperResidue_g?: number; // Precipitate cake retained on filter paper
  filterPaperResidueSubstance?: string;
  isSealed?: boolean; // Stoppered/sealed vessel (can build overpressure)
  internalPressure_atm?: number; // Internal headspace gas pressure in atm (burst at > 2.5 atm)
  coolingWaterActive?: boolean; // Condenser cooling water active
  slottedTestTubeIds?: string[]; // Test tube IDs held in test tube rack
  grippedVesselId?: string; // Vessel ID gripped by tongs
  heldByTongsId?: string; // Tongs holding this vessel
  residues?: Array<{ where: string; kind: string; color: string; amount: number }>;
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
