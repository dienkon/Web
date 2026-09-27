/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
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
import { FirestoreRepository } from "./firebase/firestoreRepository";
import { FirestoreCache } from "./firebase/firestoreCache";
import type { Section } from "../types";

export const getExamSections = async (examId: string): Promise<Section[]> => {
  const sectionsRef = collection(db, `exams/${examId}/sections`);
  const q = query(sectionsRef, orderBy("order", "asc"));
  return FirestoreRepository.getQuery<Section>(`sections:${examId}`, q, {
    ttlMs: 3 * 60 * 1000,
    collectionName: `exams/${examId}/sections`,
    purpose: "getExamSections",
  });
};

export const createSection = async (examId: string, sectionData: Omit<Section, "id">): Promise<Section> => {
  const sectionsRef = collection(db, `exams/${examId}/sections`);
  const docRef = doc(sectionsRef);
  await FirestoreRepository.setDocument(`exams/${examId}/sections`, docRef.id, sectionData, {}, { purpose: "createSection" });
  FirestoreCache.invalidate(`query:sections:${examId}`);
  return { id: docRef.id, ...sectionData } as Section;
};

export const updateSection = async (examId: string, sectionId: string, updates: Partial<Section>): Promise<void> => {
  await FirestoreRepository.updateDocument(
    `exams/${examId}/sections`,
    sectionId,
    updates,
    { purpose: "updateSection" }
  );
  FirestoreCache.invalidate(`query:sections:${examId}`);
};

export const deleteSection = async (examId: string, sectionId: string, deleteQuestions = false): Promise<void> => {
  await FirestoreRepository.deleteDocument(`exams/${examId}/sections`, sectionId, { purpose: "deleteSection" });
  FirestoreCache.invalidate(`query:sections:${examId}`);

  try {
    const qRef = collection(db, `exams/${examId}/questions`);
    const qSnap = await getDocs(query(qRef, where("sectionId", "==", sectionId)));
    if (!qSnap.empty) {
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
  const batch = writeBatch(db);
  sections.forEach((sec) => {
    const docRef = doc(db, `exams/${examId}/sections`, sec.id);
    batch.update(docRef, { order: sec.order });
  });
  await batch.commit();
  FirestoreCache.invalidate(`query:sections:${examId}`);
};
