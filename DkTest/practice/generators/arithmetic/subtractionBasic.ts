import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, generateNumericDistractors, shuffle } from "../utils";

export const subtractionBasicMode: PracticeMode = {
  id: "subtraction-basic",
  title: "Phép trừ cơ bản",
  description: "Luyện trừ các số tự nhiên với 8 cấp độ từ 1 chữ số đến số thập phân có mượn nhiều hàng.",
  shortTag: "Phép trừ",
  category: "arithmetic",
  gradeRange: [3, 5],
  icon: "Minus",
  badgeColor: "rose",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Trừ trong phạm vi 20", description: "Trừ 1-2 chữ số đơn giản", examples: "15 - 7, 18 - 9" },
    { id: 2, name: "Mức 2: 2 chữ số (Không mượn)", description: "Trừ số có 2 chữ số không mượn", examples: "48 - 23, 79 - 35" },
    { id: 3, name: "Mức 3: 2 chữ số (Có mượn)", description: "Trừ số có 2 chữ số có mượn", examples: "83 - 47, 62 - 38" },
    { id: 4, name: "Mức 4: 3 chữ số (Có mượn)", description: "Trừ số có 3 chữ số", examples: "524 - 186, 703 - 248" },
    { id: 5, name: "Mức 5: Số lớn & Nhiều bước", description: "Trừ 4 chữ số hoặc dãy phép trừ", examples: "4500 - 1876, 85 - 23 - 19" },
    { id: 6, name: "Mức 6: 5 chữ số", description: "Trừ các số cực lớn", examples: "75312 - 48975" },
    { id: 7, name: "Mức 7: Số thập phân (1 chữ số)", description: "Trừ số thập phân cơ bản", examples: "15.4 - 7.8" },
    { id: 8, name: "Mức 8: Số thập phân (2 chữ số)", description: "Trừ số thập phân phức tạp", examples: "34.12 - 18.57" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let a = 0;
    let b = 0;
    let explanation = "";
    let prompt = "";
    let latex = "";

    if (diff === 1) {
      a = randomInt(8, 20);
      b = randomInt(2, a - 1);
      prompt = `${a} - ${b} = ?`;
      latex = `${a} - ${b} = ?`;
      explanation = `Ta có: $${a} - ${b} = ${a - b}$.`;
    } else if (diff === 2) {
      const u1 = randomInt(4, 9);
      const u2 = randomInt(0, u1);
      const t1 = randomInt(3, 9);
      const t2 = randomInt(1, t1);
      a = t1 * 10 + u1;
      b = t2 * 10 + u2;
      prompt = `${a} - ${b} = ?`;
      latex = `${a} - ${b} = ?`;
      explanation = `Đặt tính rồi tính:\n- Hàng đơn vị: $${u1} - ${u2} = ${u1 - u2}$\n- Hàng chục: $${t1} - ${t2} = ${t1 - t2}$\nVậy $${a} - ${b} = ${a - b}$.`;
    } else if (diff === 3) {
      const u1 = randomInt(0, 5);
      const u2 = randomInt(u1 + 2, 9); // force borrow
      const t1 = randomInt(3, 9);
      const t2 = randomInt(1, t1 - 1);
      a = t1 * 10 + u1;
      b = t2 * 10 + u2;
      prompt = `${a} - ${b} = ?`;
      latex = `${a} - ${b} = ?`;
      explanation = `Đặt tính trừ có mượn:\n- Hàng đơn vị: $${u1}$ không trừ được $${u2}$, mượn 1 chục thành $${u1 + 10} - ${u2} = ${u1 + 10 - u2}$, nhớ 1 sang hàng chục.\n- Hàng chục: $${t1} - (${t2} + 1) = ${t1 - (t2 + 1)}$.\nVậy $${a} - ${b} = ${a - b}$.`;
    } else if (diff === 4) {
      a = randomInt(350, 950);
      b = randomInt(120, a - 50);
      prompt = `${a} - ${b} = ?`;
      latex = `${a} - ${b} = ?`;
      explanation = `Thực hiện phép trừ:\n$\\begin{array}{r@{\\quad}l}\n& ${a} \\\\\n- & ${b} \\\\\n\\hline\n& ${a - b}\n\\end{array}$\nVậy $${a} - ${b} = ${a - b}$.`;
    } else if (diff === 5) {
      const isMulti = Math.random() > 0.5;
      if (isMulti) {
        a = randomInt(70, 100);
        b = randomInt(15, 30);
        const c = randomInt(10, a - b - 5);
        prompt = `${a} - ${b} - ${c} = ?`;
        latex = `${a} - ${b} - ${c} = ?`;
        explanation = `Thực hiện từ trái sang phải:\n- $${a} - ${b} = ${a - b}$\n- $${a - b} - ${c} = ${a - b - c}$\nVậy $${a} - ${b} - ${c} = ${a - b - c}$.`;
        const diffAns = a - b - c;
        const dists = generateNumericDistractors(diffAns, 3, 10);
        const options = shuffle([diffAns, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));
        return {
          id: `sub_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: "numeric",
          prompt,
          latex,
          subText: "Nhập kết quả phép trừ",
          correctAnswer: diffAns,
          options,
          explanation,
          difficulty: diff,
        };
      } else {
        a = randomInt(2000, 8500);
        b = randomInt(1000, a - 500);
        prompt = `${a} - ${b} = ?`;
        latex = `${a} - ${b} = ?`;
        explanation = `Thực hiện phép trừ:\n$${a} - ${b} = ${a - b}$.`;
      }
    } else if (diff === 6) {
      a = randomInt(20000, 85000);
      b = randomInt(10000, a - 5000);
      prompt = `${a} - ${b} = ?`;
      latex = `${a} - ${b} = ?`;
      explanation = `Thực hiện phép trừ số lớn:\n$${a} - ${b} = ${a - b}$.`;
    } else if (diff === 7) {
      a = randomInt(20, 99) / 10;
      b = randomInt(10, Math.floor(a * 10) - 5) / 10;
      prompt = `${a} - ${b} = ?`;
      latex = `${a} - ${b} = ?`;
      explanation = `Thực hiện phép trừ số thập phân:\n$${a} - ${b} = ${Number((a - b).toFixed(1))}$.`;
    } else {
      a = randomInt(100, 999) / 100;
      b = randomInt(10, Math.floor(a * 100) - 10) / 100;
      prompt = `${a} - ${b} = ?`;
      latex = `${a} - ${b} = ?`;
      explanation = `Thực hiện phép trừ số thập phân:\n$${a} - ${b} = ${Number((a - b).toFixed(2))}$.`;
    }

    let correctAnswer = a - b;
    if (diff === 7) correctAnswer = Number(correctAnswer.toFixed(1));
    if (diff === 8) correctAnswer = Number(correctAnswer.toFixed(2));
    const dists = generateNumericDistractors(correctAnswer, 3, diff <= 2 ? 3 : 15);
    const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `sub_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: "Nhập kết quả phép trừ hoặc chọn đáp án bên dưới",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
