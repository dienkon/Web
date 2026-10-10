import {
  adminDb,
  getFirestoreRestDoc,
  getFirestoreRestDocs,
  setFirestoreRestDoc,
} from "../firebaseAdmin.js";
import type { Exam, Section, Question } from "../../src/types/index.js";

export interface MergeExamsOptions {
  title: string;
  code?: string;
  description?: string;
  subject?: string;
  gradeCategory?: string;
  folderId?: string | null;
  timeLimit?: number;
  sourceExamIds: string[];
  organizeMode?: "by_source_exam" | "flatten";
  preserveSourceOrder?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  actorUid?: string;
  actorName?: string;
}

export async function mergeExams(options: MergeExamsOptions): Promise<{
  newExamId: string;
  exam: Exam;
  totalSections: number;
  totalQuestions: number;
  totalPoints: number;
}> {
  const {
    title,
    description = "",
    subject = "Khác",
    gradeCategory = "Khác",
    folderId = null,
    timeLimit = 90,
    sourceExamIds,
    organizeMode = "by_source_exam",
    shuffleQuestions = false,
    shuffleOptions = false,
    actorUid = "admin",
    actorName = "Admin",
  } = options;

  if (!title || !title.trim()) {
    throw new Error("Vui lòng nhập tên bài thi mới.");
  }

  if (!Array.isArray(sourceExamIds) || sourceExamIds.length < 2) {
    throw new Error("Cần chọn ít nhất 2 bài thi hợp lệ để thực hiện gộp đề.");
  }

  // 1. Fetch canonical data for all source exams
  const loadedSources: Array<{
    exam: Exam;
    sections: Section[];
    questions: Question[];
  }> = [];

  for (const srcId of sourceExamIds) {
    let examData: Exam | null = null;
    let sections: Section[] = [];
    let questions: Question[] = [];

    if (adminDb) {
      const examDoc = await adminDb.collection("exams").doc(srcId).get();
      if (!examDoc.exists) {
        throw new Error(`Không tìm thấy bài thi nguồn với ID: ${srcId}`);
      }
      examData = { id: examDoc.id, ...examDoc.data() } as Exam;

      const secSnap = await adminDb
        .collection("exams")
        .doc(srcId)
        .collection("sections")
        .orderBy("order", "asc")
        .get();

      if (!secSnap.empty) {
        sections = secSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Section));
      } else if (Array.isArray(examData.sections) && examData.sections.length > 0) {
        sections = [...examData.sections];
      }

      const qSnap = await adminDb
        .collection("exams")
        .doc(srcId)
        .collection("questions")
        .orderBy("order", "asc")
        .get();

      if (!qSnap.empty) {
        questions = qSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
      } else if (Array.isArray(examData.questions) && examData.questions.length > 0) {
        questions = [...examData.questions];
      }
    } else {
      // REST fallback mode
      examData = await getFirestoreRestDoc("exams", srcId);
      if (!examData) {
        throw new Error(`Không tìm thấy bài thi nguồn với ID: ${srcId}`);
      }

      const restSecs = await getFirestoreRestDocs(`exams/${srcId}/sections`, 100);
      if (restSecs && restSecs.length > 0) {
        sections = restSecs as Section[];
      } else if (Array.isArray(examData.sections) && examData.sections.length > 0) {
        sections = [...examData.sections];
      }

      const restQs = await getFirestoreRestDocs(`exams/${srcId}/questions`, 100);
      if (restQs && restQs.length > 0) {
        questions = restQs as Question[];
      } else if (Array.isArray(examData.questions) && examData.questions.length > 0) {
        questions = [...examData.questions];
      }
    }

    loadedSources.push({
      exam: examData,
      sections,
      questions,
    });
  }

  // 2. Prepare new exam metadata
  const newExamId = adminDb
    ? adminDb.collection("exams").doc().id
    : `exam_mrg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const generatedCode =
    options.code?.trim().toUpperCase() ||
    `MERGED-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

  const newSections: Section[] = [];
  const newQuestions: Question[] = [];
  let globalQuestionOrder = 0;
  let globalSectionOrder = 0;
  let totalCalculatedPoints = 0;

  // 3. Construct sections and questions tree
  for (let sIdx = 0; sIdx < loadedSources.length; sIdx++) {
    const src = loadedSources[sIdx];
    const sourceExam = src.exam;

    if (organizeMode === "by_source_exam") {
      // Create top-level parent section representing the source exam
      const parentSectionId = `sec_p_${newExamId}_${sIdx + 1}`;
      const parentSection: Section = {
        id: parentSectionId,
        examId: newExamId,
        title: `Phần ${sIdx + 1}: ${sourceExam.title}`,
        description: sourceExam.description || "",
        order: globalSectionOrder++,
        parentSectionId: null,
        depth: 0,
        questionCount: src.questions.length,
        enabled: true,
      };
      newSections.push(parentSection);

      // Section mapping oldSectionId -> newSectionId
      const sectionIdMap = new Map<string, string>();

      if (src.sections.length > 0) {
        src.sections.forEach((oldSec, idx) => {
          const childSecId = `sec_c_${newExamId}_${sIdx + 1}_${idx + 1}`;
          sectionIdMap.set(oldSec.id, childSecId);

          const childSec: Section = {
            ...oldSec,
            id: childSecId,
            examId: newExamId,
            title: oldSec.title,
            description: oldSec.description || "",
            order: globalSectionOrder++,
            parentSectionId: parentSectionId,
            depth: 1,
            questionCount: src.questions.filter((q) => q.sectionId === oldSec.id).length,
            enabled: true,
          };
          newSections.push(childSec);
        });
      } else {
        // Fallback single child section
        const singleChildId = `sec_c_${newExamId}_${sIdx + 1}_sub`;
        sectionIdMap.set("default", singleChildId);
        newSections.push({
          id: singleChildId,
          examId: newExamId,
          title: sourceExam.subject ? `Môn ${sourceExam.subject}` : "Toàn bộ câu hỏi",
          order: globalSectionOrder++,
          parentSectionId: parentSectionId,
          depth: 1,
          questionCount: src.questions.length,
          enabled: true,
        });
      }

      // Map and clone questions
      src.questions.forEach((oldQ, qIdx) => {
        let assignedSectionId = oldQ.sectionId
          ? sectionIdMap.get(oldQ.sectionId)
          : sectionIdMap.get("default");

        if (!assignedSectionId && newSections.length > 0) {
          assignedSectionId = newSections[newSections.length - 1].id;
        }

        const newQId = `q_mrg_${newExamId}_${sIdx + 1}_${qIdx + 1}_${Math.random().toString(36).substring(2, 6)}`;
        const pts = typeof oldQ.points === "number" && !isNaN(oldQ.points) ? oldQ.points : 1;
        totalCalculatedPoints += pts;

        const clonedQuestion: Question = {
          ...oldQ,
          id: newQId,
          examId: newExamId,
          sectionId: assignedSectionId,
          order: globalQuestionOrder++,
          points: pts,
          originalExamId: sourceExam.id,
          originalQuestionId: oldQ.id,
        };
        newQuestions.push(clonedQuestion);
      });
    } else {
      // Flatten mode: keep original sections hierarchy
      const sectionIdMap = new Map<string, string>();

      src.sections.forEach((oldSec, idx) => {
        const mappedId = `sec_${newExamId}_${sIdx + 1}_${idx + 1}`;
        sectionIdMap.set(oldSec.id, mappedId);

        const clonedSec: Section = {
          ...oldSec,
          id: mappedId,
          examId: newExamId,
          order: globalSectionOrder++,
          parentSectionId: null,
          depth: oldSec.depth ?? 0,
        };
        newSections.push(clonedSec);
      });

      // Map parentSectionId if nested
      newSections.forEach((sec) => {
        if (sec.parentSectionId && sectionIdMap.has(sec.parentSectionId)) {
          sec.parentSectionId = sectionIdMap.get(sec.parentSectionId)!;
        }
      });

      src.questions.forEach((oldQ, qIdx) => {
        const assignedSectionId = oldQ.sectionId
          ? sectionIdMap.get(oldQ.sectionId) || null
          : null;

        const newQId = `q_mrg_${newExamId}_${sIdx + 1}_${qIdx + 1}_${Math.random().toString(36).substring(2, 6)}`;
        const pts = typeof oldQ.points === "number" && !isNaN(oldQ.points) ? oldQ.points : 1;
        totalCalculatedPoints += pts;

        const clonedQuestion: Question = {
          ...oldQ,
          id: newQId,
          examId: newExamId,
          sectionId: assignedSectionId,
          order: globalQuestionOrder++,
          points: pts,
          originalExamId: sourceExam.id,
          originalQuestionId: oldQ.id,
        };
        newQuestions.push(clonedQuestion);
      });
    }
  }

  const now = new Date();
  const newExam: Exam = {
    id: newExamId,
    title: title.trim(),
    code: generatedCode,
    description: description.trim(),
    timeLimit,
    duration: timeLimit,
    shuffleQuestions,
    shuffleOptions,
    status: "draft",
    folderId,
    subject,
    gradeCategory,
    questionCount: newQuestions.length,
    totalQuestions: newQuestions.length,
    maxScore: totalCalculatedPoints || 10,
    showResults: true,
    showScore: true,
    showDetails: true,
    allowSubExam: false,
    maxAttempts: 0,
    sourceExamIds,
    sourceExamCount: sourceExamIds.length,
    isAggregatedReview: false,
    accessMode: "free",
    priceVnd: 0,
    salesEnabled: true,
    sections: newSections,
    createdAt: now as any,
    updatedAt: now as any,
  };

  // 4. Write new exam document, sections, and questions
  if (adminDb) {
    const BATCH_SIZE = 400;
    const writeOps: Array<{ ref: FirebaseFirestore.DocumentReference; data: any }> = [];

    // 4.1 Write main exam document
    writeOps.push({ ref: adminDb.collection("exams").doc(newExamId), data: newExam });

    // 4.2 Write sections subcollection
    for (const sec of newSections) {
      const secRef = adminDb
        .collection("exams")
        .doc(newExamId)
        .collection("sections")
        .doc(sec.id);
      writeOps.push({ ref: secRef, data: sec });
    }

    // 4.3 Write questions subcollection
    for (const q of newQuestions) {
      const qRef = adminDb
        .collection("exams")
        .doc(newExamId)
        .collection("questions")
        .doc(q.id);
      writeOps.push({ ref: qRef, data: q });
    }

    // Execute in sequential chunks
    for (let i = 0; i < writeOps.length; i += BATCH_SIZE) {
      const chunk = writeOps.slice(i, i + BATCH_SIZE);
      const batch = adminDb.batch();
      for (const op of chunk) {
        batch.set(op.ref, op.data);
      }
      await batch.commit();
    }
  } else {
    // REST fallback mode
    await setFirestoreRestDoc("exams", newExamId, {
      ...newExam,
      sections: newSections,
      questions: newQuestions,
    });
    for (const sec of newSections) {
      await setFirestoreRestDoc(`exams/${newExamId}/sections`, sec.id, sec);
    }
    for (const q of newQuestions) {
      await setFirestoreRestDoc(`exams/${newExamId}/questions`, q.id, q);
    }
  }

  // 5. Record Audit Log
  try {
    const auditData = {
      actorUid,
      actorName,
      action: "MERGE_EXAMS",
      targetUid: newExamId,
      targetType: "exam",
      metadata: {
        newExamTitle: title,
        sourceExamIds,
        totalSections: newSections.length,
        totalQuestions: newQuestions.length,
      },
      timestamp: now.toISOString(),
    };
    if (adminDb) {
      const auditRef = adminDb.collection("auditLogs").doc();
      await auditRef.set({
        id: auditRef.id,
        ...auditData,
      });
    } else {
      const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await setFirestoreRestDoc("auditLogs", auditId, {
        id: auditId,
        ...auditData,
      });
    }
  } catch (auditErr) {
    console.warn("[examMergeService] Failed to record merge audit log:", auditErr);
  }

  return {
    newExamId,
    exam: newExam,
    totalSections: newSections.length,
    totalQuestions: newQuestions.length,
    totalPoints: totalCalculatedPoints,
  };
}
