import { Timestamp } from "firebase/firestore";
import type { SubExamConfig } from "../features/sub-exam/types/subExam";

export type ExamStatus = "draft" | "published" | "unlisted" | "archived";

export interface Folder {
  id: string;
  ownerId?: string | null;
  parentId?: string | null;
  name: string;
  description?: string;
  color?: string; // e.g., "blue", "indigo", "emerald", "amber", "purple", "rose"
  icon?: string;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
  examCount?: number;
}

export interface Exam {
  id: string;
  ownerId?: string;
  title: string;
  code: string;
  description?: string;
  password?: string;

  // Folder & Category Classification
  folderId?: string | null;
  subject?: string; // "Toán", "Vật Lý", "Hóa Học", "Tiếng Anh", "Ngữ Văn", "Sinh Học", "Lịch Sử", "Địa Lý", "Tin Học", "GDCD", "Khác"
  gradeCategory?: string; // "Cấp 1", "Cấp 2", "Cấp 3", "THPT Quốc Gia", "Đánh Giá Năng Lực"
  isFeatured?: boolean; // Đánh dấu bài thi nổi bật
  attemptCount?: number;

  timeLimit: number; // in minutes

  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  shuffleSections?: boolean;
  shuffleStatements?: boolean;

  antiCheatEnabled?: boolean;

  showResults: boolean;
  showDetails: boolean;

  allowSubExam: boolean;
  subExamConfig?: SubExamConfig;

  maxAttempts: number;

  status: ExamStatus;
  isPublic?: boolean;
  visibility?: "public" | "private" | "unlisted";

  questionCount: number;

  stats?: {
    submissionCount: number;
    uniqueStudentCount: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    cheatCount: number;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Section {
  id: string;
  ownerId?: string;
  examId: string;
  title: string;
  description?: string;
  order: number;
  instructions?: string;
  questionCount: number;
  enabled: boolean;
  totalPoints?: number;
  pointsPerQuestion?: number;

  // Shuffling controls
  disableQuestionShuffle?: boolean; // Không xáo trộn các câu hỏi trong phần này
  pinOrder?: boolean; // Cố định vị trí phần này trong đề thi

  subExamConfig?: {
    enabled: boolean;
    numberOfQuestions?: number;
  };
}

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "short_answer";

export type Difficulty = "easy" | "medium" | "hard";

export interface QuestionOption {
  id: string;
  ownerId?: string;
  text: string;
}

export interface TrueFalseStatement {
  id: string;
  ownerId?: string;
  text: string;
  correctAnswer: boolean;
}

export interface Question {
  id: string;
  ownerId?: string;
  examId: string;
  sectionId?: string | null;
  type: QuestionType;

  text: string; // supports rich text/math
  imageUrl?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;

  options?: QuestionOption[]; // for single_choice and multiple_choice
  correctOptionIds?: string[]; // for single_choice and multiple_choice

  statements?: TrueFalseStatement[]; // for true_false

  acceptedAnswers?: string[]; // for short_answer
  caseSensitive?: boolean;
  trimWhitespace?: boolean;

  explanation?: string;

  points: number;
  order: number;
  difficulty?: Difficulty;
  tags?: string[];

  // Detailed shuffling controls
  pinQuestion?: boolean; // Cố định vị trí câu hỏi, không đảo khi xáo đề
  shuffleOptions?: boolean; // Cho phép/không cho phép đảo thứ tự đáp án câu này (mặc định true)
  shuffleStatements?: boolean; // Cho phép/không cho phép đảo thứ tự ý Đúng/Sai (mặc định true)
}

export interface Student {
  id: string;
  ownerId?: string;
  name: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
  studentClass?: string;
  searchName?: string;
  searchNameLower?: string;
  createdAt?: any;
}

export interface Submission {
  id: string;
  ownerId?: string;
  examId: string;
  examTitleSnapshot: string;
  examCodeSnapshot?: string;
  studentId: string;
  studentNameSnapshot: string;
  studentUsername?: string;
  studentClassSnapshot?: string;
  score: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
  timeSpent: number; // in seconds
  cheatViolations: number;
  submittedAt: Timestamp;
  answers: Record<string, any>; // questionId -> answer
  shuffledQuestionsSnapshot?: Question[]; // Snapshot of questions order & shuffled options during the exam session
  subExam?: boolean;
  subExamConfigSnapshot?: SubExamConfig;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: any | null;
  hasMore: boolean;
}
