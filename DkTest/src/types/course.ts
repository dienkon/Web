export type CourseStatus = "draft" | "published" | "archived";
export type CourseAccessMode = "free" | "paid";
export type CourseUnlockFullPolicy = "unlock_all_videos" | "unlock_course_only";
export type CourseLessonAccessType = "inherit_first_n" | "free" | "paid";
export type CourseVideoType = "youtube" | "mp4" | "cloudinary" | "iframe";

export interface CourseChapter {
  id: string;
  title: string;
  description?: string;
  order: number;
}

export interface CourseLessonMaterial {
  id: string;
  label: string;
  type: "link" | "file";
  url: string;
  fileName?: string;
}

export interface CourseLesson {
  id: string;
  courseId: string;
  chapterId?: string | null;
  title: string;
  description?: string;
  order: number; // 0-based global index across the course
  durationMinutes?: number;
  videoType: CourseVideoType;
  videoUrl: string;
  thumbnailUrl?: string;
  materials?: CourseLessonMaterial[];
  linkedExamId?: string;
  accessType: CourseLessonAccessType;
  priceVnd?: number; // Individual price if allowSingleLessonPurchase is true
  includedInCourseUnlock: boolean; // Default true: full course unlock grants access
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Sanitized public syllabus entry stored on courses/{courseId}
 * NEVER stores videoUrl or private materials so paid videos cannot leak from public catalogue reads.
 */
export interface CourseLessonOutlineItem {
  id: string;
  chapterId?: string | null;
  title: string;
  description?: string;
  order: number;
  durationMinutes?: number;
  videoType: CourseVideoType;
  accessType: CourseLessonAccessType;
  isFreeEffective: boolean;
  priceVnd: number;
  includedInCourseUnlock: boolean;
  linkedExamId?: string;
  hasMaterials?: boolean;
}

export interface Course {
  id: string;
  title: string;
  code?: string;
  description?: string;
  thumbnailUrl?: string;
  subject?: string;
  gradeCategory?: string;
  instructorName?: string;
  status: CourseStatus;
  isFeatured?: boolean;

  // Tuition & Unlock Settings
  accessMode: CourseAccessMode;
  priceVnd: number;
  originalPriceVnd?: number;
  salesEnabled: boolean;
  unlockFullPolicy: CourseUnlockFullPolicy;
  freePreviewCount: number; // Number of initial videos free for preview (0+)
  allowSingleLessonPurchase: boolean; // Allow buying individual paid video lessons

  // Public Curriculum Metadata (no video URLs)
  chapters: CourseChapter[];
  lessonOutline: CourseLessonOutlineItem[];

  lessonCount: number;
  freeLessonCount: number;
  paidLessonCount: number;
  totalDurationMinutes?: number;
  enrolledCount?: number;

  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  updatedBy?: string;
}

export interface CourseEntitlement {
  id: string; // `${uid}_${courseId}` (course) or `${uid}_${courseId}__${lessonId}` (lesson)
  uid: string;
  courseId: string;
  lessonId?: string | null;
  scope: "course" | "lesson";
  status: "active" | "revoked";
  source: "purchase" | "admin_grant";
  pricePaidVnd?: number;
  transactionId?: string;
  grantedAt: any;
  grantedBy?: string;
  courseTitleSnapshot?: string;
  lessonTitleSnapshot?: string;
}

export interface CourseAccessInfo {
  hasCourseAccess: boolean;
  isFreeCourse: boolean;
  unlockedCourse: boolean;
  unlockedLessonIds: string[];
  priceVnd: number;
  accessMode: CourseAccessMode;
  salesEnabled: boolean;
  unlockFullPolicy: CourseUnlockFullPolicy;
  freePreviewCount: number;
  allowSingleLessonPurchase: boolean;
  userBalance: number;
  missingVnd: number;
  canUnlockCourse: boolean;
  courseTitle: string;
}
