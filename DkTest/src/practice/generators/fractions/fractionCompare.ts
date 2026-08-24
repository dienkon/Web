import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, randomChoice, simplifyFraction } from "../utils";

export const fractionCompareMode: PracticeMode = {
  id: "fraction-compare",
  title: "So sánh phân số",
  description: "So sánh hai phân số bằng cách so sánh cùng mẫu, cùng tử, so sánh với 1 hoặc quy đồng.",
  shortTag: "So sánh phân số",
  category: "fractions",
  gradeRange: [4, 7],
  icon: "ArrowLeftRight",
  badgeColor: "purple",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Cùng mẫu hoặc cùng tử", description: "So sánh phân số có cùng tử số hoặc mẫu số", examples: "3/7 và 5/7, 4/5 và 4/9" },
    { id: 2, name: "Mức 2: Khác mẫu số", description: "Quy đồng mẫu số để so sánh", examples: "3/5 và 4/7" },
    { id: 3, name: "Mức 3: So sánh với 1", description: "Phân số bé hơn 1 và lớn hơn 1", examples: "7/8 và 9/8" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let n1 = 1, d1 = 2, n2 = 1, d2 = 2;

    const isEqual = Math.random() < 0.2;

    if (isEqual) {
      const baseN = randomInt(1, 4);
      const baseD = randomInt(baseN + 1, 6);
      const mult = randomInt(2, 3);
      n1 = baseN;
      d1 = baseD;
      n2 = baseN * mult;
      d2 = baseD * mult;
    } else if (diff === 1) {
      const sameDenom = Math.random() > 0.5;
      if (sameDenom) {
        d1 = randomInt(4, 9);
        d2 = d1;
        n1 = randomInt(1, d1 - 1);
        n2 = randomInt(1, d1 - 1);
        if (n1 === n2) n2 = (n1 % (d1 - 1)) + 1;
      } else {
        n1 = randomInt(2, 5);
        n2 = n1;
        d1 = randomInt(3, 8);
        d2 = randomInt(3, 8);
        if (d1 === d2) d2 += 1;
      }
    } else {
      d1 = randomInt(3, 9);
      d2 = randomInt(3, 9);
      if (d1 === d2) d2 += 1;
      n1 = randomInt(1, d1 + 1);
      n2 = randomInt(1, d2 + 1);
    }

    const val1 = n1 * d2;
    const val2 = n2 * d1;
    const correctSymbol = val1 > val2 ? ">" : val1 < val2 ? "<" : "=";

    const prompt = `So sánh: ${n1}/${d1} ? ${n2}/${d2}`;
    const latex = `\\frac{${n1}}{${d1}} \\quad \\mathbf{?} \\quad \\frac{${n2}}{${d2}}`;

    const explanation = `Quy đồng mẫu số:\n- $\\frac{${n1}}{${d1}} = \\frac{${n1} \\times ${d2}}{${d1} \\times ${d2}} = \\frac{${val1}}{${d1 * d2}}$\n- $\\frac{${n2}}{${d2}} = \\frac{${n2} \\times ${d1}}{${d1} \\times ${d2}} = \\frac{${val2}}{${d1 * d2}}$\nVì $${val1} ${correctSymbol} ${val2}$ nên $\\frac{${n1}}{${d1}} ${correctSymbol} \\frac{${n2}}{${d2}}$.`;

    const options = [
      { id: ">", text: "> (Lớn hơn)", latex: ">" },
      { id: "<", text: "< (Bé hơn)", latex: "<" },
      { id: "=", text: "= (Bằng nhau)", latex: "=" },
    ];

    return {
      id: `fc_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "comparison",
      prompt,
      latex,
      subText: "Chọn dấu thích hợp điền vào ô trống",
      correctAnswer: correctSymbol,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
