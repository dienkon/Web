interface BariteInventoryRow {
  formula: string;
  phase?: string;
  moles: number;
  location?: string;
}

export const BARITE_KSP_25C: number;
export function bariteKspAtTemperature(temperature_c?: number): number | null;
export function bariteDissolutionEnthalpy_J_mol(temperature_c: number): number | null;
export function bariteIonInventory(contents: Iterable<BariteInventoryRow>): { barium: number; sulfate: number } | null;
export function baritePrecipitationExtent(contents: Iterable<BariteInventoryRow>, volume_ml: number, temperature_c?: number): number | null;
