/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ref,
  set,
  update,
  onValue,
  remove,
  onDisconnect,
  off,
  get,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import { rtdb } from "./firebase/config";
import type { ExamSessionStatus, ExamPauseEvent } from "./examSessionStateMachine";

export type ConnectionState = "ONLINE" | "DEGRADED" | "STALE" | "OFFLINE";

export interface ActiveSession {
  sessionId: string;
  attemptId?: string;
  submissionId?: string | null;
  examId: string;
  examTitle: string;
  studentName: string;
  studentUsername?: string;
  studentId?: string;
  studentClass?: string;
  timeLeft: number;
  timeUsed?: number;
  answeredCount: number;
  totalQuestions: number;
  warnings: number;
  status: ExamSessionStatus | "warning"; // backwards-compatible with "warning"
  presence?: "online" | "offline";
  connectionState?: ConnectionState;
  lastActiveAt: string | number;
  lastHeartbeat?: string;
  lastDisconnectedAt?: number | null;
  submittedAt?: string | number | null;
  score?: number;
  maxScore?: number;
  answers?: Record<string, any>;
  activeQuestionIdx?: number;
  scratchpadImage?: string | null;

  // Realtime Admin Control & Pause/Resume/Suspend audit
  adminAction?: "pause" | "suspend" | "resume" | "force_submit" | null;
  adminMessage?: string | null;
  adminDirectMessage?: { id: string; text: string; sentAt: number; sender?: string } | null;
  adminActionReason?: string | null;
  adminActionActorId?: string | null;
  adminActionActorRole?: string | null;
  adminActionTimestamp?: number | null;

  // Authoritative Pause Tracking
  startTime?: number;
  durationMinutes?: number;
  isPaused?: boolean;
  pauseStartedAt?: number | null;
  totalPausedDurationMs?: number;
  pauseHistory?: ExamPauseEvent[];

  shuffledQuestions?: any[];
  questionOrder?: string[];

  // Real Screen Share Feature (WebRTC / Live Snapshot Signaling)
  screenShareRequest?: "requested" | "accepted" | "rejected" | "stopped" | null;
  screenShareRequestedAt?: number | null;
  screenShareFrame?: string | null; // high-fidelity live screen capture frame base64
  screenShareFps?: number;
  screenShareActive?: boolean;
}

/**
 * Calculates connection state based on last heartbeat timestamp.
 * - ONLINE: Heartbeat within last 15 seconds.
 * - DEGRADED: Heartbeat between 15s and 45s ago.
 * - STALE: Heartbeat between 45s and 90s ago.
 * - OFFLINE: More than 90s without heartbeat.
 */
export function evaluateConnectionState(
  lastActiveAt?: string | number,
  lastHeartbeat?: string,
  presence?: "online" | "offline"
): ConnectionState {
  if (presence === "offline") return "OFFLINE";

  const now = Date.now();
  let ts = 0;
  if (typeof lastActiveAt === "number" && !isNaN(lastActiveAt)) {
    ts = lastActiveAt;
  } else if (lastHeartbeat) {
    ts = new Date(lastHeartbeat).getTime();
  }

  if (ts <= 0) return "OFFLINE";

  const diffMs = now - ts;
  if (diffMs < 15000) return "ONLINE";
  if (diffMs < 45000) return "DEGRADED";
  if (diffMs < 90000) return "STALE";
  return "OFFLINE";
}

/**
 * Recursively removes undefined values from objects and arrays so RTDB never rejects the payload.
 */
export function deepSanitizeRtdb<T>(val: T): T {
  if (val === undefined) return null as any;
  if (val === null || typeof val !== "object") return val;
  if (Array.isArray(val)) {
    return val.map((item) => deepSanitizeRtdb(item)) as any;
  }
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (v !== undefined) {
      // RTDB forbidden key characters: . $ # [ ] /
      const safeKey = k.replace(/[.#$\[\]\/]/g, "_");
      clean[safeKey] = deepSanitizeRtdb(v);
    }
  }
  return clean as T;
}

/**
 * Sanitizes session ID to ensure it is 100% valid in RTDB paths.
 */
export function sanitizeSessionId(id: string): string {
  if (!id) return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return id.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

/**
 * Register and sync student taking exam session exclusively in Realtime Database.
 * TUYỆT ĐỐI KHÔNG GHI VÀO FIRESTORE TRONG QUÁ TRÌNH LIVE.
 */
export async function syncRealtimeSession(session: ActiveSession) {
  const cleanSessionId = sanitizeSessionId(session.sessionId);
  if (!cleanSessionId || !rtdb) return;

  const now = Date.now();
  const sessionData: Partial<ActiveSession> = {
    sessionId: cleanSessionId,
    attemptId: session.attemptId || cleanSessionId,
    submissionId: session.submissionId || null,
    examId: session.examId || "",
    examTitle: session.examTitle || "Bài thi",
    studentName: session.studentName || session.studentUsername || "Thí sinh",
    studentUsername: session.studentUsername || session.studentName || "student",
    studentId: session.studentId || session.studentUsername || session.studentName || "student",
    studentClass: session.studentClass || "Học sinh",
    startTime: session.startTime || now,
    durationMinutes: session.durationMinutes || 45,
    timeLeft: session.timeLeft ?? 0,
    timeUsed: session.timeUsed ?? 0,
    answeredCount: session.answeredCount ?? 0,
    totalQuestions: session.totalQuestions ?? 0,
    warnings: session.warnings ?? 0,
    status: (session.warnings > 0 ? "warning" : session.status) || "taking",
    presence: "online",
    lastActiveAt: now,
    lastHeartbeat: new Date(now).toISOString(),
    answers: session.answers || {},
    activeQuestionIdx: session.activeQuestionIdx ?? 0,
    scratchpadImage: session.scratchpadImage || null,
    questionOrder: session.questionOrder || [],
    shuffledQuestions: session.shuffledQuestions || [],
  };

  if (session.adminAction !== undefined) sessionData.adminAction = session.adminAction;
  if (session.adminMessage !== undefined) sessionData.adminMessage = session.adminMessage;
  if (session.adminDirectMessage !== undefined) sessionData.adminDirectMessage = session.adminDirectMessage;
  if (session.screenShareRequest !== undefined) sessionData.screenShareRequest = session.screenShareRequest;
  if (session.screenShareActive !== undefined) sessionData.screenShareActive = session.screenShareActive;
  if (session.screenShareFrame !== undefined) sessionData.screenShareFrame = session.screenShareFrame;

  const cleanData = deepSanitizeRtdb(sessionData);

  try {
    const sessionRef = ref(rtdb, `active_sessions/${cleanSessionId}`);
    await update(sessionRef, cleanData);
    onDisconnect(sessionRef)
      .update({ presence: "offline", lastActiveAt: Date.now() })
      .catch(() => {});
  } catch (err) {
    console.warn("[RTDB Live] Session sync error:", err);
  }
}

/**
 * Updates a single answer delta in RTDB to minimize network traffic.
 * TUYỆT ĐỐI KHÔNG GHI VÀO FIRESTORE TRONG QUÁ TRÌNH LIVE.
 */
export async function updateRealtimeAnswerDelta(
  sessionId: string,
  questionId: string,
  answer: any,
  answeredCount: number,
  activeQuestionIdx?: number
) {
  if (!sessionId || !rtdb) return;

  const now = Date.now();
  const safeQId = questionId.replace(/[.#$\[\]\/]/g, "_");
  const rtdbUpdates: Record<string, any> = {
    [`answers/${safeQId}`]: answer === undefined ? null : answer,
    answeredCount,
    presence: "online",
    lastActiveAt: now,
    lastHeartbeat: new Date(now).toISOString(),
  };
  if (activeQuestionIdx !== undefined) {
    rtdbUpdates.activeQuestionIdx = activeQuestionIdx;
  }

  try {
    const sessionRef = ref(rtdb, `active_sessions/${sessionId}`);
    await update(sessionRef, deepSanitizeRtdb(rtdbUpdates));
  } catch (err) {
    console.warn("[RTDB Live] Answer delta update error:", err);
  }
}

/**
 * Update quick metrics in Realtime Database.
 * TUYỆT ĐỐI KHÔNG GHI VÀO FIRESTORE TRONG QUÁ TRÌNH LIVE.
 */
export async function updateRealtimeSessionMetrics(
  sessionId: string,
  updates: Partial<ActiveSession>
) {
  if (!sessionId || !rtdb) return;

  const now = Date.now();
  const updateData = deepSanitizeRtdb({
    ...updates,
    presence: "online",
    lastActiveAt: now,
    lastHeartbeat: new Date(now).toISOString(),
  });

  try {
    const sessionRef = ref(rtdb, `active_sessions/${sessionId}`);
    await update(sessionRef, updateData);
  } catch (err) {
    console.warn("[RTDB Live] Metric update error:", err);
  }
}

/**
 * Marks session as submitted by immediately removing it from active proctoring sessions in RTDB.
 * Live proctoring only tracks candidates actively taking the exam.
 */
export async function markRealtimeSessionSubmitted(
  sessionId: string,
  _data?: {
    submissionId?: string;
    score?: number;
    maxScore?: number;
    answeredCount?: number;
    timeLeft?: number;
    timeSpent?: number;
    warnings?: number;
  }
) {
  if (!sessionId) return;
  try {
    await removeRealtimeSession(sessionId);
  } catch (err) {
    console.warn("[RTDB Live] Error removing session upon submission:", err);
  }
}

/**
 * Remove session exclusively from Realtime Database.
 * TUYỆT ĐỐI KHÔNG DÙNG FIRESTORE ĐỂ LƯU TRỮ PHIÊN LIVE.
 */
export async function removeRealtimeSession(sessionId: string) {
  const cleanId = sanitizeSessionId(sessionId);
  if (!cleanId || !rtdb) return;

  try {
    const sessionRef = ref(rtdb, `active_sessions/${cleanId}`);
    onDisconnect(sessionRef).cancel().catch(() => {});
    await remove(sessionRef);
  } catch (err) {
    console.warn("[RTDB Live] Remove session error:", err);
  }
}

/**
 * Subscribe to all active examinee sessions exclusively via Firebase Realtime Database.
 * Emits active examinees in real-time (excludes submitted candidates).
 * TUYỆT ĐỐI KHÔNG DÙNG onSnapshot FIRESTORE GÂY TỐN READ QUOTA.
 */
export function subscribeToActiveSessions(
  callback: (sessions: ActiveSession[]) => void,
  onError?: (error: Error) => void
) {
  if (!rtdb) {
    callback([]);
    return () => {};
  }

  const rtdbRef = ref(rtdb, "active_sessions");
  const handleSnapshot = (snapshot: any) => {
    const now = Date.now();
    const val = snapshot.val();
    if (!val) {
      callback([]);
      return;
    }

    const list: ActiveSession[] = [];
    Object.keys(val).forEach((key) => {
      const session = {
        sessionId: key,
        ...val[key],
      } as ActiveSession;

      // Exclude submitted sessions from live proctoring
      if (session.status === "submitted") return;

      const lastActive =
        typeof session.lastActiveAt === "number"
          ? session.lastActiveAt
          : session.lastHeartbeat
          ? new Date(session.lastHeartbeat).getTime()
          : 0;

      // Filter out stale ghost sessions inactive for more than 25 minutes
      const isStale = now - lastActive > 25 * 60 * 1000;
      if (!isStale) {
        list.push({
          ...session,
          connectionState: evaluateConnectionState(
            session.lastActiveAt,
            session.lastHeartbeat,
            session.presence
          ),
        });
      }
    });

    callback(list);
  };

  const handleError = (err: Error) => {
    console.warn("[RTDB Live] active_sessions subscribe warning:", err);
    if (onError) onError(err);
  };

  onValue(rtdbRef, handleSnapshot, handleError);

  return () => {
    try {
      off(rtdbRef, "value", handleSnapshot);
    } catch {
      try {
        off(rtdbRef);
      } catch (_) {}
    }
  };
}

/**
 * Real-time monitoring of a single examinee session via RTDB websocket.
 * TUYỆT ĐỐI KHÔNG DÙNG FIRESTORE onSnapshot.
 */
export function subscribeToSingleSession(
  sessionId: string,
  callback: (session: ActiveSession | null) => void
) {
  const cleanId = sanitizeSessionId(sessionId);
  if (!cleanId || !rtdb) {
    callback(null);
    return () => {};
  }

  const rtdbSessionRef = ref(rtdb, `active_sessions/${cleanId}`);
  let currentData: ActiveSession | null = null;

  const handleSnapshot = (snapshot: any) => {
    const val = snapshot.val();
    if (!val) {
      currentData = null;
      callback(null);
      return;
    }

    // Explicitly overwrite properties that can be cleared (set to null in RTDB)
    const sessionData: ActiveSession = {
      ...val,
      sessionId: cleanId,
      adminAction: val.adminAction !== undefined ? val.adminAction : null,
      adminMessage: val.adminMessage !== undefined ? val.adminMessage : null,
      adminDirectMessage: val.adminDirectMessage !== undefined ? val.adminDirectMessage : null,
      screenShareRequest: val.screenShareRequest !== undefined ? val.screenShareRequest : null,
      screenShareFrame: val.screenShareFrame !== undefined ? val.screenShareFrame : null,
    };
    currentData = sessionData;
    const conn = evaluateConnectionState(
      sessionData.lastActiveAt,
      sessionData.lastHeartbeat,
      sessionData.presence
    );
    callback({ ...sessionData, connectionState: conn });
  };

  onValue(rtdbSessionRef, handleSnapshot);

  return () => {
    try {
      off(rtdbSessionRef, "value", handleSnapshot);
    } catch {
      try {
        off(rtdbSessionRef);
      } catch (_) {}
    }
  };
}

/**
 * Resumes an exam session that was previously paused by admin.
 */
export async function resumeRealtimeExam(sessionId: string) {
  if (!sessionId || !rtdb) return;
  await updateRealtimeSessionMetrics(sessionId, {
    adminAction: "resume",
    adminMessage: null,
    status: "taking",
  });
}

/**
 * Sends a direct message with arbitrary content from admin to an active examinee.
 */
export async function sendRealtimeAdminMessage(
  sessionId: string,
  message: string,
  sender: string = "Giám thị"
) {
  if (!sessionId || !rtdb) return;
  const msgObj = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    text: message.trim(),
    sentAt: Date.now(),
    sender,
  };
  await updateRealtimeSessionMetrics(sessionId, {
    adminDirectMessage: msgObj,
  });
}

/**
 * Clear submitted sessions from Realtime Database (admin cleanup).
 */
export async function clearSubmittedSessions(sessionIds: string[]) {
  if (sessionIds.length === 0 || !rtdb) return;

  try {
    const updates: Record<string, null> = {};
    for (const id of sessionIds) {
      updates[`active_sessions/${id}`] = null;
    }
    await update(ref(rtdb), updates);
  } catch (err) {
    console.warn("[RTDB Live] Clear submitted sessions error:", err);
  }
}

/**
 * Checks if a student currently has an active examination session directly in RTDB.
 * ZERO FIRESTORE READS.
 */
export async function getActiveSessionForStudent(
  usernameOrId: string
): Promise<ActiveSession | null> {
  if (!rtdb || !usernameOrId) return null;
  const now = Date.now();
  try {
    const rtdbRef = ref(rtdb, "active_sessions");
    const q = query(rtdbRef, orderByChild("studentUsername"), equalTo(usernameOrId));
    const snap = await get(q);
    let foundDoc: any = null;

    if (snap.exists()) {
      const val = snap.val();
      const sessions = Object.keys(val).map((k) => ({ sessionId: k, ...val[k] } as ActiveSession));
      foundDoc = sessions.find((s) => s.status !== "submitted") || null;
    }

    if (!foundDoc) {
      // Fallback: check by studentId
      const q2 = query(rtdbRef, orderByChild("studentId"), equalTo(usernameOrId));
      const snap2 = await get(q2);
      if (snap2.exists()) {
        const val2 = snap2.val();
        const sessions2 = Object.keys(val2).map((k) => ({ sessionId: k, ...val2[k] } as ActiveSession));
        foundDoc = sessions2.find((s) => s.status !== "submitted") || null;
      }
    }

    if (foundDoc && foundDoc.status !== "submitted") {
      const lastActive =
        typeof foundDoc.lastActiveAt === "number"
          ? foundDoc.lastActiveAt
          : foundDoc.lastHeartbeat
          ? new Date(foundDoc.lastHeartbeat).getTime()
          : foundDoc.startTime
          ? new Date(foundDoc.startTime).getTime()
          : 0;

      const diffMin = (now - lastActive) / 60000;
      if (diffMin < 15) {
        return foundDoc;
      }
    }

    return null;
  } catch (err) {
    console.warn("[RTDB Live] getActiveSessionForStudent error:", err);
    return null;
  }
}

/**
 * Cascade deletes all active sessions associated with an exam from RTDB.
 * ZERO FIRESTORE READS / WRITES.
 */
export async function deleteExamActiveSessionsFromRtdb(examId: string): Promise<void> {
  if (!rtdb || !examId) return;
  try {
    const rtdbRef = ref(rtdb, "active_sessions");
    const q = query(rtdbRef, orderByChild("examId"), equalTo(examId));
    const snap = await get(q);
    if (snap.exists()) {
      const updates: Record<string, null> = {};
      snap.forEach((child) => {
        updates[`active_sessions/${child.key}`] = null;
      });
      await update(ref(rtdb), updates);
    }
  } catch (err) {
    console.warn("[RTDB Live] deleteExamActiveSessionsFromRtdb error:", err);
  }
}

/**
 * Cascade deletes all active sessions associated with a student from RTDB.
 * ZERO FIRESTORE READS / WRITES.
 */
export async function deleteStudentActiveSessionsFromRtdb(studentUsername: string): Promise<void> {
  if (!rtdb || !studentUsername) return;
  try {
    const rtdbRef = ref(rtdb, "active_sessions");
    const q = query(rtdbRef, orderByChild("studentUsername"), equalTo(studentUsername));
    const snap = await get(q);
    if (snap.exists()) {
      const updates: Record<string, null> = {};
      snap.forEach((child) => {
        updates[`active_sessions/${child.key}`] = null;
      });
      await update(ref(rtdb), updates);
    }
  } catch (err) {
    console.warn("[RTDB Live] deleteStudentActiveSessionsFromRtdb error:", err);
  }
}
