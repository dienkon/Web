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
  deleteDoc,
  writeBatch,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase/config";
import type { Exam, PaginatedResult } from "../types";
import { getTimestampMillis } from "../utils/date";

const EXAMS_COLLECTION = "exams";

export const getExamList = async ({
  pageSize = 30,
  cursor = null,
}: {
  pageSize?: number;
  cursor?: any;
}): Promise<PaginatedResult<Exam>> => {
  try {
    let q = query(
      collection(db, EXAMS_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );
    if (cursor) {
      q = query(q, startAfter(cursor));
    }
    console.log(`[Firestore] READ_MANY: ${EXAMS_COLLECTION}`);
    const snapshot = await getDocs(q);
    let items = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) } as Exam));
    
    // Fallback: If snapshot is empty without cursor, fetch all and sort client-side
    if (items.length === 0 && !cursor) {
      console.log(`[Firestore] READ_MANY: ${EXAMS_COLLECTION} (Fallback client sort)`);
      const fallbackSnap = await getDocs(collection(db, EXAMS_COLLECTION));
      items = fallbackSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) } as Exam));
      items.sort((a, b) => {
        const timeA = getTimestampMillis(a.createdAt || a.updatedAt);
        const timeB = getTimestampMillis(b.createdAt || b.updatedAt);
        return timeB - timeA;
      });
      return {
        items: items.slice(0, pageSize),
        nextCursor: null,
        hasMore: items.length > pageSize,
      };
    }

    const nextCursor = snapshot.docs[snapshot.docs.length - 1] || null;
    return {
      items,
      nextCursor,
      hasMore: snapshot.docs.length === pageSize,
    };
  } catch (err) {
    console.warn("Falling back to client-side sorting for exams list:", err);
    console.log(`[Firestore] READ_MANY: ${EXAMS_COLLECTION} (Error Fallback)`);
    const fallbackSnap = await getDocs(collection(db, EXAMS_COLLECTION));
    let items = fallbackSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) } as Exam));
    items.sort((a, b) => {
      const timeA = getTimestampMillis(a.createdAt || a.updatedAt);
      const timeB = getTimestampMillis(b.createdAt || b.updatedAt);
      return timeB - timeA;
    });
    return {
      items: items.slice(0, pageSize),
      nextCursor: null,
      hasMore: items.length > pageSize,
    };
  }
};

export const getExam = async (examId: string): Promise<Exam | null> => {
  const docRef = doc(db, EXAMS_COLLECTION, examId);
  console.log(`[Firestore] READ: ${EXAMS_COLLECTION}/${examId}`);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...(snapshot.data() as any) } as Exam;
  }
  return null;
};

export const createExam = async (examData: Omit<Exam, "id" | "createdAt" | "updatedAt">): Promise<Exam> => {
  const docRef = doc(collection(db, EXAMS_COLLECTION));
  const newExam = {
    ...examData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  console.log(`[Firestore] WRITE: ${EXAMS_COLLECTION}/${docRef.id}`);
  await setDoc(docRef, newExam);
  return { id: docRef.id, ...newExam, createdAt: new Date() as any, updatedAt: new Date() as any } as Exam;
};

export const updateExam = async (examId: string, updates: Partial<Exam>): Promise<void> => {
  const docRef = doc(db, EXAMS_COLLECTION, examId);
  console.log(`[Firestore] UPDATE: ${EXAMS_COLLECTION}/${examId}`);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Recursively deletes an exam and its associated sections, questions, submissions, and active sessions
 */
export const deleteExam = async (examId: string): Promise<void> => {
  try {
    // 1. Delete all sections
    const sectionsRef = collection(db, `${EXAMS_COLLECTION}/${examId}/sections`);
    console.log(`[Firestore] READ_MANY: ${EXAMS_COLLECTION}/${examId}/sections (for deletion)`);
    const sectionsSnap = await getDocs(sectionsRef);
    if (!sectionsSnap.empty) {
      console.log(`[Firestore] DELETE_BATCH: ${EXAMS_COLLECTION}/${examId}/sections (${sectionsSnap.size} docs)`);
      const secBatch = writeBatch(db);
      sectionsSnap.docs.forEach((d) => secBatch.delete(d.ref));
      await secBatch.commit();
    }

    // 2. Delete all questions
    const questionsRef = collection(db, `${EXAMS_COLLECTION}/${examId}/questions`);
    console.log(`[Firestore] READ_MANY: ${EXAMS_COLLECTION}/${examId}/questions (for deletion)`);
    const questionsSnap = await getDocs(questionsRef);
    if (!questionsSnap.empty) {
      console.log(`[Firestore] DELETE_BATCH: ${EXAMS_COLLECTION}/${examId}/questions (${questionsSnap.size} docs)`);
      const qBatch = writeBatch(db);
      questionsSnap.docs.forEach((d) => qBatch.delete(d.ref));
      await qBatch.commit();
    }

    // 3. Delete exam document
    const examRef = doc(db, EXAMS_COLLECTION, examId);
    console.log(`[Firestore] DELETE: ${EXAMS_COLLECTION}/${examId}`);
    await deleteDoc(examRef);

    // 4. Delete any submissions referencing this exam
    try {
      const submissionsRef = collection(db, "submissions");
      const subQuery = query(submissionsRef, where("examId", "==", examId));
      console.log(`[Firestore] READ_MANY: submissions (for deletion of exam ${examId})`);
      const subSnap = await getDocs(subQuery);
      if (!subSnap.empty) {
        console.log(`[Firestore] DELETE_BATCH: submissions (${subSnap.size} docs)`);
        const subBatch = writeBatch(db);
        subSnap.docs.forEach((d) => subBatch.delete(d.ref));
        await subBatch.commit();
      }
    } catch (subErr) {
      console.warn("Could not delete submissions", subErr);
    }

    // 5. Delete any active_sessions referencing this exam
    try {
      const sessRef = collection(db, "active_sessions");
      const sessQuery = query(sessRef, where("examId", "==", examId));
      console.log(`[Firestore] READ_MANY: active_sessions (for deletion of exam ${examId})`);
      const sessSnap = await getDocs(sessQuery);
      if (!sessSnap.empty) {
        console.log(`[Firestore] DELETE_BATCH: active_sessions (${sessSnap.size} docs)`);
        const sessBatch = writeBatch(db);
        sessSnap.docs.forEach((d) => sessBatch.delete(d.ref));
        await sessBatch.commit();
      }
    } catch (sessErr) {
      console.warn("Could not delete active_sessions", sessErr);
    }

  } catch (err) {
    console.error("Error deleting exam:", err);
    throw err;
  }
};
