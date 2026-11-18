import {
  buildCourseOutlineAndStats,
  formatDurationClock,
  getAdminCoursesList,
  getCourse,
  getCourseLessonsForAdmin,
  probeClientVideoDuration,
  probeVideoDurationApi,
  resolveCourseAccessMode,
  saveCourseWithLessons,
} from "./courseService";
import { inferCourseVideoType } from "../utils/videoSourceHelper";
import type {
  Course,
  CourseAccessMode,
  CourseChapter,
  CourseLesson,
  CourseLessonAccessType,
  CourseLessonMaterial,
  CourseStatus,
  CourseUnlockFullPolicy,
  CourseVideoType,
} from "../types";

export interface MutableCourseState {
  courseId?: string;
  title: string;
  code: string;
  description: string;
  thumbnailUrl: string;
  subject: string;
  gradeCategory: string;
  instructorName: string;
  status: CourseStatus;
  isFeatured: boolean;
  accessMode: CourseAccessMode;
  priceVnd: number;
  originalPriceVnd: number;
  defaultLessonPriceVnd: number;
  salesEnabled: boolean;
  unlockFullPolicy: CourseUnlockFullPolicy;
  freePreviewCount: number;
  allowSingleLessonPurchase: boolean;
  chapters: CourseChapter[];
  lessons: CourseLesson[];
  deletedLessonIds: string[];
  selectedLessonId?: string | null;
}

export function generateCourseItemId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function probeDurationBestEffort(
  rawUrl: string,
  videoType?: CourseVideoType
): Promise<{ durationSeconds: number; durationMinutes: number } | null> {
  const url = String(rawUrl || "").trim();
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) return null;

  const lower = url.toLowerCase();
  const isDirectMedia =
    videoType === "mp4" ||
    videoType === "cloudinary" ||
    /\.(mp4|webm|m4v|mov)(\?|#|$)/.test(lower);

  if (isDirectMedia) {
    try {
      const clientRes = await probeClientVideoDuration(url);
      if (clientRes && clientRes.durationSeconds > 0) return clientRes;
    } catch {}
  }

  try {
    const serverRes = await probeVideoDurationApi(url);
    if (serverRes && serverRes.durationSeconds > 0) {
      return {
        durationSeconds: serverRes.durationSeconds,
        durationMinutes: serverRes.durationMinutes,
      };
    }
  } catch {}

  return null;
}

function normalizeMaterialsInput(raw: any): CourseLessonMaterial[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && (m.url || m.label))
    .map((m) => ({
      id: String(m.id || generateCourseItemId("mat")),
      label: String(m.label || m.fileName || "Tài liệu tham khảo").trim(),
      type: m.type === "file" ? "file" : "link",
      url: String(m.url || "").trim(),
      ...(m.fileName ? { fileName: String(m.fileName) } : {}),
    }));
}

function resolveOrCreateChapter(
  chapters: CourseChapter[],
  chapterId?: string | null,
  chapterTitle?: string | null,
  groupTitle?: string | null
): { chapters: CourseChapter[]; resolvedChapterId: string | null; createdChapter?: CourseChapter } {
  const nextChapters = [...chapters];
  if (chapterId) {
    const byId = nextChapters.find((c) => c.id === chapterId);
    if (byId) return { chapters: nextChapters, resolvedChapterId: byId.id };
  }
  const cleanTitle = String(chapterTitle || "").trim();
  if (!cleanTitle) {
    return { chapters: nextChapters, resolvedChapterId: chapterId ?? null };
  }
  const lower = cleanTitle.toLowerCase();
  const byTitle =
    nextChapters.find((c) => c.title.trim().toLowerCase() === lower) ||
    nextChapters.find((c) => c.title.trim().toLowerCase().includes(lower));
  if (byTitle) {
    return { chapters: nextChapters, resolvedChapterId: byTitle.id };
  }
  const created: CourseChapter = {
    id: generateCourseItemId("ch"),
    title: cleanTitle,
    ...(groupTitle && String(groupTitle).trim() ? { groupTitle: String(groupTitle).trim() } : {}),
    order: nextChapters.length,
  };
  nextChapters.push(created);
  return { chapters: nextChapters, resolvedChapterId: created.id, createdChapter: created };
}

function resolveTargetLesson(
  lessons: CourseLesson[],
  params: Record<string, any>,
  selectedLessonId?: string | null
): CourseLesson | null {
  const ordered = [...lessons].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (ordered.length === 0) return null;

  const rawId = params.lessonId || params.id;
  if (rawId && rawId !== "__selected__") {
    const byId = ordered.find((l) => l.id === rawId);
    if (byId) return byId;
  }

  if (params.lessonNumber !== undefined && params.lessonNumber !== null) {
    const idx = Math.max(0, Math.floor(Number(params.lessonNumber)) - 1);
    if (ordered[idx]) return ordered[idx];
  }

  if (params.lessonOrder !== undefined && params.lessonOrder !== null) {
    const rawOrder = Math.floor(Number(params.lessonOrder));
    const byExact = ordered.find((l) => l.order === rawOrder) || ordered[rawOrder];
    if (byExact) return byExact;
  }

  const rawTitle = String(params.lessonTitle || params.targetTitle || params.query || "").trim();
  if (rawTitle) {
    const lower = rawTitle.toLowerCase();
    const exact = ordered.find((l) => l.title.trim().toLowerCase() === lower);
    if (exact) return exact;
    const partial = ordered.find((l) => l.title.trim().toLowerCase().includes(lower));
    if (partial) return partial;
  }

  if (selectedLessonId) {
    const bySel = ordered.find((l) => l.id === selectedLessonId);
    if (bySel) return bySel;
  }

  return null;
}

export async function applyCourseOperationToState(
  state: MutableCourseState,
  actionType: string,
  params: Record<string, any>
): Promise<{
  nextState: MutableCourseState;
  message: string;
  data: Record<string, any>;
}> {
  const next: MutableCourseState = {
    ...state,
    chapters: [...state.chapters],
    lessons: [...state.lessons].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    deletedLessonIds: [...state.deletedLessonIds],
  };

  if (actionType === "UPDATE_COURSE") {
    const u = params.updates && typeof params.updates === "object" ? params.updates : params;
    if (u.title !== undefined) next.title = String(u.title).trim() || next.title;
    if (u.code !== undefined) next.code = String(u.code).trim().toUpperCase();
    if (u.description !== undefined) next.description = String(u.description);
    if (u.thumbnailUrl !== undefined) next.thumbnailUrl = String(u.thumbnailUrl).trim();
    if (u.subject !== undefined) next.subject = String(u.subject).trim();
    if (u.gradeCategory !== undefined) next.gradeCategory = String(u.gradeCategory).trim();
    if (u.instructorName !== undefined) next.instructorName = String(u.instructorName).trim();
    if (u.status === "draft" || u.status === "published" || u.status === "archived") {
      next.status = u.status;
    }
    if (u.isFeatured !== undefined) next.isFeatured = Boolean(u.isFeatured);
    if (u.accessMode === "free" || u.accessMode === "per_video" || u.accessMode === "paid") {
      next.accessMode = u.accessMode;
      if (u.accessMode === "per_video") next.allowSingleLessonPurchase = true;
    }
    if (u.priceVnd !== undefined) next.priceVnd = Math.max(0, Math.floor(Number(u.priceVnd) || 0));
    if (u.originalPriceVnd !== undefined) {
      next.originalPriceVnd = Math.max(0, Math.floor(Number(u.originalPriceVnd) || 0));
    }
    if (u.defaultLessonPriceVnd !== undefined) {
      next.defaultLessonPriceVnd = Math.max(0, Math.floor(Number(u.defaultLessonPriceVnd) || 0));
    }
    if (u.freePreviewCount !== undefined) {
      next.freePreviewCount = Math.max(0, Math.floor(Number(u.freePreviewCount) || 0));
    }
    if (u.unlockFullPolicy === "unlock_all_videos" || u.unlockFullPolicy === "unlock_course_only") {
      next.unlockFullPolicy = u.unlockFullPolicy;
    }
    if (u.allowSingleLessonPurchase !== undefined) {
      next.allowSingleLessonPurchase = Boolean(u.allowSingleLessonPurchase);
    }
    if (u.salesEnabled !== undefined) next.salesEnabled = Boolean(u.salesEnabled);

    return {
      nextState: next,
      message: `Đã cập nhật thông tin khóa học "${next.title}"`,
      data: { courseId: next.courseId, title: next.title, status: next.status },
    };
  }

  if (
    actionType === "ADD_COURSE_LESSONS" ||
    actionType === "ADD_COURSE_LESSON" ||
    actionType === "CREATE_COURSE_VIDEO"
  ) {
    const rawItems: any[] = Array.isArray(params.lessons) && params.lessons.length > 0
      ? params.lessons
      : [params];

    const createdLessons: CourseLesson[] = [];
    let probedCount = 0;

    for (const item of rawItems) {
      const chapRes = resolveOrCreateChapter(
        next.chapters,
        item.chapterId ?? params.chapterId,
        item.chapterTitle ?? params.chapterTitle,
        item.groupTitle ?? params.groupTitle
      );
      next.chapters = chapRes.chapters;

      const rawUrl = String(item.videoUrl || item.url || "").trim();
      const detectedType: CourseVideoType = item.videoType
        ? (item.videoType as CourseVideoType)
        : inferCourseVideoType(rawUrl, "youtube");

      let durationSeconds = Math.max(0, Math.floor(Number(item.durationSeconds) || 0));
      let durationMinutes = Math.max(0, Math.floor(Number(item.durationMinutes) || 0));
      if (durationSeconds === 0 && durationMinutes > 0) {
        durationSeconds = durationMinutes * 60;
      }

      const shouldAutoProbe = params.autoProbeDuration !== false && item.autoProbeDuration !== false;
      if (rawUrl && durationSeconds === 0 && shouldAutoProbe) {
        const probed = await probeDurationBestEffort(rawUrl, detectedType);
        if (probed && probed.durationSeconds > 0) {
          durationSeconds = probed.durationSeconds;
          durationMinutes = probed.durationMinutes;
          probedCount += 1;
        }
      }

      const lessonId = generateCourseItemId("les");
      const defaultOrder = next.lessons.length;
      const newLesson: CourseLesson = {
        id: lessonId,
        courseId: next.courseId || "",
        chapterId: chapRes.resolvedChapterId ?? (next.chapters[0]?.id || null),
        topicTitle: String(item.topicTitle ?? params.topicTitle ?? "").trim(),
        title: String(item.title || `Bài ${defaultOrder + 1}: Video bài giảng mới`).trim(),
        description: String(item.description || "").trim(),
        order: defaultOrder,
        durationMinutes,
        durationSeconds,
        videoType: detectedType,
        videoUrl: rawUrl,
        accessType: (item.accessType || params.accessType || "inherit_first_n") as CourseLessonAccessType,
        priceVnd:
          item.priceVnd !== undefined
            ? Math.max(0, Math.floor(Number(item.priceVnd) || 0))
            : Math.max(0, Math.floor(Number(next.defaultLessonPriceVnd) || 25000)),
        includedInCourseUnlock:
          item.includedInCourseUnlock !== undefined ? Boolean(item.includedInCourseUnlock) : true,
        ...(item.linkedExamId ? { linkedExamId: String(item.linkedExamId).trim() } : {}),
        materials: normalizeMaterialsInput(item.materials),
      };

      const insertAt =
        item.insertAtOrder !== undefined && Number.isFinite(Number(item.insertAtOrder))
          ? Math.max(0, Math.min(next.lessons.length, Math.floor(Number(item.insertAtOrder))))
          : next.lessons.length;
      next.lessons.splice(insertAt, 0, newLesson);
      next.lessons = next.lessons.map((l, idx) => ({ ...l, order: idx }));
      createdLessons.push(newLesson);
      next.selectedLessonId = newLesson.id;
    }

    const first = createdLessons[0];
    return {
      nextState: next,
      message:
        createdLessons.length === 1
          ? `Đã thêm video "${first.title}"${first.durationSeconds ? ` (${formatDurationClock(first.durationSeconds, first.durationMinutes)})` : ""}`
          : `Đã thêm ${createdLessons.length} video mới vào khóa học${probedCount > 0 ? ` (tự đo thời lượng ${probedCount} video)` : ""}`,
      data: {
        courseId: next.courseId,
        title: next.title,
        lessonId: first?.id,
        lessonTitle: first?.title,
        addedCount: createdLessons.length,
        probedCount,
      },
    };
  }

  if (actionType === "UPDATE_COURSE_LESSON" || actionType === "UPDATE_COURSE_VIDEO") {
    const target = resolveTargetLesson(next.lessons, params, next.selectedLessonId);
    if (!target) {
      throw new Error("Không tìm thấy video bài giảng cần chỉnh sửa trong khóa học.");
    }

    const u = params.updates && typeof params.updates === "object" ? params.updates : params;
    let updatedUrl = target.videoUrl;
    let updatedType = target.videoType;
    let urlChanged = false;

    if (u.videoUrl !== undefined && String(u.videoUrl).trim() !== target.videoUrl) {
      updatedUrl = String(u.videoUrl).trim();
      updatedType = u.videoType
        ? (u.videoType as CourseVideoType)
        : inferCourseVideoType(updatedUrl, target.videoType);
      urlChanged = true;
    } else if (u.videoType !== undefined) {
      updatedType = u.videoType as CourseVideoType;
    }

    let resolvedChapterId = target.chapterId ?? null;
    if (u.chapterId !== undefined || u.chapterTitle !== undefined) {
      const chapRes = resolveOrCreateChapter(
        next.chapters,
        u.chapterId,
        u.chapterTitle,
        u.groupTitle
      );
      next.chapters = chapRes.chapters;
      resolvedChapterId = chapRes.resolvedChapterId;
    }

    let durationSeconds = target.durationSeconds || 0;
    let durationMinutes = target.durationMinutes || 0;
    const explicitDurationGiven = u.durationSeconds !== undefined || u.durationMinutes !== undefined;
    if (u.durationSeconds !== undefined) {
      durationSeconds = Math.max(0, Math.floor(Number(u.durationSeconds) || 0));
      durationMinutes = durationSeconds > 0 ? Math.max(1, Math.round(durationSeconds / 60)) : 0;
    } else if (u.durationMinutes !== undefined) {
      durationMinutes = Math.max(0, Math.floor(Number(u.durationMinutes) || 0));
      durationSeconds = durationMinutes * 60;
    } else if (urlChanged && updatedUrl && params.autoProbeDuration !== false) {
      const probed = await probeDurationBestEffort(updatedUrl, updatedType);
      if (probed && probed.durationSeconds > 0) {
        durationSeconds = probed.durationSeconds;
        durationMinutes = probed.durationMinutes;
      }
    }

    let materials = target.materials || [];
    if (Array.isArray(u.materials)) {
      materials = normalizeMaterialsInput(u.materials);
    }
    if (Array.isArray(u.addMaterials)) {
      materials = [...materials, ...normalizeMaterialsInput(u.addMaterials)];
    }
    if (Array.isArray(u.removeMaterialIds)) {
      const rmSet = new Set(u.removeMaterialIds.map(String));
      materials = materials.filter((m) => !rmSet.has(m.id));
    }

    const patched: CourseLesson = {
      ...target,
      title: u.title !== undefined ? String(u.title).trim() || target.title : target.title,
      description: u.description !== undefined ? String(u.description) : target.description,
      chapterId: resolvedChapterId,
      topicTitle: u.topicTitle !== undefined ? String(u.topicTitle).trim() : target.topicTitle,
      videoUrl: updatedUrl,
      videoType: updatedType,
      durationSeconds,
      durationMinutes,
      accessType: (u.accessType || target.accessType) as CourseLessonAccessType,
      priceVnd:
        u.priceVnd !== undefined ? Math.max(0, Math.floor(Number(u.priceVnd) || 0)) : target.priceVnd,
      includedInCourseUnlock:
        u.includedInCourseUnlock !== undefined
          ? Boolean(u.includedInCourseUnlock)
          : target.includedInCourseUnlock,
      linkedExamId:
        u.linkedExamId !== undefined ? String(u.linkedExamId || "").trim() || undefined : target.linkedExamId,
      materials,
    };

    const currentIdx = next.lessons.findIndex((l) => l.id === target.id);
    next.lessons[currentIdx] = patched;

    if (u.order !== undefined && Number.isFinite(Number(u.order))) {
      const targetOrder = Math.max(0, Math.min(next.lessons.length - 1, Math.floor(Number(u.order))));
      const [moved] = next.lessons.splice(currentIdx, 1);
      next.lessons.splice(targetOrder, 0, moved);
    }

    next.lessons = next.lessons.map((l, idx) => ({ ...l, order: idx }));
    next.selectedLessonId = patched.id;

    return {
      nextState: next,
      message: `Đã cập nhật video "${patched.title}"`,
      data: {
        courseId: next.courseId,
        title: next.title,
        lessonId: patched.id,
        lessonTitle: patched.title,
        durationSeconds: patched.durationSeconds,
      },
    };
  }

  if (actionType === "DELETE_COURSE_LESSON" || actionType === "DELETE_COURSE_VIDEO") {
    const target = resolveTargetLesson(next.lessons, params, next.selectedLessonId);
    if (!target) {
      throw new Error("Không tìm thấy video bài giảng cần xóa.");
    }
    next.lessons = next.lessons
      .filter((l) => l.id !== target.id)
      .map((l, idx) => ({ ...l, order: idx }));
    if (!next.deletedLessonIds.includes(target.id)) {
      next.deletedLessonIds.push(target.id);
    }
    if (next.selectedLessonId === target.id) {
      next.selectedLessonId = next.lessons[0]?.id || null;
    }

    return {
      nextState: next,
      message: `Đã xóa video "${target.title}" khỏi khóa học`,
      data: { courseId: next.courseId, deletedLessonId: target.id, lessonTitle: target.title },
    };
  }

  if (actionType === "MANAGE_COURSE_CHAPTER") {
    const op = String(params.action || "add").toLowerCase();
    if (op === "add") {
      const title = String(params.title || params.chapterTitle || "").trim();
      if (!title) throw new Error("Thiếu tên chương cần thêm.");
      const ch: CourseChapter = {
        id: generateCourseItemId("ch"),
        title,
        ...(params.groupTitle ? { groupTitle: String(params.groupTitle).trim() } : {}),
        order: next.chapters.length,
      };
      next.chapters.push(ch);
      return {
        nextState: next,
        message: `Đã thêm chương "${ch.title}"`,
        data: { courseId: next.courseId, chapterId: ch.id, chapterTitle: ch.title },
      };
    }

    const matchChap =
      (params.chapterId && next.chapters.find((c) => c.id === params.chapterId)) ||
      (params.title &&
        next.chapters.find((c) => c.title.trim().toLowerCase() === String(params.title).trim().toLowerCase())) ||
      (params.chapterTitle &&
        next.chapters.find(
          (c) => c.title.trim().toLowerCase() === String(params.chapterTitle).trim().toLowerCase()
        ));

    if (!matchChap) throw new Error("Không tìm thấy chương cần chỉnh sửa.");

    if (op === "delete") {
      next.chapters = next.chapters
        .filter((c) => c.id !== matchChap.id)
        .map((c, idx) => ({ ...c, order: idx }));
      next.lessons = next.lessons.map((l) =>
        l.chapterId === matchChap.id ? { ...l, chapterId: null } : l
      );
      return {
        nextState: next,
        message: `Đã xóa chương "${matchChap.title}" (giữ nguyên các bài giảng)`,
        data: { courseId: next.courseId, chapterId: matchChap.id },
      };
    }

    if (op === "rename" || op === "update") {
      const newTitle = String(params.newTitle || params.title || matchChap.title).trim();
      next.chapters = next.chapters.map((c) =>
        c.id === matchChap.id
          ? {
              ...c,
              title: newTitle,
              ...(params.groupTitle !== undefined
                ? { groupTitle: String(params.groupTitle).trim() || undefined }
                : {}),
            }
          : c
      );
      return {
        nextState: next,
        message: `Đã cập nhật chương thành "${newTitle}"`,
        data: { courseId: next.courseId, chapterId: matchChap.id, chapterTitle: newTitle },
      };
    }

    if (op === "reorder" && params.order !== undefined) {
      const idx = next.chapters.findIndex((c) => c.id === matchChap.id);
      const targetOrder = Math.max(0, Math.min(next.chapters.length - 1, Math.floor(Number(params.order))));
      const [moved] = next.chapters.splice(idx, 1);
      next.chapters.splice(targetOrder, 0, moved);
      next.chapters = next.chapters.map((c, i) => ({ ...c, order: i }));
      return {
        nextState: next,
        message: `Đã sắp xếp lại vị trí chương "${matchChap.title}"`,
        data: { courseId: next.courseId, chapterId: matchChap.id },
      };
    }

    throw new Error(`Thao tác chương không hợp lệ: ${op}`);
  }

  if (actionType === "PROBE_COURSE_DURATIONS") {
    const onlyMissing = params.onlyMissing === true;
    const singleLesson = params.lessonId || params.lessonNumber || params.lessonTitle
      ? resolveTargetLesson(next.lessons, params, next.selectedLessonId)
      : null;

    const candidates = singleLesson
      ? [singleLesson]
      : next.lessons.filter(
          (l) => Boolean(l.videoUrl?.trim()) && (!onlyMissing || !l.durationSeconds || l.durationSeconds <= 0)
        );

    let updatedCount = 0;
    const probedMap = new Map<string, { durationSeconds: number; durationMinutes: number }>();

    for (const lesson of candidates) {
      if (!lesson.videoUrl?.trim()) continue;
      const probed = await probeDurationBestEffort(lesson.videoUrl, lesson.videoType);
      if (probed && probed.durationSeconds > 0) {
        probedMap.set(lesson.id, probed);
        updatedCount += 1;
      }
    }

    next.lessons = next.lessons.map((l) => {
      const hit = probedMap.get(l.id);
      return hit
        ? { ...l, durationSeconds: hit.durationSeconds, durationMinutes: hit.durationMinutes }
        : l;
    });

    return {
      nextState: next,
      message:
        updatedCount > 0
          ? `Đã tự động đo thời lượng cho ${updatedCount}/${candidates.length} video`
          : `Không đọc được thêm metadata thời lượng từ ${candidates.length} video`,
      data: { courseId: next.courseId, updatedCount, totalChecked: candidates.length },
    };
  }

  throw new Error(`Hành động khóa học chưa hỗ trợ: ${actionType}`);
}

export async function saveMutableCourseStateToFirestore(
  state: MutableCourseState
): Promise<string> {
  const cleanPrice = state.accessMode === "paid" ? Math.max(0, Math.floor(Number(state.priceVnd) || 0)) : 0;
  const savedId = await saveCourseWithLessons({
    courseId: state.courseId,
    courseData: {
      title: state.title.trim() || "Khóa học mới",
      code: state.code.trim().toUpperCase(),
      description: state.description.trim(),
      thumbnailUrl: state.thumbnailUrl.trim(),
      subject: state.subject.trim(),
      gradeCategory: state.gradeCategory.trim(),
      instructorName: state.instructorName.trim() || "DkTEST Studio",
      status: state.status,
      isFeatured: state.isFeatured,
      accessMode: state.accessMode,
      priceVnd: cleanPrice,
      defaultLessonPriceVnd: Math.max(0, Math.floor(Number(state.defaultLessonPriceVnd) || 0)),
      originalPriceVnd:
        state.accessMode === "paid" && state.originalPriceVnd > cleanPrice
          ? Math.floor(state.originalPriceVnd)
          : undefined,
      salesEnabled: state.salesEnabled,
      unlockFullPolicy: state.unlockFullPolicy,
      freePreviewCount: Math.max(0, Math.floor(Number(state.freePreviewCount) || 0)),
      allowSingleLessonPurchase:
        state.accessMode === "per_video" ? true : state.allowSingleLessonPurchase,
      chapters: state.chapters.map((c, idx) => ({
        ...c,
        ...(c.groupTitle?.trim() ? { groupTitle: c.groupTitle.trim() } : {}),
        order: idx,
      })),
    } as Omit<
      Course,
      "id" | "lessonOutline" | "lessonCount" | "freeLessonCount" | "paidLessonCount" | "totalDurationMinutes"
    >,
    lessons: state.lessons,
    deletedLessonIds: state.deletedLessonIds,
  });
  return savedId;
}

export function courseDocToMutableState(
  course: Course,
  lessons: CourseLesson[],
  selectedLessonId?: string | null
): MutableCourseState {
  const mode = resolveCourseAccessMode(course);
  return {
    courseId: course.id,
    title: course.title || "",
    code: course.code || "",
    description: course.description || "",
    thumbnailUrl: course.thumbnailUrl || "",
    subject: course.subject || "TOÁN HỌC",
    gradeCategory: course.gradeCategory || "Lớp 12",
    instructorName: course.instructorName || "DkTEST Studio",
    status: course.status || "draft",
    isFeatured: Boolean(course.isFeatured),
    accessMode: mode,
    priceVnd: course.priceVnd || 0,
    originalPriceVnd: course.originalPriceVnd || 0,
    defaultLessonPriceVnd: course.defaultLessonPriceVnd || 25000,
    salesEnabled: course.salesEnabled !== false,
    unlockFullPolicy: course.unlockFullPolicy || "unlock_all_videos",
    freePreviewCount: Math.max(0, Number(course.freePreviewCount) || 0),
    allowSingleLessonPurchase:
      mode === "per_video" ? true : Boolean(course.allowSingleLessonPurchase),
    chapters: [...(course.chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    lessons: [...lessons].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    deletedLessonIds: [],
    selectedLessonId: selectedLessonId || lessons[0]?.id || null,
  };
}

export async function resolveCourseIdByParams(params: Record<string, any>): Promise<string> {
  if (params.courseId && typeof params.courseId === "string" && params.courseId.trim()) {
    return params.courseId.trim();
  }
  const courses = await getAdminCoursesList(true);
  const queryTitle = String(params.courseTitle || params.courseCode || params.title || "").trim();
  if (queryTitle) {
    const lower = queryTitle.toLowerCase();
    const hit =
      courses.find((c) => c.code && c.code.toLowerCase() === lower) ||
      courses.find((c) => c.title.trim().toLowerCase() === lower) ||
      courses.find((c) => c.title.trim().toLowerCase().includes(lower));
    if (hit) return hit.id;
  }
  throw new Error("Không tìm thấy khóa học tương ứng. Hãy cung cấp courseId hoặc tên khóa học chính xác.");
}

export async function createNewCourseFromAgentParams(
  params: Record<string, any>
): Promise<{
  success: boolean;
  message: string;
  data: Record<string, any>;
}> {
  const rawAccessMode = String(params.accessMode || "free").toLowerCase();
  const priceVnd = Math.max(0, Math.floor(Number(params.priceVnd) || 0));
  const accessMode: CourseAccessMode =
    rawAccessMode === "per_video"
      ? "per_video"
      : rawAccessMode === "paid" || priceVnd > 0
      ? priceVnd > 0
        ? "paid"
        : "per_video"
      : "free";

  const chapters: CourseChapter[] = Array.isArray(params.chapters)
    ? params.chapters
        .filter((c: any) => c && (c.title || typeof c === "string"))
        .map((c: any, idx: number) =>
          typeof c === "string"
            ? { id: generateCourseItemId("ch"), title: c.trim(), order: idx }
            : {
                id: String(c.id || generateCourseItemId("ch")),
                title: String(c.title || `Chương ${idx + 1}`).trim(),
                ...(c.groupTitle ? { groupTitle: String(c.groupTitle).trim() } : {}),
                ...(c.description ? { description: String(c.description).trim() } : {}),
                order: idx,
              }
        )
    : [];

  let state: MutableCourseState = {
    title: String(params.title || "Khóa học mới").trim(),
    code: String(params.code || `COURSE_${Date.now().toString(36).toUpperCase()}`).trim().toUpperCase(),
    description: String(params.description || "").trim(),
    thumbnailUrl: String(params.thumbnailUrl || "").trim(),
    subject: String(params.subject || "TOÁN HỌC").trim(),
    gradeCategory: String(params.gradeCategory || "Lớp 12").trim(),
    instructorName: String(params.instructorName || "DkTEST Studio").trim(),
    status: (params.status === "published" || params.status === "archived" ? params.status : "draft") as CourseStatus,
    isFeatured: Boolean(params.isFeatured),
    accessMode,
    priceVnd: accessMode === "paid" ? priceVnd : 0,
    originalPriceVnd: Math.max(0, Math.floor(Number(params.originalPriceVnd) || 0)),
    defaultLessonPriceVnd: Math.max(0, Math.floor(Number(params.defaultLessonPriceVnd) || 25000)),
    salesEnabled: params.salesEnabled !== false,
    unlockFullPolicy:
      params.unlockFullPolicy === "unlock_course_only" ? "unlock_course_only" : "unlock_all_videos",
    freePreviewCount: Math.max(0, Math.floor(Number(params.freePreviewCount) || 0)),
    allowSingleLessonPurchase:
      accessMode === "per_video" ? true : Boolean(params.allowSingleLessonPurchase),
    chapters,
    lessons: [],
    deletedLessonIds: [],
  };

  if (Array.isArray(params.lessons) && params.lessons.length > 0) {
    const addRes = await applyCourseOperationToState(state, "ADD_COURSE_LESSONS", {
      lessons: params.lessons,
      autoProbeDuration: params.autoProbeDuration,
    });
    state = addRes.nextState;
  }

  const savedId = await saveMutableCourseStateToFirestore(state);
  const stats = buildCourseOutlineAndStats(
    { accessMode: state.accessMode, priceVnd: state.priceVnd, freePreviewCount: state.freePreviewCount },
    state.lessons
  );
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dktest-courses-updated"));
  }

  return {
    success: true,
    message: `Đã tạo khóa học "${state.title}" (${stats.lessonCount} video)`,
    data: {
      courseId: savedId,
      title: state.title,
      lessonCount: stats.lessonCount,
      totalDurationSeconds: stats.totalDurationSeconds,
      editUrl: `/admin/courses/${savedId}/edit`,
      viewUrl: `/student/courses/${savedId}`,
    },
  };
}

export async function executeStandaloneCourseAction(
  actionType: string,
  params: Record<string, any>
): Promise<{ success: boolean; message: string; data?: any }> {
  if (actionType === "LIST_COURSES" || actionType === "GET_COURSE_DETAILS") {
    if (params.courseId || params.courseTitle || params.includeLessons) {
      const targetId = params.courseId || (params.courseTitle ? await resolveCourseIdByParams(params) : "");
      if (targetId) {
        const [course, lessons] = await Promise.all([
          getCourse(targetId, true),
          getCourseLessonsForAdmin(targetId),
        ]);
        if (!course) throw new Error(`Không tìm thấy khóa học ${targetId}`);
        return {
          success: true,
          message: `Khóa học "${course.title}" có ${course.chapters?.length || 0} chương và ${lessons.length} video`,
          data: {
            courseId: course.id,
            title: course.title,
            chapters: course.chapters,
            lessons: lessons.map((l) => ({
              id: l.id,
              order: l.order,
              lessonNumber: l.order + 1,
              title: l.title,
              chapterId: l.chapterId,
              topicTitle: l.topicTitle,
              videoType: l.videoType,
              durationMinutes: l.durationMinutes,
              durationSeconds: l.durationSeconds,
              accessType: l.accessType,
              priceVnd: l.priceVnd,
            })),
            editUrl: `/admin/courses/${course.id}/edit`,
          },
        };
      }
    }

    const list = await getAdminCoursesList(true);
    const q = String(params.query || "").trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            (c.code && c.code.toLowerCase().includes(q)) ||
            (c.subject && c.subject.toLowerCase().includes(q))
        )
      : list;
    return {
      success: true,
      message: `Tìm thấy ${filtered.length} khóa học trong hệ thống`,
      data: {
        count: filtered.length,
        items: filtered.map((c) => ({
          id: c.id,
          title: c.title,
          code: c.code,
          subject: c.subject,
          status: c.status,
          accessMode: c.accessMode,
          priceVnd: c.priceVnd,
          lessonCount: c.lessonCount,
        })),
      },
    };
  }

  if (actionType === "CREATE_COURSE") {
    return createNewCourseFromAgentParams(params);
  }

  const courseId = await resolveCourseIdByParams(params);
  const [course, lessons] = await Promise.all([
    getCourse(courseId, true),
    getCourseLessonsForAdmin(courseId),
  ]);
  if (!course) throw new Error(`Không tìm thấy khóa học ${courseId}`);

  const initialState = courseDocToMutableState(course, lessons);
  const { nextState, message, data } = await applyCourseOperationToState(
    initialState,
    actionType,
    params
  );
  await saveMutableCourseStateToFirestore(nextState);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dktest-courses-updated"));
  }
  return {
    success: true,
    message,
    data: {
      ...data,
      courseId,
      editUrl: `/admin/courses/${courseId}/edit`,
      viewUrl: `/student/courses/${courseId}`,
    },
  };
}
