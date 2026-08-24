import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, gcd, lcm, simplifyFraction, shuffle } from "../utils";

export const fractionAddMode: PracticeMode = {
  id: "fraction-add",
  title: "Cộng phân số",
  description: "Luyện cộng hai phân số cùng mẫu số hoặc khác mẫu số, rút gọn kết quả về phân số tối giản.",
  shortTag: "Cộng phân số",
  category: "fractions",
  gradeRange: [4, 7],
  icon: "PieChart",
  badgeColor: "amber",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Cùng mẫu số", description: "Cộng 2 phân số có cùng mẫu số", examples: "1/5 + 2/5 = 3/5" },
    { id: 2, name: "Mức 2: Khác mẫu số (mẫu nhỏ)", description: "Quy đồng mẫu số đơn giản (mẫu <= 12)", examples: "1/4 + 2/3 = 11/12" },
    { id: 3, name: "Mức 3: Mẫu lớn & Rút gọn", description: "Cộng và rút gọn phân số tối giản", examples: "3/8 + 5/12 = 19/24" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let n1 = 1, d1 = 2, n2 = 1, d2 = 2;

    if (diff === 1) {
      d1 = randomInt(3, 9);
      d2 = d1;
      n1 = randomInt(1, d1 - 2);
      n2 = randomInt(1, d1 - n1);
    } else if (diff === 2) {
      d1 = randomInt(2, 6);
      d2 = randomInt(3, 7);
      if (d1 === d2) d2 += 1;
      n1 = randomInt(1, d1 - 1);
      n2 = randomInt(1, d2 - 1);
    } else {
      d1 = randomInt(6, 15);
      d2 = randomInt(8, 18);
      if (d1 === d2) d2 += 2;
      n1 = randomInt(2, d1 - 1);
      n2 = randomInt(2, d2 - 1);
    }

    const commonDenom = lcm(d1, d2);
    const m1 = commonDenom / d1;
    const m2 = commonDenom / d2;
    const rawNum = n1 * m1 + n2 * m2;
    const simplified = simplifyFraction(rawNum, commonDenom);

    const prompt = `${n1}/${d1} + ${n2}/${d2} = ?`;
    const latex = `\\frac{${n1}}{${d1}} + \\frac{${n2}}{${d2}} = ?`;

    let explanation = "";
    if (d1 === d2) {
      explanation = `Vì cùng mẫu số nên ta cộng tử số và giữ nguyên mẫu số:\n$\\frac{${n1}}{${d1}} + \\frac{${n2}}{${d2}} = \\frac{${n1} + ${n2}}{${d1}} = \\frac{${rawNum}}{${commonDenom}}$`;
      if (simplified.num !== rawNum || simplified.den !== commonDenom) {
        explanation += ` $= \\frac{${simplified.num}}{${simplified.den}}$ (tối giản).`;
      } else {
        explanation += ` (tối giản).`;
      }
    } else {
      explanation = `Quy đồng mẫu số chung $BCNN(${d1}, ${d2}) = ${commonDenom}$:\n- $\\frac{${n1}}{${d1}} = \\frac{${n1 * m1}}{${commonDenom}}$\n- $\\frac{${n2}}{${d2}} = \\frac{${n2 * m2}}{${commonDenom}}$\n$\\implies \\frac{${n1}}{${d1}} + \\frac{${n2}}{${d2}} = \\frac{${n1 * m1} + ${n2 * m2}}{${commonDenom}} = \\frac{${rawNum}}{${commonDenom}}`;
      if (simplified.num !== rawNum || simplified.den !== commonDenom) {
        explanation += ` = \\frac{${simplified.num}}{${simplified.den}}$ (tối giản).`;
      } else {
        explanation += `$.`;
      }
    }

    // Generate distractor choices
    const dist1 = simplifyFraction(rawNum + 1, commonDenom);
    const dist2 = simplifyFraction(Math.max(1, rawNum - 1), commonDenom);
    const dist3 = simplifyFraction(n1 + n2, d1 + d2); // common mistake: adding denominators

    const allOptions = shuffle([
      { id: `${simplified.num}/${simplified.den}`, text: `${simplified.num}/${simplified.den}`, latex: `\\frac{${simplified.num}}{${simplified.den}}` },
      { id: `${dist1.num}/${dist1.den}`, text: `${dist1.num}/${dist1.den}`, latex: `\\frac{${dist1.num}}{${dist1.den}}` },
      { id: `${dist2.num}/${dist2.den}`, text: `${dist2.num}/${dist2.den}`, latex: `\\frac{${dist2.num}}{${dist2.den}}` },
      { id: `${dist3.num}/${dist3.den}`, text: `${dist3.num}/${dist3.den}`, latex: `\\frac{${dist3.num}}{${dist3.den}}` },
    ]);

    return {
      id: `fa_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "fraction",
      prompt,
      latex,
      subText: "Nhập tử số và mẫu số (hoặc chọn đáp án tối giản bên dưới)",
      correctAnswer: { numerator: simplified.num, denominator: simplified.den },
      options: allOptions,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
