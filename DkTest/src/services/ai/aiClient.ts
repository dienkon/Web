import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the server.");
    }

    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  return aiInstance;
}

let envModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Ignore accidental API-key values in GEMINI_MODEL.
if (envModel.startsWith("AQ.")) {
  envModel = "gemini-3.5-flash-lite";
}

export const defaultModel = envModel;
