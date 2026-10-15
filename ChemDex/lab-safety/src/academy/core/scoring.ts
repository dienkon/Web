import { Difficulty, GameResult, Medal, RoundOutcome } from './types';

export const MEDAL_ORDER: Record<Medal, number> = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

export const DIFFICULTY = {
  explore: {
    label: 'Khám phá',
    description: 'Có gợi ý, không áp lực thời gian. Tập trung hiểu thao tác.',
    multiplier: 1,
    timerMultiplier: 2,
    toleranceMultiplier: 1.8,
    hintPenalty: 0,
    mistakePenalty: 5,
    icon: '🌱',
  },
  practice: {
    label: 'Luyện tập',
    description: 'Thứ tự ngẫu nhiên và tiêu chí chính xác hơn.',
    multiplier: 1.3,
    timerMultiplier: 1.3,
    toleranceMultiplier: 1,
    hintPenalty: 3,
    mistakePenalty: 7,
    icon: '🧪',
  },
  challenge: {
    label: 'Thử thách',
    description: 'Đòi hỏi thao tác chính xác; thời gian chỉ dùng để thử sức.',
    multiplier: 1.6,
    timerMultiplier: 1,
    toleranceMultiplier: 0.65,
    hintPenalty: 5,
    mistakePenalty: 9,
    icon: '⚡',
  },
} as const;

export function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateScore(outcome: RoundOutcome, difficulty: Difficulty): number {
  if (!outcome.completed) return 0;
  const config = DIFFICULTY[difficulty];
  return Math.round(clamp(
    100 - outcome.mistakes * config.mistakePenalty - outcome.hints * config.hintPenalty,
    10,
    100,
  ));
}

export function calculateAccuracy(correct: number, mistakes: number): number {
  const total = Math.max(0, correct) + Math.max(0, mistakes);
  return total === 0 ? 0 : Math.round(correct / total * 100);
}

export function medalForScore(score: number, completed: boolean): Medal {
  if (!completed) return 'none';
  if (score >= 90) return 'gold';
  if (score >= 70) return 'silver';
  return 'bronze';
}

export function experienceForResult(score: number, difficulty: Difficulty, firstCompletion: boolean): number {
  const base = Math.round((20 + score * 0.6) * DIFFICULTY[difficulty].multiplier);
  return firstCompletion ? base + 40 : Math.round(base * 0.35);
}

export function levelForXP(xp: number) {
  const safeXP = Math.max(0, xp);
  const level = Math.floor(Math.sqrt(safeXP / 100)) + 1;
  const minimum = Math.pow(level - 1, 2) * 100;
  const maximum = Math.pow(level, 2) * 100;
  return {
    level,
    minimum,
    maximum,
    remaining: maximum - safeXP,
    progress: (safeXP - minimum) / (maximum - minimum),
    title: level < 3 ? 'Người khám phá' : level < 6 ? 'Bạn thực hành' : level < 10 ? 'Người quan sát giỏi' : 'Đại sứ an toàn',
  };
}

export function formatDuration(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(value / 60);
  return `${String(minutes).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

export function formatScore(result: Pick<GameResult, 'score' | 'medal'>): string {
  const names: Record<Medal, string> = {
    none: 'Đang học',
    bronze: 'Huy chương đồng',
    silver: 'Huy chương bạc',
    gold: 'Huy chương vàng',
  };
  return `${result.score}/100 · ${names[result.medal]}`;
}

export function localStudyDay(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (name: string) => parts.find(value => value.type === name)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function dayDifference(before: string, after: string): number {
  return Math.round((Date.parse(`${after}T00:00:00Z`) - Date.parse(`${before}T00:00:00Z`)) / 86400000);
}
