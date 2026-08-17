export interface User {
  uid: string;
  displayName: string;
  role: 'admin' | 'user';
  createdAt: number;
  lastLoginAt: number;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  duration: number; // in seconds
  totalQuestions: number;
  tags: string[];
  coverImage?: string;
  rawExamJson: string; // The JSON of the exam structure
  published: boolean;
  isLocal?: boolean;
}

export interface ExamAnswers {
  id: string; // same as examId
  rawAnswerJson: string;
}

export interface Attempt {
  id: string; // uid_examId
  uid: string;
  examId: string;
  answers: Record<string, any>; // questionId -> userAnswer
  score: number;
  submittedAt: number;
  gradedAt: number;
  durationUsed: number;
  isFinished: boolean;
  totalCorrect: number;
}

// JSON Schemas (TypeScript definitions)
export interface JsonOption {
  text: string;
  value: string;
}

export interface JsonQuestion {
  id: string;
  examId: string;
  sectionId: string;
  text: string;
  questionText?: string;
  questionPremise?: string | null;
  type: 'multiple-choice' | 'short-answer';
  points: number;
  order: number;
  options?: JsonOption[];
}

export interface JsonSection {
  id: string;
  title: string;
  isMandatory: boolean;
  duration: number;
  numberOfQuestions: number;
  order: number;
  questions: JsonQuestion[];
}

export interface JsonExam {
  errorCode: number;
  sections: JsonSection[];
}

export interface JsonAnswerOption {
  text: string;
  value: string;
}

export interface JsonAnswerItem {
  questionId: string;
  sectionId: string;
  section: {
    _id: string;
    title: string;
    order: number;
  };
  questionText: string;
  questionPremise?: string | null;
  options?: JsonAnswerOption[];
  correctAnswer: string;
  userAnswer?: string | null;
  isCorrect: boolean;
  explanation: string;
}

export interface JsonAnswer {
  errorCode: number;
  attempt?: any;
  answers: JsonAnswerItem[];
}
