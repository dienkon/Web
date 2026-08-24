import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, randomChoice, generateNumericDistractors, shuffle } from "../utils";

export const speed60sMode: PracticeMode = {
  id: "speed-60s",
  title: "Tính nhanh 60 giây",
  description: "Giải càng nhiều phép tính cộng, trừ, nhân, chia đúng càng tốt trong vòng 60 giây nghẹt thở!",
  shortTag: "Thử thách 60 giây",
  category: "speed",
  gradeRange: [3, 9],
  icon: "Zap",
  badgeColor: "amber",
  gameRule: "time_attack_60s",
  defaultLength: "endless",
  difficultyLevels: [
    { id: 1, name: "Cơ bản", description: "Các phép tính trong phạm vi 50", examples: "12 + 15, 7 × 6, 36 : 4" },
    { id: 2, name: "Nâng cao", description: "Các phép tính phạm vi 100", examples: "45 + 38, 83 - 29, 12 × 7" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const op = randomChoice(["+", "-", "×", ":"]);
    let prompt = "";
    let latex = "";
    let correctAnswer = 0;
    let explanation = "";

    if (op === "+") {
      const a = diff === 1 ? randomInt(5, 35) : randomInt(25, 75);
      const b = diff === 1 ? randomInt(5, 35) : randomInt(25, 75);
      correctAnswer = a + b;
      prompt = `${a} + ${b} = ?`;
      latex = `${a} + ${b} = ?`;
      explanation = `$${a} + ${b} = ${correctAnswer}$.`;
    } else if (op === "-") {
      const a = diff === 1 ? randomInt(15, 50) : randomInt(45, 99);
      const b = diff === 1 ? randomInt(3, a - 5) : randomInt(15, a - 10);
      correctAnswer = a - b;
      prompt = `${a} - ${b} = ?`;
      latex = `${a} - ${b} = ?`;
      explanation = `$${a} - ${b} = ${correctAnswer}$.`;
    } else if (op === "×") {
      const a = diff === 1 ? randomInt(2, 9) : randomInt(4, 12);
      const b = diff === 1 ? randomInt(2, 9) : randomInt(3, 9);
      correctAnswer = a * b;
      prompt = `${a} × ${b} = ?`;
      latex = `${a} \\times ${b} = ?`;
      explanation = `$${a} \\times ${b} = ${correctAnswer}$.`;
    } else {
      const divisor = diff === 1 ? randomInt(2, 9) : randomInt(3, 12);
      const quotient = diff === 1 ? randomInt(2, 9) : randomInt(3, 12);
      const dividend = divisor * quotient;
      correctAnswer = quotient;
      prompt = `${dividend} : ${divisor} = ?`;
      latex = `${dividend} : ${divisor} = ?`;
      explanation = `$${dividend} : ${divisor} = ${correctAnswer}$.`;
    }

    const dists = generateNumericDistractors(correctAnswer, 3, 4);
    const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `speed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: "Tính nhanh và bấm Enter",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
      metadata: { operation: op },
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: (q, ans, ctx) => {
    if (!ctx.isCorrect) return 0;
    return 15 + Math.min(ctx.combo * 3, 30);
  },
};
