import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, randomChoice, generateNumericDistractors, shuffle } from "../utils";

export const percentageBasicMode: PracticeMode = {
  id: "percentage-basic",
  title: "Tỉ số phần trăm",
  description: "Luyện tính phần trăm của một số (ví dụ: 15% của 200) hoặc tìm một số khi biết giá trị phần trăm.",
  shortTag: "Tỉ số phần trăm",
  category: "advanced",
  gradeRange: [5, 8],
  icon: "Percent",
  badgeColor: "yellow",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Tính 10%, 20%, 50%", description: "Các tỉ lệ phần trăm quen thuộc", examples: "50% của 80, 10% của 250" },
    { id: 2, name: "Mức 2: Tỉ lệ phần trăm tổng quát", description: "15%, 25%, 35% của một số", examples: "25% của 160, 30% của 450" },
    { id: 3, name: "Mức 3: Tìm một số biết phần trăm", description: "Biết 20% của x là 40, tìm x", examples: "Biết 25% của A là 50, tìm A" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let prompt = "";
    let latex = "";
    let correctAnswer = 0;
    let explanation = "";

    if (diff === 1) {
      const pct = randomChoice([10, 20, 25, 50]);
      const base = randomInt(2, 20) * (100 / pct);
      correctAnswer = (base * pct) / 100;
      prompt = `Tính ${pct}% của ${base}`;
      latex = `\\text{Tính } ${pct}\\% \\text{ của } ${base}`;
      explanation = `Cách tính: $${pct}\\% \\times ${base} = \\frac{${pct} \\times ${base}}{100} = ${correctAnswer}$.`;
    } else if (diff === 2) {
      const pct = randomChoice([5, 15, 30, 40, 75]);
      const base = randomInt(2, 10) * 100;
      correctAnswer = (base * pct) / 100;
      prompt = `Tính ${pct}% của ${base}`;
      latex = `\\text{Tính } ${pct}\\% \\text{ của } ${base}`;
      explanation = `Muốn tìm $${pct}\\%$ của $${base}$, ta lấy $${base} \\times ${pct} : 100 = ${correctAnswer}$.`;
    } else {
      const pct = randomChoice([10, 20, 25, 50]);
      const target = randomInt(2, 15) * 10;
      correctAnswer = (target * 100) / pct;
      prompt = `Tìm một số biết ${pct}% của số đó là ${target}`;
      latex = `\\text{Biết } ${pct}\\% \\text{ của số } x \\text{ là } ${target}. \\text{ Tìm } x`;
      explanation = `Muốn tìm số đó, ta lấy $${target} : ${pct} \\times 100 = ${correctAnswer}$.`;
    }

    const dists = generateNumericDistractors(correctAnswer, 3, diff === 1 ? 5 : 20);
    const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `pct_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: "Nhập kết quả hoặc chọn đáp án",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
