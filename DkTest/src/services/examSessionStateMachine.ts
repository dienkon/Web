/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ExamSessionStatus =
  | "idle"
  | "taking"
  | "paused"
  | "submitting"
  | "submitted"
  | "suspended"
  | "expired"
  | "error";

export interface ExamPauseEvent {
  id: string;
  action: "pause" | "resume";
  reason: string;
  actorId?: string;
  actorRole?: "admin" | "monitor" | "system" | "student";
  timestamp: number;
  pausedAt?: number;
  resumedAt?: number;
  pauseDurationMs?: number;
}

const VALID_TRANSITIONS: Record<ExamSessionStatus, ExamSessionStatus[]> = {
  idle: ["taking", "error"],
  taking: ["paused", "submitting", "suspended", "expired", "error"],
  paused: ["taking", "submitting", "suspended", "submitted", "error"],
  submitting: ["submitted", "error", "suspended"],
  error: ["submitting", "taking", "submitted", "suspended"],
  submitted: [], // Terminal
  suspended: ["submitted"], // May transition to force-submitted
  expired: ["submitting", "submitted"], // Auto-submits on expiration
};

/**
 * Validates whether a state transition is permitted by the state machine.
 */
export function canTransition(
  current: ExamSessionStatus,
  next: ExamSessionStatus
): boolean {
  if (current === next) return true;
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

/**
 * Asserts transition validity; throws error if invalid.
 */
export function assertTransition(
  current: ExamSessionStatus,
  next: ExamSessionStatus
): void {
  if (!canTransition(current, next)) {
    throw new Error(
      `Invalid exam session state transition from "${current}" to "${next}"`
    );
  }
}

/**
 * Authoritative elapsed time calculation accounting for accumulated pause duration.
 * Ensures clock is freeze-frame accurate across pause, submission, reconnect, and refresh.
 */
export function calculateEffectiveElapsedMs(params: {
  startTime: number;
  totalPausedDurationMs: number;
  isPaused: boolean;
  pauseStartedAt?: number | null;
  submittedAt?: number | null;
  currentTime?: number;
}): number {
  const {
    startTime,
    totalPausedDurationMs,
    isPaused,
    pauseStartedAt,
    submittedAt,
    currentTime = Date.now(),
  } = params;

  if (!startTime || typeof startTime !== "number" || isNaN(startTime) || startTime <= 0) {
    return 0;
  }

  let referenceTime = currentTime;

  if (submittedAt && submittedAt > 0) {
    referenceTime = submittedAt;
  } else if (isPaused && pauseStartedAt && pauseStartedAt > 0) {
    referenceTime = pauseStartedAt;
  }

  const rawElapsed = referenceTime - startTime;
  const effectiveElapsed = rawElapsed - Math.max(0, totalPausedDurationMs || 0);

  return Math.max(0, isNaN(effectiveElapsed) ? 0 : effectiveElapsed);
}

/**
 * Authoritative remaining seconds calculation.
 */
export function calculateRemainingSeconds(params: {
  startTime: number;
  durationMinutes: number;
  totalPausedDurationMs: number;
  isPaused: boolean;
  pauseStartedAt?: number | null;
  submittedAt?: number | null;
  currentTime?: number;
}): number {
  const { durationMinutes } = params;
  const totalLimitMs = Math.max(1, durationMinutes) * 60 * 1000;
  const elapsedMs = calculateEffectiveElapsedMs(params);
  const remainingMs = totalLimitMs - elapsedMs;

  return Math.max(0, Math.floor(remainingMs / 1000));
}

/**
 * Calculates new total accumulated pause duration when resuming.
 */
export function calculateAccumulatedPauseOnResume(
  currentTotalMs: number,
  pauseStartedAt: number,
  resumedAt: number = Date.now()
): number {
  if (pauseStartedAt <= 0 || resumedAt <= pauseStartedAt) {
    return currentTotalMs;
  }
  const delta = resumedAt - pauseStartedAt;
  return currentTotalMs + delta;
}
