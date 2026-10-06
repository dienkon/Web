import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Question } from "../../types";
import { clearActiveExamSession } from "../../services/examSessionService";
import { getOrCreateStudentFolder } from "../../services/folderService";
import type { ReviewQuestionCandidate } from "./types";

export interface BuildReviewExamOptions {
  candidates: ReviewQuestionCandidate[];
  title?: string;
  description?: string;
  customDuration?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  sourceExamCount?: number;
}

export interface BuildReviewExamResult {
  examId: string;
  totalQuestions: number;
  duration: number;
}

/**
 * Creates a focused review exam in Firestore from the selected question candidates.
 * Preserves original question and exam provenance, assigns collision-free unique IDs,
 * sets unlisted visibility, and clears any previous local attempt snapshots.
 */
export async function buildReviewExam(
  options: BuildReviewExamOptions
): Promise<BuildReviewExamResult> {
  const {
    candidates,
    title,
    description,
    customDuration,
    shuffleQuestions = false,
    shuffleOptions = true,
    sourceExamCount = 1,
  } = options;

  if (!candidates || candidates.length === 0) {
    throw new Error("Không có câu hỏi nào được chọn để tạo đề ôn tập.");
  }

  // Retrieve student credentials
  let studentIdentifier = "student";
  let studentDisplayName = "";
  try {
    const sInfo =
      localStorage.getItem("student_info") ||
      localStorage.getItem("current_student_session");
    if (sInfo) {
      const parsed = JSON.parse(sInfo);
      studentIdentifier = parsed.username || parsed.displayName || "student";
      studentDisplayName = parsed.displayName || parsed.name || "";
    }
  } catch {}

  // Resolve student folder in Drive
  let studentFolderId: string | null = null;
  try {
    studentFolderId = await getOrCreateStudentFolder(
      studentIdentifier,
      studentDisplayName
    );
  } catch (fErr) {
    console.warn("Could not get or create student folder:", fErr);
  }

  // Work on candidates copy
  let finalCandidates = [...candidates];

  // Optional shuffle
  if (shuffleQuestions) {
    for (let i = finalCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalCandidates[i], finalCandidates[j]] = [
        finalCandidates[j],
        finalCandidates[i],
      ];
    }
  }

  // Transform candidates into Question objects with guaranteed unique rendering IDs and preserved provenance
  const preparedQuestions: Question[] = finalCandidates.map((c, idx) => {
    const origId = c.originalQuestionId || c.question.id || `q_${idx + 1}`;
    const origExam = c.sourceExamId || (c.question as any).examId || "ex";
    const cleanExam = String(origExam).replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanOrigId = String(origId).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueId = `agg_${cleanExam}_${cleanOrigId}_${idx + 1}`;

    return {
      ...c.question,
      id: uniqueId,
      order: idx,
      sectionId: null, // flatten sections for custom review session
      originalQuestionId: origId,
      originalExamId: origExam,
      shuffleOptions: shuffleOptions && (c.question.shuffleOptions ?? true),
    };
  });

  // Calculate duration (custom or 1.5 mins per question, clamp between 5 and 180 mins)
  const duration =
    customDuration && customDuration > 0
      ? customDuration
      : Math.max(5, Math.min(180, Math.round(preparedQuestions.length * 1.5)));

  const defaultTitle =
    sourceExamCount > 1
      ? `[Ôn tập tổng hợp] ${preparedQuestions.length} câu hỏi (${sourceExamCount} đề)`
      : `[Ôn tập theo yêu cầu] ${preparedQuestions.length} câu hỏi`;

  const docRef = doc(collection(db, "exams"));
  const newExamData = {
    title: title || defaultTitle,
    code: `REV_${Date.now().toString().slice(-4)}`,
    description:
      description ||
      `Đề thi ôn tập tự động tùy chỉnh gồm ${preparedQuestions.length} câu hỏi.`,
    folderId: studentFolderId,
    timeLimit: duration,
    duration: duration,
    questionCount: preparedQuestions.length,
    totalQuestions: preparedQuestions.length,
    maxScore: 10,
    questions: preparedQuestions,
    sections: [],
    status: "unlisted" as const,
    visibility: "unlisted" as const,
    isPublic: false,
    isPractice: true,
    isRetake: true,
    isAggregatedReview: sourceExamCount > 1,
    sourceExamCount,
    creatorUsername: studentIdentifier,
    creatorRole: "student",
    shuffleQuestions: false, // Questions already shuffled if requested
    shuffleOptions,
    showResults: true,
    showDetails: true,
    allowSubExam: false,
    maxAttempts: 0,
    showResultsImmediately: true,
    allowReview: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  console.warn(
    `[Firestore] WRITE (1 doc): exams/${docRef.id} (custom review exam, folder: ${studentFolderId}, unlisted)`
  );
  await setDoc(docRef, newExamData);

  // Clear in-progress session and snapshots for this generated exam ID
  clearActiveExamSession(docRef.id);
  try {
    localStorage.removeItem(`attemptSnapshot_${docRef.id}_${studentIdentifier}`);
  } catch {}

  return {
    examId: docRef.id,
    totalQuestions: preparedQuestions.length,
    duration,
  };
}
