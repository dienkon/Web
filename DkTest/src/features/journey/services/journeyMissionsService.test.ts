import { describe, it, expect } from "vitest";
import { generateDailyMissions } from "./journeyMissionsService";
import type { StudentLearningStats } from "../../../types/learningActivity";

describe("journeyMissionsService", () => {
  const dummyStats: StudentLearningStats = {
    totalActivitiesCompleted: 5,
    totalActiveStudyMinutes: 20,
    averageAccuracy: 84,
    formalExamsCount: 2,
    practiceSessionsCount: 2,
    oldExamReviewsCount: 1,
    journeyChallengesCount: 0,
    currentStreakDays: 3,
    lastActiveDate: "2026-10-09",
  };

  it("generates 3 structured daily missions for active math subject", () => {
    const missions = generateDailyMissions({
      activeSubject: "math",
      currentLevel: 4,
      stats: dummyStats,
    });

    expect(missions).toHaveLength(3);

    const conquerMission = missions.find((m) => m.id === "mission_conquer_level");
    expect(conquerMission).toBeDefined();
    expect(conquerMission?.title).toContain("Toán Học");
    expect(conquerMission?.actionLevel).toBe(4);
    expect(conquerMission?.isCompleted).toBe(false);

    const studyMission = missions.find((m) => m.id === "mission_study_time");
    expect(studyMission).toBeDefined();
    expect(studyMission?.currentCount).toBe(15); // capped at 15
    expect(studyMission?.isCompleted).toBe(true);

    const sprintMission = missions.find((m) => m.id === "mission_checkpoint_sprint");
    expect(sprintMission).toBeDefined();
    expect(sprintMission?.targetCount).toBe(10); // currentLevel 4 <= 10 -> target is 10
  });

  it("handles physics and chemistry labels properly", () => {
    const physMissions = generateDailyMissions({
      activeSubject: "physics",
      currentLevel: 12,
      stats: { ...dummyStats, totalActiveStudyMinutes: 10 },
    });
    expect(physMissions[0].title).toContain("Vật Lý");
    expect(physMissions[0].actionLevel).toBe(12);
    // currentLevel 12 <= 25 -> target is 25
    expect(physMissions[2].targetCount).toBe(25);

    const chemMissions = generateDailyMissions({
      activeSubject: "chemistry",
      currentLevel: 28,
      stats: { ...dummyStats, totalActiveStudyMinutes: 5 },
    });
    expect(chemMissions[0].title).toContain("Hóa Học");
    expect(chemMissions[0].actionLevel).toBe(28);
    // currentLevel 28 <= 40 -> target is 40
    expect(chemMissions[2].targetCount).toBe(40);
  });

  it("correctly identifies uncompleted study time when under 15 minutes", () => {
    const missions = generateDailyMissions({
      activeSubject: "math",
      currentLevel: 1,
      stats: { ...dummyStats, totalActiveStudyMinutes: 8 },
    });

    const studyMission = missions.find((m) => m.id === "mission_study_time");
    expect(studyMission?.currentCount).toBe(8);
    expect(studyMission?.isCompleted).toBe(false);
  });

  it("completes checkpoint sprint mission when current level reaches 50", () => {
    const missions = generateDailyMissions({
      activeSubject: "math",
      currentLevel: 50,
      stats: dummyStats,
    });

    const sprintMission = missions.find((m) => m.id === "mission_checkpoint_sprint");
    expect(sprintMission?.targetCount).toBe(50);
    expect(sprintMission?.currentCount).toBe(50);
    expect(sprintMission?.isCompleted).toBe(true);
  });
});
