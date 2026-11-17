import { describe, it, expect } from "vitest";
import {
  buildCourseOutlineAndStats,
  computeLessonAccessState,
  isLessonEffectivelyFree,
  parseVideoSource,
} from "./courseService";
import type { CourseLesson } from "../types";

describe("courseService pure access & outline helpers", () => {
  describe("isLessonEffectivelyFree", () => {
    it("marks every lesson free when course is free", () => {
      expect(
        isLessonEffectivelyFree(
          { accessMode: "free", priceVnd: 0, freePreviewCount: 0 },
          { accessType: "paid", order: 3 }
        )
      ).toBe(true);
    });

    it("applies configurable freePreviewCount and honors per-lesson overrides", () => {
      const paidCourse = { accessMode: "paid" as const, priceVnd: 299000, freePreviewCount: 2 };
      expect(isLessonEffectivelyFree(paidCourse, { accessType: "inherit_first_n", order: 0 })).toBe(true);
      expect(isLessonEffectivelyFree(paidCourse, { accessType: "inherit_first_n", order: 1 })).toBe(true);
      expect(isLessonEffectivelyFree(paidCourse, { accessType: "inherit_first_n", order: 2 })).toBe(false);

      // Explicit overrides win regardless of position
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
      const lesson = { id: "l_vip", accessType: "paid" as const, order: 4, priceVnd: 65000, includedInCourseUnlock: false };

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

  describe("parseVideoSource", () => {
    it("normalizes YouTube watch/short/youtu.be URLs into embed iframes", () => {
      expect(parseVideoSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube")).toEqual({
        kind: "youtube",
        embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1",
      });
      expect(parseVideoSource("https://youtu.be/abc123XYZ", "youtube")).toEqual({
        kind: "youtube",
        embedUrl: "https://www.youtube.com/embed/abc123XYZ?rel=0&modestbranding=1",
      });
    });

    it("normalizes Google Drive file links to preview iframes and keeps Cloudinary/MP4 as video", () => {
      expect(parseVideoSource("https://drive.google.com/file/d/1XyZ987AbC/view?usp=sharing")).toEqual({
        kind: "iframe",
        embedUrl: "https://drive.google.com/file/d/1XyZ987AbC/preview",
      });
      expect(
        parseVideoSource("https://res.cloudinary.com/demo/video/upload/v1/sample.mp4", "cloudinary")
      ).toEqual({
        kind: "video",
        embedUrl: "https://res.cloudinary.com/demo/video/upload/v1/sample.mp4",
      });
    });
  });

  describe("buildCourseOutlineAndStats", () => {
    it("strips private videoUrl and materials from public lessonOutline while computing stats", () => {
      const lessons: CourseLesson[] = [
        {
          id: "b",
          courseId: "c1",
          title: "Bài 2",
          order: 5,
          durationMinutes: 30,
          videoType: "youtube",
          videoUrl: "https://youtu.be/SECRET_PAID",
          accessType: "inherit_first_n",
          priceVnd: 40000,
          includedInCourseUnlock: true,
        },
        {
          id: "a",
          courseId: "c1",
          title: "Bài 1",
          order: 1,
          durationMinutes: 15,
          videoType: "cloudinary",
          videoUrl: "https://res.cloudinary.com/secret.mp4",
          accessType: "inherit_first_n",
          priceVnd: 0,
          includedInCourseUnlock: true,
          materials: [{ id: "m1", label: "PDF", type: "file", url: "https://secret.pdf" }],
        },
      ];

      const res = buildCourseOutlineAndStats(
        { accessMode: "paid", priceVnd: 199000, freePreviewCount: 1 },
        lessons
      );

      expect(res.orderedLessons.map((l) => l.id)).toEqual(["a", "b"]);
      expect(res.orderedLessons.map((l) => l.order)).toEqual([0, 1]);
      expect(res.lessonCount).toBe(2);
      expect(res.freeLessonCount).toBe(1);
      expect(res.paidLessonCount).toBe(1);
      expect(res.totalDurationMinutes).toBe(45);

      expect(res.lessonOutline[0].isFreeEffective).toBe(true);
      expect(res.lessonOutline[0].hasMaterials).toBe(true);
      expect((res.lessonOutline[0] as any).videoUrl).toBeUndefined();
      expect((res.lessonOutline[0] as any).materials).toBeUndefined();

      expect(res.lessonOutline[1].isFreeEffective).toBe(false);
      expect((res.lessonOutline[1] as any).videoUrl).toBeUndefined();
    });
  });
});
