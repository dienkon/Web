import { ReviewCard, SafetyCase } from './types';

export function scheduleReview(previous: ReviewCard | undefined, caseId: string, correct: boolean, now = new Date()): ReviewCard {
  const oldEase = previous?.ease ?? 2.3;
  const repetitions = correct ? (previous?.repetitions ?? 0) + 1 : 0;
  const intervalDays = !correct
    ? 0
    : repetitions === 1
      ? 1
      : repetitions === 2
        ? 3
        : Math.min(60, Math.round((previous?.intervalDays ?? 3) * oldEase));
  const dueAt = new Date(now.getTime() + (correct ? intervalDays * 86400000 : 10 * 60000));
  return {
    caseId,
    dueAt: dueAt.toISOString(),
    intervalDays,
    repetitions,
    ease: Math.max(1.3, Math.min(3, oldEase + (correct ? 0.05 : -0.2))),
    mistakes: (previous?.mistakes ?? 0) + (correct ? 0 : 1),
    lastAnswerCorrect: correct,
  };
}

export function dueReviews(cards: Record<string, ReviewCard>, now = Date.now()): ReviewCard[] {
  return Object.values(cards)
    .filter(card => Date.parse(card.dueAt) <= now)
    .sort((left, right) => {
      if (left.lastAnswerCorrect !== right.lastAnswerCorrect) return left.lastAnswerCorrect ? 1 : -1;
      return Date.parse(left.dueAt) - Date.parse(right.dueAt);
    });
}

export function chooseReviewCases(cases: SafetyCase[], cards: Record<string, ReviewCard>, count: number): SafetyCase[] {
  const due = new Set(dueReviews(cards).map(card => card.caseId));
  const ranked = [...cases].sort((left, right) => {
    const priority = (id: string) => due.has(id) ? 0 : !cards[id] ? 1 : 2;
    return priority(left.id) - priority(right.id) || left.difficulty - right.difficulty;
  });
  return ranked.slice(0, Math.max(0, count));
}
