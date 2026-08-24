import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, generateNumericDistractors, shuffle } from "../utils";

export const evaluateExpressionMode: PracticeMode = {
  id: "evaluate-expression",
  title: "Tính giá trị biểu thức",
  description: "Luyện thứ tự thực hiện phép tính: Trong ngoặc trước, nhân chia trước, cộng trừ sau.",
  shortTag: "Giá trị biểu thức",
  category: "expressions",
  gradeRange: [4, 7],
  icon: "Calculator",
  badgeColor: "cyan",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Nhân chia kết hợp cộng trừ", description: "Biểu thức 2 phép tính", examples: "25 + 7 × 3, 50 - 36 : 4" },
    { id: 2, name: "Mức 2: 3 phép tính", description: "Biểu thức gồm cả nhân chia và cộng trừ", examples: "12 × 4 - 35 : 5 + 18" },
    { id: 3, name: "Mức 3: Lũy thừa và phép tính", description: "Biểu thức có lũy thừa", examples: "2^3 × 5 - 18 : 3^2" },
    { id: 4, name: "Mức 4: Dấu ngoặc ()", description: "Tính trong ngoặc trước", examples: "45 - (15 + 8) × 2" },
    { id: 5, name: "Mức 5: Dấu ngoặc phức tạp & Số thập phân", description: "Nhiều ngoặc và tính toán số thập phân", examples: "2.5 × (4.2 - 1.2) + 3" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let prompt = "";
    let latex = "";
    let correctAnswer = 0;
    let explanation = "";

    if (diff === 1) {
      const isAdd = Math.random() > 0.5;
      if (isAdd) {
        const a = randomInt(15, 60);
        const b = randomInt(3, 9);
        const c = randomInt(4, 8);
        correctAnswer = a + b * c;
        prompt = `${a} + ${b} × ${c} = ?`;
        latex = `${a} + ${b} \\times ${c} = ?`;
        explanation = `Thứ tự thực hiện: Nhân trước, cộng sau:\n- Bước 1: $${b} \\times ${c} = ${b * c}$\n- Bước 2: $${a} + ${b * c} = ${correctAnswer}$.`;
      } else {
        const a = randomInt(40, 90);
        const divisor = randomInt(2, 8);
        const quotient = randomInt(3, 9);
        const dividend = divisor * quotient;
        correctAnswer = a - quotient;
        prompt = `${a} - ${dividend} : ${divisor} = ?`;
        latex = `${a} - ${dividend} : ${divisor} = ?`;
        explanation = `Thứ tự thực hiện: Chia trước, trừ sau:\n- Bước 1: $${dividend} : ${divisor} = ${quotient}$\n- Bước 2: $${a} - ${quotient} = ${correctAnswer}$.`;
      }
    } else if (diff === 2) {
      const a = randomInt(4, 12);
      const b = randomInt(3, 8);
      const divisor = randomInt(2, 6);
      const quotient = randomInt(3, 8);
      const dividend = divisor * quotient;
      const c = randomInt(5, 25);
      correctAnswer = a * b - quotient + c;
      prompt = `${a} × ${b} - ${dividend} : ${divisor} + ${c} = ?`;
      latex = `${a} \\times ${b} - ${dividend} : ${divisor} + ${c} = ?`;
      explanation = `Thực hiện theo thứ tự:\n- Bước 1 (Nhân, chia): $${a} \\times ${b} = ${a * b}$ và $${dividend} : ${divisor} = ${quotient}$\n- Bước 2 (Từ trái sang phải): $${a * b} - ${quotient} + ${c} = ${a * b - quotient} + ${c} = ${correctAnswer}$.`;
    } else if (diff === 3) {
      const base1 = randomInt(2, 4);
      const exp1 = randomInt(2, 3);
      const p1 = Math.pow(base1, exp1);
      const b = randomInt(3, 6);
      const c = randomInt(10, 30);
      correctAnswer = p1 * b - c;
      prompt = `${base1}^${exp1} × ${b} - ${c} = ?`;
      latex = `${base1}^{${exp1}} \\times ${b} - ${c} = ?`;
      explanation = `Thực hiện thứ tự ưu tiên:\n- Bước 1 (Lũy thừa): $${base1}^{${exp1}} = ${p1}$\n- Bước 2 (Nhân): $${p1} \\times ${b} = ${p1 * b}$\n- Bước 3 (Trừ): $${p1 * b} - ${c} = ${correctAnswer}$.`;
    } else if (diff === 4) {
      const a = randomInt(30, 80);
      const b1 = randomInt(10, 25);
      const b2 = randomInt(5, 15);
      const c = randomInt(2, 5);
      correctAnswer = a - (b1 + b2) * c;
      prompt = `${a} - (${b1} + ${b2}) × ${c} = ?`;
      latex = `${a} - (${b1} + ${b2}) \\times ${c} = ?`;
      explanation = `Thực hiện trong ngoặc trước, ngoài ngoặc sau, nhân chia trước cộng trừ sau:\n- Bước 1: $${b1} + ${b2} = ${b1 + b2}$\n- Bước 2: $${b1 + b2} \\times ${c} = ${(b1 + b2) * c}$\n- Bước 3: $${a} - ${(b1 + b2) * c} = ${correctAnswer}$.`;
    } else {
      const a = randomInt(15, 45) / 10;
      const b1 = randomInt(35, 75) / 10;
      const b2 = randomInt(12, 25) / 10;
      const c = randomInt(2, 8);
      const inBrackets = Number((b1 - b2).toFixed(1));
      correctAnswer = Number((a * inBrackets + c).toFixed(2));
      prompt = `${a} × (${b1} - ${b2}) + ${c} = ?`;
      latex = `${a} \\times (${b1} - ${b2}) + ${c} = ?`;
      explanation = `Thực hiện trong ngoặc trước, nhân trước, cộng sau:\n- Bước 1: $${b1} - ${b2} = ${inBrackets}$\n- Bước 2: $${a} \\times ${inBrackets} = ${Number((a * inBrackets).toFixed(2))}$\n- Bước 3: $${Number((a * inBrackets).toFixed(2))} + ${c} = ${correctAnswer}$.`;
    }

    const dists = generateNumericDistractors(correctAnswer, 3, 10);
    const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `eval_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: "Thực hiện phép tính đúng theo thứ tự ưu tiên",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
