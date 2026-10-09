import { describe, it, expect } from "vitest";
import {
  checkLatexDelimiters,
  validateQuestion,
  validateQuestionCollection,
} from "./questionValidator";
import { JOURNEY_QUESTIONS_100 } from "../../features/journey/data/journeyQuestions12";
import { getSubjectJourneyQuestions } from "../../features/journey/data/journeySubjectQuestions";

describe("Question Validator - LaTeX Delimiters", () => {
  it("detects balanced inline and display LaTeX", () => {
    expect(checkLatexDelimiters("Tính $x^2 + 3x$ khi $x = 1$").isBalanced).toBe(true);
    expect(checkLatexDelimiters("Biểu thức $$\\int_0^1 f(x) dx$$ là tích phân").isBalanced).toBe(true);
    expect(checkLatexDelimiters("Văn bản thông thường không có công thức").isBalanced).toBe(true);
  });

  it("detects unbalanced inline math $ delimiter", () => {
    const res = checkLatexDelimiters("Cho hàm số $y = x^2 + 1 và điểm M");
    expect(res.isBalanced).toBe(false);
    expect(res.reason).toContain("inline math");
  });

  it("detects unbalanced display math $$ delimiter", () => {
    const res = checkLatexDelimiters("Công thức $$E = mc^2");
    expect(res.isBalanced).toBe(false);
    expect(res.reason).toContain("display math");
  });

  it("detects unbalanced curly braces inside LaTeX", () => {
    const res = checkLatexDelimiters("Tính $\\frac{a}{b$");
    expect(res.isBalanced).toBe(false);
    expect(res.reason).toContain("curly braces");
  });
});

describe("Question Validator - Single Question Rules", () => {
  it("passes a well-formed multiple-choice question", () => {
    const res = validateQuestion({
      id: "q_sample_1",
      prompt: "Đạo hàm của $y = x^2$ là:",
      options: ["$2x$", "$x$", "$2$", "$x^2$"],
      correctIndex: 0,
      explanation: "Công thức đạo hàm lũy thừa $(x^2)' = 2x$.",
    });
    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("flags empty ID and empty prompt", () => {
    const res = validateQuestion({
      id: "",
      prompt: "",
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.field === "id" && e.code === "EMPTY_FIELD")).toBe(true);
    expect(res.errors.some((e) => e.field === "prompt" && e.code === "EMPTY_FIELD")).toBe(true);
  });

  it("flags insufficient options (< 2 options)", () => {
    const res = validateQuestion({
      id: "q_few_opts",
      prompt: "Câu hỏi có quá ít lựa chọn:",
      options: ["Chỉ một lựa chọn"],
      correctIndex: 0,
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.code === "INSUFFICIENT_OPTIONS")).toBe(true);
  });

  it("flags duplicate options", () => {
    const res = validateQuestion({
      id: "q_dup_opts",
      prompt: "Câu hỏi bị trùng đáp án:",
      options: ["A", "B", "A", "C"],
      correctIndex: 0,
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.code === "DUPLICATE_OPTIONS")).toBe(true);
  });

  it("flags out of bounds correctIndex", () => {
    const res = validateQuestion({
      id: "q_oob_idx",
      prompt: "Chỉ số đáp án vượt ngoài phạm vi:",
      options: ["A", "B", "C"],
      correctIndex: 4,
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.code === "INVALID_CORRECT_INDEX")).toBe(true);
  });
});

describe("Question Validator - Question Collections & Live Data Validation", () => {
  it("detects duplicate IDs across question collection", () => {
    const collection = [
      { id: "q1", prompt: "Câu 1 hợp lệ", options: ["A", "B"], correctIndex: 0 },
      { id: "q1", prompt: "Câu 1 bị trùng id", options: ["C", "D"], correctIndex: 1 },
      { id: "q2", prompt: "Câu 2 hợp lệ", options: ["X", "Y"], correctIndex: 0 },
    ];
    const res = validateQuestionCollection(collection);
    expect(res.isValid).toBe(false);
    expect(res.duplicateIds).toContain("q1");
  });

  it("validates that all 100 questions in JOURNEY_QUESTIONS_100 are syntactically valid with non-zero correctIndex distribution", () => {
    const res = validateQuestionCollection(
      JOURNEY_QUESTIONS_100.map((q) => ({
        id: q.id,
        prompt: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
      }))
    );
    expect(res.isValid).toBe(true);
    expect(res.duplicateIds).toHaveLength(0);

    // Verify option balance: answers should be distributed across 0, 1, 2, 3
    const indexDistribution = [0, 0, 0, 0];
    JOURNEY_QUESTIONS_100.forEach((q) => {
      indexDistribution[q.correctIndex]++;
    });

    // Every choice (A, B, C, D) must have multiple questions assigned
    expect(indexDistribution[0]).toBeGreaterThan(10);
    expect(indexDistribution[1]).toBeGreaterThan(10);
    expect(indexDistribution[2]).toBeGreaterThan(10);
    expect(indexDistribution[3]).toBeGreaterThan(10);
  });

  it("validates generated curriculum questions for Math, Physics, and Chemistry levels", () => {
    const mathLvl1 = getSubjectJourneyQuestions("math", 1);
    const physLvl1 = getSubjectJourneyQuestions("physics", 1);
    const chemLvl1 = getSubjectJourneyQuestions("chemistry", 1);

    [...mathLvl1, ...physLvl1, ...chemLvl1].forEach((q) => {
      const val = validateQuestion({
        id: q.id,
        prompt: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
      });
      expect(val.isValid).toBe(true);
    });
  });
});
