import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, startAfter, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase/config";
import { Exam, PaginatedResult } from "../types";
const EXAMS_COLLECTION = "exams";

export const getExamList = async ({
  pageSize = 10,
  cursor = null,
  ownerId = null,
  folderId = undefined,
  subject = undefined,
  gradeCategory = undefined,
  isFeatured = undefined,
}: {
  pageSize?: number;
  cursor?: any;
  ownerId?: string | null;
  folderId?: string | null | undefined;
  subject?: string | undefined;
  gradeCategory?: string | undefined;
  isFeatured?: boolean | undefined;
}): Promise<PaginatedResult<Exam>> => {
  try {
    let q = collection(db, EXAMS_COLLECTION) as any;
    const conditions: any[] = [];

    if (ownerId) {
      conditions.push(where("ownerId", "==", ownerId));
    }
    if (folderId !== undefined) {
      conditions.push(where("folderId", "==", folderId));
    }
    if (subject) {
      conditions.push(where("subject", "==", subject));
    }
    if (gradeCategory) {
      conditions.push(where("gradeCategory", "==", gradeCategory));
    }
    if (isFeatured !== undefined) {
      conditions.push(where("isFeatured", "==", isFeatured));
    }

    if (conditions.length > 0) {
      q = query(q, ...conditions, limit(pageSize));
    } else {
      q = query(q, limit(pageSize));
    }

    if (cursor) {
      q = query(q, startAfter(cursor));
    }

    console.log(`[Firestore] READ_MANY: ${EXAMS_COLLECTION} (pageSize: ${pageSize})`);
    let snapshot;
    try {
      snapshot = await getDocs(q);
    } catch (orderErr) {
      console.warn("Filtered query failed, trying simple query fallback:", orderErr);
      let fallbackQ = collection(db, EXAMS_COLLECTION) as any;
      if (ownerId) {
        fallbackQ = query(fallbackQ, where("ownerId", "==", ownerId), limit(pageSize));
      } else {
        fallbackQ = query(fallbackQ, limit(pageSize));
      }
      snapshot = await getDocs(fallbackQ);
    }

    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) } as Exam));
    
    // Ensure robust sorting by updatedAt descending (fallback to createdAt if missing)
    items.sort((a: any, b: any) => {
      const getMs = (val: any) => {
        if (!val) return 0;
        if (typeof val.toDate === "function") return val.toDate().getTime();
        if (typeof val.seconds === "number") return val.seconds * 1000;
        if (val instanceof Date) return val.getTime();
        return new Date(val).getTime() || 0;
      };
      const timeA = getMs(a.updatedAt) || getMs(a.createdAt);
      const timeB = getMs(b.updatedAt) || getMs(b.createdAt);
      return timeB - timeA;
    });

    const nextCursor = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    
    return {
      items,
      nextCursor,
      hasMore: snapshot.docs.length === pageSize,
    };
  } catch (err) {
    console.error("Error fetching exam list:", err);
    throw err;
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
