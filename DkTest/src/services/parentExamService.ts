import {
  collection,
  doc,
  getDocs,
  query,
  where,
  setDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase/config";
import type { Exam, Question } from "../types";
import { getOrCreateParentFolder } from "./folderService";

export interface ParentCreatedExam {
  id: string;
  title: string;
  code: string;
  creatorUsername: string;
  timeLimit: number;
  questionCount: number;
  status: "unlisted" | "draft" | "published";
  isPublic: boolean;
  visibility: "unlisted" | "private";
  shareUrl: string;
  createdAt: any;
}

/**
 * Helper to sanitize object for Firestore (removes undefined)
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj;
  if (
    typeof obj.toDate === "function" ||
    typeof obj.toMillis === "function" ||
    obj._methodName !== undefined ||
    (obj.constructor && obj.constructor.name === "FieldValue")
  ) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
  }
  const cleanObj: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      cleanObj[key] = sanitizeForFirestore(val);
    }
  }
  return cleanObj;
}

/**
 * Creates and saves an unlisted/private exam authored by a parent,
 * ensures it is organized in Drive gốc/Phụ huynh/<Phụ huynh tên>,
 * and returns the direct shareable link for children.
 */
export async function saveParentExam({
  parentUsername,
  parentDisplayName,
  title,
  timeLimit,
  questions,
  subject,
  grade,
}: {
  parentUsername: string;
  parentDisplayName: string;
  title: string;
  timeLimit: number;
  questions: Question[];
  subject?: string;
  grade?: string;
}): Promise<{ exam: Exam; shareLink: string }> {
  // 1. Auto create / retrieve Parent Folder (Phụ huynh / <parentDisplayName>)
  let finalFolderId: string | null = null;
  try {
    finalFolderId = await getOrCreateParentFolder(parentUsername, parentDisplayName || parentUsername);
  } catch (err) {
    console.warn("Could not create/get parent folder:", err);
  }

  // 2. Create unique doc in exams collection
  const examRef = doc(collection(db, "exams"));
  const examId = examRef.id;
  const examCode = `PH-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const cleanQuestions = questions.map((q, idx) => ({
    id: q.id || `q_${Date.now()}_${idx}`,
    examId,
    order: idx,
    type: q.type || "single_choice",
    text: q.text || `Câu hỏi ${idx + 1}`,
    points: q.points ?? 1,
    options: q.options || [],
    correctOptionIds: q.correctOptionIds || [],
    statements: q.statements || [],
    acceptedAnswers: q.acceptedAnswers || [],
    explanation: q.explanation || "",
  }));

  const examData: Record<string, any> = {
    title: title.trim() || "Đề thi tự luyện cho con",
    code: examCode,
    description: `Đề thi do phụ huynh ${parentDisplayName || parentUsername} biên soạn.`,
    timeLimit: timeLimit || 45,
    subject: subject || "Toán",
    gradeCategory: grade || "Lớp 12",
    shuffleQuestions: false,
    shuffleOptions: false,
    showResults: true,
    showDetails: true,
    allowSubExam: false,
    maxAttempts: 10,
    status: "unlisted", // BẮT BUỘC Ở DẠNG KHÔNG CÔNG KHAI
    isPublic: false,
    visibility: "private",
    folderId: finalFolderId,
    ownerId: parentUsername,
    questionCount: cleanQuestions.length,
    questions: cleanQuestions,
    sections: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const payload = sanitizeForFirestore({
    ...examData,
    creatorUsername: parentUsername,
    creatorRole: "parent",
  });

  await setDoc(examRef, payload);

  // 3. Batch write all questions into exams/{examId}/questions subcollection for legacy support
  if (cleanQuestions.length > 0) {
    try {
      const batch = writeBatch(db);
      cleanQuestions.forEach((q, idx) => {
        const qRef = doc(collection(db, `exams/${examId}/questions`));
        batch.set(qRef, sanitizeForFirestore({ ...q, examId, order: idx }));
      });
      await batch.commit();
    } catch (e) {
      console.warn("Batch subcollection write warning:", e);
    }
  }

  const origin = window.location.origin;
  const shareLink = `${origin}/student/exam/${examId}`;

  return {
    exam: { id: examId, ...examData } as Exam,
    shareLink,
  };
}

/**
 * Get all exams created by a specific parent
 */
export async function getParentCreatedExams(parentUsername: string): Promise<Exam[]> {
  try {
    const map = new Map<string, Exam>();

    // 1. Query by creatorUsername
    try {
      const q1 = query(
        collection(db, "exams"),
        where("creatorUsername", "==", parentUsername)
      );
      const snap1 = await getDocs(q1);
      snap1.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as Exam));
    } catch (e) {
      console.warn("Error querying exams by creatorUsername:", e);
    }

    // 2. Query by ownerId
    try {
      const q2 = query(
        collection(db, "exams"),
        where("ownerId", "==", parentUsername)
      );
      const snap2 = await getDocs(q2);
      snap2.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as Exam));
    } catch (e) {
      console.warn("Error querying exams by ownerId:", e);
    }

    const list = Array.from(map.values());
    list.sort((a, b) => {
      const tA = (a.createdAt as any)?.seconds || 0;
      const tB = (b.createdAt as any)?.seconds || 0;
      return tB - tA;
    });
    return list;
  } catch (err) {
    console.error("Error fetching parent exams:", err);
    return [];
  }
}
