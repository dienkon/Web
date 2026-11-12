import { GoogleGenAI } from "@google/genai";

const BACKUP_GEMINI_KEY = '';

export const GEMINI_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.8-flash",
];

const clientCache = new Map<string, GoogleGenAI>();

export function publicGeminiFailure(error: any) {
  const message = String(error?.message ?? '');
  if ([401, 403].includes(error?.status) || /UNAUTHENTICATED|API key not valid|ACCESS_TOKEN_TYPE_UNSUPPORTED/.test(message))
    return { status: 503, error: 'Khóa AI trên máy chủ không hợp lệ hoặc chưa được cấp quyền. Cần cập nhật cấu hình AI.' };
  if (error?.status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(message))
    return { status: 429, error: 'Dịch vụ AI đang hết hạn mức. Vui lòng thử lại sau.' };
  if (error?.status === 504 || ['AbortError','TimeoutError'].includes(error?.name) || /timed out|timeout/i.test(message))
    return { status: 504, error: 'Dịch vụ AI xử lý quá lâu. Vui lòng thử lại sau.' };
  return { status: 502, error: 'Chưa kết nối được dịch vụ AI. Vui lòng thử lại sau.' };
}

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
  if (BACKUP_GEMINI_KEY && !keys.includes(BACKUP_GEMINI_KEY)) {
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
  if (!candidateKeys.length) throw new Error("Thiếu cấu hình AI trên máy chủ.");
  let lastError: any = null;

  for (let i = 0; i < candidateKeys.length; i++) {
    const key = candidateKeys[i];
    const client = getGeminiClient(key);
    try {
      return await fn(client, key);
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || String(err);
      console.warn(`[Gemini Auth/API Warning] Key #${i + 1}  failed: ${msg.slice(0, 140)}`);

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
      const status = Number(err?.status ?? err?.code);
      const message = String(err?.message ?? '');
      console.warn(`[Gemini Model Warning] Model ${model} failed with status ${status || 'unavailable'}`);
      // Invalid credentials, exhausted quota, invalid input and cancellation do
      // not become valid by trying every model. Key fallback is handled outside.
      if (![404, 503].includes(status) && !/model.*(?:not found|not supported|unavailable|overloaded)/i.test(message)) throw err;
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
