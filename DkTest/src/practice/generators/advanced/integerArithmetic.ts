import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, randomChoice, generateNumericDistractors, shuffle } from "../utils";

export const integerArithmeticMode: PracticeMode = {
  id: "integer-arithmetic",
  title: "Số nguyên âm & Phép tính số nguyên",
  description: "Luyện cộng, trừ, nhân, chia số nguyên cùng dấu và khác dấu (Tập hợp Z).",
  shortTag: "Số nguyên Z",
  category: "advanced",
  gradeRange: [6, 8],
  icon: "PlusMinus",
  badgeColor: "rose",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Cộng trừ số nguyên", description: "Cộng trừ số âm và dương", examples: "(-5) + 8, (-12) + (-8), 7 - (-9)" },
    { id: 2, name: "Mức 2: Nhân chia số nguyên", description: "Quy tắc dấu: cùng dấu dương, khác dấu âm", examples: "(-4) × (-6), 45 : (-9)" },
    { id: 3, name: "Mức 3: Biểu thức số nguyên", description: "Biểu thức kết hợp nhiều phép tính số nguyên", examples: "(-3) × 4 - (-15) : 3" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let prompt = "";
    let latex = "";
    let correctAnswer = 0;
    let explanation = "";

    if (diff === 1) {
      const type = randomInt(1, 4);
      if (type === 1) {
        // (-a) + b
        const a = randomInt(5, 25);
        const b = randomInt(5, 25);
        correctAnswer = -a + b;
        prompt = `(-${a}) + ${b} = ?`;
        latex = `(-${a}) + ${b} = ?`;
        explanation = `Cộng hai số nguyên khác dấu: lấy số có giá trị tuyệt đối lớn hơn trừ số bé hơn rồi đặt dấu của số lớn hơn trước kết quả: $(-${a}) + ${b} = ${correctAnswer}$.`;
      } else if (type === 2) {
        // (-a) + (-b)
        const a = randomInt(5, 20);
        const b = randomInt(5, 20);
        correctAnswer = -a - b;
        prompt = `(-${a}) + (-${b}) = ?`;
        latex = `(-${a}) + (-${b}) = ?`;
        explanation = `Cộng hai số nguyên cùng dấu âm: cộng phần tự nhiên và đặt dấu âm trước kết quả: $(-${a}) + (-${b}) = -(${a} + ${b}) = ${correctAnswer}$.`;
      } else {
        // a - (-b) = a + b
        const a = randomInt(5, 20);
        const b = randomInt(5, 20);
        correctAnswer = a + b;
        prompt = `${a} - (-${b}) = ?`;
        latex = `${a} - (-${b}) = ?`;
        explanation = `Trừ một số âm là cộng với số đối của nó: $${a} - (-${b}) = ${a} + ${b} = ${correctAnswer}$.`;
      }
    } else if (diff === 2) {
      const isMul = Math.random() > 0.5;
      if (isMul) {
        const a = randomInt(3, 9);
        const b = randomInt(3, 9);
        const bothNeg = Math.random() > 0.5;
        if (bothNeg) {
          correctAnswer = a * b;
          prompt = `(-${a}) × (-${b}) = ?`;
          latex = `(-${a}) \\times (-${b}) = ?`;
          explanation = `Nhân hai số nguyên cùng dấu âm cho kết quả là một số DƯƠNG: $(-${a}) \\times (-${b}) = +(${a} \\times ${b}) = ${correctAnswer}$.`;
        } else {
          correctAnswer = -a * b;
          prompt = `(-${a}) × ${b} = ?`;
          latex = `(-${a}) \\times ${b} = ?`;
          explanation = `Nhân hai số nguyên khác dấu cho kết quả là một số ÂM: $(-${a}) \\times ${b} = -(${a} \\times ${b}) = ${correctAnswer}$.`;
        }
      } else {
        const a = randomInt(3, 9);
        const quot = randomInt(3, 9);
        const dividend = a * quot;
        correctAnswer = -quot;
        prompt = `${dividend} : (-${a}) = ?`;
        latex = `${dividend} : (-${a}) = ?`;
        explanation = `Chia hai số nguyên khác dấu cho kết quả ÂM: $${dividend} : (-${a}) = -(${dividend} : ${a}) = ${correctAnswer}$.`;
      }
    } else {
      const a = randomInt(2, 6);
      const b = randomInt(2, 6);
      const c = randomInt(2, 5);
      const d = randomInt(2, 5);
      correctAnswer = -a * b - (-c * d);
      prompt = `(-${a}) × ${b} - (-${c * d}) : ${d} = ?`;
      latex = `(-${a}) \\times ${b} - (-${c * d}) : ${d} = ?`;
      explanation = `Thứ tự thực hiện:\n- $(-${a}) \\times ${b} = -${a * b}$\n- $(-${c * d}) : ${d} = -${c}$\n- $(-${a * b}) - (-${c}) = -${a * b} + ${c} = ${correctAnswer}$.`;
    }

    const dists = [correctAnswer + 2, -correctAnswer, correctAnswer - 2].filter((v) => v !== correctAnswer);
    const options = shuffle([correctAnswer, ...dists.slice(0, 3)]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `int_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: "Chú ý quy tắc dấu của số nguyên",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
