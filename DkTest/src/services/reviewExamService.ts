import { collection, doc, getDoc, getDocs, setDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "./firebase/config";
import type { Question, Submission, Exam, Section } from "../types";
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
 * Returns all review questions directly without deduplication (per user directive).
 */
export function deduplicateQuestions(questions: Question[]): Question[] {
  return questions.filter(Boolean);
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
 * Fetches all questions for a given exam from Firestore (handling both monolithic questions array and subcollections),
 * ensuring the most complete question set is always loaded and no questions are missing.
 */
export async function getExamQuestionsSafe(examId: string, fallbackQuestions?: Question[]): Promise<Question[]> {
  let masterQuestions: Question[] = [];

  try {
    const examDoc = await getDoc(doc(db, EXAMS_COLLECTION, examId));
    console.warn(`[Firestore] READ (1 doc): ${EXAMS_COLLECTION}/${examId} (safe question loader)`);
    if (examDoc.exists()) {
      const data = examDoc.data();
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        masterQuestions = data.questions as Question[];
      }
    }

    // Fallback: Check subcollection if root document questions array is empty
    if (masterQuestions.length === 0) {
      const qSnap = await getDocs(collection(db, `${EXAMS_COLLECTION}/${examId}/questions`));
      console.warn(`[Firestore] READ_MANY (${qSnap.size} docs): ${EXAMS_COLLECTION}/${examId}/questions (subcollection fallback)`);
      if (!qSnap.empty) {
        const qs = qSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
        qs.sort((a, b) => (a.order || 0) - (b.order || 0));
        masterQuestions = qs;
      }
    }
  } catch (err) {
    console.error("Error fetching questions for examId:", examId, err);
  }

  // If master questions were found, return whichever has the most complete question set
  if (masterQuestions.length > 0) {
    if (fallbackQuestions && fallbackQuestions.length > masterQuestions.length) {
      return fallbackQuestions;
    }
    return masterQuestions;
  }

  if (fallbackQuestions && fallbackQuestions.length > 0) {
    return fallbackQuestions;
  }

  return [];
}

export interface CreateRetakeOptions {
  originalExam: Exam;
  submission: Submission;
  mode: "all" | "correct" | "wrong";
  questions?: Question[];
  sections?: Section[];
  durationMode?: "unlimited" | "auto" | "custom";
  customDuration?: number;
}

/**
 * Prepares and launches a retake exam session.
 * Fully inherits all authentic configuration from the original exam:
 * - Questions shuffling (`shuffleQuestions`), options shuffling (`shuffleOptions`),
 *   statements shuffling (`shuffleStatements`), and sections shuffling (`shuffleSections`).
 * - Preserves question-level constraints: `pinQuestion`, `shuffleOptions`, and `sectionId`.
 * - Preserves section-level constraints: `pinOrder`, `disableQuestionShuffle`, instructions, and titles.
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

  // 1. Fetch master exam document to guarantee inheritance of all authentic configurations and rules
  let masterExamData: any = originalExam || {};
  let masterSections: Section[] = Array.isArray(options.sections) && options.sections.length > 0
    ? options.sections
    : Array.isArray((originalExam as any)?.sections) && (originalExam as any).sections.length > 0
    ? (originalExam as any).sections
    : [];

  if (examId) {
    try {
      const eDoc = await getDoc(doc(db, EXAMS_COLLECTION, examId));
      if (eDoc.exists()) {
        const eData = eDoc.data();
        masterExamData = { ...eData, ...originalExam, id: examId };
        if (masterSections.length === 0 && Array.isArray(eData.sections) && eData.sections.length > 0) {
          masterSections = eData.sections;
        }
      }
    } catch (e) {
      console.warn("Could not fetch master exam doc:", e);
    }

    if (masterSections.length === 0) {
      try {
        const secSnap = await getDocs(
          query(collection(db, `${EXAMS_COLLECTION}/${examId}/sections`), orderBy("order", "asc"))
        );
        if (!secSnap.empty) {
          masterSections = secSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Section));
        }
      } catch (secErr) {
        console.warn("Could not fetch sections subcollection:", secErr);
      }
    }
  }

  // Inherit original shuffle rules
  const inheritShuffleQuestions = masterExamData.shuffleQuestions !== undefined
    ? Boolean(masterExamData.shuffleQuestions)
    : true;
  const inheritShuffleOptions = masterExamData.shuffleOptions !== undefined
    ? Boolean(masterExamData.shuffleOptions)
    : true;
  const inheritShuffleSections = masterExamData.shuffleSections !== undefined
    ? Boolean(masterExamData.shuffleSections)
    : false;
  const inheritShuffleStatements = masterExamData.shuffleStatements !== undefined
    ? Boolean(masterExamData.shuffleStatements)
    : inheritShuffleOptions;

  // 2. Load pristine master questions
  const masterQuestions = await getExamQuestionsSafe(
    examId,
    submission.shuffledQuestionsSnapshot || options.questions
  );

  const masterQuestionMap = new Map<string, Question>();
  masterQuestions.forEach((mq) => {
    if (mq.id) masterQuestionMap.set(mq.id, mq);
  });

  // Determine question pool for this submission attempt:
  // If the submission had a specific snapshot of questions (e.g. sub-exam or shuffled set),
  // we restrict to those questions, restoring clean master data (unshuffled options & statements) where possible.
  let attemptQuestions: Question[] = [];
  if (Array.isArray(submission.shuffledQuestionsSnapshot) && submission.shuffledQuestionsSnapshot.length > 0) {
    attemptQuestions = submission.shuffledQuestionsSnapshot.map((sq) => {
      const origKey = (sq as any).originalQuestionId || sq.id;
      const cleanMaster = masterQuestionMap.get(origKey) || masterQuestionMap.get(sq.id);
      return cleanMaster ? { ...cleanMaster, id: sq.id } : { ...sq };
    });
  } else if (Array.isArray(options.questions) && options.questions.length > 0) {
    attemptQuestions = options.questions.map((oq) => {
      const cleanMaster = masterQuestionMap.get(oq.id) || oq;
      return cleanMaster ? { ...cleanMaster, id: oq.id } : { ...oq };
    });
  } else {
    attemptQuestions = masterQuestions;
  }

  // 3. Filter by submission mode: 'all' | 'correct' | 'wrong'
  const filteredQuestions =
    mode === "all"
      ? attemptQuestions
      : filterQuestionsBySubmission(attemptQuestions, submission, mode);

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

  const docRef = doc(collection(db, EXAMS_COLLECTION));

  // Reconstruct relevant sections for the retake exam
  const activeSectionIds = new Set(filteredQuestions.map((q) => q.sectionId).filter(Boolean));
  const relevantSections: Section[] = masterSections
    .filter((sec) => activeSectionIds.has(sec.id))
    .map((sec, idx) => ({
      ...sec,
      order: idx,
      examId: docRef.id,
      questionCount: filteredQuestions.filter((q) => q.sectionId === sec.id).length,
    }));

  // Re-index question orders and assign distinct unique IDs while preserving individual constraints
  const cleanExam = String(examId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const preparedQuestions: Question[] = filteredQuestions.map((q, idx) => {
    const origId = (q as any).originalQuestionId || q.id || `q_${idx + 1}`;
    const cleanOrigId = String(origId).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueId = `retake_${cleanExam}_${cleanOrigId}_${idx + 1}_${Math.random().toString(36).slice(2, 7)}`;
    return {
      ...q,
      id: uniqueId,
      order: q.order !== undefined ? q.order : idx,
      sectionId: q.sectionId && activeSectionIds.has(q.sectionId) ? q.sectionId : null,
      originalExamId: examId,
      originalQuestionId: origId,
      pinQuestion: q.pinQuestion ?? false,
      shuffleOptions: q.shuffleOptions !== false,
      shuffleStatements: q.shuffleStatements !== false,
    };
  });

  const modeLabel =
    mode === "all"
      ? "Làm lại toàn bộ"
      : mode === "correct"
      ? "Làm lại câu đúng"
      : "Làm lại câu sai";

  const isUnlimited = options.durationMode === "unlimited" || options.customDuration === 0;
  const scaledDuration = isUnlimited
    ? 0
    : options.durationMode === "custom" && options.customDuration && options.customDuration > 0
    ? options.customDuration
    : Math.max(5, Math.min(180, Math.round(preparedQuestions.length * 1.5)));

  const newExamData = {
    title: `[${modeLabel}] ${originalExam.title || submission.examTitleSnapshot || "Đề thi"}`,
    code: `RETAKE_${Date.now().toString().slice(-4)}`,
    description: `Bài làm lại ${modeLabel.toLowerCase()} từ bài thi gốc. Tổng cộng ${preparedQuestions.length} câu hỏi.`,
    folderId: studentFolderId,
    timeLimit: scaledDuration,
    duration: scaledDuration,
    isUnlimitedTime: isUnlimited,
    unlimitedTime: isUnlimited,
    questionCount: preparedQuestions.length,
    totalQuestions: preparedQuestions.length,
    maxScore: originalExam.maxScore || 10,
    questions: preparedQuestions,
    sections: relevantSections,
    status: "unlisted" as const,
    visibility: "unlisted" as const,
    isPublic: false,
    isPractice: true,
    isRetake: true,
    creatorUsername: studentIdentifier,
    creatorRole: "student",
    originalExamId: examId,
    shuffleQuestions: inheritShuffleQuestions,
    shuffleOptions: inheritShuffleOptions,
    shuffleSections: inheritShuffleSections,
    shuffleStatements: inheritShuffleStatements,
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
  durationMode?: "unlimited" | "auto" | "custom";
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

  for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
    const item = items[itemIdx];
    const itemExamId = item.exam?.id || `exam_${itemIdx + 1}`;
    const rawQuestions = await getExamQuestionsSafe(
      item.exam.id,
      item.questions || item.submission?.shuffledQuestionsSnapshot || item.exam.questions
    );

    let currentQuestions: Question[] = [];
    if (mode === "all") {
      currentQuestions = rawQuestions;
    } else if (mode === "wrong") {
      if (item.submission) {
        currentQuestions = filterQuestionsBySubmission(rawQuestions, item.submission, "wrong");
      } else {
        // If no submission provided for this item, keep questions as fallback
        currentQuestions = rawQuestions;
      }
    }

    // Preserve original question ID and exam ID before merging
    const tagged = currentQuestions.map((q, qIdx) => ({
      ...q,
      originalQuestionId: (q as any).originalQuestionId || q.id || `q_${qIdx + 1}`,
      originalExamId: (q as any).originalExamId || itemExamId,
    }));

    aggregatedQuestions.push(...tagged);
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

  // Re-index and assign GUARANTEED UNIQUE IDs for each question to avoid duplicate React keys (e.g. 'q10') and state collisions
  finalQuestions = finalQuestions.map((q, idx) => {
    const origId = (q as any).originalQuestionId || q.id || `q${idx + 1}`;
    const origExam = (q as any).originalExamId || (q as any).examId || "ex";
    const cleanExam = String(origExam).replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanOrigId = String(origId).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueId = `agg_${cleanExam}_${cleanOrigId}_${idx + 1}_${Math.random().toString(36).slice(2, 7)}`;

    return {
      ...q,
      id: uniqueId,
      order: idx,
      sectionId: null,
      originalQuestionId: origId,
      originalExamId: origExam,
    };
  });

  const modeTitle = mode === "all" ? "Ôn tập tổng hợp" : "Chinh phục câu sai";
  const isUnlimited = options.durationMode === "unlimited" || customDuration === 0;
  const estimatedDuration = isUnlimited
    ? 0
    : options.durationMode === "custom" && customDuration && customDuration > 0
    ? customDuration
    : Math.max(5, Math.min(180, Math.round(finalQuestions.length * 1.5)));

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
    description: `Bài kiểm tra ôn tập tự động từ ${items.length} đề thi bạn đã chọn. Gồm ${finalQuestions.length} câu hỏi.`,
    folderId: studentFolderId,
    timeLimit: estimatedDuration,
    duration: estimatedDuration,
    isUnlimitedTime: isUnlimited,
    unlimitedTime: isUnlimited,
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
    shuffleQuestions: Boolean(shuffleQuestions),
    shuffleOptions: true,
    shuffleStatements: true,
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
