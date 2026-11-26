import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import type { Question, Section } from "../src/types";
import InteractiveMatchingBoard from "../src/components/exam/InteractiveMatchingBoard";
import {
  countMatchingWires,
  formatMatchingPairsSummary,
  getUnconnectedItems,
  gradeMatchingQuestion,
  normalizeMatchesToArrayMap,
  removeLeftItemAndRemap,
  removeRightItemAndRemap,
  resolveMatchingMode,
  serializeMatchesMap,
  setLeftTargetsInMode,
  toggleMatchConnection,
} from "../src/utils/matchingUtils";
import { gradeQuestion } from "../src/services/gradingService";
import {
  examTextToQuestions,
  questionsToExamText,
} from "../src/features/exam-builder/utils/dualPaneTextParser";
import { migrateExamJson } from "../src/utils/json/migrateExamJson";
import { validateExamJson } from "../src/utils/json/validateExamJson";
import { generateExamWordHtml } from "../src/services/wordExportService";
import {
  generateExamHtmlForPrint,
  generateExamLatex,
} from "../src/services/latexExportService";

const sampleLeft = [
  { id: "l1", label: "1", text: "H2O" },
  { id: "l2", label: "2", text: "NaCl" },
  { id: "l3", label: "3", text: "Au (ô gây nhiễu)" },
];

const sampleRight = [
  { id: "r1", label: "a", text: "Muối ăn" },
  { id: "r2", label: "b", text: "Nước tinh khiết" },
  { id: "r3", label: "c", text: "Đá vôi (ô gây nhiễu)" },
];

describe("Matching Table (Nối bảng) Upgrade — Modes, Distractors, Parsers & Grading", () => {
  describe("1. One-to-One Mode ('Chỉ 1 ô – 1 mạch')", () => {
    it("enforces at most 1 wire per left cell and at most 1 wire per right cell", () => {
      let matches = toggleMatchConnection({}, "1", "a", "one_to_one", sampleLeft, sampleRight);
      expect(matches).toEqual({ "1": "a" });

      // Connecting cell "1" to "b" replaces "1 -> a" with "1 -> b"
      matches = toggleMatchConnection(matches, "1", "b", "one_to_one", sampleLeft, sampleRight);
      expect(matches).toEqual({ "1": "b" });

      // Connecting cell "2" to "b" steals "b" from cell "1" so "b" still has only 1 wire
      matches = toggleMatchConnection(matches, "2", "b", "one_to_one", sampleLeft, sampleRight);
      expect(matches).toEqual({ "2": "b" });

      // Tapping "2 -> b" again disconnects cleanly without leaving empty "" keys
      matches = toggleMatchConnection(matches, "2", "b", "one_to_one", sampleLeft, sampleRight);
      expect(matches).toEqual({});
    });
  });

  describe("2. Multiple Mode ('Cho phép 1 ô nối nhiều mạch')", () => {
    it("allows 1 cell in Cột 1 to connect to multiple cells in Cột 2 and many-to-1", () => {
      let matches = toggleMatchConnection({}, "1", "b", "multiple", sampleLeft, sampleRight);
      matches = toggleMatchConnection(matches, "1", "a", "multiple", sampleLeft, sampleRight);
      // Sorted by right item order: ["a", "b"]
      expect(matches).toEqual({ "1": ["a", "b"] });

      // Cell "2" can also connect to "a" without disconnecting "1 -> a"
      matches = toggleMatchConnection(matches, "2", "a", "multiple", sampleLeft, sampleRight);
      expect(matches).toEqual({ "1": ["a", "b"], "2": "a" });
      expect(countMatchingWires(matches, sampleLeft, sampleRight)).toBe(3);

      // Toggling "1 -> a" removes only that wire and keeps "1 -> b" and "2 -> a"
      matches = toggleMatchConnection(matches, "1", "a", "multiple", sampleLeft, sampleRight);
      expect(matches).toEqual({ "1": "b", "2": "a" });
    });

    it("auto-infers multiple mode for legacy questions with multi-target or shared right target", () => {
      expect(
        resolveMatchingMode({
          correctMatches: { "1": "a", "2": "b" },
          matchingLeft: sampleLeft,
          matchingRight: sampleRight,
        })
      ).toBe("one_to_one");

      expect(
        resolveMatchingMode({
          correctMatches: { "1": "a", "2": "a" },
          matchingLeft: sampleLeft,
          matchingRight: sampleRight,
        })
      ).toBe("multiple");

      expect(
        resolveMatchingMode({
          correctMatches: { "1": ["a", "b"] },
          matchingLeft: sampleLeft,
          matchingRight: sampleRight,
        })
      ).toBe("multiple");
    });

    it("normalizes cleanly when switching from multiple to one_to_one", () => {
      const norm = normalizeMatchesToArrayMap(
        { "1": ["a", "b"], "2": "a" },
        sampleLeft,
        sampleRight
      );
      const single = serializeMatchesMap(norm, "one_to_one");
      // "1" takes "a", so "2" cannot also use "a"
      expect(single).toEqual({ "1": "a" });
    });
  });

  describe("3. Unconnected / Distractor Cells & Safe Row Deletion Remapping", () => {
    it("identifies unconnected distractor cells in both Cột 1 and Cột 2 and omits empty keys", () => {
      let matches = setLeftTargetsInMode(
        { "1": "b", "2": "a", "3": "c" },
        "3",
        "",
        "one_to_one",
        sampleLeft,
        sampleRight
      );
      expect(matches).toEqual({ "1": "b", "2": "a" });
      expect("3" in matches).toBe(false);

      const unconnected = getUnconnectedItems(sampleLeft, sampleRight, matches);
      expect(unconnected.unconnectedLeftLabels).toEqual(["3"]);
      expect(unconnected.unconnectedRightLabels).toEqual(["c"]);
    });

    it("remaps surviving left & right labels accurately when deleting rows", () => {
      // Delete left row index 0 ("1"): old "2"->"a" becomes "1"->"a", old "3"->["b","c"] becomes "2"->["b","c"]
      const afterLeftRemove = removeLeftItemAndRemap(
        sampleLeft,
        sampleRight,
        { "1": "b", "2": "a", "3": ["b", "c"] },
        0,
        "multiple"
      );
      expect(afterLeftRemove.matchingLeft.map((it) => it.label)).toEqual(["1", "2"]);
      expect(afterLeftRemove.correctMatches).toEqual({
        "1": "a",
        "2": ["b", "c"],
      });

      // Delete right row index 0 ("a"): old "b" becomes "a", old "c" becomes "b"
      const afterRightRemove = removeRightItemAndRemap(
        sampleLeft,
        sampleRight,
        { "1": "a", "2": ["b", "c"] },
        0,
        "multiple"
      );
      expect(afterRightRemove.matchingRight.map((it) => it.label)).toEqual(["a", "b"]);
      expect(afterRightRemove.correctMatches).toEqual({
        "2": ["a", "b"],
      });
    });
  });

  describe("4. Grading Engine — Distractors, Legacy Empty Strings & Anti-Spam", () => {
    it("awards full score when student connects required pairs and leaves distractors unconnected", () => {
      const q: Question = {
        id: "q_distractor",
        examId: "e1",
        type: "matching",
        text: "Nối công thức đúng (có ô gây nhiễu):",
        points: 2,
        order: 0,
        matchingMode: "one_to_one",
        matchingLeft: sampleLeft,
        matchingRight: sampleRight,
        // Row "3" and right "c" are distractors; also test legacy empty "" entry for "3"
        correctMatches: { "1": "b", "2": "a", "3": "" },
      };

      const perfect = gradeQuestion({
        question: q,
        answer: { "1": "b", "2": "a" },
      });
      expect(perfect.status).toBe("correct");
      expect(perfect.earnedPoints).toBe(2);

      // Connecting distractor "3 -> c" must NOT get full score!
      const connectedDistractor = gradeQuestion({
        question: q,
        answer: { "1": "b", "2": "a", "3": "c" },
      });
      expect(connectedDistractor.status).toBe("partial");
      expect(connectedDistractor.earnedPoints).toBe(1);
    });

    it("grades multi-connect partial credit fairly and blocks wire-spamming", () => {
      const q: Question = {
        id: "q_multi",
        examId: "e1",
        type: "matching",
        text: "Nối nhiều mạch:",
        points: 3,
        order: 1,
        matchingMode: "multiple",
        matchingLeft: sampleLeft,
        matchingRight: [
          ...sampleRight,
          { id: "r4", label: "d", text: "Kim loại quý" },
        ],
        // 3 required wires: 1->b, 2->a, 2->c (row 3 unconnected!)
        correctMatches: {
          "1": "b",
          "2": ["a", "c"],
        },
      };

      const full = gradeMatchingQuestion(q, { "1": "b", "2": ["a", "c"] }, 3);
      expect(full.status).toBe("correct");
      expect(full.earnedPoints).toBe(3);

      const twoOfThree = gradeMatchingQuestion(q, { "1": "b", "2": "a" }, 3);
      expect(twoOfThree.status).toBe("partial");
      expect(twoOfThree.earnedPoints).toBe(2);

      // Brute-force spamming every cell to every option yields 0 points
      const spammed = gradeMatchingQuestion(
        q,
        {
          "1": ["a", "b", "c", "d"],
          "2": ["a", "b", "c", "d"],
          "3": ["a", "b", "c", "d"],
        },
        3
      );
      expect(spammed.status).toBe("incorrect");
      expect(spammed.earnedPoints).toBe(0);
    });
  });

  describe("5. Dual-Pane Text Parser, JSON Migration & Exports", () => {
    it("round-trips matching questions (1-1, multiple, and distractors) in dualPaneTextParser", () => {
      const sections: Section[] = [
        {
          id: "sec_1",
          examId: "e1",
          title: "Phần 1. NỐI BẢNG",
          order: 0,
          questionCount: 1,
          enabled: true,
        },
      ];
      const questions: Question[] = [
        {
          id: "qm1",
          examId: "e1",
          sectionId: "sec_1",
          type: "matching",
          matchingMode: "multiple",
          text: "Nối mỗi số với các tính chất đúng:",
          level: "VD",
          points: 1,
          order: 0,
          matchingLeft: [
            { id: "l1", label: "1", text: "Số 2" },
            { id: "l2", label: "2", text: "Số 9" },
            { id: "l3", label: "3", text: "Số -5" },
          ],
          matchingRight: [
            { id: "r1", label: "a", text: "Số nguyên tố" },
            { id: "r2", label: "b", text: "Số chẵn dương" },
            { id: "r3", label: "c", text: "Số chính phương" },
          ],
          correctMatches: {
            "1": ["a", "b"],
            "2": "c",
          },
          explanation: "Số -5 không thuộc tính chất nào ở Cột 2.",
        },
      ];

      const serialized = questionsToExamText(sections, questions);
      expect(serialized).toContain("[Nối bảng: nối nhiều]");
      expect(serialized).toContain("Đáp án nối: 1-a, b; 2-c");

      const parsed = examTextToQuestions(serialized);
      expect(parsed.questions).toHaveLength(1);
      const qOut = parsed.questions[0];
      expect(qOut.type).toBe("matching");
      expect(qOut.matchingMode).toBe("multiple");
      expect(qOut.matchingLeft).toHaveLength(3);
      expect(qOut.matchingRight).toHaveLength(3);
      expect(qOut.correctMatches).toEqual({
        "1": ["a", "b"],
        "2": "c",
      });
    });

    it("preserves matching questions during JSON V3 migration & validation instead of resetting to single_choice", () => {
      const rawJson = {
        version: 3,
        source: "DkTEST",
        exportedAt: new Date().toISOString(),
        exportType: "exam",
        exam: { title: "Đề kiểm tra Nối bảng", timeLimit: 45 },
        sections: [{ id: "s1", title: "Phần 1" }],
        questions: [
          {
            id: "qm_json",
            type: "matching",
            matchingMode: "multiple",
            text: "Ghép cột 1 với cột 2",
            matchingLeft: sampleLeft,
            matchingRight: sampleRight,
            correctMatches: { "1": ["a", "b"] },
          },
        ],
      };

      const migrated = migrateExamJson(rawJson);
      const validation = validateExamJson(migrated);
      expect(validation.success).toBe(true);
      expect(migrated.questions[0].type).toBe("matching");
      expect(migrated.questions[0].matchingMode).toBe("multiple");
      expect(migrated.questions[0].correctMatches).toEqual({ "1": ["a", "b"] });
    });

    it("renders matching tables and answer keys across Word, Print HTML, and LaTeX exports", () => {
      const q: Question = {
        id: "qm_exp",
        examId: "e1",
        type: "matching",
        matchingMode: "multiple",
        text: "Nối cột 1 và cột 2:",
        points: 1,
        order: 0,
        matchingLeft: sampleLeft,
        matchingRight: sampleRight,
        correctMatches: { "1": ["a", "b"], "2": "a" },
      };

      expect(formatMatchingPairsSummary(q.correctMatches, sampleLeft, sampleRight)).toBe(
        "1 → a, b; 2 → a"
      );

      const wordHtml = generateExamWordHtml({ title: "Đề A" }, [], [q]);
      expect(wordHtml).toContain("1 → a, b; 2 → a");

      const printHtml = generateExamHtmlForPrint(
        { title: "Đề A" },
        [],
        [q],
        { includeAnswers: true }
      );
      expect(printHtml).toContain("Đáp án nối: 1 → a, b; 2 → a");

      const texSource = generateExamLatex(
        { title: "Đề A" },
        [],
        [q],
        { includeAnswers: true }
      );
      expect(texSource).toContain("\\textbf{Cột 1} & \\textbf{Cột 2}");
      expect(texSource).toContain("\\textbf{Đáp án nối:}");
    });
  });

  describe("6. InteractiveMatchingBoard UI Rendering (Mobile & Preview Modes)", () => {
    it("renders mobile layout switcher, touch-safe handles, and 1-to-1 / multiple badges", () => {
      const htmlSingle = renderToStaticMarkup(
        React.createElement(InteractiveMatchingBoard, {
          leftItems: sampleLeft,
          rightItems: sampleRight,
          matchingMode: "one_to_one",
          matches: { "1": "b" },
        })
      );
      expect(htmlSingle).toContain("Chỉ 1 ô – 1 mạch");
      expect(htmlSingle).toContain("Ghép nhanh ĐT");
      expect(htmlSingle).toContain('data-drag-handle="left"');
      expect(htmlSingle).toContain('data-anchor-left="0"');

      const htmlMulti = renderToStaticMarkup(
        React.createElement(InteractiveMatchingBoard, {
          leftItems: sampleLeft,
          rightItems: sampleRight,
          matchingMode: "multiple",
          matches: { "1": ["a", "b"] },
        })
      );
      expect(htmlMulti).toContain("1 ô nối nhiều mạch");
      expect(htmlMulti).toContain("➔ a");
      expect(htmlMulti).toContain("➔ b");
    });

    it("renders answer-key preview with distractor summary when showCorrectAnswers=true and hides answers when false", () => {
      const htmlKeyPreview = renderToStaticMarkup(
        React.createElement(InteractiveMatchingBoard, {
          isAnswerKeyPreview: true,
          readOnly: true,
          leftItems: sampleLeft,
          rightItems: sampleRight,
          matches: { "1": "b", "2": "a" },
          correctMatches: { "1": "b", "2": "a" },
        })
      );
      expect(htmlKeyPreview).toContain("Đáp án các mạch nối chuẩn:");
      expect(htmlKeyPreview).toContain("Ô không cần nối (gây nhiễu):");

      const htmlHiddenPreview = renderToStaticMarkup(
        React.createElement(InteractiveMatchingBoard, {
          isAnswerKeyPreview: false,
          isReview: false,
          readOnly: true,
          leftItems: sampleLeft,
          rightItems: sampleRight,
          matches: {},
          correctMatches: {},
        })
      );
      expect(htmlHiddenPreview).not.toContain("Đáp án các mạch nối chuẩn:");
      expect(htmlHiddenPreview).not.toContain("➔ b");
    });

    it("renders review mode accurately for both correctly left-blank and wrongly connected distractors", () => {
      const htmlGoodReview = renderToStaticMarkup(
        React.createElement(InteractiveMatchingBoard, {
          isReview: true,
          readOnly: true,
          leftItems: sampleLeft,
          rightItems: sampleRight,
          matches: { "1": "b", "2": "a" },
          correctMatches: { "1": "b", "2": "a" },
        })
      );
      expect(htmlGoodReview).toContain("Không nối");

      const htmlBadDistractor = renderToStaticMarkup(
        React.createElement(InteractiveMatchingBoard, {
          isReview: true,
          readOnly: true,
          leftItems: sampleLeft,
          rightItems: sampleRight,
          matches: { "1": "b", "2": "a", "3": "c" },
          correctMatches: { "1": "b", "2": "a" },
        })
      );
      expect(htmlBadDistractor).toContain("Đúng:");
      expect(htmlBadDistractor).toContain("Không nối");
    });
  });
});
