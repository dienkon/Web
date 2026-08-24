import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, generateNumericDistractors, shuffle } from "../utils";

export const missingFactorMode: PracticeMode = {
  id: "missing-factor",
  title: "Tìm thành phần chưa biết",
  description: "Tìm thừa số, số bị chia hoặc số chia chưa biết trong phép nhân và chia.",
  shortTag: "Thừa số & Số chia",
  category: "arithmetic",
  gradeRange: [3, 5],
  icon: "Sliders",
  badgeColor: "purple",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Bảng cửu chương", description: "Tìm thừa số trong bảng nhân 2-9", examples: "? × 7 = 56, 45 : ? = 9" },
    { id: 2, name: "Mức 2: Tích đến 200", description: "Tìm thừa số hoặc số bị chia nâng cao", examples: "? × 12 = 84, ? : 8 = 15" },
    { id: 3, name: "Mức 3: Số lớn", description: "Số bị chia hoặc thừa số 3 chữ số", examples: "25 × ? = 375, ? : 14 = 32" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const kind = randomInt(1, 3); // 1: ? × b = prod, 2: a : ? = quot, 3: ? : b = quot
    let prompt = "";
    let latex = "";
    let correctAnswer = 0;
    let explanation = "";

    if (diff === 1) {
      if (kind === 1) {
        const a = randomInt(3, 9);
        const b = randomInt(2, 9);
        const prod = a * b;
        correctAnswer = a;
        prompt = `? × ${b} = ${prod}`;
        latex = `\\mathbf{?} \\times ${b} = ${prod}`;
        explanation = `Muốn tìm thừa số chưa biết, ta lấy tích chia cho thừa số đã biết:\n$\\mathbf{?} = ${prod} : ${b} = ${a}$.`;
      } else if (kind === 2) {
        const divisor = randomInt(2, 9);
        const quot = randomInt(3, 9);
        const dividend = divisor * quot;
        correctAnswer = divisor;
        prompt = `${dividend} : ? = ${quot}`;
        latex = `${dividend} : \\mathbf{?} = ${quot}`;
        explanation = `Muốn tìm số chia, ta lấy số bị chia chia cho thương:\n$\\mathbf{?} = ${dividend} : ${quot} = ${divisor}$.`;
      } else {
        const divisor = randomInt(2, 9);
        const quot = randomInt(2, 9);
        const dividend = divisor * quot;
        correctAnswer = dividend;
        prompt = `? : ${divisor} = ${quot}`;
        latex = `\\mathbf{?} : ${divisor} = ${quot}`;
        explanation = `Muốn tìm số bị chia, ta lấy thương nhân với số chia:\n$\\mathbf{?} = ${quot} \\times ${divisor} = ${dividend}$.`;
      }
    } else if (diff === 2) {
      if (kind === 1) {
        const a = randomInt(6, 16);
        const b = randomInt(7, 18);
        const prod = a * b;
        correctAnswer = a;
        prompt = `? × ${b} = ${prod}`;
        latex = `\\mathbf{?} \\times ${b} = ${prod}`;
        explanation = `Ta lấy tích chia cho thừa số đã biết:\n$\\mathbf{?} = ${prod} : ${b} = ${a}$.`;
      } else {
        const divisor = randomInt(6, 15);
        const quot = randomInt(8, 20);
        const dividend = divisor * quot;
        correctAnswer = dividend;
        prompt = `? : ${divisor} = ${quot}`;
        latex = `\\mathbf{?} : ${divisor} = ${quot}`;
        explanation = `Ta lấy thương nhân với số chia:\n$\\mathbf{?} = ${quot} \\times ${divisor} = ${dividend}$.`;
      }
    } else {
      const a = randomInt(12, 35);
      const b = randomInt(15, 40);
      const prod = a * b;
      correctAnswer = a;
      prompt = `${b} × ? = ${prod}`;
      latex = `${b} \\times \\mathbf{?} = ${prod}`;
      explanation = `Ta lấy tích chia cho thừa số đã biết:\n$\\mathbf{?} = ${prod} : ${b} = ${a}$.`;
    }

    const dists = generateNumericDistractors(correctAnswer, 3, diff <= 1 ? 2 : 10);
    const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `mf_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
