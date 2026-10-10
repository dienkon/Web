import { describe, it, expect } from "vitest";
import { buildSectionTree, flattenSectionTree } from "./sectionTree";
import type { Section, Question } from "../types";

describe("sectionTree utility", () => {
  it("builds a flat tree when there are no nested sections", () => {
    const sections: Section[] = [
      { id: "s1", examId: "ex1", title: "Phần 1", order: 1, questionCount: 1, enabled: true },
      { id: "s2", examId: "ex1", title: "Phần 2", order: 2, questionCount: 1, enabled: true },
    ];
    const questions: Question[] = [
      { id: "q1", examId: "ex1", sectionId: "s1", text: "Q1", type: "single_choice", points: 1, order: 1 },
      { id: "q2", examId: "ex1", sectionId: "s2", text: "Q2", type: "single_choice", points: 1, order: 2 },
    ];

    const { tree, hasNestedSections, rootQuestions } = buildSectionTree(sections, questions);

    expect(hasNestedSections).toBe(false);
    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe("s1");
    expect(tree[0].subsections).toHaveLength(0);
    expect(tree[0].totalQuestionCount).toBe(1);
    expect(rootQuestions).toHaveLength(0);
  });

  it("builds a nested tree with parent -> subsections", () => {
    const sections: Section[] = [
      { id: "parent_toan", examId: "merged_ex", title: "Phần 1: Đề thi Toán", order: 1, depth: 0, questionCount: 0, enabled: true },
      { id: "sub_toan_tn", examId: "merged_ex", parentSectionId: "parent_toan", title: "Phần I: Trắc nghiệm", order: 2, depth: 1, questionCount: 0, enabled: true },
      { id: "sub_toan_tl", examId: "merged_ex", parentSectionId: "parent_toan", title: "Phần II: Tự luận", order: 3, depth: 1, questionCount: 0, enabled: true },
      { id: "parent_ly", examId: "merged_ex", title: "Phần 2: Đề thi Vật Lý", order: 4, depth: 0, questionCount: 0, enabled: true },
      { id: "sub_ly_tn", examId: "merged_ex", parentSectionId: "parent_ly", title: "Phần I: Trắc nghiệm", order: 5, depth: 1, questionCount: 0, enabled: true },
    ];

    const questions: Question[] = [
      { id: "q1", examId: "merged_ex", sectionId: "sub_toan_tn", text: "Q1", type: "single_choice", points: 1, order: 1 },
      { id: "q2", examId: "merged_ex", sectionId: "sub_toan_tn", text: "Q2", type: "single_choice", points: 1, order: 2 },
      { id: "q3", examId: "merged_ex", sectionId: "sub_toan_tl", text: "Q3", type: "essay", points: 2, order: 3 },
      { id: "q4", examId: "merged_ex", sectionId: "sub_ly_tn", text: "Q4", type: "single_choice", points: 1, order: 4 },
    ];

    const { tree, hasNestedSections } = buildSectionTree(sections, questions);

    expect(hasNestedSections).toBe(true);
    expect(tree).toHaveLength(2);

    // Parent Toán
    expect(tree[0].id).toBe("parent_toan");
    expect(tree[0].subsections).toHaveLength(2);
    expect(tree[0].subsections[0].id).toBe("sub_toan_tn");
    expect(tree[0].subsections[1].id).toBe("sub_toan_tl");
    expect(tree[0].totalQuestionCount).toBe(3); // 2 TN + 1 TL

    // Parent Lý
    expect(tree[1].id).toBe("parent_ly");
    expect(tree[1].subsections).toHaveLength(1);
    expect(tree[1].subsections[0].id).toBe("sub_ly_tn");
    expect(tree[1].totalQuestionCount).toBe(1);

    // Flattening
    const flattened = flattenSectionTree(tree);
    expect(flattened.map((s) => s.id)).toEqual([
      "parent_toan",
      "sub_toan_tn",
      "sub_toan_tl",
      "parent_ly",
      "sub_ly_tn",
    ]);
  });
});
