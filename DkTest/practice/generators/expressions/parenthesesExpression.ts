import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, generateNumericDistractors, shuffle } from "../utils";

export const parenthesesExpressionMode: PracticeMode = {
  id: "parentheses-expression",
  title: "Biểu thức có ngoặc",
  description: "Luyện tính giá trị biểu thức chứa dấu ngoặc tròn ( ), ngoặc vuông [ ] theo đúng thứ tự ưu tiên.",
  shortTag: "Biểu thức có ngoặc",
  category: "expressions",
  gradeRange: [4, 7],
  icon: "Parentheses",
  badgeColor: "sky",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Ngoặc tròn đơn giản", description: "Biểu thức có một cặp ngoặc tròn ( )", examples: "(25 + 7) × 3, (80 - 35) : 5" },
    { id: 2, name: "Mức 2: Hai cặp ngoặc tròn", description: "Biểu thức kết hợp 2 cụm ngoặc", examples: "(15 + 25) × (30 - 24)" },
    { id: 3, name: "Mức 3: Ngoặc lồng nhau [ ( ) ]", description: "Ngoặc vuông kết hợp ngoặc tròn lồng nhau", examples: "120 - [40 - (15 + 5)] × 3" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let prompt = "";
    let latex = "";
    let correctAnswer = 0;
    let explanation = "";

    if (diff === 1) {
      const isMul = Math.random() > 0.5;
      if (isMul) {
        const a = randomInt(12, 35);
        const b = randomInt(5, 20);
        const c = randomInt(3, 8);
        const inner = a + b;
        correctAnswer = inner * c;
        prompt = `(${a} + ${b}) × ${c} = ?`;
        latex = `(${a} + ${b}) \\times ${c} = ?`;
        explanation = `Thứ tự thực hiện:\n- Tính trong ngoặc trước: $${a} + ${b} = ${inner}$\n- Nhân kết quả với $${c}$: $${inner} \\times ${c} = ${correctAnswer}$.`;
      } else {
        const c = randomInt(3, 9);
        const quot = randomInt(4, 15);
        const total = c * quot;
        const a = randomInt(total + 10, total + 50);
        const b = a - total;
        correctAnswer = quot;
        prompt = `(${a} - ${b}) : ${c} = ?`;
        latex = `(${a} - ${b}) : ${c} = ?`;
        explanation = `Thứ tự thực hiện:\n- Tính trong ngoặc: $${a} - ${b} = ${total}$\n- Chia kết quả: $${total} : ${c} = ${correctAnswer}$.`;
      }
    } else if (diff === 2) {
      const a = randomInt(10, 30);
      const b = randomInt(10, 30);
      const sum = a + b;
      const c = randomInt(15, 40);
      const d = randomInt(2, c - 2);
      const diffVal = c - d;
      correctAnswer = sum * diffVal;
      prompt = `(${a} + ${b}) × (${c} - ${d}) = ?`;
      latex = `(${a} + ${b}) \\times (${c} - ${d}) = ?`;
      explanation = `Tính trong 2 ngoặc trước:\n- Ngoặc 1: $${a} + ${b} = ${sum}$\n- Ngoặc 2: $${c} - ${d} = ${diffVal}$\n- Nhân hai kết quả: $${sum} \\times ${diffVal} = ${correctAnswer}$.`;
    } else {
      const x = randomInt(10, 25);
      const y = randomInt(5, 15);
      const innerSum = x + y;
      const outerBase = randomInt(innerSum + 10, innerSum + 30);
      const bracketResult = outerBase - innerSum;
      const mult = randomInt(2, 4);
      const leading = randomInt(bracketResult * mult + 20, bracketResult * mult + 80);
      correctAnswer = leading - bracketResult * mult;
      prompt = `${leading} - [${outerBase} - (${x} + ${y})] × ${mult} = ?`;
      latex = `${leading} - [${outerBase} - (${x} + ${y})] \\times ${mult} = ?`;
      explanation = `Thứ tự thực hiện ngoặc tròn $\\to$ ngoặc vuông $\\to$ nhân chia $\\to$ cộng trừ:\n- Bước 1 (ngoặc tròn): $${x} + ${y} = ${innerSum}$\n- Bước 2 (ngoặc vuông): $${outerBase} - ${innerSum} = ${bracketResult}$\n- Bước 3 (nhân): $${bracketResult} \\times ${mult} = ${bracketResult * mult}$\n- Bước 4: $${leading} - ${bracketResult * mult} = ${correctAnswer}$.`;
    }

    const dists = generateNumericDistractors(correctAnswer, 3, 15);
    const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `paren_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: "Thực hiện phép tính trong ngoặc trước",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
