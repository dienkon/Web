import { describe, it, expect } from "vitest";
import { fetchQuestionBank, generateExamFromMatrix } from "./questionBankService";

describe("questionBankService", () => {
  it("fetches question bank with seed items", async () => {
    const list = await fetchQuestionBank();
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((q) => q.bloomLevel === "remember")).toBe(true);
    expect(list.some((q) => q.bloomLevel === "understand")).toBe(true);
  });

  it("filters question bank by subject and bloom level", async () => {
    const toanItems = await fetchQuestionBank({ subject: "Toán" });
    expect(toanItems.length).toBeGreaterThan(0);
    expect(toanItems.every((q) => q.subject === "Toán")).toBe(true);

    const rememberItems = await fetchQuestionBank({ bloomLevel: "remember" });
    expect(rememberItems.length).toBeGreaterThan(0);
    expect(rememberItems.every((q) => q.bloomLevel === "remember")).toBe(true);
  });

  it("generates an exam from matrix specification", async () => {
    const all = await fetchQuestionBank();
    const result = generateExamFromMatrix({
      title: "Đề Thi Khảo Sát Toán 12",
      subject: "Toán",
      gradeCategory: "THPT Quốc Gia",
      duration: 50,
      matrix: {
        rememberCount: 2,
        understandCount: 2,
        applyCount: 1,
        analyzeCount: 1,
      },
      allBankQuestions: all,
    });

    expect(result.examTitle).toBe("Đề Thi Khảo Sát Toán 12");
    expect(result.questions.length).toBe(6);
    expect(result.questions[0].points).toBeCloseTo(10 / 6, 2);
  });
});
