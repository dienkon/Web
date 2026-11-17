import { describe, it, expect } from "vitest";
import {
  buildCourseHierarchy,
  buildCourseOutlineAndStats,
  computeLessonAccessState,
  isLessonEffectivelyFree,
  maskVideoUrlDisplay,
  parseVideoSource,
  resolveCourseAccessMode,
} from "./courseService";
import type { Course, CourseLesson } from "../types";

describe("courseService pure access, hierarchy, masking & outline helpers", () => {
  describe("resolveCourseAccessMode & isLessonEffectivelyFree", () => {
    it("marks every lesson free only when accessMode resolves to free", () => {
      expect(resolveCourseAccessMode({ accessMode: "free", priceVnd: 0 })).toBe("free");
      expect(resolveCourseAccessMode({ accessMode: "per_video", priceVnd: 0 })).toBe("per_video");
      expect(
        isLessonEffectivelyFree(
          { accessMode: "free", priceVnd: 0, freePreviewCount: 0 },
          { accessType: "paid", order: 3 }
        )
      ).toBe(true);
    });

    it("enforces per-video fees in per_video mode even when course priceVnd is 0", () => {
      const perVideoCourse = { accessMode: "per_video" as const, priceVnd: 0, freePreviewCount: 1 };
      expect(isLessonEffectivelyFree(perVideoCourse, { accessType: "inherit_first_n", order: 0 })).toBe(true);
      expect(isLessonEffectivelyFree(perVideoCourse, { accessType: "inherit_first_n", order: 1 })).toBe(false);
      expect(isLessonEffectivelyFree(perVideoCourse, { accessType: "paid", order: 0 })).toBe(false);
      expect(isLessonEffectivelyFree(perVideoCourse, { accessType: "free", order: 5 })).toBe(true);
    });

    it("applies configurable freePreviewCount and honors per-lesson overrides in paid mode", () => {
      const paidCourse = { accessMode: "paid" as const, priceVnd: 299000, freePreviewCount: 2 };
      expect(isLessonEffectivelyFree(paidCourse, { accessType: "inherit_first_n", order: 0 })).toBe(true);
      expect(isLessonEffectivelyFree(paidCourse, { accessType: "inherit_first_n", order: 1 })).toBe(true);
      expect(isLessonEffectivelyFree(paidCourse, { accessType: "inherit_first_n", order: 2 })).toBe(false);

      expect(isLessonEffectivelyFree(paidCourse, { accessType: "paid", order: 0 })).toBe(false);
      expect(isLessonEffectivelyFree(paidCourse, { accessType: "free", order: 8 })).toBe(true);
    });
  });

  describe("computeLessonAccessState", () => {
    const baseCourse = {
      accessMode: "paid" as const,
      priceVnd: 350000,
      freePreviewCount: 1,
      unlockFullPolicy: "unlock_all_videos" as const,
      allowSingleLessonPurchase: true,
    };

    it("enables single-video purchase automatically in per_video mode and blocks watch until paid", () => {
      const perVideo = {
        accessMode: "per_video" as const,
        priceVnd: 0,
        freePreviewCount: 1,
        unlockFullPolicy: "unlock_all_videos" as const,
        allowSingleLessonPurchase: false,
      };
      const paidLesson = {
        id: "pv1",
        accessType: "inherit_first_n" as const,
        order: 1,
        priceVnd: 30000,
        includedInCourseUnlock: true,
      };

      const locked = computeLessonAccessState(perVideo, paidLesson, {
        hasCourseAccess: false,
        unlockedCourse: false,
        unlockedLessonIds: [],
      });
      expect(locked.canWatch).toBe(false);
      expect(locked.canBuySingle).toBe(true);
      expect(locked.effectiveSinglePriceVnd).toBe(30000);

      const unlocked = computeLessonAccessState(perVideo, paidLesson, {
        hasCourseAccess: false,
        unlockedCourse: false,
        unlockedLessonIds: ["pv1"],
      });
      expect(unlocked.canWatch).toBe(true);
      expect(unlocked.unlockedByLesson).toBe(true);
    });

    it("unlocks all lessons (even includedInCourseUnlock=false) when unlockFullPolicy is unlock_all_videos", () => {
      const state = computeLessonAccessState(
        baseCourse,
        { id: "l_vip", accessType: "paid", order: 4, priceVnd: 50000, includedInCourseUnlock: false },
        { hasCourseAccess: false, unlockedCourse: true, unlockedLessonIds: [] }
      );
      expect(state.canWatch).toBe(true);
      expect(state.unlockedByCourse).toBe(true);
    });

    it("withholds excluded VIP lesson under unlock_course_only unless singly unlocked", () => {
      const splitCourse = { ...baseCourse, unlockFullPolicy: "unlock_course_only" as const };
      const lesson = {
        id: "l_vip",
        accessType: "paid" as const,
        order: 4,
        priceVnd: 65000,
        includedInCourseUnlock: false,
      };

      const lockedState = computeLessonAccessState(splitCourse, lesson, {
        hasCourseAccess: false,
        unlockedCourse: true,
        unlockedLessonIds: [],
      });
      expect(lockedState.canWatch).toBe(false);
      expect(lockedState.canBuySingle).toBe(true);
      expect(lockedState.effectiveSinglePriceVnd).toBe(65000);

      const singleUnlockedState = computeLessonAccessState(splitCourse, lesson, {
        hasCourseAccess: false,
        unlockedCourse: true,
        unlockedLessonIds: ["l_vip"],
      });
      expect(singleUnlockedState.canWatch).toBe(true);
      expect(singleUnlockedState.unlockedByLesson).toBe(true);
    });
  });

  describe("parseVideoSource & maskVideoUrlDisplay", () => {
    it("uses youtube-nocookie embeds for privacy", () => {
      expect(parseVideoSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube")).toEqual({
        kind: "youtube",
        embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&iv_load_policy=3",
      });
      expect(parseVideoSource("https://youtu.be/abc123XYZ", "youtube")).toEqual({
        kind: "youtube",
        embedUrl: "https://www.youtube-nocookie.com/embed/abc123XYZ?rel=0&modestbranding=1&iv_load_policy=3",
      });
    });

    it("normalizes Google Drive URLs to rm=minimal preview and masks original URL strings", () => {
      const rawDrive = "https://drive.google.com/file/d/1XyZ987AbC/view?usp=sharing";
      expect(parseVideoSource(rawDrive)).toEqual({
        kind: "iframe",
        isDrive: true,
        embedUrl: "https://drive.google.com/file/d/1XyZ987AbC/preview?rm=minimal",
      });
      const masked = maskVideoUrlDisplay(rawDrive, "iframe");
      expect(masked).toContain("Kho lưu Drive");
      expect(masked).not.toContain("1XyZ987AbC");
    });
  });

  describe("buildCourseOutlineAndStats & buildCourseHierarchy", () => {
    it("strips private videoUrl and material URLs from public outline while grouping 3-level hierarchy", () => {
      const lessons: CourseLesson[] = [
        {
          id: "l2",
          courseId: "c1",
          chapterId: "ch1",
          topicTitle: "Bổ trợ tam thức bậc hai",
          title: "Tam thức bậc 2 - Phần 2",
          order: 1,
          durationMinutes: 30,
          videoType: "iframe",
          videoUrl: "https://drive.google.com/file/d/SECRET_PAID_ID/view",
          accessType: "inherit_first_n",
          priceVnd: 40000,
          includedInCourseUnlock: true,
          materials: [{ id: "m2", label: "Bài tập tự luyện", type: "file", url: "https://secret-mat2.pdf" }],
        },
        {
          id: "l1",
          courseId: "c1",
          chapterId: "ch1",
          topicTitle: "Bổ trợ tam thức bậc hai",
          title: "Tam thức bậc 2 - Phần 1",
          order: 0,
          durationMinutes: 15,
          videoType: "cloudinary",
          videoUrl: "https://res.cloudinary.com/secret.mp4",
          accessType: "inherit_first_n",
          priceVnd: 0,
          includedInCourseUnlock: true,
          materials: [{ id: "m1", label: "Tài liệu PDF", type: "file", url: "https://secret-mat1.pdf" }],
        },
      ];

      const res = buildCourseOutlineAndStats(
        { accessMode: "per_video", priceVnd: 0, freePreviewCount: 1 },
        lessons
      );

      expect(res.orderedLessons.map((l) => l.id)).toEqual(["l1", "l2"]);
      expect(res.freeLessonCount).toBe(1);
      expect(res.paidLessonCount).toBe(1);
      expect(res.minPaidLessonPriceVnd).toBe(40000);
      expect(res.totalDurationMinutes).toBe(45);

      expect((res.lessonOutline[0] as any).videoUrl).toBeUndefined();
      expect((res.lessonOutline[0].materialItems?.[0] as any).url).toBeUndefined();
      expect(res.lessonOutline[0].materialItems?.[0].label).toBe("Tài liệu PDF");

      const courseObj: Course = {
        id: "c1",
        title: "Toán 12",
        subject: "TOÁN HỌC",
        status: "published",
        accessMode: "per_video",
        priceVnd: 0,
        salesEnabled: true,
        unlockFullPolicy: "unlock_all_videos",
        freePreviewCount: 1,
        allowSingleLessonPurchase: true,
        chapters: [{ id: "ch1", groupTitle: "TOÁN HỌC", title: "BỔ TRỢ NỀN TẢNG", order: 0 }],
        lessonOutline: res.lessonOutline,
        lessonCount: res.lessonCount,
        freeLessonCount: res.freeLessonCount,
        paidLessonCount: res.paidLessonCount,
      };

      const tree = buildCourseHierarchy(courseObj, null, ["l1"]);
      expect(tree).toHaveLength(1);
      expect(tree[0].title).toBe("TOÁN HỌC");
      expect(tree[0].chapters[0].title).toBe("BỔ TRỢ NỀN TẢNG");
      expect(tree[0].chapters[0].topics).toHaveLength(1);
      expect(tree[0].chapters[0].topics[0].title).toBe("Bổ trợ tam thức bậc hai");
      expect(tree[0].chapters[0].topics[0].videoCount).toBe(2);
      expect(tree[0].chapters[0].topics[0].materialsCount).toBe(2);
      expect(tree[0].chapters[0].topics[0].progressPct).toBe(50);
    });
  });
});
