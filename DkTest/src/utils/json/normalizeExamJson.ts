import { QuestionV3 } from "./schema";

export function normalizeQuestion(raw: any): QuestionV3 {
  const q: Partial<QuestionV3> = {
    id: raw.id || "q" + Date.now() + Math.random().toString(36).substring(2, 6),
    legacyId: raw.id,
    text: raw.text || "",
    explanation: raw.explanation || "",
    imageUrl: raw.imageUrl || null,
    imageWidth: raw.imageWidth || null,
    imageHeight: raw.imageHeight || null,
    points: raw.points ?? 1,
    order: raw.order ?? 0,
    sectionId: raw.sectionId,
  };

  // Convert old types
  let type = raw.type;
  if (type === "mcq") type = "single_choice";
  if (type === "short") type = "short_answer";
  
  q.type = type as any;

  if (type === "single_choice" || type === "multiple_choice") {
    let finalOptions: {id: string, text: string}[] = [];
    let correctOptionIds: string[] = [];

    if (raw.options && raw.options.length > 0 && typeof raw.options[0] === 'string') {
      // Legacy options format (array of strings)
      const isLegacyOrder = raw.originalOptions && raw.optionOrder;
      const optionsSource = isLegacyOrder ? raw.originalOptions : raw.options;
      
      finalOptions = optionsSource.map((optText: string, i: number) => ({
        id: `opt_${i}`,
        text: optText
      }));

      if (type === "single_choice") {
        const cIdx = isLegacyOrder ? (raw.originalCorrectIndex ?? raw.correctIndex) : raw.correctIndex;
        if (cIdx !== undefined && cIdx !== null) {
          correctOptionIds = [`opt_${cIdx}`];
        }
      } else {
        if (raw.correctIndices) {
          correctOptionIds = raw.correctIndices.map((i: number) => `opt_${i}`);
        }
      }
    } else if (raw.options && raw.options.length > 0 && typeof raw.options[0] === 'object') {
      // V3 options format
      finalOptions = raw.options.map((o: any) => ({
        id: o.id || `opt_${Math.random().toString(36).substr(2, 6)}`,
        text: o.text || ""
      }));
      correctOptionIds = raw.correctOptionIds || [];
    }

    q.options = finalOptions;
    q.correctOptionIds = correctOptionIds;
  } else if (type === "short_answer") {
    q.acceptedAnswers = raw.acceptedAnswers || raw.exactAnswers || [];
  } else if (type === "true_false") {
    q.statements = raw.statements || [];
  } else {
    // default fallback
    q.type = "single_choice";
    q.options = [];
    q.correctOptionIds = [];
  }

  return q as QuestionV3;
}
