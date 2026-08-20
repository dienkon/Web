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
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase/config";
import type { Question, PaginatedResult } from "../types";

export const getQuestionsBySection = async (examId: string, sectionId: string): Promise<Question[]> => {
  const q = query(
    collection(db, `exams/${examId}/questions`),
    where("sectionId", "==", sectionId),
    orderBy("order", "asc")
  );
  console.log(`[Firestore] READ_MANY: exams/${examId}/questions (sectionId: ${sectionId})`);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) } as Question));
};

export const getQuestionsByExam = async ({
  examId,
  pageSize = 30,
  cursor = null,
}: {
  examId: string;
  pageSize?: number;
  cursor?: any;
}): Promise<PaginatedResult<Question>> => {
  let q = query(
    collection(db, `exams/${examId}/questions`),
    orderBy("order", "asc"),
    limit(pageSize)
  );

  if (cursor) {
    q = query(q, startAfter(cursor));
  }

  console.log(`[Firestore] READ_MANY: exams/${examId}/questions (paginated)`);
  const snapshot = await getDocs(q);
  const items = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) } as Question));
  const nextCursor = snapshot.docs[snapshot.docs.length - 1] || null;

  return {
    items,
    nextCursor,
    hasMore: snapshot.docs.length === pageSize,
  };
};

export const createQuestion = async (examId: string, questionData: Omit<Question, "id">): Promise<Question> => {
  const docRef = doc(collection(db, `exams/${examId}/questions`));
  console.log(`[Firestore] WRITE: exams/${examId}/questions/${docRef.id}`);
  await setDoc(docRef, questionData);
  return { id: docRef.id, ...questionData } as Question;
};

export const updateQuestion = async (examId: string, questionId: string, updates: Partial<Question>): Promise<void> => {
  const docRef = doc(db, `exams/${examId}/questions`, questionId);
  console.log(`[Firestore] UPDATE: exams/${examId}/questions/${questionId}`);
  await updateDoc(docRef, updates);
};

export const deleteQuestion = async (examId: string, questionId: string): Promise<void> => {
  const docRef = doc(db, `exams/${examId}/questions`, questionId);
  console.log(`[Firestore] DELETE: exams/${examId}/questions/${questionId}`);
  await deleteDoc(docRef);
};

export const updateQuestionOrders = async (examId: string, questions: { id: string; order: number; sectionId?: string }[]): Promise<void> => {
  console.log(`[Firestore] UPDATE_BATCH: exams/${examId}/questions (${questions.length} docs)`);
  const batch = writeBatch(db);
  questions.forEach((q) => {
    const docRef = doc(db, `exams/${examId}/questions`, q.id);
    const updates: any = { order: q.order };
    if (q.sectionId) {
        updates.sectionId = q.sectionId;
    }
    batch.update(docRef, updates);
  });
  await batch.commit();
};
