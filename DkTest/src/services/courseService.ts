import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase/config";
import { api } from "./apiClient";
import { FirestoreCache } from "./firebase/firestoreCache";
import type {
  Course,
  CourseAccessInfo,
  CourseChapter,
  CourseLesson,
  CourseLessonOutlineItem,
  CourseVideoType,
} from "../types";

const COURSES_COLLECTION = "courses";

/**
 * Pure helper: Computes whether a lesson is effectively free based on course & lesson settings.
 */
export function isLessonEffectivelyFree(
  course: Pick<Course, "accessMode" | "priceVnd" | "freePreviewCount">,
  lesson: Pick<CourseLesson | CourseLessonOutlineItem, "accessType" | "order">
): boolean {
  const priceVnd = Math.max(0, Math.floor(Number(course.priceVnd) || 0));
  if (course.accessMode !== "paid" && priceVnd <= 0) return true;
  if (lesson.accessType === "free") return true;
  if (lesson.accessType === "paid") return false;
  const freeCount = Math.max(0, Math.floor(Number(course.freePreviewCount) || 0));
  return Number(lesson.order ?? 999999) < freeCount;
}

/**
 * Pure helper: Evaluates student access for a specific lesson given CourseAccessInfo.
 */
export function computeLessonAccessState(
  course: Pick<Course, "accessMode" | "priceVnd" | "freePreviewCount" | "unlockFullPolicy" | "allowSingleLessonPurchase">,
  lesson: Pick<CourseLessonOutlineItem, "id" | "accessType" | "order" | "priceVnd" | "includedInCourseUnlock">,
  access: Pick<CourseAccessInfo, "hasCourseAccess" | "unlockedCourse" | "unlockedLessonIds"> | null
): {
  isFree: boolean;
  unlockedByCourse: boolean;
  unlockedByLesson: boolean;
  canWatch: boolean;
  canBuySingle: boolean;
  effectiveSinglePriceVnd: number;
} {
  const isFree = isLessonEffectivelyFree(course, lesson);
  const unlockedByCourse = Boolean(
    access?.hasCourseAccess ||
      (access?.unlockedCourse &&
        (course.unlockFullPolicy !== "unlock_course_only" || lesson.includedInCourseUnlock !== false))
  );
  const unlockedByLesson = Boolean(access?.unlockedLessonIds?.includes(lesson.id));
  const canWatch = isFree || unlockedByCourse || unlockedByLesson;
  const effectiveSinglePriceVnd = Math.max(0, Math.floor(Number(lesson.priceVnd) || 0));
  const canBuySingle = !canWatch && Boolean(course.allowSingleLessonPurchase) && effectiveSinglePriceVnd >= 0;

  return {
    isFree,
    unlockedByCourse,
    unlockedByLesson,
    canWatch,
    canBuySingle,
    effectiveSinglePriceVnd,
  };
}

/**
 * Pure helper: Parses a video URL (YouTube, Google Drive, Vimeo, MP4/Cloudinary) into safe player config.
 */
export function parseVideoSource(
  rawUrl: string,
  preferredType?: CourseVideoType
): { kind: "youtube" | "iframe" | "video"; embedUrl: string } {
  const url = String(rawUrl || "").trim();
  if (!url) return { kind: "video", embedUrl: "" };

  // YouTube watch / share / shorts / embed URLs
  const ytMatch =
    url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      kind: "youtube",
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
    };
  }

  // Google Drive file links
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    return {
      kind: "iframe",
      embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
    };
  }

  if (preferredType === "iframe") {
    return { kind: "iframe", embedUrl: url };
  }

  if (preferredType === "mp4" || preferredType === "cloudinary" || /\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(url)) {
    return { kind: "video", embedUrl: url };
  }

  if (preferredType === "youtube") {
    return { kind: "iframe", embedUrl: url };
  }

  return { kind: "video", embedUrl: url };
}

/**
 * Builds sanitized public lessonOutline (without videoUrl/materials) and summary stats for courses/{courseId}.
 */
export function buildCourseOutlineAndStats(
  course: Pick<Course, "accessMode" | "priceVnd" | "freePreviewCount">,
  lessons: CourseLesson[]
): {
  orderedLessons: CourseLesson[];
  lessonOutline: CourseLessonOutlineItem[];
  lessonCount: number;
  freeLessonCount: number;
  paidLessonCount: number;
  totalDurationMinutes: number;
} {
  const orderedLessons = [...lessons]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((l, idx) => ({
      ...l,
      order: idx,
      priceVnd: Math.max(0, Math.floor(Number(l.priceVnd) || 0)),
      includedInCourseUnlock: l.includedInCourseUnlock !== false,
      accessType: l.accessType || "inherit_first_n",
    }));

  let freeLessonCount = 0;
  let paidLessonCount = 0;
  let totalDurationMinutes = 0;

  const lessonOutline: CourseLessonOutlineItem[] = orderedLessons.map((l) => {
    const isFreeEffective = isLessonEffectivelyFree(course, l);
    if (isFreeEffective) freeLessonCount++;
    else paidLessonCount++;
    totalDurationMinutes += Math.max(0, Math.floor(Number(l.durationMinutes) || 0));

    return {
      id: l.id,
      chapterId: l.chapterId || null,
      title: l.title,
      description: l.description || "",
      order: l.order,
      durationMinutes: Math.max(0, Math.floor(Number(l.durationMinutes) || 0)),
      videoType: l.videoType || "youtube",
      accessType: l.accessType,
      isFreeEffective,
      priceVnd: l.priceVnd || 0,
      includedInCourseUnlock: l.includedInCourseUnlock,
      ...(l.linkedExamId ? { linkedExamId: l.linkedExamId } : {}),
      hasMaterials: Boolean(l.materials && l.materials.length > 0),
    };
  });

  return {
    orderedLessons,
    lessonOutline,
    lessonCount: orderedLessons.length,
    freeLessonCount,
    paidLessonCount,
    totalDurationMinutes,
  };
}

export async function getPublishedCourses(forceRefresh = false): Promise<Course[]> {
  const cacheKey = "query:courses:published";
  if (!forceRefresh) {
    const cached = FirestoreCache.get<Course[]>(cacheKey);
    if (cached) return cached;
  }

  let items: Course[] = [];
  try {
    const q = query(
      collection(db, COURSES_COLLECTION),
      where("status", "==", "published"),
      orderBy("updatedAt", "desc"),
      limit(24)
    );
    const snap = await getDocs(q);
    items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Course));
  } catch {
    const q = query(collection(db, COURSES_COLLECTION), where("status", "==", "published"), limit(24));
    const snap = await getDocs(q);
    items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Course));
    items.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  }

  FirestoreCache.set(cacheKey, items, 120 * 1000);
  return items;
}

export async function getAdminCoursesList(forceRefresh = false): Promise<Course[]> {
  const cacheKey = "query:courses:admin";
  if (!forceRefresh) {
    const cached = FirestoreCache.get<Course[]>(cacheKey);
    if (cached) return cached;
  }

  const snap = await getDocs(query(collection(db, COURSES_COLLECTION), limit(50)));
  const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Course));
  items.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());

  FirestoreCache.set(cacheKey, items, 45 * 1000);
  return items;
}

export async function getCourse(courseId: string, forceRefresh = false): Promise<Course | null> {
  if (!courseId) return null;
  const cacheKey = `doc:courses:${courseId}`;
  if (!forceRefresh) {
    const cached = FirestoreCache.get<Course>(cacheKey);
    if (cached) return cached;
  }

  const snap = await getDoc(doc(db, COURSES_COLLECTION, courseId));
  if (!snap.exists()) return null;
  const course = { id: snap.id, ...(snap.data() as any) } as Course;
  FirestoreCache.set(cacheKey, course, 60 * 1000);
  return course;
}

export async function getCourseLessonsForAdmin(courseId: string): Promise<CourseLesson[]> {
  const snap = await getDocs(collection(db, COURSES_COLLECTION, courseId, "lessons"));
  const lessons = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as CourseLesson));
  lessons.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return lessons;
}

export async function getAuthorizedCourseLesson(courseId: string, lessonId: string): Promise<CourseLesson> {
  try {
    const snap = await getDoc(doc(db, COURSES_COLLECTION, courseId, "lessons", lessonId));
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as any) } as CourseLesson;
    }
  } catch (fsErr) {
    // Fall through to authenticated API endpoint (which checks server entitlement and handles REST/rules gracefully)
    console.warn("[courseService] Direct lesson read fallback to API:", fsErr);
  }

  const res = await api.get<{ success: boolean; lesson: CourseLesson }>(
    `/api/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/content`
  );
  if (!res?.lesson) {
    throw new Error("Không thể tải nội dung bài giảng.");
  }
  return res.lesson;
}

export async function saveCourseWithLessons(params: {
  courseId?: string;
  courseData: Omit<
    Course,
    "id" | "lessonOutline" | "lessonCount" | "freeLessonCount" | "paidLessonCount" | "totalDurationMinutes"
  >;
  lessons: CourseLesson[];
  deletedLessonIds?: string[];
}): Promise<string> {
  const now = new Date().toISOString();
  const isNew = !params.courseId;
  const courseRef = params.courseId
    ? doc(db, COURSES_COLLECTION, params.courseId)
    : doc(collection(db, COURSES_COLLECTION));
  const courseId = courseRef.id;

  const cleanPrice = Math.max(0, Math.floor(Number(params.courseData.priceVnd) || 0));
  const cleanAccessMode: Course["accessMode"] =
    params.courseData.accessMode === "paid" || cleanPrice > 0 ? "paid" : "free";
  const normalizedBase = {
    ...params.courseData,
    accessMode: cleanAccessMode,
    priceVnd: cleanAccessMode === "paid" ? cleanPrice : 0,
    originalPriceVnd: params.courseData.originalPriceVnd
      ? Math.max(0, Math.floor(Number(params.courseData.originalPriceVnd) || 0))
      : undefined,
    freePreviewCount: Math.max(0, Math.floor(Number(params.courseData.freePreviewCount) || 0)),
    unlockFullPolicy: params.courseData.unlockFullPolicy || "unlock_all_videos",
    allowSingleLessonPurchase: Boolean(params.courseData.allowSingleLessonPurchase),
    salesEnabled: params.courseData.salesEnabled !== false,
    chapters: (params.courseData.chapters || []).map((c: CourseChapter, idx: number) => ({
      ...c,
      order: idx,
    })),
  };

  const {
    orderedLessons,
    lessonOutline,
    lessonCount,
    freeLessonCount,
    paidLessonCount,
    totalDurationMinutes,
  } = buildCourseOutlineAndStats(normalizedBase, params.lessons);

  const courseDoc: Record<string, any> = {
    ...normalizedBase,
    id: courseId,
    lessonOutline,
    lessonCount,
    freeLessonCount,
    paidLessonCount,
    totalDurationMinutes,
    updatedAt: now,
    ...(isNew ? { createdAt: now } : {}),
  };

  // Remove undefined properties cleanly for Firestore
  Object.keys(courseDoc).forEach((k) => {
    if (courseDoc[k] === undefined) delete courseDoc[k];
  });

  const batch = writeBatch(db);
  batch.set(courseRef, courseDoc, { merge: true });

  for (const lesson of orderedLessons) {
    const lessonRef = doc(db, COURSES_COLLECTION, courseId, "lessons", lesson.id);
    const cleanLesson: Record<string, any> = {
      ...lesson,
      courseId,
      updatedAt: now,
      createdAt: lesson.createdAt || now,
    };
    Object.keys(cleanLesson).forEach((k) => {
      if (cleanLesson[k] === undefined) delete cleanLesson[k];
    });
    batch.set(lessonRef, cleanLesson, { merge: true });
  }

  for (const delId of params.deletedLessonIds || []) {
    if (delId) {
      batch.delete(doc(db, COURSES_COLLECTION, courseId, "lessons", delId));
    }
  }

  await batch.commit();

  FirestoreCache.invalidatePrefix("query:courses");
  FirestoreCache.invalidate(`doc:courses:${courseId}`);
  return courseId;
}

export async function deleteCourse(courseId: string): Promise<void> {
  // Delete subcollection lessons first, then root course doc
  const lessonsSnap = await getDocs(collection(db, COURSES_COLLECTION, courseId, "lessons"));
  const batch = writeBatch(db);
  lessonsSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, COURSES_COLLECTION, courseId));
  await batch.commit();

  FirestoreCache.invalidatePrefix("query:courses");
  FirestoreCache.invalidate(`doc:courses:${courseId}`);
}
