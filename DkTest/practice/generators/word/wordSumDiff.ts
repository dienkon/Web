import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, randomChoice, generateNumericDistractors, shuffle } from "../utils";

export const wordSumDiffMode: PracticeMode = {
  id: "word-sum-diff",
  title: "Toán Tổng - Hiệu",
  description: "Dạng toán kinh điển: Tìm hai số khi biết tổng và hiệu của hai số đó.",
  shortTag: "Toán Tổng - Hiệu",
  category: "word_problems",
  gradeRange: [4, 6],
  icon: "FileText",
  badgeColor: "blue",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Số nhỏ trực tiếp", description: "Biết trực tiếp tổng và hiệu", examples: "Tổng 2 số là 70, hiệu là 10. Tìm số lớn" },
    { id: 2, name: "Mức 2: Bài toán thực tế", description: "Tuổi bố và con, số học sinh nam và nữ", examples: "Tổng số tuổi 2 bố con là 50, bố hơn con 26 tuổi" },
    { id: 3, name: "Mức 3: Số lớn và ẩn hiệu", description: "Tổng và hiệu lớn", examples: "Hai thùng có tổng 350 lít dầu, thùng 1 nhiều hơn thùng 2 là 40 lít" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const isAskLarger = Math.random() > 0.5;

    let smaller = 0;
    let larger = 0;

    if (diff === 1) {
      smaller = randomInt(10, 40);
      const diffVal = randomInt(2, 10) * 2; // ensure even
      larger = smaller + diffVal;
    } else if (diff === 2) {
      smaller = randomInt(8, 25);
      const diffVal = randomInt(12, 20) * 2;
      larger = smaller + diffVal;
    } else {
      smaller = randomInt(100, 450);
      const diffVal = randomInt(15, 60) * 2;
      larger = smaller + diffVal;
    }

    const sum = larger + smaller;
    const diffVal = larger - smaller;
    const target = isAskLarger ? larger : smaller;
    const targetName = isAskLarger ? "Số lớn" : "Số bé";

    let prompt = "";
    let latex = "";
    let explanation = "";

    if (diff === 1 || diff === 3) {
      prompt = `Hai số có tổng bằng ${sum} và hiệu bằng ${diffVal}. Tìm ${targetName.toLowerCase()}.`;
      latex = `\\text{Tổng } = ${sum}, \\text{ Hiệu } = ${diffVal}. \\text{ Tìm } \\textbf{${targetName.toLowerCase()}}`;
      if (isAskLarger) {
        explanation = `Công thức tìm số lớn:\n$\\text{Số lớn} = (\\text{Tổng} + \\text{Hiệu}) : 2 = (${sum} + ${diffVal}) : 2 = ${sum + diffVal} : 2 = ${larger}$.`;
      } else {
        explanation = `Công thức tìm số bé:\n$\\text{Số bé} = (\\text{Tổng} - \\text{Hiệu}) : 2 = (${sum} - ${diffVal}) : 2 = ${sum - diffVal} : 2 = ${smaller}$.`;
      }
    } else {
      const names = randomChoice([
        { entityA: "Tuổi của bố và con", nameA: "bố", nameB: "con", unit: "tuổi" },
        { entityA: "Số học sinh nam và nữ của lớp", nameA: "học sinh nam", nameB: "học sinh nữ", unit: "học sinh" },
        { entityA: "Hai thùng dầu", nameA: "thùng thứ nhất", nameB: "thùng thứ hai", unit: "lít" },
      ]);
      prompt = `${names.entityA} có tổng là ${sum} ${names.unit}, ${names.nameA} nhiều hơn ${names.nameB} là ${diffVal} ${names.unit}. Hỏi ${isAskLarger ? names.nameA : names.nameB} có bao nhiêu ${names.unit}?`;
      latex = `\\text{Tổng: } ${sum}\\text{ ${names.unit}}, \\text{ Hiệu: } ${diffVal}\\text{ ${names.unit}}. \\text{ Tìm } ${isAskLarger ? names.nameA : names.nameB}`;
      explanation = isAskLarger
        ? `Số ${names.nameA} là: $(${sum} + ${diffVal}) : 2 = ${larger}\\text{ ${names.unit}}$.`
        : `Số ${names.nameB} là: $(${sum} - ${diffVal}) : 2 = ${smaller}\\text{ ${names.unit}}$.`;
    }

    const dists = generateNumericDistractors(target, 3, diff === 1 ? 5 : 25);
    const options = shuffle([target, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `wsd_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: `Nhập giá trị của ${targetName.toLowerCase()}`,
      correctAnswer: target,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
