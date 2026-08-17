import { createExam } from "./examService";
import { createSection } from "./sectionService";
import { createQuestion } from "./questionService";
import { ExportV3 } from "../utils/json/schema";

export async function importJsonToFirestore(data: ExportV3, mode: "new_exam" | "update_exam" | "question_bank", targetSectionId?: string, targetExamId?: string) {
  if (mode === "new_exam" || (mode === "question_bank" && !targetExamId)) {
    // 1. Create Exam
    const examPayload = {
      title: data.exam?.title || "Imported Exam",
      timeLimit: data.exam?.timeLimit || 90,
      shuffleQuestions: data.exam?.shuffleQuestions || false,
      showResults: data.exam?.showResults ?? true,
      description: data.exam?.description || "",
      status: "draft" as const
    };
    const newExam = await createExam(examPayload as any);
    const examId = newExam.id;

    // 2. Create Sections
    const sectionMap = new Map<string, string>(); // oldId -> newId
    if (data.sections && data.sections.length > 0) {
      for (const [idx, sec] of data.sections.entries()) {
        const newSec = await createSection(examId, {
          title: sec.title,
          description: sec.description || "",
          order: sec.order ?? idx,
          examId,
          questionCount: 0,
          enabled: true,
        });
        sectionMap.set(sec.id, newSec.id);
      }
    } else {
      // Default section
      const defaultSec = await createSection(examId, {
        title: "Phần I",
        description: "",
        order: 0,
        examId,
        questionCount: 0,
        enabled: true,
      });
      sectionMap.set("default", defaultSec.id);
    }

    // 3. Create Questions (in chunks or sequentially)
    // For large imports we might want batching, but for now sequential or Promise.all is fine
    // because Firebase can handle many requests if not too huge.
    // Better to use batch, but since we already have helpers, let's just do sequential for simplicity
    for (const [idx, q] of data.questions.entries()) {
      let secId = sectionMap.get(q.sectionId || "") || sectionMap.get("default");
      if (!secId && sectionMap.size > 0) {
        secId = Array.from(sectionMap.values())[0];
      }
      
      const qPayload = {
        ...q,
        id: undefined, // let firebase gen id
        examId,
        sectionId: secId,
        order: q.order ?? idx
      };
      
      await createQuestion(examId, qPayload as any);
    }
    
    return examId;
  } else if (mode === "question_bank" && targetExamId) {
     let secId = targetSectionId;
     if (targetSectionId === "NEW_SECTION") {
       const newSec = await createSection(targetExamId, {
         title: "Imported Section " + new Date().toLocaleTimeString(),
         order: 999,
         examId: targetExamId,
         questionCount: 0,
         enabled: true,
       });
       secId = newSec.id;
     }

     for (const [idx, q] of data.questions.entries()) {
       const qPayload = {
         ...q,
         id: undefined,
         examId: targetExamId,
         sectionId: secId,
         order: 999 + idx
       };
       await createQuestion(targetExamId, qPayload as any);
     }
     return targetExamId;
  }
  
  throw new Error("Unsupported import mode");
}
