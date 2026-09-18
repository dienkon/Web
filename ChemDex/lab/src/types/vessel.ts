import { ChemicalColor, SubstanceQuantity } from './chemistry';

export type VesselType = 
  | 'beaker'
  | 'erlenmeyer'
  | 'test_tube'
  | 'graduated_cylinder'
  | 'burette'
  | 'watch_glass'
  | 'evaporating_dish'
  | 'dropper'
  | 'reagent_bottle';

export interface PrecipitateInfo {
  chemicalId: string;
  formula: string;
  nameVi: string;
  colorHex: string;
  massG: number;
  type: 'crystalline' | 'gelatinous' | 'fine_powder' | 'metallic';
  settlingProgress: number; // 0 (freshly nucleated / dispersed) to 1 (settled at bottom)
}

export interface GasInfo {
  chemicalId: string;
  formula: string;
  nameVi: string;
  colorHex?: string;
  bubbleRate: number;      // 0 to 1 intensity
  isBoiling: boolean;
  evolutionTimeRemainingMs: number;
}

export interface IndicatorInfo {
  id: string;              // e.g. "Phenolphthalein", "Litmus"
  nameVi: string;
  colorHex: string;
  appliedColor: ChemicalColor;
}

export interface VesselState {
  id: string;
  name: string;
  type: VesselType;
  capacityMl: number;
  currentVolumeMl: number;
  emptyMassG: number;
  totalMassG: number;
  temperatureC: number;
  pH: number | null;
  liquidColor: ChemicalColor;
  opacity: number;
  precipitate: PrecipitateInfo | null;
  gas: GasInfo | null;
  indicator: IndicatorInfo | null;
  isHeating: boolean;
  isStirring: boolean;
  contents: SubstanceQuantity[];
  position: [number, number, number];
  rotation: [number, number, number];
  isOpen: boolean;
}
