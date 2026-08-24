import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, generateNumericDistractors, shuffle } from "../utils";

export const findXSubMode: PracticeMode = {
  id: "find-x-sub",
  title: "Tìm x với phép trừ",
  description: "Luyện tìm số bị trừ (x - a = b) hoặc tìm số trừ (a - x = b).",
  shortTag: "Tìm x phép trừ",
  category: "equations",
  gradeRange: [3, 6],
  icon: "MinusCircle",
  badgeColor: "pink",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Phạm vi 50", description: "Tìm x trong phép trừ cơ bản", examples: "x - 8 = 13, 35 - x = 12" },
    { id: 2, name: "Mức 2: Phạm vi 200", description: "Số có 2-3 chữ số", examples: "x - 47 = 85, 120 - x = 45" },
    { id: 3, name: "Mức 3: Số lớn", description: "Số hàng trăm và hàng nghìn", examples: "x - 350 = 780" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const isFindMinuend = Math.random() > 0.5; // x - a = b (x là số bị trừ) vs a - x = b (x là số trừ)

    let prompt = "";
    let latex = "";
    let xVal = 0;
    let explanation = "";

    const max = diff === 1 ? 40 : diff === 2 ? 150 : 900;
    const min = diff === 1 ? 5 : diff === 2 ? 20 : 100;

    if (isFindMinuend) {
      // x - a = b => x = a + b
      const a = randomInt(min, max);
      const b = randomInt(min, max);
      xVal = a + b;
      prompt = `x - ${a} = ${b}`;
      latex = `x - ${a} = ${b}`;
      explanation = `Muốn tìm số bị trừ $x$, ta lấy hiệu cộng với số trừ:\n$x = ${b} + ${a}$\n$x = ${xVal}$.`;
    } else {
      // a - x = b => x = a - b
      const a = randomInt(min * 2 + 10, max * 2);
      const b = randomInt(min, a - min);
      xVal = a - b;
      prompt = `${a} - x = ${b}`;
      latex = `${a} - x = ${b}`;
      explanation = `Muốn tìm số trừ $x$, ta lấy số bị trừ trừ đi hiệu:\n$x = ${a} - ${b}$\n$x = ${xVal}$.`;
    }

    const dists = generateNumericDistractors(xVal, 3, diff === 1 ? 3 : 15);
    const options = shuffle([xVal, ...dists]).map((v) => ({ id: String(v), text: `x = ${v}`, latex: `x = ${v}` }));

    return {
      id: `fxs_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
