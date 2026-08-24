import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, lcm, simplifyFraction, shuffle } from "../utils";

export const fractionSubMode: PracticeMode = {
  id: "fraction-sub",
  title: "Trừ phân số",
  description: "Luyện trừ hai phân số cùng mẫu hoặc khác mẫu số và rút gọn về dạng tối giản.",
  shortTag: "Trừ phân số",
  category: "fractions",
  gradeRange: [4, 7],
  icon: "PieChart",
  badgeColor: "rose",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Cùng mẫu số", description: "Trừ phân số cùng mẫu", examples: "5/6 - 2/6 = 3/6 = 1/2" },
    { id: 2, name: "Mức 2: Khác mẫu số", description: "Quy đồng mẫu số đơn giản", examples: "3/4 - 1/3 = 5/12" },
    { id: 3, name: "Mức 3: Số tự nhiên trừ phân số", description: "1 - a/b hoặc a - b/c", examples: "2 - 3/5 = 7/5" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let n1 = 1, d1 = 2, n2 = 1, d2 = 2;
    let prompt = "";
    let latex = "";
    let explanation = "";
    let simplified = { num: 1, den: 2 };

    if (diff === 1) {
      d1 = randomInt(4, 10);
      d2 = d1;
      n1 = randomInt(3, d1 - 1);
      n2 = randomInt(1, n1 - 1);
      const rawNum = n1 - n2;
      simplified = simplifyFraction(rawNum, d1);
      prompt = `${n1}/${d1} - ${n2}/${d2} = ?`;
      latex = `\\frac{${n1}}{${d1}} - \\frac{${n2}}{${d2}} = ?`;
      explanation = `Cùng mẫu số: $\\frac{${n1}}{${d1}} - \\frac{${n2}}{${d2}} = \\frac{${n1} - ${n2}}{${d1}} = \\frac{${rawNum}}{${d1}} = \\frac{${simplified.num}}{${simplified.den}}$`;
    } else if (diff === 2) {
      d1 = randomInt(2, 6);
      d2 = randomInt(3, 7);
      if (d1 === d2) d2 += 1;
      const common = lcm(d1, d2);
      const m1 = common / d1;
      const m2 = common / d2;
      // ensure n1/d1 > n2/d2
      n1 = randomInt(2, d1);
      n2 = randomInt(1, Math.max(1, Math.floor((n1 * m1 - 1) / m2)));
      const rawNum = n1 * m1 - n2 * m2;
      simplified = simplifyFraction(rawNum, common);
      prompt = `${n1}/${d1} - ${n2}/${d2} = ?`;
      latex = `\\frac{${n1}}{${d1}} - \\frac{${n2}}{${d2}} = ?`;
      explanation = `Quy đồng mẫu số chung $${common}$:\n- $\\frac{${n1}}{${d1}} = \\frac{${n1 * m1}}{${common}}$\n- $\\frac{${n2}}{${d2}} = \\frac{${n2 * m2}}{${common}}$\n$\\implies \\frac{${n1}}{${d1}} - \\frac{${n2}}{${d2}} = \\frac{${n1 * m1} - ${n2 * m2}}{${common}} = \\frac{${rawNum}}{${common}} = \\frac{${simplified.num}}{${simplified.den}}$`;
    } else {
      const whole = randomInt(1, 3);
      d2 = randomInt(3, 8);
      n2 = randomInt(1, d2 - 1);
      const rawNum = whole * d2 - n2;
      simplified = simplifyFraction(rawNum, d2);
      prompt = `${whole} - ${n2}/${d2} = ?`;
      latex = `${whole} - \\frac{${n2}}{${d2}} = ?`;
      explanation = `Đổi số tự nhiên sang phân số: $${whole} = \\frac{${whole * d2}}{${d2}}$\n$\\implies ${whole} - \\frac{${n2}}{${d2}} = \\frac{${whole * d2} - ${n2}}{${d2}} = \\frac{${rawNum}}{${d2}} = \\frac{${simplified.num}}{${simplified.den}}$`;
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
      id: `fs_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
