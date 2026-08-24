import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, gcd, lcm, generateNumericDistractors, shuffle } from "../utils";

export const gcdLcmMode: PracticeMode = {
  id: "gcd-lcm",
  title: "ƯCLN & BCNN",
  description: "Luyện tìm Ước chung lớn nhất (ƯCLN) và Bội chung nhỏ nhất (BCNN) của hai số tự nhiên.",
  shortTag: "ƯCLN & BCNN",
  category: "advanced",
  gradeRange: [5, 7],
  icon: "Binary",
  badgeColor: "cyan",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: ƯCLN số nhỏ", description: "Tìm ƯCLN của hai số trong phạm vi 50", examples: "ƯCLN(12, 18) = 6" },
    { id: 2, name: "Mức 2: BCNN số nhỏ", description: "Tìm BCNN của hai số trong phạm vi 30", examples: "BCNN(6, 8) = 24" },
    { id: 3, name: "Mức 3: ƯCLN & BCNN nâng cao", description: "Tìm ƯCLN, BCNN số lớn hoặc số nguyên tố cùng nhau", examples: "ƯCLN(48, 72) = 24, BCNN(12, 15) = 60" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const isGCD = diff === 1 ? true : diff === 2 ? false : Math.random() > 0.5;

    let a = 0;
    let b = 0;

    if (diff === 1) {
      a = randomInt(2, 6) * randomInt(2, 6);
      b = randomInt(2, 6) * randomInt(2, 6);
      if (a === b) b += 6;
    } else if (diff === 2) {
      a = randomInt(4, 12);
      b = randomInt(4, 12);
      if (a === b) b += 2;
    } else {
      a = randomInt(12, 45);
      b = randomInt(15, 60);
      if (a === b) b += 6;
    }

    const gcdVal = gcd(a, b);
    const lcmVal = lcm(a, b);
    const correctAnswer = isGCD ? gcdVal : lcmVal;

    const prompt = isGCD ? `Tìm ƯCLN(${a}, ${b})` : `Tìm BCNN(${a}, ${b})`;
    const latex = isGCD ? `\\text{ƯCLN}(${a}, ${b}) = ?` : `\\text{BCNN}(${a}, ${b}) = ?`;

    let explanation = "";
    if (isGCD) {
      explanation = `Phân tích ra thừa số nguyên tố để tìm ƯCLN:\n$\\text{ƯCLN}(${a}, ${b}) = ${gcdVal}$.`;
    } else {
      explanation = `Phân tích ra thừa số nguyên tố hoặc dùng công thức $\\text{BCNN}(a, b) = \\frac{a \\times b}{\\text{ƯCLN}(a, b)}$:\n$\\text{BCNN}(${a}, ${b}) = ${lcmVal}$.`;
    }

    const dists = generateNumericDistractors(correctAnswer, 3, isGCD ? 2 : 12);
    const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `gcdlcm_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: isGCD ? "Nhập Ước chung lớn nhất" : "Nhập Bội chung nhỏ nhất",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
