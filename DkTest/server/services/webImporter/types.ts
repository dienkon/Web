import type { ExportV3 } from "../../../src/utils/json/schema";

export interface ExtractedOption {
  id: string; // e.g. "opt_a"
  key: string; // "A" | "B" | "C" | "D" | "1" ...
  text: string;
  html?: string;
  imageUrl?: string | null;
}

export interface ExtractedQuestion {
  id: string; // e.g. "q-1"
  order: number;
  type:
    | "single_choice"
    | "multiple_choice"
    | "true_false"
    | "short_answer"
    | "essay";
  promptText: string;
  promptHtml: string;
  options: ExtractedOption[];
  correctKey: string | null; // e.g. "C"
  correctOptionIds: string[]; // e.g. ["opt_c"]
  explanation: string;
  explanationHtml?: string;
  imageUrl?: string | null;
  images: string[];
  detectionMethod: string;
  confidence: number; // 0 to 1
  warnings: string[];
  needsManualReview: boolean;
  isAiVerified?: boolean;
  aiVerificationNote?: string;
}

export interface AiVerificationFinding {
  questionOrder: number;
  type: "answer_discrepancy" | "missing_option" | "formula_distortion" | "warning";
  message: string;
  suggestion?: string;
}

export interface AiVerificationReport {
  performed: boolean;
  model: string;
  verifiedCount: number;
  findings: AiVerificationFinding[];
  summary: string;
}

export interface ExtractedExam {
  title: string;
  sourceUrl: string;
  domain: string;
  adapterName: string;
  totalQuestions: number;
  questionsWithOptions: number;
  questionsWithAnswers: number;
  questionsWithExplanation: number;
  questionsWithImages: number;
  manualReviewCount: number;
  warnings: string[];
  questions: ExtractedQuestion[];
  suggestedSubject?: string;
  suggestedGrade?: string;
  suggestedTimeLimit?: number;
  aiVerification?: AiVerificationReport;
}

export interface SiteAdapter {
  id: string;
  name: string;
  canHandle(url: string, html?: string): boolean;
  extract(html: string, url: string): Promise<ExtractedExam>;
}

export interface WebImporterExtractResult {
  exam: ExtractedExam;
  dktestJson: ExportV3;
  durationMs: number;
  aiVerification?: AiVerificationReport;
}
