export type SpillChemicalType = 'acid_dilute' | 'acid_concentrated' | 'alkali_base' | 'organic_solvent';

export interface ChemicalSpillState {
  id: string;
  chemicalType: SpillChemicalType;
  position: [number, number, number];
  radius: number; // initial 0.45m, grows up to 0.7m
  neutralized: boolean;
  absorbed: boolean;
  cleaned: boolean;
}

export function createSpill(id: string, chemicalType: SpillChemicalType, pos: [number, number, number]): ChemicalSpillState {
  return {
    id,
    chemicalType,
    position: pos,
    radius: 0.45,
    neutralized: false,
    absorbed: false,
    cleaned: false,
  };
}

export function applyNeutralizer(spill: ChemicalSpillState): void {
  spill.neutralized = true;
}

export function applyAbsorbent(spill: ChemicalSpillState): boolean {
  if (!spill.neutralized && spill.chemicalType.includes('acid')) {
    // Attempting to wipe unneutralized concentrated acid causes fuming/burn hazard
    return false;
  }
  spill.absorbed = true;
  return true;
}

export function wipeSpill(spill: ChemicalSpillState): boolean {
  if (spill.absorbed) {
    spill.cleaned = true;
    return true;
  }
  return false;
}
