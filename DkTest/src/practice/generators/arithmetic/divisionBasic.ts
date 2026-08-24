import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, generateNumericDistractors, shuffle } from "../utils";

export const divisionBasicMode: PracticeMode = {
  id: "division-basic",
  title: "Phép chia nhanh",
  description: "Luyện chia hết trong bảng cửu chương, chia nhẩm với số tròn chục, chia số lớn và số thập phân.",
  shortTag: "Phép chia",
  category: "arithmetic",
  gradeRange: [3, 5],
  icon: "Divide",
  badgeColor: "emerald",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Bảng chia 2-5", description: "Chia hết trong bảng 2 đến bảng 5", examples: "18 : 3, 25 : 5" },
    { id: 2, name: "Mức 2: Bảng chia 6-9", description: "Bảng chia nâng cao từ 6 đến 9", examples: "72 : 8, 54 : 9" },
    { id: 3, name: "Mức 3: Chia số tròn chục & 100", description: "Chia nhẩm số tròn chục", examples: "240 : 6, 360 : 40" },
    { id: 4, name: "Mức 4: Chia 2-3 chữ số cho 1 chữ số", description: "Chia số có 2-3 chữ số", examples: "84 : 4, 156 : 6" },
    { id: 5, name: "Mức 5: Chia cho số có 2 chữ số", description: "Chia 3-4 chữ số cho số có 2 chữ số", examples: "345 : 15, 672 : 24" },
    { id: 6, name: "Mức 6: Chia cho số có 2-3 chữ số", description: "Chia số lớn 4-5 chữ số", examples: "4536 : 42" },
    { id: 7, name: "Mức 7: Số thập phân chia số tự nhiên", description: "Thương có thể là số thập phân", examples: "25.5 : 5" },
    { id: 8, name: "Mức 8: Chia 2 số thập phân", description: "Chia cho số thập phân", examples: "14.4 : 1.2" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let divisor = 2;
    let quotient = 1;
    let dividend = 2;
    let explanation = "";

    if (diff === 1) {
      divisor = randomInt(2, 5);
      quotient = randomInt(2, 9);
      dividend = divisor * quotient;
      explanation = `Vì $${quotient} \\times ${divisor} = ${dividend}$ nên $${dividend} : ${divisor} = ${quotient}$.`;
    } else if (diff === 2) {
      divisor = randomInt(6, 9);
      quotient = randomInt(3, 9);
      dividend = divisor * quotient;
      explanation = `Vì $${quotient} \\times ${divisor} = ${dividend}$ nên $${dividend} : ${divisor} = ${quotient}$.`;
    } else if (diff === 3) {
      divisor = randomInt(2, 9);
      quotient = randomInt(2, 9) * 10;
      dividend = divisor * quotient;
      explanation = `Ta có $${dividend} : ${divisor} = (${dividend / 10} : ${divisor}) \\times 10 = ${quotient / 10} \\times 10 = ${quotient}$.`;
    } else if (diff === 4) {
      divisor = randomInt(3, 8);
      quotient = randomInt(12, 45);
      dividend = divisor * quotient;
      explanation = `Đặt tính chia $${dividend} : ${divisor}$ được thương là $${quotient}$.`;
    } else if (diff === 5) {
      divisor = randomInt(12, 35);
      quotient = randomInt(11, 42);
      dividend = divisor * quotient;
      explanation = `Đặt tính chia $${dividend} : ${divisor}$:\n$${dividend} : ${divisor} = ${quotient}$.`;
    } else if (diff === 6) {
      divisor = randomInt(25, 125);
      quotient = randomInt(112, 450);
      dividend = divisor * quotient;
      explanation = `Đặt tính chia $${dividend} : ${divisor}$:\n$${dividend} : ${divisor} = ${quotient}$.`;
    } else if (diff === 7) {
      divisor = randomInt(2, 9);
      quotient = randomInt(15, 95) / 10;
      dividend = Number((divisor * quotient).toFixed(1));
      explanation = `Thực hiện phép chia số thập phân:\n$${dividend} : ${divisor} = ${quotient}$.`;
    } else {
      divisor = randomInt(12, 55) / 10;
      quotient = randomInt(15, 95) / 10;
      dividend = Number((divisor * quotient).toFixed(2));
      explanation = `Bỏ dấu phẩy ở số chia, lùi dấu phẩy ở số bị chia và thực hiện phép chia:\n$${dividend} : ${divisor} = ${quotient}$.`;
    }

    const prompt = `${dividend} : ${divisor} = ?`;
    const latex = `${dividend} : ${divisor} = ?`;
    const correctAnswer = quotient;
    const dists = generateNumericDistractors(correctAnswer, 3, diff <= 2 ? 2 : 10);
    const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `div_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: "Nhập thương của phép chia",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
