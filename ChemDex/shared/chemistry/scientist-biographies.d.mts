export interface LaboratoryApparatus {
  name: string;
  description: string;
}

export interface DiscoveredOrRevolutionized {
  elements: string[];
  compounds: string[];
  concepts: string[];
}

export interface KeyEquation {
  equation: string;
  phases: Record<string, string>;
  conditions: string;
  observation: string;
  historicalNote: string;
}

export interface ScientistBiography {
  id: string;
  name: string;
  vietnameseName: string;
  lifeSpan: string;
  birthYear: number;
  deathYear: number;
  nationality: string;
  avatar: string;
  title: string;
  quote: string;
  lifeStruggles: string;
  personalLore: string;
  experimentalBreakthroughs: string;
  laboratoryApparatus: LaboratoryApparatus[];
  discoveredOrRevolutionized: DiscoveredOrRevolutionized;
  keyEquations: KeyEquation[];
  pedagogicalInsight: string;
  curriculumTags: string[];
}

export declare const scientistBiographies: ScientistBiography[];
export declare function getAllScientists(): ScientistBiography[];
export declare function getScientistById(id: string): ScientistBiography | undefined;
export declare function getScientistsByElement(symbol: string): ScientistBiography[];
export declare function getScientistsByCompound(formulaOrName: string): ScientistBiography[];
export declare function getScientistsByTag(tag: string): ScientistBiography[];
export declare function searchScientists(query: string): ScientistBiography[];
