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
 * Register and sync student taking exam session in Realtime Database and Firestore.
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

  // 1. Sync to RTDB (Firebase Realtime Database)
  if (rtdb) {
    try {
      const sessionRef = ref(rtdb, `active_sessions/${session.sessionId}`);
      await set(sessionRef, sessionData);
      onDisconnect(sessionRef)
        .remove()
        .catch(() => {});
    } catch (err) {
      console.warn("RTDB sync error:", err);
    }
  }

  // 2. Sync to Firestore (guaranteed reliable persistence & real-time onSnapshot)
  try {
    const fsRef = doc(db, "active_sessions", session.sessionId);
    await setDoc(fsRef, sessionData, { merge: true });

    // Also write to taking_sessions for backward compatibility
    const takingRef = doc(db, "taking_sessions", session.sessionId);
    await setDoc(takingRef, sessionData, { merge: true });
  } catch (fsErr) {
    console.warn("Firestore syncRealtimeSession error:", fsErr);
  }
}

/**
 * Update quick metrics (timeLeft, answers, warnings, scratchpadImage) in Realtime Database & Firestore.
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

  // 1. Update RTDB
  if (rtdb) {
    try {
      const sessionRef = ref(rtdb, `active_sessions/${sessionId}`);
      await update(sessionRef, updateData);
    } catch (err) {
      console.warn("RTDB update error:", err);
    }
  }

  // 2. Update Firestore with setDoc merge to guarantee success
  try {
    const fsRef = doc(db, "active_sessions", sessionId);
    await setDoc(fsRef, updateData, { merge: true });

    const takingRef = doc(db, "taking_sessions", sessionId);
    await setDoc(takingRef, updateData, { merge: true });
  } catch (fsErr) {
    console.warn("Firestore update error:", fsErr);
  }
}

/**
 * Remove session from Firestore & Realtime Database upon submission or exit.
 */
export async function removeRealtimeSession(sessionId: string) {
  if (!sessionId) return;

  // 1. Remove from RTDB
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

  // 2. Mark as submitted / delete from Firestore
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
}

/**
 * Subscribe to all active sessions via combined Realtime Database & Firestore listeners.
 */
export function subscribeToActiveSessions(
  callback: (sessions: ActiveSession[]) => void,
  onError?: (error: Error) => void,
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

  // 1. Realtime Database Subscription
  let rtdbRef: any = null;
  if (rtdb) {
    try {
      rtdbRef = ref(rtdb, "active_sessions");
      onValue(
        rtdbRef,
        (snapshot) => {
          const val = snapshot.val();
          if (val) {
            Object.keys(val).forEach((key) => {
              sessionsMap.set(key, {
                sessionId: key,
                ...val[key],
              });
            });
          }
          emitMerged();
        },
        (err) => {
          console.warn("RTDB subscribe warning:", err);
        },
      );
    } catch (e) {
      console.warn("RTDB init listener warning:", e);
    }
  }

  // 2. Firestore Subscription
  let unsubscribeFs = () => {};
  try {
    const activeSessionsCol = collection(db, "active_sessions");
    unsubscribeFs = onSnapshot(
      activeSessionsCol,
      (snapshot) => {
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ActiveSession;
          sessionsMap.set(docSnap.id, {
            sessionId: docSnap.id,
            ...data,
          });
        });
        emitMerged();
      },
      (err) => {
        console.warn("Firestore subscribe warning:", err);
        if (onError && !rtdb) onError(err);
      },
    );
  } catch (err: any) {
    console.error("Failed to subscribe to active sessions in Firestore:", err);
  }

  return () => {
    try {
      unsubscribeFs();
      if (rtdb && rtdbRef) {
        off(rtdbRef);
      }
    } catch (e) {}
  };
}

/**
 * Subscribe to a single live session in real-time from both RTDB & Firestore.
 */
export function subscribeToSingleSession(
  sessionId: string,
  callback: (session: ActiveSession | null) => void,
) {
  if (!sessionId) return () => {};

  // 1. RTDB listener
  let rtdbSessionRef: any = null;
  if (rtdb) {
    try {
      rtdbSessionRef = ref(rtdb, `active_sessions/${sessionId}`);
      onValue(rtdbSessionRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          callback({ sessionId, ...val });
        }
      });
    } catch (e) {}
  }

  // 2. Firestore listener
  let unsubscribeFs = () => {};
  try {
    const docRef = doc(db, "active_sessions", sessionId);
    unsubscribeFs = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ sessionId: docSnap.id, ...docSnap.data() } as ActiveSession);
      }
    });
  } catch (e) {}

  return () => {
    try {
      unsubscribeFs();
      if (rtdb && rtdbSessionRef) {
        off(rtdbSessionRef);
      }
    } catch (e) {}
  };
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
