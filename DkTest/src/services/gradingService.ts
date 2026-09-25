/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Question } from "../types";

export type QuestionGradingStatus =
  | "correct"
  | "partial"
  | "incorrect"
  | "unanswered";

export interface QuestionGradingResult {
  questionId: string;
  status: QuestionGradingStatus;
  earnedPoints: number;
  maxPoints: number;
  scoreRatio: number; // 0.0 to 1.0
  normalizedAnswer: any;
  feedbackMetadata?: {
    correctCount?: number;
    totalElements?: number;
    details?: string;
  };
}

export interface ExamGradingSummary {
  score: number; // Scaled score (typically on 10.0 scale)
  rawScore: number;
  maxScore: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalCount: number;
  answeredCount: number;
  results: Record<string, QuestionGradingResult>;
  correctQuestionIds: string[];
}

/**
 * Normalizes answer values for evaluation.
 */
function isAnswerEmpty(val: any): boolean {
  if (val === undefined || val === null || val === "") return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === "object" && !Array.isArray(val) && Object.keys(val).length === 0) return true;
  return false;
}

/**
 * Authoritative grading engine for an individual question.
 * Evaluates all 6 question types according to standardized DkTest scoring rules.
 */
export function gradeQuestion(params: {
  question: Question;
  answer: any;
  pointPerQuestion?: number;
}): QuestionGradingResult {
  const { question, answer } = params;
  const maxPoints = params.pointPerQuestion ?? (question.points || 1);

  if (isAnswerEmpty(answer)) {
    return {
      questionId: question.id,
      status: "unanswered",
      earnedPoints: 0,
      maxPoints,
      scoreRatio: 0,
      normalizedAnswer: null,
    };
  }

  const qType = question.type || "single_choice";

  // 1. Single Choice
  if (qType === "single_choice") {
    const correctIds = question.correctOptionIds || [];
    const selected =
      typeof answer === "string"
        ? answer.trim()
        : Array.isArray(answer)
        ? String(answer[0] || "").trim()
        : String(answer).trim();

    if (!selected) {
      return {
        questionId: question.id,
        status: "unanswered",
        earnedPoints: 0,
        maxPoints,
        scoreRatio: 0,
        normalizedAnswer: null,
      };
    }

    const isCorrect = correctIds.includes(selected);
    return {
      questionId: question.id,
      status: isCorrect ? "correct" : "incorrect",
      earnedPoints: isCorrect ? maxPoints : 0,
      maxPoints,
      scoreRatio: isCorrect ? 1 : 0,
      normalizedAnswer: selected,
    };
  }

  // 2. Multiple Choice
  if (qType === "multiple_choice") {
    const correctSet = new Set<string>(question.correctOptionIds || []);
    const selectedArr = Array.isArray(answer)
      ? answer.map((a) => String(a).trim()).filter(Boolean)
      : [String(answer).trim()].filter(Boolean);

    if (selectedArr.length === 0) {
      return {
        questionId: question.id,
        status: "unanswered",
        earnedPoints: 0,
        maxPoints,
        scoreRatio: 0,
        normalizedAnswer: [],
      };
    }

    const ansSet = new Set<string>(selectedArr);
    const isAllCorrect =
      correctSet.size > 0 &&
      correctSet.size === ansSet.size &&
      [...correctSet].every((id) => ansSet.has(id));

    if (isAllCorrect) {
      return {
        questionId: question.id,
        status: "correct",
        earnedPoints: maxPoints,
        maxPoints,
        scoreRatio: 1,
        normalizedAnswer: selectedArr,
      };
    }

    // Check partial credit: only if no incorrect options were selected
    const hasWrong = selectedArr.some((id) => !correctSet.has(id));
    const correctCount = selectedArr.filter((id) => correctSet.has(id)).length;

    if (!hasWrong && correctCount > 0 && correctSet.size > 0) {
      const ratio = correctCount / correctSet.size;
      const earned = Math.round(ratio * maxPoints * 100) / 100;
      return {
        questionId: question.id,
        status: "partial",
        earnedPoints: earned,
        maxPoints,
        scoreRatio: ratio,
        normalizedAnswer: selectedArr,
        feedbackMetadata: { correctCount, totalElements: correctSet.size },
      };
    }

    return {
      questionId: question.id,
      status: "incorrect",
      earnedPoints: 0,
      maxPoints,
      scoreRatio: 0,
      normalizedAnswer: selectedArr,
    };
  }

  // 3. True / False (4 statements)
  if (qType === "true_false") {
    const statements = question.statements || [];
    const ansObj = typeof answer === "object" && answer ? answer : {};

    if (statements.length === 0) {
      return {
        questionId: question.id,
        status: "unanswered",
        earnedPoints: 0,
        maxPoints,
        scoreRatio: 0,
        normalizedAnswer: ansObj,
      };
    }

    const pointPerStatement = maxPoints / statements.length;
    let correctCount = 0;
    let answeredCount = 0;

    statements.forEach((st) => {
      const userVal = ansObj[st.id];
      if (userVal !== undefined && userVal !== null) {
        answeredCount++;
        if (Boolean(userVal) === Boolean(st.correctAnswer)) {
          correctCount++;
        }
      }
    });

    if (answeredCount === 0) {
      return {
        questionId: question.id,
        status: "unanswered",
        earnedPoints: 0,
        maxPoints,
        scoreRatio: 0,
        normalizedAnswer: ansObj,
      };
    }

    const earned = Math.round(correctCount * pointPerStatement * 100) / 100;
    const ratio = correctCount / statements.length;
    let status: QuestionGradingStatus = "incorrect";

    if (correctCount === statements.length) {
      status = "correct";
    } else if (correctCount > 0) {
      status = "partial";
    }

    return {
      questionId: question.id,
      status,
      earnedPoints: earned,
      maxPoints,
      scoreRatio: ratio,
      normalizedAnswer: ansObj,
      feedbackMetadata: { correctCount, totalElements: statements.length },
    };
  }

  // 4. Short Answer
  if (qType === "short_answer") {
    const userText = String(answer || "");
    const cleanUser = question.trimWhitespace !== false ? userText.trim() : userText;
    const compareUser = question.caseSensitive ? cleanUser : cleanUser.toLowerCase();

    if (!cleanUser) {
      return {
        questionId: question.id,
        status: "unanswered",
        earnedPoints: 0,
        maxPoints,
        scoreRatio: 0,
        normalizedAnswer: "",
      };
    }

    const accepted = (question.acceptedAnswers || []).map((acc) => {
      const trimmed = question.trimWhitespace !== false ? acc.trim() : acc;
      return question.caseSensitive ? trimmed : trimmed.toLowerCase();
    });

    const isCorrect = accepted.includes(compareUser);

    return {
      questionId: question.id,
      status: isCorrect ? "correct" : "incorrect",
      earnedPoints: isCorrect ? maxPoints : 0,
      maxPoints,
      scoreRatio: isCorrect ? 1 : 0,
      normalizedAnswer: cleanUser,
    };
  }

  // 5. Ordering
  if (qType === "ordering") {
    const items = question.orderingItems || [];
    const correctOrder = question.correctOrder || items.map((it) => it.id);
    const studentOrder = Array.isArray(answer) ? answer : [];

    if (studentOrder.length === 0 || correctOrder.length === 0) {
      return {
        questionId: question.id,
        status: "unanswered",
        earnedPoints: 0,
        maxPoints,
        scoreRatio: 0,
        normalizedAnswer: studentOrder,
      };
    }

    let matches = 0;
    correctOrder.forEach((id, idx) => {
      if (studentOrder[idx] === id) {
        matches++;
      }
    });

    const ratio = matches / correctOrder.length;
    const earned = Math.round(ratio * maxPoints * 100) / 100;
    let status: QuestionGradingStatus = "incorrect";

    if (matches === correctOrder.length) {
      status = "correct";
    } else if (matches > 0) {
      status = "partial";
    }

    return {
      questionId: question.id,
      status,
      earnedPoints: earned,
      maxPoints,
      scoreRatio: ratio,
      normalizedAnswer: studentOrder,
      feedbackMetadata: { correctCount: matches, totalElements: correctOrder.length },
    };
  }

  // 6. Fill in the blank
  if (qType === "fill_blank") {
    const acceptedMap = question.acceptedAnswersPerBlank || {};
    const ansMap = typeof answer === "object" && answer ? answer : {};
    const blankKeys = Object.keys(acceptedMap);

    if (blankKeys.length === 0) {
      return {
        questionId: question.id,
        status: "unanswered",
        earnedPoints: 0,
        maxPoints,
        scoreRatio: 0,
        normalizedAnswer: ansMap,
      };
    }

    let correctBlanks = 0;
    let answeredBlanks = 0;

    blankKeys.forEach((k) => {
      const idx = Number(k);
      const rawVal = ansMap[idx];
      if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== "") {
        answeredBlanks++;
        const userVal = question.trimWhitespace !== false ? String(rawVal).trim() : String(rawVal);
        const compareUser = question.caseSensitive ? userVal : userVal.toLowerCase();
        const validOptions = acceptedMap[idx] || [];

        const isMatch = validOptions.some((opt) => {
          const target = question.trimWhitespace !== false ? opt.trim() : opt;
          return (question.caseSensitive ? target : target.toLowerCase()) === compareUser;
        });

        if (isMatch) correctBlanks++;
      }
    });

    if (answeredBlanks === 0) {
      return {
        questionId: question.id,
        status: "unanswered",
        earnedPoints: 0,
        maxPoints,
        scoreRatio: 0,
        normalizedAnswer: ansMap,
      };
    }

    const ratio = correctBlanks / blankKeys.length;
    const earned = Math.round(ratio * maxPoints * 100) / 100;
    let status: QuestionGradingStatus = "incorrect";

    if (correctBlanks === blankKeys.length) {
      status = "correct";
    } else if (correctBlanks > 0) {
      status = "partial";
    }

    return {
      questionId: question.id,
      status,
      earnedPoints: earned,
      maxPoints,
      scoreRatio: ratio,
      normalizedAnswer: ansMap,
      feedbackMetadata: { correctCount: correctBlanks, totalElements: blankKeys.length },
    };
  }

  // 7. Matching Table (Nối bảng 2 cột)
  if (qType === "matching") {
    const correctMap = question.correctMatches || {};
    const ansMap = typeof answer === "object" && answer ? answer : {};
    const pairKeys = Object.keys(correctMap);

    if (pairKeys.length === 0) {
      return {
        questionId: question.id,
        status: "unanswered",
        earnedPoints: 0,
        maxPoints,
        scoreRatio: 0,
        normalizedAnswer: ansMap,
      };
    }

    let correctPairs = 0;
    let answeredPairs = 0;

    pairKeys.forEach((key) => {
      const userVal = ansMap[key];
      if (userVal !== undefined && userVal !== null && String(userVal).trim() !== "") {
        answeredPairs++;
        if (String(userVal).trim().toLowerCase() === String(correctMap[key]).trim().toLowerCase()) {
          correctPairs++;
        }
      }
    });

    if (answeredPairs === 0) {
      return {
        questionId: question.id,
        status: "unanswered",
        earnedPoints: 0,
        maxPoints,
        scoreRatio: 0,
        normalizedAnswer: ansMap,
      };
    }

    const ratio = correctPairs / pairKeys.length;
    const earned = Math.round(ratio * maxPoints * 100) / 100;
    let status: QuestionGradingStatus = "incorrect";

    if (correctPairs === pairKeys.length) {
      status = "correct";
    } else if (correctPairs > 0) {
      status = "partial";
    }

    return {
      questionId: question.id,
      status,
      earnedPoints: earned,
      maxPoints,
      scoreRatio: ratio,
      normalizedAnswer: ansMap,
      feedbackMetadata: { correctCount: correctPairs, totalElements: pairKeys.length },
    };
  }

  // Default fallback
  return {
    questionId: question.id,
    status: "unanswered",
    earnedPoints: 0,
    maxPoints,
    scoreRatio: 0,
    normalizedAnswer: answer,
  };
}

/**
 * Calculates complete exam score across all questions using a 10.0 scale.
 */
export function calculateExamScore(
  questions: Question[],
  answers: Record<string, any>,
  options?: { totalScale?: number }
): ExamGradingSummary {
  const totalCount = questions.length;
  const targetScale = options?.totalScale || 10.0;

  if (totalCount === 0) {
    return {
      score: 0,
      rawScore: 0,
      maxScore: targetScale,
      correctCount: 0,
      partialCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      totalCount: 0,
      answeredCount: 0,
      results: {},
      correctQuestionIds: [],
    };
  }

  const pointPerQuestion = targetScale / totalCount;
  const results: Record<string, QuestionGradingResult> = {};
  const correctQuestionIds: string[] = [];

  let totalEarned = 0;
  let correctCount = 0;
  let partialCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  questions.forEach((q) => {
    const res = gradeQuestion({
      question: q,
      answer: answers[q.id],
      pointPerQuestion,
    });

    results[q.id] = res;
    totalEarned += res.earnedPoints;

    if (res.status === "correct") {
      correctCount++;
      correctQuestionIds.push(q.id);
    } else if (res.status === "partial") {
      partialCount++;
    } else if (res.status === "incorrect") {
      incorrectCount++;
    } else {
      unansweredCount++;
    }
  });

  const finalScore = Math.min(targetScale, Math.round(totalEarned * 100) / 100);
  const answeredCount = totalCount - unansweredCount;

  return {
    score: finalScore,
    rawScore: totalEarned,
    maxScore: targetScale,
    correctCount,
    partialCount,
    incorrectCount,
    unansweredCount,
    totalCount,
    answeredCount,
    results,
    correctQuestionIds,
  };
}
