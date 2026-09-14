import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  if (!aiInstance) {
    const env = typeof process !== "undefined" ? process.env : ({} as Record<string, string | undefined>);
    const apiKey = env.GEMINI_API_KEY;
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

const safeEnv = typeof process !== "undefined" ? process.env : ({} as Record<string, string | undefined>);
let envModel = safeEnv.GEMINI_MODEL || "gemini-3.5-flash-lite";

// If the environment variable mistakenly contains an API key (starts with AQ.), ignore it
if (envModel.startsWith("AQ.")) {
  envModel = "gemini-3.5-flash-lite";
}

export const defaultModel = envModel;
