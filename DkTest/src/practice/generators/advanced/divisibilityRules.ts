import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, randomChoice, shuffle } from "../utils";

export const divisibilityRulesMode: PracticeMode = {
  id: "divisibility-rules",
  title: "Dấu hiệu chia hết",
  description: "Luyện nhận biết và tìm chữ số thích hợp để số chia hết cho 2, 3, 5, 9.",
  shortTag: "Dấu hiệu chia hết",
  category: "advanced",
  gradeRange: [4, 6],
  icon: "CheckCircle2",
  badgeColor: "emerald",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Chia hết cho 2 và 5", description: "Dấu hiệu tận cùng 0, 2, 4, 6, 8 và 0, 5", examples: "Số nào chia hết cho 5: 125, 342, 678" },
    { id: 2, name: "Mức 2: Chia hết cho 3 và 9", description: "Dấu hiệu tổng các chữ số", examples: "Tìm * để 2*5 chia hết cho 9" },
    { id: 3, name: "Mức 3: Kết hợp chia hết", description: "Chia hết cho cả 2 và 3, hoặc 2, 5 và 9", examples: "Tìm * để 4*0 chia hết cho cả 3 và 5" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const kind = diff === 1 ? randomChoice(["2", "5"]) : diff === 2 ? randomChoice(["3", "9"]) : "both";

    let prompt = "";
    let latex = "";
    let explanation = "";
    let correctAnswer = "";
    let options: Array<{ id: string; text: string; latex?: string }> = [];

    if (diff === 1) {
      if (kind === "2") {
        const correctNum = randomInt(10, 80) * 2;
        const dists = [randomInt(10, 80) * 2 + 1, randomInt(10, 80) * 2 + 1, randomInt(10, 80) * 2 + 1];
        correctAnswer = String(correctNum);
        prompt = `Số nào dưới đây chia hết cho 2?`;
        latex = `\\text{Số nào dưới đây chia hết cho 2?}`;
        explanation = `Các số có chữ số tận cùng là 0, 2, 4, 6, 8 thì chia hết cho 2. Trong các số trên, chỉ có $${correctNum}$ có chữ số tận cùng là số chẵn.`;
        options = shuffle([correctNum, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));
      } else {
        const correctNum = randomInt(10, 80) * 5;
        const dists = [randomInt(10, 80) * 5 + randomChoice([1, 2, 3, 4]), randomInt(10, 80) * 5 + randomChoice([1, 2, 3, 4]), randomInt(10, 80) * 5 + randomChoice([1, 2, 3, 4])];
        correctAnswer = String(correctNum);
        prompt = `Số nào dưới đây chia hết cho 5?`;
        latex = `\\text{Số nào dưới đây chia hết cho 5?}`;
        explanation = `Các số có chữ số tận cùng là 0 hoặc 5 thì chia hết cho 5. Trong đó chỉ có $${correctNum}$ thỏa mãn.`;
        options = shuffle([correctNum, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));
      }
    } else if (diff === 2) {
      // Find * to make number divisible by 3 or 9
      const divisor = kind === "3" ? 3 : 9;
      const d1 = randomInt(1, 9);
      const d3 = randomInt(1, 9);
      const sumKnown = d1 + d3;
      // find digit d2 in 0..9 such that (sumKnown + d2) % divisor === 0
      const validDigits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => (sumKnown + d) % divisor === 0);
      const correctDigit = randomChoice(validDigits);
      correctAnswer = String(correctDigit);

      prompt = `Thay chữ số * thích hợp để số ${d1}*${d3} chia hết cho ${divisor}`;
      latex = `\\text{Tìm chữ số } * \\text{ để } \\overline{${d1}*${d3}} \\text{ chia hết cho } ${divisor}`;
      explanation = `Một số chia hết cho ${divisor} khi tổng các chữ số của nó chia hết cho ${divisor}.\nTổng các chữ số: $${d1} + * + ${d3} = ${sumKnown} + *$.\nĐể $${sumKnown} + *$ chia hết cho $${divisor}$ thì $* = ${correctDigit}$ (vì $${sumKnown} + ${correctDigit} = ${sumKnown + correctDigit} \\,\\vdots\\, ${divisor}$).`;

      const dists = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => d !== correctDigit).slice(0, 3);
      options = shuffle([correctDigit, ...dists]).map((v) => ({ id: String(v), text: `* = ${v}`, latex: `* = ${v}` }));
    } else {
      // Divisible by both 2, 5 and 9
      // Last digit must be 0
      const d1 = randomInt(1, 8);
      // to divide by 9: (d1 + d2 + 0) % 9 === 0
      const d2 = (9 - (d1 % 9)) % 9;
      const num = d1 * 100 + d2 * 10;
      correctAnswer = String(num);

      const dist1 = num + 5;
      const dist2 = num + 3;
      const dist3 = num + 2;

      prompt = `Số nào dưới đây chia hết cho cả 2, 5 và 9?`;
      latex = `\\text{Số nào chia hết cho cả 2, 5 và 9?}`;
      explanation = `- Chia hết cho cả 2 và 5 thì chữ số tận cùng phải là 0.\n- Chia hết cho 9 thì tổng các chữ số phải chia hết cho 9 ($${d1} + ${d2} + 0 = ${d1 + d2} \\,\\vdots\\, 9$).\nVậy số đó là $${num}$.`;
      options = shuffle([num, dist1, dist2, dist3]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));
    }

    return {
      id: `divrule_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "choice",
      prompt,
      latex,
      subText: "Chọn đáp án chính xác",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
