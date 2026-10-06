import type { Exam, Question, QuestionType, Difficulty, Submission } from "../../types";

export type ReviewSourceType = "history" | "imported_link" | "imported_code";

export type QuestionAnswerStatus =
  | "all"
  | "wrong"
  | "correct"
  | "unanswered"
  | "wrong_or_unanswered";

export interface ReviewSourceExam {
  examId: string;
  examTitle: string;
  examCode?: string;
  subject?: string;
  category?: string;
  sourceType: ReviewSourceType;
  hasAttempt: boolean;
  latestScore?: number;
  maxScore?: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  totalCount: number;
  submittedAt?: any;
  submission?: Submission;
  exam: Exam;
  questions?: Question[];
  stillWrongQuestions?: Question[];
  correctedInReviewCount?: number;
}

export interface ReviewQuestionCandidate {
  /** Unique candidate key: `${sourceExamId}::${originalQuestionId}` */
  candidateId: string;
  sourceExamId: string;
  sourceExamTitle: string;
  originalQuestionId: string;
  question: Question;
  /** Status in the latest attempt: correct, wrong, unanswered, or unattempted */
  answerStatus: "correct" | "wrong" | "unanswered" | "unattempted";
  type: QuestionType;
  difficulty: Difficulty | "unspecified";
  sectionTitle?: string;
  sectionId?: string | null;
  tags: string[];
  points: number;
  order: number;
  /** Clean preview text */
  textSnippet: string;
}

export interface ReviewFilterConfig {
  /** Selected question types. Empty array means all types */
  types: QuestionType[];
  /** Selected difficulties: 'easy' | 'medium' | 'hard' | 'unspecified'. Empty = all */
  difficulties: string[];
  /** Selected sections (titles or IDs). Empty = all */
  sections: string[];
  /** Status filter */
  answerStatus: QuestionAnswerStatus;
  /** Desired number of questions */
  questionCount: number;
  /** Exam duration in minutes, or 'auto' for 1.5 min per question */
  durationMinutes: number | "auto";
  /** Whether to shuffle questions */
  shuffleQuestions: boolean;
  /** Whether to shuffle options inside questions */
  shuffleOptions: boolean;
  /** Natural language instruction for Gemini */
  aiPrompt?: string;
}

export interface AiCandidateDTO {
  id: string; // sourceExamId::originalQuestionId
  examTitle: string;
  type: string;
  difficulty: string;
  status: string;
  section?: string;
  textSnippet: string;
  tags?: string[];
}

export interface AiReviewSelectionRequest {
  candidates: AiCandidateDTO[];
  userPrompt: string;
  targetCount: number;
}

export interface AiReviewSelectionResponse {
  questionIds: string[];
  reasoning?: string;
}
