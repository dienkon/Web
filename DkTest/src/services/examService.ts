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

    let snapshot;
    try {
      snapshot = await getDocs(q);
      console.warn(`[Firestore] READ_MANY (${snapshot.size} docs): ${EXAMS_COLLECTION} (folderId: ${folderId ?? 'all'}, pageSize: ${pageSize})`);
    } catch (orderErr) {
      console.warn("Filtered query failed, trying simple query fallback:", orderErr);
      let fallbackQ = collection(db, EXAMS_COLLECTION) as any;
      if (ownerId) {
        fallbackQ = query(fallbackQ, where("ownerId", "==", ownerId), limit(pageSize));
      } else {
        fallbackQ = query(fallbackQ, limit(pageSize));
      }
      snapshot = await getDocs(fallbackQ);
      console.warn(`[Firestore] READ_MANY (${snapshot.size} docs): ${EXAMS_COLLECTION} (fallback query)`);
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
  const snapshot = await getDoc(docRef);
  console.warn(`[Firestore] READ (1 doc): ${EXAMS_COLLECTION}/${examId} (found: ${snapshot.exists()})`);
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
  console.warn(`[Firestore] WRITE (1 doc): ${EXAMS_COLLECTION}/${docRef.id}`);
  await setDoc(docRef, newExam);
  return { id: docRef.id, ...newExam, createdAt: new Date() as any, updatedAt: new Date() as any } as Exam;
};

export const updateExam = async (examId: string, updates: Partial<Exam>): Promise<void> => {
  const docRef = doc(db, EXAMS_COLLECTION, examId);
  console.warn(`[Firestore] UPDATE (1 doc): ${EXAMS_COLLECTION}/${examId}`);
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
    const sectionsSnap = await getDocs(sectionsRef);
    console.warn(`[Firestore] READ_MANY (${sectionsSnap.size} docs): ${EXAMS_COLLECTION}/${examId}/sections (for deletion)`);
    if (!sectionsSnap.empty) {
      const secBatch = writeBatch(db);
      sectionsSnap.docs.forEach((d) => secBatch.delete(d.ref));
      console.warn(`[Firestore] DELETE_BATCH (${sectionsSnap.size} docs): ${EXAMS_COLLECTION}/${examId}/sections`);
      await secBatch.commit();
    }

    // 2. Delete all questions
    const questionsRef = collection(db, `${EXAMS_COLLECTION}/${examId}/questions`);
    const questionsSnap = await getDocs(questionsRef);
    console.warn(`[Firestore] READ_MANY (${questionsSnap.size} docs): ${EXAMS_COLLECTION}/${examId}/questions (for deletion)`);
    if (!questionsSnap.empty) {
      const qBatch = writeBatch(db);
      questionsSnap.docs.forEach((d) => qBatch.delete(d.ref));
      console.warn(`[Firestore] DELETE_BATCH (${questionsSnap.size} docs): ${EXAMS_COLLECTION}/${examId}/questions`);
      await qBatch.commit();
    }

    // 3. Delete exam document
    const examRef = doc(db, EXAMS_COLLECTION, examId);
    console.warn(`[Firestore] DELETE (1 doc): ${EXAMS_COLLECTION}/${examId}`);
    await deleteDoc(examRef);

    // 4. Delete any submissions referencing this exam
    try {
      const submissionsRef = collection(db, "submissions");
      const subQuery = query(submissionsRef, where("examId", "==", examId));
      const subSnap = await getDocs(subQuery);
      console.warn(`[Firestore] READ_MANY (${subSnap.size} docs): submissions (for deletion of exam ${examId})`);
      if (!subSnap.empty) {
        const subBatch = writeBatch(db);
        subSnap.docs.forEach((d) => subBatch.delete(d.ref));
        console.warn(`[Firestore] DELETE_BATCH (${subSnap.size} docs): submissions`);
        await subBatch.commit();
      }
    } catch (subErr) {
      console.warn("Could not delete submissions", subErr);
    }

    // 5. Delete any active_sessions referencing this exam
    try {
      const sessRef = collection(db, "active_sessions");
      const sessQuery = query(sessRef, where("examId", "==", examId));
      const sessSnap = await getDocs(sessQuery);
      console.warn(`[Firestore] READ_MANY (${sessSnap.size} docs): active_sessions (for deletion of exam ${examId})`);
      if (!sessSnap.empty) {
        const sessBatch = writeBatch(db);
        sessSnap.docs.forEach((d) => sessBatch.delete(d.ref));
        console.warn(`[Firestore] DELETE_BATCH (${sessSnap.size} docs): active_sessions`);
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
