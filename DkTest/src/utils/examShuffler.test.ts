import { describe, it, expect } from "vitest";
import { shuffleArray, organizeAndShuffleExam } from "./examShuffler";
import type { Question, Section, Exam } from "../types";

describe("examShuffler - shuffleArray", () => {
  it("keeps all elements after shuffling", () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = shuffleArray(list);

    expect(shuffled).toHaveLength(list.length);
    expect(shuffled.sort((a, b) => a - b)).toEqual(list);
  });
});

describe("examShuffler - organizeAndShuffleExam", () => {
  const dummySections: Section[] = [
    {
      id: "sec1",
      examId: "e1",
      title: "Phần I",
      order: 1,
      questionCount: 2,
      enabled: true,
    },
  ];

  const dummyQuestions: Question[] = [
    {
      id: "q1",
      examId: "e1",
      sectionId: "sec1",
      type: "single_choice",
      text: "Câu 1 trong Phần I",
      points: 1,
      order: 1,
      options: [
        { id: "a", text: "Đáp án A" },
        { id: "b", text: "Đáp án B" },
      ],
      correctOptionIds: ["a"],
    },
    {
      id: "q2",
      examId: "e1",
      sectionId: null,
      type: "single_choice",
      text: "Câu tự do 2",
      points: 1,
      order: 2,
      pinQuestion: true, // Pinned question
    },
  ];

  it("organizes questions with sections and preserves pinned question position", () => {
    const result = organizeAndShuffleExam(
      { shuffleQuestions: false, shuffleOptions: false } as Partial<Exam>,
      dummyQuestions,
      dummySections
    );

    expect(result.orderedQuestions.length).toBe(2);
    expect(result.blocks.length).toBe(2);
  });

  it("shuffles options if shuffleOptions is enabled and question allows it", () => {
    const questionsWithOptions: Question[] = [
      {
        id: "q_opt",
        examId: "e1",
        type: "single_choice",
        text: "Câu trắc nghiệm 4 đáp án",
        points: 1,
        order: 1,
        shuffleOptions: true,
        options: [
          { id: "opt1", text: "1" },
          { id: "opt2", text: "2" },
          { id: "opt3", text: "3" },
          { id: "opt4", text: "4" },
        ],
      },
    ];

    const result = organizeAndShuffleExam(
      { shuffleOptions: true } as Partial<Exam>,
      questionsWithOptions,
      []
    );

    const shuffledQ = result.orderedQuestions[0];
    expect(shuffledQ.options).toHaveLength(4);
    // All original options should still exist
    const ids = shuffledQ.options?.map((o) => o.id).sort();
    expect(ids).toEqual(["opt1", "opt2", "opt3", "opt4"]);
  });
});
