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
 * Safely parses string into numeric value, supporting Vietnamese decimal comma (0,5 -> 0.5)
 * and simple fractions (1/2 -> 0.5).
 */
export function parseNumericValue(str: string): number | null {
  if (!str) return null;
  const clean = str.trim();
  // Match single decimal number with either dot or comma: "0,5" or "-12.34"
  const normalized = clean.replace(/^([+-]?\d+),(\d+)$/, "$1.$2");
  // Match simple fraction: "1/2" or "-3/4"
  const fractionMatch = normalized.match(/^([+-]?\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const num = Number(fractionMatch[1]);
    const den = Number(fractionMatch[2]);
    if (den !== 0) return num / den;
  }
  const val = Number(normalized);
  return !isNaN(val) && isFinite(val) ? val : null;
}

/**
 * Intelligent comparison for short answer & fill-in-the-blank questions:
 * Supports exact text, normalized spaces ("x + y" == "x+y"),
 * decimal comma/dot equivalence ("0,5" == "0.5"), and numeric fraction equivalence ("1/2" == "0.5").
 */
export function isAnswerMatch(userInput: string, targetAnswer: string, caseSensitive: boolean = false): boolean {
  if (userInput === undefined || userInput === null || targetAnswer === undefined || targetAnswer === null) return false;
  const cleanUser = String(userInput).trim();
  const cleanTarget = String(targetAnswer).trim();

  // 1. Exact or case-insensitive string match
  if (caseSensitive) {
    if (cleanUser === cleanTarget) return true;
  } else {
    if (cleanUser.toLowerCase() === cleanTarget.toLowerCase()) return true;
  }

  // 2. Normalized spaces match ("x + 1" == "x+1")
  const compactUser = cleanUser.replace(/\s+/g, "");
  const compactTarget = cleanTarget.replace(/\s+/g, "");
  if (!caseSensitive && compactUser.toLowerCase() === compactTarget.toLowerCase()) {
    return true;
  } else if (caseSensitive && compactUser === compactTarget) {
    return true;
  }

  // 3. Decimal comma match ("0,5" vs "0.5")
  const dotUser = cleanUser.replace(",", ".");
  const dotTarget = cleanTarget.replace(",", ".");
  if (!caseSensitive && dotUser.toLowerCase() === dotTarget.toLowerCase()) {
    return true;
  }

  // 4. Numeric & fraction numerical equivalence (e.g. 0.5 vs 1/2 or 0,5)
  const numUser = parseNumericValue(cleanUser);
  const numTarget = parseNumericValue(cleanTarget);
  if (numUser !== null && numTarget !== null) {
    if (Math.abs(numUser - numTarget) < 1e-6) {
      return true;
    }
  }

  return false;
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

    const isCorrect = (question.acceptedAnswers || []).some((acc) =>
      isAnswerMatch(cleanUser, acc, Boolean(question.caseSensitive))
    );

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
        const validOptions = acceptedMap[idx] || [];

        const isMatch = validOptions.some((opt) =>
          isAnswerMatch(userVal, opt, Boolean(question.caseSensitive))
        );

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

  // 8. Essay (Tự luận)
  if (qType === "essay") {
    const studentText = typeof answer === "string" ? answer.trim() : "";
    if (!studentText) {
      return {
        questionId: question.id,
        status: "unanswered",
        earnedPoints: 0,
        maxPoints,
        scoreRatio: 0,
        normalizedAnswer: "",
        feedbackMetadata: { details: "Chưa nhập câu trả lời tự luận" },
      };
    }

    return {
      questionId: question.id,
      status: "partial",
      earnedPoints: 0,
      maxPoints,
      scoreRatio: 0,
      normalizedAnswer: studentText,
      feedbackMetadata: { details: "Bài làm tự luận đang chờ chấm điểm" },
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
  questionsOrParams: Question[] | { questions: Question[]; answers: Record<string, any>; options?: { totalScale?: number; essayScores?: Record<string, { score: number; maxScore?: number; feedback?: string }> } },
  maybeAnswers?: Record<string, any>,
  options?: { totalScale?: number; essayScores?: Record<string, { score: number; maxScore?: number; feedback?: string }> }
): ExamGradingSummary {
  let questions: Question[];
  let answers: Record<string, any>;
  let opts = options;

  if (Array.isArray(questionsOrParams)) {
    questions = questionsOrParams;
    answers = maybeAnswers || {};
  } else {
    questions = questionsOrParams.questions || [];
    answers = questionsOrParams.answers || {};
    opts = questionsOrParams.options || options;
  }

  const totalCount = questions.length;
  const targetScale = opts?.totalScale || 10.0;

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

    // If essay score was provided (from AI or manual teacher grading)
    if (q.type === "essay" && opts?.essayScores?.[q.id]) {
      const essayScoreItem = opts.essayScores[q.id];
      const earned = Math.min(pointPerQuestion, Math.max(0, Number(essayScoreItem.score || 0)));
      res.earnedPoints = Math.round(earned * 100) / 100;
      res.scoreRatio = res.maxPoints > 0 ? res.earnedPoints / res.maxPoints : 0;
      if (res.scoreRatio >= 0.8) {
        res.status = "correct";
      } else if (res.scoreRatio > 0) {
        res.status = "partial";
      } else {
        res.status = "incorrect";
      }
      if (essayScoreItem.feedback) {
        res.feedbackMetadata = { ...(res.feedbackMetadata || {}), details: essayScoreItem.feedback };
      }
    }

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
