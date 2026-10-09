import { describe, it, expect } from "vitest";
import {
  scheduleRevisionTasks,
  getNextStudyDate,
  addDays,
} from "./revisionTaskScheduler";
import type { RevisionProgramConfigInput } from "../types/revisionProgram";

describe("revisionTaskScheduler", () => {
  const baseConfig: RevisionProgramConfigInput = {
    studentUid: "uid_student_01",
    studentUsername: "student01",
    type: "exam_countdown",
    subject: "Toán",
    dailyTargetMinutes: 30,
    weeklyDays: [1, 2, 3, 4, 5], // Monday through Friday
    topics: ["Hàm số", "Tích phân", "Hình Oxyz"],
    targetExamDate: "2027-06-11",
  };

  describe("getNextStudyDate", () => {
    it("returns next allowed weekday when starting on weekend", () => {
      // 2026-10-10 is a Saturday (day 6)
      const sat = "2026-10-10";
      const nextStudy = getNextStudyDate(sat, [1, 2, 3, 4, 5]);
      // Should roll over to Monday 2026-10-12
      expect(nextStudy).toBe("2026-10-12");
    });

    it("keeps current date if already on an allowed day", () => {
      // 2026-10-12 is a Monday (day 1)
      const mon = "2026-10-12";
      const result = getNextStudyDate(mon, [1, 2, 3, 4, 5]);
      expect(result).toBe("2026-10-12");
    });
  });

  describe("scheduleRevisionTasks - 7 program types", () => {
    it("schedules exam_countdown with phase 1, phase 2, and sprint phase", () => {
      const tasks = scheduleRevisionTasks("prog_cd_01", baseConfig, "2026-10-12");
      expect(tasks.length).toBeGreaterThanOrEqual(4);
      expect(tasks[0].taskType).toBe("topic_quiz");
      const hasFullExam = tasks.some((t) => t.taskType === "full_exam");
      const hasMistakeReview = tasks.some((t) => t.taskType === "review_mistakes");
      expect(hasFullExam).toBe(true);
      expect(hasMistakeReview).toBe(true);
    });

    it("schedules weakness_remedy focusing on review and repair", () => {
      const tasks = scheduleRevisionTasks(
        "prog_wr_01",
        { ...baseConfig, type: "weakness_remedy" },
        "2026-10-12"
      );
      expect(tasks.length).toBe(6); // 2 tasks per each of 3 topics
      expect(tasks[0].taskType).toBe("review_mistakes");
      expect(tasks[1].taskType).toBe("practice");
    });

    it("schedules topic_deep_dive with foundational and advanced steps", () => {
      const tasks = scheduleRevisionTasks(
        "prog_dd_01",
        { ...baseConfig, type: "topic_deep_dive" },
        "2026-10-12"
      );
      expect(tasks.length).toBe(6);
      expect(tasks[0].taskType).toBe("topic_quiz");
      expect(tasks[1].taskType).toBe("practice");
    });

    it("schedules maintenance_spaced with expanding Fibonacci/Ebbinghaus intervals", () => {
      const tasks = scheduleRevisionTasks(
        "prog_ms_01",
        { ...baseConfig, type: "maintenance_spaced" },
        "2026-10-12"
      );
      expect(tasks.length).toBe(5); // 1, 3, 7, 14, 28 days
      expect(tasks[0].title).toContain("mốc 1");
      expect(tasks[4].title).toContain("mốc 5");
    });

    it("schedules speed_drill sessions", () => {
      const tasks = scheduleRevisionTasks(
        "prog_sd_01",
        { ...baseConfig, type: "speed_drill" },
        "2026-10-12"
      );
      expect(tasks.length).toBe(6);
      expect(tasks.every((t) => t.taskType === "speed_drill")).toBe(true);
    });

    it("schedules retake_mastery linking to past exams", () => {
      const tasks = scheduleRevisionTasks(
        "prog_rm_01",
        { ...baseConfig, type: "retake_mastery", sourceExamIds: ["exam_01", "exam_02"] },
        "2026-10-12"
      );
      expect(tasks.length).toBe(4);
      expect(tasks[0].sourceExamId).toBe("exam_01");
      expect(tasks[2].sourceExamId).toBe("exam_02");
    });

    it("schedules comprehensive_prep balanced plan", () => {
      const tasks = scheduleRevisionTasks(
        "prog_cp_01",
        { ...baseConfig, type: "comprehensive_prep" },
        "2026-10-12"
      );
      expect(tasks.length).toBe(4); // 3 topics + 1 final checkpoint
      expect(tasks[tasks.length - 1].title).toContain("giữa kỳ");
    });
  });
});
