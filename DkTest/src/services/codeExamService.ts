/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase/config";
import type { CodeExam, CodeSubmission } from "../types/codeExam";

const CODE_EXAMS_COLLECTION = "code_exams";
const CODE_SUBMISSIONS_COLLECTION = "code_submissions";

const LOCAL_STORAGE_CODE_EXAMS_KEY = "dktest_local_code_exams";
const LOCAL_STORAGE_CODE_SUBS_KEY = "dktest_local_code_submissions";

// Helper for LocalStorage fallback
function getLocalCodeExams(): Record<string, CodeExam> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CODE_EXAMS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalCodeExam(exam: CodeExam) {
  try {
    const map = getLocalCodeExams();
    map[exam.id] = exam;
    localStorage.setItem(LOCAL_STORAGE_CODE_EXAMS_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn("Could not save to localStorage:", e);
  }
}

/**
 * Save or update a CodeExam document
 */
export async function saveCodeExam(examData: Partial<CodeExam> & { id: string }): Promise<CodeExam> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${origin}/code-exam/${examData.id}`;

  const fullExam: CodeExam = {
    id: examData.id,
    title: examData.title || "Đề thi CODE tùy biến",
    code: examData.code || `CODE-${Date.now().toString().slice(-4)}`,
    description: examData.description || "",
    timeLimit: examData.timeLimit || 45,
    htmlContent: examData.htmlContent || "",
    cssContent: examData.cssContent || "",
    jsContent: examData.jsContent || "",
    solutionInstructions: examData.solutionInstructions || "",
    gradingKey: examData.gradingKey || {},
    authorId: examData.authorId || localStorage.getItem("user_id") || "admin",
    authorName: examData.authorName || "Giáo viên",
    status: examData.status || "published",
    isPublic: examData.isPublic ?? true,
    accessCode: examData.accessCode || "",
    shareUrl: examData.shareUrl || shareUrl,
    submissionCount: examData.submissionCount || 0,
    createdAt: examData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveLocalCodeExam(fullExam);

  try {
    const ref = doc(db, CODE_EXAMS_COLLECTION, fullExam.id);
    await setDoc(ref, {
      ...fullExam,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn("[CodeExamService] Firestore save error, backed up in localStorage:", err);
  }

  // Also sync to main exams collection so it integrates into standard system exams lists
  try {
    const mainExamRef = doc(db, "exams", fullExam.id);
    await setDoc(mainExamRef, {
      id: fullExam.id,
      title: fullExam.title,
      code: fullExam.code,
      description: fullExam.description,
      duration: fullExam.timeLimit,
      isPublished: fullExam.status === "published",
      isPublic: fullExam.isPublic,
      accessMode: fullExam.isPublic ? "public" : "private",
      accessPassword: fullExam.accessCode || "",
      examType: "code",
      shareUrl: fullExam.shareUrl,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    // optional sync
  }

  return fullExam;
}

/**
 * Get a CodeExam by ID
 */
export async function getCodeExam(id: string): Promise<CodeExam | null> {
  try {
    const ref = doc(db, CODE_EXAMS_COLLECTION, id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as CodeExam;
    }
  } catch (err) {
    console.warn("[CodeExamService] Firestore read error, checking localStorage:", err);
  }

  const local = getLocalCodeExams();
  return local[id] || null;
}

/**
 * Get all CodeExams
 */
export async function getAllCodeExams(): Promise<CodeExam[]> {
  const list: CodeExam[] = [];

  try {
    const q = query(collection(db, CODE_EXAMS_COLLECTION), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as CodeExam);
    });
  } catch (err) {
    console.warn("[CodeExamService] Firestore read all error, fallback to localStorage:", err);
  }

  // Merge with localStorage
  const localMap = getLocalCodeExams();
  const existingIds = new Set(list.map((it) => it.id));
  Object.values(localMap).forEach((item) => {
    if (!existingIds.has(item.id)) {
      list.push(item);
    }
  });

  return list;
}

/**
 * Delete a CodeExam
 */
export async function deleteCodeExam(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, CODE_EXAMS_COLLECTION, id));
  } catch (err) {
    console.warn("[CodeExamService] Firestore delete error:", err);
  }
  const local = getLocalCodeExams();
  delete local[id];
  localStorage.setItem(LOCAL_STORAGE_CODE_EXAMS_KEY, JSON.stringify(local));
}

/**
 * Submit Code Exam student answers
 */
export async function submitCodeExam(submission: Omit<CodeSubmission, "id" | "submittedAt">): Promise<CodeSubmission> {
  const subId = `csub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fullSub: CodeSubmission = {
    ...submission,
    id: subId,
    submittedAt: new Date().toISOString(),
  };

  try {
    const rawSubs = localStorage.getItem(LOCAL_STORAGE_CODE_SUBS_KEY);
    const subList = rawSubs ? JSON.parse(rawSubs) : [];
    subList.unshift(fullSub);
    localStorage.setItem(LOCAL_STORAGE_CODE_SUBS_KEY, JSON.stringify(subList));
  } catch {}

  try {
    const ref = doc(db, CODE_SUBMISSIONS_COLLECTION, subId);
    await setDoc(ref, {
      ...fullSub,
      submittedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("[CodeExamService] Submission save error in Firestore:", err);
  }

  return fullSub;
}
