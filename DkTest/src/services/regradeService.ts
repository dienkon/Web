import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase/config";
import type { Exam, Question, Submission } from "../types";

/**
 * Deeply sanitizes an object for Firestore by removing any undefined keys and converting undefined values.
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  // Check for Firestore ServerTimestamp / FieldValue sentinels (which have _methodName or similar)
  if (obj._methodName || (obj.constructor && obj.constructor.name === "FieldValueImpl")) {
    return obj;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}

export interface RegradeResult {
  submissionId: string;
  studentName: string;
  oldScore: number;
  newScore: number;
  oldCorrectCount: number;
  newCorrectCount: number;
  totalCount: number;
  changed: boolean;
}

/**
 * Calculates score for a given set of student answers against the latest question key definitions.
 */
export function evaluateSubmissionAnswers(
  answers: Record<string, any> = {},
  questions: Question[] = [],
  maxScore: number = 10
): { score: number; correctCount: number; totalCount: number; earnedPoints: number } {
  const totalCount = questions.length;
  if (totalCount === 0) {
    return { score: 0, correctCount: 0, totalCount: 0, earnedPoints: 0 };
  }

  const pointPerQuestion = maxScore / totalCount;
  let earnedPoints = 0;
  let correctCount = 0;

  for (const q of questions) {
    const studentAns = answers[q.id];
    if (studentAns === undefined || studentAns === null || studentAns === "") continue;

    if (q.type === "single_choice") {
      const isCorrect = q.correctOptionIds?.includes(studentAns as string);
      if (isCorrect) {
        earnedPoints += pointPerQuestion;
        correctCount++;
      }
    } else if (q.type === "multiple_choice") {
      const correctSet = new Set<string>(q.correctOptionIds || []);
      const ansSet = new Set<string>(Array.isArray(studentAns) ? studentAns : [studentAns]);
      const isCorrect =
        correctSet.size > 0 &&
        correctSet.size === ansSet.size &&
        [...correctSet].every((id) => ansSet.has(id));
      if (isCorrect) {
        earnedPoints += pointPerQuestion;
        correctCount++;
      }
    } else if (q.type === "true_false") {
      const stmts = q.statements || [];
      if (stmts.length > 0) {
        const pointPerStmt = pointPerQuestion / stmts.length;
        let correctInThisQ = 0;
        stmts.forEach((s) => {
          if (typeof studentAns === "object" && studentAns[s.id] === s.correctAnswer) {
            correctInThisQ++;
            earnedPoints += pointPerStmt;
          }
        });
        if (correctInThisQ === stmts.length) {
          correctCount++;
        }
      }
    } else if (q.type === "short_answer") {
      const accepted = q.acceptedAnswers?.map((a) => a.trim().toLowerCase()) || [];
      const isCorrect = accepted.includes(String(studentAns).trim().toLowerCase());
      if (isCorrect) {
        earnedPoints += pointPerQuestion;
        correctCount++;
      }
    }
  }

  const finalScore = Math.min(maxScore, Math.round(earnedPoints * 100) / 100);

  return {
    score: finalScore,
    correctCount,
    totalCount,
    earnedPoints,
  };
}

/**
 * Regrades a single submission against the latest version of its exam and questions.
 */
export async function regradeSingleSubmission(
  submissionId: string,
  targetExamId?: string
): Promise<{
  submission: Submission;
  regradeResult: RegradeResult;
}> {
  // 1. Fetch submission
  let subDoc = await getDoc(doc(db, "submissions", submissionId));
  if (!subDoc.exists() && targetExamId) {
    subDoc = await getDoc(doc(db, `exams/${targetExamId}/submissions`, submissionId));
  }

  if (!subDoc.exists()) {
    throw new Error("Không tìm thấy thông tin bài nộp này.");
  }

  const submission = { id: subDoc.id, ...subDoc.data() } as Submission;
  const examId = targetExamId || submission.examId;

  if (!examId) {
    throw new Error("Không xác định được mã bài thi của bài nộp này.");
  }

  // 2. Fetch latest questions from subcollection
  const qSnap = await getDocs(
    query(collection(db, `exams/${examId}/questions`), orderBy("order", "asc"))
  );
  const currentQuestions = qSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
  const currentQuestionMap = new Map(currentQuestions.map((q) => [q.id, q]));

  // 3. Determine question set to grade against
  let questionsToGrade: Question[] = [];
  let updatedSnapshot: Question[] | undefined = undefined;

  if (submission.shuffledQuestionsSnapshot && submission.shuffledQuestionsSnapshot.length > 0) {
    // Merge latest key data into shuffled snapshot while keeping question and option ordering
    questionsToGrade = submission.shuffledQuestionsSnapshot.map((snapQ) => {
      const latestQ = currentQuestionMap.get(snapQ.id);
      if (!latestQ) return snapQ;

      // Update correct answers, explanation, points, and statement answers
      const updatedQ: Question = {
        ...snapQ,
        text: latestQ.text || snapQ.text,
        imageUrl: latestQ.imageUrl !== undefined ? latestQ.imageUrl : snapQ.imageUrl,
        correctOptionIds: latestQ.correctOptionIds || [],
        acceptedAnswers: latestQ.acceptedAnswers || [],
        caseSensitive: latestQ.caseSensitive,
        trimWhitespace: latestQ.trimWhitespace,
        explanation: latestQ.explanation || "",
        points: latestQ.points || snapQ.points,
      };

      // Update statements if true_false
      if (latestQ.type === "true_false" && latestQ.statements && snapQ.statements) {
        const latestStmtMap = new Map(latestQ.statements.map((s) => [s.id, s]));
        updatedQ.statements = snapQ.statements.map((s) => {
          const lStmt = latestStmtMap.get(s.id);
          return lStmt ? { ...s, text: lStmt.text, correctAnswer: lStmt.correctAnswer } : s;
        });
      }

      return updatedQ;
    });

    updatedSnapshot = questionsToGrade;
  } else {
    questionsToGrade = currentQuestions;
  }

  const maxScore = submission.maxScore || 10;
  const { score: newScore, correctCount: newCorrectCount, totalCount } = evaluateSubmissionAnswers(
    submission.answers,
    questionsToGrade,
    maxScore
  );

  const oldScore = submission.score;
  const oldCorrectCount = submission.correctCount;

  // 4. Update submission in Firestore
  const updatePayload: Record<string, any> = {
    score: newScore,
    correctCount: newCorrectCount,
    totalCount: totalCount || submission.totalCount || 0,
    regradedAt: serverTimestamp(),
  };

  if (updatedSnapshot) {
    updatePayload.shuffledQuestionsSnapshot = updatedSnapshot;
  }

  const cleanPayload = sanitizeForFirestore(updatePayload);
  await updateDoc(doc(db, "submissions", submission.id), cleanPayload);

  // If there is a subcollection record, also update it
  try {
    const subColRef = doc(db, `exams/${examId}/submissions`, submission.id);
    const subColSnap = await getDoc(subColRef);
    if (subColSnap.exists()) {
      await updateDoc(subColRef, cleanPayload);
    }
  } catch (e) {
    // ignore
  }

  const updatedSubmission: Submission = {
    ...submission,
    score: newScore,
    correctCount: newCorrectCount,
    totalCount: totalCount || submission.totalCount,
    ...(updatedSnapshot ? { shuffledQuestionsSnapshot: updatedSnapshot } : {}),
  };

  const regradeResult: RegradeResult = {
    submissionId: submission.id,
    studentName: submission.studentNameSnapshot || "Học sinh",
    oldScore,
    newScore,
    oldCorrectCount,
    newCorrectCount,
    totalCount,
    changed: oldScore !== newScore || oldCorrectCount !== newCorrectCount,
  };

  return {
    submission: updatedSubmission,
    regradeResult,
  };
}

/**
 * Regrades all submissions for an exam or a cluster of submissions.
 */
export async function regradeExamSubmissions(
  examId: string,
  onProgress?: (current: number, total: number) => void
): Promise<{
  totalSubmissions: number;
  changedCount: number;
  results: RegradeResult[];
  averageScore: number;
}> {
  // 1. Fetch all submissions for the exam
  const subSnap = await getDocs(
    query(collection(db, "submissions"), where("examId", "==", examId))
  );

  const submissions = subSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
  if (submissions.length === 0) {
    return {
      totalSubmissions: 0,
      changedCount: 0,
      results: [],
      averageScore: 0,
    };
  }

  // 2. Fetch latest questions for the exam
  const qSnap = await getDocs(
    query(collection(db, `exams/${examId}/questions`), orderBy("order", "asc"))
  );
  const currentQuestions = qSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
  const currentQuestionMap = new Map(currentQuestions.map((q) => [q.id, q]));

  const results: RegradeResult[] = [];
  let changedCount = 0;
  let totalScore = 0;

  // Process in batches of 20
  const BATCH_SIZE = 20;
  for (let i = 0; i < submissions.length; i += BATCH_SIZE) {
    const chunk = submissions.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const sub of chunk) {
      let questionsToGrade: Question[] = [];
      let updatedSnapshot: Question[] | undefined = undefined;

      if (sub.shuffledQuestionsSnapshot && sub.shuffledQuestionsSnapshot.length > 0) {
        questionsToGrade = sub.shuffledQuestionsSnapshot.map((snapQ) => {
          const latestQ = currentQuestionMap.get(snapQ.id);
          if (!latestQ) return snapQ;

          const updatedQ: Question = {
            ...snapQ,
            text: latestQ.text || snapQ.text,
            imageUrl: latestQ.imageUrl !== undefined ? latestQ.imageUrl : snapQ.imageUrl,
            correctOptionIds: latestQ.correctOptionIds || [],
            acceptedAnswers: latestQ.acceptedAnswers || [],
            caseSensitive: latestQ.caseSensitive,
            trimWhitespace: latestQ.trimWhitespace,
            explanation: latestQ.explanation || "",
            points: latestQ.points || snapQ.points,
          };

          if (latestQ.type === "true_false" && latestQ.statements && snapQ.statements) {
            const latestStmtMap = new Map(latestQ.statements.map((s) => [s.id, s]));
            updatedQ.statements = snapQ.statements.map((s) => {
              const lStmt = latestStmtMap.get(s.id);
              return lStmt ? { ...s, text: lStmt.text, correctAnswer: lStmt.correctAnswer } : s;
            });
          }

          return updatedQ;
        });
        updatedSnapshot = questionsToGrade;
      } else {
        questionsToGrade = currentQuestions;
      }

      const maxScore = sub.maxScore || 10;
      const { score: newScore, correctCount: newCorrectCount, totalCount } = evaluateSubmissionAnswers(
        sub.answers,
        questionsToGrade,
        maxScore
      );

      const oldScore = sub.score;
      const oldCorrectCount = sub.correctCount;
      const changed = oldScore !== newScore || oldCorrectCount !== newCorrectCount;
      if (changed) changedCount++;

      totalScore += newScore;

      const regResult: RegradeResult = {
        submissionId: sub.id,
        studentName: sub.studentNameSnapshot || "Học sinh",
        oldScore,
        newScore,
        oldCorrectCount,
        newCorrectCount,
        totalCount,
        changed,
      };
      results.push(regResult);

      const docRef = doc(db, "submissions", sub.id);
      const updateData: Record<string, any> = {
        score: newScore,
        correctCount: newCorrectCount,
        totalCount: totalCount || sub.totalCount || 0,
        regradedAt: serverTimestamp(),
      };
      if (updatedSnapshot) {
        updateData.shuffledQuestionsSnapshot = updatedSnapshot;
      }
      batch.update(docRef, sanitizeForFirestore(updateData));
    }

    await batch.commit();

    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, submissions.length), submissions.length);
    }
  }

  // 3. Update exam stats in Firestore
  const averageScore = Math.round((totalScore / submissions.length) * 100) / 100;
  const scores = results.map((r) => r.newScore);
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);

  try {
    const examRef = doc(db, "exams", examId);
    await updateDoc(examRef, {
      "stats.submissionCount": submissions.length,
      "stats.averageScore": averageScore,
      "stats.highestScore": highestScore,
      "stats.lowestScore": lowestScore,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Could not update exam stats after regrading:", err);
  }

  return {
    totalSubmissions: submissions.length,
    changedCount,
    results,
    averageScore,
  };
}
