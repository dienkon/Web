import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, generateNumericDistractors, shuffle } from "../utils";

export const missingNumberMode: PracticeMode = {
  id: "missing-number",
  title: "Tìm số còn thiếu",
  description: "Tìm số hạng, số bị trừ hoặc số trừ còn thiếu trong các phép tính cộng, trừ.",
  shortTag: "Số còn thiếu",
  category: "arithmetic",
  gradeRange: [3, 5],
  icon: "HelpCircle",
  badgeColor: "indigo",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Phạm vi 20", description: "Tìm số còn thiếu trong phạm vi 20", examples: "8 + ? = 15, ? - 6 = 9" },
    { id: 2, name: "Mức 2: Phạm vi 100", description: "Tìm số còn thiếu phạm vi 100", examples: "25 + ? = 47, 72 - ? = 35" },
    { id: 3, name: "Mức 3: Số có 3 chữ số", description: "Tìm số còn thiếu 3 chữ số", examples: "145 + ? = 320, ? - 150 = 230" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const type = randomInt(1, 3); // 1: a + ? = c, 2: ? + b = c, 3: a - ? = c, 4: ? - b = c
    let prompt = "";
    let latex = "";
    let correctAnswer = 0;
    let explanation = "";

    const maxVal = diff === 1 ? 20 : diff === 2 ? 100 : 800;
    const minVal = diff === 1 ? 2 : diff === 2 ? 15 : 100;

    if (type === 1) {
      // a + ? = sum
      const a = randomInt(minVal, Math.floor(maxVal * 0.6));
      const b = randomInt(minVal, maxVal - a);
      const sum = a + b;
      correctAnswer = b;
      prompt = `${a} + ? = ${sum}`;
      latex = `${a} + \\mathbf{?} = ${sum}`;
      explanation = `Muốn tìm số hạng chưa biết, ta lấy tổng trừ đi số hạng đã biết:\n$\\mathbf{?} = ${sum} - ${a} = ${b}$.`;
    } else if (type === 2) {
      // ? + b = sum
      const a = randomInt(minVal, Math.floor(maxVal * 0.6));
      const b = randomInt(minVal, maxVal - a);
      const sum = a + b;
      correctAnswer = a;
      prompt = `? + ${b} = ${sum}`;
      latex = `\\mathbf{?} + ${b} = ${sum}`;
      explanation = `Muốn tìm số hạng chưa biết, ta lấy tổng trừ đi số hạng đã biết:\n$\\mathbf{?} = ${sum} - ${b} = ${a}$.`;
    } else {
      // a - ? = diff
      const a = randomInt(minVal * 2, maxVal);
      const b = randomInt(minVal, a - minVal);
      const diffVal = a - b;
      correctAnswer = b;
      prompt = `${a} - ? = ${diffVal}`;
      latex = `${a} - \\mathbf{?} = ${diffVal}`;
      explanation = `Muốn tìm số trừ, ta lấy số bị trừ trừ đi hiệu:\n$\\mathbf{?} = ${a} - ${diffVal} = ${b}$.`;
    }

    const dists = generateNumericDistractors(correctAnswer, 3, diff <= 1 ? 3 : 15);
    const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `mn_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: "Tìm số thích hợp điền vào dấu ?",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
