import { describe, it, expect, beforeEach } from "vitest";
import {
  COMPANION_PROFILES,
  getCompanionPreferences,
  saveCompanionPreferences,
  generateCompanionGuidance,
} from "./companionService";
import type { RevisionTask } from "../../../types/revisionProgram";
import type { TopicMastery } from "../../../types/topicMastery";

describe("companionService", () => {
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

  it("contains 4 unique companion profiles", () => {
    expect(Object.keys(COMPANION_PROFILES)).toHaveLength(4);
    expect(COMPANION_PROFILES.owl.name).toBe("Sparky");
    expect(COMPANION_PROFILES.robot.name).toBe("Byte");
    expect(COMPANION_PROFILES.fox.name).toBe("Lumi");
    expect(COMPANION_PROFILES.orb.name).toBe("Astra");
  });

  it("saves and loads student companion preferences", () => {
    const studentUid = "student_companion_test";
    const initial = getCompanionPreferences(studentUid);
    expect(initial.selectedArchetype).toBe("owl");
    expect(initial.isEnabled).toBe(true);

    saveCompanionPreferences({
      ...initial,
      selectedArchetype: "robot",
      hintsEnabled: false,
    });

    const reloaded = getCompanionPreferences(studentUid);
    expect(reloaded.selectedArchetype).toBe("robot");
    expect(reloaded.hintsEnabled).toBe(false);
  });

  it("prioritizes due revision tasks in companion guidance", () => {
    const mockTask: RevisionTask = {
      id: "task_1",
      programId: "prog_1",
      studentUid: "s1",
      orderIndex: 1,
      title: "Ôn tập Hàm Số Đồng Biến",
      description: "Ôn tập kiến thức",
      taskType: "topic_quiz",
      targetSubject: "Toán",
      targetTopic: "Hàm Số Đồng Biến",
      targetQuestionsCount: 5,
      estimatedMinutes: 10,
      dueDate: "2026-10-09",
      status: "pending",
      rescheduleCount: 0,
      createdAt: "2026-10-09",
      updatedAt: "2026-10-09",
    };

    const guidance = generateCompanionGuidance({
      subject: "math",
      currentLevel: 5,
      dueTasks: [mockTask],
    });

    expect(guidance.text).toContain("Hàm Số Đồng Biến");
    expect(guidance.actionLabel).toBe("Ôn tập ngay");
  });

  it("warns about checkpoint milestone preparation when currentLevel is at checkpoint", () => {
    const guidance = generateCompanionGuidance({
      subject: "math",
      currentLevel: 10, // Checkpoint
      dueTasks: [],
    });

    expect(guidance.text).toContain("Trạm kiểm soát then chốt");
    expect(guidance.actionLabel).toBe("Vào thử thách");
  });

  it("points to weak topic when topic accuracy is critically low", () => {
    const mockWeak: TopicMastery = {
      id: "s1_toan_top_cuc_tri",
      studentUid: "s1",
      studentUsername: "user1",
      subject: "Toán",
      topicId: "top_cuc_tri",
      topicName: "Cực trị hàm bậc 4",
      confidenceLevel: "needs_foundation",
      totalAttempts: 10,
      correctAttempts: 4,
      accuracy: 40,
      recentAccuracy: 40,
      recentQuestionsCount: 10,
      evidenceHistory: [],
      lastPracticedAt: "2026-10-08",
      createdAt: "2026-10-08",
      updatedAt: "2026-10-08",
    };

    const guidance = generateCompanionGuidance({
      subject: "math",
      currentLevel: 3,
      dueTasks: [],
      weakTopics: [mockWeak],
    });

    expect(guidance.text).toContain("Cực trị hàm bậc 4");
    expect(guidance.text).toContain("40%");
  });
});
