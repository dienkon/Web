export interface ReactionStep {
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
