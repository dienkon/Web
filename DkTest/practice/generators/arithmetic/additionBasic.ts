import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, randomChoice, generateNumericDistractors, shuffle } from "../utils";

export const additionBasicMode: PracticeMode = {
  id: "addition-basic",
  title: "Phép cộng cơ bản",
  description: "Luyện cộng các số tự nhiên với 8 cấp độ từ 1 chữ số đến số thập phân.",
  shortTag: "Phép cộng",
  category: "arithmetic",
  gradeRange: [3, 5],
  icon: "Plus",
  badgeColor: "blue",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Cộng 1 chữ số", description: "Cộng các số trong phạm vi 10 và 20", examples: "3 + 5, 7 + 6" },
    { id: 2, name: "Mức 2: 2 chữ số (Không nhớ)", description: "Cộng số có 2 chữ số không có nhớ", examples: "23 + 15, 34 + 42" },
    { id: 3, name: "Mức 3: 2 chữ số (Có nhớ)", description: "Cộng số có 2 chữ số có nhớ", examples: "27 + 38, 59 + 26" },
    { id: 4, name: "Mức 4: 3 chữ số (Có nhớ)", description: "Cộng số có 3 chữ số", examples: "125 + 238, 458 + 276" },
    { id: 5, name: "Mức 5: Số lớn & 3 số hạng", description: "Cộng 4 chữ số hoặc cộng 3 số hạng", examples: "1234 + 5678, 25 + 13 + 42" },
    { id: 6, name: "Mức 6: 5 chữ số", description: "Cộng các số hạng cực lớn (5 chữ số)", examples: "12567 + 45829" },
    { id: 7, name: "Mức 7: Số thập phân (1 chữ số)", description: "Cộng số thập phân cơ bản", examples: "12.5 + 4.8" },
    { id: 8, name: "Mức 8: Số thập phân (2 chữ số)", description: "Cộng số thập phân phức tạp", examples: "3.45 + 7.89" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let terms: number[] = [];
    let prompt = "";
    let latex = "";
    let explanation = "";

    if (diff === 1) {
      // 1-digit addition
      const a = randomInt(1, 9);
      const b = randomInt(1, 9);
      terms = [a, b];
      const sum = a + b;
      prompt = `${a} + ${b} = ?`;
      latex = `${a} + ${b} = ?`;
      explanation = `Ta có: $${a} + ${b} = ${sum}$.`;
    } else if (diff === 2) {
      // 2-digit no carry
      const u1 = randomInt(1, 4);
      const u2 = randomInt(1, 5);
      const t1 = randomInt(1, 5);
      const t2 = randomInt(1, 4);
      const a = t1 * 10 + u1;
      const b = t2 * 10 + u2;
      terms = [a, b];
      const sum = a + b;
      prompt = `${a} + ${b} = ?`;
      latex = `${a} + ${b} = ?`;
      explanation = `Đặt tính rồi tính:\n- Cộng hàng đơn vị: $${u1} + ${u2} = ${u1 + u2}$\n- Cộng hàng chục: $${t1} + ${t2} = ${t1 + t2}$\nVậy $${a} + ${b} = ${sum}$.`;
    } else if (diff === 3) {
      // 2-digit with carry
      const u1 = randomInt(4, 9);
      const u2 = randomInt(10 - u1, 9); // force carry >= 10
      const t1 = randomInt(1, 7);
      const t2 = randomInt(1, 8 - t1);
      const a = t1 * 10 + u1;
      const b = t2 * 10 + u2;
      terms = [a, b];
      const sum = a + b;
      prompt = `${a} + ${b} = ?`;
      latex = `${a} + ${b} = ?`;
      const unitSum = u1 + u2;
      explanation = `Đặt tính cộng có nhớ:\n- Hàng đơn vị: $${u1} + ${u2} = ${unitSum}$, viết ${unitSum % 10} nhớ 1.\n- Hàng chục: $${t1} + ${t2} + 1\\text{ (nhớ)} = ${t1 + t2 + 1}$.\nVậy $${a} + ${b} = ${sum}$.`;
    } else if (diff === 4) {
      // 3-digit with carry
      const a = randomInt(120, 580);
      const b = randomInt(130, 410);
      terms = [a, b];
      const sum = a + b;
      prompt = `${a} + ${b} = ?`;
      latex = `${a} + ${b} = ?`;
      explanation = `Đặt tính cộng:\n$\\begin{array}{r@{\\quad}l}\n& ${a} \\\\\n+ & ${b} \\\\\n\\hline\n& ${sum}\n\\end{array}$\nVậy $${a} + ${b} = ${sum}$.`;
    } else if (diff === 5) {
      // Diff 5: either 4-digit or 3 terms
      const isThreeTerms = Math.random() > 0.4;
      if (isThreeTerms) {
        const a = randomInt(15, 65);
        const b = randomInt(12, 45);
        const c = randomInt(10, 55);
        terms = [a, b, c];
        const sum = a + b + c;
        prompt = `${a} + ${b} + ${c} = ?`;
        latex = `${a} + ${b} + ${c} = ?`;
        explanation = `Tính từ trái sang phải:\n- $${a} + ${b} = ${a + b}$\n- $${a + b} + ${c} = ${sum}$\nVậy $${a} + ${b} + ${c} = ${sum}$.`;
      } else {
        const a = randomInt(1200, 5800);
        const b = randomInt(1100, 3900);
        terms = [a, b];
        const sum = a + b;
        prompt = `${a} + ${b} = ?`;
        latex = `${a} + ${b} = ?`;
        explanation = `Thực hiện phép cộng:\n$${a} + ${b} = ${sum}$.`;
      }
    } else if (diff === 6) {
      // 5-digit
      const a = randomInt(12000, 58000);
      const b = randomInt(11000, 39000);
      terms = [a, b];
      const sum = a + b;
      prompt = `${a} + ${b} = ?`;
      latex = `${a} + ${b} = ?`;
      explanation = `Thực hiện phép cộng các số lớn:\n$${a} + ${b} = ${sum}$.`;
    } else if (diff === 7) {
      // Decimal 1 place
      const a = randomInt(10, 99) / 10;
      const b = randomInt(10, 99) / 10;
      terms = [a, b];
      const sum = Number((a + b).toFixed(1));
      prompt = `${a} + ${b} = ?`;
      latex = `${a} + ${b} = ?`;
      explanation = `Đặt tính thẳng hàng dấu phẩy và cộng:\n$${a} + ${b} = ${sum}$.`;
    } else {
      // Decimal 2 places
      const a = randomInt(100, 999) / 100;
      const b = randomInt(100, 999) / 100;
      terms = [a, b];
      const sum = Number((a + b).toFixed(2));
      prompt = `${a} + ${b} = ?`;
      latex = `${a} + ${b} = ?`;
      explanation = `Đặt tính thẳng hàng dấu phẩy và cộng:\n$${a} + ${b} = ${sum}$.`;
    }

    let correctAnswer = terms.reduce((acc, v) => acc + v, 0);
    if (diff === 7) correctAnswer = Number(correctAnswer.toFixed(1));
    if (diff === 8) correctAnswer = Number(correctAnswer.toFixed(2));

    // Provide options for choice mode if preferred, or allow direct numeric input
    const dists = generateNumericDistractors(correctAnswer, 3, diff <= 2 ? 3 : 15);
    const optionValues = shuffle([correctAnswer, ...dists]);
    const options = optionValues.map((val, idx) => ({
      id: String(val),
      text: String(val),
      latex: String(val),
    }));

    return {
      id: `add_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: "Nhập kết quả phép tính hoặc chọn đáp án đúng bên dưới",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
      metadata: {
        operation: "addition",
      },
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
