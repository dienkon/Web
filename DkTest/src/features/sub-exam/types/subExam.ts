import type { CognitiveLevel } from "../../../utils/cognitiveLevelUtils";

export type SubExamConfig = {
  enabled: boolean;
  selectionMode: "by_type" | "by_section" | "by_section_and_type" | "random_total" | "by_level";
  totalQuestionCount?: number;
  questionCount?: number;
  numberOfQuestions?: number;
  randomSectionsCount?: number; // -1 or undefined for all enabled sections, N > 0 to pick N random sections
  /** Restrict candidate pool to specific cognitive levels (e.g., ["VD", "VDC"]) */
  allowedLevels?: CognitiveLevel[];
  /** Pick exact counts per cognitive level (NB / TH / VD / VDC) */
  levelCounts?: Partial<Record<CognitiveLevel, number>>;
  singleChoiceCount?: number;
  multipleChoiceCount?: number;
  trueFalseCount?: number;
  shortAnswerCount?: number;
  orderingCount?: number;
  fillBlankCount?: number;
  matchingCount?: number;
  sections?: SectionSubExamConfig[];
};

export type SectionSubExamConfig = {
  sectionId: string;
  enabled: boolean;
  questionCount?: number;
  singleChoiceCount?: number;
  multipleChoiceCount?: number;
  trueFalseCount?: number;
  shortAnswerCount?: number;
  orderingCount?: number;
  fillBlankCount?: number;
  matchingCount?: number;
};

export type BuiltSubExam = {
  questions: any[]; // Using 'any' for now, should be Question type later
  selectedQuestionIds: string[];
  questionOrder: string[];
  config: SubExamConfig;
  isSubExam: boolean;
  stats: {
    available: number;
    selected: number;
  };
};

export type AttemptSnapshot = {
  examId: string;
  attemptId: string;
  selectedQuestionIds: string[];
  questionOrder: string[];
  configSnapshot: SubExamConfig;
  createdAt: string;
};
