import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the server.");
    }

    aiInstance = new GoogleGenAI({
      apiKey,
    });
  }

  return aiInstance;
}

const configuredModel = process.env.GEMINI_MODEL?.trim();
export const defaultModel = configuredModel || "gemini-3.5-flash-lite";
