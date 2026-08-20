import {
  ref,
  set,
  update,
  onValue,
  remove,
  onDisconnect,
  off,
} from "firebase/database";
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
}

/**
 * Register and sync student taking exam session in Firestore and Realtime Database.
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

  // 1. Sync to Firestore (guaranteed reliable persistence & real-time onSnapshot)
  try {
    const fsRef = doc(db, "active_sessions", session.sessionId);
    await setDoc(fsRef, sessionData, { merge: true });

    // Also write to taking_sessions for backward compatibility
    const takingRef = doc(db, "taking_sessions", session.sessionId);
    await setDoc(takingRef, sessionData, { merge: true });
  } catch (fsErr) {
    console.warn("Firestore syncRealtimeSession error:", fsErr);
  }

  // 2. Sync to RTDB if available
  if (rtdb) {
    try {
      const sessionRef = ref(rtdb, `active_sessions/${session.sessionId}`);
      await set(sessionRef, sessionData);
      onDisconnect(sessionRef)
        .remove()
        .catch(() => {});
    } catch (err) {
      // RTDB optional fallback
    }
  }
}

/**
 * Update quick metrics (timeLeft, answers, warnings) in Firestore & Realtime Database.
 */
export async function updateRealtimeSessionMetrics(
  sessionId: string,
  updates: Partial<ActiveSession>,
) {
  if (!sessionId) return;
  const now = Date.now();
  const updateData = {
    ...updates,
    lastActiveAt: now,
    lastHeartbeat: new Date(now).toISOString(),
  };

  // 1. Update Firestore
  try {
    const fsRef = doc(db, "active_sessions", sessionId);
    await updateDoc(fsRef, updateData);

    const takingRef = doc(db, "taking_sessions", sessionId);
    await updateDoc(takingRef, updateData);
  } catch (fsErr) {
    // Ignore update doc errors if doc does not exist
  }

  // 2. Update RTDB if available
  if (rtdb) {
    try {
      const sessionRef = ref(rtdb, `active_sessions/${sessionId}`);
      await update(sessionRef, updateData);
    } catch (err) {
      // RTDB optional fallback
    }
  }
}

/**
 * Remove session from Firestore & Realtime Database upon submission or exit.
 */
export async function removeRealtimeSession(sessionId: string) {
  if (!sessionId) return;

  // 1. Mark as submitted / delete from Firestore
  try {
    const fsRef = doc(db, "active_sessions", sessionId);
    await deleteDoc(fsRef);

    const takingRef = doc(db, "taking_sessions", sessionId);
    await updateDoc(takingRef, {
      status: "submitted",
      submittedAt: new Date().toISOString(),
    }).catch(() => deleteDoc(takingRef));
  } catch (fsErr) {
    console.warn("Firestore removeRealtimeSession error:", fsErr);
  }

  // 2. Remove from RTDB if available
  if (rtdb) {
    try {
      const sessionRef = ref(rtdb, `active_sessions/${sessionId}`);
      onDisconnect(sessionRef)
        .cancel()
        .catch(() => {});
      await remove(sessionRef);
    } catch (err) {
      // RTDB optional fallback
    }
  }
}

/**
 * Subscribe to all active sessions via Firestore real-time listener (with fallback to RTDB).
 */
export function subscribeToActiveSessions(
  callback: (sessions: ActiveSession[]) => void,
  onError?: (error: Error) => void,
) {
  // Listen directly from Firestore collection active_sessions
  try {
    const activeSessionsCol = collection(db, "active_sessions");
    const unsubscribeFs = onSnapshot(
      activeSessionsCol,
      (snapshot) => {
        const now = Date.now();
        const list: ActiveSession[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ActiveSession;
          // Filter out submitted sessions or stale sessions older than 10 minutes without heartbeat
          const lastActive =
            typeof data.lastActiveAt === "number"
              ? data.lastActiveAt
              : data.lastHeartbeat
                ? new Date(data.lastHeartbeat).getTime()
                : 0;

          const isStale = now - lastActive > 10 * 60 * 1000;
          if (data.status !== "submitted" && !isStale) {
            list.push({
              sessionId: docSnap.id,
              ...data,
            });
          }
        });

        callback(list);
      },
      (err) => {
        console.warn(
          "Firestore subscribeToActiveSessions error, falling back to RTDB:",
          err,
        );
        if (rtdb) {
          try {
            const sessionsRef = ref(rtdb, "active_sessions");
            onValue(sessionsRef, (snapshot) => {
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
            });
          } catch (rtdbErr) {
            if (onError) onError(err);
          }
        } else if (onError) {
          onError(err);
        }
      },
    );

    return () => {
      try {
        unsubscribeFs();
      } catch (e) {}
    };
  } catch (err: any) {
    console.error("Failed to subscribe to active sessions:", err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Clear submitted sessions from Firestore & Realtime Database.
 */
export async function clearSubmittedSessions(sessionIds: string[]) {
  if (sessionIds.length === 0) return;

  for (const id of sessionIds) {
    try {
      await deleteDoc(doc(db, "active_sessions", id));
      await deleteDoc(doc(db, "taking_sessions", id));
    } catch (e) {}
  }

  if (rtdb) {
    try {
      for (const id of sessionIds) {
        await remove(ref(rtdb, `active_sessions/${id}`));
      }
    } catch (err) {}
  }
}
