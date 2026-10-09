import { ReactNode } from "react";

export type PracticeCategory =
  | "arithmetic"
  | "speed"
  | "expressions"
  | "equations"
  | "fractions"
  | "integers"
  | "advanced"
  | "geometry"
  | "word_problems"
  | "english"
  | "cs"
  | "physics"
  | "chemistry";

export type QuestionInputType =
  | "numeric"
  | "choice"
  | "fraction"
  | "comparison"
  | "step_error"
  | "number_line"
  | "expression_builder"
  | "true_false_group"
  | "matching"
  | "code_trace";

export type PracticeGameRule =
  | "standard"
  | "time_attack_60s"
  | "combo_streak"
  | "score_conquest"
  | "survival_3hearts"
  | "endless";

export interface FractionValue {
  numerator: number;
  denominator: number;
}

export interface TrueFalseStatement {
  id: string; // e.g. "a", "b", "c", "d"
  text: string;
  latex?: string;
  isCorrect: boolean; // boolean expected (true = Đúng, false = Sai)
  explanation?: string;
}

export type PracticeAnswerValue =
  | number
  | string
  | boolean
  | FractionValue
  | { numerator: number | string; denominator: number | string }
  | number[]
  | string[]
  | Record<string, boolean>;

export interface PracticeQuestion {
  id: string;
  type: QuestionInputType;
  prompt: string;
  latex?: string;
  subText?: string;
  codeSnippet?: { python: string; cpp: string };
  correctAnswer: PracticeAnswerValue;
  options?: Array<{ id: string; text: string; latex?: string }>;
  trueFalseStatements?: TrueFalseStatement[];
  tolerance?: number;
  unit?: string;
  hints?: string[];
  misconceptions?: string[];
  curriculumMeta?: {
    subject: string;
    chapterId?: string;
    topicId?: string;
    skillId?: string;
    formatPart?: "part1_single_choice" | "part2_true_false" | "part3_short_answer";
    cognitiveLevel?: "remember" | "understand" | "apply" | "analyze";
  };
  explanation: string;
  difficulty: number;
  metadata?: {
    operation?: string;
    stepList?: Array<{ step: number; text: string; isError?: boolean }>;
    numberLineConfig?: { min: number; max: number; step: number; target: number; prompt: string };
    targetValue?: number;
    availableCards?: Array<{ id: string; label: string; value: number | string; type: "number" | "op" }>;
    hints?: string[];
    misconceptions?: string[];
    unit?: string;
    tolerance?: number;
    codeSnippet?: { python: string; cpp: string };
    trueFalseStatements?: TrueFalseStatement[];
  };
}

export interface PracticeContext {
  grade?: number;
  difficulty: number;
  questionIndex: number;
  totalQuestions?: number;
  sessionSeed?: string;
  gameRule?: PracticeGameRule;
  currentStreak?: number;
  timeRemaining?: number;
}

export interface DifficultyLevel {
  id: number | string;
  name: string;
  description: string;
  examples?: string;
}

export type PracticeLengthMode = "quick" | "standard" | "marathon" | "endless" | 5 | 10 | 20;

export interface PracticeSessionConfig {
  modeId: string;
  difficulty: number | string;
  lengthMode: PracticeLengthMode;
  customCount?: number;
  gameRule?: PracticeGameRule;
  timeLimitSeconds?: number;
  isAdaptive?: boolean;
}

export interface UserQuestionAttempt {
  question: PracticeQuestion;
  userAnswer: PracticeAnswerValue | null;
  isCorrect: boolean;
  timeSpentSeconds: number;
  scoreAwarded: number;
  answeredAt: number;
  isFlagged?: boolean;
  subAnswers?: Record<string, boolean>;
  subResults?: Record<string, boolean>;
  scoreRatio?: number;
}

export interface PracticeUserAnswer {
  questionId: string;
  questionPrompt: string;
  questionLatex?: string;
  questionType?: QuestionInputType;
  codeSnippet?: { python: string; cpp: string };
  options?: Array<{ id: string; text: string; latex?: string }>;
  trueFalseStatements?: TrueFalseStatement[];
  userAnswer: any;
  correctAnswer: any;
  subAnswers?: Record<string, boolean>;
  subResults?: Record<string, boolean>;
  scoreRatio?: number;
  isCorrect: boolean;
  scoreEarned: number;
  explanation?: string;
  timeTakenSec?: number;
}

export interface PracticeSession {
  id: string;
  modeId: string;
  difficulty: number | string;
  targetQuestions: number | "endless";
  targetScore?: number;
  currentQuestionIndex: number;
  startTime: number;
  endTime?: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  currentStreak: number;
  maxStreak: number;
  heartsRemaining?: number;
  answers: PracticeUserAnswer[];
  isCompleted: boolean;
}

export interface PracticeSessionState {
  id: string;
  modeId: string;
  config: PracticeSessionConfig;
  questions: PracticeQuestion[];
  currentIndex: number;
  attempts: Record<string, UserQuestionAttempt>;
  startTime: number;
  endTime?: number;
  elapsedSeconds: number;
  timeRemainingSeconds?: number;
  isFinished: boolean;
  currentScore: number;
  currentCombo: number;
  maxCombo: number;
  livesRemaining: number;
  targetScoreReached?: boolean;
}

export interface PracticeResultSummary {
  sessionId: string;
  modeId: string;
  modeTitle: string;
  category: PracticeCategory;
  difficulty: number | string;
  lengthMode: PracticeLengthMode;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  score: number;
  maxCombo: number;
  durationSeconds: number;
  completedAt: string;
  attempts: UserQuestionAttempt[];
  feedbackNotes: string[];
  recommendedModes: string[];
}

export interface PracticeMode {
  id: string;
  title: string;
  description: string;
  shortTag: string;
  category: PracticeCategory;
  gradeRange: [number, number];
  icon: string;
  badgeColor?: string;
  gameRule?: PracticeGameRule;
  difficultyLevels: DifficultyLevel[];
  defaultLength?: PracticeLengthMode;
  supportsAdaptive?: boolean;

  generateQuestion(context: PracticeContext): PracticeQuestion;

  validateAnswer(
    question: PracticeQuestion,
    userAnswer: PracticeAnswerValue | null
  ): { isCorrect: boolean; message?: string } | boolean;

  calculateScore(
    question: PracticeQuestion,
    userAnswer: PracticeAnswerValue | null,
    context: { isCorrect: boolean; timeSpentSeconds?: number; combo: number; difficulty: number }
  ): number;
}
