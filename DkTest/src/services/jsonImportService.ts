import { doc, setDoc, collection } from "firebase/firestore";
import { db } from "./firebase/config";
import { ExportV3 } from "../utils/json/schema";
import { FirestoreCache } from "./firebase/firestoreCache";
import { invalidateHomeTopCache } from "./examCacheService";
import { syncExamToCatalogSummary } from "./statsAggregatorService";

export async function importJsonToFirestore(data: ExportV3, mode: "new_exam" | "update_exam" | "question_bank", targetSectionId?: string, targetExamId?: string) {
  if (mode === "new_exam" || (mode === "question_bank" && !targetExamId)) {
    // 1. Prepare Exam metadata
    const examPayload = {
      title: data.exam?.title || "Imported Exam",
      timeLimit: data.exam?.timeLimit || 90,
      shuffleQuestions: data.exam?.shuffleQuestions || false,
      showResults: data.exam?.showResults ?? true,
      description: data.exam?.description || "",
      subject: data.exam?.subject || "",
      gradeCategory: data.exam?.gradeCategory || "",
      accessMode: (data.exam as any)?.accessMode || "free",
      priceVnd: (data.exam as any)?.priceVnd || 0,
      salesEnabled: (data.exam as any)?.salesEnabled ?? true,
      status: "draft" as const,
      folderId: null,
    };
    
    // Create new doc ref for exam
    const examRef = doc(collection(db, "exams"));
    const examId = examRef.id;

    // 2. Prepare Sections
    const sectionMap = new Map<string, string>(); // oldId -> newId
    const sections = [];
    
    if (data.sections && data.sections.length > 0) {
      // Pre-populate oldId -> newId map
      for (const sec of data.sections) {
        sectionMap.set(sec.id, doc(collection(db, "exams")).id);
      }

      for (const [idx, sec] of data.sections.entries()) {
        const newSecId = sectionMap.get(sec.id)!;
        const mappedParentId = sec.parentSectionId ? sectionMap.get(sec.parentSectionId) || null : null;
        const depth = (sec as any).depth !== undefined ? (sec as any).depth : (mappedParentId ? 1 : 0);

        const newSec = {
          id: newSecId,
          title: sec.title,
          description: sec.description || "",
          order: sec.order ?? idx,
          examId,
          parentSectionId: mappedParentId,
          depth,
          questionCount: 0,
          enabled: true,
        };
        sections.push(newSec);
      }
    } else {
      // Default section
      const defaultSecId = doc(collection(db, "exams")).id;
      const defaultSec = {
        id: defaultSecId,
        title: "Phần I",
        description: "",
        order: 0,
        examId,
        parentSectionId: null,
        depth: 0,
        questionCount: 0,
        enabled: true,
      };
      sections.push(defaultSec);
      sectionMap.set("default", defaultSec.id);
    }

    // 3. Prepare Questions
    const questions = [];
    for (const [idx, q] of data.questions.entries()) {
      let secId = sectionMap.get(q.sectionId || "") || sectionMap.get("default");
      if (!secId && sectionMap.size > 0) {
        secId = Array.from(sectionMap.values())[0];
      }
      
      const newQId = doc(collection(db, "exams")).id;
      const qPayload = {
        ...q,
        id: newQId,
        examId,
        sectionId: secId,
        order: q.order ?? idx
      };
      questions.push(qPayload);
    }
    
    const fullExamDoc = {
      ...examPayload,
      id: examId,
      sections,
      questions,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.warn(`[Firestore] WRITE (1 doc): exams/${examId} (JSON import)`);
    await setDoc(examRef, fullExamDoc, { merge: true });

    // Invalidate caches immediately
    FirestoreCache.invalidate("doc:system_stats:exams_summary");
    FirestoreCache.invalidate(`doc:exams:${examId}`);
    FirestoreCache.invalidatePrefix("doc:exams");
    FirestoreCache.invalidatePrefix("query:exams");
    invalidateHomeTopCache();

    try {
      await syncExamToCatalogSummary({ ...fullExamDoc, id: examId } as any, "upsert");
    } catch (e) {
      console.warn("[jsonImportService] Warning syncing to catalog:", e);
    }
    
    return examId;
  } else if (mode === "question_bank" && targetExamId) {
     throw new Error("Update mode with question bank is temporarily unsupported via jsonImportService without refactor. Use editor.");
  }
  
  throw new Error("Unsupported import mode");
}
