// src/features/gameplay/scoring.ts
// Thuật toán chấm điểm chuẩn hóa, công bằng và chống phụ thuộc vào số màn chơi

import { SCORING_RULES, DIFFICULTY_MULTIPLIERS } from '../../config/gameConfig';

export interface ScoreCalculationInput {
  isCorrect: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | string;
  totalTimeSec: number;
  timeRemainingSec: number;
  isFirstSolver?: boolean;
  streak: number;
  isPartialRatio?: boolean; // Cân bằng tỉ lệ đúng nhưng chưa tối giản
  powerUpUsed?: boolean;
  powerUpPenalty?: number;
  totalRounds?: number;
}

export interface ScoreCalculationResult {
  points: number;           // Điểm số nhận được (làm tròn 1 chữ số thập phân)
  rawPoints: number;        // Điểm số trước khi làm tròn
  baseMultiplier: number;   // Hệ số độ khó (1.0 / 1.5 / 2.0)
  speedMultiplier: number;  // Hệ số tốc độ liên tục (0.70 - 1.00)
  streakMultiplier: number; // Hệ số thưởng chuỗi đúng (1.00 - 1.30)
  firstSolverBonus: number; // Điểm thưởng nộp đầu tiên
  breakdown: string;        // Diễn giải điểm chi tiết
}

/**
 * Tính hệ số tốc độ liên tục (0.70 - 1.00)
 */
export function calculateSpeedRatio(timeRemainingSec: number, totalTimeSec: number): number {
  const safeTotalTime = Math.max(1, totalTimeSec);
  const safeTimeRemaining = Math.max(0, Math.min(safeTotalTime, timeRemainingSec));
  const timeRatio = safeTimeRemaining / safeTotalTime;
  return SCORING_RULES.SPEED_FLOOR_RATIO + SCORING_RULES.SPEED_SLOPE_RATIO * timeRatio;
}

/**
 * Tính hệ số thưởng chuỗi đúng (1.00 - 1.30)
 */
export function calculateStreakMultiplier(streak: number): number {
  let streakBonusPercent = 0;
  if (streak >= SCORING_RULES.MIN_STREAK_FOR_BONUS) {
    const extraStreak = streak - SCORING_RULES.MIN_STREAK_FOR_BONUS + 1;
    streakBonusPercent = Math.min(SCORING_RULES.STREAK_BONUS_MAX, extraStreak * SCORING_RULES.STREAK_BONUS_STEP);
  }
  return Math.round((1.0 + streakBonusPercent) * 100) / 100;
}

/**
 * Tính điểm công bằng cho từng câu hỏi dựa trên:
 * 1. Độ khó (Easy x1.0, Medium x1.5, Hard x2.0)
 * 2. Tốc độ nộp bài: 0.7 + 0.3 * (thời gian còn / tổng thời gian) — mọi người nộp nhanh đều hưởng lợi
 * 3. Thưởng người đầu tiên: +0.2 điểm cơ sở
 * 4. Thưởng chuỗi (Streak >= 3): +10% mỗi bậc, tối đa +30%
 * 5. Chuẩn hóa theo số vòng để tổng điểm 1 trận luôn ổn định ~100 điểm
 */
export function calculateFairScore(input: ScoreCalculationInput): ScoreCalculationResult {
  if (!input.isCorrect) {
    return {
      points: 0,
      rawPoints: 0,
      baseMultiplier: 0,
      speedMultiplier: 0,
      streakMultiplier: 1.0,
      firstSolverBonus: 0,
      breakdown: 'Trả lời sai hoặc hết thời gian (+0 điểm)',
    };
  }

  const diffKey = (input.difficulty in DIFFICULTY_MULTIPLIERS) ? input.difficulty : 'medium';
  const baseDiff = DIFFICULTY_MULTIPLIERS[diffKey];

  // Tính hệ số tốc độ liên tục (đảm bảo không bị âm và không vượt quá 1.0)
  const speedMult = calculateSpeedRatio(input.timeRemainingSec, input.totalTimeSec);

  // Tính hệ số chuỗi liên tiếp
  const streakMult = calculateStreakMultiplier(input.streak);
  const streakBonusPercent = streakMult - 1.0;

  // Điểm cơ bản cho câu này
  let roundBase = baseDiff * speedMult * streakMult;

  // Thưởng người trả lời đúng đầu tiên
  let firstBonus = 0;
  if (input.isFirstSolver) {
    firstBonus = baseDiff * SCORING_RULES.FIRST_SOLVER_BONUS;
    roundBase += firstBonus;
  }

  // Nếu cân bằng hệ số tỉ lệ chưa tối giản
  if (input.isPartialRatio) {
    roundBase *= SCORING_RULES.PARTIAL_RATIO_FACTOR;
  }

  // Khấu trừ nếu dùng trợ giúp (power-up)
  if (input.powerUpUsed && input.powerUpPenalty) {
    roundBase *= (1 - Math.max(0, Math.min(0.9, input.powerUpPenalty)));
  }

  // Chuẩn hóa theo số vòng của trận đấu:
  // Nếu trận có N vòng (mặc định 10), mỗi vòng trung bình có giá trị 10 điểm (100 / N)
  const rounds = Math.max(1, input.totalRounds || 10);
  const normalizedPerRoundWeight = SCORING_RULES.MAX_MATCH_POINTS / (rounds * 1.5); // 1.5 là hệ số trung bình
  const finalRaw = roundBase * normalizedPerRoundWeight;
  const roundedPoints = Math.round(finalRaw * 10) / 10;

  // Xây dựng diễn giải điểm
  const breakdownParts = [
    `Độ khó: x${baseDiff}`,
    `Tốc độ: +${Math.round(speedMult * 100)}%`,
  ];
  if (streakBonusPercent > 0) {
    breakdownParts.push(`Chuỗi đúng ${input.streak}: +${Math.round(streakBonusPercent * 100)}%`);
  }
  if (input.isFirstSolver) {
    breakdownParts.push(`Nhanh nhất phòng: +${Math.round(firstBonus * normalizedPerRoundWeight * 10) / 10}đ`);
  }
  if (input.isPartialRatio) {
    breakdownParts.push(`Hệ số chưa tối giản: -50%`);
  }

  return {
    points: roundedPoints,
    rawPoints: finalRaw,
    baseMultiplier: baseDiff,
    speedMultiplier: speedMult,
    streakMultiplier: streakMult,
    firstSolverBonus: firstBonus,
    breakdown: breakdownParts.join(' | '),
  };
}

/**
 * Xử lý nộp câu trả lời vòng đấu và ghi nhận điểm số
 */
export interface SubmitResultContext {
  uid: string;
  roomId: string;
  round: number;
  userAnswer: any;
  isCorrect: boolean;
  timeRemainingSec: number;
  totalTimeSec: number;
  currentScore: number;
  currentStreak: number;
  alreadySubmittedCount: number;
  difficulty: string;
  totalRounds: number;
  isPartialRatio?: boolean;
  powerUpUsed?: boolean;
}

export function evaluateRoundSubmission(ctx: SubmitResultContext) {
  const isFirstSolver = ctx.isCorrect && ctx.alreadySubmittedCount === 0;
  const nextStreak = ctx.isCorrect ? ctx.currentStreak + 1 : 0;

  const scoreResult = calculateFairScore({
    isCorrect: ctx.isCorrect,
    difficulty: ctx.difficulty,
    totalTimeSec: ctx.totalTimeSec,
    timeRemainingSec: ctx.timeRemainingSec,
    isFirstSolver,
    streak: nextStreak,
    isPartialRatio: ctx.isPartialRatio,
    powerUpUsed: ctx.powerUpUsed,
    totalRounds: ctx.totalRounds,
  });

  return {
    pointsEarned: scoreResult.points,
    newTotalScore: Math.round((ctx.currentScore + scoreResult.points) * 10) / 10,
    newStreak: nextStreak,
    isFirstSolver,
    scoreResult,
  };
}

/**
 * Ghi nhận nộp bài vòng đấu lên Firestore và tự động lưu sổ tay nếu trả lời sai
 */
export async function submitPlayerAnswer(
  roomId: string,
  uid: string,
  currentRoom: any,
  rawAnswer: any,
  isCorrect: boolean,
  isPartialRatio?: boolean
) {
  const round = currentRoom.currentRound;
  const currentScore = currentRoom.players?.[uid]?.score || 0;
  const currentStreak = currentRoom.players?.[uid]?.streak || 0;
  const playersList = Object.values(currentRoom.players || {});
  const alreadySubmittedCount = playersList.filter((p: any) => p.submittedRound === round).length;

  const q = currentRoom.questions?.[round - 1];
  const qTime = q?.timeLimitSec;
  const isUnlimited = qTime === 0;
  const totalTimeSec = isUnlimited ? 45 : (qTime || 45);
  const remainingMs = isUnlimited ? 45000 : Math.max(0, (currentRoom.roundEndTime || Date.now()) - Date.now());
  const timeRemainingSec = Math.round(remainingMs / 1000);

  const evalResult = evaluateRoundSubmission({
    uid,
    roomId,
    round,
    userAnswer: rawAnswer,
    isCorrect,
    timeRemainingSec,
    totalTimeSec,
    currentScore,
    currentStreak,
    alreadySubmittedCount,
    difficulty: q?.difficulty || currentRoom.difficulty,
    totalRounds: currentRoom.totalRounds,
    isPartialRatio,
  });

  return evalResult;
}
