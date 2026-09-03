export type AnswerOption = 'A' | 'B' | 'C' | 'D';

export interface QuestionOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface Question {
  id: string;
  roomId: string;
  text: string;
  options: QuestionOptions;
  status: 'draft' | 'active' | 'locked';
  correctAnswer?: AnswerOption;
  createdAt: number;
}

export interface UserAnswer {
  userId: string;
  userName: string;
  answer: AnswerOption;
  timestamp: number;
}

export interface AnswerStatistics {
  A: number;
  B: number;
  C: number;
  D: number;
  total: number;
}
