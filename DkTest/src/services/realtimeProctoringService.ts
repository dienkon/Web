import { ref, set, update, onValue, remove, onDisconnect, off } from "firebase/database";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  getDocs,
  where,
} from "firebase/firestore";
import { rtdb, db } from "./firebase/config";

export interface ActiveSession {
  sessionId: string;
  examId: string;
  examTitle: string;
  studentName: string;
  studentUsername?: string;
  studentId?: string;
  studentClass?: string;
  timeLeft: number;
  answeredCount: number;
  totalQuestions: number;
  warnings: number;
  status: "taking" | "warning" | "submitted";
  lastActiveAt: string | number;
  lastHeartbeat?: string;
  submittedAt?: string | number;
  answers?: Record<string, any>;
  activeQuestionIdx?: number;
  scratchpadImage?: string | null;
  adminAction?: "pause" | "suspend" | null;
  adminMessage?: string | null;
  shuffledQuestions?: any[];
  questionOrder?: string[];
}

/**
 * Register and sync student taking exam session in Realtime Database.
 */
export async function syncRealtimeSession(session: ActiveSession) {
  if (!session.sessionId) return;

  const now = Date.now();
  const sessionData = {
    ...session,
    studentUsername: session.studentUsername || session.studentName,
    studentId: session.studentUsername || session.studentName,
    lastActiveAt: now,
    lastHeartbeat: new Date(now).toISOString(),
  };

  // 1. Sync to RTDB (Firebase Realtime Database) ONLY
  if (rtdb) {
    try {
      const sessionRef = ref(rtdb, `active_sessions/${session.sessionId}`);
      await set(sessionRef, sessionData);
      onDisconnect(sessionRef).remove().catch(() => {});
    } catch (err) {
      console.warn("RTDB sync error:", err);
    }
  }
}

/**
 * Update quick metrics (timeLeft, answers, warnings, scratchpadImage, admin actions) in Realtime Database.
 */
export async function updateRealtimeSessionMetrics(
  sessionId: string,
  updates: Partial<ActiveSession>
) {
  if (!sessionId) return;

  const now = Date.now();
  const updateData = {
    ...updates,
    lastActiveAt: now,
    lastHeartbeat: new Date(now).toISOString(),
  };

  // 1. Update RTDB ONLY
  if (rtdb) {
    try {
      const sessionRef = ref(rtdb, `active_sessions/${sessionId}`);
      await update(sessionRef, updateData);
    } catch (err) {
      console.warn("RTDB update error:", err);
    }
  }
}

/**
 * Remove session from Realtime Database upon submission or exit.
 */
export async function removeRealtimeSession(sessionId: string) {
  if (!sessionId) return;

  // 1. Remove from RTDB ONLY
  if (rtdb) {
    try {
      const sessionRef = ref(rtdb, `active_sessions/${sessionId}`);
      onDisconnect(sessionRef).cancel().catch(() => {});
      await remove(sessionRef);
    } catch (err) {
      // RTDB optional fallback
    }
  }
}

/**
 * Subscribe to all active sessions via Realtime Database.
 */
export function subscribeToActiveSessions(
  callback: (sessions: ActiveSession[]) => void,
  onError?: (error: Error) => void
) {
  const sessionsMap = new Map<string, ActiveSession>();

  const emitMerged = () => {
    const now = Date.now();
    const list: ActiveSession[] = [];
    for (const session of sessionsMap.values()) {
      const lastActive =
        typeof session.lastActiveAt === "number"
          ? session.lastActiveAt
          : session.lastHeartbeat
          ? new Date(session.lastHeartbeat).getTime()
          : 0;

      const isStale = now - lastActive > 15 * 60 * 1000;
      if (session.status !== "submitted" && !isStale) {
        list.push(session);
      }
    }
    callback(list);
  };

  // 1. Realtime Database Subscription ONLY
  let rtdbRef: any = null;
  if (rtdb) {
    try {
      rtdbRef = ref(rtdb, "active_sessions");
      onValue(
        rtdbRef,
        (snapshot) => {
          const val = snapshot.val();
          if (val) {
            sessionsMap.clear();
            Object.keys(val).forEach((key) => {
              sessionsMap.set(key, {
                sessionId: key,
                ...val[key],
              });
            });
          } else {
            sessionsMap.clear();
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

  return () => {
    try {
      if (rtdb && rtdbRef) {
        off(rtdbRef);
      }
    } catch (e) {}
  };
}

/**
 * Subscribe to a single live session in real-time from RTDB.
 */
export function subscribeToSingleSession(
  sessionId: string,
  callback: (session: ActiveSession | null) => void
) {
  if (!sessionId) return () => {};

  // 1. RTDB listener ONLY
  let rtdbSessionRef: any = null;
  if (rtdb) {
    try {
      rtdbSessionRef = ref(rtdb, `active_sessions/${sessionId}`);
      onValue(rtdbSessionRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          callback({ sessionId, ...val });
        } else {
          callback(null);
        }
      });
    } catch (e) {}
  }

  return () => {
    try {
      if (rtdb && rtdbSessionRef) {
        off(rtdbSessionRef);
      }
    } catch (e) {}
  };
}

/**
 * Clear submitted sessions from Realtime Database.
 */
export async function clearSubmittedSessions(sessionIds: string[]) {
  if (sessionIds.length === 0) return;

  if (rtdb) {
    try {
      for (const id of sessionIds) {
        await remove(ref(rtdb, `active_sessions/${id}`));
      }
    } catch (err) {}
  }
}


