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
  showScore?: boolean;
  showDetails: boolean;
  submissionsCount?: number;
  totalParticipants?: number;

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
  | "fill_blank"
  | "matching";

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

export interface MatchingItem {
  id: string;
  label?: string; // e.g. "1", "2", "3" or "a", "b", "c"
  text: string; // supports rich text/math
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

  // for matching questions (nối bảng 2 cột: Cột 1 (1->n) và Cột 2 (a->z))
  matchingLeft?: MatchingItem[]; // Cột 1 (hàng 1 -> n)
  matchingRight?: MatchingItem[]; // Cột 2 (hàng a -> z)
  correctMatches?: Record<string, string>; // left key/id -> right key/id (e.g. { "1": "c", "2": "a" })

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

// -------------------------------------------------------------
// Authentication, Roles & User Profiles
// -------------------------------------------------------------

export type UserRole = "student" | "parent" | "teacher" | "admin" | "super_admin";

export type AccountStatus = "pending" | "active" | "suspended" | "disabled" | "deleted";

export type AuthProviderType = "google" | "password" | "google+password" | "username";

export interface UserProfile {
  uid: string;
  username?: string;
  usernameNormalized?: string;
  fullName?: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  accountStatus: AccountStatus;
  provider: AuthProviderType | string;
  authProvider?: string;
  emailVerified: boolean;
  createdAt: any;
  updatedAt: any;
  lastLoginAt?: any;
  lastSeenAt?: any;
  loginCount?: number;
  profileCompleted?: number; // percentage 0-100
  isTestAccount?: boolean;
  notes?: string;
  studentClass?: string;
  phone?: string;
  contactEmail?: string;
  pendingEmail?: string | null;
  pendingEmailRequestedAt?: string;
}

export interface StudentProfile {
  uid: string;
  studentId?: string; // e.g. HS2026-001
  fullName: string;
  className?: string;
  grade?: string; // Khối 10, 11, 12, etc.
  school?: string;
  academicYear?: string;
  avatar?: string;
  parentIds?: string[];
  createdAt?: any;
  updatedAt?: any;
  totalExamsTaken?: number;
  averageScore?: number;
}

export interface ParentProfile {
  uid: string;
  parentId?: string;
  fullName: string;
  email?: string;
  phone?: string;
  childIds?: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface ParentStudentRelationship {
  id: string;
  studentUid: string;
  studentName: string;
  studentEmail?: string;
  studentClass?: string;
  parentUid: string;
  parentName: string;
  parentEmail?: string;
  inviteCode?: string;
  status: "pending" | "active" | "rejected" | "unlinked";
  createdAt: any;
  updatedAt?: any;
  linkedAt?: any;
  verifiedByAdmin?: boolean;
}

export type AuditLogAction =
  | "USER_APPROVED"
  | "USER_SUSPENDED"
  | "USER_REACTIVATED"
  | "USER_DISABLED"
  | "USER_DELETED"
  | "ROLE_CHANGED"
  | "PROFILE_UPDATED"
  | "PARENT_LINKED"
  | "PARENT_UNLINKED"
  | "EXAM_UPDATED"
  | "ADMIN_LOGIN"
  | "DATA_REPAIRED"
  | "BULK_OPERATION";

export interface AuditLog {
  id: string;
  actorUid: string;
  actorRole: string;
  actorEmail?: string;
  actorName?: string;
  action: AuditLogAction;
  targetUid?: string;
  targetType?: "user" | "student" | "parent" | "exam" | "relationship" | "system";
  metadata?: Record<string, any>;
  timestamp: any;
  ipHashOrSafeMetadata?: string;
  userAgentSummary?: string;
}

export type ReconciliationIssueType =
  | "AUTH_WITHOUT_PROFILE"
  | "ORPHAN_PROFILE"
  | "VALID_USER"
  | "DATA_CONFLICT"
  | "MISSING_ROLE"
  | "INVALID_METADATA"
  | "BROKEN_RELATIONSHIP";

export interface ReconciliationIssue {
  id: string;
  type: ReconciliationIssueType;
  severity: "warning" | "error" | "info";
  description: string;
  uid?: string;
  email?: string;
  displayName?: string;
  source: "auth" | "firestore" | "both";
  safeToAutoRepair: boolean;
  suggestedAction: string;
  details?: Record<string, any>;
}

export interface DataHealthReport {
  scannedAt: string;
  totalAuthUsers: number;
  totalProfiles: number;
  validUsersCount: number;
  authWithoutProfileCount: number;
  orphanProfileCount: number;
  missingRoleCount: number;
  duplicateEmailCount: number;
  brokenRelationshipCount: number;
  issues: ReconciliationIssue[];
}

export interface SystemSettings {
  registrationEnabled: boolean;
  googleLoginEnabled: boolean;
  passwordLoginEnabled: boolean;
  requireEmailVerification: boolean;
  requireAdminApproval: boolean;
  defaultStudentStatus: AccountStatus;
  allowedEmailDomains?: string[];
  maintenanceMode: boolean;
  pageSize: number;
  updatedAt?: any;
  updatedBy?: string;
}

export interface SystemNotification {
  id: string;
  recipientUid: string;
  title: string;
  content: string;
  type: "system" | "approval" | "relationship" | "exam" | "security";
  read: boolean;
  link?: string;
  createdAt: any;
}



