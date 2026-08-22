import { doc, setDoc, collection } from "firebase/firestore";
import { db } from "./firebase/config";
import { ExportV3 } from "../utils/json/schema";

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
      status: "draft" as const
    };
    
    // Create new doc ref for exam
    const examRef = doc(collection(db, "exams"));
    const examId = examRef.id;

    // 2. Prepare Sections
    const sectionMap = new Map<string, string>(); // oldId -> newId
    const sections = [];
    
    if (data.sections && data.sections.length > 0) {
      for (const [idx, sec] of data.sections.entries()) {
        const newSecId = doc(collection(db, "exams")).id; // generate dummy ids
        const newSec = {
          id: newSecId,
          title: sec.title,
          description: sec.description || "",
          order: sec.order ?? idx,
          examId,
          questionCount: 0,
          enabled: true,
        };
        sections.push(newSec);
        sectionMap.set(sec.id, newSec.id);
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
    
    console.log("[Firestore] WRITE: exams/" + examId); await setDoc(examRef, fullExamDoc, { merge: true });
    
    return examId;
  } else if (mode === "question_bank" && targetExamId) {
     throw new Error("Update mode with question bank is temporarily unsupported via jsonImportService without refactor. Use editor.");
  }
  
  throw new Error("Unsupported import mode");
}
