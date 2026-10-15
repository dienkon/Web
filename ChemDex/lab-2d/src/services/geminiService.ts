/**
 * Gemini 3.5 Flash Lite Reaction Engine & Chemistry AI Assistant Service
 * Connects directly to Google GenAI REST API with model: gemini-3.5-flash-lite
 * Handles dynamic reaction generation, stoichiometry prediction, and AI chemistry tutoring.
 */

import { ReactionDefinition } from '../types/chemistry';

const GEMINI_API_KEY =
  (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  'AQ.Ab8RN6KRVoRy4rPxL4R7dK_E1t-uLlShoCBdSabw7AsHCg6pdg';

export const GEMINI_MODEL =
  (import.meta as any).env?.VITE_GEMINI_MODEL || 'gemini-3.5-flash-lite';

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
 * Predicts and synthesizes chemical reactions dynamically using gemini-3.5-flash-lite
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
      { "formula": "Exact chemical formula", "coefficient": 1, "state": "aq" | "s" | "g" | "l" }
    ],
    "products": [
      { "formula": "Exact chemical formula", "coefficient": 1, "state": "aq" | "s" | "g" | "l" }
    ],
    "deltaH_kJ_mol": -57.1,
    "resultingPh": 7.0,
    "visual": {
      "resultingColorHex": "#f8fafc",
      "precipitate": {
        "formula": "Formula of precipitate if formed",
        "colorHex": "#ffffff",
        "morphology": "curdy" | "milky" | "gel" | "floc" | "plates" | "powder"
      },
      "gas": {
        "formula": "CO2 / H2 / etc",
        "effervescenceSpeed": "slow" | "vigorous" | "instant"
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

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1200,
        },
      }),
    });

    if (!res.ok) {
      console.warn('[Gemini API Response Not OK]:', res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(cleanJsonResponse(text));

    let result: AIDynamicReactionResult;
    if (parsed.isReaction && parsed.reaction) {
      const rx: ReactionDefinition = {
        id: parsed.reaction.id || `rx_ai_${Date.now()}`,
        name_en: parsed.reaction.name_en || 'Chemical Reaction',
        name_vi: parsed.reaction.name_vi || 'Phản ứng Hóa học',
        equation: parsed.reaction.equation || '',
        ionic_equation: parsed.reaction.ionic_equation,
        reactants: parsed.reaction.reactants || [],
        products: parsed.reaction.products || [],
        deltaH_kJ_mol: parsed.reaction.deltaH_kJ_mol ?? -25.0,
        visual: {
          precipitate: parsed.reaction.visual?.precipitate,
          gas: parsed.reaction.visual?.gas,
          colorChange: parsed.reaction.visual?.resultingColorHex
            ? { resultingColorHex: parsed.reaction.visual.resultingColorHex }
            : undefined,
        },
        observable_vi: parsed.reaction.observable_vi || '',
        observable_en: parsed.reaction.observable_en || '',
        safetyNotes_vi: parsed.reaction.safetyNotes_vi,
        safetyNotes_en: parsed.reaction.safetyNotes_en,
        isDangerous: parsed.reaction.isDangerous || false,
      };

      result = {
        isReaction: true,
        reactionDefinition: rx,
        explanation_vi: parsed.explanation_vi || rx.observable_vi,
        explanation_en: parsed.explanation_en || rx.observable_en,
      };
    } else {
      result = {
        isReaction: false,
        explanation_vi: parsed.explanation_vi || 'Không có phản ứng hóa học nào xảy ra giữa các chất này.',
        explanation_en: parsed.explanation_en || 'No chemical reaction occurs between these substances.',
      };
    }

    reactionAiCache.set(cacheKey, result);
    return result;
  } catch (err: any) {
    console.error('[Gemini AI Reaction Error]:', err);
    return null;
  }
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
  let contextPrompt = '';
  if (currentVesselContext) {
    contextPrompt = `\nCurrent laboratory vessel context:
Vessel: ${currentVesselContext.vesselName}
Current Substances: ${currentVesselContext.substances.join(', ')}
Volume: ${currentVesselContext.volume_ml} mL
Temperature: ${currentVesselContext.temperature_c}°C
Current pH: ${currentVesselContext.ph}\n`;
  }

  const systemInstruction = `Bạn là Trợ lý Hóa học AI ChemDex thông minh và tận tâm, chạy trên mô hình gemini-3.5-flash-lite.
Nhiệm vụ của bạn là giải đáp mọi thắc mắc của học sinh về thí nghiệm hóa học, giải thích phương trình phản ứng, sự chuyển electron (oxi hóa - khử), màu sắc, kết tủa, cân bằng hóa học và an toàn thí nghiệm.
Trả lời bằng tiếng Việt chuẩn mực, rõ ràng, dùng định dạng Markdown đẹp, công thức có chỉ số dưới (ví dụ H₂SO₄, Cu²⁺).`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      return 'Xin lỗi, không thể kết nối tới mô hình Gemini lúc này. Vui lòng kiểm tra kết nối mạng.';
    }

    const data = await res.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Không nhận được phản hồi từ mô hình Gemini.'
    );
  } catch (err: any) {
    return `Lỗi khi kết nối với Gemini 3.5 Flash Lite: ${err.message || err}`;
  }
}
