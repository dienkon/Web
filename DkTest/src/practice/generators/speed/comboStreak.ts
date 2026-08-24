import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, randomChoice, generateNumericDistractors, shuffle } from "../utils";

export const comboStreakMode: PracticeMode = {
  id: "combo-streak",
  title: "Combo đúng liên tiếp",
  description: "Duy trì chuỗi trả lời đúng liên tục dài nhất có thể để nhân số điểm combo!",
  shortTag: "Chuỗi Combo",
  category: "speed",
  gradeRange: [3, 9],
  icon: "Flame",
  badgeColor: "orange",
  gameRule: "combo_streak",
  defaultLength: "endless",
  difficultyLevels: [
    { id: 1, name: "Thử thách liên hoàn", description: "Độ khó tăng dần sau mỗi mốc 5 combo đúng liên tiếp", examples: "10, 20, 30 combo" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const streak = context.currentStreak || 0;
    const effectiveDiff = Math.min(5, Math.floor(streak / 5) + 1);

    const op = randomChoice(["+", "-", "×", ":"]);
    let prompt = "";
    let latex = "";
    let correctAnswer = 0;
    let explanation = "";

    if (op === "+") {
      const a = randomInt(5 * effectiveDiff, 20 * effectiveDiff);
      const b = randomInt(5 * effectiveDiff, 20 * effectiveDiff);
      correctAnswer = a + b;
      prompt = `${a} + ${b} = ?`;
      latex = `${a} + ${b} = ?`;
      explanation = `$${a} + ${b} = ${correctAnswer}$.`;
    } else if (op === "-") {
      const a = randomInt(15 * effectiveDiff, 40 * effectiveDiff);
      const b = randomInt(5 * effectiveDiff, a - 5);
      correctAnswer = a - b;
      prompt = `${a} - ${b} = ?`;
      latex = `${a} - ${b} = ?`;
      explanation = `$${a} - ${b} = ${correctAnswer}$.`;
    } else if (op === "×") {
      const a = randomInt(2, 5 + effectiveDiff);
      const b = randomInt(2, 9);
      correctAnswer = a * b;
      prompt = `${a} × ${b} = ?`;
      latex = `${a} \\times ${b} = ?`;
      explanation = `$${a} \\times ${b} = ${correctAnswer}$.`;
    } else {
      const divisor = randomInt(2, 4 + effectiveDiff);
      const quotient = randomInt(2, 8 + effectiveDiff);
      const dividend = divisor * quotient;
      correctAnswer = quotient;
      prompt = `${dividend} : ${divisor} = ?`;
      latex = `${dividend} : ${divisor} = ?`;
      explanation = `$${dividend} : ${divisor} = ${correctAnswer}$.`;
    }

    const dists = generateNumericDistractors(correctAnswer, 3, 5);
    const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `combo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: `Chuỗi hiện tại: 🔥 ${streak} combo`,
      correctAnswer,
      options,
      explanation,
      difficulty: effectiveDiff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: (q, ans, ctx) => {
    if (!ctx.isCorrect) return 0;
    return 10 + ctx.combo * 5;
  },
};
