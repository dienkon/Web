export type ChemicalPhase = 'liquid' | 'solid' | 'gas' | 'aqueous';

export type ChemicalCategory = 
  | 'acid'
  | 'base'
  | 'salt'
  | 'indicator'
  | 'metal'
  | 'nonmetal'
  | 'oxide'
  | 'gas'
  | 'solvent'
  | 'other';

export type HazardClass = 
  | 'corrosive'
  | 'toxic'
  | 'flammable'
  | 'oxidizer'
  | 'reactive_metal'
  | 'irritant'
  | 'environmental_hazard'
  | 'none';

export type PPEItem = 
  | 'safety_goggles'
  | 'lab_coat'
  | 'nitrile_gloves'
  | 'fume_hood'
  | 'face_shield';

export interface ChemicalColor {
  r: number;
  g: number;
  b: number;
  a: number; // 0 (clear) to 1 (opaque)
  hex?: string;
}

export interface ChemicalDefinition {
  id: string;                    // Canonical identifier, e.g. "HCl", "CuSO4"
  formula: string;               // Standardized formula, e.g. "HCl", "CuSO₄"
  nameEn: string;                // Standardized IUPAC/English name, e.g. "Hydrochloric acid"
  nameVi: string;                // Pedagogical Vietnamese name, e.g. "Axit clohidric"
  category: ChemicalCategory;
  phase: ChemicalPhase;
  molarMass: number;             // g/mol
  density?: number;              // g/mL
  defaultConcentration?: number; // M (mol/L) for aqueous solutions
  defaultColor: ChemicalColor;
  pHContribution?: number;       // standard pH at 1M
  hazards: HazardClass[];
  requiredPPE: PPEItem[];
  wasteClass: 'acid_waste' | 'base_waste' | 'heavy_metal_waste' | 'organic_waste' | 'neutral_drain';
  storageNotesVi?: string;
  isIndicator?: boolean;
}

export interface SubstanceQuantity {
  chemicalId: string;
  amount: number;       // volume in mL for solutions, mass in g for solids, moles for gases
  unit: 'mL' | 'g' | 'mol';
  concentrationM?: number; // M (mol/L) if aqueous solution
  moles: number;
  addedAt: number;      // timestamp
}
