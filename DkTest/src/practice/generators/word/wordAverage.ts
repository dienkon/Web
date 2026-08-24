import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, generateNumericDistractors, shuffle } from "../utils";

export const wordAverageMode: PracticeMode = {
  id: "word-average",
  title: "Tìm số trung bình cộng",
  description: "Luyện tính số trung bình cộng của nhiều số và các bài toán ngược về trung bình cộng.",
  shortTag: "Trung bình cộng",
  category: "word_problems",
  gradeRange: [4, 6],
  icon: "BarChart3",
  badgeColor: "purple",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: TBC của 3-4 số", description: "Tính trung bình cộng cơ bản", examples: "TBC của 15, 25, 35 là 25" },
    { id: 2, name: "Mức 2: Bài toán ngược", description: "Biết TBC, tìm số còn lại", examples: "TBC của 3 số là 20. Số thứ nhất là 15, số thứ 2 là 25. Tìm số thứ 3" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;

    if (diff === 1) {
      const count = randomInt(3, 4);
      const avg = randomInt(15, 60);
      const deltas = count === 3 ? [-6, 2, 4] : [-8, -2, 4, 6];
      const numbers = deltas.map((d) => avg + d);
      const correctAnswer = avg;

      const prompt = `Tìm số trung bình cộng của các số sau: ${numbers.join(", ")}`;
      const latex = `\\text{Tính TBC của: } ${numbers.join(", ")}`;
      const sum = numbers.reduce((a, b) => a + b, 0);
      const explanation = `Công thức tính số trung bình cộng:\n$\\text{TBC} = (${numbers.join(" + ")}) : ${count} = ${sum} : ${count} = ${avg}$.`;

      const dists = generateNumericDistractors(correctAnswer, 3, 5);
      const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

      return {
        id: `wavg_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: "numeric",
        prompt,
        latex,
        subText: "Nhập số trung bình cộng",
        correctAnswer,
        options,
        explanation,
        difficulty: diff,
      };
    } else {
      const avg = randomInt(20, 70);
      const a = avg - randomInt(5, 15);
      const b = avg + randomInt(2, 12);
      const total = avg * 3;
      const c = total - a - b;
      const correctAnswer = c;

      const prompt = `Trung bình cộng của 3 số là ${avg}. Biết số thứ nhất là ${a}, số thứ hai là ${b}. Tìm số thứ ba.`;
      const latex = `\\text{TBC}(a, b, c) = ${avg}, a = ${a}, b = ${b}. \\text{ Tìm } c`;
      const explanation = `- Tổng của 3 số là: $${avg} \\times 3 = ${total}$\n- Số thứ ba là: $${total} - ${a} - ${b} = ${c}$.`;

      const dists = generateNumericDistractors(correctAnswer, 3, 8);
      const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

      return {
        id: `wavg_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: "numeric",
        prompt,
        latex,
        subText: "Nhập giá trị của số thứ ba",
        correctAnswer,
        options,
        explanation,
        difficulty: diff,
      };
    }
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
