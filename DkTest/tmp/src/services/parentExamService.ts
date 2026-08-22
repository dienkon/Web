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
 * Creates and saves an unlisted/private exam authored by a parent,
 * saves questions in batch, and returns the direct shareable link for children.
 */
export async function saveParentExam({
  parentUsername,
  parentDisplayName,
  title,
  timeLimit,
  questions,
}: {
  parentUsername: string;
  parentDisplayName: string;
  title: string;
  timeLimit: number;
  questions: Question[];
}): Promise<{ exam: Exam; shareLink: string }> {
  // 1. Create unique doc in exams collection
  const examRef = doc(collection(db, "exams"));
  const examId = examRef.id;
  const examCode = `PH-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const examData: Omit<Exam, "id"> = {
    title: title.trim() || "Đề thi tự luyện cho con",
    code: examCode,
    description: `Đề thi do phụ huynh ${parentDisplayName || parentUsername} biên soạn.`,
    timeLimit: timeLimit || 45,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResults: true,
    showDetails: true,
    allowSubExam: false,
    maxAttempts: 10,
    status: "unlisted", // LUÔN LUÔN Ở DẠNG KHÔNG CÔNG KHAI
    isPublic: false,
    visibility: "unlisted",
    questionCount: questions.length,
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
  };

  await setDoc(examRef, {
    ...examData,
    creatorUsername: parentUsername,
    creatorRole: "parent",
  });

  // 2. Batch write all questions into exams/{examId}/questions
  if (questions.length > 0) {
    const batch = writeBatch(db);
    questions.forEach((q, idx) => {
      const qRef = doc(collection(db, `exams/${examId}/questions`));
      const questionPayload: any = {
        examId,
        order: idx,
        type: q.type || "single_choice",
        text: q.text || `Câu hỏi ${idx + 1}`,
        points: q.points || 1,
        explanation: q.explanation || "",
      };

      if (q.options && q.options.length > 0) {
        questionPayload.options = q.options;
      }
      if (q.correctOptionIds && q.correctOptionIds.length > 0) {
        questionPayload.correctOptionIds = q.correctOptionIds;
      }
      if (q.statements && q.statements.length > 0) {
        questionPayload.statements = q.statements;
      }
      if (q.acceptedAnswers && q.acceptedAnswers.length > 0) {
        questionPayload.acceptedAnswers = q.acceptedAnswers;
      }

      batch.set(qRef, questionPayload);
    });
    await batch.commit();
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
    const q = query(
      collection(db, "exams"),
      where("creatorUsername", "==", parentUsername)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam));
  } catch (err) {
    console.error("Error fetching parent exams:", err);
    return [];
  }
}
