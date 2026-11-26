import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase/config";
import { api, getApiBaseUrl } from "./apiClient";
import { FirestoreCache } from "./firebase/firestoreCache";
import { isNativeAndroid } from "./offline/sync";
import {
  cleanDetectedVideoTitle,
  extractGoogleDriveFileId,
  extractYouTubeVideoId,
  inferCourseVideoType,
  isPlaceholderLessonTitle,
} from "../utils/videoSourceHelper";
import type {
  Course,
  CourseAccessInfo,
  CourseAccessMode,
  CourseChapter,
  CourseEntitlement,
  CourseLesson,
  CourseLessonOutlineItem,
  CourseOutlineMaterialItem,
  CoursePurchaseDetailItem,
  CoursePurchasesPageResult,
  CourseResourceUnlockScope,
  CourseVideoType,
} from "../types";

export {
  cleanDetectedVideoTitle,
  extractGoogleDriveFileId,
  extractYouTubeVideoId,
  inferCourseVideoType,
  isPlaceholderLessonTitle,
};

const COURSES_COLLECTION = "courses";
const COURSES_SESSION_KEY = "dktest_published_courses_v2";
const COURSE_DOC_SESSION_PREFIX = "dktest_course_doc_v2_";
const PUBLIC_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const LESSON_MEMORY_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes (RAM only, never localStorage)

function readSessionCache<T>(key: string, ttlMs: number): T | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.timestamp !== "number") return null;
    if (Date.now() - parsed.timestamp > ttlMs) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data as T;
  } catch {
    return null;
  }
}

function writeSessionCache(key: string, data: any): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Ignore storage quota issues silently
  }
}

function clearCoursesSessionCache(courseId?: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(COURSES_SESSION_KEY);
    if (courseId) {
      sessionStorage.removeItem(`${COURSE_DOC_SESSION_PREFIX}${courseId}`);
    }
  } catch {}
}

export function resolveCourseAccessMode(
  course: Pick<Course, "accessMode" | "priceVnd">
): CourseAccessMode {
  if (course.accessMode === "per_video") return "per_video";
  if (course.accessMode === "paid") return "paid";
  if (course.accessMode === "free") return "free";
  return (Math.max(0, Math.floor(Number(course.priceVnd) || 0)) > 0 ? "paid" : "free");
}

/**
 * Pure helper: Computes whether a lesson is effectively free based on course & lesson settings.
 * IMPORTANT: In "per_video" mode, course entry is free (priceVnd === 0) while individual videos are paid unless freePreviewCount or accessType === "free" grants access.
 */
export function isLessonEffectivelyFree(
  course: Pick<Course, "accessMode" | "priceVnd" | "freePreviewCount">,
  lesson: Pick<CourseLesson | CourseLessonOutlineItem, "accessType" | "order">
): boolean {
  const mode = resolveCourseAccessMode(course);
  if (mode === "free") return true;
  if (lesson.accessType === "free") return true;
  if (lesson.accessType === "paid") return false;
  const freeCount = Math.max(0, Math.floor(Number(course.freePreviewCount) || 0));
  return Number(lesson.order ?? 999999) < freeCount;
}

/**
 * Pure helper: Evaluates student access for a specific lesson given CourseAccessInfo.
 */
export function computeLessonAccessState(
  course: Pick<
    Course,
    "accessMode" | "priceVnd" | "freePreviewCount" | "unlockFullPolicy" | "allowSingleLessonPurchase"
  >,
  lesson: Pick<
    CourseLessonOutlineItem,
    "id" | "accessType" | "order" | "priceVnd" | "includedInCourseUnlock"
  >,
  access: Pick<CourseAccessInfo, "hasCourseAccess" | "unlockedCourse" | "unlockedLessonIds"> | null
): {
  isFree: boolean;
  unlockedByCourse: boolean;
  unlockedByLesson: boolean;
  canWatch: boolean;
  canBuySingle: boolean;
  effectiveSinglePriceVnd: number;
} {
  const mode = resolveCourseAccessMode(course);
  const isFree = isLessonEffectivelyFree(course, lesson);
  const unlockedByCourse = Boolean(
    mode === "free" ||
      access?.hasCourseAccess ||
      (access?.unlockedCourse &&
        (course.unlockFullPolicy !== "unlock_course_only" || lesson.includedInCourseUnlock !== false))
  );
  const unlockedByLesson = Boolean(access?.unlockedLessonIds?.includes(lesson.id));
  const canWatch = isFree || unlockedByCourse || unlockedByLesson;
  const effectiveSinglePriceVnd = Math.max(0, Math.floor(Number(lesson.priceVnd) || 0));
  const singlePurchaseAllowed = mode === "per_video" || Boolean(course.allowSingleLessonPurchase);
  const canBuySingle = !canWatch && singlePurchaseAllowed && effectiveSinglePriceVnd >= 0;

  return {
    isFree,
    unlockedByCourse,
    unlockedByLesson,
    canWatch,
    canBuySingle,
    effectiveSinglePriceVnd,
  };
}

export interface CourseResourcePolicyConfig {
  enabled: boolean;
  unlockMaterials: boolean;
  unlockExams: boolean;
  scope: CourseResourceUnlockScope;
}

export interface CourseResourceAccessResult {
  canAccess: boolean;
  unlockedByPolicy: boolean;
  lockReason?: string;
}

const VALID_RESOURCE_UNLOCK_SCOPES: CourseResourceUnlockScope[] = [
  "any_video_in_topic",
  "same_lesson",
  "full_topic",
  "full_chapter",
  "full_course",
];

export const COURSE_RESOURCE_SCOPE_META: Record<
  CourseResourceUnlockScope,
  { label: string; shortLabel: string; description: string }
> = {
  any_video_in_topic: {
    label: "Mở ít nhất 1 video trong mục (Mặc định)",
    shortLabel: "1 video / mục",
    description:
      "Học sinh chỉ cần mở khóa 1 video trả phí bất kỳ trong chuyên đề/mục đó là xem được toàn bộ tài liệu và bài thi cùng mục.",
  },
  same_lesson: {
    label: "Đúng bài giảng chứa tài liệu/đề",
    shortLabel: "Đúng bài giảng",
    description:
      "Tài liệu và bài thi gắn ở bài giảng nào thì chỉ mở khi học sinh mở khóa chính video của bài giảng đó.",
  },
  full_topic: {
    label: "Mở khóa toàn bộ chuyên đề",
    shortLabel: "Toàn bộ chuyên đề",
    description:
      "Học sinh phải mở khóa tất cả video trong chuyên đề đó mới mở được tài liệu và bài thi của chuyên đề.",
  },
  full_chapter: {
    label: "Mở khóa toàn bộ chương",
    shortLabel: "Toàn bộ chương",
    description:
      "Học sinh phải mở khóa tất cả video trong chương đó mới mở được tài liệu và bài thi thuộc chương.",
  },
  full_course: {
    label: "Mở khóa toàn bộ khóa học",
    shortLabel: "Toàn bộ khóa học",
    description:
      "Chỉ mở tài liệu và bài thi khi học sinh đã mở khóa trọn bộ khóa học (hoặc tất cả video trong khóa).",
  },
};

export function resolveCourseResourcePolicy(
  course?: Pick<
    Course,
    | "unlockResourcesWithVideo"
    | "unlockMaterialsWithVideo"
    | "unlockExamsWithVideo"
    | "resourceUnlockScope"
  > | null
): CourseResourcePolicyConfig {
  const enabled = course?.unlockResourcesWithVideo !== false;
  const unlockMaterials = enabled && course?.unlockMaterialsWithVideo !== false;
  const unlockExams = enabled && course?.unlockExamsWithVideo !== false;
  const rawScope = course?.resourceUnlockScope;
  const scope: CourseResourceUnlockScope = VALID_RESOURCE_UNLOCK_SCOPES.includes(
    rawScope as CourseResourceUnlockScope
  )
    ? (rawScope as CourseResourceUnlockScope)
    : "any_video_in_topic";

  return { enabled, unlockMaterials, unlockExams, scope };
}

function getLessonChapterKey(lesson: Pick<CourseLessonOutlineItem | CourseLesson, "chapterId">): string {
  return String(lesson.chapterId || "__other__").trim() || "__other__";
}

function getLessonTopicKey(
  lesson: Pick<CourseLessonOutlineItem | CourseLesson, "id" | "topicTitle">
): string {
  return String(lesson.topicTitle || "").trim() || `__single_${lesson.id}`;
}

/**
 * Pure helper: Evaluates whether a student can access a lesson's attached materials or linked exam
 * according to the course's ON/OFF resource unlock policy and scope.
 * Never grants videoUrl access — strictly for materials & linked exams.
 */
export function computeCourseResourceAccess(
  course: Course,
  lesson: Pick<
    CourseLessonOutlineItem | CourseLesson,
    "id" | "chapterId" | "topicTitle" | "accessType" | "order" | "priceVnd" | "includedInCourseUnlock"
  >,
  access: CourseAccessInfo | null | undefined,
  resourceKind: "material" | "exam"
): CourseResourceAccessResult {
  const mode = resolveCourseAccessMode(course);
  if (mode === "free" || access?.isFreeCourse) {
    return { canAccess: true, unlockedByPolicy: false };
  }

  const toLessonState = (
    item: Pick<
      CourseLessonOutlineItem | CourseLesson,
      "id" | "accessType" | "order" | "priceVnd" | "includedInCourseUnlock"
    >
  ) =>
    computeLessonAccessState(
      course,
      { ...item, priceVnd: item.priceVnd ?? 0 },
      access
    );

  const lessonState = toLessonState(lesson);
  if (lessonState.unlockedByCourse) {
    return { canAccess: true, unlockedByPolicy: false };
  }

  const policy = resolveCourseResourcePolicy(course);
  const kindEnabled =
    policy.enabled && (resourceKind === "material" ? policy.unlockMaterials : policy.unlockExams);

  if (!kindEnabled) {
    return {
      canAccess: false,
      unlockedByPolicy: false,
      lockReason:
        resourceKind === "material"
          ? "Khóa học đã tắt tự động mở tài liệu theo video"
          : "Khóa học đã tắt tự động mở bài thi theo video",
    };
  }

  const outline: Array<
    Pick<
      CourseLessonOutlineItem | CourseLesson,
      "id" | "chapterId" | "topicTitle" | "accessType" | "order" | "priceVnd" | "includedInCourseUnlock"
    >
  > =
    Array.isArray(course.lessonOutline) && course.lessonOutline.length > 0
      ? course.lessonOutline
      : [lesson];

  const targetChapterKey = getLessonChapterKey(lesson);
  const targetTopicKey = getLessonTopicKey(lesson);

  const topicLessons = outline.filter(
    (item) =>
      getLessonChapterKey(item) === targetChapterKey && getLessonTopicKey(item) === targetTopicKey
  );
  const effectiveTopicLessons = topicLessons.length > 0 ? topicLessons : [lesson];

  const chapterLessons = outline.filter((item) => getLessonChapterKey(item) === targetChapterKey);
  const effectiveChapterLessons = chapterLessons.length > 0 ? chapterLessons : [lesson];

  switch (policy.scope) {
    case "same_lesson": {
      if (lessonState.canWatch) {
        return { canAccess: true, unlockedByPolicy: false };
      }
      return {
        canAccess: false,
        unlockedByPolicy: false,
        lockReason: "Mở khóa video bài giảng này để truy cập",
      };
    }

    case "any_video_in_topic": {
      if (lessonState.canWatch) {
        return { canAccess: true, unlockedByPolicy: false };
      }
      const hasPaidUnlockInTopic = effectiveTopicLessons.some((item) => {
        const st = toLessonState(item);
        return st.unlockedByCourse || st.unlockedByLesson;
      });
      if (hasPaidUnlockInTopic) {
        return { canAccess: true, unlockedByPolicy: true };
      }
      return {
        canAccess: false,
        unlockedByPolicy: false,
        lockReason: "Mở khóa ít nhất 1 video trong mục này",
      };
    }

    case "full_topic": {
      const allTopicUnlocked = effectiveTopicLessons.every(
        (item) => toLessonState(item).canWatch
      );
      if (allTopicUnlocked) {
        return { canAccess: true, unlockedByPolicy: !lessonState.canWatch };
      }
      return {
        canAccess: false,
        unlockedByPolicy: false,
        lockReason: "Mở khóa toàn bộ video trong chuyên đề này",
      };
    }

    case "full_chapter": {
      const allChapterUnlocked = effectiveChapterLessons.every(
        (item) => toLessonState(item).canWatch
      );
      if (allChapterUnlocked) {
        return { canAccess: true, unlockedByPolicy: !lessonState.canWatch };
      }
      return {
        canAccess: false,
        unlockedByPolicy: false,
        lockReason: "Mở khóa toàn bộ video trong chương này",
      };
    }

    case "full_course": {
      const allCourseUnlocked =
        Boolean(access?.unlockedCourse) ||
        outline.every((item) => toLessonState(item).canWatch);
      if (allCourseUnlocked) {
        return { canAccess: true, unlockedByPolicy: !lessonState.canWatch };
      }
      return {
        canAccess: false,
        unlockedByPolicy: false,
        lockReason: "Mở khóa toàn bộ khóa học để truy cập",
      };
    }
  }
}

/**
 * Pure helper: Human-readable host type without leaking raw URL.
 */
export function getVideoHostLabel(rawUrl: string, preferredType?: CourseVideoType): string {
  const url = String(rawUrl || "").trim().toLowerCase();
  if (!url) {
    return preferredType === "youtube"
      ? "YouTube"
      : preferredType === "cloudinary"
      ? "Cloudinary"
      : preferredType === "iframe"
      ? "Kho lưu trữ"
      : "Video MP4";
  }
  if (url.includes("drive.google.com") || url.includes("docs.google.com")) return "Kho lưu Drive";
  if (url.includes("youtube.com") || url.includes("youtu.be") || url.includes("youtube-nocookie.com")) {
    return "YouTube Protected";
  }
  if (url.includes("res.cloudinary.com")) return "Video nội bộ";
  if (url.includes("onedrive.live.com") || url.includes("sharepoint.com") || url.includes("1drv.ms")) {
    return "Kho lưu OneDrive";
  }
  if (url.includes("dropbox.com")) return "Kho lưu Dropbox";
  if (url.includes("mega.nz")) return "Kho lưu Mega";
  if (preferredType === "mp4" || /\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(url)) return "Video HD";
  return "Kho lưu nhúng";
}

/**
 * Pure helper: Masks an archive/video URL for Admin UI display so original link isn't leaked on screen.
 */
export function maskVideoUrlDisplay(rawUrl: string, preferredType?: CourseVideoType): string {
  const clean = String(rawUrl || "").trim();
  if (!clean) return "";
  const label = getVideoHostLabel(clean, preferredType);
  const suffix = clean.length > 6 ? clean.slice(-6) : "••••";
  return `Đã liên kết (${label}) • ••••••${suffix}`;
}

export function formatDurationClock(totalSeconds?: number, fallbackMinutes?: number): string {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || (Number(fallbackMinutes) || 0) * 60));
  if (sec <= 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function buildCourseShareUrl(courseId: string, lessonId?: string): string {
  const origin =
    typeof window !== "undefined" && !isNativeAndroid() && !/localhost|127\.0\.0\.1/.test(window.location.origin)
      ? window.location.origin
      : getApiBaseUrl() || "https://dk-test-v3.vercel.app";
  const base = `${origin.replace(/\/+$/, "")}/student/courses/${encodeURIComponent(courseId)}`;
  return lessonId ? `${base}?lesson=${encodeURIComponent(lessonId)}` : base;
}

/**
 * Probes exact video duration (seconds & minutes) directly in browser via native HTML5 <video preload="metadata"> for File or MP4/Cloudinary URLs.
 */
export async function probeClientVideoDuration(
  source: string | File
): Promise<{ durationSeconds: number; durationMinutes: number } | null> {
  if (typeof document === "undefined") return null;
  const isFile = typeof File !== "undefined" && source instanceof File;
  const rawUrl = isFile ? URL.createObjectURL(source) : String(source || "").trim();
  if (!rawUrl) return null;

  return new Promise((resolve) => {
    const video = document.createElement("video");
    let settled = false;
    const cleanup = () => {
      if (isFile) {
        try {
          URL.revokeObjectURL(rawUrl);
        } catch {}
      }
      video.removeAttribute("src");
      try {
        video.load();
      } catch {}
    };
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve(null);
      }
    }, 9000);

    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const sec = Math.round(Number(video.duration) || 0);
      cleanup();
      if (sec > 0 && isFinite(sec)) {
        resolve({ durationSeconds: sec, durationMinutes: Math.max(1, Math.round(sec / 60)) });
      } else {
        resolve(null);
      }
    };
    video.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve(null);
    };
    video.src = rawUrl;
  });
}

export async function probeVideoDurationApi(
  url: string
): Promise<{ durationSeconds: number; durationMinutes: number; title?: string; source?: string } | null> {
  const clean = String(url || "").trim();
  if (!clean) return null;
  try {
    const res = await api.post<{
      success: boolean;
      found: boolean;
      durationSeconds: number;
      durationMinutes: number;
      title?: string;
      source?: string;
    }>("/api/admin/courses/probe-video", { url: clean });
    const sec = Math.max(0, Math.round(Number(res?.durationSeconds) || 0));
    const cleanedTitle = cleanDetectedVideoTitle(res?.title);
    if (res?.found && (sec > 0 || Boolean(cleanedTitle))) {
      return {
        durationSeconds: sec,
        durationMinutes: sec > 0 ? Math.max(1, Math.round(sec / 60)) : 0,
        ...(cleanedTitle ? { title: cleanedTitle } : {}),
        source: res.source,
      };
    }
  } catch (err) {
    console.warn("[courseService] probeVideoDurationApi failed:", err);
  }
  return null;
}

/**
 * Pure helper: Parses a video URL (YouTube, Google Drive, MP4/Cloudinary, Archive Iframe) into protected embed config.
 * NOTE: YouTube embed URLs require referrerPolicy="strict-origin-when-cross-origin" (never no-referrer) to avoid Error 153.
 */
export const VIDEO_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export type VideoQualityValue =
  | "auto"
  | "hd2160"
  | "hd1440"
  | "hd1080"
  | "hd720"
  | "large"
  | "medium"
  | "small"
  | "tiny";

export interface VideoQualityOption {
  value: VideoQualityValue;
  label: string;
  shortLabel: string;
  badge?: string;
  maxWidth?: number;
}

export const CLOUDINARY_QUALITY_OPTIONS: VideoQualityOption[] = [
  { value: "auto", label: "Tự động (Gốc)", shortLabel: "Auto" },
  { value: "hd1080", label: "1080p", shortLabel: "1080p", badge: "HD", maxWidth: 1920 },
  { value: "hd720", label: "720p", shortLabel: "720p", badge: "HD", maxWidth: 1280 },
  { value: "large", label: "480p", shortLabel: "480p", maxWidth: 854 },
  { value: "medium", label: "360p", shortLabel: "360p", maxWidth: 640 },
];

export const DEFAULT_YOUTUBE_QUALITY_OPTIONS: VideoQualityOption[] = [
  { value: "auto", label: "Tự động", shortLabel: "Auto" },
  { value: "hd1080", label: "1080p", shortLabel: "1080p", badge: "HD" },
  { value: "hd720", label: "720p", shortLabel: "720p", badge: "HD" },
  { value: "large", label: "480p", shortLabel: "480p" },
  { value: "medium", label: "360p", shortLabel: "360p" },
  { value: "small", label: "240p", shortLabel: "240p" },
];

export function formatQualityLabel(quality: string): {
  value: VideoQualityValue;
  label: string;
  shortLabel: string;
  badge?: string;
} {
  switch (String(quality || "").toLowerCase()) {
    case "hd2160":
      return { value: "hd2160", label: "2160p", shortLabel: "4K", badge: "4K" };
    case "hd1440":
      return { value: "hd1440", label: "1440p", shortLabel: "2K", badge: "2K" };
    case "hd1080":
      return { value: "hd1080", label: "1080p", shortLabel: "1080p", badge: "HD" };
    case "hd720":
      return { value: "hd720", label: "720p", shortLabel: "720p", badge: "HD" };
    case "large":
      return { value: "large", label: "480p", shortLabel: "480p" };
    case "medium":
      return { value: "medium", label: "360p", shortLabel: "360p" };
    case "small":
      return { value: "small", label: "240p", shortLabel: "240p" };
    case "tiny":
      return { value: "tiny", label: "144p", shortLabel: "144p" };
    case "auto":
    case "default":
    default:
      return { value: "auto", label: "Tự động", shortLabel: "Auto" };
  }
}

export function isCloudinaryVideoUrl(rawUrl: string): boolean {
  return /^https?:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//i.test(String(rawUrl || "").trim());
}

/**
 * Pure helper: Builds a Cloudinary responsive video URL for the requested quality preset while preserving original URL when quality === "auto".
 */
export function buildCloudinaryQualityUrl(rawUrl: string, quality: VideoQualityValue): string {
  const clean = String(rawUrl || "").trim();
  if (!clean || quality === "auto" || !isCloudinaryVideoUrl(clean)) return clean;

  const opt = CLOUDINARY_QUALITY_OPTIONS.find((o) => o.value === quality);
  if (!opt?.maxWidth) return clean;

  const match = clean.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/)(.+)$/i);
  if (!match) return clean;
  const [, prefix, rest] = match;

  // Separate versioned tail (/v12345/folder/video.mp4) if present so width transform is injected cleanly before version/asset
  const parts = rest.split("/");
  const vIdx = parts.findIndex((p) => /^v\d+$/i.test(p));
  const newTx = `w_${opt.maxWidth},c_limit,q_auto`;
  const stripQualityTokens = (seg: string) =>
    seg
      .split(",")
      .filter((t) => !/^(?:w_|c_|q_)/i.test(t.trim()))
      .join(",");

  if (vIdx >= 0) {
    const preserved = parts.slice(0, vIdx).map(stripQualityTokens).filter(Boolean);
    return `${prefix}${[...preserved, newTx, ...parts.slice(vIdx)].join("/")}`;
  }
  if (parts.length > 1 && !/\./.test(parts[0])) {
    const assetTail = parts[parts.length - 1];
    const preserved = parts.slice(0, -1).map(stripQualityTokens).filter(Boolean);
    return `${prefix}${[...preserved, newTx, assetTail].join("/")}`;
  }
  return `${prefix}${newTx}/${rest}`;
}

export function parseVideoSource(
  rawUrl: string,
  preferredType?: CourseVideoType
): {
  kind: "youtube" | "iframe" | "video";
  embedUrl: string;
  youtubeId?: string;
  driveId?: string;
  isDrive?: boolean;
} {
  const url = String(rawUrl || "").trim();
  if (!url) return { kind: "video", embedUrl: "" };

  // YouTube watch / share / shorts / embed URLs -> embed with enablejsapi=1 + origin for Error 153 safety & custom player controls
  const ytId = extractYouTubeVideoId(url);
  if (ytId) {
    const origin =
      typeof window !== "undefined" && window.location?.origin && /^https?:\/\//i.test(window.location.origin)
        ? `&origin=${encodeURIComponent(window.location.origin)}`
        : "";
    return {
      kind: "youtube",
      youtubeId: ytId,
      embedUrl: `https://www.youtube.com/embed/${ytId}?enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1${origin}`,
    };
  }

  // Google Drive links (/file/d/ID/..., /file/u/0/d/ID/..., open?id=ID, uc?id=ID) -> /preview?rm=minimal
  const driveId = extractGoogleDriveFileId(url);
  if (driveId) {
    return {
      kind: "iframe",
      driveId,
      isDrive: true,
      embedUrl: `https://drive.google.com/file/d/${driveId}/preview?rm=minimal`,
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

export interface CourseTotalCostSummary {
  mode: CourseAccessMode;
  totalFullCourseCostVnd: number;
  paidLessonsSumVnd: number;
  coursePackagePriceVnd: number;
  excludedVipLessonsSumVnd: number;
  excludedVipLessonsCount: number;
  paidLessonsCount: number;
  freeLessonsCount: number;
  comboSavingsVnd: number;
}

/**
 * Pure helper: Computes the total amount a student must spend to unlock the entire course
 * across all 3 monetization modes (free, per_video, paid with unlock_all_videos or unlock_course_only).
 */
export function computeCourseTotalCostSummary(
  course: Pick<
    Course,
    "accessMode" | "priceVnd" | "freePreviewCount" | "unlockFullPolicy" | "lessonOutline" | "totalPaidLessonsPriceVnd" | "totalFullCourseCostVnd"
  >,
  lessonsOverride?: Array<
    Pick<CourseLesson | CourseLessonOutlineItem, "accessType" | "order" | "priceVnd" | "includedInCourseUnlock">
  >
): CourseTotalCostSummary {
  const mode = resolveCourseAccessMode(course);
  const coursePackagePriceVnd = mode === "paid" ? Math.max(0, Math.floor(Number(course.priceVnd) || 0)) : 0;
  const sourceLessons = lessonsOverride ?? course.lessonOutline ?? [];

  let freeLessonsCount = 0;
  let paidLessonsCount = 0;
  let paidLessonsSumVnd = 0;
  let excludedVipLessonsSumVnd = 0;
  let excludedVipLessonsCount = 0;

  sourceLessons.forEach((l, idx) => {
    const effectiveOrder = typeof l.order === "number" ? l.order : idx;
    const isFree = isLessonEffectivelyFree(
      { accessMode: mode, priceVnd: coursePackagePriceVnd, freePreviewCount: course.freePreviewCount || 0 },
      { accessType: l.accessType || "inherit_first_n", order: effectiveOrder }
    );
    if (isFree) {
      freeLessonsCount++;
      return;
    }
    paidLessonsCount++;
    const p = Math.max(0, Math.floor(Number(l.priceVnd) || 0));
    paidLessonsSumVnd += p;
    if (mode === "paid" && course.unlockFullPolicy === "unlock_course_only" && l.includedInCourseUnlock === false) {
      excludedVipLessonsCount++;
      excludedVipLessonsSumVnd += p;
    }
  });

  // Fallback to persisted totals when outline is not provided
  if (sourceLessons.length === 0) {
    paidLessonsSumVnd = Math.max(0, Math.floor(Number(course.totalPaidLessonsPriceVnd) || 0));
  }

  let totalFullCourseCostVnd = 0;
  if (mode === "free") {
    totalFullCourseCostVnd = 0;
  } else if (mode === "per_video") {
    totalFullCourseCostVnd = paidLessonsSumVnd;
  } else {
    totalFullCourseCostVnd = coursePackagePriceVnd + excludedVipLessonsSumVnd;
  }

  const comboSavingsVnd =
    mode === "paid" && paidLessonsSumVnd > totalFullCourseCostVnd
      ? paidLessonsSumVnd - totalFullCourseCostVnd
      : 0;

  return {
    mode,
    totalFullCourseCostVnd,
    paidLessonsSumVnd,
    coursePackagePriceVnd,
    excludedVipLessonsSumVnd,
    excludedVipLessonsCount,
    paidLessonsCount,
    freeLessonsCount,
    comboSavingsVnd,
  };
}

/**
 * Builds sanitized public lessonOutline (ZERO videoUrl or material URLs) and summary stats for courses/{courseId}.
 */
export function buildCourseOutlineAndStats(
  course: Pick<Course, "accessMode" | "priceVnd" | "freePreviewCount"> & {
    unlockFullPolicy?: Course["unlockFullPolicy"];
  },
  lessons: CourseLesson[]
): {
  orderedLessons: CourseLesson[];
  lessonOutline: CourseLessonOutlineItem[];
  lessonCount: number;
  freeLessonCount: number;
  paidLessonCount: number;
  minPaidLessonPriceVnd: number;
  totalPaidLessonsPriceVnd: number;
  totalFullCourseCostVnd: number;
  totalDurationMinutes: number;
  totalDurationSeconds: number;
} {
  const orderedLessons = [...lessons]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((l, idx) => {
      const durationSeconds = Math.max(0, Math.floor(Number(l.durationSeconds) || 0));
      const computedMinutes =
        durationSeconds > 0
          ? Math.max(1, Math.round(durationSeconds / 60))
          : Math.max(0, Math.floor(Number(l.durationMinutes) || 0));
      return {
        ...l,
        order: idx,
        ...(durationSeconds > 0 ? { durationSeconds } : {}),
        durationMinutes: computedMinutes,
        priceVnd: Math.max(0, Math.floor(Number(l.priceVnd) || 0)),
        includedInCourseUnlock: l.includedInCourseUnlock !== false,
        accessType: l.accessType || "inherit_first_n",
      };
    });

  let freeLessonCount = 0;
  let paidLessonCount = 0;
  let totalDurationMinutes = 0;
  let totalDurationSeconds = 0;
  let minPaidPrice = Infinity;

  const lessonOutline: CourseLessonOutlineItem[] = orderedLessons.map((l) => {
    const isFreeEffective = isLessonEffectivelyFree(course, l);
    if (isFreeEffective) {
      freeLessonCount++;
    } else {
      paidLessonCount++;
      if ((l.priceVnd || 0) > 0 && l.priceVnd < minPaidPrice) {
        minPaidPrice = l.priceVnd;
      }
    }
    const sec = Math.max(0, Math.floor(Number(l.durationSeconds) || (Number(l.durationMinutes) || 0) * 60));
    totalDurationSeconds += sec;
    totalDurationMinutes += Math.max(0, Math.floor(Number(l.durationMinutes) || 0));

    const materialItems: CourseOutlineMaterialItem[] = (l.materials || []).map((m) => ({
      id: m.id,
      label: m.label || m.fileName || "Tài liệu",
      type: m.type || "file",
    }));

    return {
      id: l.id,
      chapterId: l.chapterId || null,
      ...(l.topicTitle?.trim() ? { topicTitle: l.topicTitle.trim() } : {}),
      title: l.title,
      description: l.description || "",
      order: l.order,
      durationMinutes: Math.max(0, Math.floor(Number(l.durationMinutes) || 0)),
      ...(l.durationSeconds && l.durationSeconds > 0 ? { durationSeconds: l.durationSeconds } : {}),
      videoType: l.videoType || "youtube",
      videoHostLabel: getVideoHostLabel(l.videoUrl, l.videoType),
      accessType: l.accessType,
      isFreeEffective,
      priceVnd: l.priceVnd || 0,
      includedInCourseUnlock: l.includedInCourseUnlock,
      ...(l.linkedExamId ? { linkedExamId: l.linkedExamId } : {}),
      hasMaterials: materialItems.length > 0,
      materialsCount: materialItems.length,
      ...(materialItems.length > 0 ? { materialItems } : {}),
    };
  });

  if (totalDurationSeconds > 0) {
    totalDurationMinutes = Math.max(1, Math.round(totalDurationSeconds / 60));
  }

  const costSummary = computeCourseTotalCostSummary(
    {
      accessMode: course.accessMode,
      priceVnd: course.priceVnd,
      freePreviewCount: course.freePreviewCount,
      unlockFullPolicy: course.unlockFullPolicy || "unlock_all_videos",
      lessonOutline,
    },
    orderedLessons
  );

  return {
    orderedLessons,
    lessonOutline,
    lessonCount: orderedLessons.length,
    freeLessonCount,
    paidLessonCount,
    minPaidLessonPriceVnd: Number.isFinite(minPaidPrice) ? minPaidPrice : 0,
    totalPaidLessonsPriceVnd: costSummary.paidLessonsSumVnd,
    totalFullCourseCostVnd: costSummary.totalFullCourseCostVnd,
    totalDurationMinutes,
    totalDurationSeconds,
  };
}

export interface CourseHierarchyTopicMaterial {
  id: string;
  label: string;
  type: "link" | "file";
  lessonId: string;
  lessonTitle: string;
  canAccess: boolean;
  lockReason?: string;
  unlockedByPolicy?: boolean;
}

export interface CourseHierarchyTopicExam {
  id: string;
  title: string;
  lessonId: string;
  lessonTitle: string;
  linkedExamId: string;
  canAccess: boolean;
  lockReason?: string;
  unlockedByPolicy?: boolean;
}

export interface CourseHierarchyTopic {
  id: string;
  title: string;
  lessons: CourseLessonOutlineItem[];
  materials: CourseHierarchyTopicMaterial[];
  exams: CourseHierarchyTopicExam[];
  videoCount: number;
  materialsCount: number;
  examsCount: number;
  completedCount: number;
  progressPct: number;
}

export interface CourseHierarchyChapter {
  id: string;
  title: string;
  groupTitle: string;
  lessonCount: number;
  topics: CourseHierarchyTopic[];
}

export interface CourseHierarchyGroup {
  id: string;
  title: string;
  chapters: CourseHierarchyChapter[];
  totalLessons: number;
}

export function getCourseGuideStorageKey(
  uid?: string | null,
  scope: "courses_tab" | "course_player" = "courses_tab"
): string {
  const cleanUid = String(uid || "guest").trim() || "guest";
  return `dktest_course_guide_seen_v1_${scope}_${cleanUid}`;
}

/**
 * Pure helper: Determines whether a course detail route is in focused Video Detail (Theater) mode.
 * Opening `/student/courses/:courseId` without a specific lesson/watch param shows the classic `.5`
 * course overview inside StudentLayout; clicking a specific video switches into Theater mode.
 */
export function isCoursePlayerTheaterUrl(pathname: string, search = ""): boolean {
  if (!/^\/(?:student\/)?courses\/[^/]+$/.test(pathname)) return false;
  const params = new URLSearchParams(search || "");
  return Boolean(params.get("lesson") || params.get("video") || params.get("watch") === "1");
}

/**
 * Pure helper: Builds 3-level hierarchical accordion tree (Group -> Chapter -> Topic -> Video / Tài liệu / Bài kiểm tra tabs)
 * matching student syllabus UX with progress tracking & zero URL leaks.
 */
export function buildCourseHierarchy(
  course: Course,
  access: CourseAccessInfo | null,
  watchedIds: string[],
  watchedSecondsMap?: Record<string, number>
): CourseHierarchyGroup[] {
  const watchedSet = new Set(watchedIds);
  const outline = [...(course.lessonOutline || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const chapters = [...(course.chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const defaultGroup = course.subject?.trim() || "Nội dung khóa học";

  const chapterList: Array<{ id: string; title: string; groupTitle: string; items: CourseLessonOutlineItem[] }> = [];
  const assignedIds = new Set<string>();

  for (const ch of chapters) {
    const items = outline.filter((l) => l.chapterId === ch.id);
    if (items.length > 0) {
      items.forEach((l) => assignedIds.add(l.id));
      chapterList.push({
        id: ch.id,
        title: ch.title,
        groupTitle: ch.groupTitle?.trim() || defaultGroup,
        items,
      });
    }
  }

  const orphanItems = outline.filter((l) => !l.chapterId || !assignedIds.has(l.id));
  if (orphanItems.length > 0) {
    chapterList.push({
      id: "__other__",
      title: chapterList.length > 0 ? "Chuyên đề bổ sung" : "Danh sách bài giảng",
      groupTitle: defaultGroup,
      items: orphanItems,
    });
  }

  const builtChapters: CourseHierarchyChapter[] = chapterList.map((ch) => {
    const topicBuckets = new Map<string, CourseLessonOutlineItem[]>();
    for (const item of ch.items) {
      const topicKey = item.topicTitle?.trim() || `__single_${item.id}`;
      const existing = topicBuckets.get(topicKey) || [];
      existing.push(item);
      topicBuckets.set(topicKey, existing);
    }

    const topics: CourseHierarchyTopic[] = [];
    for (const [key, items] of topicBuckets.entries()) {
      const title = key.startsWith("__single_") ? items[0].title : key;
      const materials: CourseHierarchyTopicMaterial[] = [];
      const exams: CourseHierarchyTopicExam[] = [];
      let completedCount = 0;

      let totalSec = 0;
      let watchedSec = 0;
      for (const lesson of items) {
        const lessonSec = Math.max(60, Number(lesson.durationSeconds) || (Number(lesson.durationMinutes) || 0) * 60);
        totalSec += lessonSec;
        if (watchedSet.has(lesson.id)) {
          completedCount++;
          watchedSec += lessonSec;
        } else if (watchedSecondsMap?.[lesson.id]) {
          watchedSec += Math.min(lessonSec, Math.max(0, Number(watchedSecondsMap[lesson.id]) || 0));
        }
        const matAccess = computeCourseResourceAccess(course, lesson, access, "material");
        const examAccess = computeCourseResourceAccess(course, lesson, access, "exam");
        if (lesson.linkedExamId) {
          exams.push({
            id: `exam_${lesson.id}_${lesson.linkedExamId}`,
            title: `Bài kiểm tra: ${lesson.title}`,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            linkedExamId: lesson.linkedExamId,
            canAccess: examAccess.canAccess,
            lockReason: examAccess.lockReason,
            unlockedByPolicy: examAccess.unlockedByPolicy,
          });
        }
        for (const m of lesson.materialItems || []) {
          materials.push({
            id: `${lesson.id}_${m.id}`,
            label: m.label,
            type: m.type,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            canAccess: matAccess.canAccess,
            lockReason: matAccess.lockReason,
            unlockedByPolicy: matAccess.unlockedByPolicy,
          });
        }
        // Backward compatibility for older outline items without materialItems
        if ((!lesson.materialItems || lesson.materialItems.length === 0) && lesson.hasMaterials) {
          const fallbackCount = lesson.materialsCount || 1;
          for (let i = 0; i < fallbackCount; i++) {
            materials.push({
              id: `${lesson.id}_mat_${i}`,
              label: `Tài liệu bài ${lesson.order + 1}${fallbackCount > 1 ? ` (#${i + 1})` : ""}`,
              type: "file",
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              canAccess: matAccess.canAccess,
              lockReason: matAccess.lockReason,
              unlockedByPolicy: matAccess.unlockedByPolicy,
            });
          }
        }
      }

      const progressPct =
        watchedSecondsMap && totalSec > 0
          ? Math.min(100, Math.round((watchedSec / totalSec) * 100))
          : items.length > 0
          ? Math.round((completedCount / items.length) * 100)
          : 0;
      topics.push({
        id: `${ch.id}__${key}`,
        title,
        lessons: items,
        materials,
        exams,
        videoCount: items.length,
        materialsCount: materials.length,
        examsCount: exams.length,
        completedCount,
        progressPct,
      });
    }

    return {
      id: ch.id,
      title: ch.title,
      groupTitle: ch.groupTitle,
      lessonCount: ch.items.length,
      topics,
    };
  });

  const groupMap = new Map<string, CourseHierarchyChapter[]>();
  for (const ch of builtChapters) {
    const arr = groupMap.get(ch.groupTitle) || [];
    arr.push(ch);
    groupMap.set(ch.groupTitle, arr);
  }

  return Array.from(groupMap.entries()).map(([title, chaps], idx) => ({
    id: `grp_${idx}_${title}`,
    title,
    chapters: chaps,
    totalLessons: chaps.reduce((sum, c) => sum + c.lessonCount, 0),
  }));
}

export async function getPublishedCourses(forceRefresh = false): Promise<Course[]> {
  const cacheKey = "query:courses:published";
  if (!forceRefresh) {
    const memCached = FirestoreCache.get<Course[]>(cacheKey);
    if (memCached) return memCached;

    const sessCached = readSessionCache<Course[]>(COURSES_SESSION_KEY, PUBLIC_CACHE_TTL_MS);
    if (sessCached) {
      FirestoreCache.set(cacheKey, sessCached, PUBLIC_CACHE_TTL_MS);
      sessCached.forEach((c) => {
        FirestoreCache.set(`doc:courses:${c.id}`, c, PUBLIC_CACHE_TTL_MS);
      });
      return sessCached;
    }
  }

  return FirestoreCache.dedupe(forceRefresh ? `${cacheKey}:force` : cacheKey, async () => {
    let items: Course[] = [];
    try {
      const q = query(
        collection(db, COURSES_COLLECTION),
        where("status", "==", "published"),
        orderBy("updatedAt", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);
      items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Course));
    } catch {
      const q = query(collection(db, COURSES_COLLECTION), where("status", "==", "published"), limit(20));
      const snap = await getDocs(q);
      items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Course));
      items.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    }

    FirestoreCache.set(cacheKey, items, PUBLIC_CACHE_TTL_MS);
    writeSessionCache(COURSES_SESSION_KEY, items);
    items.forEach((c) => {
      FirestoreCache.set(`doc:courses:${c.id}`, c, PUBLIC_CACHE_TTL_MS);
      writeSessionCache(`${COURSE_DOC_SESSION_PREFIX}${c.id}`, c);
    });
    return items;
  });
}

export async function getAdminCoursesList(forceRefresh = false): Promise<Course[]> {
  const cacheKey = "query:courses:admin";
  if (!forceRefresh) {
    const cached = FirestoreCache.get<Course[]>(cacheKey);
    if (cached) return cached;
  }

  return FirestoreCache.dedupe(forceRefresh ? `${cacheKey}:force` : cacheKey, async () => {
    const snap = await getDocs(query(collection(db, COURSES_COLLECTION), limit(50)));
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Course));
    items.sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
    );

    FirestoreCache.set(cacheKey, items, 90 * 1000);
    return items;
  });
}

export async function getCourse(courseId: string, forceRefresh = false): Promise<Course | null> {
  if (!courseId) return null;
  const cacheKey = `doc:courses:${courseId}`;
  const sessionKey = `${COURSE_DOC_SESSION_PREFIX}${courseId}`;

  if (!forceRefresh) {
    const cached = FirestoreCache.get<Course>(cacheKey);
    if (cached) return cached;

    const sess = readSessionCache<Course>(sessionKey, PUBLIC_CACHE_TTL_MS);
    if (sess) {
      FirestoreCache.set(cacheKey, sess, PUBLIC_CACHE_TTL_MS);
      return sess;
    }
  }

  return FirestoreCache.dedupe(forceRefresh ? `${cacheKey}:force` : cacheKey, async () => {
    const snap = await getDoc(doc(db, COURSES_COLLECTION, courseId));
    if (!snap.exists()) return null;
    const course = { id: snap.id, ...(snap.data() as any) } as Course;
    FirestoreCache.set(cacheKey, course, PUBLIC_CACHE_TTL_MS);
    writeSessionCache(sessionKey, course);
    return course;
  });
}

export async function getCourseLessonsForAdmin(courseId: string): Promise<CourseLesson[]> {
  const snap = await getDocs(collection(db, COURSES_COLLECTION, courseId, "lessons"));
  const lessons = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as CourseLesson));
  lessons.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return lessons;
}

export async function getAuthorizedCourseLesson(courseId: string, lessonId: string): Promise<CourseLesson> {
  const memKey = `doc:course_lesson:${courseId}:${lessonId}`;
  const cached = FirestoreCache.get<CourseLesson>(memKey);
  if (cached) return cached;

  return FirestoreCache.dedupe(memKey, async () => {
    try {
      const snap = await getDoc(doc(db, COURSES_COLLECTION, courseId, "lessons", lessonId));
      if (snap.exists()) {
        const lesson = { id: snap.id, ...(snap.data() as any) } as CourseLesson;
        FirestoreCache.set(memKey, lesson, LESSON_MEMORY_CACHE_TTL_MS);
        return lesson;
      }
    } catch (fsErr) {
      console.warn("[courseService] Direct lesson read fallback to API:", fsErr);
    }

    const res = await api.get<{ success: boolean; lesson: CourseLesson }>(
      `/api/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/content`
    );
    if (!res?.lesson) {
      throw new Error("Không thể tải nội dung bài giảng.");
    }
    FirestoreCache.set(memKey, res.lesson, LESSON_MEMORY_CACHE_TTL_MS);
    return res.lesson;
  });
}

export async function getAuthorizedLessonStreamUrl(
  courseId: string,
  lessonId: string
): Promise<string | null> {
  if (!courseId || !lessonId) return null;
  const memKey = `stream:course_lesson:${courseId}:${lessonId}`;
  const cached = FirestoreCache.get<string | null>(memKey);
  if (cached !== null && cached !== undefined) return cached || null;

  try {
    const res = await api.get<{ success: boolean; streamUrl?: string | null }>(
      `/api/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/stream`,
      { timeoutMs: 2500 }
    );
    const url = typeof res?.streamUrl === "string" && /^https?:\/\//i.test(res.streamUrl) ? res.streamUrl : "";
    FirestoreCache.set(memKey, url, url ? 15 * 60 * 1000 : 2 * 60 * 1000);
    return url || null;
  } catch {
    FirestoreCache.set(memKey, "", 2 * 60 * 1000);
    return null;
  }
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
  const requestedMode = params.courseData.accessMode;
  const cleanAccessMode: CourseAccessMode =
    requestedMode === "per_video"
      ? "per_video"
      : requestedMode === "paid" || cleanPrice > 0
      ? cleanPrice > 0
        ? "paid"
        : "per_video"
      : "free";

  const normalizedBase = {
    ...params.courseData,
    accessMode: cleanAccessMode,
    priceVnd: cleanAccessMode === "paid" ? cleanPrice : 0,
    defaultLessonPriceVnd: Math.max(0, Math.floor(Number(params.courseData.defaultLessonPriceVnd) || 0)),
    originalPriceVnd:
      cleanAccessMode === "paid" && params.courseData.originalPriceVnd
        ? Math.max(0, Math.floor(Number(params.courseData.originalPriceVnd) || 0))
        : undefined,
    freePreviewCount: Math.max(0, Math.floor(Number(params.courseData.freePreviewCount) || 0)),
    unlockFullPolicy: params.courseData.unlockFullPolicy || "unlock_all_videos",
    allowSingleLessonPurchase:
      cleanAccessMode === "per_video" ? true : Boolean(params.courseData.allowSingleLessonPurchase),
    salesEnabled: params.courseData.salesEnabled !== false,
    chapters: (params.courseData.chapters || []).map((c: CourseChapter, idx: number) => ({
      ...c,
      ...(c.groupTitle?.trim() ? { groupTitle: c.groupTitle.trim() } : {}),
      order: idx,
    })),
  };

  const {
    orderedLessons,
    lessonOutline,
    lessonCount,
    freeLessonCount,
    paidLessonCount,
    minPaidLessonPriceVnd,
    totalPaidLessonsPriceVnd,
    totalFullCourseCostVnd,
    totalDurationMinutes,
    totalDurationSeconds,
  } = buildCourseOutlineAndStats(normalizedBase, params.lessons);

  const courseDoc: Record<string, any> = {
    ...normalizedBase,
    id: courseId,
    lessonOutline,
    lessonCount,
    freeLessonCount,
    paidLessonCount,
    minPaidLessonPriceVnd,
    totalPaidLessonsPriceVnd,
    totalFullCourseCostVnd,
    totalDurationMinutes,
    totalDurationSeconds,
    updatedAt: now,
    ...(isNew ? { createdAt: now } : {}),
  };

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
    if (!cleanLesson.topicTitle?.trim()) delete cleanLesson.topicTitle;
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
  FirestoreCache.invalidatePrefix(`doc:course_lesson:${courseId}:`);
  clearCoursesSessionCache(courseId);
  return courseId;
}

export const MAX_COURSE_PURCHASES_PAGE_SIZE = 2;

export async function getAdminCoursePurchasesApi(options?: {
  courseId?: string;
  limit?: number;
  cursor?: string | null;
  scope?: "all" | "course" | "lesson";
  status?: "all" | "active" | "revoked";
  force?: boolean;
}): Promise<CoursePurchasesPageResult> {
  const pageSize = Math.min(
    MAX_COURSE_PURCHASES_PAGE_SIZE,
    Math.max(1, Math.floor(Number(options?.limit) || MAX_COURSE_PURCHASES_PAGE_SIZE))
  );
  const cleanCourseId = options?.courseId && options.courseId !== "all" ? options.courseId.trim() : "";
  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(pageSize));
  if (options?.cursor) searchParams.set("cursor", options.cursor);
  if (options?.scope && options.scope !== "all") searchParams.set("scope", options.scope);
  if (options?.status && options.status !== "all") searchParams.set("status", options.status);
  if (options?.force) searchParams.set("force", "true");

  const endpoint = cleanCourseId
    ? `/api/admin/courses/${encodeURIComponent(cleanCourseId)}/purchases?${searchParams.toString()}`
    : `/api/admin/courses/purchases?${searchParams.toString()}`;

  try {
    const res = await api.get<{
      success: boolean;
      items: CoursePurchaseDetailItem[];
      nextCursor: string | null;
      hasMore: boolean;
      pageLimit?: number;
    }>(endpoint);
    if (Array.isArray(res?.items)) {
      return {
        items: res.items.slice(0, MAX_COURSE_PURCHASES_PAGE_SIZE),
        nextCursor: res.nextCursor || null,
        hasMore: Boolean(res.hasMore),
        pageLimit: Math.min(MAX_COURSE_PURCHASES_PAGE_SIZE, res.pageLimit || pageSize),
      };
    }
  } catch (err) {
    console.warn("[courseService] API course purchases failed, falling back to direct Firestore query:", err);
  }

  // Direct Firestore fallback (strictly bounded to max 2 docs per request)
  try {
    const col = collection(db, "course_entitlements");
    const constraints: any[] = [];
    if (cleanCourseId) constraints.push(where("courseId", "==", cleanCourseId));
    constraints.push(orderBy("grantedAt", "desc"));
    if (options?.cursor) constraints.push(startAfter(options.cursor));
    constraints.push(limit(pageSize));

    const snap = await getDocs(query(col, ...constraints));
    const rawItems = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as CourseEntitlement));
    const filtered = rawItems.filter((ent) => {
      if (options?.scope && options.scope !== "all") {
        const entScope = ent.scope || (ent.lessonId ? "lesson" : "course");
        if (entScope !== options.scope) return false;
      }
      if (options?.status && options.status !== "all" && ent.status !== options.status) {
        return false;
      }
      return true;
    });

    const lastGrantedAt =
      snap.docs.length > 0 ? String(snap.docs[snap.docs.length - 1].data().grantedAt || "") : null;

    return {
      items: filtered.map((ent) => ({
        id: ent.id,
        uid: ent.uid,
        studentName: ent.studentNameSnapshot || ent.uid,
        studentClass: ent.studentClassSnapshot || "",
        studentEmail: ent.studentEmailSnapshot || "",
        courseId: ent.courseId,
        courseTitle: ent.courseTitleSnapshot || ent.courseId,
        scope: ent.scope || (ent.lessonId ? "lesson" : "course"),
        lessonId: ent.lessonId || null,
        lessonTitle: ent.lessonTitleSnapshot || undefined,
        status: ent.status || "active",
        source: ent.source || "purchase",
        pricePaidVnd: Math.max(0, Number(ent.pricePaidVnd) || 0),
        transactionId: ent.transactionId,
        grantedAt: String(ent.grantedAt || ""),
        grantedBy: ent.grantedBy,
      })),
      nextCursor: snap.size === pageSize && lastGrantedAt ? lastGrantedAt : null,
      hasMore: snap.size === pageSize && Boolean(lastGrantedAt),
      pageLimit: pageSize,
    };
  } catch (err) {
    console.warn("[courseService] Direct course purchases fallback failed:", err);
    return { items: [], nextCursor: null, hasMore: false, pageLimit: pageSize };
  }
}

export async function deleteCourse(courseId: string): Promise<void> {
  const lessonsSnap = await getDocs(collection(db, COURSES_COLLECTION, courseId, "lessons"));
  const batch = writeBatch(db);
  lessonsSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, COURSES_COLLECTION, courseId));
  await batch.commit();

  FirestoreCache.invalidatePrefix("query:courses");
  FirestoreCache.invalidate(`doc:courses:${courseId}`);
  FirestoreCache.invalidatePrefix(`doc:course_lesson:${courseId}:`);
  clearCoursesSessionCache(courseId);
}
