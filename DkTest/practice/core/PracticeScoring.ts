import { PracticeAnswerValue, PracticeQuestion } from "./types";

export function defaultValidateAnswer(
  question: PracticeQuestion,
  userAnswer: PracticeAnswerValue | null
): boolean {
  if (userAnswer === null || userAnswer === undefined) return false;

  switch (question.type) {
    case "numeric": {
      const numUser = typeof userAnswer === "number" ? userAnswer : parseFloat(String(userAnswer).trim().replace(",", "."));
      const numTarget = typeof question.correctAnswer === "number" ? question.correctAnswer : parseFloat(String(question.correctAnswer));
      if (isNaN(numUser) || isNaN(numTarget)) return false;
      return Math.abs(numUser - numTarget) < 0.0001;
    }

    case "choice": {
      return String(userAnswer).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase();
    }

    case "comparison": {
      return String(userAnswer).trim() === String(question.correctAnswer).trim();
    }

    case "fraction": {
      if (typeof userAnswer === "object" && userAnswer !== null && "numerator" in userAnswer && "denominator" in userAnswer) {
        const u = userAnswer as { numerator: number; denominator: number };
        const t = question.correctAnswer as { numerator: number; denominator: number };
        if (!u.denominator || !t.denominator) return false;
        // Compare cross-multiplication or exact simplified match
        return u.numerator * t.denominator === u.denominator * t.numerator;
      }
      return false;
    }

    case "step_error": {
      return Number(userAnswer) === Number(question.correctAnswer);
    }

    case "number_line": {
      const uVal = Number(userAnswer);
      const tVal = Number(question.correctAnswer);
      if (isNaN(uVal) || isNaN(tVal)) return false;
      return Math.abs(uVal - tVal) <= 0.05;
    }

    case "expression_builder": {
      return String(userAnswer).trim() === String(question.correctAnswer).trim();
    }

    default:
      return String(userAnswer).trim() === String(question.correctAnswer).trim();
  }
}

export function defaultCalculateScore(
  question: PracticeQuestion,
  userAnswer: PracticeAnswerValue | null,
  context: { isCorrect: boolean; timeSpentSeconds: number; combo: number; difficulty: number }
): number {
  if (!context.isCorrect) return 0;

  const baseScore = 10;
  const diffMultiplier = 1 + (context.difficulty - 1) * 0.25; // 1.0, 1.25, 1.5, 1.75, 2.0
  const speedBonus = context.timeSpentSeconds <= 5 ? 5 : context.timeSpentSeconds <= 12 ? 2 : 0;
  const comboBonus = Math.min(context.combo * 2, 20);

  return Math.round(baseScore * diffMultiplier + speedBonus + comboBonus);
}
