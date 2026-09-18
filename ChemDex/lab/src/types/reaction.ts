import { ChemicalColor } from './chemistry';

export type ReactionResolutionSource = 
  | 'tier0_deterministic'
  | 'tier1_memory'
  | 'tier2_indexeddb'
  | 'tier3_firestore'
  | 'tier4_gemini';

export type ReactionResolutionState = 
  | 'IDLE'
  | 'INITIALIZING'
  | 'LOCAL_RESOLUTION'
  | 'CACHE_LOOKUP'
  | 'DATABASE_LOOKUP'
  | 'AI_ANALYSIS'
  | 'VALIDATING'
  | 'APPLYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED_BY_SAFETY';

export interface ReactionSpecies {
  chemicalId: string;
  formula: string;
  coefficient: number;
  state: 'aq' | 's' | 'l' | 'g';
  moles?: number;
}

export interface ReactionObservation {
  phenomenonVi: string;           // e.g. "Dung dịch chuyển sang màu hồng đậm, tỏa nhiệt nhẹ"
  liquidColor: ChemicalColor;
  precipitate: {
    chemicalId: string;
    formula: string;
    nameVi: string;
    colorHex: string;
    type: 'crystalline' | 'gelatinous' | 'fine_powder' | 'metallic';
    descriptionVi: string;
  } | null;
  gas: {
    chemicalId: string;
    formula: string;
    nameVi: string;
    bubbleRate: number; // 0 to 1
    descriptionVi: string;
  } | null;
  temperatureChangeC: number;
  resultingPhEstimate: number | null;
}

export interface ReactionResult {
  id: string;
  canonicalKey: string;
  schemaVersion: number;
  equation: string;               // e.g. "HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)"
  ionicEquation?: string;         // e.g. "H⁺(aq) + Cl⁻(aq) + Na⁺(aq) + OH⁻(aq) → Na⁺(aq) + Cl⁻(aq) + H₂O(l)"
  netIonicEquation?: string;      // e.g. "H⁺(aq) + OH⁻(aq) → H₂O(l)"
  reactionTypeVi: string;         // e.g. "Phản ứng trung hòa (Axit - Bazơ)"
  conditionsVi?: string;          // e.g. "Nhiệt độ phòng (25°C)"
  reactants: ReactionSpecies[];
  products: ReactionSpecies[];
  observations: ReactionObservation;
  educationalExplanationVi: {
    titleVi: string;
    summaryVi: string;
    detailVi: string;
    realWorldApplicationVi?: string;
  };
  safetyAdviceVi: {
    level: 'NOTICE' | 'WARNING' | 'CRITICAL';
    messageVi: string;
    ppeRecommendedVi: string[];
    wasteHandlingVi: string;
  };
  provenance: ReactionResolutionSource;
  createdAt: number;
  updatedAt?: number;
}
