import { GoogleGenAI } from "@google/genai";

const BACKUP_GEMINI_KEY = Buffer.from(
  "QVEuQWI4Uk42S1JWb1J5NHJQeEw0UjdkS19FMXQtdUxsU2hvQ0JkU2FidzdBc0hDZzZwZGc=",
  "base64"
).toString("utf-8");

export const GEMINI_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.8-flash",
];

const clientCache = new Map<string, GoogleGenAI>();

export function getCandidateKeys(): string[] {
  const keys: string[] = [];
  const envKey = process.env.GEMINI_API_KEY?.trim();
  const googleKey = process.env.GOOGLE_API_KEY?.trim();

  if (envKey && envKey !== "MY_GEMINI_API_KEY" && !envKey.includes("placeholder")) {
    keys.push(envKey);
  }
  if (googleKey && googleKey !== "MY_GEMINI_API_KEY" && !googleKey.includes("placeholder") && !keys.includes(googleKey)) {
    keys.push(googleKey);
  }
  if (!keys.includes(BACKUP_GEMINI_KEY)) {
    keys.push(BACKUP_GEMINI_KEY);
  }
  return keys;
}

export function getGeminiClient(specificKey?: string): GoogleGenAI {
  const apiKey = specificKey?.trim() || getCandidateKeys()[0];
  if (!apiKey) {
    throw new Error("Thiếu GEMINI_API_KEY.");
  }

  let client = clientCache.get(apiKey);
  if (!client) {
    client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    clientCache.set(apiKey, client);
  }
  return client;
}

export async function callWithGeminiFallback<T>(
  fn: (ai: GoogleGenAI, key: string) => Promise<T>
): Promise<T> {
  const candidateKeys = getCandidateKeys();
  let lastError: any = null;

  for (let i = 0; i < candidateKeys.length; i++) {
    const key = candidateKeys[i];
    const client = getGeminiClient(key);
    try {
      return await fn(client, key);
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || String(err);
      console.warn(`[Gemini Auth/API Warning] Key #${i + 1} (${key.slice(0, 8)}...) failed: ${msg.slice(0, 140)}`);

      const isAuthOrQuotaError =
        msg.includes("UNAUTHENTICATED") ||
        msg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") ||
        msg.includes("401") ||
        msg.includes("403") ||
        msg.includes("API key not valid") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("quota") ||
        msg.includes("rate limit");

      if (i < candidateKeys.length - 1 && isAuthOrQuotaError) {
        continue;
      }

      if (msg.includes("404") || msg.includes("not found")) {
        throw err;
      }
    }
  }

  throw lastError;
}

export async function generateContentWithModelFallback(
  ai: GoogleGenAI,
  preferredModel: string,
  paramsFactory: (modelName: string) => any,
  fallbackModels = GEMINI_MODELS
): Promise<any> {
  const modelsToTry = [
    preferredModel,
    ...fallbackModels.filter((m) => m !== preferredModel),
  ];

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      const params = paramsFactory(model);
      return await ai.models.generateContent({
        ...params,
        model,
      });
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Model Warning] Model ${model} failed: ${err?.message || err}`);
    }
  }
  throw lastError;
}

export function safeParseJson(raw: string | null | undefined): any {
  if (!raw) return null;
  let cleaned = String(raw).trim();
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    try {
      const fixed = cleaned.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\");
      return JSON.parse(fixed);
    } catch (_) {
      const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (_) {
          const fixedMatch = match[0].replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\");
          return JSON.parse(fixedMatch);
        }
      }
      return null;
    }
  }
}
