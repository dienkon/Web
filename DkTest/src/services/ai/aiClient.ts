import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;
let cachedKey: string | null = null;

export function getAiClient(customApiKey?: string): GoogleGenAI {
  const env = typeof process !== "undefined" ? process.env : ({} as Record<string, string | undefined>);
  const effectiveKey = (customApiKey && customApiKey.trim()) || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || "";

  if (customApiKey && customApiKey.trim()) {
    return new GoogleGenAI({
      apiKey: customApiKey.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  if (!aiInstance || cachedKey !== effectiveKey) {
    if (!effectiveKey) {
      console.warn("GEMINI_API_KEY is missing in server environment.");
    }
    cachedKey = effectiveKey;
    aiInstance = new GoogleGenAI({
      apiKey: effectiveKey || "",
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
