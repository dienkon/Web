import { describe, it, expect } from "vitest";
import { generateLearningRecommendations } from "./learningRecommendationService";
import type { TopicMastery } from "../types/topicMastery";
import type { LearningActivity } from "../types/learningActivity";
import type { RevisionProgram } from "../types/revisionProgram";

describe("learningRecommendationService", () => {
  const studentUid = "test_user_rec";

  it("recommends remedy drill when student has weak topics", () => {
    const weakTopic: TopicMastery = {
      id: "mastery_1",
      studentUid,
      studentUsername: "user",
      subject: "Toán",
      topicId: "dao_ham",
      topicName: "Đạo hàm & Cực trị",
      confidenceLevel: "needs_foundation",
      totalAttempts: 10,
      correctAttempts: 4,
      accuracy: 40,
      recentAccuracy: 40,
      recentQuestionsCount: 10,
      evidenceHistory: [],
      lastPracticedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const recs = generateLearningRecommendations({
      studentUid,
      topicMastery: [weakTopic],
      recentActivities: [],
      activePrograms: [],
      todayTasks: [],
    });

    const remedyRec = recs.find((r) => r.reasonCode === "REC_REMEDY_WEAK_TOPIC");
    expect(remedyRec).toBeDefined();
    expect(remedyRec?.priority).toBe("high");
    expect(remedyRec?.reasonExplanation).toContain("40%");
  });

  it("recommends retake when recent exam had mistakes", () => {
    const mockActivity: LearningActivity = {
      id: "act_exam_01",
      studentUid,
      studentUsername: "user",
      origin: "formal_exam",
      sourceExamId: "exam_123",
      title: "Thi thử Giữa kỳ 1",
      subject: "Toán",
      status: "completed",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      activeDurationSeconds: 1800,
      totalDurationSeconds: 1800,
      totalQuestions: 20,
      answeredQuestions: 20,
      correctQuestions: 14,
      accuracy: 70, // < 85%
      lifecycleEvents: [],
      isCountedInStreak: true,
      isCountedInMastery: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const recs = generateLearningRecommendations({
      studentUid,
      topicMastery: [],
      recentActivities: [mockActivity],
      activePrograms: [],
      todayTasks: [],
    });

    const retakeRec = recs.find((r) => r.reasonCode === "REC_RETAKE_WRONG_EXAM");
    expect(retakeRec).toBeDefined();
    expect(retakeRec?.sourceExamId).toBe("exam_123");
    expect(retakeRec?.evidenceData?.wrongQuestionsCount).toBe(6);
  });

  it("recommends spaced review when a topic hasn't been practiced for 7+ days", () => {
    const staleDate = new Date(Date.now() - 8 * 86400000).toISOString();
    const staleTopic: TopicMastery = {
      id: "mastery_stale",
      studentUid,
      studentUsername: "user",
      subject: "Vật Lý",
      topicId: "dao_dong_co",
      topicName: "Dao động cơ",
      confidenceLevel: "progressing",
      totalAttempts: 15,
      correctAttempts: 12,
      accuracy: 80,
      recentAccuracy: 80,
      recentQuestionsCount: 15,
      evidenceHistory: [],
      lastPracticedAt: staleDate,
      createdAt: staleDate,
      updatedAt: staleDate,
    };

    const recs = generateLearningRecommendations({
      studentUid,
      topicMastery: [staleTopic],
      recentActivities: [],
      activePrograms: [],
      todayTasks: [],
    });

    const spacedRec = recs.find((r) => r.reasonCode === "REC_REVIEW_SPACED");
    expect(spacedRec).toBeDefined();
    expect(spacedRec?.topicId).toBe("dao_dong_co");
    expect(spacedRec?.actionRoute).toContain("subject=physics");
    expect(spacedRec?.actionRoute).toContain("mode=physics-thermal-gas");
  });

  it("routes weak chemistry topics to chemistry mode", () => {
    const chemWeak: TopicMastery = {
      id: "mastery_chem",
      studentUid,
      studentUsername: "user",
      subject: "Hóa Học",
      topicId: "este_lipit",
      topicName: "Este - Lipit",
      confidenceLevel: "needs_foundation",
      totalAttempts: 10,
      correctAttempts: 3,
      accuracy: 30,
      recentAccuracy: 30,
      recentQuestionsCount: 10,
      evidenceHistory: [],
      lastPracticedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const recs = generateLearningRecommendations({
      studentUid,
      topicMastery: [chemWeak],
      recentActivities: [],
      activePrograms: [],
      todayTasks: [],
    });

    const remedyRec = recs.find((r) => r.reasonCode === "REC_REMEDY_WEAK_TOPIC");
    expect(remedyRec).toBeDefined();
    expect(remedyRec?.actionRoute).toContain("subject=chemistry");
    expect(remedyRec?.actionRoute).toContain("mode=chemistry-ester-lipid");
  });

  it("falls back to maintain daily pace when no other conditions are met", () => {
    const recs = generateLearningRecommendations({
      studentUid,
      topicMastery: [],
      recentActivities: [],
      activePrograms: [],
      todayTasks: [],
    });

    expect(recs.length).toBe(1);
    expect(recs[0].reasonCode).toBe("REC_MAINTAIN_PACE");
  });
});
