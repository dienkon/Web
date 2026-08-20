import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase/config";
import type { Section } from "../types";

export const getExamSections = async (examId: string): Promise<Section[]> => {
  const sectionsRef = collection(db, `exams/${examId}/sections`);
  const q = query(sectionsRef, orderBy("order", "asc"));
  console.log(`[Firestore] READ_MANY: exams/${examId}/sections`);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) } as Section));
};

export const createSection = async (examId: string, sectionData: Omit<Section, "id">): Promise<Section> => {
  const sectionsRef = collection(db, `exams/${examId}/sections`);
  const docRef = doc(sectionsRef);
  console.log(`[Firestore] WRITE: exams/${examId}/sections/${docRef.id}`);
  await setDoc(docRef, sectionData);
  return { id: docRef.id, ...sectionData } as Section;
};

export const updateSection = async (examId: string, sectionId: string, updates: Partial<Section>): Promise<void> => {
  const docRef = doc(db, `exams/${examId}/sections`, sectionId);
  console.log(`[Firestore] UPDATE: exams/${examId}/sections/${sectionId}`);
  await updateDoc(docRef, updates);
};

export const deleteSection = async (examId: string, sectionId: string, deleteQuestions = false): Promise<void> => {
  const docRef = doc(db, `exams/${examId}/sections`, sectionId);
  console.log(`[Firestore] DELETE: exams/${examId}/sections/${sectionId}`);
  await deleteDoc(docRef);

  try {
    const qRef = collection(db, `exams/${examId}/questions`);
    console.log(`[Firestore] READ_MANY: exams/${examId}/questions (for section deletion cleanup)`);
    const qSnap = await getDocs(query(qRef, where("sectionId", "==", sectionId)));
    if (!qSnap.empty) {
      console.log(`[Firestore] UPDATE_BATCH/DELETE_BATCH: exams/${examId}/questions (${qSnap.size} docs)`);
      const batch = writeBatch(db);
      if (deleteQuestions) {
        qSnap.docs.forEach((d) => batch.delete(d.ref));
      } else {
        qSnap.docs.forEach((d) => batch.update(d.ref, { sectionId: null }));
      }
      await batch.commit();
    }
  } catch (err) {
    console.warn("Could not cleanup questions under deleted section", err);
  }
};

export const updateSectionOrders = async (examId: string, sections: { id: string; order: number }[]): Promise<void> => {
  console.log(`[Firestore] UPDATE_BATCH: exams/${examId}/sections (${sections.length} docs)`);
  const batch = writeBatch(db);
  sections.forEach((sec) => {
    const docRef = doc(db, `exams/${examId}/sections`, sec.id);
    batch.update(docRef, { order: sec.order });
  });
  await batch.commit();
};
