import { describe, it, expect, beforeEach } from "vitest";
import {
  buildActivityId,
  calculateAccuracy,
  calculateHonestDuration,
  getLocalCachedActivities,
  saveLocalCachedActivities,
  sanitizeFirestoreData,
  syncFromSubmission,
  syncFromPracticeResult,
} from "./learningActivityService";
import type { ActivityLifecycleEvent, LearningActivity } from "../types/learningActivity";

describe("learningActivityService", () => {
  describe("buildActivityId", () => {
    it("generates deterministic and sanitized activity IDs", () => {
      const id1 = buildActivityId("user/123", "formal_exam", "sub-abc-456");
      expect(id1).toBe("act_user_123_formal_exam_sub-abc-456");

      const id2 = buildActivityId("student@test", "practice_session", "session 99");
      expect(id2).toBe("act_student_test_practice_session_session_99");
    });
  });

  describe("calculateAccuracy", () => {
    it("handles zero answered questions gracefully without dividing by zero", () => {
      expect(calculateAccuracy(0, 0)).toBe(0);
      expect(calculateAccuracy(5, 0)).toBe(0);
      expect(calculateAccuracy(0, -1)).toBe(0);
    });

    it("calculates accurate rounded percentages", () => {
      expect(calculateAccuracy(10, 10)).toBe(100);
      expect(calculateAccuracy(1, 3)).toBe(33.3);
      expect(calculateAccuracy(2, 3)).toBe(66.7);
      expect(calculateAccuracy(7, 10)).toBe(70);
    });
  });

  describe("calculateHonestDuration", () => {
    it("returns zero durations for empty lifecycle events", () => {
      const result = calculateHonestDuration([]);
      expect(result.activeDurationSeconds).toBe(0);
      expect(result.totalDurationSeconds).toBe(0);
    });

    it("honestly subtracts paused periods from active study time", () => {
      // Timeline:
      // T+0s: start
      // T+60s: pause (active = 60s)
      // T+180s: resume (paused for 120s)
      // T+240s: complete (active = 60 + 60 = 120s, total = 240s)
      const base = new Date("2026-10-09T10:00:00Z").getTime();
      const events: ActivityLifecycleEvent[] = [
        { event: "start", timestamp: new Date(base).toISOString() },
        { event: "pause", timestamp: new Date(base + 60000).toISOString() },
        { event: "resume", timestamp: new Date(base + 180000).toISOString() },
        { event: "complete", timestamp: new Date(base + 240000).toISOString() },
      ];

      const res = calculateHonestDuration(events);
      expect(res.activeDurationSeconds).toBe(120);
      expect(res.totalDurationSeconds).toBe(240);
    });
  });

  describe("Local cache operations", () => {
    const studentUid = "test_student_cache_01";
    const store = new Map<string, string>();

    beforeEach(() => {
      store.clear();
      globalThis.localStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, val: string) => store.set(key, String(val)),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        key: (idx: number) => Array.from(store.keys())[idx] ?? null,
        length: store.size,
      } as any;
    });

    it("saves and retrieves cached activities correctly", () => {
      const mockActivity: LearningActivity = {
        id: "act_test_01",
        studentUid,
        studentUsername: "test_user",
        origin: "practice_session",
        title: "Test Activity",
        subject: "Toán",
        status: "completed",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        activeDurationSeconds: 150,
        totalDurationSeconds: 180,
        totalQuestions: 10,
        answeredQuestions: 10,
        correctQuestions: 9,
        accuracy: 90,
        lifecycleEvents: [],
        isCountedInStreak: true,
        isCountedInMastery: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveLocalCachedActivities(studentUid, [mockActivity]);
      const retrieved = getLocalCachedActivities(studentUid);
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].id).toBe("act_test_01");
      expect(retrieved[0].accuracy).toBe(90);
    });
  });

  describe("sanitizeFirestoreData", () => {
    it("strips top-level and nested undefined fields without altering defined values", () => {
      const input = {
        id: "test_doc",
        gradeCategory: undefined,
        subject: "Toán",
        count: 0,
        isActive: false,
        nested: {
          emptyField: undefined,
          validField: "hello",
          deeper: {
            undef: undefined,
            val: 42,
          },
        },
        items: [1, undefined, "three", { subUndef: undefined, subVal: true }],
      };

      const result = sanitizeFirestoreData(input);

      expect(result).toEqual({
        id: "test_doc",
        subject: "Toán",
        count: 0,
        isActive: false,
        nested: {
          validField: "hello",
          deeper: {
            val: 42,
          },
        },
        items: [1, "three", { subVal: true }],
      });
      expect("gradeCategory" in result).toBe(false);
      expect("emptyField" in (result as any).nested).toBe(false);
    });

    it("handles primitives, null, and dates safely", () => {
      const date = new Date();
      expect(sanitizeFirestoreData(null)).toBe(null);
      expect(sanitizeFirestoreData(undefined)).toBe(null);
      expect(sanitizeFirestoreData("string")).toBe("string");
      expect(sanitizeFirestoreData(123)).toBe(123);
      expect(sanitizeFirestoreData(date)).toBe(date);
    });

    it("preserves Firestore FieldValues and Timestamps without stripping or corrupting them", () => {
      const mockServerTimestamp = { _methodName: "serverTimestamp" };
      const mockDelegateFieldValue = { _delegate: { type: "serverTimestamp" } };
      const mockTimestamp = { toDate: () => new Date() };

      const input = {
        title: "Test",
        createdAt: mockServerTimestamp,
        updatedAt: mockDelegateFieldValue,
        submittedAt: mockTimestamp,
        strayUndefined: undefined,
      };

      const sanitized = sanitizeFirestoreData(input);
      expect(sanitized.createdAt).toBe(mockServerTimestamp);
      expect(sanitized.updatedAt).toBe(mockDelegateFieldValue);
      expect(sanitized.submittedAt).toBe(mockTimestamp);
      expect("strayUndefined" in sanitized).toBe(false);
    });
  });

  describe("syncFromSubmission and syncFromPracticeResult undefined resilience", () => {
    it("syncs from minimal submission and exam without any undefined fields crashing Firestore", async () => {
      const mockSub: any = {
        id: "sub_test_minimal_01",
        examId: "exam_test_01",
        score: 8,
        maxScore: 10,
        correctCount: 8,
        totalCount: 10,
        answers: {},
        // gradeCategory, studentDisplayName, etc. are omitted / undefined
      };

      const mockExam: any = {
        id: "exam_test_01",
        title: "Test Exam",
        // gradeCategory is undefined
      };

      const activity = await syncFromSubmission(mockSub, mockExam, "student_123");
      expect(activity.id).toBeDefined();
      expect(activity.gradeCategory).toBe(null);
      expect(activity.studentDisplayName).toBe(null);

      const sanitized = sanitizeFirestoreData(activity);
      expect(sanitized.gradeCategory).toBe(null);
      // Ensure no undefined values remain anywhere in sanitized object
      const jsonStr = JSON.stringify(sanitized);
      expect(jsonStr).not.toContain("undefined");
    });

    it("syncs from practice result without gradeCategory or displayName being undefined", async () => {
      const mockPracticeResult: any = {
        sessionId: "session_001",
        modeTitle: "Luyện đề Toán 12",
        category: "math",
        score: 10,
        totalQuestions: 10,
        answeredCount: 10,
        correctCount: 10,
        accuracy: 100,
        durationSeconds: 300,
      };

      const activity = await syncFromPracticeResult(mockPracticeResult, "student_456", "hocsinh_gioi");
      expect(activity.id).toBeDefined();
      expect(activity.gradeCategory).toBe(null);
      expect(activity.studentDisplayName).toBe("hocsinh_gioi");

      const sanitized = sanitizeFirestoreData(activity);
      expect(sanitized.gradeCategory).toBe(null);
      const jsonStr = JSON.stringify(sanitized);
      expect(jsonStr).not.toContain("undefined");
    });
  });
});

