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
  hasGas?: boolean;
  gasColorHex?: string;
  effervescenceSpeed?: 'slow' | 'vigorous' | 'instant';
  
  // Active tool settings
  isOn?: boolean; // For burner / hot plate
  heatIntensity?: number; // 0 to 1
  stopcockOpen?: boolean; // For burette
  dispenseRate_ml_s?: number; // For burette/dropper
  hasFilterPaper?: boolean; // For funnel
  filtrate_ml?: number;
  filterResidue_g?: number;
  filterResidueFormula?: string;
  
  // Operational locks
  isLocked?: boolean;
  isTargeted?: boolean;
  selected?: boolean;
}

export interface PourOperation {
  sourceId: string;
  targetId: string;
  amount_ml?: number; // If transferring liquid
  amount_g?: number; // If transferring solid
  transferAll?: boolean;
}
