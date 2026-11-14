/**
 * Equipment and Glassware Domain Types
 */

import {
  SubstanceQuantity,
  PrecipitateMorphology,
  SolidChunkItem,
  PrecipitateLayerState,
} from './chemistry';

export type EquipmentType =
  | 'beaker'
  | 'erlenmeyer_flask'
  | 'test_tube'
  | 'graduated_cylinder'
  | 'burette'
  | 'pipette'
  | 'dropper'
  | 'funnel'
  | 'watch_glass'
  | 'evaporating_dish'
  | 'analytical_balance'
  | 'bunsen_burner'
  | 'hot_plate'
  | 'ph_meter'
  | 'thermometer'
  | 'stirring_rod'
  | 'spatula'
  | 'reagent_bottle'
  | 'wash_bottle'
  | 'test_tube_rack'
  | 'separatory_funnel'
  | 'ph_paper'
  | 'condenser'
  | 'sponge';

export interface EvaporativeStainState {
  colorHex: string;
  height_mm: number;
  formula: string;
  opacity: number;
}

export interface MeniscusWaveState {
  angle_deg: number;
  angularVelocity_deg_s: number;
  rippleAmplitude_px: number;
  vortexDepth_px: number;
}

export interface EquipmentState {
  id: string;
  name: string;
  name_vi: string;
  type: EquipmentType;
  x: number; // 2D position in workbench coordinates
  y: number;
  width: number;
  height: number;
  capacity_ml: number; // Max holding volume
  isContainer: boolean; // Can hold liquid/solids

  // Thermodynamic & physical states
  temperature_c: number;
  contents: SubstanceQuantity[];
  volume_ml: number;
  mass_g: number;
  tare_g?: number; // For balances or tared vessels
  ph: number;

  // Visual states
  liquidColorHex?: string;
  liquidOpacity?: number;
  hasPrecipitate?: boolean;
  precipitateColorHex?: string;
  precipitateSubstance?: string;
  precipitateMass_g?: number;
  precipitateMorphology?: PrecipitateMorphology;
  precipitateLayers?: PrecipitateLayerState[];
  solidChunks?: SolidChunkItem[];
  isBoiling?: boolean;
  boilingIntensity?: number; // 0..1, drives bubble vigor
  hasGas?: boolean;
  gasColorHex?: string;
  effervescenceSpeed?: 'slow' | 'vigorous' | 'instant';
  evaporationRate_g_s?: number; // Live evaporation rate display
  totalEvaporated_ml?: number; // Cumulative boil-off
  hasPhaseSeparation?: boolean;
  organicLayerVolume_ml?: number;
  organicLayerColorHex?: string;
  hasFumes?: boolean;
  fumeType?: 'steam' | 'no2' | 'nh4cl' | 'iodine';
  fumeColorHex?: string;
  turbidity?: number; // 0..1 suspension opacity
  foamHead_mm?: number; // height of froth layer on meniscus
  hasSilverMirror?: boolean; // silver mirror coat on glass walls
  silverMirrorProgress?: number; // 0..1 progressive metallic silver wall buildup
  hasTripod?: boolean; // physical tripod wire gauze support underneath
  hasOpenFlame?: boolean; // open Bunsen flame licking vessel sides (false when misaligned or hot-plate)
  activeReactionLabel?: string; // active reaction stage label for telemetry pill
  activeReactionProgress?: number; // 0..1 reaction completion ratio
  isAiUnverifiedReaction?: boolean; // true when last reaction came from unverified AI fallback

  // Real-time heating telemetry from spatial burner/plate coupling
  isBeingHeated?: boolean;
  absorbedPower_W?: number;
  heatingRate_c_s?: number;
  flameTestColorHex?: string; // Characteristic flame test emission color when heated over flame

  // Mixing / stirring
  isStirred?: boolean;
  stirringSpeed?: number; // 0..1, accelerates dissolution & homogenization
  mixedness?: number; // 0..1 — 0 = layers/stratified, 1 = homogeneous
  dissolvingRate?: number; // visual solute dissolving indicator 0..1

  // Active tool settings
  isOn?: boolean; // For burner / hot plate
  heatIntensity?: number; // 0 to 1
  setPoint_c?: number; // For hot plate temperature setpoint
  stopcockOpen?: boolean; // For burette
  dispenseRate_ml_s?: number; // For burette/dropper
  hasFilterPaper?: boolean; // For funnel
  filtrate_ml?: number;
  filterResidue_g?: number;
  filterResidueFormula?: string;
  fuelLevel_ml?: number; // For alcohol/Bunsen burner (mL of ethanol)
  flameState?: 'UNLIT' | 'LOW_FLAME' | 'MEDIUM_FLAME' | 'HIGH_FLAME' | 'OUT_OF_FUEL';

  // Live pouring state (continuous pour, not instant)
  isPouring?: boolean;
  pourTargetId?: string;
  pourRate_ml_s?: number; // realistic ~10-15 mL/s manual pour
  pourSpillFraction?: number; // fraction of stream missing target → puddle
  tilt_deg?: number; // Current vessel tilt angle during manual/continuous pour

  // Physical solution & fluid mechanics telemetry (lab-3d parity)
  viscosity_mPa_s?: number; // Temperature & composition dependent dynamic viscosity
  surfaceTension_N_m?: number; // Surface tension governing meniscus curvature & bubbles
  mixtureCp_J_kgK?: number; // Mixture specific heat capacity J/(kg*K)
  density_g_ml?: number; // Bulk solution density g/mL
  stirIntensity?: number; // 0..1 active stirring angular drive
  pourContactX?: number; // -1..1 normalized horizontal contact site for diffusion field

  // Damage, headspace pressure & lab realism (lab-3d parity)
  isShattered?: boolean;
  isSealed?: boolean;
  isTipped?: boolean;
  internalPressure_atm?: number; // Headspace pressure via PV = nRT
  freeGasMoles?: number; // Trapped evolved gas moles when stoppered
  corkPoppedAt?: number; // Timestamp of recent cork pop for VFX
  crackSeverity?: number; // 0..1 thermal/pressure stress micro-cracks before shatter
  wallCondensation?: number; // 0..1 inner glass condensation droplets above hot liquid
  evaporativeStain?: EvaporativeStainState;
  superheat_c?: number; // Degrees of superheating above boiling point when unstirred
  bumpingIntensity?: number; // 0..1 bumping surge intensity
  hasSublimation?: boolean;
  sublimationColorHex?: string;
  sublimationFrostProgress?: number; // 0..1 upper wall frost crystals (e.g. I2)
  meniscusWave?: MeniscusWaveState;
  activeControllerIds?: string[];

  // Tool cross-contamination tracking
  lastContactFormula?: string;
  isContaminated?: boolean;

  // Operational locks
  isLocked?: boolean;
  isTargeted?: boolean;
  selected?: boolean;

  // Measuring probe telemetry & phase separation
  submergedInVesselId?: string;
  isSubmerged?: boolean;
  paperColorHex?: string;
  isDrainingSeparatory?: boolean;

  // Mass conservation, initial solid tracking & parity controls (lab-3d parity)
  initialSolidMassByFormula?: Record<string, number>;
  escapedGas_g?: Record<string, number>;
  totalEscapedGas_g?: number;
  condenserCooling?: {
    coolingEnabled: boolean;
    flowRate_ml_s: number;
    coolantInletTemp_c: number;
    conductance_W_K: number;
  };
  coolantOutletTemperature_c?: number;
  condenserCoolingPower_W?: number;
  coolantPassed_ml?: number;
  coolantHeatReceived_J?: number;
  washDose_ml?: number;
  washTargetId?: string | null;
}

/** A spill puddle on the workbench surface with full chemical inventory. */
export interface SpillPuddle {
  id: string;
  x: number;
  y: number;
  colorHex: string;
  volume_ml: number;
  formula: string;
  contents?: SubstanceQuantity[];
  temperature_c?: number;
  ph?: number;
  isNeutralized?: boolean;
  isEffervescing?: boolean;
  hasFumes?: boolean;
  fumeColorHex?: string;
  hasGlassShards?: boolean;
  radius_px?: number;
  timestamp: number;
}

/** A continuous in-flight pour between two vessels (tick-driven, not a timeout). */
export interface ActivePour {
  sourceId: string;
  targetId: string;
  rate_ml_s: number;
  remaining_ml?: number;
  startedAt: number;
  tilt_deg: number;
}

/** An animated external reagent delivery (bottle, dropper, or spatula) into a bench vessel. */
export interface ActiveExternalPour2D {
  id: string;
  targetId: string;
  chemicalId: string;
  formula: string;
  name_en: string;
  name_vi: string;
  colorHex: string;
  deliveryMode: 'bottle' | 'dropper' | 'spatula';
  totalAmount_ml: number;
  totalAmount_g: number;
  deliveredFraction: number;
  approachProgress: number;
  totalTime_s: number;
  contactXNorm: number; // -0.85 .. 0.85 landing position on vessel mouth
  startedAt: number;
  hazardChecked?: boolean;
  firstBurstTriggered?: boolean;
}

export interface SpatulaScoopState {
  chemicalId: string;
  formula: string;
  name_vi: string;
  name_en: string;
  colorHex: string;
  mass_g: number;
}

export interface PourOperation {
  sourceId: string;
  targetId: string;
  amount_ml?: number; // If transferring liquid
  amount_g?: number; // If transferring solid
  transferAll?: boolean;
}
