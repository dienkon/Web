import { normalizeQuestion } from "./normalizeExamJson";
import { ExportV3 } from "./schema";

export function migrateExamJson(rawData: any): ExportV3 {
  const version = rawData.version || 1;

  if (version === 3) {
    // It's already v3, just normalize questions to be safe
    return {
      version: 3,
      source: rawData.source || "DkTEST",
      exportedAt: rawData.exportedAt || new Date().toISOString(),
      exportType: rawData.exportType || (rawData.type === "question_bank" ? "question_bank" : "exam"),
      exam: rawData.exam,
      sections: rawData.sections || [],
      questions: (rawData.questions || []).map(normalizeQuestion)
    };
  }

  // Legacy V2 or older migration
  const exam = {
    title: rawData.title || "Untitled Exam",
    timeLimit: rawData.timeLimit || 90,
    shuffleQuestions: rawData.shuffle || false,
    showResults: rawData.showResults ?? true,
  };

  const defaultSectionId = "section-1";
  const sections = [
    {
      id: defaultSectionId,
      title: "Phần I",
      order: 0
    }
  ];

  const questions = (rawData.questions || []).map((qRaw: any, idx: number) => {
    const q = normalizeQuestion(qRaw);
    q.sectionId = defaultSectionId;
    q.order = idx;
    return q;
  });

  return {
    version: 3,
    source: "DkTEST",
    exportedAt: new Date().toISOString(),
    exportType: "exam",
    exam,
    sections,
    questions
  };
}
