import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  limit,
  startAfter,
  orderBy,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase/config";
import type { Submission, PaginatedResult, AiAnalysisCache } from "../types";
import { logDocRead, logQueryRead, logDocWrite } from "../utils/firestoreLogger";
import { updateGlobalStatsOnSubmission } from "./statsAggregatorService";
import { FirestoreRepository } from "./firebase/firestoreRepository";
import { FirestoreCache } from "./firebase/firestoreCache";

const SUBMISSIONS_COLLECTION = "submissions";

export const getExamSubmissions = async ({
  examId,
  pageSize = 30,
  cursor = null,
}: {
  examId: string;
  pageSize?: number;
  cursor?: any;
}): Promise<PaginatedResult<Submission>> => {
  const safePageSize = Math.min(pageSize, 50);
  let q = query(
    collection(db, SUBMISSIONS_COLLECTION),
    where("examId", "==", examId),
    orderBy("submittedAt", "desc"),
    limit(safePageSize)
  );

  if (cursor) {
    q = query(q, startAfter(cursor));
  }

  const t0 = performance.now();
  const snapshot = await getDocs(q);
  logQueryRead(SUBMISSIONS_COLLECTION, snapshot.size, safePageSize, performance.now() - t0, `examId: ${examId}`);
  const items = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) } as Submission));
  const nextCursor = snapshot.docs[snapshot.docs.length - 1] || null;

  return {
    items,
    nextCursor,
    hasMore: snapshot.docs.length === safePageSize,
  };
};

export const getSubmission = async (submissionId: string): Promise<Submission | null> => {
  return FirestoreRepository.getDocument<Submission>(SUBMISSIONS_COLLECTION, submissionId, {
    ttlMs: 180000,
    caller: "submissionService:getSubmission",
  });
};

const removeUndefinedValues = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefinedValues);
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = removeUndefinedValues(value);
    }
  }
  return result;
};

export const createSubmission = async (
  submissionData: Omit<Submission, "id" | "submittedAt">,
  customSubmissionId?: string
): Promise<Submission> => {
  let subId = customSubmissionId || (submissionData as any).submissionId || submissionData.attemptId;

  // Defensive guard: Ensure subId contains a timestamp or unique random component so it never collides with a previous attempt
  if (subId && !subId.match(/\d{10,}/)) {
    subId = `${subId}_${Date.now()}`;
  }

  const docRef = subId ? doc(db, SUBMISSIONS_COLLECTION, subId) : doc(collection(db, SUBMISSIONS_COLLECTION));

  // In-memory idempotency check: avoid duplicate writes without incurring an extra Firestore read
  if (subId) {
    const cachedSub = FirestoreCache.get<Submission>(`${SUBMISSIONS_COLLECTION}:${subId}`);
    if (cachedSub) {
      return cachedSub;
    }
  }

  const sanitized = removeUndefinedValues({
    ...submissionData,
    attemptId: submissionData.attemptId || docRef.id,
  });
  const newSubmission = {
    ...sanitized,
    submittedAt: serverTimestamp(),
  };

  await FirestoreRepository.setDocument(
    SUBMISSIONS_COLLECTION,
    docRef.id,
    newSubmission,
    undefined,
    "Save student exam submission"
  );

  const finalSubObject = {
    id: docRef.id,
    ...newSubmission,
    submittedAt: new Date() as any,
  } as Submission;

  // Seed into centralized cache with 5 minutes TTL
  FirestoreCache.set(`${SUBMISSIONS_COLLECTION}:${docRef.id}`, finalSubObject, 300000);

  // Invalidate student history cache and leaderboard cache
  FirestoreCache.invalidatePrefix("history:");
  FirestoreCache.invalidatePrefix("submissions:page:");
  if (submissionData.examId) {
    FirestoreCache.invalidate(`leaderboards:${submissionData.examId}`);
    FirestoreCache.invalidate(`exam_stats:${submissionData.examId}`);
  }

  // Update aggregated global stats & exam stats document (non-blocking)
  updateGlobalStatsOnSubmission({
    id: docRef.id,
    ...newSubmission,
  } as any).catch((statsErr) => {
    console.warn("[SubmissionService] Warning updating stats doc:", statsErr);
  });

  // Increment attemptCount on the Exam document in Firestore & invalidate home cache
  const examId = submissionData.examId;
  if (examId) {
    import("firebase/firestore").then(({ increment, updateDoc }) => {
      updateDoc(doc(db, "exams", examId), {
        attemptCount: increment(1),
        submissionsCount: increment(1),
        totalParticipants: increment(1),
      }).catch((examErr) => {
        console.warn("[SubmissionService] Warning incrementing exam attemptCount:", examErr);
      });
    }).catch(() => {});

    // Invalidate Home cache dynamically
    import("../pages/home/Home").then(({ invalidateHomeTopCache }) => {
      if (typeof invalidateHomeTopCache === "function") {
        invalidateHomeTopCache();
      }
    }).catch(() => {});
  }

  // Update leaderboard
  if (examId) {
    const leaderboardRef = doc(db, "leaderboards", examId);
    try {
      const { runTransaction } = await import("firebase/firestore");
      await runTransaction(db, async (transaction) => {
        const lbDoc = await transaction.get(leaderboardRef);
        console.warn(`[Firestore] TRANSACTION_READ (1 doc): leaderboards/${examId}`);
        let top: any[] = [];
        let totalParticipants = 0;

        const newEntry = {
          userId: submissionData.studentUsername || submissionData.studentId || "unknown",
          name: submissionData.studentNameSnapshot || "Thí sinh",
          score: submissionData.score || 0,
          maxScore: submissionData.maxScore || 10,
          time: submissionData.timeSpent || 0,
          submissionId: docRef.id,
          className: submissionData.studentClassSnapshot || "",
          submittedAt: new Date().toISOString()
        };

        if (lbDoc.exists()) {
          const data = lbDoc.data();
          top = data.top || [];
          totalParticipants = data.totalParticipants || 0;
        }

        totalParticipants += 1;

        const existingIdx = top.findIndex(e => e.userId === newEntry.userId);
        if (existingIdx >= 0) {
           const existing = top[existingIdx];
           if (newEntry.score > existing.score || (newEntry.score === existing.score && newEntry.time < existing.time)) {
             top[existingIdx] = newEntry;
           }
        } else {
           top.push(newEntry);
        }

        // Sort: score desc, time asc
        top.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.time - b.time;
        });

        top = top.slice(0, 20);

        console.warn(`[Firestore] TRANSACTION_WRITE (1 doc): leaderboards/${examId}`);
        transaction.set(leaderboardRef, {
          examId,
          top,
          totalParticipants
        }, { merge: true });
      });
    } catch (err) {
      console.error("Error updating leaderboard:", err);
    }
  }

  return { id: docRef.id, ...newSubmission, submittedAt: new Date() as any } as Submission;
};

export const saveSubmissionAiAnalysis = async (
  submissionId: string,
  aiAnalysis: AiAnalysisCache
): Promise<void> => {
  try {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    console.warn(`[Firestore] UPDATE (1 doc): ${SUBMISSIONS_COLLECTION}/${submissionId} (aiAnalysis)`);
    await updateDoc(docRef, { aiAnalysis });
  } catch (err) {
    console.warn("Could not cache AI analysis in Firestore:", err);
  }
};
