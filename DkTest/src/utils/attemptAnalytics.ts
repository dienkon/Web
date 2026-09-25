import type { Question, Submission, Section, Exam, QuestionTiming } from "../types";

export interface QuestionEvaluation {
  questionId: string;
  questionIndex: number; // 0-based
  displayIndex: number; // 1-based (Câu 1...)
  status: "correct" | "incorrect" | "unanswered";
  isAnswered: boolean;
  isCorrect: boolean;
  timeSpentSeconds: number;
  visits: number;
  answerChanges: number;
  earnedPoints: number;
  maxPoints: number;
  speedTier?: "very_fast" | "fast" | "normal" | "slow" | "very_slow";
  behaviorFlag?: "rushing_wrong" | "stuck_wrong" | "careful_correct" | "fast_correct" | "normal";
}

export interface TimeAnalyticsResult {
  hasTimingData: boolean;
  totalTrackedSeconds: number;
  averageSecondsPerQuestion: number;
  medianSecondsPerQuestion: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalCount: number;
  evaluations: QuestionEvaluation[];
  fastestQuestion?: QuestionEvaluation | null;
  slowestQuestion?: QuestionEvaluation | null;
  longestSlowStreak?: {
    startNumber: number;
    endNumber: number;
    count: number;
    avgTime: number;
  } | null;
  speedThresholds: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

export interface SegmentAnalytics {
  title: string;
  startQuestionNumber: number;
  endQuestionNumber: number;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  averageTimeSeconds: number;
}

export interface ProgressAccumulationPoint {
  questionNumber: number;
  label: string;
  userScore: number;
  maxScore: number;
  earnedPoints: number;
  isCorrect: boolean;
  status: "correct" | "incorrect" | "unanswered";
}

/**
 * Deterministically evaluates a student's answer for a single question.
 */
export function evaluateQuestionAnswer(
  q: Question,
  studentAns: any,
  pointPerQuestion: number
): { isAnswered: boolean; isCorrect: boolean; status: "correct" | "incorrect" | "unanswered"; earnedPoints: number } {
  let isAnswered = false;

  if (studentAns !== undefined && studentAns !== null && studentAns !== "") {
    isAnswered = true;
    if (Array.isArray(studentAns) && studentAns.length === 0) isAnswered = false;
    if (typeof studentAns === "object" && !Array.isArray(studentAns) && Object.keys(studentAns).length === 0) {
      isAnswered = false;
    }
  }

  if (!isAnswered) {
    return { isAnswered: false, isCorrect: false, status: "unanswered", earnedPoints: 0 };
  }

  let earned = 0;
  let isCorrect = false;

  if (q.type === "single_choice") {
    isCorrect = q.correctOptionIds?.includes(studentAns as string) || false;
    earned = isCorrect ? pointPerQuestion : 0;
  } else if (q.type === "multiple_choice") {
    const correctSet = new Set<string>(q.correctOptionIds || []);
    const ansSet = new Set<string>((studentAns as string[]) || []);
    isCorrect =
      correctSet.size > 0 &&
      correctSet.size === ansSet.size &&
      [...correctSet].every((id) => ansSet.has(id));
    earned = isCorrect ? pointPerQuestion : 0;
  } else if (q.type === "short_answer") {
    const accepted = q.acceptedAnswers?.map((a) => (q.trimWhitespace !== false ? a.trim() : a)) || [];
    const userVal = q.trimWhitespace !== false ? String(studentAns || "").trim() : String(studentAns || "");
    isCorrect = accepted.some((a) => (q.caseSensitive ? a === userVal : a.toLowerCase() === userVal.toLowerCase()));
    earned = isCorrect ? pointPerQuestion : 0;
  } else if (q.type === "true_false") {
    const stmts = q.statements || [];
    if (stmts.length > 0 && typeof studentAns === "object" && studentAns !== null) {
      let cCount = 0;
      stmts.forEach((s) => {
        if ((studentAns as any)[s.id] === s.correctAnswer) cCount++;
      });
      isCorrect = cCount === stmts.length;
      earned = (cCount / stmts.length) * pointPerQuestion;
    }
  } else if (q.type === "ordering") {
    const items = q.orderingItems || [];
    const correctOrder = q.correctOrder || items.map((it) => it.id);
    const studentOrder = Array.isArray(studentAns) ? studentAns : [];
    let matches = 0;
    correctOrder.forEach((id, idx) => {
      if (studentOrder[idx] === id) matches++;
    });
    isCorrect = matches === correctOrder.length && correctOrder.length > 0;
    earned = correctOrder.length > 0 ? (matches / correctOrder.length) * pointPerQuestion : 0;
  } else if (q.type === "fill_blank") {
    const acceptedMap = q.acceptedAnswersPerBlank || {};
    const ansMap = typeof studentAns === "object" && studentAns ? studentAns : {};
    const keys = Object.keys(acceptedMap);
    if (keys.length > 0) {
      let correctBlanks = 0;
      keys.forEach((k) => {
        const idx = Number(k);
        const userVal = String(ansMap[idx] || "").trim();
        const validOptions = acceptedMap[idx] || [];
        const isMatch = validOptions.some((opt) => {
          const target = q.trimWhitespace !== false ? opt.trim() : opt;
          if (q.caseSensitive) return target === (q.trimWhitespace !== false ? userVal : String(ansMap[idx] || ""));
          return target.toLowerCase() === userVal.toLowerCase();
        });
        if (isMatch) correctBlanks++;
      });
      isCorrect = correctBlanks === keys.length;
      earned = (correctBlanks / keys.length) * pointPerQuestion;
    }
  } else if (q.type === "matching") {
    const correctMap = q.correctMatches || {};
    const ansMap = typeof studentAns === "object" && studentAns ? studentAns : {};
    const keys = Object.keys(correctMap);
    if (keys.length > 0) {
      let correctCount = 0;
      keys.forEach((k) => {
        if (String(ansMap[k] || "").trim().toLowerCase() === String(correctMap[k] || "").trim().toLowerCase()) {
          correctCount++;
        }
      });
      isCorrect = correctCount === keys.length;
      earned = (correctCount / keys.length) * pointPerQuestion;
    }
  }

  const status: "correct" | "incorrect" | "unanswered" = isCorrect ? "correct" : "incorrect";
  return { isAnswered, isCorrect, status, earnedPoints: Math.round(earned * 1000) / 1000 };
}

/**
 * Calculate statistical time and behavioral analytics for an exam attempt.
 */
export function computeAttemptTimeAnalytics(
  submission: Submission,
  questions: Question[]
): TimeAnalyticsResult {
  const totalCount = questions.length;
  const pointPerQuestion = totalCount > 0 ? 10 / totalCount : 0;
  const timingMap: Record<string, QuestionTiming> = submission.questionTiming || {};

  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let totalTrackedSeconds = 0;

  let hasTimingData = false;

  const rawTimes: number[] = [];

  const evaluations: QuestionEvaluation[] = questions.map((q, idx) => {
    const studentAns = submission.answers?.[q.id];
    const { isAnswered, isCorrect, status, earnedPoints } = evaluateQuestionAnswer(q, studentAns, pointPerQuestion);

    if (status === "correct") correctCount++;
    else if (status === "incorrect") incorrectCount++;
    else unansweredCount++;

    const timingEntry = timingMap[q.id];
    let timeSpent = 0;
    let visits = 0;
    let answerChanges = 0;

    if (timingEntry) {
      timeSpent = Math.max(0, timingEntry.timeSpentSeconds || 0);
      visits = timingEntry.visits || 0;
      answerChanges = timingEntry.answerChanges || 0;
      if (timeSpent > 0 || visits > 0) {
        hasTimingData = true;
      }
    }

    if (timeSpent > 0) {
      rawTimes.push(timeSpent);
    }
    totalTrackedSeconds += timeSpent;

    return {
      questionId: q.id,
      questionIndex: idx,
      displayIndex: idx + 1,
      status,
      isAnswered,
      isCorrect,
      timeSpentSeconds: timeSpent,
      visits,
      answerChanges,
      earnedPoints,
      maxPoints: pointPerQuestion,
    };
  });

  // If sum of question times is 0 or no entry existed, fallback to submission.timeSpent if valid
  if (!hasTimingData && (submission.timeSpent || 0) > 0) {
    // Attempt has total time but no per-question breakdown -> backward compatibility
    hasTimingData = false;
  }

  // Calculate speed thresholds via percentiles
  rawTimes.sort((a, b) => a - b);
  const getPercentile = (p: number): number => {
    if (rawTimes.length === 0) return 0;
    const index = Math.floor((rawTimes.length - 1) * p);
    return rawTimes[index] || 0;
  };

  const p25 = getPercentile(0.25) || 10;
  const p50 = getPercentile(0.5) || 20;
  const p75 = getPercentile(0.75) || 45;
  const p90 = getPercentile(0.9) || 75;

  const validCount = rawTimes.length;
  const averageSecondsPerQuestion = validCount > 0 ? Math.round(totalTrackedSeconds / validCount) : 0;
  const medianSecondsPerQuestion = p50;

  // Enrich evaluations with speed tiers & behavioral flags
  let fastestQuestion: QuestionEvaluation | null = null;
  let slowestQuestion: QuestionEvaluation | null = null;

  evaluations.forEach((item) => {
    const t = item.timeSpentSeconds;
    if (t <= p25) item.speedTier = "very_fast";
    else if (t <= p50) item.speedTier = "fast";
    else if (t <= p75) item.speedTier = "normal";
    else if (t <= p90) item.speedTier = "slow";
    else item.speedTier = "very_slow";

    if (item.status === "incorrect" && (item.speedTier === "very_fast" || (t > 0 && t < 15))) {
      item.behaviorFlag = "rushing_wrong";
    } else if (item.status === "incorrect" && (item.speedTier === "slow" || item.speedTier === "very_slow")) {
      item.behaviorFlag = "stuck_wrong";
    } else if (item.status === "correct" && (item.speedTier === "slow" || item.speedTier === "very_slow")) {
      item.behaviorFlag = "careful_correct";
    } else if (item.status === "correct" && (item.speedTier === "very_fast" || item.speedTier === "fast")) {
      item.behaviorFlag = "fast_correct";
    } else {
      item.behaviorFlag = "normal";
    }

    if (t > 0) {
      if (!fastestQuestion || t < fastestQuestion.timeSpentSeconds) {
        fastestQuestion = item;
      }
      if (!slowestQuestion || t > slowestQuestion.timeSpentSeconds) {
        slowestQuestion = item;
      }
    }
  });

  // Calculate longest slow streak (consecutive questions above average time)
  let currentStreak = 0;
  let currentStreakStart = -1;
  let currentStreakTotalTime = 0;

  let maxStreakCount = 0;
  let maxStreakStart = -1;
  let maxStreakEnd = -1;
  let maxStreakTotalTime = 0;

  evaluations.forEach((ev, idx) => {
    if (ev.timeSpentSeconds > averageSecondsPerQuestion && ev.timeSpentSeconds > 0) {
      if (currentStreak === 0) currentStreakStart = idx + 1;
      currentStreak++;
      currentStreakTotalTime += ev.timeSpentSeconds;

      if (currentStreak > maxStreakCount) {
        maxStreakCount = currentStreak;
        maxStreakStart = currentStreakStart;
        maxStreakEnd = idx + 1;
        maxStreakTotalTime = currentStreakTotalTime;
      }
    } else {
      currentStreak = 0;
      currentStreakStart = -1;
      currentStreakTotalTime = 0;
    }
  });

  const longestSlowStreak =
    maxStreakCount >= 1
      ? {
          startNumber: maxStreakStart,
          endNumber: maxStreakEnd,
          count: maxStreakCount,
          avgTime: Math.round(maxStreakTotalTime / maxStreakCount),
        }
      : null;

  return {
    hasTimingData,
    totalTrackedSeconds: totalTrackedSeconds || submission.timeSpent || 0,
    averageSecondsPerQuestion,
    medianSecondsPerQuestion,
    correctCount,
    incorrectCount,
    unansweredCount,
    totalCount,
    evaluations,
    fastestQuestion,
    slowestQuestion,
    longestSlowStreak,
    speedThresholds: { p25, p50, p75, p90 },
  };
}

/**
 * Computes segment analysis dividing the exam into 3 balanced parts (Start, Middle, End).
 */
export function computeSegmentAnalytics(
  evaluations: QuestionEvaluation[]
): {
  start: SegmentAnalytics;
  middle: SegmentAnalytics;
  end: SegmentAnalytics;
} {
  const N = evaluations.length;
  if (N === 0) {
    const empty: SegmentAnalytics = {
      title: "",
      startQuestionNumber: 0,
      endQuestionNumber: 0,
      totalQuestions: 0,
      correctCount: 0,
      accuracy: 0,
      averageTimeSeconds: 0,
    };
    return { start: { ...empty, title: "Đầu bài" }, middle: { ...empty, title: "Giữa bài" }, end: { ...empty, title: "Cuối bài" } };
  }

  const s1 = Math.floor(N / 3);
  const s2 = Math.floor((2 * N) / 3);

  const startGroup = evaluations.slice(0, Math.max(1, s1));
  const middleGroup = evaluations.slice(Math.max(1, s1), Math.max(s1 + 1, s2));
  const endGroup = evaluations.slice(Math.max(s1 + 1, s2));

  const calcGroup = (title: string, group: QuestionEvaluation[]): SegmentAnalytics => {
    const total = group.length;
    if (total === 0) {
      return {
        title,
        startQuestionNumber: 0,
        endQuestionNumber: 0,
        totalQuestions: 0,
        correctCount: 0,
        accuracy: 0,
        averageTimeSeconds: 0,
      };
    }
    const correct = group.filter((g) => g.status === "correct").length;
    const accuracy = Math.round((correct / total) * 100);
    const sumTime = group.reduce((acc, g) => acc + g.timeSpentSeconds, 0);
    const avgTime = Math.round(sumTime / total);

    return {
      title,
      startQuestionNumber: group[0].displayIndex,
      endQuestionNumber: group[group.length - 1].displayIndex,
      totalQuestions: total,
      correctCount: correct,
      accuracy,
      averageTimeSeconds: avgTime,
    };
  };

  return {
    start: calcGroup("Đầu bài", startGroup),
    middle: calcGroup("Giữa bài", middleGroup),
    end: calcGroup("Cuối bài", endGroup),
  };
}

/**
 * Computes progressive score accumulation across the questions sequence.
 */
export function computeProgressAccumulation(
  evaluations: QuestionEvaluation[]
): ProgressAccumulationPoint[] {
  let userCumulative = 0;
  let maxCumulative = 0;

  return evaluations.map((item) => {
    userCumulative += item.earnedPoints;
    maxCumulative += item.maxPoints;

    return {
      questionNumber: item.displayIndex,
      label: `Câu ${item.displayIndex}`,
      userScore: Math.min(10, Math.round(userCumulative * 100) / 100),
      maxScore: Math.min(10, Math.round(maxCumulative * 100) / 100),
      earnedPoints: item.earnedPoints,
      isCorrect: item.isCorrect,
      status: item.status,
    };
  });
}

/**
 * Builds a deterministic, validated analysis payload to send to the AI backend.
 */
export function buildAiAnalysisPayload(
  submission: Submission,
  exam: Exam | null,
  questions: Question[],
  sections: Section[],
  timeAnalytics: TimeAnalyticsResult,
  segmentAnalytics: { start: SegmentAnalytics; middle: SegmentAnalytics; end: SegmentAnalytics }
) {
  const sectionMap = new Map(sections.map((s) => [s.id, s.title]));

  // Performance by section
  const sectionStats: Record<string, { title: string; total: number; correct: number; totalTime: number }> = {};
  sections.forEach((s) => {
    sectionStats[s.id] = { title: s.title || "Phần thi", total: 0, correct: 0, totalTime: 0 };
  });
  sectionStats["no_section"] = { title: "Phần chung", total: 0, correct: 0, totalTime: 0 };

  questions.forEach((q, idx) => {
    const sId = q.sectionId || "no_section";
    if (!sectionStats[sId]) {
      sectionStats[sId] = { title: sectionMap.get(sId) || "Phần chung", total: 0, correct: 0, totalTime: 0 };
    }
    const ev = timeAnalytics.evaluations[idx];
    sectionStats[sId].total += 1;
    if (ev?.status === "correct") sectionStats[sId].correct += 1;
    sectionStats[sId].totalTime += ev?.timeSpentSeconds || 0;
  });

  const sectionPerformance = Object.entries(sectionStats)
    .filter(([_, st]) => st.total > 0)
    .map(([sId, st]) => ({
      sectionId: sId,
      title: st.title,
      totalQuestions: st.total,
      correctCount: st.correct,
      accuracy: Math.round((st.correct / st.total) * 100),
      averageSecondsPerQuestion: Math.round(st.totalTime / st.total),
    }));

  // Filter notable questions to prevent sending thousands of tokens
  const notableList = timeAnalytics.evaluations
    .filter((ev) => ev.behaviorFlag !== "normal" || ev.answerChanges > 1)
    .slice(0, 8)
    .map((ev) => ({
      questionIndex: ev.displayIndex,
      questionId: ev.questionId,
      timeSpentSeconds: ev.timeSpentSeconds,
      status: ev.status,
      behaviorFlag: ev.behaviorFlag,
      answerChanges: ev.answerChanges,
      visits: ev.visits,
    }));

  return {
    exam: {
      title: exam?.title || submission.examTitleSnapshot || "Bài kiểm tra",
      subject: exam?.subject || "Chung",
      grade: exam?.gradeCategory || "",
      totalQuestions: questions.length,
      maxScore: submission.maxScore || 10,
    },
    result: {
      score: submission.score,
      maxScore: submission.maxScore || 10,
      correctCount: timeAnalytics.correctCount,
      incorrectCount: timeAnalytics.incorrectCount,
      unansweredCount: timeAnalytics.unansweredCount,
      accuracyPercentage: Math.round(((submission.score || 0) / (submission.maxScore || 10)) * 100),
      timeSpentSeconds: submission.timeSpent || timeAnalytics.totalTrackedSeconds,
    },
    timing: {
      hasTimingData: timeAnalytics.hasTimingData,
      averageSecondsPerQuestion: timeAnalytics.averageSecondsPerQuestion,
      medianSecondsPerQuestion: timeAnalytics.medianSecondsPerQuestion,
      fastestQuestion: timeAnalytics.fastestQuestion
        ? {
            index: timeAnalytics.fastestQuestion.displayIndex,
            seconds: timeAnalytics.fastestQuestion.timeSpentSeconds,
            status: timeAnalytics.fastestQuestion.status,
          }
        : null,
      slowestQuestion: timeAnalytics.slowestQuestion
        ? {
            index: timeAnalytics.slowestQuestion.displayIndex,
            seconds: timeAnalytics.slowestQuestion.timeSpentSeconds,
            status: timeAnalytics.slowestQuestion.status,
          }
        : null,
      longestSlowStreak: timeAnalytics.longestSlowStreak,
    },
    segments: {
      start: segmentAnalytics.start,
      middle: segmentAnalytics.middle,
      end: segmentAnalytics.end,
    },
    sections: sectionPerformance,
    notableQuestionsSummary: notableList,
  };
}
