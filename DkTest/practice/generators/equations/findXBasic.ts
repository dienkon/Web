import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, generateNumericDistractors, shuffle } from "../utils";

export const findXBasicMode: PracticeMode = {
  id: "find-x-basic",
  title: "Tìm x cơ bản (Phép cộng)",
  description: "Luyện giải bài toán tìm x trong phép cộng: x + a = b hoặc a + x = b.",
  shortTag: "Tìm x phép cộng",
  category: "equations",
  gradeRange: [3, 6],
  icon: "Variable",
  badgeColor: "indigo",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Phạm vi 50", description: "Tìm x với các số nhỏ", examples: "x + 7 = 15, 12 + x = 30" },
    { id: 2, name: "Mức 2: Phạm vi 200", description: "Tìm x với số có 2-3 chữ số", examples: "x + 48 = 125, 67 + x = 150" },
    { id: 3, name: "Mức 3: Số lớn", description: "Tìm x với số hàng nghìn", examples: "x + 1240 = 3500" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const isXFirst = Math.random() > 0.5;

    let a = 0;
    let xVal = 0;

    if (diff === 1) {
      xVal = randomInt(5, 25);
      a = randomInt(4, 25);
    } else if (diff === 2) {
      xVal = randomInt(25, 90);
      a = randomInt(20, 85);
    } else {
      xVal = randomInt(200, 1500);
      a = randomInt(200, 1500);
    }

    const b = xVal + a;
    const prompt = isXFirst ? `x + ${a} = ${b}` : `${a} + x = ${b}`;
    const latex = isXFirst ? `x + ${a} = ${b}` : `${a} + x = ${b}`;
    const explanation = `Muốn tìm số hạng $x$ chưa biết, ta lấy tổng trừ đi số hạng đã biết:\n$x = ${b} - ${a}$\n$x = ${xVal}$.`;

    const dists = generateNumericDistractors(xVal, 3, diff === 1 ? 3 : 15);
    const options = shuffle([xVal, ...dists]).map((v) => ({ id: String(v), text: `x = ${v}`, latex: `x = ${v}` }));

    return {
      id: `fxb_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt: `Tìm x biết: ${prompt}`,
      latex: `\\text{Tìm } x \\text{ biết: } ${latex}`,
      subText: "Nhập giá trị của x",
      correctAnswer: xVal,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
