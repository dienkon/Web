import { describe, it, expect } from "vitest";
import {
  buildCourseHierarchy,
  computeCourseResourceAccess,
  resolveCourseResourcePolicy,
} from "./courseService";
import type { Course, CourseAccessInfo, CourseLessonOutlineItem } from "../types";

function makeCourse(overrides?: Partial<Course>): Course {
  const lessons: CourseLessonOutlineItem[] = [
    {
      id: "l1",
      chapterId: "ch1",
      topicTitle: "Chuyên đề 1",
      title: "Bài 1 (Free preview)",
      order: 0,
      videoType: "youtube",
      accessType: "free",
      isFreeEffective: true,
      priceVnd: 0,
      includedInCourseUnlock: true,
      materialItems: [{ id: "m1", label: "PDF 1", type: "file" }],
      linkedExamId: "ex1",
    },
    {
      id: "l2",
      chapterId: "ch1",
      topicTitle: "Chuyên đề 1",
      title: "Bài 2 (Paid)",
      order: 1,
      videoType: "youtube",
      accessType: "paid",
      isFreeEffective: false,
      priceVnd: 20000,
      includedInCourseUnlock: true,
      materialItems: [{ id: "m2", label: "PDF 2", type: "file" }],
      linkedExamId: "ex2",
    },
    {
      id: "l3",
      chapterId: "ch1",
      topicTitle: "Chuyên đề 1",
      title: "Bài 3 (Paid)",
      order: 2,
      videoType: "youtube",
      accessType: "paid",
      isFreeEffective: false,
      priceVnd: 20000,
      includedInCourseUnlock: true,
      materialItems: [{ id: "m3", label: "PDF 3", type: "file" }],
      linkedExamId: "ex3",
    },
    {
      id: "l4",
      chapterId: "ch1",
      topicTitle: "Chuyên đề 2",
      title: "Bài 4 (Paid)",
      order: 3,
      videoType: "youtube",
      accessType: "paid",
      isFreeEffective: false,
      priceVnd: 25000,
      includedInCourseUnlock: true,
      materialItems: [{ id: "m4", label: "PDF 4", type: "file" }],
      linkedExamId: "ex4",
    },
  ];

  return {
    id: "course_1",
    title: "Khóa Toán 12",
    status: "published",
    accessMode: "per_video",
    priceVnd: 0,
    salesEnabled: true,
    unlockFullPolicy: "unlock_all_videos",
    freePreviewCount: 1,
    allowSingleLessonPurchase: true,
    chapters: [{ id: "ch1", title: "Chương 1", order: 0 }],
    lessonOutline: lessons,
    lessonCount: lessons.length,
    freeLessonCount: 1,
    paidLessonCount: 3,
    ...overrides,
  };
}

function makeAccess(unlockedLessonIds: string[], unlockedCourse = false): CourseAccessInfo {
  return {
    hasCourseAccess: unlockedCourse,
    isFreeCourse: false,
    unlockedCourse,
    unlockedLessonIds,
    priceVnd: 0,
    accessMode: "per_video",
    salesEnabled: true,
    unlockFullPolicy: "unlock_all_videos",
    freePreviewCount: 1,
    allowSingleLessonPurchase: true,
    userBalance: 100000,
    missingVnd: 0,
    canUnlockCourse: false,
    courseTitle: "Khóa Toán 12",
  };
}

describe("Course resource unlock rules (ON/OFF & scopes)", () => {
  it("defaults to ON with any_video_in_topic scope", () => {
    const policy = resolveCourseResourcePolicy(makeCourse());
    expect(policy.enabled).toBe(true);
    expect(policy.unlockMaterials).toBe(true);
    expect(policy.unlockExams).toBe(true);
    expect(policy.scope).toBe("any_video_in_topic");
  });

  it("any_video_in_topic does NOT leak paid materials via free preview, but unlocks all topic materials once 1 paid video in topic is unlocked", () => {
    const course = makeCourse({ resourceUnlockScope: "any_video_in_topic" });
    const l2 = course.lessonOutline[1];
    const l3 = course.lessonOutline[2];
    const l4 = course.lessonOutline[3];

    // Before buying any paid video -> l2 & l3 stay locked
    expect(computeCourseResourceAccess(course, l2, makeAccess([]), "material").canAccess).toBe(false);
    expect(computeCourseResourceAccess(course, l3, makeAccess([]), "exam").canAccess).toBe(false);

    // Buy l2 (1 paid video in Chuyên đề 1) -> BOTH l2 AND l3 materials/exams unlock, while Chuyên đề 2 (l4) stays locked!
    const accL2 = makeAccess(["l2"]);
    expect(computeCourseResourceAccess(course, l2, accL2, "material").canAccess).toBe(true);
    expect(computeCourseResourceAccess(course, l3, accL2, "material")).toMatchObject({
      canAccess: true,
      unlockedByPolicy: true,
    });
    expect(computeCourseResourceAccess(course, l3, accL2, "exam").canAccess).toBe(true);
    expect(computeCourseResourceAccess(course, l4, accL2, "material").canAccess).toBe(false);
  });

  it("full_topic requires unlocking ALL videos in the topic before unlocking materials/exams", () => {
    const course = makeCourse({ resourceUnlockScope: "full_topic" });
    const l2 = course.lessonOutline[1];
    const l3 = course.lessonOutline[2];

    // Only l2 unlocked (l3 still locked) -> blocked!
    expect(computeCourseResourceAccess(course, l2, makeAccess(["l2"]), "material").canAccess).toBe(false);
    // Both l2 & l3 unlocked (l1 is free) -> entire topic unlocked!
    expect(computeCourseResourceAccess(course, l2, makeAccess(["l2", "l3"]), "material").canAccess).toBe(true);
    expect(computeCourseResourceAccess(course, l3, makeAccess(["l2", "l3"]), "exam").canAccess).toBe(true);
  });

  it("full_chapter requires unlocking ALL videos in the chapter", () => {
    const course = makeCourse({ resourceUnlockScope: "full_chapter" });
    const l2 = course.lessonOutline[1];

    expect(computeCourseResourceAccess(course, l2, makeAccess(["l2", "l3"]), "material").canAccess).toBe(false);
    expect(computeCourseResourceAccess(course, l2, makeAccess(["l2", "l3", "l4"]), "material").canAccess).toBe(true);
  });

  it("OFF toggle blocks automatic resource unlock on per-video unlock unless full course is unlocked", () => {
    const course = makeCourse({ unlockResourcesWithVideo: false });
    const l2 = course.lessonOutline[1];

    expect(computeCourseResourceAccess(course, l2, makeAccess(["l2"]), "material").canAccess).toBe(false);
    expect(computeCourseResourceAccess(course, l2, makeAccess(["l2"]), "exam").canAccess).toBe(false);
    expect(computeCourseResourceAccess(course, l2, makeAccess([], true), "material").canAccess).toBe(true);
  });

  it("supports separate material vs exam toggles and reflects them in buildCourseHierarchy", () => {
    const course = makeCourse({
      unlockResourcesWithVideo: true,
      unlockMaterialsWithVideo: true,
      unlockExamsWithVideo: false,
      resourceUnlockScope: "any_video_in_topic",
    });

    const groups = buildCourseHierarchy(course, makeAccess(["l2"]), []);
    const topic1 = groups[0].chapters[0].topics[0];
    expect(topic1.materials.every((m) => m.canAccess)).toBe(true);
    expect(topic1.exams.every((e) => !e.canAccess)).toBe(true);
  });
});
