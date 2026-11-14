/**
 * Lazy Loader for Lab-3D Shared Reaction Library & Curriculum Recipes
 *
 * Splits heavy JSON datasets (~1MB 131-THPT curriculum + ~3.9MB 1,300 shared catalog + chains)
 * into async Vite chunks so initial workbench boot stays instant.
 */

import type { ReactionCatalog, ReactionEntry, CatalogIndex, ChainResult } from '../../../shared/chemistry/reaction-catalog.d.mts';
import type { ReactionGuide } from '../../../shared/chemistry/reaction-guide.d.mts';

export type { ReactionCatalog, ReactionEntry, CatalogIndex, ChainResult, ReactionGuide };

export interface CurriculumReactant {
  formula: string;
  role?: string;
  coeff?: number;
  phase?: 'aq' | 's' | 'l' | 'g';
  colorHex?: string;
  hazards?: string[];
}

export interface CurriculumDose {
  formula: string;
  phase?: 'aq' | 's' | 'l' | 'g';
  moles?: number;
  mass_g?: number;
  volume_ml?: number;
  concentration_M?: number;
}

export interface CurriculumStep {
  order: number;
  instruction_vi: string;
  checkpoint?: string;
}

export interface CurriculumReactionEntry {
  id: string;
  title_vi: string;
  suggestedGrades?: number[];
  topic_vi?: string;
  curriculumScope?: string;
  category?: string;
  equation: string;
  ionic?: string;
  conditions?: {
    heating?: boolean;
    temperature_c?: number | null;
    catalyst?: string | null;
    activation?: string | null;
    description_vi?: string;
  };
  reactants: CurriculumReactant[];
  products: CurriculumReactant[];
  simulationDoses?: CurriculumDose[];
  safety_vi?: string;
  steps?: CurriculumStep[];
  observation_vi?: string;
  explanation_vi?: string;
  thermochemistry?: {
    deltaH_kJ_per_mol_reaction?: number | null;
    note_vi?: string;
  };
  observationGuide?: {
    contact_vi?: string;
    evolution_vi?: string;
    standing_vi?: string;
    catalyst_vi?: string;
    timing_vi?: string;
  };
  sources?: { url: string; scope?: string }[];
}

export interface PresetChainItem {
  id: string;
  substances: string[];
  reactionIds: string[];
}

export interface LoadedReactionHubBundle {
  curriculum: CurriculumReactionEntry[];
  catalog: ReactionCatalog;
  index: CatalogIndex;
  chains: PresetChainItem[];
  searchReactions: typeof import('../../../shared/chemistry/reaction-catalog.mjs').searchReactions;
  analyzeChain: typeof import('../../../shared/chemistry/reaction-catalog.mjs').analyzeChain;
  findChain: typeof import('../../../shared/chemistry/reaction-catalog.mjs').findChain;
  reactionGuide: (entry: ReactionEntry) => ReactionGuide;
}

let cachedBundlePromise: Promise<LoadedReactionHubBundle> | null = null;

export function loadReactionHubBundle(): Promise<LoadedReactionHubBundle> {
  if (cachedBundlePromise) return cachedBundlePromise;

  cachedBundlePromise = Promise.all([
    import('./curriculum/reactions.vi.json'),
    import('@shared/reaction-catalog.generated.json'),
    import('@shared/reaction-chains.generated.json'),
    import('@shared/chemistry/reaction-catalog.mjs'),
    import('@shared/chemistry/reaction-guide.mjs'),
  ]).then(([currMod, catMod, chainsMod, catHelpers, guideHelpers]) => {
    const rawCurr = (currMod.default || currMod) as { reactions?: CurriculumReactionEntry[] } | CurriculumReactionEntry[];
    const curriculum = Array.isArray(rawCurr) ? rawCurr : (rawCurr.reactions ?? []);
    const catalog = (catMod.default || catMod) as unknown as ReactionCatalog;
    const chainsRaw = (chainsMod.default || chainsMod) as unknown as { chains?: PresetChainItem[] };
    const index = catHelpers.createCatalogIndex(catalog);

    return {
      curriculum,
      catalog,
      index,
      chains: chainsRaw.chains ?? [],
      searchReactions: catHelpers.searchReactions,
      analyzeChain: catHelpers.analyzeChain,
      findChain: catHelpers.findChain,
      reactionGuide: guideHelpers.reactionGuide,
    };
  });

  return cachedBundlePromise;
}

export function foldVi(value: string): string {
  return String(value ?? '')
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

export const FAMILY_LABELS_VI: Record<string, string> = {
  all: 'Tất cả (1.300)',
  precipitation: 'Kết tủa trao đổi ion',
  neutralization: 'Trung hòa Axit–Bazơ',
  metal_acid: 'Kim loại + Axit',
  carbonate_acid: 'Muối cacbonat + Axit',
  displacement: 'Kim loại đẩy kim loại',
  redox: 'Oxi hóa – Khử',
  thermal: 'Nhiệt phân',
  esterification: 'Este hóa',
  saponification: 'Xà phòng hóa',
  combustion: 'Phản ứng cháy',
  catalytic_decomposition: 'Phân hủy xúc tác',
  amphoteric: 'Chất lưỡng tính',
  oxide_acid: 'Oxit bazơ + Axit',
  sulfite_acid: 'Muối sunfit + Axit',
  sulfide_acid: 'Muối sunfua + Axit',
  ammonium_base: 'Muối amoni + Kiềm',
  organic_conversion: 'Chuyển hóa hữu cơ',
  synthesis: 'Phản ứng tổng hợp',
};

export const CATEGORY_LABELS_VI: Record<string, string> = {
  all: 'Tất cả loại',
  redox: 'Oxi hóa – Khử',
  precipitation: 'Kết tủa',
  gas: 'Sinh khí / Sủi bọt',
  organic: 'Hữu cơ & Tráng bạc',
};
