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
  /** Solid formed by chemistry, distinct from a separately added solid chunk. */
  solidOrigin?: 'precipitate';
  precipitateFormation?: string;
  liquidLayer?: 'aqueous' | 'organic';
  location?: 'bulk' | 'filter' | 'foam';
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
  bubbleInterfaceMobility?: import('../science/bubbleRise').BubbleInterfaceMobility;
  gasFlux?: import('../engine/gasFlux').GasFlux;
  hydrogenCombustion?: import('../engine/hydrogenExhaustCombustion').HydrogenExhaustCombustion;
  wallCondensation?: import('../engine/wallCondensation').WallCondensationState;
  effectsEnvironment?: Partial<import('../science/labEnvironment').LabEnvironment>;
  effectHeatInput_W?: number; // explicit virtual heater, separate from physical apparatus
  effectHeatHandle?: string;
  waterVaporOutflow_g_s?: number; // after wall capture and connected condensers
  waterVaporReleased_g?: number; // cumulative actual external water sink, after recovery
  waterVaporFromChemistry_g?: number; // cumulative gross source from chemical gas projection
  condensateReceived_g?: number; // water supplied by an explicitly connected condenser
  waterVaporPartialPressure_Pa?: number; // fresh external stream after recovery
  waterVaporCarrier_mol_s?: number; // non-water carrier of that stream, not retained headspace gas
  waterVaporTemperature_c?: number; // emitted water stream, independently of later glass temperature
  waterVaporSpecificEnthalpy_J_g?: number;
  waterVaporTemperatureModel?: 'emission-ledger' | 'source-temperature-estimate';
  effectSampleRevision?: number; // invalidates handles/visuals when a specimen is replaced
  environment?: import('../science/labEnvironment').LabEnvironment;
  hotPlate?: { isOn: boolean; setPoint_c: number; electricalEnergy_J?: number; deliveredHeat_J?: number; heatLost_J?: number };
  escapedGas_g?: Record<string, number>;
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
  mass_g: number; // mass of contents in grams; separate wall parcels are added only for physical weighing
  // Derived from wall-stage pour parcels, excluded from contents/mass_g until pool contact.
  wallCoating_ml?: number;
  wallCoatingMass_g?: number;
  recentPourContact?: { point: [number, number, number]; expiresAt_ms: number };
  bodyRevision?: number;
  tare_g?: number; // tare weight of empty vessel in grams
  density_g_ml?: number; // density in g/mL (default ~1.0)
  
  temperature_c: number; // in Celsius (ambient ~25°C)
  /** Mean heater input over the last accepted thermal step, W; excludes cooling/reaction heat. */
  thermalHeatingPower_W?: number;
  /** Cumulative external heater energy delivered to this sample, J. */
  thermalHeatingEnergy_J?: number;
  iceVolume_ml?: number;
  thermalEnergyOutsideModel_J?: number;
  thermalModelLimit?: string;
  ph: number; // 0 to 14
    phModel?: 'ideal_aqueous_25c' | 'ideal_aqueous_temperature';
    phReferenceTemperature_c?: number; // Temperature actually used for equilibrium constants.
    evaporationRate_g_s?: number;
    vaporSourceId?: string;
    condensedTransfer_g?: number;
    condensationHeatRemoved_J?: number;
  
  liquidColor?: string;
  liquidOpacity?: number;
  turbidity?: number;
  
  hasPrecipitate: boolean;
  precipitateColor?: string;
  precipitateSubstance?: string;
  precipitateMorphology?: string;
  precipitateAmount_g?: number;
  /** Cumulative suspended-solid outflow by canonical formula, g. A transport
   * transaction updates this with inventory; physics consumes only the delta. */
  precipitateOutflow_g?: Record<string, number>;
  /** Observation used to distinguish cooling crystallization from direct mixing. */
  leadIodidePhaseHistory?: { temperature_c: number; totalMass_g: number };
  
  isBoiling: boolean;
  boilingIntensity?: number; // 0 (none) to 1.0 (rolling boil)
  hasGas: boolean;
  gasColor?: string;
  gasRate?: number; // gas generation speed
  foam_ml?: number; // active foam layer volume
  isExplosion?: boolean;

  overflow_ml?: number; // recent overflow volume
  overflowTimestamp?: number; // timestamp of recent overflow
  evaporated_ml?: number; // evaporated volume over time
  /** Cumulative emitted thermal-water enthalpy; liquid Cp*T reference at 0 C. */
  thermalVaporEnthalpy_J?: number;
  thermalVaporSensibleEnthalpy_J?: number; // cumulative Cp*integral(T_emission dm)
  waterVaporReleasedEnergy_J?: number;
  condensedTransferEnergy_J?: number;
  waterVaporEnergyModel?: 'emission-ledger' | 'source-temperature-estimate';
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
  flowReceiverId?: string;
  washTargetId?: string | null;
  studioProgramId?: string;
  programHeatApplied_J?: number; // Cumulative program heat already delivered, for baseline replay only.
  studioSpecimenVariant?: 'oxygen_foam';
  ignitedProgramId?: string; // Transient initiation token; consumed when a run captures its baseline.
  washDose_ml?: number;
  residueReceiverId?: string;
  flowStatus?: string;
  fumingIntensity?: number; // Acid/base fuming aerosol smoke intensity (0 to 1)
  fumingColor?: string;
  solidMorphology?: SolidMorphology;
  isFiltrating?: boolean; // Filter funnel active filtration
  filterPaperResidue_g?: number; // Precipitate cake retained on filter paper
  filterPaperResidueSubstance?: string;
  isSealed?: boolean; // Stoppered/sealed vessel (can build overpressure)
  sealedHeadspace?: import('../engine/headspacePressure').SealedHeadspace;
  internalPressureModel?: 'ideal-gas' | 'ambient' | 'unavailable';
  gasReplayBlocked?: boolean; // A proposed extent needs molecules already lost across the gas boundary.
  internalPressure_atm?: number; // Absolute pressure; unknown when the gas closure has no valid free volume.
  coolingWaterActive?: boolean; // Condenser cooling water active
  condenserCooling?: Partial<import('../science/condenserHeatExchange').CondenserCoolingSettings>;
  coolantPassed_ml?: number;
  coolantPassed_g?: number;
  coolantHeatReceived_J?: number;
  coolantOutletTemperature_c?: number;
  condenserCoolingPower_W?: number;
  condenserEffectiveConductance_W_K?: number;
  condenserVaporEnergyReceived_J?: number;
  condenserCoolingStatus?: string;
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

export interface FlameEmissionState {
  element: string;
  color: string;
  startedAt_ms: number;
  duration_s: number;
}

export interface BurnerState {
  flameEmission?: FlameEmissionState;
  id: string;
  position: [number, number, number];
  isOn: boolean;
  intensity: number; // 1 to 5
  flameState?: BurnerFlameState;
  fuelLevel_ml?: number; // ethanol fuel remaining in reservoir (mL)
  ethanolVolumeFraction?: number; // Approximate blend volume fraction, default 0.96
  burnedFuel_ml?: number;
  releasedHeat_J?: number;
  deliveredHeat_J?: number;
  heatLost_J?: number;
  maxFuel_ml?: number; // max fuel capacity (e.g. 150 mL)
  heatRadius?: number; // effective thermal radius in meters
  tempOutput_c?: number; // current flame core temperature in °C
}

export interface SpillState {
  contents?: SubstanceContent[];
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

export interface LabMaterialSnapshot {
  glassDebris?: import('../damage/Shards').ShardSnapshot;
  inFlightPours: import('../engine/pourTransport').PourParcel[];
  spills: Record<string, SpillState>;
  wasteMass_g: number;
  wasteContents: SubstanceContent[];
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
    materials?: LabMaterialSnapshot;
  };
}
