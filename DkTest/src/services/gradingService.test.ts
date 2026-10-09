import { describe, it, expect } from "vitest";
import {
  gradeQuestion,
  calculateExamScore,
  isAnswerMatch,
  parseNumericValue,
} from "./gradingService";
import type { Question } from "../types";

describe("gradingService - Numeric & Text Matching Helpers", () => {
  it("correctly parses decimals with comma or dot", () => {
    expect(parseNumericValue("0.5")).toBe(0.5);
    expect(parseNumericValue("0,5")).toBe(0.5);
    expect(parseNumericValue("-12,75")).toBe(-12.75);
    expect(parseNumericValue("100")).toBe(100);
  });

  it("correctly parses simple fractions", () => {
    expect(parseNumericValue("1/2")).toBe(0.5);
    expect(parseNumericValue("3/4")).toBe(0.75);
    expect(parseNumericValue("2/4")).toBe(0.5);
    expect(parseNumericValue("-5/2")).toBe(-2.5);
  });

  it("evaluates text and numeric equivalences accurately", () => {
    // Exact & Case
    expect(isAnswerMatch("Hà Nội", "Hà Nội")).toBe(true);
    expect(isAnswerMatch("hà nội", "Hà Nội", false)).toBe(true);
    expect(isAnswerMatch("hà nội", "Hà Nội", true)).toBe(false);

    // Spaces
    expect(isAnswerMatch("x + 1", "x+1")).toBe(true);
    expect(isAnswerMatch("2 x - 3", "2x-3")).toBe(true);

    // Decimal comma vs dot
    expect(isAnswerMatch("0,5", "0.5")).toBe(true);
    expect(isAnswerMatch("12,5", "12.5")).toBe(true);

    // Fractions vs decimal
    expect(isAnswerMatch("1/2", "0.5")).toBe(true);
    expect(isAnswerMatch("0,5", "1/2")).toBe(true);
    expect(isAnswerMatch("3/4", "0.75")).toBe(true);
  });
});

describe("gradingService - Question Types", () => {
  it("grades single choice question", () => {
    const q: Question = {
      id: "q1",
      examId: "e1",
      type: "single_choice",
      text: "Thủ đô của Việt Nam là gì?",
      points: 1,
      order: 1,
      options: [
        { id: "opt_a", text: "Hà Nội" },
        { id: "opt_b", text: "TP. Hồ Chí Minh" },
      ],
      correctOptionIds: ["opt_a"],
    };

    const resCorrect = gradeQuestion({ question: q, answer: "opt_a" });
    expect(resCorrect.status).toBe("correct");
    expect(resCorrect.earnedPoints).toBe(1);

    const resWrong = gradeQuestion({ question: q, answer: "opt_b" });
    expect(resWrong.status).toBe("incorrect");
    expect(resWrong.earnedPoints).toBe(0);

    const resEmpty = gradeQuestion({ question: q, answer: null });
    expect(resEmpty.status).toBe("unanswered");
    expect(resEmpty.earnedPoints).toBe(0);
  });

  it("grades multiple choice question with partial scoring", () => {
    const q: Question = {
      id: "q2",
      examId: "e1",
      type: "multiple_choice",
      text: "Chọn các số nguyên tố:",
      points: 2,
      order: 2,
      options: [
        { id: "opt_2", text: "2" },
        { id: "opt_3", text: "3" },
        { id: "opt_4", text: "4" },
      ],
      correctOptionIds: ["opt_2", "opt_3"],
    };

    // Full correct
    const resFull = gradeQuestion({ question: q, answer: ["opt_2", "opt_3"] });
    expect(resFull.status).toBe("correct");
    expect(resFull.earnedPoints).toBe(2);

    // Partial credit: picked 1 of 2 correct, no wrong
    const resPartial = gradeQuestion({ question: q, answer: ["opt_2"] });
    expect(resPartial.status).toBe("partial");
    expect(resPartial.earnedPoints).toBe(1);

    // Selected an incorrect option -> 0 points
    const resWrong = gradeQuestion({ question: q, answer: ["opt_2", "opt_4"] });
    expect(resWrong.status).toBe("incorrect");
    expect(resWrong.earnedPoints).toBe(0);
  });

  it("grades true/false question with 4 statements", () => {
    const q: Question = {
      id: "q3",
      examId: "e1",
      type: "true_false",
      text: "Xét tính đúng sai:",
      points: 1,
      order: 3,
      statements: [
        { id: "st1", text: "1 + 1 = 2", correctAnswer: true },
        { id: "st2", text: "2 x 2 = 5", correctAnswer: false },
        { id: "st3", text: "3 x 3 = 9", correctAnswer: true },
        { id: "st4", text: "4 / 2 = 3", correctAnswer: false },
      ],
    };

    // All correct
    const resAll = gradeQuestion({
      question: q,
      answer: { st1: true, st2: false, st3: true, st4: false },
    });
    expect(resAll.status).toBe("correct");
    expect(resAll.earnedPoints).toBe(1);

    // 2 of 4 correct -> 0.5 points
    const resHalf = gradeQuestion({
      question: q,
      answer: { st1: true, st2: true, st3: true, st4: true },
    });
    expect(resHalf.status).toBe("partial");
    expect(resHalf.earnedPoints).toBe(0.5);
  });

  it("grades short answer question with math comma/fraction normalization", () => {
    const q: Question = {
      id: "q4",
      examId: "e1",
      type: "short_answer",
      text: "Nghiệm của phương trình 2x = 1 là gì?",
      points: 1,
      order: 4,
      acceptedAnswers: ["0.5", "1/2"],
      caseSensitive: false,
    };

    // Vietnamese decimal comma
    expect(gradeQuestion({ question: q, answer: "0,5" }).status).toBe("correct");
    // Fraction
    expect(gradeQuestion({ question: q, answer: "1/2" }).status).toBe("correct");
    // Space with fraction
    expect(gradeQuestion({ question: q, answer: " 1 / 2 " }).status).toBe("correct");
    // Wrong
    expect(gradeQuestion({ question: q, answer: "2" }).status).toBe("incorrect");
  });

  it("grades fill in the blank question", () => {
    const q: Question = {
      id: "q5",
      examId: "e1",
      type: "fill_blank",
      text: "Số PI xấp xỉ [_] và căn bậc hai của 4 là [_].",
      points: 2,
      order: 5,
      acceptedAnswersPerBlank: {
        0: ["3.14", "3,14"],
        1: ["2"],
      },
    };

    // All correct
    const resFull = gradeQuestion({
      question: q,
      answer: { 0: "3,14", 1: "2" },
    });
    expect(resFull.status).toBe("correct");
    expect(resFull.earnedPoints).toBe(2);

    // 1 of 2 correct
    const resHalf = gradeQuestion({
      question: q,
      answer: { 0: "3,14", 1: "4" },
    });
    expect(resHalf.status).toBe("partial");
    expect(resHalf.earnedPoints).toBe(1);
  });

  it("grades matching table question", () => {
    const q: Question = {
      id: "q6",
      examId: "e1",
      type: "matching",
      text: "Nối các cặp tương ứng:",
      points: 2,
      order: 6,
      matchingLeft: [
        { id: "1", text: "H2O" },
        { id: "2", text: "NaCl" },
      ],
      matchingRight: [
        { id: "a", text: "Muối ăn" },
        { id: "b", text: "Nước" },
      ],
      correctMatches: {
        "1": "b",
        "2": "a",
      },
    };

    const resAll = gradeQuestion({
      question: q,
      answer: { "1": "b", "2": "a" },
    });
    expect(resAll.status).toBe("correct");
    expect(resAll.earnedPoints).toBe(2);

    const resOne = gradeQuestion({
      question: q,
      answer: { "1": "b", "2": "b" },
    });
    expect(resOne.status).toBe("partial");
    expect(resOne.earnedPoints).toBe(1);
  });
});

describe("gradingService - Exam Summary Calculation", () => {
  it("computes overall scaled exam score (10.0 scale) correctly", () => {
    const questions: Question[] = [
      {
        id: "q1",
        examId: "e1",
        type: "single_choice",
        text: "Q1",
        points: 1,
        order: 1,
        correctOptionIds: ["a"],
      },
      {
        id: "q2",
        examId: "e1",
        type: "single_choice",
        text: "Q2",
        points: 1,
        order: 2,
        correctOptionIds: ["b"],
      },
    ];

    const answers = { q1: "a", q2: "b" };
    const summary = calculateExamScore({ questions, answers });

    expect(summary.totalCount).toBe(2);
    expect(summary.correctCount).toBe(2);
    expect(summary.score).toBe(10);
  });
});
