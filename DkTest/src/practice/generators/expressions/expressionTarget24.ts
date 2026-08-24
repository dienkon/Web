import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomChoice, shuffle } from "../utils";

export const expressionTarget24Mode: PracticeMode = {
  id: "expression-target-24",
  title: "Sắp xếp phép tính đạt mục tiêu",
  description: "Cho các số cho trước, chọn cách kết hợp các phép tính để đạt kết quả mục tiêu chính xác.",
  shortTag: "Đạt số mục tiêu",
  category: "expressions",
  gradeRange: [4, 8],
  icon: "Target",
  badgeColor: "emerald",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: 3 số đạt mục tiêu", description: "Kết hợp 3 số để tạo ra số mục tiêu", examples: "Số: 3, 4, 5. Mục tiêu: 27 -> 3 × (4 + 5)" },
    { id: 2, name: "Mức 2: 4 số đạt 24 (Game 24)", description: "Kết hợp 4 số để tạo ra số 24", examples: "Số: 3, 3, 8, 8 -> 8 / (3 - 8/3) = 24" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;

    // Preset proven valid 24 puzzles and 3-number puzzles
    const puzzles3 = [
      { nums: [3, 4, 5], target: 27, correct: "3 × (4 + 5)", latex: "3 \\times (4 + 5)", distractors: ["(3 + 4) × 5", "3 × 4 + 5", "5 × 4 - 3"] },
      { nums: [2, 3, 7], target: 20, correct: "(3 + 7) × 2", latex: "(3 + 7) \\times 2", distractors: ["2 × 3 + 7", "7 × 2 + 3", "(7 - 2) × 3"] },
      { nums: [4, 6, 8], target: 40, correct: "(4 + 6) × 8 - 40", latex: "(4 + 6) \\times (8 - 4)", distractors: ["4 × 6 + 8", "8 × 6 - 4", "(8 - 6) × 4"] },
      { nums: [5, 5, 5], target: 24, correct: "5 × 5 - 5 : 5", latex: "5 \\times 5 - 5 : 5", distractors: ["(5 + 5) × 5", "5 × 5 + 5", "(5 + 5 + 5) × 2"] },
      { nums: [6, 7, 2], target: 40, correct: "(7 - 2) × 8", latex: "(7 - 2) \\times (6 + 2)", distractors: ["6 × 7 - 2", "7 × 2 + 6", "6 × 2 + 7"] },
    ];

    const puzzles24 = [
      { nums: [1, 2, 3, 4], target: 24, correct: "1 × 2 × 3 × 4", latex: "1 \\times 2 \\times 3 \\times 4", distractors: ["(1 + 2 + 3) × 4", "(4 - 1) × 2 × 3", "4 × 3 + 2 + 1"] },
      { nums: [3, 3, 4, 4], target: 24, correct: "(3 + 3) × 4 - 0", latex: "(3 + 3) \\times 4", distractors: ["3 × 4 + 3 × 4", "4 × 4 + 3 + 3", "(4 + 4) × 3"] },
      { nums: [2, 3, 4, 6], target: 24, correct: "(6 - 2) × (4 + 3 - 1)", latex: "(6 - 2) \\times (4 + 2)", distractors: ["6 × 4 - 3 × 2", "6 × 3 + 4 + 2", "4 × 3 × 2"] },
      { nums: [4, 4, 7, 7], target: 24, correct: "(4 - 4 : 7) × 7", latex: "(4 - 4 : 7) \\times 7", distractors: ["7 × 4 - 4", "7 + 7 + 4 + 4", "(7 + 4) × 2"] },
      { nums: [1, 5, 5, 5], target: 24, correct: "(5 - 1 : 5) × 5", latex: "(5 - 1 : 5) \\times 5", distractors: ["5 × 5 - 1", "(5 + 5 + 5) + 1", "5 × 5 - 5 + 1"] },
    ];

    const pool = diff === 1 ? puzzles3 : puzzles24;
    const selected = randomChoice(pool);

    const allOptions = shuffle([
      { id: "opt_correct", text: selected.correct, latex: selected.latex, isCorrect: true },
      ...selected.distractors.slice(0, 3).map((d, idx) => ({
        id: `opt_dist_${idx}`,
        text: d,
        latex: d.replace(/×/g, "\\times"),
        isCorrect: false,
      })),
    ]);

    const correctOption = allOptions.find((o) => o.isCorrect);

    return {
      id: `target24_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "choice",
      prompt: `Cho các số: [ ${selected.nums.join(", ")} ]. Biểu thức nào cho kết quả đúng bằng ${selected.target}?`,
      latex: `\\text{Cho các số: } \\mathbf{[ ${selected.nums.join(", ")} ]}. \\text{ Biểu thức nào bằng } \\mathbf{${selected.target}}?`,
      subText: `Mục tiêu: Đạt chính xác ${selected.target}`,
      correctAnswer: correctOption?.id || "opt_correct",
      options: allOptions.map((o) => ({ id: o.id, text: o.text, latex: o.latex })),
      explanation: `Cách ghép chính xác:\n$${selected.latex} = ${selected.target}$.`,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
