import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, randomChoice, generateNumericDistractors, shuffle } from "../utils";

export const scoreConquestMode: PracticeMode = {
  id: "score-conquest",
  title: "Chinh phục điểm số",
  description: "Vượt qua các câu hỏi đa dạng để đạt mốc 500 điểm mục tiêu trong thời gian ngắn nhất!",
  shortTag: "Mục tiêu 500 điểm",
  category: "speed",
  gradeRange: [4, 9],
  icon: "Trophy",
  badgeColor: "yellow",
  gameRule: "score_conquest",
  defaultLength: "endless",
  difficultyLevels: [
    { id: 1, name: "Tiêu chuẩn (500 điểm)", description: "Câu dễ +10đ, trung bình +25đ, khó +50đ", examples: "Mục tiêu: 500đ" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    // Generate mixed difficulties: Dễ, Trung bình, Khó
    const tier = randomChoice([1, 2, 3]);
    let prompt = "";
    let latex = "";
    let correctAnswer = 0;
    let explanation = "";

    if (tier === 1) {
      // Dễ: +10đ
      const a = randomInt(12, 45);
      const b = randomInt(15, 55);
      correctAnswer = a + b;
      prompt = `[Dễ +10đ] ${a} + ${b} = ?`;
      latex = `${a} + ${b} = ?`;
      explanation = `$${a} + ${b} = ${correctAnswer}$.`;
    } else if (tier === 2) {
      // TB: +25đ
      const a = randomInt(6, 15);
      const b = randomInt(6, 12);
      const c = randomInt(10, 40);
      correctAnswer = a * b + c;
      prompt = `[Trung bình +25đ] ${a} × ${b} + ${c} = ?`;
      latex = `${a} \\times ${b} + ${c} = ?`;
      explanation = `Thực hiện nhân trước, cộng sau: $${a} \\times ${b} + ${c} = ${a * b} + ${c} = ${correctAnswer}$.`;
    } else {
      // Khó: +50đ
      const a = randomInt(15, 30);
      const b = randomInt(4, 9);
      const c = randomInt(2, 6);
      correctAnswer = a * b - b * c;
      prompt = `[Khó +50đ] ${a} × ${b} - ${b} × ${c} = ?`;
      latex = `${a} \\times ${b} - ${b} \\times ${c} = ?`;
      explanation = `Áp dụng tính chất phân phối: $${b} \\times (${a} - ${c}) = ${b} \\times ${a - c} = ${correctAnswer}$.`;
    }

    const dists = generateNumericDistractors(correctAnswer, 3, 10);
    const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `conquest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: `Câu hỏi cấp độ ${tier === 1 ? "Dễ (+10đ)" : tier === 2 ? "Trung bình (+25đ)" : "Khó (+50đ)"}`,
      correctAnswer,
      options,
      explanation,
      difficulty: tier,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: (q, ans, ctx) => {
    if (!ctx.isCorrect) return 0;
    const tierBonus = q.difficulty === 1 ? 10 : q.difficulty === 2 ? 25 : 50;
    return tierBonus + Math.min(ctx.combo * 2, 10);
  },
};
