/**
 * Schema-guided Output Parser & Validator for DkAI (Section AQ, AT, CS)
 */

export const parseStructuredJson = (rawText) => {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Dữ liệu phản hồi rỗng.");
  }

  // Strip possible markdown fences ```json ... ```
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/i, "").replace(/\s*```$/, "");
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error("Không thể phân tích dữ liệu có cấu trúc từ AI: " + err.message);
  }
};

/**
 * Validate flashcards array structure
 */
export const validateFlashcardsOutput = (data) => {
  if (!data || !Array.isArray(data.cards)) {
    throw new Error("Dữ liệu flashcard không đúng định dạng danh sách.");
  }

  return data.cards.map((c, idx) => ({
    id: `fc_${Date.now()}_${idx}`,
    front: String(c.front || "").trim(),
    back: String(c.back || "").trim(),
    hint: String(c.hint || "").trim(),
    example: String(c.example || "").trim(),
    latex: String(c.latex || "").trim(),
    tags: Array.isArray(c.tags) ? c.tags : ["DkAI"],
    difficulty: c.difficulty || "medium",
  })).filter((c) => c.front && c.back);
};

export default {
  parseStructuredJson,
  validateFlashcardsOutput,
};
