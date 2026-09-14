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
  const snapshot = await getDocs(q);
  console.warn(`[Firestore] READ_MANY (${snapshot.size} docs): exams/${examId}/sections`);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) } as Section));
};

export const createSection = async (examId: string, sectionData: Omit<Section, "id">): Promise<Section> => {
  const sectionsRef = collection(db, `exams/${examId}/sections`);
  const docRef = doc(sectionsRef);
  console.warn(`[Firestore] WRITE (1 doc): exams/${examId}/sections/${docRef.id}`);
  await setDoc(docRef, sectionData);
  return { id: docRef.id, ...sectionData } as Section;
};

export const updateSection = async (examId: string, sectionId: string, updates: Partial<Section>): Promise<void> => {
  const docRef = doc(db, `exams/${examId}/sections`, sectionId);
  console.warn(`[Firestore] UPDATE (1 doc): exams/${examId}/sections/${sectionId}`);
  await updateDoc(docRef, updates);
};

export const deleteSection = async (examId: string, sectionId: string, deleteQuestions = false): Promise<void> => {
  const docRef = doc(db, `exams/${examId}/sections`, sectionId);
  console.warn(`[Firestore] DELETE (1 doc): exams/${examId}/sections/${sectionId}`);
  await deleteDoc(docRef);

  try {
    const qRef = collection(db, `exams/${examId}/questions`);
    const qSnap = await getDocs(query(qRef, where("sectionId", "==", sectionId)));
    console.warn(`[Firestore] READ_MANY (${qSnap.size} docs): exams/${examId}/questions (for section deletion cleanup)`);
    if (!qSnap.empty) {
      console.warn(`[Firestore] BATCH_WRITE (${qSnap.size} docs): exams/${examId}/questions (${deleteQuestions ? 'delete' : 'clear sectionId'})`);
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
  console.warn(`[Firestore] BATCH_WRITE (${sections.length} docs): exams/${examId}/sections order update`);
  const batch = writeBatch(db);
  sections.forEach((sec) => {
    const docRef = doc(db, `exams/${examId}/sections`, sec.id);
    batch.update(docRef, { order: sec.order });
  });
  await batch.commit();
};
