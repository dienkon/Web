/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ref, set, update, onValue, remove, onDisconnect, off } from "firebase/database";
import { doc, setDoc, deleteDoc, onSnapshot, collection } from "firebase/firestore";
import { rtdb, db } from "./firebase/config";
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
 * Sanitizes session ID to ensure it is 100% valid in both RTDB and Firestore paths.
 */
export function sanitizeSessionId(id: string): string {
  if (!id) return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return id.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

/**
 * Register and sync student taking exam session in Realtime Database.
 */
export async function syncRealtimeSession(session: ActiveSession) {
  const cleanSessionId = sanitizeSessionId(session.sessionId);
  if (!cleanSessionId) return;

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
  if (session.screenShareRequest !== undefined) sessionData.screenShareRequest = session.screenShareRequest;
  if (session.screenShareActive !== undefined) sessionData.screenShareActive = session.screenShareActive;
  if (session.screenShareFrame !== undefined) sessionData.screenShareFrame = session.screenShareFrame;

  const cleanData = deepSanitizeRtdb(sessionData);

  // 1. Sync to RTDB (Firebase Realtime Database) - Authoritative
  if (rtdb) {
    try {
      const sessionRef = ref(rtdb, `active_sessions/${cleanSessionId}`);
      await update(sessionRef, cleanData);
      onDisconnect(sessionRef).update({ presence: "offline", lastActiveAt: Date.now() }).catch(() => {});
    } catch (err) {
      console.warn("RTDB sync error:", err);
    }
  }

  // 2. Dual fallback sync to Firestore
  try {
    const docRef = doc(db, "active_sessions", cleanSessionId);
    await setDoc(docRef, cleanData, { merge: true });
  } catch (fErr) {
    console.warn("Firestore session sync error:", fErr);
  }
}

/**
 * Updates a single answer delta in RTDB to minimize network traffic.
 */
export async function updateRealtimeAnswerDelta(
  sessionId: string,
  questionId: string,
  answer: any,
  answeredCount: number,
  activeQuestionIdx?: number
) {
  if (!sessionId) return;

  const now = Date.now();
  const updates: Record<string, any> = {
    [`answers.${questionId}`]: answer === undefined ? null : answer,
    answeredCount,
    presence: "online",
    lastActiveAt: now,
    lastHeartbeat: new Date(now).toISOString(),
  };
  if (activeQuestionIdx !== undefined) {
    updates.activeQuestionIdx = activeQuestionIdx;
  }

  try {
    const docRef = doc(db, "active_sessions", sessionId);
    await setDoc(docRef, deepSanitizeRtdb(updates), { merge: true });
  } catch (e) {}

  if (rtdb) {
    try {
      const sessionRef = ref(rtdb, `active_sessions/${sessionId}`);
      const rtdbUpdates: Record<string, any> = {
        [`answers/${questionId}`]: answer === undefined ? null : answer,
        answeredCount,
        presence: "online",
        lastActiveAt: now,
        lastHeartbeat: new Date(now).toISOString(),
      };
      if (activeQuestionIdx !== undefined) {
        rtdbUpdates.activeQuestionIdx = activeQuestionIdx;
      }
      await update(sessionRef, deepSanitizeRtdb(rtdbUpdates));
    } catch (err) {
      console.warn("RTDB delta update error:", err);
    }
  }
}

/**
 * Update quick metrics in Realtime Database & Firestore.
 */
export async function updateRealtimeSessionMetrics(
  sessionId: string,
  updates: Partial<ActiveSession>
) {
  if (!sessionId) return;

  const now = Date.now();
  const updateData = deepSanitizeRtdb({
    ...updates,
    presence: "online",
    lastActiveAt: now,
    lastHeartbeat: new Date(now).toISOString(),
  });

  try {
    const docRef = doc(db, "active_sessions", sessionId);
    await setDoc(docRef, updateData, { merge: true });
  } catch (e) {}

  if (rtdb) {
    try {
      const sessionRef = ref(rtdb, `active_sessions/${sessionId}`);
      await update(sessionRef, updateData);
    } catch (err) {
      console.warn("RTDB metric update error:", err);
    }
  }
}

/**
 * Marks session as submitted by immediately removing it from active proctoring sessions.
 * Live proctoring only tracks candidates actively taking the exam.
 */
export async function markRealtimeSessionSubmitted(
  sessionId: string,
  data?: {
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
    console.warn("Error removing realtime session upon submission:", err);
  }
}

/**
 * Remove session from Realtime Database and Firestore.
 */
export async function removeRealtimeSession(sessionId: string) {
  const cleanId = sanitizeSessionId(sessionId);
  if (!cleanId) return;

  try {
    const docRef = doc(db, "active_sessions", cleanId);
    await deleteDoc(docRef);
  } catch (e) {}

  if (rtdb) {
    try {
      const sessionRef = ref(rtdb, `active_sessions/${cleanId}`);
      onDisconnect(sessionRef).cancel().catch(() => {});
      await remove(sessionRef);
    } catch (err) {
      console.warn("RTDB remove session error:", err);
    }
  }
}

/**
 * Subscribe to all active sessions via Realtime Database & Firestore.
 * Emits active examinees in real-time (excludes submitted candidates).
 */
export function subscribeToActiveSessions(
  callback: (sessions: ActiveSession[]) => void,
  onError?: (error: Error) => void
) {
  const rtdbMap = new Map<string, ActiveSession>();
  const firestoreMap = new Map<string, ActiveSession>();

  const emitMerged = () => {
    const now = Date.now();
    const mergedMap = new Map<string, ActiveSession>();

    // Put firestore sessions first
    for (const [id, s] of firestoreMap.entries()) {
      mergedMap.set(id, s);
    }
    // RTDB sessions override firestore (authoritative)
    for (const [id, s] of rtdbMap.entries()) {
      mergedMap.set(id, s);
    }

    const list: ActiveSession[] = [];
    for (const session of mergedMap.values()) {
      // Exclude submitted sessions from live proctoring
      if (session.status === "submitted") continue;

      const lastActive =
        typeof session.lastActiveAt === "number"
          ? session.lastActiveAt
          : session.lastHeartbeat
          ? new Date(session.lastHeartbeat).getTime()
          : 0;

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
    }
    callback(list);
  };

  let rtdbRef: any = null;
  if (rtdb) {
    try {
      rtdbRef = ref(rtdb, "active_sessions");
      onValue(
        rtdbRef,
        (snapshot) => {
          const val = snapshot.val();
          rtdbMap.clear();
          if (val) {
            Object.keys(val).forEach((key) => {
              rtdbMap.set(key, {
                sessionId: key,
                ...val[key],
              });
            });
          }
          emitMerged();
        },
        (err) => {
          console.warn("RTDB subscribe warning:", err);
          if (onError) onError(err);
        }
      );
    } catch (e) {
      console.warn("RTDB init listener warning:", e);
    }
  }

  // Dual listener on Firestore collection 'active_sessions'
  let unsubFirestore: (() => void) | null = null;
  try {
    const colRef = collection(db, "active_sessions");
    unsubFirestore = onSnapshot(
      colRef,
      (snap) => {
        firestoreMap.clear();
        snap.forEach((docSnap) => {
          const data = docSnap.data() as ActiveSession;
          firestoreMap.set(docSnap.id, {
            sessionId: docSnap.id,
            ...data,
          });
        });
        emitMerged();
      },
      (err) => {
        console.warn("Firestore active_sessions listen warning:", err);
        if (onError) onError(err);
      }
    );
  } catch (e) {
    console.warn("Firestore subscribe error:", e);
  }

  return () => {
    try {
      if (rtdb && rtdbRef) off(rtdbRef);
    } catch (e) {}
    try {
      if (unsubFirestore) unsubFirestore();
    } catch (e) {}
  };
}

/**
 * Real-time monitoring of a single examinee session.
 */
export function subscribeToSingleSession(
  sessionId: string,
  callback: (session: ActiveSession | null) => void
) {
  const cleanId = sanitizeSessionId(sessionId);
  if (!cleanId) return () => {};

  let currentData: ActiveSession | null = null;

  const emit = (data: any) => {
    if (!data) {
      if (!currentData) callback(null);
      return;
    }
    const merged = { ...(currentData || {}), ...data, sessionId: cleanId };
    currentData = merged;
    const conn = evaluateConnectionState(
      merged.lastActiveAt,
      merged.lastHeartbeat,
      merged.presence
    );
    callback({ ...merged, connectionState: conn });
  };

  let rtdbSessionRef: any = null;
  if (rtdb) {
    try {
      rtdbSessionRef = ref(rtdb, `active_sessions/${cleanId}`);
      onValue(rtdbSessionRef, (snapshot) => {
        const val = snapshot.val();
        if (val) emit(val);
      });
    } catch (e) {}
  }

  // Dual listener on Firestore doc
  let unsubFirestore: (() => void) | null = null;
  try {
    const docRef = doc(db, "active_sessions", cleanId);
    unsubFirestore = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        emit(snap.data());
      }
    });
  } catch (e) {}

  return () => {
    try {
      if (rtdb && rtdbSessionRef) off(rtdbSessionRef);
    } catch (e) {}
    try {
      if (unsubFirestore) unsubFirestore();
    } catch (e) {}
  };
}

/**
 * Clear submitted sessions from Realtime Database and Firestore (admin cleanup).
 */
export async function clearSubmittedSessions(sessionIds: string[]) {
  if (sessionIds.length === 0) return;

  try {
    for (const id of sessionIds) {
      await deleteDoc(doc(db, "active_sessions", id)).catch(() => {});
    }
  } catch (e) {}

  if (rtdb) {
    try {
      for (const id of sessionIds) {
        await remove(ref(rtdb, `active_sessions/${id}`));
      }
    } catch (err) {
      console.warn("RTDB clear submitted sessions error:", err);
    }
  }
}
