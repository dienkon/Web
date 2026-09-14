import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase/config";

const MASTERY_COLLECTION = "student_review_mastery";

export interface ReviewMasteryDoc {
  studentUsername: string;
  originalExamId: string;
  correctedQuestionIds: string[];
  updatedAt?: any;
}

const getLocalKey = (studentUsername: string) => `review_mastery_${studentUsername}`;

/**
 * Reads local cached mastery map for a student
 * Returns Record<originalExamId, correctedQuestionIds[]>
 */
export const getLocalMastery = (studentUsername: string): Record<string, string[]> => {
  if (!studentUsername) return {};
  try {
    const raw = localStorage.getItem(getLocalKey(studentUsername));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

/**
 * Saves local cached mastery map for a student
 */
export const saveLocalMastery = (studentUsername: string, data: Record<string, string[]>) => {
  if (!studentUsername) return;
  try {
    localStorage.setItem(getLocalKey(studentUsername), JSON.stringify(data));
  } catch {}
};

/**
 * Records newly corrected question IDs for a student on their original exam(s).
 * Called immediately when a retake or review exam is submitted and graded.
 */
export const recordQuestionMastery = async (
  studentUsername: string,
  items: { questionId: string; originalExamId: string }[]
): Promise<void> => {
  if (!studentUsername || items.length === 0) return;

  // Group by originalExamId
  const byExam = new Map<string, string[]>();
  for (const item of items) {
    if (!item.originalExamId || !item.questionId) continue;
    const list = byExam.get(item.originalExamId) || [];
    if (!list.includes(item.questionId)) {
      list.push(item.questionId);
    }
    byExam.set(item.originalExamId, list);
  }

  // 1. Update local storage cache immediately for instant UI responsiveness
  const localMap = getLocalMastery(studentUsername);
  for (const [examId, qIds] of byExam.entries()) {
    const existing = localMap[examId] || [];
    const merged = Array.from(new Set([...existing, ...qIds]));
    localMap[examId] = merged;
  }
  saveLocalMastery(studentUsername, localMap);

  // 2. Persist to Firestore asynchronously
  for (const [examId, qIds] of byExam.entries()) {
    try {
      const cleanDocId = `${studentUsername}_${examId}`.replace(/[\/\s]/g, "_");
      const docRef = doc(db, MASTERY_COLLECTION, cleanDocId);

      const snap = await getDoc(docRef);
      console.warn(`[Firestore] READ (1 doc): ${MASTERY_COLLECTION}/${cleanDocId} (check existing mastery)`);

      let finalIds = qIds;
      if (snap.exists()) {
        const prev = snap.data()?.correctedQuestionIds || [];
        finalIds = Array.from(new Set([...prev, ...qIds]));
      }

      console.warn(`[Firestore] WRITE (1 doc): ${MASTERY_COLLECTION}/${cleanDocId} (update ${finalIds.length} corrected questions)`);
      await setDoc(
        docRef,
        {
          studentUsername,
          originalExamId: examId,
          correctedQuestionIds: finalIds,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Could not persist student review mastery to Firestore:", err);
    }
  }
};

/**
 * Fetches the set of question IDs that the student has corrected for a specific original exam.
 * Checks local storage first, then Firestore.
 */
export const getMasteredQuestionsForExam = async (
  studentUsername: string,
  examId: string
): Promise<Set<string>> => {
  if (!studentUsername || !examId) return new Set();

  const local = getLocalMastery(studentUsername);
  if (local[examId] && Array.isArray(local[examId])) {
    return new Set(local[examId]);
  }

  try {
    const cleanDocId = `${studentUsername}_${examId}`.replace(/[\/\s]/g, "_");
    const docRef = doc(db, MASTERY_COLLECTION, cleanDocId);
    const snap = await getDoc(docRef);
    console.warn(`[Firestore] READ (1 doc): ${MASTERY_COLLECTION}/${cleanDocId} (found: ${snap.exists()})`);
    if (snap.exists()) {
      const qIds = snap.data()?.correctedQuestionIds || [];
      local[examId] = qIds;
      saveLocalMastery(studentUsername, local);
      return new Set(qIds);
    }
  } catch (err) {
    console.warn("Could not fetch student review mastery from Firestore:", err);
  }

  return new Set();
};
