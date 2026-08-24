import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, generateNumericDistractors, shuffle } from "../utils";

export const findXDivMode: PracticeMode = {
  id: "find-x-div",
  title: "Tìm x với phép chia",
  description: "Luyện tìm số bị chia (x : a = b) hoặc tìm số chia (a : x = b).",
  shortTag: "Tìm x phép chia",
  category: "equations",
  gradeRange: [3, 7],
  icon: "Percent",
  badgeColor: "cyan",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Bảng chia", description: "Tìm x trong bảng chia 2-9", examples: "x : 7 = 8, 48 : x = 6" },
    { id: 2, name: "Mức 2: Phạm vi 200", description: "Tìm x với số có 2 chữ số", examples: "x : 12 = 15, 120 : x = 8" },
    { id: 3, name: "Mức 3: Số lớn", description: "Số bị chia 3-4 chữ số", examples: "x : 24 = 35" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const isFindDividend = Math.random() > 0.5; // x : a = b (x là số bị chia) vs a : x = b (x là số chia)

    let prompt = "";
    let latex = "";
    let xVal = 0;
    let explanation = "";

    if (diff === 1) {
      const a = randomInt(2, 9);
      const b = randomInt(3, 9);
      if (isFindDividend) {
        xVal = a * b;
        prompt = `x : ${a} = ${b}`;
        latex = `x : ${a} = ${b}`;
        explanation = `Muốn tìm số bị chia $x$, ta lấy thương nhân với số chia:\n$x = ${b} \\times ${a}$\n$x = ${xVal}$.`;
      } else {
        const dividend = a * b;
        xVal = a;
        prompt = `${dividend} : x = ${b}`;
        latex = `${dividend} : x = ${b}`;
        explanation = `Muốn tìm số chia $x$, ta lấy số bị chia chia cho thương:\n$x = ${dividend} : ${b}$\n$x = ${xVal}$.`;
      }
    } else if (diff === 2) {
      const a = randomInt(8, 16);
      const b = randomInt(6, 18);
      if (isFindDividend) {
        xVal = a * b;
        prompt = `x : ${a} = ${b}`;
        latex = `x : ${a} = ${b}`;
        explanation = `Muốn tìm số bị chia $x$, ta lấy thương nhân với số chia:\n$x = ${b} \\times ${a} = ${xVal}$.`;
      } else {
        const dividend = a * b;
        xVal = a;
        prompt = `${dividend} : x = ${b}`;
        latex = `${dividend} : x = ${b}`;
        explanation = `Muốn tìm số chia $x$, ta lấy số bị chia chia cho thương:\n$x = ${dividend} : ${b} = ${xVal}$.`;
      }
    } else {
      const a = randomInt(15, 30);
      const b = randomInt(15, 40);
      xVal = a * b;
      prompt = `x : ${a} = ${b}`;
      latex = `x : ${a} = ${b}`;
      explanation = `Muốn tìm số bị chia $x$, ta lấy thương nhân với số chia:\n$x = ${b} \\times ${a} = ${xVal}$.`;
    }

    const dists = generateNumericDistractors(xVal, 3, diff === 1 ? 2 : 10);
    const options = shuffle([xVal, ...dists]).map((v) => ({ id: String(v), text: `x = ${v}`, latex: `x = ${v}` }));

    return {
      id: `fxd_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
