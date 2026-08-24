import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, simplifyFraction, shuffle } from "../utils";

export const fractionDivMode: PracticeMode = {
  id: "fraction-div",
  title: "Chia phân số",
  description: "Luyện chia phân số bằng cách nhân phân số thứ nhất với phân số thứ hai đảo ngược.",
  shortTag: "Chia phân số",
  category: "fractions",
  gradeRange: [4, 7],
  icon: "PieChart",
  badgeColor: "indigo",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Chia 2 phân số", description: "Nhân đảo ngược cơ bản", examples: "2/3 : 4/5 = 2/3 × 5/4 = 5/6" },
    { id: 2, name: "Mức 2: Phân số chia số tự nhiên", description: "a/b : c = a/(b × c)", examples: "3/4 : 6 = 1/8" },
    { id: 3, name: "Mức 3: Số tự nhiên chia phân số", description: "c : a/b = c × b/a", examples: "4 : 2/3 = 6" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let prompt = "";
    let latex = "";
    let explanation = "";
    let simplified = { num: 1, den: 2 };

    if (diff === 1) {
      const n1 = randomInt(1, 4);
      const d1 = randomInt(n1 + 1, 6);
      const n2 = randomInt(1, 4);
      const d2 = randomInt(n2 + 1, 6);
      const rawNum = n1 * d2;
      const rawDen = d1 * n2;
      simplified = simplifyFraction(rawNum, rawDen);
      prompt = `${n1}/${d1} : ${n2}/${d2} = ?`;
      latex = `\\frac{${n1}}{${d1}} : \\frac{${n2}}{${d2}} = ?`;
      explanation = `Muốn chia hai phân số, ta lấy phân số thứ nhất nhân với phân số thứ hai đảo ngược:\n$\\frac{${n1}}{${d1}} : \\frac{${n2}}{${d2}} = \\frac{${n1}}{${d1}} \\times \\frac{${d2}}{${n2}} = \\frac{${rawNum}}{${rawDen}} = \\frac{${simplified.num}}{${simplified.den}}$`;
    } else if (diff === 2) {
      const n1 = randomInt(2, 6);
      const d1 = randomInt(3, 8);
      const whole = randomInt(2, 6);
      const rawNum = n1;
      const rawDen = d1 * whole;
      simplified = simplifyFraction(rawNum, rawDen);
      prompt = `${n1}/${d1} : ${whole} = ?`;
      latex = `\\frac{${n1}}{${d1}} : ${whole} = ?`;
      explanation = `Ta giữ nguyên tử số và nhân mẫu số với số tự nhiên:\n$\\frac{${n1}}{${d1}} : ${whole} = \\frac{${n1}}{${d1} \\times ${whole}} = \\frac{${rawNum}}{${rawDen}} = \\frac{${simplified.num}}{${simplified.den}}$`;
    } else {
      const whole = randomInt(2, 6);
      const n2 = randomInt(1, 3);
      const d2 = randomInt(n2 + 1, 5);
      const rawNum = whole * d2;
      const rawDen = n2;
      simplified = simplifyFraction(rawNum, rawDen);
      prompt = `${whole} : ${n2}/${d2} = ?`;
      latex = `${whole} : \\frac{${n2}}{${d2}} = ?`;
      explanation = `Ta lấy số tự nhiên nhân với phân số đảo ngược:\n$${whole} : \\frac{${n2}}{${d2}} = ${whole} \\times \\frac{${d2}}{${n2}} = \\frac{${rawNum}}{${rawDen}} = \\frac{${simplified.num}}{${simplified.den}}$`;
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
      id: `fd_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
