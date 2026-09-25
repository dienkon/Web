/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { QuestionTiming } from "../types";
import {
  ExamSessionStatus,
  ExamPauseEvent,
  calculateEffectiveElapsedMs,
  calculateRemainingSeconds,
  calculateAccumulatedPauseOnResume,
  canTransition,
} from "./examSessionStateMachine";

export interface ActiveExamSession {
  examId: string;
  attemptId: string;
  submissionId?: string;
  examTitle?: string;
  examCode?: string;
  studentUsername: string;
  studentName: string;
  startTime: number; // timestamp ms
  durationMinutes: number; // in minutes
  endTime: number; // logical end timestamp
  answers: Record<string, any>;
  flagged: Record<string, boolean>;
  activeQuestionIdx: number;
  warnings: number;
  updatedAt: number;
  status: ExamSessionStatus | "in-progress"; // support legacy "in-progress" mapping to "taking"
  
  // Authoritative Pause & Resume Model
  totalPausedDurationMs: number;
  isPaused: boolean;
  pauseStartedAt?: number | null;
  pauseHistory?: ExamPauseEvent[];
  
  // Submission Lifecycle
  submittedAt?: number | null;
  submissionError?: string | null;

  questionTiming?: Record<string, QuestionTiming>;
}

const GLOBAL_ACTIVE_SESSION_KEY = "dktest:session:active";
const LEGACY_GLOBAL_KEY = "active_exam_session";

function getStudentIdentifier(): string {
  try {
    const currentSessionStr = localStorage.getItem("current_student_session");
    if (currentSessionStr) {
      const parsed = JSON.parse(currentSessionStr);
      if (parsed.username || parsed.code) return parsed.username || parsed.code;
    }
    const studentInfoStr =
      localStorage.getItem("dktest:auth:student_info") ||
      localStorage.getItem("student_info");
    if (studentInfoStr) {
      const parsed = JSON.parse(studentInfoStr);
      return parsed.username || parsed.displayName || "student";
    }
  } catch (e) {}
  return "student";
}

/**
 * Normalizes legacy session status strings to the standard ExamSessionStatus.
 */
export function normalizeSessionStatus(
  rawStatus: any
): ExamSessionStatus {
  if (!rawStatus) return "idle";
  if (rawStatus === "in-progress") return "taking";
  if (
    [
      "idle",
      "taking",
      "paused",
      "submitting",
      "submitted",
      "suspended",
      "expired",
      "error",
    ].includes(rawStatus)
  ) {
    return rawStatus as ExamSessionStatus;
  }
  return "taking";
}

/**
 * Saves or updates an active exam session with complete state machine attributes.
 */
export function saveActiveExamSession(data: {
  examId: string;
  attemptId?: string;
  submissionId?: string;
  examTitle?: string;
  examCode?: string;
  studentUsername?: string;
  studentName?: string;
  startTime: number;
  durationMinutes: number;
  answers: Record<string, any>;
  flagged?: Record<string, boolean>;
  activeQuestionIdx?: number;
  warnings?: number;
  questionTiming?: Record<string, QuestionTiming>;
  status?: ExamSessionStatus | "in-progress";
  totalPausedDurationMs?: number;
  isPaused?: boolean;
  pauseStartedAt?: number | null;
  pauseHistory?: ExamPauseEvent[];
}): ActiveExamSession {
  const studentUsername = data.studentUsername || getStudentIdentifier();
  const studentName = data.studentName || "Thí sinh";
  const attemptId =
    data.attemptId ||
    `att_${data.examId}_${studentUsername}_${data.startTime}`;
  const status = normalizeSessionStatus(data.status || "taking");
  const totalPausedDurationMs = data.totalPausedDurationMs || 0;
  const isPaused = data.isPaused || status === "paused";
  const pauseStartedAt = data.pauseStartedAt || (isPaused ? Date.now() : null);

  const totalLimitMs = Math.max(1, data.durationMinutes) * 60 * 1000;
  const endTime = data.startTime + totalLimitMs + totalPausedDurationMs;

  const session: ActiveExamSession = {
    examId: data.examId,
    attemptId,
    submissionId: data.submissionId || `sub_${attemptId}`,
    examTitle: data.examTitle || "Bài kiểm tra",
    examCode: data.examCode || "",
    studentUsername,
    studentName,
    startTime: data.startTime,
    durationMinutes: data.durationMinutes,
    endTime,
    answers: data.answers || {},
    flagged: data.flagged || {},
    activeQuestionIdx: data.activeQuestionIdx || 0,
    warnings: data.warnings || 0,
    updatedAt: Date.now(),
    status,
    totalPausedDurationMs,
    isPaused,
    pauseStartedAt,
    pauseHistory: data.pauseHistory || [],
    questionTiming: data.questionTiming || {},
  };

  try {
    const serialized = JSON.stringify(session);
    localStorage.setItem(GLOBAL_ACTIVE_SESSION_KEY, serialized);
    localStorage.setItem(LEGACY_GLOBAL_KEY, serialized);
    localStorage.setItem(`dktest:session:${data.examId}:${studentUsername}`, serialized);
    localStorage.setItem(`active_exam_${data.examId}_${studentUsername}`, serialized);
    localStorage.setItem(
      `exam_startTime_${data.examId}_${studentUsername}`,
      data.startTime.toString()
    );
  } catch (e) {
    console.warn("Could not persist active exam session:", e);
  }

  return session;
}

/**
 * Updates answers and metrics on the active session.
 */
export function updateActiveExamSessionAnswers(
  examId: string,
  answers: Record<string, any>,
  extra?: {
    flagged?: Record<string, boolean>;
    activeQuestionIdx?: number;
    warnings?: number;
    questionTiming?: Record<string, QuestionTiming>;
  }
) {
  try {
    const current = getActiveExamSession(examId);
    if (current && (current.status === "taking" || current.status === "in-progress")) {
      current.answers = answers;
      if (extra?.flagged !== undefined) current.flagged = extra.flagged;
      if (extra?.activeQuestionIdx !== undefined) current.activeQuestionIdx = extra.activeQuestionIdx;
      if (extra?.warnings !== undefined) current.warnings = extra.warnings;
      if (extra?.questionTiming !== undefined) current.questionTiming = extra.questionTiming;
      current.updatedAt = Date.now();

      const serialized = JSON.stringify(current);
      localStorage.setItem(GLOBAL_ACTIVE_SESSION_KEY, serialized);
      localStorage.setItem(LEGACY_GLOBAL_KEY, serialized);
      localStorage.setItem(`dktest:session:${examId}:${current.studentUsername}`, serialized);
      localStorage.setItem(`active_exam_${examId}_${current.studentUsername}`, serialized);
    }
  } catch (e) {
    console.warn("Error updating active exam session answers:", e);
  }
}

/**
 * Updates session status and pause state deterministically.
 */
export function updateActiveExamSessionStatus(
  examId: string,
  newStatus: ExamSessionStatus,
  extra?: {
    pauseReason?: string;
    actorId?: string;
    actorRole?: "admin" | "monitor" | "system" | "student";
    submissionId?: string;
    submissionError?: string | null;
  }
): ActiveExamSession | null {
  try {
    const current = getActiveExamSession(examId);
    if (!current) return null;

    const currentNormalized = normalizeSessionStatus(current.status);
    if (!canTransition(currentNormalized, newStatus)) {
      console.warn(
        `[SessionStateMachine] Disallowed transition from ${currentNormalized} to ${newStatus}`
      );
      return current;
    }

    const now = Date.now();

    if (newStatus === "paused" && !current.isPaused) {
      current.isPaused = true;
      current.pauseStartedAt = now;
      const pauseEvent: ExamPauseEvent = {
        id: `pause_${now}`,
        action: "pause",
        reason: extra?.pauseReason || "Tạm dừng theo yêu cầu giám thị",
        actorId: extra?.actorId,
        actorRole: extra?.actorRole || "admin",
        timestamp: now,
        pausedAt: now,
      };
      current.pauseHistory = [...(current.pauseHistory || []), pauseEvent];
    } else if (newStatus === "taking" && current.isPaused) {
      const pauseStartedAt = current.pauseStartedAt || now;
      current.totalPausedDurationMs = calculateAccumulatedPauseOnResume(
        current.totalPausedDurationMs || 0,
        pauseStartedAt,
        now
      );
      current.isPaused = false;
      current.pauseStartedAt = null;

      // Update latest pause history event with resume timestamp
      const history = [...(current.pauseHistory || [])];
      const lastPause = history[history.length - 1];
      if (lastPause && lastPause.action === "pause" && !lastPause.resumedAt) {
        lastPause.resumedAt = now;
        lastPause.pauseDurationMs = now - (lastPause.pausedAt || now);
      }
      current.pauseHistory = history;

      // Extend logical endTime by pause duration
      const totalLimitMs = Math.max(1, current.durationMinutes) * 60 * 1000;
      current.endTime = current.startTime + totalLimitMs + current.totalPausedDurationMs;
    } else if (newStatus === "submitting" || newStatus === "submitted") {
      if (!current.submittedAt) {
        current.submittedAt = now;
      }
      if (extra?.submissionId) {
        current.submissionId = extra.submissionId;
      }
    }

    if (extra?.submissionError !== undefined) {
      current.submissionError = extra.submissionError;
    }

    current.status = newStatus;
    current.updatedAt = now;

    const serialized = JSON.stringify(current);
    localStorage.setItem(GLOBAL_ACTIVE_SESSION_KEY, serialized);
    localStorage.setItem(LEGACY_GLOBAL_KEY, serialized);
    localStorage.setItem(`dktest:session:${examId}:${current.studentUsername}`, serialized);
    localStorage.setItem(`active_exam_${examId}_${current.studentUsername}`, serialized);

    return current;
  } catch (e) {
    console.warn("Error updating active exam session status:", e);
    return null;
  }
}

/**
 * Retrieves the current active session, verifying expiration and pause calculations.
 */
export function getActiveExamSession(examId?: string): ActiveExamSession | null {
  try {
    const studentUsername = getStudentIdentifier();
    let sessionStr =
      localStorage.getItem(GLOBAL_ACTIVE_SESSION_KEY) ||
      localStorage.getItem(LEGACY_GLOBAL_KEY);

    if (examId) {
      const specificKey = `dktest:session:${examId}:${studentUsername}`;
      const legacySpecificKey = `active_exam_${examId}_${studentUsername}`;
      const specificStr = localStorage.getItem(specificKey) || localStorage.getItem(legacySpecificKey);
      if (specificStr) {
        sessionStr = specificStr;
      }
    }

    if (!sessionStr) return null;

    const session: ActiveExamSession = JSON.parse(sessionStr);
    if (!session || !session.examId) {
      return null;
    }

    if (examId && session.examId !== examId) {
      const specificKey = `dktest:session:${examId}:${studentUsername}`;
      const legacySpecificKey = `active_exam_${examId}_${studentUsername}`;
      const fallbackStr = localStorage.getItem(specificKey) || localStorage.getItem(legacySpecificKey);
      if (fallbackStr) {
        const fallbackSession = JSON.parse(fallbackStr);
        if (fallbackSession) {
          fallbackSession.startTime = (typeof fallbackSession.startTime === "number" && !isNaN(fallbackSession.startTime) && fallbackSession.startTime > 0)
            ? fallbackSession.startTime
            : Date.now();
          fallbackSession.durationMinutes = fallbackSession.durationMinutes || 45;
          fallbackSession.status = normalizeSessionStatus(fallbackSession.status);
          return fallbackSession;
        }
      }
      return null;
    }

    session.startTime = (typeof session.startTime === "number" && !isNaN(session.startTime) && session.startTime > 0)
      ? session.startTime
      : Date.now();
    session.durationMinutes = session.durationMinutes || 45;

    const normalizedStatus = normalizeSessionStatus(session.status);

    // If session is already finalized, return it with its terminal status
    if (["submitted", "suspended"].includes(normalizedStatus)) {
      session.status = normalizedStatus;
      return session;
    }

    // Check authoritative remaining time
    const remainingSeconds = calculateRemainingSeconds({
      startTime: session.startTime,
      durationMinutes: session.durationMinutes,
      totalPausedDurationMs: session.totalPausedDurationMs || 0,
      isPaused: !!session.isPaused,
      pauseStartedAt: session.pauseStartedAt,
      submittedAt: session.submittedAt,
    });

    if (remainingSeconds <= 0 && normalizedStatus === "taking") {
      session.status = "expired";
      localStorage.setItem(GLOBAL_ACTIVE_SESSION_KEY, JSON.stringify(session));
      return session;
    }

    session.status = normalizedStatus;
    return session;
  } catch (e) {
    console.warn("Error reading active exam session:", e);
    return null;
  }
}

export function hasActiveExamInProgress(examId?: string): ActiveExamSession | null {
  const session = getActiveExamSession(examId);
  if (!session) return null;

  session.startTime = (typeof session.startTime === "number" && !isNaN(session.startTime) && session.startTime > 0)
    ? session.startTime
    : Date.now();
  session.durationMinutes = session.durationMinutes || 45;

  const normalizedStatus = normalizeSessionStatus(session.status);
  // Terminal statuses are definitely not in progress
  if (["submitted", "suspended", "expired"].includes(normalizedStatus)) {
    return null;
  }

  if (normalizedStatus === "taking" || normalizedStatus === "paused") {
    const remaining = calculateRemainingSeconds({
      startTime: session.startTime,
      durationMinutes: session.durationMinutes,
      totalPausedDurationMs: session.totalPausedDurationMs || 0,
      isPaused: !!session.isPaused,
      pauseStartedAt: session.pauseStartedAt,
    });
    if (remaining > 0 || session.isPaused) {
      return session;
    }
  }

  return null;
}

/**
 * Clears active session cache, snapshots, temporary answers, and metrics for an exam.
 */
export function clearActiveExamSession(examId?: string, username?: string) {
  try {
    const studentUsername = username || getStudentIdentifier();
    localStorage.removeItem(GLOBAL_ACTIVE_SESSION_KEY);
    localStorage.removeItem(LEGACY_GLOBAL_KEY);
    if (examId) {
      localStorage.removeItem(`dktest:session:${examId}:${studentUsername}`);
      localStorage.removeItem(`active_exam_${examId}_${studentUsername}`);
      localStorage.removeItem(`exam_startTime_${examId}_${studentUsername}`);
      localStorage.removeItem(`attemptSnapshot_${examId}_${studentUsername}`);
      localStorage.removeItem(`dktest_temp_answers_${examId}_${studentUsername}`);
      localStorage.removeItem(`dktest_temp_answers_${examId}`);
      localStorage.removeItem(`custom_sub_exam_config_${examId}`);

      // Thoroughly scan and remove any lingering keys related to this examId
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.startsWith(`attemptSnapshot_${examId}`) ||
              key.startsWith(`dktest_temp_answers_${examId}`) ||
              key.startsWith(`exam_startTime_${examId}`) ||
              key.startsWith(`active_exam_${examId}`) ||
              key.startsWith(`dktest:session:${examId}`))
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (scanErr) {
        // Safe fallback for restricted storage environments
      }
    }
  } catch (e) {
    console.warn("Error clearing active exam session:", e);
  }
}
