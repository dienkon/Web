/**
 * Equipment and Glassware Domain Types
 */

import { PhysicalState, SubstanceQuantity, PrecipitateMorphology } from './chemistry';

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
  | 'test_tube_rack';

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
  isBoiling?: boolean;
  boilingIntensity?: number; // 0..1, drives bubble vigor
  hasGas?: boolean;
  gasColorHex?: string;
  effervescenceSpeed?: 'slow' | 'vigorous' | 'instant';
  evaporationRate_g_s?: number; // Live evaporation rate display
  totalEvaporated_ml?: number; // Cumulative boil-off

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

  // Damage & realism
  isShattered?: boolean;
  isSealed?: boolean;
  isTipped?: boolean;

  // Operational locks
  isLocked?: boolean;
  isTargeted?: boolean;
  selected?: boolean;
}

/** A spill puddle on the workbench surface. */
export interface SpillPuddle {
  id: string;
  x: number;
  y: number;
  colorHex: string;
  volume_ml: number;
  formula: string;
  timestamp: number;
}

/** A continuous in-flight pour between two vessels (tick-driven, not a timeout). */
export interface ActivePour {
  sourceId: string;
  targetId: string;
  rate_ml_s: number;
  startedAt: number;
  tilt_deg: number;
}

export interface PourOperation {
  sourceId: string;
  targetId: string;
  amount_ml?: number; // If transferring liquid
  amount_g?: number; // If transferring solid
  transferAll?: boolean;
}
