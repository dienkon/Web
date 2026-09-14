import { collection, doc, getDoc, getDocs, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase/config";
import type { Question, Submission, Exam } from "../types";
import { evaluateQuestionAnswer } from "../utils/attemptAnalytics";
import { clearActiveExamSession } from "./examSessionService";
import { getOrCreateStudentFolder } from "./folderService";

const EXAMS_COLLECTION = "exams";

/**
 * Normalizes question text for robust deduplication across different question IDs
 */
export function getQuestionSignature(q: Question): string {
  if (q.id && q.id.trim()) {
    return q.id.trim();
  }
  const cleanText = (q.text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .trim();
  return cleanText || String(Math.random());
}

/**
 * Deduplicates questions based on ID and normalized content.
 * Guarantees no two questions in the result share the same signature or text.
 */
export function deduplicateQuestions(questions: Question[]): Question[] {
  const seenSignatures = new Set<string>();
  const seenTexts = new Set<string>();
  const result: Question[] = [];

  for (const q of questions) {
    if (!q) continue;
    const sig = q.id?.trim();
    const textSig = (q.text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    if (sig && seenSignatures.has(sig)) {
      continue;
    }
    if (textSig && textSig.length > 5 && seenTexts.has(textSig)) {
      continue;
    }

    if (sig) seenSignatures.add(sig);
    if (textSig && textSig.length > 5) seenTexts.add(textSig);

    result.push(q);
  }

  return result;
}

/**
 * Extracts and filters questions from an exam and its submission
 * according to the retake mode: 'all' | 'correct' | 'wrong'
 */
export function filterQuestionsBySubmission(
  questions: Question[],
  submission: Submission,
  mode: "all" | "correct" | "wrong"
): Question[] {
  if (mode === "all") {
    return deduplicateQuestions(questions);
  }

  const pointPerQuestion =
    questions.length > 0 ? (submission.maxScore || 10) / questions.length : 1;

  const filtered = questions.filter((q) => {
    const studentAns = submission.answers?.[q.id];
    const evalResult = evaluateQuestionAnswer(q, studentAns, pointPerQuestion);

    if (mode === "correct") {
      return evalResult.isCorrect;
    } else {
      // mode === 'wrong' includes incorrect or unanswered
      return !evalResult.isCorrect;
    }
  });

  return deduplicateQuestions(filtered);
}

/**
 * Fetches all questions for a given exam from Firestore (handling both monolithic questions array and subcollections)
 */
export async function getExamQuestionsSafe(examId: string, fallbackQuestions?: Question[]): Promise<Question[]> {
  if (fallbackQuestions && fallbackQuestions.length > 0) {
    return fallbackQuestions;
  }

  try {
    const examDoc = await getDoc(doc(db, EXAMS_COLLECTION, examId));
    console.warn(`[Firestore] READ (1 doc): ${EXAMS_COLLECTION}/${examId} (safe question loader)`);
    if (examDoc.exists()) {
      const data = examDoc.data();
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        return data.questions as Question[];
      }
    }

    // Fallback: Check subcollection
    const qSnap = await getDocs(collection(db, `${EXAMS_COLLECTION}/${examId}/questions`));
    console.warn(`[Firestore] READ_MANY (${qSnap.size} docs): ${EXAMS_COLLECTION}/${examId}/questions (subcollection fallback)`);
    if (!qSnap.empty) {
      const qs = qSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
      qs.sort((a, b) => (a.order || 0) - (b.order || 0));
      return qs;
    }
  } catch (err) {
    console.error("Error fetching questions for examId:", examId, err);
  }

  return [];
}

export interface CreateRetakeOptions {
  originalExam: Exam;
  submission: Submission;
  mode: "all" | "correct" | "wrong";
  questions?: Question[];
}

/**
 * Prepares and launches a retake exam session.
 * For 'all', can reset the attempt snapshot and session.
 * For 'correct' or 'wrong', generates a focused practice exam in Firestore.
 */
export async function createRetakeExam(options: CreateRetakeOptions): Promise<string> {
  const { originalExam, submission, mode } = options;
  const examId = originalExam.id || submission.examId;

  // Retrieve student identifier and display name
  let studentIdentifier = "student";
  let studentDisplayName = "";
  try {
    const sInfo = localStorage.getItem("student_info") || localStorage.getItem("current_student_session");
    if (sInfo) {
      const parsed = JSON.parse(sInfo);
      studentIdentifier = parsed.username || parsed.displayName || "student";
      studentDisplayName = parsed.displayName || parsed.name || "";
    }
  } catch {}

  // 1. If mode === 'all': Fresh start for the existing exam
  if (mode === "all") {
    // Clear in-progress session and snapshot
    clearActiveExamSession(examId);
    try {
      localStorage.removeItem(`attemptSnapshot_${examId}_${studentIdentifier}`);
    } catch {}
    return examId;
  }

  // 2. If mode is 'correct' or 'wrong': Create a focused practice exam inside student folder
  const rawQuestions = await getExamQuestionsSafe(
    examId,
    submission.shuffledQuestionsSnapshot || options.questions
  );

  const filteredQuestions = filterQuestionsBySubmission(rawQuestions, submission, mode);

  if (filteredQuestions.length === 0) {
    throw new Error(
      mode === "correct"
        ? "Bạn chưa có câu trả lời đúng nào trong bài thi này."
        : "Chúc mừng! Bạn không có câu sai nào trong bài thi này."
    );
  }

  // Find or create Drive/Học sinh/<Tên học sinh> folder
  let studentFolderId: string | null = null;
  try {
    studentFolderId = await getOrCreateStudentFolder(studentIdentifier, studentDisplayName);
  } catch (fErr) {
    console.warn("Could not get or create student folder:", fErr);
  }

  // Re-index question orders
  const preparedQuestions: Question[] = filteredQuestions.map((q, idx) => ({
    ...q,
    order: idx,
    originalExamId: examId,
  }));

  const modeLabel = mode === "correct" ? "Làm lại câu đúng" : "Làm lại câu sai";
  const originalDuration = originalExam.duration || originalExam.timeLimit || 45;
  const scaledDuration = Math.max(
    5,
    Math.min(
      originalDuration,
      Math.round((originalDuration * preparedQuestions.length) / Math.max(1, rawQuestions.length))
    )
  );

  const docRef = doc(collection(db, EXAMS_COLLECTION));
  const newExamData = {
    title: `[${modeLabel}] ${originalExam.title || submission.examTitleSnapshot || "Đề thi"}`,
    code: `RETAKE_${Date.now().toString().slice(-4)}`,
    description: `Bài làm lại ${mode === "correct" ? "các câu đúng" : "các câu sai"} từ bài thi gốc. Tổng cộng ${preparedQuestions.length} câu hỏi.`,
    folderId: studentFolderId,
    timeLimit: scaledDuration,
    duration: scaledDuration,
    questionCount: preparedQuestions.length,
    totalQuestions: preparedQuestions.length,
    maxScore: originalExam.maxScore || 10,
    questions: preparedQuestions,
    sections: [],
    status: "unlisted" as const,
    visibility: "unlisted" as const,
    isPublic: false,
    isPractice: true,
    isRetake: true,
    creatorUsername: studentIdentifier,
    creatorRole: "student",
    originalExamId: examId,
    shuffleQuestions: false,
    shuffleOptions: originalExam.shuffleOptions ?? false,
    showResults: true,
    showDetails: true,
    allowSubExam: false,
    maxAttempts: 0,
    showResultsImmediately: true,
    allowReview: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  console.warn(`[Firestore] WRITE (1 doc): ${EXAMS_COLLECTION}/${docRef.id} (retake exam, folder: ${studentFolderId}, unlisted)`);
  await setDoc(docRef, newExamData);

  // Clear any existing session for the new exam ID
  clearActiveExamSession(docRef.id);
  try {
    localStorage.removeItem(`attemptSnapshot_${docRef.id}_${studentIdentifier}`);
  } catch {}

  return docRef.id;
}

export interface ReviewExamAggregateItem {
  exam: Exam;
  submission?: Submission;
  questions?: Question[];
}

export interface CreateAggregatedReviewOptions {
  items: ReviewExamAggregateItem[];
  mode: "all" | "wrong";
  customDuration?: number;
  shuffleQuestions?: boolean;
}

/**
 * Creates an aggregated review exam from multiple selected exams.
 * Mode 'all': Merges all questions from N exams, eliminating duplicates.
 * Mode 'wrong': Inspects each exam's submission, filters to wrong questions, and eliminates duplicates.
 */
export async function createAggregatedReviewExam(
  options: CreateAggregatedReviewOptions
): Promise<{ examId: string; totalQuestions: number; duration: number }> {
  const { items, mode, customDuration, shuffleQuestions = true } = options;

  if (!items || items.length === 0) {
    throw new Error("Vui lòng chọn ít nhất 1 bài thi để ôn tập.");
  }

  let aggregatedQuestions: Question[] = [];

  for (const item of items) {
    const rawQuestions = await getExamQuestionsSafe(
      item.exam.id,
      item.submission?.shuffledQuestionsSnapshot || item.questions || item.exam.questions
    );

    if (mode === "all") {
      aggregatedQuestions.push(...rawQuestions);
    } else if (mode === "wrong") {
      if (item.submission) {
        const wrongQs = filterQuestionsBySubmission(rawQuestions, item.submission, "wrong");
        aggregatedQuestions.push(...wrongQs);
      } else {
        // If no submission provided for this item, keep questions as fallback
        aggregatedQuestions.push(...rawQuestions);
      }
    }
  }

  // Deduplicate strictly
  const deduplicated = deduplicateQuestions(aggregatedQuestions);

  if (deduplicated.length === 0) {
    throw new Error(
      mode === "wrong"
        ? "Tuyệt vời! Bạn không có câu sai nào trong các bài thi đã chọn."
        : "Không tìm thấy câu hỏi nào trong các bài thi đã chọn."
    );
  }

  // Shuffle or keep sequential
  let finalQuestions = [...deduplicated];
  if (shuffleQuestions) {
    for (let i = finalQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalQuestions[i], finalQuestions[j]] = [finalQuestions[j], finalQuestions[i]];
    }
  }

  // Re-index and preserve originalExamId
  finalQuestions = finalQuestions.map((q, idx) => ({
    ...q,
    order: idx,
    originalExamId: (q as any).originalExamId || (q as any).examId || null,
  }));

  const modeTitle = mode === "all" ? "Ôn tập tổng hợp" : "Chinh phục câu sai";
  const estimatedDuration =
    customDuration ||
    Math.max(10, Math.min(180, Math.round(finalQuestions.length * 1.5)));

  // Retrieve student identifier and display name
  let studentIdentifier = "student";
  let studentDisplayName = "";
  try {
    const sInfo = localStorage.getItem("student_info") || localStorage.getItem("current_student_session");
    if (sInfo) {
      const parsed = JSON.parse(sInfo);
      studentIdentifier = parsed.username || parsed.displayName || "student";
      studentDisplayName = parsed.displayName || parsed.name || "";
    }
  } catch {}

  // Find or create Drive/Học sinh/<Tên học sinh> folder
  let studentFolderId: string | null = null;
  try {
    studentFolderId = await getOrCreateStudentFolder(studentIdentifier, studentDisplayName);
  } catch (fErr) {
    console.warn("Could not get or create student folder:", fErr);
  }

  const docRef = doc(collection(db, EXAMS_COLLECTION));
  const newExamData = {
    title: `${modeTitle} (${items.length} đề thi)`,
    code: `REV_${Date.now().toString().slice(-4)}`,
    description: `Bài kiểm tra ôn tập tự động từ ${items.length} đề thi bạn đã chọn. Gồm ${finalQuestions.length} câu hỏi không trùng lặp.`,
    folderId: studentFolderId,
    timeLimit: estimatedDuration,
    duration: estimatedDuration,
    questionCount: finalQuestions.length,
    totalQuestions: finalQuestions.length,
    maxScore: 10,
    questions: finalQuestions,
    sections: [],
    status: "unlisted" as const,
    visibility: "unlisted" as const,
    isPublic: false,
    isPractice: true,
    isRetake: true,
    isAggregatedReview: true,
    sourceExamCount: items.length,
    creatorUsername: studentIdentifier,
    creatorRole: "student",
    shuffleQuestions: false,
    shuffleOptions: false,
    showResults: true,
    showDetails: true,
    allowSubExam: false,
    maxAttempts: 0,
    showResultsImmediately: true,
    allowReview: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  console.warn(`[Firestore] WRITE (1 doc): ${EXAMS_COLLECTION}/${docRef.id} (aggregated review exam, folder: ${studentFolderId}, unlisted)`);
  await setDoc(docRef, newExamData);

  // Clear any existing session for the new exam ID
  clearActiveExamSession(docRef.id);
  try {
    localStorage.removeItem(`attemptSnapshot_${docRef.id}_${studentIdentifier}`);
  } catch {}

  return {
    examId: docRef.id,
    totalQuestions: finalQuestions.length,
    duration: estimatedDuration,
  };
}
