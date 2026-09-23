/**
 * Structured JSON Schemas for Gemini DkAI (Section AQ, AT, AU, CS)
 */

export const FLASHCARD_SCHEMA = {
  type: "object",
  properties: {
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          front: { type: "string" },
          back: { type: "string" },
          hint: { type: "string" },
          example: { type: "string" },
          latex: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
        },
        required: ["front", "back"],
      },
    },
  },
  required: ["cards"],
};

export const DOCUMENT_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    subject: { type: "string" },
    grade: { type: "string" },
    topics: { type: "array", items: { type: "string" } },
    keywords: { type: "array", items: { type: "string" } },
    difficulty: { type: "string" },
    summary: { type: "string" },
    estimatedStudyMinutes: { type: "number" },
    importantConcepts: { type: "array", items: { type: "string" } },
    formulaList: { type: "array", items: { type: "string" } },
    suggestedNotes: { type: "array", items: { type: "string" } },
    suggestedFlashcards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          front: { type: "string" },
          back: { type: "string" },
        },
        required: ["front", "back"],
      },
    },
  },
  required: ["title", "subject", "summary", "keywords"],
};

export const SEARCH_INTENT_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    grade: { type: "string" },
    topics: { type: "array", items: { type: "string" } },
    keywords: { type: "array", items: { type: "string" } },
    freeOnly: { type: "boolean" },
    priceRange: {
      type: "object",
      properties: {
        min: { type: "number" },
        max: { type: "number" },
      },
    },
  },
  required: ["keywords"],
};
