/**
 * Gemini AI Reaction Engine & Chemistry AI Assistant Service
 * Provides dynamic reaction generation, stoichiometry prediction, and AI chemistry tutoring.
 * Supports local storage configuration, multiple API key fallbacks, model failover, and local verification.
 */

import { PhysicalState, ReactionDefinition, StoichiometricSpecies } from '../types/chemistry';
import { normalizeFormula, parseChemicalFormula } from '../chemistry/core/formula';
import { isElementBalancedReaction } from '../chemistry/core/ledger';

export const LOCAL_STORAGE_API_KEY_NAME = 'chemdex_gemini_api_key';
export const LOCAL_STORAGE_MODEL_NAME = 'chemdex_gemini_model';

const BACKUP_GEMINI_KEY = '';
export function getGeminiApiKey(): string {
  if (typeof window !== 'undefined') {try{return sessionStorage.getItem(LOCAL_STORAGE_API_KEY_NAME)?.trim() || '__server__';}catch{}}
  return '__server__';
}

export function setGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      sessionStorage.setItem(LOCAL_STORAGE_API_KEY_NAME, key.trim());
    } else {
      sessionStorage.removeItem(LOCAL_STORAGE_API_KEY_NAME);
    }
  }
}

export function removeGeminiApiKey(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(LOCAL_STORAGE_API_KEY_NAME);
  }
}

export function isGeminiKeyConfigured(): boolean {
  const key = getGeminiApiKey();
  return Boolean(key && key.length > 10 && key !== BACKUP_GEMINI_KEY);
}

export function getGeminiModel(): string {
  if (typeof window !== 'undefined') {
    const savedModel = localStorage.getItem(LOCAL_STORAGE_MODEL_NAME);
    if (savedModel && savedModel.trim()) return savedModel.trim();
  }
  const envModel =
    (import.meta as any).env?.VITE_GEMINI_MODEL ||
    (import.meta as any).env?.GEMINI_MODEL;
  return envModel || 'gemini-2.5-flash';
}

export function setGeminiModel(model: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_MODEL_NAME, model.trim());
  }
}

export interface AIDynamicReactionResult {
  isReaction: boolean;
  reactionDefinition?: ReactionDefinition;
  explanation_vi: string;
  explanation_en: string;
  scientificNotes?: string;
}

// In-memory cache to prevent redundant API queries
const reactionAiCache = new Map<string, AIDynamicReactionResult>();

function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

/**
 * Test an API key with a minimal ping to Google Generative Language API
 */
export async function testGeminiApiKey(
  candidateKey?: string
): Promise<{ ok: boolean; model: string; error?: string }> {
  const apiKey = (candidateKey || getGeminiApiKey()).trim();
  if (!apiKey) {
    return { ok: false, model: '', error: 'API Key trống' };
  }

  const modelsToTry = [getGeminiModel(), 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  let lastError = '';

  for (const model of modelsToTry) {
    try {
      const url = '/api/gemini/generate';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey && apiKey !== '__server__' ? {'X-User-Api-Key':apiKey,'X-Gemini-Model':model} : {}) },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping. Reply JSON: {"ok": true}' }] }],
          generationConfig: { maxOutputTokens: 20 },
        }),
      });

      if (res.ok) {
        setGeminiModel(model);
        return { ok: true, model };
      } else {
        const errorData = await res.json().catch(() => ({}));
        lastError = errorData?.error?.message || `HTTP ${res.status} ${res.statusText}`;
      }
    } catch (err: any) {
      lastError = err.message || String(err);
    }
  }

  return { ok: false, model: '', error: lastError };
}

const VALID_PHYSICAL_STATES = new Set<PhysicalState>(['aq', 's', 'l', 'g']);

function validateSpeciesList(rawList: unknown): StoichiometricSpecies[] | null {
  if (!Array.isArray(rawList) || rawList.length === 0) return null;
  const out: StoichiometricSpecies[] = [];
  for (const item of rawList) {
    if (!item || typeof item !== 'object') return null;
    const rec = item as Record<string, unknown>;
    const formula = typeof rec.formula === 'string' ? rec.formula.trim() : '';
    const coefficient = Number(rec.coefficient);
    if (!formula || !Number.isFinite(coefficient) || coefficient <= 0) return null;
    const atoms = parseChemicalFormula(formula);
    if (Object.keys(atoms).length === 0) return null;
    const rawState = typeof rec.state === 'string' ? rec.state.trim().toLowerCase() : 'aq';
    const state: PhysicalState = VALID_PHYSICAL_STATES.has(rawState as PhysicalState)
      ? (rawState as PhysicalState)
      : 'aq';
    out.push({ formula, coefficient, state });
  }
  return out;
}

/**
 * Validates raw Gemini JSON output before entering the runtime reaction table:
 * rejects malformed formulas, missing vessel reactants, or non-conserving stoichiometry,
 * does not fabricate exothermic enthalpy, and tags provenance as 'ai-unverified'.
 */
export function validateGeminiReactionPayload(
  parsed: unknown,
  vesselFormulas?: readonly string[]
): ReactionDefinition | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const root = parsed as Record<string, unknown>;
  if (!root.isReaction || !root.reaction || typeof root.reaction !== 'object') return null;

  const rawRx = root.reaction as Record<string, unknown>;
  const reactants = validateSpeciesList(rawRx.reactants);
  const products = validateSpeciesList(rawRx.products);
  if (!reactants || !products) return null;

  if (vesselFormulas && vesselFormulas.length > 0) {
    const present = new Set(vesselFormulas.map((f) => normalizeFormula(f)));
    const allReactantsPresent = reactants.every((r) => {
      const norm = normalizeFormula(r.formula);
      return norm === 'H2O' || present.has(norm);
    });
    if (!allReactantsPresent) return null;
  }

  const rawDeltaH = rawRx.deltaH_kJ_mol;
  const deltaH = typeof rawDeltaH === 'number' && Number.isFinite(rawDeltaH) ? rawDeltaH : 0;

  const rawVisual = (rawRx.visual && typeof rawRx.visual === 'object'
    ? rawRx.visual
    : {}) as Record<string, unknown>;

  const rx: ReactionDefinition = {
    id: typeof rawRx.id === 'string' && rawRx.id.trim() ? rawRx.id.trim() : `rx_ai_${Date.now()}`,
    provenance: 'ai-unverified',
    name_en: typeof rawRx.name_en === 'string' && rawRx.name_en.trim() ? rawRx.name_en : 'Chemical Reaction',
    name_vi: typeof rawRx.name_vi === 'string' && rawRx.name_vi.trim() ? rawRx.name_vi : 'Phản ứng Hóa học',
    equation: typeof rawRx.equation === 'string' ? rawRx.equation : '',
    ionic_equation: typeof rawRx.ionic_equation === 'string' ? rawRx.ionic_equation : undefined,
    reactants,
    products,
    deltaH_kJ_mol: deltaH,
    visual: {
      precipitate: rawVisual.precipitate as ReactionDefinition['visual']['precipitate'],
      gas: rawVisual.gas as ReactionDefinition['visual']['gas'],
      colorChange:
        typeof rawVisual.resultingColorHex === 'string' && rawVisual.resultingColorHex
          ? { resultingColorHex: rawVisual.resultingColorHex }
          : undefined,
    },
    observable_vi: typeof rawRx.observable_vi === 'string' ? rawRx.observable_vi : '',
    observable_en: typeof rawRx.observable_en === 'string' ? rawRx.observable_en : '',
    safetyNotes_vi: typeof rawRx.safetyNotes_vi === 'string' ? rawRx.safetyNotes_vi : undefined,
    safetyNotes_en: typeof rawRx.safetyNotes_en === 'string' ? rawRx.safetyNotes_en : undefined,
    isDangerous: Boolean(rawRx.isDangerous),
  };

  if (!isElementBalancedReaction(rx)) return null;
  return rx;
}

/**
 * Predicts and synthesizes chemical reactions dynamically using Gemini
 */
export async function generateReactionFromGemini(
  reactantFormulas: string[],
  temperature_c = 25.0,
  isHeated = false,
  volume_ml = 100
): Promise<AIDynamicReactionResult | null> {
  const cacheKey = `${[...reactantFormulas].sort().join('+')}_T${Math.round(temperature_c)}_H${isHeated}`;
  if (reactionAiCache.has(cacheKey)) {
    return reactionAiCache.get(cacheKey)!;
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const prompt = `You are a world-class physical chemistry simulation engine and visual director.
A student in a 2D virtual chemistry lab mixed these substances together:
Reactants: ${JSON.stringify(reactantFormulas)}
Temperature: ${temperature_c}°C
Heating active: ${isHeated}
Vessel volume: ${volume_ml} mL

Determine if a real chemical reaction occurs under these exact laboratory conditions.
If NO reaction occurs (e.g. mutually inert salts, like NaCl + KNO3, or pure dilution):
Return JSON:
{
  "isReaction": false,
  "explanation_vi": "Giải thích ngắn gọn tại sao không có phản ứng xảy ra",
  "explanation_en": "Brief explanation of why no reaction occurs"
}

If a reaction DOES occur:
Return JSON strictly following this schema:
{
  "isReaction": true,
  "reaction": {
    "id": "gemini_rx_${Date.now()}",
    "name_en": "Reaction name in English",
    "name_vi": "Tên phản ứng bằng tiếng Việt",
    "equation": "Balanced chemical equation, e.g. 2Al + 6HCl -> 2AlCl3 + 3H2",
    "ionic_equation": "Net ionic equation if applicable",
    "reactants": [
      { "formula": "Exact chemical formula", "coefficient": 1, "state": "aq" }
    ],
    "products": [
      { "formula": "Exact chemical formula", "coefficient": 1, "state": "aq" }
    ],
    "deltaH_kJ_mol": -57.1,
    "resultingPh": 7.0,
    "visual": {
      "resultingColorHex": "#f8fafc",
      "precipitate": {
        "formula": "Formula of precipitate if formed",
        "colorHex": "#ffffff",
        "morphology": "curdy"
      },
      "gas": {
        "formula": "CO2 / H2 / etc",
        "effervescenceSpeed": "vigorous"
      }
    },
    "observable_vi": "Mô tả hiện tượng quan sát được bằng tiếng Việt",
    "observable_en": "Observable changes in English",
    "safetyNotes_vi": "Lưu ý an toàn thí nghiệm bằng tiếng Việt",
    "safetyNotes_en": "Safety notes in English",
    "isDangerous": false
  },
  "explanation_vi": "Giải thích bản chất hóa học chi tiết bằng tiếng Việt",
  "explanation_en": "Detailed scientific explanation in English"
}
Output ONLY raw valid JSON, no markdown codeblocks, no extra prose.`;

  const models = [...new Set([getGeminiModel(), 'gemini-2.5-flash'])];

  for (const model of models) {
    try {
      const url = '/api/gemini/generate';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey && apiKey !== '__server__' ? {'X-User-Api-Key':apiKey,'X-Gemini-Model':model} : {}) },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1200,
          },
        }),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;

      const parsed = JSON.parse(cleanJsonResponse(text));

      let result: AIDynamicReactionResult;
      if (parsed.isReaction && parsed.reaction) {
        const validated = validateGeminiReactionPayload(parsed, reactantFormulas);
        if (validated) {
          result = {
            isReaction: true,
            reactionDefinition: validated,
            explanation_vi: parsed.explanation_vi || validated.observable_vi,
            explanation_en: parsed.explanation_en || validated.observable_en,
          };
        } else {
          result = {
            isReaction: false,
            explanation_vi:
              'Đề xuất từ AI không đạt kiểm tra cân bằng nguyên tố hoặc công thức hợp lệ nên đã bị từ chối.',
            explanation_en:
              'AI reaction proposal failed formula or element conservation validation and was rejected.',
          };
        }
      } else {
        result = {
          isReaction: false,
          explanation_vi: parsed.explanation_vi || 'Không có phản ứng hóa học nào xảy ra giữa các chất này.',
          explanation_en: parsed.explanation_en || 'No chemical reaction occurs between these substances.',
        };
      }

      reactionAiCache.set(cacheKey, result);
      return result;
    } catch {
      // try next model
    }
  }

  return null;
}

/**
 * Ask Gemini Chemistry Assistant a direct question or request reaction analysis
 */
export async function queryGeminiChemistryTutor(
  userPrompt: string,
  currentVesselContext?: {
    vesselName: string;
    substances: string[];
    volume_ml: number;
    temperature_c: number;
    ph: number;
  }
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return 'Chưa cấu hình API Key Gemini. Vui lòng bấm vào nút "Cài đặt API Key" ở thanh công cụ để nhập Google AI Studio API Key của bạn.';
  }

  let contextPrompt = '';
  if (currentVesselContext) {
    contextPrompt = `\nBối cảnh bình thí nghiệm hiện tại:
Bình: ${currentVesselContext.vesselName}
Các chất có trong bình: ${currentVesselContext.substances.join(', ')}
Thể tích: ${currentVesselContext.volume_ml.toFixed(1)} mL
Nhiệt độ: ${currentVesselContext.temperature_c.toFixed(1)}°C
Độ pH hiện tại: ${currentVesselContext.ph.toFixed(2)}\n`;
  }

  const systemInstruction = `Bạn là Trợ lý Hóa học AI ChemDex thông minh, am hiểu chương trình Hóa học THPT (GDPT 2018) và đại học.
Nhiệm vụ của bạn là giải đáp mọi thắc mắc của học sinh về thí nghiệm hóa học, giải thích phương trình phản ứng, sự chuyển electron (oxi hóa - khử), màu sắc, kết tủa, cân bằng hóa học và an toàn thí nghiệm.
Trả lời bằng tiếng Việt chuẩn mực, sư phạm, dùng định dạng Markdown đẹp, công thức hóa học rõ ràng (ví dụ H₂SO₄, Cu²⁺, Fe(OH)₃).`;

  const models = [...new Set([getGeminiModel(), 'gemini-2.5-flash'])];

  for (const model of models) {
    try {
      const url = '/api/gemini/generate';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey && apiKey !== '__server__' ? {'X-User-Api-Key':apiKey,'X-Gemini-Model':model} : {}) },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemInstruction}\n${contextPrompt}\nCâu hỏi của học sinh: ${userPrompt}`,
                },
              ],
            },
          ],
        }),
      });

      if (!res.ok) {
        if (res.status === 400 || res.status === 403) {
          return 'API Key không hợp lệ hoặc bị từ chối bởi Google AI Studio (HTTP 400/403). Vui lòng kiểm tra lại API Key trong mục Cài đặt API Key.';
        }
        continue;
      }

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return reply;
    } catch (err: any) {
      // try next
    }
  }

  return 'Không thể kết nối đến Gemini AI lúc này. Bạn vẫn có thể thực hiện mọi thí nghiệm bằng kho hóa chất và cơ chế mô phỏng tự động offline.';
}
