import { describe, it, expect } from "vitest";
import {
  buildCloudinaryQualityUrl,
  buildCourseHierarchy,
  buildCourseOutlineAndStats,
  buildCourseShareUrl,
  computeLessonAccessState,
  formatDurationClock,
  formatQualityLabel,
  getCourseGuideStorageKey,
  inferCourseVideoType,
  isCloudinaryVideoUrl,
  isCoursePlayerTheaterUrl,
  isLessonEffectivelyFree,
  maskVideoUrlDisplay,
  parseVideoSource,
  resolveCourseAccessMode,
  VIDEO_SPEED_OPTIONS,
} from "./courseService";
import type { Course, CourseLesson } from "../types";
import {
  computeFittedVideoBox,
  VIRTUAL_IFRAME_STAGE_HEIGHT,
  VIRTUAL_IFRAME_STAGE_WIDTH,
} from "../utils/videoSourceHelper";

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
    it("parses YouTube URLs with enablejsapi=1 and youtubeId to avoid Error 153", () => {
      const yt1 = parseVideoSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube");
      expect(yt1.kind).toBe("youtube");
      expect(yt1.youtubeId).toBe("dQw4w9WgXcQ");
      expect(yt1.embedUrl).toContain("https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1");
      expect(yt1.embedUrl).toContain("playsinline=1");

      const yt2 = parseVideoSource("https://youtu.be/abc123XYZ", "youtube");
      expect(yt2.kind).toBe("youtube");
      expect(yt2.youtubeId).toBe("abc123XYZ");
      expect(yt2.embedUrl).toContain("https://www.youtube.com/embed/abc123XYZ?enablejsapi=1");
    });

    it("normalizes Google Drive URLs to rm=minimal preview with driveId and masks original URL strings", () => {
      const rawDrive = "https://drive.google.com/file/d/1XyZ987AbC12/view?usp=sharing";
      expect(parseVideoSource(rawDrive)).toEqual({
        kind: "iframe",
        driveId: "1XyZ987AbC12",
        isDrive: true,
        embedUrl: "https://drive.google.com/file/d/1XyZ987AbC12/preview?rm=minimal",
      });
      expect(parseVideoSource("https://drive.google.com/file/u/0/d/1XyZ987AbC12/preview")).toEqual({
        kind: "iframe",
        driveId: "1XyZ987AbC12",
        isDrive: true,
        embedUrl: "https://drive.google.com/file/d/1XyZ987AbC12/preview?rm=minimal",
      });
      expect(inferCourseVideoType("https://docs.google.com/file/d/1XyZ987AbC12/edit")).toBe("iframe");
      expect(inferCourseVideoType("https://youtu.be/dQw4w9WgXcQ")).toBe("youtube");
      expect(inferCourseVideoType("https://res.cloudinary.com/demo/video/upload/v1/a.mp4")).toBe("cloudinary");
      const masked = maskVideoUrlDisplay(rawDrive, "iframe");
      expect(masked).toContain("Kho lưu Drive");
      expect(masked).not.toContain("1XyZ987AbC12");
    });
  });

  describe("formatDurationClock & buildCourseShareUrl", () => {
    it("formats seconds cleanly into M:SS and H:MM:SS clocks", () => {
      expect(formatDurationClock(0)).toBe("0:00");
      expect(formatDurationClock(95)).toBe("1:35");
      expect(formatDurationClock(3804)).toBe("1:03:24");
      expect(formatDurationClock(undefined, 25)).toBe("25:00");
    });

    it("builds canonical share links for courses and deep-linked video lessons", () => {
      const courseUrl = buildCourseShareUrl("course_123");
      expect(courseUrl).toMatch(/\/student\/courses\/course_123$/);
      const lessonUrl = buildCourseShareUrl("course_123", "les_9");
      expect(lessonUrl).toMatch(/\/student\/courses\/course_123\?lesson=les_9$/);
    });
  });

  describe("video resolution & playback speed list helpers", () => {
    it("exposes standard ordered speed options and human-readable quality labels", () => {
      expect(VIDEO_SPEED_OPTIONS).toEqual([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
      expect(formatQualityLabel("auto")).toEqual({
        value: "auto",
        label: "Tự động",
        shortLabel: "Auto",
      });
      expect(formatQualityLabel("hd1080")).toEqual({
        value: "hd1080",
        label: "1080p",
        shortLabel: "1080p",
        badge: "HD",
      });
      expect(formatQualityLabel("large")).toEqual({
        value: "large",
        label: "480p",
        shortLabel: "480p",
      });
    });

    it("detects Cloudinary video URLs and rewrites clean width/quality transforms safely", () => {
      const raw = "https://res.cloudinary.com/demo/video/upload/v170000/lectures/math.mp4";
      expect(isCloudinaryVideoUrl(raw)).toBe(true);
      expect(isCloudinaryVideoUrl("https://cdn.example.com/math.mp4")).toBe(false);

      expect(buildCloudinaryQualityUrl(raw, "auto")).toBe(raw);
      expect(buildCloudinaryQualityUrl(raw, "hd720")).toBe(
        "https://res.cloudinary.com/demo/video/upload/w_1280,c_limit,q_auto/v170000/lectures/math.mp4"
      );

      const preTransformed =
        "https://res.cloudinary.com/demo/video/upload/f_mp4,w_1920,q_90/v170000/lectures/math.mp4";
      expect(buildCloudinaryQualityUrl(preTransformed, "medium")).toBe(
        "https://res.cloudinary.com/demo/video/upload/f_mp4/w_640,c_limit,q_auto/v170000/lectures/math.mp4"
      );
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
          linkedExamId: "exam_tam_thuc_1",
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
      expect(tree[0].chapters[0].topics[0].examsCount).toBe(1);
      expect(tree[0].chapters[0].topics[0].exams[0].linkedExamId).toBe("exam_tam_thuc_1");
      expect(tree[0].chapters[0].topics[0].exams[0].canAccess).toBe(true);
      expect(tree[0].chapters[0].topics[0].progressPct).toBe(50);

      expect(getCourseGuideStorageKey("stu_1", "courses_tab")).toContain("courses_tab_stu_1");
      expect(getCourseGuideStorageKey(null, "course_player")).toContain("course_player_guest");

      expect(isCoursePlayerTheaterUrl("/student/courses/math12", "")).toBe(false);
      expect(isCoursePlayerTheaterUrl("/courses/math12", "")).toBe(false);
      expect(isCoursePlayerTheaterUrl("/student/courses/math12", "?lesson=l1")).toBe(true);
      expect(isCoursePlayerTheaterUrl("/student/courses/math12", "?video=l2")).toBe(true);
      expect(isCoursePlayerTheaterUrl("/courses/math12", "?watch=1")).toBe(true);
      expect(isCoursePlayerTheaterUrl("/student/courses", "?lesson=l1")).toBe(false);
      expect(isCoursePlayerTheaterUrl("/admin/courses/math12", "?lesson=l1")).toBe(false);

      expect(VIRTUAL_IFRAME_STAGE_WIDTH / VIRTUAL_IFRAME_STAGE_HEIGHT).toBeCloseTo(16 / 9, 5);
      expect(computeFittedVideoBox(360, 760)).toEqual({ width: 360, height: 203 });
      expect(computeFittedVideoBox(760, 360)).toEqual({ width: 640, height: 360 });
      expect(computeFittedVideoBox(1280, 720)).toEqual({ width: 1280, height: 720 });

      // Verify accurate watchedSecondsMap calculation overrides binary-only percentage
      const secTree = buildCourseHierarchy(
        {
          ...courseObj,
          lessonOutline: res.lessonOutline.map((item, i) => ({
            ...item,
            durationSeconds: i === 0 ? 600 : 1800,
          })),
        },
        null,
        [],
        { l1: 600, l2: 600 }
      );
      // 1200 / 2400 = 50%
      expect(secTree[0].chapters[0].topics[0].progressPct).toBe(50);
    });
  });
});
