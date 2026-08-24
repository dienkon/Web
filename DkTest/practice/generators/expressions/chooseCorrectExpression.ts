import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, shuffle } from "../utils";

export const chooseCorrectExpressionMode: PracticeMode = {
  id: "choose-correct-expression",
  title: "Chọn biểu thức có kết quả đúng",
  description: "Xác định biểu thức nào trong 4 lựa chọn cho ra kết quả bằng giá trị mục tiêu.",
  shortTag: "Chọn biểu thức",
  category: "expressions",
  gradeRange: [4, 7],
  icon: "CheckSquare",
  badgeColor: "teal",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Biểu thức đơn giản", description: "Các phép tính cơ bản", examples: "Mục tiêu: 27 -> 3 × (4 + 5)" },
    { id: 2, name: "Mức 2: Biểu thức nhiều phép tính", description: "Có dấu ngoặc và thứ tự tính", examples: "Mục tiêu: 48 -> (15 - 3) × 4" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;

    let target = 0;
    let correctExpr = "";
    let correctExprLatex = "";
    let wrongExprs: Array<{ text: string; latex: string; val: number }> = [];

    if (diff === 1) {
      const a = randomInt(2, 6);
      const b = randomInt(2, 6);
      const c = randomInt(2, 6);
      target = a * (b + c);
      correctExpr = `${a} × (${b} + ${c})`;
      correctExprLatex = `${a} \\times (${b} + ${c})`;

      wrongExprs = [
        { text: `${a} × ${b} + ${c}`, latex: `${a} \\times ${b} + ${c}`, val: a * b + c },
        { text: `(${a} + ${b}) × ${c}`, latex: `(${a} + ${b}) \\times ${c}`, val: (a + b) * c },
        { text: `${a} + ${b} × ${c}`, latex: `${a} + ${b} \\times ${c}`, val: a + b * c },
      ].filter((w) => w.val !== target);
    } else {
      const a = randomInt(4, 9);
      const b = randomInt(3, 8);
      const c = randomInt(2, 6);
      const d = randomInt(10, 20);
      target = a * b - c + d;
      correctExpr = `${a} × ${b} - ${c} + ${d}`;
      correctExprLatex = `${a} \\times ${b} - ${c} + ${d}`;

      wrongExprs = [
        { text: `${a} × (${b} - ${c}) + ${d}`, latex: `${a} \\times (${b} - ${c}) + ${d}`, val: a * (b - c) + d },
        { text: `${a} × ${b} - (${c} + ${d})`, latex: `${a} \\times ${b} - (${c} + ${d})`, val: a * b - (c + d) },
        { text: `(${a} × ${b} - ${c}) : 2`, latex: `(${a} \\times ${b} - ${c}) : 2`, val: Math.floor((a * b - c) / 2) },
      ].filter((w) => w.val !== target);
    }

    while (wrongExprs.length < 3) {
      wrongExprs.push({
        text: `${target + wrongExprs.length + 2} + 0`,
        latex: `${target + wrongExprs.length + 2} + 0`,
        val: target + wrongExprs.length + 2,
      });
    }

    const allOptions = shuffle([
      { id: "A_correct", text: correctExpr, latex: correctExprLatex, isCorrect: true },
      ...wrongExprs.slice(0, 3).map((w, idx) => ({
        id: `W_${idx}`,
        text: w.text,
        latex: w.latex,
        isCorrect: false,
      })),
    ]);

    const correctOption = allOptions.find((o) => o.isCorrect);

    const explanation = `Kiểm tra các biểu thức:\n- Biểu thức đúng: $${correctExprLatex} = ${target}$.\nCác biểu thức còn lại đều cho kết quả khác $${target}$.`;

    return {
      id: `cce_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "choice",
      prompt: `Biểu thức nào dưới đây có giá trị bằng ${target}?`,
      latex: `\\text{Biểu thức nào có giá trị bằng } \\mathbf{${target}}?`,
      subText: "Chọn một biểu thức chính xác nhất",
      correctAnswer: correctOption?.id || "A_correct",
      options: allOptions.map((o) => ({ id: o.id, text: o.text, latex: o.latex })),
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
