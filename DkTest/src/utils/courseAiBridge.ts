import type {
  CourseAccessMode,
  CourseStatus,
  CourseUnlockFullPolicy,
  CourseVideoType,
} from "../types/course";

export interface CourseEditorSnapshotLesson {
  id: string;
  order: number;
  lessonNumber: number; // 1-based for natural user referencing (#1, #2, ...)
  title: string;
  chapterId?: string | null;
  topicTitle?: string;
  videoType: CourseVideoType;
  hasVideoUrl: boolean;
  videoHostLabel?: string;
  durationMinutes: number;
  durationSeconds: number;
  accessType: string;
  priceVnd: number;
  includedInCourseUnlock: boolean;
  linkedExamId?: string;
  materialsCount: number;
}

export interface CourseEditorContextSnapshot {
  isNewCourse: boolean;
  courseId: string | null;
  title: string;
  code?: string;
  subject?: string;
  gradeCategory?: string;
  instructorName?: string;
  status: CourseStatus;
  accessMode: CourseAccessMode;
  priceVnd: number;
  defaultLessonPriceVnd: number;
  freePreviewCount: number;
  unlockFullPolicy: CourseUnlockFullPolicy;
  allowSingleLessonPurchase: boolean;
  salesEnabled: boolean;
  selectedLessonId: string | null;
  chapters: Array<{
    id: string;
    title: string;
    groupTitle?: string;
    order: number;
  }>;
  lessons: CourseEditorSnapshotLesson[];
}

export interface CourseManagerSummaryItem {
  id: string;
  title: string;
  code?: string;
  subject?: string;
  status: CourseStatus;
  accessMode: CourseAccessMode;
  priceVnd: number;
  lessonCount: number;
  totalDurationMinutes?: number;
}

export type CourseEditorBridgeHandler = (
  actionType: string,
  params: Record<string, any>
) => Promise<{ success: boolean; message: string; data?: any }>;

declare global {
  interface Window {
    __dktestCourseEditorContext?: CourseEditorContextSnapshot | null;
    __dktestCoursesSummary?: CourseManagerSummaryItem[] | null;
    __dktestCourseEditorHandler?: {
      courseId: string | null;
      isNewCourse: boolean;
      apply: CourseEditorBridgeHandler;
    } | null;
  }
}

export function setCourseEditorContextSnapshot(snapshot: CourseEditorContextSnapshot | null): void {
  if (typeof window === "undefined") return;
  window.__dktestCourseEditorContext = snapshot;
}

export function getCourseEditorContextSnapshot(): CourseEditorContextSnapshot | null {
  if (typeof window === "undefined") return null;
  return window.__dktestCourseEditorContext || null;
}

export function setCourseManagerSummarySnapshot(items: CourseManagerSummaryItem[] | null): void {
  if (typeof window === "undefined") return;
  window.__dktestCoursesSummary = items;
}

export function getCourseManagerSummarySnapshot(): CourseManagerSummaryItem[] | null {
  if (typeof window === "undefined") return null;
  return window.__dktestCoursesSummary || null;
}

export function registerCourseEditorBridgeHandler(
  handler: {
    courseId: string | null;
    isNewCourse: boolean;
    apply: CourseEditorBridgeHandler;
  } | null
): void {
  if (typeof window === "undefined") return;
  window.__dktestCourseEditorHandler = handler;
}

export function getCourseEditorBridgeHandler() {
  if (typeof window === "undefined") return null;
  return window.__dktestCourseEditorHandler || null;
}
