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
  let q = query(
    collection(db, SUBMISSIONS_COLLECTION),
    where("examId", "==", examId),
    orderBy("submittedAt", "desc"),
    limit(pageSize)
  );

  if (cursor) {
    q = query(q, startAfter(cursor));
  }

  const snapshot = await getDocs(q);
  console.warn(`[Firestore] READ_MANY (${snapshot.size} docs): ${SUBMISSIONS_COLLECTION} (examId: ${examId})`);
  const items = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) } as Submission));
  const nextCursor = snapshot.docs[snapshot.docs.length - 1] || null;

  return {
    items,
    nextCursor,
    hasMore: snapshot.docs.length === pageSize,
  };
};

export const getSubmission = async (submissionId: string): Promise<Submission | null> => {
  const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
  const snapshot = await getDoc(docRef);
  console.warn(`[Firestore] READ (1 doc): ${SUBMISSIONS_COLLECTION}/${submissionId} (found: ${snapshot.exists()})`);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...(snapshot.data() as any) } as Submission;
  }
  return null;
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
  const subId = customSubmissionId || (submissionData as any).submissionId || submissionData.attemptId;
  const docRef = subId ? doc(db, SUBMISSIONS_COLLECTION, subId) : doc(collection(db, SUBMISSIONS_COLLECTION));

  // Idempotency check: if document already exists, return it directly to avoid duplicates
  if (subId) {
    try {
      const existingSnap = await getDoc(docRef);
      if (existingSnap.exists()) {
        console.warn(`[Firestore] Idempotent submission hit: ${subId}`);
        return { id: existingSnap.id, ...(existingSnap.data() as any) } as Submission;
      }
    } catch (e) {
      console.warn("Idempotency check warning:", e);
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
  console.warn(`[Firestore] WRITE (1 doc): ${SUBMISSIONS_COLLECTION}/${docRef.id}`);
  await setDoc(docRef, newSubmission);

  // Update leaderboard
  const examId = submissionData.examId;
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
