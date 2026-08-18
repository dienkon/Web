import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || "AQ.Ab8RN6Lo-4xs9_RfWvddPFrc8sGSCjlwIjq-RmBDEtWev-hplA";
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey || "",
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

// If the environment variable mistakenly contains an API key (starts with AQ.), ignore it
if (envModel.startsWith("AQ.")) {
  envModel = "gemini-3.5-flash-lite";
}

export const defaultModel = envModel;
