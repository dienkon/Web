export type SubExamConfig = {
  enabled: boolean;
  selectionMode: "by_type" | "by_section" | "by_section_and_type";
  randomSectionsCount?: number; // -1 or undefined for all enabled sections, N > 0 to pick N random sections
  singleChoiceCount?: number;
  multipleChoiceCount?: number;
  trueFalseCount?: number;
  shortAnswerCount?: number;
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
