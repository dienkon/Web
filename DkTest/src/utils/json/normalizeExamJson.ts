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
    if (raw.caseSensitive !== undefined) q.caseSensitive = Boolean(raw.caseSensitive);
    if (raw.trimWhitespace !== undefined) q.trimWhitespace = Boolean(raw.trimWhitespace);
  } else if (type === "true_false") {
    q.statements = (raw.statements || []).map((st: any, idx: number) => ({
      id: st.id || `stmt_${idx + 1}`,
      text: st.text || "",
      correctAnswer: Boolean(st.correctAnswer),
    }));
  } else if (type === "matching") {
    q.matchingLeft = (raw.matchingLeft || []).map((it: any, idx: number) => ({
      id: it.id || `m_l_${idx + 1}`,
      label: it.label || `${idx + 1}`,
      text: it.text || "",
    }));
    q.matchingRight = (raw.matchingRight || []).map((it: any, idx: number) => ({
      id: it.id || `m_r_${idx + 1}`,
      label: it.label || String.fromCharCode(97 + idx),
      text: it.text || "",
    }));
    q.correctMatches = raw.correctMatches || {};
    if (raw.matchingMode === "one_to_one" || raw.matchingMode === "multiple") {
      q.matchingMode = raw.matchingMode;
    }
  } else if (type === "ordering") {
    const items = (raw.orderingItems || []).map((it: any, idx: number) => ({
      id: it.id || `ord_${idx + 1}`,
      text: it.text || "",
    }));
    q.orderingItems = items;
    q.correctOrder = raw.correctOrder || items.map((it: any) => it.id);
  } else if (type === "fill_blank") {
    q.acceptedAnswersPerBlank = raw.acceptedAnswersPerBlank || {};
    if (raw.caseSensitive !== undefined) q.caseSensitive = Boolean(raw.caseSensitive);
    if (raw.trimWhitespace !== undefined) q.trimWhitespace = Boolean(raw.trimWhitespace);
  } else if (type === "essay") {
    if (raw.essayRubric !== undefined) q.essayRubric = raw.essayRubric;
    if (raw.essayGradingPrompt !== undefined) q.essayGradingPrompt = raw.essayGradingPrompt;
    if (raw.essayGradingMode === "ai" || raw.essayGradingMode === "manual") {
      q.essayGradingMode = raw.essayGradingMode;
    }
    if (typeof raw.essayMinWords === "number") q.essayMinWords = raw.essayMinWords;
    if (typeof raw.essayMaxWords === "number") q.essayMaxWords = raw.essayMaxWords;
  } else {
    // default fallback
    q.type = "single_choice";
    q.options = [];
    q.correctOptionIds = [];
  }

  if (raw.level) q.level = raw.level;
  if (raw.audioConfig) q.audioConfig = raw.audioConfig;
  if (raw.audioUrl !== undefined) q.audioUrl = raw.audioUrl;

  return q as QuestionV3;
}
