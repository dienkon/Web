import { describe, it, expect } from "vitest";
import {
  cognitiveLevelToDifficulty,
  computeCognitiveLevelDistribution,
  computeCognitiveLevelPerformance,
  resolveQuestionCognitiveLevel,
} from "./cognitiveLevelUtils";
import { buildSubExamAttempt } from "../features/sub-exam/engine/buildSubExamAttempt";
import type { Question, Submission } from "../types";

function makeQuestion(id: string, level?: any, difficulty?: any): Question {
  return {
    id,
    examId: "exam_test",
    type: "single_choice",
    text: `Câu hỏi ${id}`,
    order: Number(id.replace(/\D/g, "")) || 0,
    points: 1,
    level,
    difficulty,
    options: [
      { id: "A", text: "Đáp án A" },
      { id: "B", text: "Đáp án B" },
    ],
    correctOptionIds: ["A"],
  };
}

describe("Cognitive level utilities & sub-exam matrix selection (NB/TH/VD/VDC)", () => {
  it("resolves explicit level, Vietnamese labels, and falls back to legacy difficulty", () => {
    expect(resolveQuestionCognitiveLevel(makeQuestion("q1", "VDC"))).toBe("VDC");
    expect(resolveQuestionCognitiveLevel(makeQuestion("q2", "Nhận biết"))).toBe("NB");
    expect(resolveQuestionCognitiveLevel(makeQuestion("q3", undefined, "easy"))).toBe("NB");
    expect(resolveQuestionCognitiveLevel(makeQuestion("q4", undefined, "medium"))).toBe("TH");
    expect(resolveQuestionCognitiveLevel(makeQuestion("q5", undefined, "hard"))).toBe("VD");
    expect(cognitiveLevelToDifficulty("NB")).toBe("easy");
    expect(cognitiveLevelToDifficulty("TH")).toBe("medium");
    expect(cognitiveLevelToDifficulty("VD")).toBe("hard");
    expect(cognitiveLevelToDifficulty("VDC")).toBe("hard");
  });

  it("computes distribution and per-level submission accuracy accurately", () => {
    const qs: Question[] = [
      makeQuestion("q1", "NB"),
      makeQuestion("q2", "NB"),
      makeQuestion("q3", "TH"),
      makeQuestion("q4", "VD"),
      makeQuestion("q5", "VDC"),
    ];

    const dist = computeCognitiveLevelDistribution(qs);
    expect(dist.find((r) => r.level === "NB")).toMatchObject({ count: 2, pct: 40 });
    expect(dist.find((r) => r.level === "VDC")).toMatchObject({ count: 1, pct: 20 });

    const submission = {
      answers: { q1: "A", q2: "B", q3: "A", q4: "B" },
      maxScore: 10,
    } as unknown as Submission;

    const perf = computeCognitiveLevelPerformance(qs, submission);
    expect(perf.find((r) => r.level === "NB")).toMatchObject({
      total: 2,
      correct: 1,
      incorrect: 1,
      unanswered: 0,
      accuracyPct: 50,
    });
    expect(perf.find((r) => r.level === "TH")).toMatchObject({ correct: 1, accuracyPct: 100 });
    expect(perf.find((r) => r.level === "VD")).toMatchObject({ incorrect: 1, accuracyPct: 0 });
    expect(perf.find((r) => r.level === "VDC")).toMatchObject({ unanswered: 1, accuracyPct: 0 });
  });

  it("filters and builds sub-exams by allowedLevels and exact levelCounts", () => {
    const qs: Question[] = [
      makeQuestion("q1", "NB"),
      makeQuestion("q2", "NB"),
      makeQuestion("q3", "TH"),
      makeQuestion("q4", "TH"),
      makeQuestion("q5", "VD"),
      makeQuestion("q6", "VDC"),
    ];

    // Filter only VD + VDC
    const hardOnly = buildSubExamAttempt({}, qs, [], {
      enabled: true,
      selectionMode: "by_type",
      allowedLevels: ["VD", "VDC"],
    });
    expect(hardOnly.questions.map((q: Question) => q.id).sort()).toEqual(["q5", "q6"]);

    // Exact per-level counts: 1 NB, 2 TH, 1 VDC
    const matrixSub = buildSubExamAttempt({}, qs, [], {
      enabled: true,
      selectionMode: "by_level",
      levelCounts: { NB: 1, TH: 2, VD: 0, VDC: 1 },
    });
    const matrixDist = computeCognitiveLevelDistribution(matrixSub.questions);
    expect(matrixDist.find((r) => r.level === "NB")?.count).toBe(1);
    expect(matrixDist.find((r) => r.level === "TH")?.count).toBe(2);
    expect(matrixDist.find((r) => r.level === "VD")?.count).toBe(0);
    expect(matrixDist.find((r) => r.level === "VDC")?.count).toBe(1);
  });
});
