import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, startAfter, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase/config";
import { Exam, PaginatedResult } from "../types";
import { logDocRead, logQueryRead, logDocWrite } from "../utils/firestoreLogger";
import { deleteExamActiveSessionsFromRtdb } from "./realtimeProctoringService";
import { FirestoreRepository } from "./firebase/firestoreRepository";
const EXAMS_COLLECTION = "exams";

import { FirestoreCache } from "./firebase/firestoreCache";
import {
  getExamsCatalogSummary,
  syncExamToCatalogSummary,
  getExamTimestampMs,
  type ExamSummaryItem,
} from "./statsAggregatorService";

import { invalidateHomeTopCache } from "./examCacheService";

export const getExamList = async ({
  pageSize = 10,
  cursor = null,
  ownerId = null,
  folderId = undefined,
  subject = undefined,
  gradeCategory = undefined,
  isFeatured = undefined,
  forceRefresh = false,
}: {
  pageSize?: number;
  cursor?: any;
  ownerId?: string | null;
  folderId?: string | null | undefined;
  subject?: string | undefined;
  gradeCategory?: string | undefined;
  isFeatured?: boolean | undefined;
  forceRefresh?: boolean;
}): Promise<PaginatedResult<Exam>> => {
  try {
    const cursorKey = cursor ? (typeof cursor === "string" ? cursor : cursor.id || "c") : "start";
    const cacheKey = `query:exams:${ownerId || "all"}:${folderId ?? "all"}:${subject || "all"}:${gradeCategory || "all"}:${isFeatured ?? "all"}:${pageSize}:${cursorKey}`;

    if (forceRefresh) {
      FirestoreCache.invalidatePrefix("query:exams");
      FirestoreCache.invalidatePrefix("doc:exams");
      FirestoreCache.invalidate("doc:system_stats:exams_summary");
    } else {
      const cached = FirestoreCache.get<PaginatedResult<Exam>>(cacheKey);
      if (cached && Array.isArray(cached.items)) {
        return cached;
      }
    }

    // DIRECT FIRESTORE READ - PRIORITY #1 (Source of Truth)
    let q = collection(db, EXAMS_COLLECTION) as any;
    const conditions: any[] = [];

    if (ownerId) conditions.push(where("ownerId", "==", ownerId));
    if (folderId !== undefined) conditions.push(where("folderId", "==", folderId));
    if (subject && subject !== "all") conditions.push(where("subject", "==", subject));
    if (gradeCategory && gradeCategory !== "all") conditions.push(where("gradeCategory", "==", gradeCategory));
    if (isFeatured !== undefined) conditions.push(where("isFeatured", "==", isFeatured));

    if (conditions.length > 0) {
      q = query(q, ...conditions);
    }

    const t0 = performance.now();
    const snapshot = await getDocs(q);
    logQueryRead(EXAMS_COLLECTION, snapshot.size, `getExamList direct firestore`, pageSize, performance.now() - t0);

    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) } as Exam));
    
    // Robust sorting by newest first (updatedAt desc, fallback to createdAt desc)
    items.sort((a: any, b: any) => {
      const timeA = getExamTimestampMs(a.updatedAt) || getExamTimestampMs(a.createdAt);
      const timeB = getExamTimestampMs(b.updatedAt) || getExamTimestampMs(b.createdAt);
      return timeB - timeA;
    });

    let startIndex = 0;
    if (cursor) {
      const cursorId = typeof cursor === "string" ? cursor : cursor?.id;
      if (cursorId) {
        const idx = items.findIndex((e) => e.id === cursorId);
        if (idx >= 0) startIndex = idx + 1;
      }
    }

    const paged = items.slice(startIndex, startIndex + pageSize);
    const nextCursor = paged.length > 0 ? { id: paged[paged.length - 1].id } : null;
    
    const result: PaginatedResult<Exam> = {
      items: paged,
      nextCursor,
      hasMore: startIndex + pageSize < items.length,
    };

    // Cache briefly in RAM (15 seconds TTL) for instant back-and-forth clicks
    FirestoreCache.set(cacheKey, result, 15 * 1000);

    return result;
  } catch (err) {
    console.error("Error fetching exam list from Firestore:", err);
    throw err;
  }
};

export const getExam = async (examId: string, forceRefresh = false): Promise<Exam | null> => {
  return FirestoreRepository.getDocument<Exam>(EXAMS_COLLECTION, examId, {
    ttlMs: 30 * 1000,
    forceRefresh,
    purpose: "getExam",
  });
};

export const createExam = async (examData: Omit<Exam, "id" | "createdAt" | "updatedAt">): Promise<Exam> => {
  const docRef = doc(collection(db, EXAMS_COLLECTION));
  const newExam = {
    ...examData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await FirestoreRepository.setDocument(EXAMS_COLLECTION, docRef.id, newExam, {}, { purpose: "createExam" });
  
  const created = { id: docRef.id, ...newExam, createdAt: new Date() as any, updatedAt: new Date() as any } as Exam;
  
  // Invalidate in-memory caches immediately
  FirestoreCache.invalidate("doc:system_stats:exams_summary");
  FirestoreCache.invalidatePrefix("doc:exams");
  FirestoreCache.invalidatePrefix("query:exams");
  invalidateHomeTopCache();

  // Sync to 1-read catalog summary (await to guarantee write committed)
  try {
    await syncExamToCatalogSummary(created as any, "upsert");
  } catch (e) {
    console.warn("[examService] Warning syncing new exam to catalog:", e);
  }

  return created;
};

export const updateExam = async (examId: string, updates: Partial<Exam>): Promise<void> => {
  await FirestoreRepository.updateDocument(
    EXAMS_COLLECTION,
    examId,
    {
      ...updates,
      updatedAt: serverTimestamp(),
    },
    { purpose: "updateExam" }
  );

  // Invalidate in-memory caches immediately
  FirestoreCache.invalidate("doc:system_stats:exams_summary");
  FirestoreCache.invalidate(`doc:exams:${examId}`);
  FirestoreCache.invalidatePrefix("doc:exams");
  FirestoreCache.invalidatePrefix("query:exams");
  invalidateHomeTopCache();

  // Sync to 1-read catalog summary (await to guarantee write committed)
  try {
    await syncExamToCatalogSummary({ id: examId, ...updates } as any, "upsert");
  } catch (e) {
    console.warn("[examService] Warning syncing updated exam to catalog:", e);
  }
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

    // 5. Delete any active_sessions referencing this exam from RTDB (0 Firestore reads/writes)
    try {
      await deleteExamActiveSessionsFromRtdb(examId);
    } catch (sessErr) {
      console.warn("Could not delete active_sessions from RTDB", sessErr);
    }

    // 5.1 If it's a code exam, clean up from code_exams collection and localStorage
    try {
      await deleteDoc(doc(db, "code_exams", examId));
    } catch (codeErr) {
      // non-blocking
    }
    try {
      const localStr = localStorage.getItem("dktest_local_code_exams");
      if (localStr) {
        const local = JSON.parse(localStr);
        if (local[examId]) {
          delete local[examId];
          localStorage.setItem("dktest_local_code_exams", JSON.stringify(local));
        }
      }
    } catch (_) {}

    // Invalidate in-memory caches immediately
    FirestoreCache.invalidate("doc:system_stats:exams_summary");
    FirestoreCache.invalidate(`doc:exams:${examId}`);
    FirestoreCache.invalidatePrefix("doc:exams");
    FirestoreCache.invalidatePrefix("query:exams");
    invalidateHomeTopCache();

    // 6. Sync deletion to 1-read catalog summary
    try {
      await syncExamToCatalogSummary({ id: examId }, "delete");
    } catch (e) {
      console.warn("[examService] Warning syncing exam deletion to catalog:", e);
    }
  } catch (err) {
    console.error("Error deleting exam:", err);
    throw err;
  }
};
