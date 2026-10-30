export interface ReactionStep {
  reactionId?: string;
  from?: string;
  to?: string;
  carrier?: string;
  workup?: string;
  reagents?: string[];
  evidence?: { type: string; scope: string; sourceIds: string[] };
  sourceReferences?: { title: string; url: string; scope: string }[];
  equation: string;
  latex: string;
  latexWithCondition: string;
  condition: string;
  explanation: string;
}

export interface HistoryItem {
  id: string;
  type: 'analyze' | 'generate';
  input: string; // The input query or parameters summarized as a string
  start?: string;
  end?: string;
  minSteps?: number;
  steps: ReactionStep[];
  timestamp: number;
}

export type Theme = 'light' | 'dark';
