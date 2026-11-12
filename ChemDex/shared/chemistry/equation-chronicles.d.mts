import { ScientistBiography } from './scientist-biographies.mjs';

export interface ReactionCatalogEntry {
  id: string;
  family?: string;
  topic_vi?: string;
  title_vi?: string;
  equation: string;
  reactants: Array<{ formula: string; coefficient: number; phase: string }>;
  products: Array<{ formula: string; coefficient: number; phase: string }>;
  conditions?: { description_vi?: string };
  conditions_vi?: string;
  observation_vi?: string;
  phenomenon_vi?: string;
  explanation_vi?: string;
  summary_vi?: string;
  netIonic?: string;
  ionic?: { equation?: string };
  effects?: {
    deltaH_kJ_per_mol?: number | null;
    gases?: string[];
    solids?: string[];
    color?: string | null;
  };
}

export declare function generateReactionStory(
  reaction: ReactionCatalogEntry,
  roleLabel: string,
  substanceName: string,
  displayFormula: string,
  isFormation: boolean
): string;

export declare function getGuaranteedPioneers(context: {
  subject: any;
  element: any;
  formula: string;
  counts: Record<string, number>;
  massTerms?: any[];
}): ScientistBiography[];

export declare function formatPioneerChapter(
  pioneer: ScientistBiography,
  substanceName: string,
  displayFormula: string
): string;
