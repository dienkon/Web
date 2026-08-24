import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, generateNumericDistractors, shuffle } from "../utils";

export const findXMulMode: PracticeMode = {
  id: "find-x-mul",
  title: "Tìm x với phép nhân",
  description: "Luyện tìm thừa số x chưa biết: a × x = b hoặc ax = b.",
  shortTag: "Tìm x phép nhân",
  category: "equations",
  gradeRange: [3, 7],
  icon: "Asterisk",
  badgeColor: "violet",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Bảng cửu chương", description: "Tìm x trong bảng nhân 2-9", examples: "6 × x = 42, 7x = 56" },
    { id: 2, name: "Mức 2: Tích đến 200", description: "Thừa số 2 chữ số", examples: "12 × x = 144, 15x = 90" },
    { id: 3, name: "Mức 3: Số lớn", description: "Tích số có 3-4 chữ số", examples: "24 × x = 864" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let a = 0;
    let xVal = 0;

    if (diff === 1) {
      a = randomInt(2, 9);
      xVal = randomInt(2, 9);
    } else if (diff === 2) {
      a = randomInt(8, 16);
      xVal = randomInt(6, 18);
    } else {
      a = randomInt(14, 35);
      xVal = randomInt(15, 45);
    }

    const b = a * xVal;
    const isAlge = diff >= 2 && Math.random() > 0.5;
    const prompt = isAlge ? `${a}x = ${b}` : `${a} × x = ${b}`;
    const latex = isAlge ? `${a}x = ${b}` : `${a} \\times x = ${b}`;
    const explanation = `Muốn tìm thừa số $x$, ta lấy tích chia cho thừa số đã biết:\n$x = ${b} : ${a}$\n$x = ${xVal}$.`;

    const dists = generateNumericDistractors(xVal, 3, diff === 1 ? 2 : 5);
    const options = shuffle([xVal, ...dists]).map((v) => ({ id: String(v), text: `x = ${v}`, latex: `x = ${v}` }));

    return {
      id: `fxm_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
