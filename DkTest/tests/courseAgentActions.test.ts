import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyCourseOperationToState, type MutableCourseState } from "../src/services/courseAgentActions";
import * as courseService from "../src/services/courseService";

function makeBaseCourseState(): MutableCourseState {
  return {
    courseId: "course_1",
    title: "Toán 12 Chuyên Sâu",
    code: "TOAN12",
    description: "",
    thumbnailUrl: "",
    subject: "TOÁN HỌC",
    gradeCategory: "Lớp 12",
    instructorName: "Thầy A",
    status: "draft",
    isFeatured: false,
    accessMode: "per_video",
    priceVnd: 0,
    originalPriceVnd: 0,
    defaultLessonPriceVnd: 25000,
    salesEnabled: true,
    unlockFullPolicy: "unlock_all_videos",
    freePreviewCount: 1,
    allowSingleLessonPurchase: true,
    chapters: [{ id: "ch_1", title: "Chương 1: Hàm số", groupTitle: "TOÁN HỌC", order: 0 }],
    lessons: [
      {
        id: "les_1",
        courseId: "course_1",
        chapterId: "ch_1",
        topicTitle: "Đơn điệu",
        title: "Bài 1: Khái niệm đơn điệu",
        order: 0,
        durationMinutes: 20,
        durationSeconds: 1200,
        videoType: "youtube",
        videoUrl: "https://youtube.com/watch?v=abc123456",
        accessType: "free",
        priceVnd: 0,
        includedInCourseUnlock: true,
        materials: [],
      },
    ],
    deletedLessonIds: [],
    selectedLessonId: "les_1",
  };
}

describe("courseAgentActions mutation engine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("adds a Google Drive video lesson, auto-creates a missing chapter, and auto-probes duration", async () => {
    const spy = vi
      .spyOn(courseService, "probeVideoDurationApi")
      .mockResolvedValue({ durationSeconds: 1850, durationMinutes: 31, source: "drive_mp4_head" });

    const base = makeBaseCourseState();
    const { nextState, message } = await applyCourseOperationToState(base, "ADD_COURSE_LESSONS", {
      chapterTitle: "Chương 2: Tích phân",
      topicTitle: "Nguyên hàm",
      title: "Bài 2: Nguyên hàm cơ bản",
      videoUrl: "https://drive.google.com/file/d/1DriveTestVideo99/view",
      priceVnd: 35000,
      accessType: "paid",
    });

    expect(spy).toHaveBeenCalledWith("https://drive.google.com/file/d/1DriveTestVideo99/view");
    expect(nextState.chapters).toHaveLength(2);
    expect(nextState.chapters[1].title).toBe("Chương 2: Tích phân");
    expect(nextState.lessons).toHaveLength(2);
    expect(nextState.lessons[1]).toMatchObject({
      title: "Bài 2: Nguyên hàm cơ bản",
      videoType: "iframe",
      durationSeconds: 1850,
      durationMinutes: 31,
      priceVnd: 35000,
      accessType: "paid",
      chapterId: nextState.chapters[1].id,
      topicTitle: "Nguyên hàm",
    });
    expect(message).toContain("Nguyên hàm cơ bản");
  });

  it("updates a lesson by 1-based lessonNumber or selectedLessonId and adds materials", async () => {
    const base = makeBaseCourseState();
    const { nextState } = await applyCourseOperationToState(base, "UPDATE_COURSE_LESSON", {
      lessonNumber: 1,
      updates: {
        title: "Bài 1: Đơn điệu (Cập nhật)",
        durationMinutes: 30,
        addMaterials: [{ label: "Đề luyện tập", type: "link", url: "https://dktest.example/doc.pdf" }],
      },
    });

    expect(nextState.lessons[0].title).toBe("Bài 1: Đơn điệu (Cập nhật)");
    expect(nextState.lessons[0].durationMinutes).toBe(30);
    expect(nextState.lessons[0].durationSeconds).toBe(1800);
    expect(nextState.lessons[0].materials).toHaveLength(1);
    expect(nextState.lessons[0].materials![0].label).toBe("Đề luyện tập");
  });

  it("deletes a lesson cleanly, tracks deletedLessonIds, and re-indexes remaining orders", async () => {
    const base = makeBaseCourseState();
    base.lessons.push({
      ...base.lessons[0],
      id: "les_2",
      title: "Bài 2: Cực trị",
      order: 1,
    });

    const { nextState } = await applyCourseOperationToState(base, "DELETE_COURSE_LESSON", {
      lessonTitle: "Khái niệm đơn điệu",
    });

    expect(nextState.lessons).toHaveLength(1);
    expect(nextState.lessons[0].id).toBe("les_2");
    expect(nextState.lessons[0].order).toBe(0);
    expect(nextState.deletedLessonIds).toContain("les_1");
  });

  it("probes missing durations for all Drive/YouTube videos via PROBE_COURSE_DURATIONS", async () => {
    vi.spyOn(courseService, "probeVideoDurationApi").mockResolvedValue({
      durationSeconds: 2400,
      durationMinutes: 40,
      source: "drive_preview",
    });

    const base = makeBaseCourseState();
    base.lessons.push({
      ...base.lessons[0],
      id: "les_drive",
      title: "Video Drive chưa đo",
      videoType: "iframe",
      videoUrl: "https://drive.google.com/file/d/1DriveMissingDur99/view",
      durationMinutes: 0,
      durationSeconds: 0,
      order: 1,
    });

    const { nextState, data } = await applyCourseOperationToState(base, "PROBE_COURSE_DURATIONS", {
      onlyMissing: true,
    });

    expect(data.updatedCount).toBe(1);
    expect(nextState.lessons[1].durationSeconds).toBe(2400);
    expect(nextState.lessons[1].durationMinutes).toBe(40);
  });
});
