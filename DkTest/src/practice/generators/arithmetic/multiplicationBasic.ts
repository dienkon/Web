import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, generateNumericDistractors, shuffle } from "../utils";

export const multiplicationBasicMode: PracticeMode = {
  id: "multiplication-basic",
  title: "Phép nhân nhanh",
  description: "Luyện bảng cửu chương từ 2 đến 9, nhân nhẩm với 10, 100, nhân số có nhiều chữ số và nhân số thập phân.",
  shortTag: "Phép nhân",
  category: "arithmetic",
  gradeRange: [3, 5],
  icon: "X",
  badgeColor: "amber",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Bảng cửu chương 2-5", description: "Nhân trong phạm vi bảng 2 đến bảng 5", examples: "3 × 4, 5 × 7" },
    { id: 2, name: "Mức 2: Bảng cửu chương 6-9", description: "Bảng nhân nâng cao từ 6 đến 9", examples: "7 × 8, 9 × 6" },
    { id: 3, name: "Mức 3: Nhân với 10, 100, 1000", description: "Nhân nhẩm với số tròn chục, tròn trăm", examples: "24 × 10, 35 × 20" },
    { id: 4, name: "Mức 4: Nhân 2 chữ số với 1 chữ số", description: "Nhân có nhớ đơn giản", examples: "26 × 4, 58 × 6" },
    { id: 5, name: "Mức 5: Nhân 2 chữ số với 2 chữ số", description: "Nhân 2 chữ số đầy đủ", examples: "23 × 15, 34 × 27" },
    { id: 6, name: "Mức 6: Nhân 3 chữ số với 2 chữ số", description: "Nhân các số lớn", examples: "145 × 23" },
    { id: 7, name: "Mức 7: Số tự nhiên × Số thập phân", description: "Nhân số thập phân cơ bản", examples: "25 × 1.5" },
    { id: 8, name: "Mức 8: 2 số thập phân", description: "Nhân số thập phân phức tạp", examples: "2.4 × 3.5" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let a = 0;
    let b = 0;
    let explanation = "";

    if (diff === 1) {
      a = randomInt(2, 5);
      b = randomInt(2, 9);
      explanation = `Theo bảng nhân ${a}: $${a} \\times ${b} = ${a * b}$.`;
    } else if (diff === 2) {
      a = randomInt(6, 9);
      b = randomInt(3, 9);
      explanation = `Theo bảng cửu chương: $${a} \\times ${b} = ${a * b}$.`;
    } else if (diff === 3) {
      a = randomInt(12, 85);
      b = randomInt(1, 9) * 10;
      const bFactor = b / 10;
      explanation = `Tách phép tính: $${a} \\times ${b} = (${a} \\times ${bFactor}) \\times 10 = ${a * bFactor} \\times 10 = ${a * b}$.`;
    } else if (diff === 4) {
      a = randomInt(18, 75);
      b = randomInt(3, 8);
      explanation = `Thực hiện phép nhân:\n- Hàng đơn vị: $${a % 10} \\times ${b} = ${(a % 10) * b}$\n- Hàng chục: $${Math.floor(a / 10)} \\times ${b} = ${Math.floor(a / 10) * b}$\nVậy $${a} \\times ${b} = ${a * b}$.`;
    } else if (diff === 5) {
      a = randomInt(15, 45);
      b = randomInt(12, 35);
      explanation = `Đặt tính nhân:\n$${a} \\times ${b} = ${a} \\times ${b % 10} + ${a} \\times ${Math.floor(b / 10) * 10} = ${a * (b % 10)} + ${a * Math.floor(b / 10) * 10} = ${a * b}$.`;
    } else if (diff === 6) {
      a = randomInt(120, 450);
      b = randomInt(15, 45);
      explanation = `Thực hiện đặt tính nhân số lớn:\n$${a} \\times ${b} = ${a * b}$.`;
    } else if (diff === 7) {
      a = randomInt(12, 50);
      b = randomInt(12, 50) / 10;
      explanation = `Nhân như số tự nhiên, sau đó đếm số chữ số ở phần thập phân:\n$${a} \\times ${b} = ${Number((a * b).toFixed(2))}$.`;
    } else {
      a = randomInt(12, 50) / 10;
      b = randomInt(12, 50) / 10;
      explanation = `Nhân hai số thập phân:\n$${a} \\times ${b} = ${Number((a * b).toFixed(2))}$.`;
    }

    let correctAnswer = a * b;
    if (diff === 7) correctAnswer = Number(correctAnswer.toFixed(1));
    if (diff === 8) correctAnswer = Number(correctAnswer.toFixed(2));
    const prompt = `${a} × ${b} = ?`;
    const latex = `${a} \\times ${b} = ?`;
    const dists = generateNumericDistractors(correctAnswer, 3, diff <= 2 ? 6 : 25);
    const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `mul_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: "Nhập tích của phép nhân",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
