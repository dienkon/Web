import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, simplifyFraction, shuffle } from "../utils";

export const fractionMulMode: PracticeMode = {
  id: "fraction-mul",
  title: "Nhân phân số",
  description: "Luyện nhân hai phân số (lấy tử nhân tử, mẫu nhân mẫu) và rút gọn tối giản.",
  shortTag: "Nhân phân số",
  category: "fractions",
  gradeRange: [4, 7],
  icon: "PieChart",
  badgeColor: "emerald",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Nhân phân số đơn giản", description: "Tử và mẫu nhỏ (<= 6)", examples: "2/3 × 3/5 = 6/15 = 2/5" },
    { id: 2, name: "Mức 2: Phân số nhân số tự nhiên", description: "a/b × c hoặc c × a/b", examples: "3/4 × 8 = 6" },
    { id: 3, name: "Mức 3: Rút gọn chéo nâng cao", description: "Nhân phân số có thể rút gọn chéo", examples: "15/16 × 8/25 = 3/10" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let n1 = 1, d1 = 2, n2 = 1, d2 = 2;
    let prompt = "";
    let latex = "";
    let explanation = "";
    let simplified = { num: 1, den: 2 };

    if (diff === 1) {
      n1 = randomInt(1, 4);
      d1 = randomInt(n1 + 1, 6);
      n2 = randomInt(1, 4);
      d2 = randomInt(n2 + 1, 6);
      const rawNum = n1 * n2;
      const rawDen = d1 * d2;
      simplified = simplifyFraction(rawNum, rawDen);
      prompt = `${n1}/${d1} × ${n2}/${d2} = ?`;
      latex = `\\frac{${n1}}{${d1}} \\times \\frac{${n2}}{${d2}} = ?`;
      explanation = `Muốn nhân hai phân số, ta lấy tử số nhân với tử số, mẫu số nhân với mẫu số:\n$\\frac{${n1}}{${d1}} \\times \\frac{${n2}}{${d2}} = \\frac{${n1} \\times ${n2}}{${d1} \\times ${d2}} = \\frac{${rawNum}}{${rawDen}} = \\frac{${simplified.num}}{${simplified.den}}$`;
    } else if (diff === 2) {
      n1 = randomInt(2, 5);
      d1 = randomInt(3, 7);
      const whole = randomInt(2, 8);
      const rawNum = n1 * whole;
      const rawDen = d1;
      simplified = simplifyFraction(rawNum, rawDen);
      prompt = `${n1}/${d1} × ${whole} = ?`;
      latex = `\\frac{${n1}}{${d1}} \\times ${whole} = ?`;
      explanation = `Ta lấy tử số nhân với số tự nhiên, giữ nguyên mẫu số:\n$\\frac{${n1}}{${d1}} \\times ${whole} = \\frac{${n1} \\times ${whole}}{${d1}} = \\frac{${rawNum}}{${rawDen}} = \\frac{${simplified.num}}{${simplified.den}}$`;
    } else {
      n1 = randomInt(3, 15);
      d1 = randomInt(4, 16);
      n2 = randomInt(3, 15);
      d2 = randomInt(4, 16);
      const rawNum = n1 * n2;
      const rawDen = d1 * d2;
      simplified = simplifyFraction(rawNum, rawDen);
      prompt = `${n1}/${d1} × ${n2}/${d2} = ?`;
      latex = `\\frac{${n1}}{${d1}} \\times \\frac{${n2}}{${d2}} = ?`;
      explanation = `Nhân tử với tử, mẫu với mẫu và rút gọn:\n$\\frac{${n1}}{${d1}} \\times \\frac{${n2}}{${d2}} = \\frac{${rawNum}}{${rawDen}} = \\frac{${simplified.num}}{${simplified.den}}$`;
    }

    const dist1 = simplifyFraction(simplified.num + 1, simplified.den);
    const dist2 = simplifyFraction(Math.max(1, simplified.num - 1), simplified.den);
    const dist3 = simplifyFraction(simplified.num, simplified.den + 1);

    const allOptions = shuffle([
      { id: `${simplified.num}/${simplified.den}`, text: `${simplified.num}/${simplified.den}`, latex: `\\frac{${simplified.num}}{${simplified.den}}` },
      { id: `${dist1.num}/${dist1.den}`, text: `${dist1.num}/${dist1.den}`, latex: `\\frac{${dist1.num}}{${dist1.den}}` },
      { id: `${dist2.num}/${dist2.den}`, text: `${dist2.num}/${dist2.den}`, latex: `\\frac{${dist2.num}}{${dist2.den}}` },
      { id: `${dist3.num}/${dist3.den}`, text: `${dist3.num}/${dist3.den}`, latex: `\\frac{${dist3.num}}{${dist3.den}}` },
    ]);

    return {
      id: `fm_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "fraction",
      prompt,
      latex,
      subText: "Nhập kết quả phân số tối giản",
      correctAnswer: { numerator: simplified.num, denominator: simplified.den },
      options: allOptions,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
