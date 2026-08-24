import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, randomChoice, generateNumericDistractors, shuffle } from "../utils";

export const wordSumRatioMode: PracticeMode = {
  id: "word-sum-ratio",
  title: "Toán Tổng - Tỉ & Hiệu - Tỉ",
  description: "Dạng toán: Tìm hai số khi biết Tổng và Tỉ số, hoặc Hiệu và Tỉ số của hai số đó.",
  shortTag: "Toán Tổng - Tỉ",
  category: "word_problems",
  gradeRange: [4, 6],
  icon: "DivideCircle",
  badgeColor: "emerald",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Tổng - Tỉ cơ bản", description: "Biết tổng và tỉ số của 2 số", examples: "Tổng 2 số là 72, tỉ số là 1/3. Tìm số bé" },
    { id: 2, name: "Mức 2: Hiệu - Tỉ cơ bản", description: "Biết hiệu và tỉ số của 2 số", examples: "Hiệu 2 số là 30, tỉ số là 2/5. Tìm số lớn" },
    { id: 3, name: "Mức 3: Bài toán thực tế", description: "Tuổi mẹ và con, số thóc hai kho", examples: "Mẹ gấp 4 lần tuổi con, mẹ hơn con 27 tuổi" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const isSumRatio = diff === 1 ? true : diff === 2 ? false : Math.random() > 0.5;

    let r1 = 1; // ratio num
    let r2 = 3; // ratio den
    let partValue = 5;

    if (diff === 1) {
      r1 = randomChoice([1, 2, 3]);
      r2 = r1 + randomInt(1, 4);
      partValue = randomInt(4, 15);
    } else if (diff === 2) {
      r1 = randomChoice([2, 3, 4]);
      r2 = r1 + randomInt(1, 4);
      partValue = randomInt(5, 20);
    } else {
      r1 = 1;
      r2 = randomInt(3, 5);
      partValue = randomInt(6, 12);
    }

    const num1 = r1 * partValue; // smaller
    const num2 = r2 * partValue; // larger
    const sum = num1 + num2;
    const diffVal = num2 - num1;

    const isAskLarger = Math.random() > 0.5;
    const target = isAskLarger ? num2 : num1;
    const targetName = isAskLarger ? "số lớn" : "số bé";

    let prompt = "";
    let latex = "";
    let explanation = "";

    if (isSumRatio) {
      prompt = `Tổng của hai số là ${sum}, tỉ số của hai số là ${r1}/${r2}. Tìm ${targetName}.`;
      latex = `\\text{Tổng } = ${sum}, \\text{ Tỉ số } = \\frac{${r1}}{${r2}}. \\text{ Tìm } \\textbf{${targetName}}`;
      explanation = `Phương pháp giải Tổng - Tỉ:\n- Tổng số phần bằng nhau: $${r1} + ${r2} = ${r1 + r2}$ (phần)\n- Giá trị 1 phần: $${sum} : ${r1 + r2} = ${partValue}$\n- ${isAskLarger ? `Số lớn là: $${partValue} \\times ${r2} = ${num2}$` : `Số bé là: $${partValue} \\times ${r1} = ${num1}$`}.`;
    } else {
      prompt = `Hiệu của hai số là ${diffVal}, tỉ số của hai số là ${r1}/${r2}. Tìm ${targetName}.`;
      latex = `\\text{Hiệu } = ${diffVal}, \\text{ Tỉ số } = \\frac{${r1}}{${r2}}. \\text{ Tìm } \\textbf{${targetName}}`;
      explanation = `Phương pháp giải Hiệu - Tỉ:\n- Hiệu số phần bằng nhau: $${r2} - ${r1} = ${r2 - r1}$ (phần)\n- Giá trị 1 phần: $${diffVal} : ${r2 - r1} = ${partValue}$\n- ${isAskLarger ? `Số lớn là: $${partValue} \\times ${r2} = ${num2}$` : `Số bé là: $${partValue} \\times ${r1} = ${num1}$`}.`;
    }

    const dists = generateNumericDistractors(target, 3, diff === 1 ? 5 : 20);
    const options = shuffle([target, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `wsr_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: `Nhập giá trị của ${targetName}`,
      correctAnswer: target,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
