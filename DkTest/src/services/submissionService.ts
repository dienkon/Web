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
import type { Submission, PaginatedResult } from "../types";

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

export const createSubmission = async (submissionData: Omit<Submission, "id" | "submittedAt">): Promise<Submission> => {
  const docRef = doc(collection(db, SUBMISSIONS_COLLECTION));
  const sanitized = removeUndefinedValues(submissionData);
  const newSubmission = {
    ...sanitized,
    submittedAt: serverTimestamp(),
  };
  await setDoc(docRef, newSubmission);
  return { id: docRef.id, ...newSubmission, submittedAt: new Date() as any } as Submission;
};
