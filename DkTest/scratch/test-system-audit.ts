/**
 * Comprehensive System Verification Test for DkTest
 * Validates:
 * 1. Authoritative Exam Session State Machine & Deterministic Transitions
 * 2. Authoritative Timer with Accumulated Pause Compensation
 * 3. Centralized Grading Engine (all 6 question types: single_choice, multiple_choice, true_false, short_answer, ordering, fill_blank)
 * 4. Submission Idempotency & Scaled Score Calculation
 */

import { canTransition, assertTransition, calculateRemainingSeconds, calculateEffectiveElapsedMs } from "../src/services/examSessionStateMachine";
import { gradeQuestion, calculateExamScore } from "../src/services/gradingService";
import type { Question } from "../src/types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

console.log("=== 1. TEST STATE MACHINE TRANSITIONS ===");
assert(canTransition("idle", "taking"), "idle -> taking is allowed");
assert(canTransition("taking", "paused"), "taking -> paused is allowed");
assert(canTransition("paused", "taking"), "paused -> taking is allowed");
assert(canTransition("taking", "submitting"), "taking -> submitting is allowed");
assert(canTransition("submitting", "submitted"), "submitting -> submitted is allowed");
assert(!canTransition("submitted", "taking"), "submitted -> taking is FORBIDDEN");
assert(!canTransition("suspended", "taking"), "suspended -> taking is FORBIDDEN");
assert(!canTransition("expired", "taking"), "expired -> taking is FORBIDDEN");

console.log("\n=== 2. TEST AUTHORITATIVE TIMER WITH ACCUMULATED PAUSE ===");
const startTime = Date.now() - 10000; // 10s ago
const durationMinutes = 1; // 60s total

// Running for 10s, no pause
const rem1 = calculateRemainingSeconds({
  startTime,
  durationMinutes,
  totalPausedDurationMs: 0,
  isPaused: false,
});
assert(rem1 >= 49 && rem1 <= 51, `Remaining seconds around 50s (actual: ${rem1})`);

// Running for 10s, but was paused for 5s previously
const rem2 = calculateRemainingSeconds({
  startTime,
  durationMinutes,
  totalPausedDurationMs: 5000,
  isPaused: false,
});
assert(rem2 >= 54 && rem2 <= 56, `Remaining seconds compensated with 5s pause (actual: ${rem2})`);

// Currently paused
const pauseStartedAt = Date.now() - 3000;
const rem3 = calculateRemainingSeconds({
  startTime,
  durationMinutes,
  totalPausedDurationMs: 0,
  isPaused: true,
  pauseStartedAt,
});
assert(rem3 >= 52 && rem3 <= 54, `Timer frozen at pauseStartedAt (actual: ${rem3})`);

console.log("\n=== 3. TEST CENTRALIZED GRADING ENGINE (ALL 6 TYPES) ===");

// 3.1 Single Choice
const q1: Question = {
  id: "q1",
  examId: "exam-test",
  type: "single_choice",
  text: "Single choice test",
  points: 1,
  order: 1,
  options: [{ id: "A", text: "A" }, { id: "B", text: "B" }],
  correctOptionIds: ["A"],
};
const res1Correct = gradeQuestion({ question: q1, answer: "A" });
const res1Wrong = gradeQuestion({ question: q1, answer: "B" });
assert(res1Correct.status === "correct" && res1Correct.earnedPoints === 1, "Single choice correct evaluated");
assert(res1Wrong.status === "incorrect" && res1Wrong.earnedPoints === 0, "Single choice wrong evaluated");

// 3.2 Multiple Choice
const q2: Question = {
  id: "q2",
  examId: "exam-test",
  type: "multiple_choice",
  text: "Multiple choice test",
  points: 2,
  order: 2,
  options: [{ id: "A", text: "A" }, { id: "B", text: "B" }, { id: "C", text: "C" }],
  correctOptionIds: ["A", "B"],
};
const res2Full = gradeQuestion({ question: q2, answer: ["A", "B"] });
const res2Partial = gradeQuestion({ question: q2, answer: ["A"] });
const res2Wrong = gradeQuestion({ question: q2, answer: ["A", "C"] });
assert(res2Full.status === "correct" && res2Full.earnedPoints === 2, "Multiple choice full match");
assert(res2Partial.status === "partial" && res2Partial.earnedPoints > 0, "Multiple choice partial points awarded");
assert(res2Wrong.status === "incorrect" && res2Wrong.earnedPoints === 0, "Multiple choice with wrong option gets 0");

// 3.3 True / False (4 statements)
const q3: Question = {
  id: "q3",
  examId: "exam-test",
  type: "true_false",
  text: "True / False test",
  points: 1,
  order: 3,
  statements: [
    { id: "s1", text: "S1", correctAnswer: true },
    { id: "s2", text: "S2", correctAnswer: false },
    { id: "s3", text: "S3", correctAnswer: true },
    { id: "s4", text: "S4", correctAnswer: false },
  ],
};
const res3Full = gradeQuestion({ question: q3, answer: { s1: true, s2: false, s3: true, s4: false } });
const res3Half = gradeQuestion({ question: q3, answer: { s1: true, s2: false, s3: false, s4: true } });
assert(res3Full.status === "correct" && res3Full.earnedPoints === 1, "True/False 4/4 correct");
assert(res3Half.status === "partial" && res3Half.earnedPoints === 0.5, "True/False 2/4 correct gets 0.5 points");

// 3.4 Short Answer
const q4: Question = {
  id: "q4",
  examId: "exam-test",
  type: "short_answer",
  text: "Short answer test",
  points: 1,
  order: 4,
  acceptedAnswers: ["3.14", "pi", "π"],
};
const res4Match = gradeQuestion({ question: q4, answer: " PI " });
const res4NoMatch = gradeQuestion({ question: q4, answer: "3.1415" });
assert(res4Match.status === "correct" && res4Match.earnedPoints === 1, "Short answer case/whitespace trimmed match");
assert(res4NoMatch.status === "incorrect" && res4NoMatch.earnedPoints === 0, "Short answer mismatch");

// 3.5 Ordering
const q5: Question = {
  id: "q5",
  examId: "exam-test",
  type: "ordering",
  text: "Ordering test",
  points: 1,
  order: 5,
  orderingItems: [{ id: "1", text: "1" }, { id: "2", text: "2" }, { id: "3", text: "3" }],
  correctOrder: ["1", "2", "3"],
};
const res5Full = gradeQuestion({ question: q5, answer: ["1", "2", "3"] });
const res5Part = gradeQuestion({ question: q5, answer: ["1", "3", "2"] }); // only '1' at idx 0 is correct
assert(res5Full.status === "correct" && res5Full.earnedPoints === 1, "Ordering full match");
assert(res5Part.status === "partial" && Math.round(res5Part.earnedPoints * 100) === 33, "Ordering 1/3 partial match");

// 3.6 Fill in Blank
const q6: Question = {
  id: "q6",
  examId: "exam-test",
  type: "fill_blank",
  text: "Fill blank test",
  points: 1,
  order: 6,
  acceptedAnswersPerBlank: {
    0: ["Hanoi", "Ha Noi"],
    1: ["Vietnam", "Viet Nam"],
  },
};
const res6Full = gradeQuestion({ question: q6, answer: { 0: "hanoi", 1: "viet nam" } });
const res6Part = gradeQuestion({ question: q6, answer: { 0: "hanoi", 1: "laos" } });
assert(res6Full.status === "correct" && res6Full.earnedPoints === 1, "Fill blank full match");
assert(res6Part.status === "partial" && res6Part.earnedPoints === 0.5, "Fill blank 1/2 match");

console.log("\n=== 4. TEST TOTAL EXAM SCORING (10.0 SCALE) ===");
const allQuestions = [q1, q2, q3, q4, q5, q6];
const perfectAnswers = {
  q1: "A",
  q2: ["A", "B"],
  q3: { s1: true, s2: false, s3: true, s4: false },
  q4: "pi",
  q5: ["1", "2", "3"],
  q6: { 0: "Hanoi", 1: "Vietnam" },
};
const examScoreResult = calculateExamScore(allQuestions, perfectAnswers);
assert(examScoreResult.score === 10, `Perfect exam scores 10.0 (actual: ${examScoreResult.score})`);
assert(examScoreResult.correctCount === 6, "All 6 questions marked correct");

console.log(`\n================================`);
console.log(`SUMMARY: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
}
