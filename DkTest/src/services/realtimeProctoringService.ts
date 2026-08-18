import { ref, set, update, onValue, remove, onDisconnect, off } from "firebase/database";
import { rtdb } from "./firebase/config";

export interface ActiveSession {
  sessionId: string;
  examId: string;
  examTitle: string;
  studentName: string;
  studentUsername?: string;
  studentClass?: string;
  timeLeft: number;
  answeredCount: number;
  totalQuestions: number;
  warnings: number;
  status: "taking" | "warning" | "submitted";
  lastActiveAt: string | number;
  submittedAt?: string | number;
}

/**
 * Register and sync student taking exam session in Firebase Realtime Database.
 * Also configures onDisconnect removal so aborted sessions are automatically pruned.
 */
export async function syncRealtimeSession(session: ActiveSession) {
  if (!rtdb || !session.sessionId) return;
  try {
    const sessionRef = ref(rtdb, `active_sessions/${session.sessionId}`);
    await set(sessionRef, {
      ...session,
      lastActiveAt: Date.now(),
    });
    // Setup automatic cleanup when connection drops
    onDisconnect(sessionRef).remove().catch(() => {});
  } catch (err) {
    console.warn("RTDB syncRealtimeSession error:", err);
  }
}

/**
 * Update quick metrics (timeLeft, answers, warnings) in Realtime Database.
 */
export async function updateRealtimeSessionMetrics(
  sessionId: string,
  updates: Partial<ActiveSession>
) {
  if (!rtdb || !sessionId) return;
  try {
    const sessionRef = ref(rtdb, `active_sessions/${sessionId}`);
    await update(sessionRef, {
      ...updates,
      lastActiveAt: Date.now(),
    });
  } catch (err) {
    console.warn("RTDB updateRealtimeSessionMetrics error:", err);
  }
}

/**
 * Remove session from Realtime Database upon submission or exit.
 */
export async function removeRealtimeSession(sessionId: string) {
  if (!rtdb || !sessionId) return;
  try {
    const sessionRef = ref(rtdb, `active_sessions/${sessionId}`);
    // Cancel onDisconnect first to prevent race condition
    onDisconnect(sessionRef).cancel().catch(() => {});
    await remove(sessionRef);
  } catch (err) {
    console.warn("RTDB removeRealtimeSession error:", err);
  }
}

/**
 * Subscribe to all active sessions in Realtime Database.
 */
export function subscribeToActiveSessions(
  callback: (sessions: ActiveSession[]) => void,
  onError?: (error: Error) => void
) {
  if (!rtdb) {
    callback([]);
    return () => {};
  }

  const sessionsRef = ref(rtdb, "active_sessions");
  const unsubscribe = onValue(
    sessionsRef,
    (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        callback([]);
        return;
      }
      const list: ActiveSession[] = Object.keys(val).map((key) => ({
        sessionId: key,
        ...val[key],
      }));
      callback(list);
    },
    (err) => {
      console.warn("RTDB subscribeToActiveSessions error:", err);
      if (onError) onError(err);
    }
  );

  return () => {
    try {
      off(sessionsRef);
    } catch (e) {}
  };
}

/**
 * Clear submitted sessions from Realtime Database.
 */
export async function clearSubmittedSessions(sessionIds: string[]) {
  if (!rtdb || sessionIds.length === 0) return;
  try {
    for (const id of sessionIds) {
      await remove(ref(rtdb, `active_sessions/${id}`));
    }
  } catch (err) {
    console.warn("RTDB clearSubmittedSessions error:", err);
  }
}
