/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ChemicalComponent {
  raw: string; // e.g., "2Ca(OH)2"
  coefficient: number; // e.g., 2
  formula: string; // e.g., "Ca(OH)2"
  elements: { [element: string]: number }; // e.g., {"Ca": 1, "O": 2, "H": 2}
}

export interface StructuredEquation {
  reactants: ChemicalComponent[];
  products: ChemicalComponent[];
  conditions: string[];
  isComplete: boolean;
}

export interface InferenceRule {
  id: string;
  name: string;
  description: string;
  match: (reactants: string[]) => boolean;
  predict: (reactants: string[]) => {
    products: string[];
    reasoning: string;
    reactionType: string;
  };
}

export interface PipelineResult {
  rawOCR: string;
  repairedText: string;
  parsedLocal: StructuredEquation | null;
  localBalanced: string | null;
  localInferredProducts: string[] | null;
  localInferenceReasoning: string | null;
  localReactionType: string | null;
  localError: string | null;

  // Gemini Verification (Optional)
  geminiVerified: GeminiResponse | null;
  geminiError: string | null;

  // Merged Result
  finalEquation: string;
  finalReactionType: string;
  finalIsBalanced: boolean;
  confidence: {
    ocr: number;
    repair: number;
    inference: number;
    balancing: number;
    gemini: number;
    overall: number;
  };
  confidenceDetails: string[];
  correctionsMade: string[];
  reasoning: string;
}

export interface GeminiResponse {
  originalOCR: string;
  correctedEquation: string;
  reactionType: string;
  productsPredicted: string[];
  balancedEquation: string;
  confidence: number;
  corrections: string[];
  reasoning: string;
  ionicEquation: string;
  redoxAnalysis: string;
  detailedMechanism: string;
  practicalApplication: string;
  arrowConditions?: string[];
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  imagePreview: string | null;
  result?: PipelineResult;
  results?: PipelineResult[];
}
