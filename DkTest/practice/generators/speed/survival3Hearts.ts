import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, randomChoice, generateNumericDistractors, shuffle } from "../utils";

export const survival3HeartsMode: PracticeMode = {
  id: "survival-3hearts",
  title: "Sinh tồn Toán học (3 Mạng)",
  description: "Bạn có 3 mạng ❤️. Mỗi câu sai sẽ mất 1 mạng. Hãy tiến xa nhất có thể và lập kỷ lục mới!",
  shortTag: "Sinh tồn 3 mạng",
  category: "speed",
  gradeRange: [3, 9],
  icon: "Heart",
  badgeColor: "red",
  gameRule: "survival_3hearts",
  defaultLength: "endless",
  difficultyLevels: [
    { id: 1, name: "Thử thách sinh tồn", description: "Bắt đầu với 3 mạng, độ khó tăng dần theo số câu vượt qua", examples: "❤️ ❤️ ❤️" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const qIndex = context.questionIndex || 0;
    const diff = Math.min(5, Math.floor(qIndex / 4) + 1);

    const op = randomChoice(["+", "-", "×", ":"]);
    let prompt = "";
    let latex = "";
    let correctAnswer = 0;
    let explanation = "";

    if (op === "+") {
      const a = randomInt(10 * diff, 25 * diff);
      const b = randomInt(10 * diff, 25 * diff);
      correctAnswer = a + b;
      prompt = `${a} + ${b} = ?`;
      latex = `${a} + ${b} = ?`;
      explanation = `$${a} + ${b} = ${correctAnswer}$.`;
    } else if (op === "-") {
      const a = randomInt(20 * diff, 50 * diff);
      const b = randomInt(5 * diff, a - 5);
      correctAnswer = a - b;
      prompt = `${a} - ${b} = ?`;
      latex = `${a} - ${b} = ?`;
      explanation = `$${a} - ${b} = ${correctAnswer}$.`;
    } else if (op === "×") {
      const a = randomInt(2, 4 + diff);
      const b = randomInt(3, 8 + diff);
      correctAnswer = a * b;
      prompt = `${a} × ${b} = ?`;
      latex = `${a} \\times ${b} = ?`;
      explanation = `$${a} \\times ${b} = ${correctAnswer}$.`;
    } else {
      const divisor = randomInt(2, 4 + diff);
      const quotient = randomInt(2, 6 + diff);
      const dividend = divisor * quotient;
      correctAnswer = quotient;
      prompt = `${dividend} : ${divisor} = ?`;
      latex = `${dividend} : ${divisor} = ?`;
      explanation = `$${dividend} : ${divisor} = ${correctAnswer}$.`;
    }

    const dists = generateNumericDistractors(correctAnswer, 3, 5);
    const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `survival_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: "Cẩn thận trả lời chính xác để bảo toàn 3 mạng",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: (q, ans, ctx) => {
    if (!ctx.isCorrect) return 0;
    return 20 + ctx.combo * 5;
  },
};
