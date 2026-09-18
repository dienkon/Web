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
  creatorUsername?: string;
  creatorRole?: string;
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
  duration?: number; // alias for timeLimit in minutes

  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  shuffleSections?: boolean;
  shuffleStatements?: boolean;

  antiCheatEnabled?: boolean;
  maxWarnings?: number;
  autoSubmitOnViolation?: boolean;

  showResults: boolean;
  showDetails: boolean;

  allowSubExam: boolean;
  subExamConfig?: SubExamConfig;

  maxAttempts: number; // 0 = vô hạn
  openTime?: string; // ISO string / datetime: thời gian bắt đầu mở đề
  closeTime?: string; // ISO string / datetime: thời gian khóa/đóng đề

  // Attachments (Files and URLs) displayed after submission
  attachments?: ExamAttachment[];

  // Listening Audio Configuration
  audioConfig?: ExamAudioConfig;

  status: ExamStatus;
  isPublic?: boolean;
  visibility?: "public" | "private" | "unlisted";

  questionCount: number;
  totalQuestions?: number; // alias for questionCount
  maxScore?: number;
  isPractice?: boolean;
  isRetake?: boolean;
  isAggregatedReview?: boolean;
  sourceExamCount?: number;
  originalExamId?: string;

  questions?: Question[];
  sections?: Section[];

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

  // Section-level listening audio
  audioConfig?: ExamAudioConfig;
}

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "ordering"
  | "fill_blank";

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

export interface OrderingItem {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  ownerId?: string;
  examId: string;
  sectionId?: string | null;
  type: QuestionType;

  text: string; // supports rich text/math, with [_] for fill_blank
  imageUrl?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;

  options?: QuestionOption[]; // for single_choice and multiple_choice
  correctOptionIds?: string[]; // for single_choice and multiple_choice

  statements?: TrueFalseStatement[]; // for true_false

  acceptedAnswers?: string[]; // for short_answer
  caseSensitive?: boolean;
  trimWhitespace?: boolean;

  // for ordering questions
  orderingItems?: OrderingItem[];
  correctOrder?: string[]; // Array of ordering item IDs in correct sequence

  // for fill_blank questions
  acceptedAnswersPerBlank?: Record<number, string[]>; // blank index (0-indexed) -> array of valid accepted answers
  blankAnswers?: string[][]; // alternative format: array of answer arrays per blank

  explanation?: string;

  points: number;
  order: number;
  difficulty?: Difficulty;
  tags?: string[];

  // Detailed shuffling controls
  pinQuestion?: boolean; // Cố định vị trí câu hỏi, không đảo khi xáo đề
  shuffleOptions?: boolean; // Cho phép/không cho phép đảo thứ tự đáp án câu này (mặc định true)
  shuffleStatements?: boolean; // Cho phép/không cho phép đảo thứ tự ý Đúng/Sai (mặc định true)

  // Question-level listening audio
  audioConfig?: ExamAudioConfig;
  audioUrl?: string | null;
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

export interface QuestionTiming {
  questionId: string;
  questionIndex: number;
  timeSpentSeconds: number; // Cumulative seconds
  visits: number; // Number of times opened
  answerChanges: number; // Number of times answer was modified
  firstOpenedAt?: number;
  lastInteractionAt?: number;
}

export interface StructuredAiPriority {
  title: string;
  reason: string;
  evidence: string; // e.g., "Câu 12, 27, 34"
  action: string;
}

export interface StructuredMistakePattern {
  pattern: string; // e.g. "Sai do tính toán", "Nhầm công thức"
  description: string;
  affectedQuestions: string[]; // e.g. ["Câu 3", "Câu 7"]
  suggestion: string;
}

export interface StructuredSectionPerformance {
  sectionId?: string;
  title: string;
  accuracy: number;
  strength?: string;
  weakness?: string;
  stability?: string;
}

export interface StructuredProgressAnalysis {
  startPhase: string; // e.g. "Đầu bài: 94% đúng, tốc độ nhanh và ổn định"
  middlePhase: string; // e.g. "Giữa bài: Tốc độ chậm lại, xuất hiện một số câu khó"
  endPhase: string; // e.g. "Cuối bài: Tỷ lệ đúng giữ vững..."
  pacingInsight: string;
}

export interface StructuredTimeAnalysis {
  overallPacing: string;
  fastestInsight?: string;
  slowestInsight?: string;
  stuckAreas?: string;
  rushingAreas?: string;
  efficiencyAdvice: string;
}

export interface StructuredNotableQuestion {
  questionIndex: number; // 1-based index
  questionId: string;
  timeSpentSeconds: number;
  status: "correct" | "incorrect" | "unanswered";
  reason: string; // Why this question is notable (e.g. "Mất 82s nhưng vẫn sai")
  recommendation: string;
}

export interface StructuredAiAnalysis {
  summary: string;
  sectionPerformance: StructuredSectionPerformance[];
  priorities: StructuredAiPriority[]; // Exactly 3 priorities
  mistakePatterns: StructuredMistakePattern[];
  progressAnalysis: StructuredProgressAnalysis;
  timeAnalysis: StructuredTimeAnalysis;
  notableQuestions: StructuredNotableQuestion[];
  followUpQuestions: string[];
  disclaimer: string;
}

export interface AiAnalysisCache {
  version: string;
  data: StructuredAiAnalysis;
  generatedAt: string;
  inputHash: string;
}

export interface Submission {
  id: string;
  attemptId?: string;
  submissionReason?: "manual" | "timeout" | "admin_force" | "suspended";
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
  questionTiming?: Record<string, QuestionTiming>;
  aiAnalysis?: AiAnalysisCache;
  isRetake?: boolean;
  isAggregatedReview?: boolean;
  originalExamId?: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: any | null;
  hasMore: boolean;
}

export interface ExamAttachment {
  id: string;
  type: "link" | "file";
  label: string; // Tên hiển thị (do Admin đặt, ví dụ "Nội dung:", "Nội dung 2:")
  url?: string; // Dành cho link web hoặc Cloudinary URL của tệp
  fileName?: string; // Tên tệp tin
  fileData?: string; // Base64 data URL hoặc URL download
  fileSize?: number; // Kích thước tệp (bytes)
  mimeType?: string; // Loại tệp
}

export interface ExamAudioConfig {
  enabled: boolean;
  url?: string; // Cloudinary secure_url
  fileName?: string;
  fileSize?: number;
  title?: string; // Tên hiển thị bài nghe (VD: "Audio Listening Part 1")
  maxPlays: number; // Số lần tối đa được ấn nghe (0 = Vô hạn)
  allowSeek: boolean; // Cho phép tua thanh thời gian
  allowPause: boolean; // Cho phép tạm dừng khi đang phát
  autoPlay?: boolean; // Tự động phát khi bắt đầu làm bài
}


