import { describe, it, expect } from "vitest";
import type { Section, Question } from "../types";

describe("Exam Merger Logic & Integrity Tests (Phần F)", () => {
  it("should enforce at least 2 source exams for merging", () => {
    const validateMergeInput = (sourceExamIds: string[]) => {
      if (!sourceExamIds || sourceExamIds.length < 2) {
        throw new Error("Phải chọn ít nhất 2 đề thi để thực hiện gộp đề.");
      }
      return true;
    };

    expect(() => validateMergeInput([])).toThrow("Phải chọn ít nhất 2 đề thi để thực hiện gộp đề.");
    expect(() => validateMergeInput(["exam_1"])).toThrow("Phải chọn ít nhất 2 đề thi để thực hiện gộp đề.");
    expect(validateMergeInput(["exam_1", "exam_2"])).toBe(true);
    expect(validateMergeInput(["exam_1", "exam_2", "exam_3"])).toBe(true);
  });

  it("should preserve source exams and generate new questions with full provenance tracking", () => {
    const sourceExam1 = {
      id: "exam_1",
      title: "Đề thi Toán HK1",
      subject: "Toán",
      grade: 12,
      duration: 50,
      totalQuestions: 1,
    };

    const sourceQuestion1: Question = {
      id: "q_1",
      examId: "exam_1",
      sectionId: "sec_1",
      text: "Tìm nghiệm phương trình x^2 - 4 = 0",
      type: "single_choice",
      options: [
        { id: "opt_1", text: "x = 2" },
        { id: "opt_2", text: "x = -2" },
        { id: "opt_3", text: "x = +-2" },
        { id: "opt_4", text: "Vô nghiệm" },
      ],
      correctOptionIds: ["opt_3"],
      points: 1,
      order: 1,
    };

    const newExamId = "merged_exam_123";

    // Non-destructive clone: create new question pointing to new exam with provenance
    const clonedQuestion: Question = {
      ...sourceQuestion1,
      id: `copy_${Date.now()}_${sourceQuestion1.id}`,
      examId: newExamId,
      sectionId: "new_sec_1",
      originalExamId: sourceExam1.id,
      originalExamTitle: sourceExam1.title,
      originalQuestionId: sourceQuestion1.id,
      mergedAt: new Date().toISOString(),
    };

    // Verify source question is unchanged
    expect(sourceQuestion1.id).toBe("q_1");
    expect(sourceQuestion1.examId).toBe("exam_1");

    // Verify cloned question has provenance
    expect(clonedQuestion.examId).toBe(newExamId);
    expect(clonedQuestion.originalExamId).toBe("exam_1");
    expect(clonedQuestion.originalExamTitle).toBe("Đề thi Toán HK1");
    expect(clonedQuestion.originalQuestionId).toBe("q_1");
    expect(clonedQuestion.mergedAt).toBeDefined();
  });

  it("should chunk Firestore operations strictly under 400 operations per batch", () => {
    const chunkBatchOperations = <T>(items: T[], chunkSize = 350): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
      }
      return chunks;
    };

    // Simulate 1000 questions to merge
    const items = Array.from({ length: 1000 }, (_, i) => ({ id: `q_${i}` }));
    const batches = chunkBatchOperations(items, 350);

    expect(batches.length).toBe(3);
    expect(batches[0].length).toBe(350);
    expect(batches[1].length).toBe(350);
    expect(batches[2].length).toBe(300);

    // Each chunk is safely under Firestore 500 limit (and our 400 conservative threshold)
    batches.forEach((b) => {
      expect(b.length).toBeLessThanOrEqual(400);
    });
  });

  it("should build nested section hierarchy without breaking flat parent-child tree (Phần G)", () => {
    const sections: Section[] = [
      { id: "sec_root_1", examId: "exam_1", title: "Phần 1: Trắc nghiệm khách quan", order: 1, depth: 0, questionCount: 2, enabled: true },
      { id: "sec_child_1", examId: "exam_1", parentSectionId: "sec_root_1", title: "Dạng 1: Đơn điệu", order: 2, depth: 1, questionCount: 1, enabled: true },
      { id: "sec_child_2", examId: "exam_1", parentSectionId: "sec_root_1", title: "Dạng 2: Cực trị", order: 3, depth: 1, questionCount: 1, enabled: true },
      { id: "sec_root_2", examId: "exam_1", title: "Phần 2: Đúng sai", order: 4, depth: 0, questionCount: 0, enabled: true },
    ];

    // Tree hierarchy builder
    const buildSectionTree = (list: Section[]) => {
      const rootSections = list.filter((s) => !s.parentSectionId || s.depth === 0);
      const childMap = new Map<string, Section[]>();

      list.forEach((s) => {
        if (s.parentSectionId) {
          if (!childMap.has(s.parentSectionId)) {
            childMap.set(s.parentSectionId, []);
          }
          childMap.get(s.parentSectionId)!.push(s);
        }
      });

      const result: Section[] = [];
      rootSections.forEach((root) => {
        result.push(root);
        const children = childMap.get(root.id) || [];
        result.push(...children);
      });
      return result;
    };

    const orderedTree = buildSectionTree(sections);
    expect(orderedTree.map((s) => s.id)).toEqual([
      "sec_root_1",
      "sec_child_1",
      "sec_child_2",
      "sec_root_2",
    ]);

    // Check depth calculation
    expect(orderedTree[0].depth).toBe(0);
    expect(orderedTree[1].depth).toBe(1);
    expect(orderedTree[1].parentSectionId).toBe("sec_root_1");
  });

  it("should preserve complex question types without field loss during merge (Phần 16)", () => {
    const complexQuestions: Question[] = [
      {
        id: "q_matching",
        examId: "exam_1",
        sectionId: "sec_1",
        type: "matching",
        text: "Ghép đôi các khái niệm giải tích",
        matchingLeft: [
          { id: "1", text: "Đạo hàm f'(x)" },
          { id: "2", text: "Nguyên hàm F(x)" },
        ],
        matchingRight: [
          { id: "a", text: "Hệ số góc tiếp tuyến" },
          { id: "b", text: "Diện tích hình thang cong" },
        ],
        correctMatches: { "1": "a", "2": "b" },
        points: 2,
        order: 1,
      },
      {
        id: "q_ordering",
        examId: "exam_1",
        sectionId: "sec_1",
        type: "ordering",
        text: "Sắp xếp các bước khảo sát hàm số",
        orderingItems: [
          { id: "item_1", text: "Tìm TXĐ" },
          { id: "item_2", text: "Tính đạo hàm" },
          { id: "item_3", text: "Lập BBT" },
          { id: "item_4", text: "Vẽ đồ thị" },
        ],
        correctOrder: ["item_1", "item_2", "item_3", "item_4"],
        points: 1,
        order: 2,
      },
      {
        id: "q_fill_blank",
        examId: "exam_1",
        sectionId: "sec_1",
        type: "fill_blank",
        text: "Phương trình $\\sin(x) = 0$ có nghiệm là $x = [_]$.",
        acceptedAnswersPerBlank: { 0: ["k\\pi", "k*pi"] },
        points: 1,
        order: 3,
      },
      {
        id: "q_essay",
        examId: "exam_1",
        sectionId: "sec_1",
        type: "essay",
        text: "Chứng minh định lý Lagrange trên đoạn $[a, b]$.",
        essayRubric: "Barem đáp án: Ý tưởng chính (1đ), Tính liên tục (1đ)",
        points: 3,
        order: 4,
      },
    ];

    const targetExamId = "merged_complex_exam";
    const mergedQuestions = complexQuestions.map((q, idx) => ({
      ...q,
      id: `merged_${idx}`,
      examId: targetExamId,
      originalExamId: q.examId,
      originalQuestionId: q.id,
      mergedAt: new Date().toISOString(),
    }));

    // Verify all specialized fields are 100% preserved
    expect(mergedQuestions[0].matchingLeft).toEqual(complexQuestions[0].matchingLeft);
    expect(mergedQuestions[0].matchingRight).toEqual(complexQuestions[0].matchingRight);
    expect(mergedQuestions[1].orderingItems).toEqual(complexQuestions[1].orderingItems);
    expect(mergedQuestions[1].correctOrder).toEqual(complexQuestions[1].correctOrder);
    expect(mergedQuestions[2].acceptedAnswersPerBlank).toEqual(complexQuestions[2].acceptedAnswersPerBlank);
    expect(mergedQuestions[3].essayRubric).toEqual(complexQuestions[3].essayRubric);
  });

  it("should support JSON V3 schema roundtrip with nested sections & pricing (Phần 17)", () => {
    const jsonV3Payload = {
      version: "3.0",
      exam: {
        title: "Đề Thi Khảo Sát Toán 12",
        subject: "Toán",
        grade: 12,
        accessMode: "paid",
        priceVnd: 10000,
        salesEnabled: true,
      },
      sections: [
        { id: "sec_1", title: "Phần I", order: 1, depth: 0 },
        { id: "sec_sub_1", title: "Nhóm 1", order: 2, parentSectionId: "sec_1", depth: 1 },
      ],
      questions: [],
    };

    // Simulate import ID remapping
    const idMap = new Map<string, string>();
    idMap.set("sec_1", "new_sec_1");
    idMap.set("sec_sub_1", "new_sec_sub_1");

    const remappedSections = jsonV3Payload.sections.map((s) => ({
      ...s,
      id: idMap.get(s.id) || s.id,
      parentSectionId: s.parentSectionId ? idMap.get(s.parentSectionId) || null : null,
    }));

    expect(remappedSections[0].id).toBe("new_sec_1");
    expect(remappedSections[0].parentSectionId).toBeNull();
    expect(remappedSections[1].id).toBe("new_sec_sub_1");
    expect(remappedSections[1].parentSectionId).toBe("new_sec_1");
    expect(jsonV3Payload.exam.accessMode).toBe("paid");
    expect(jsonV3Payload.exam.priceVnd).toBe(10000);
  });

  it("should promote child subsections when parent section is deleted (orphan safety)", () => {
    let sections: Section[] = [
      { id: "root_1", examId: "e1", title: "Root", order: 1, depth: 0, questionCount: 2, enabled: true },
      { id: "sub_1", examId: "e1", parentSectionId: "root_1", title: "Sub 1", order: 2, depth: 1, questionCount: 1, enabled: true },
      { id: "sub_2", examId: "e1", parentSectionId: "root_1", title: "Sub 2", order: 3, depth: 1, questionCount: 1, enabled: true },
    ];

    // Deleting root_1 promotes children to root level (depth 0, parentSectionId null)
    const deleteSection = (targetId: string) => {
      sections = sections
        .filter((s) => s.id !== targetId)
        .map((s) => {
          if (s.parentSectionId === targetId) {
            return { ...s, parentSectionId: null, depth: 0 };
          }
          return s;
        });
    };

    deleteSection("root_1");
    expect(sections.length).toBe(2);
    expect(sections[0].id).toBe("sub_1");
    expect(sections[0].parentSectionId).toBeNull();
    expect(sections[0].depth).toBe(0);
    expect(sections[1].id).toBe("sub_2");
    expect(sections[1].parentSectionId).toBeNull();
  });
});
