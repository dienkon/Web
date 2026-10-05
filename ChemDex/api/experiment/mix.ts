import { GoogleGenAI } from "@google/genai";

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey.startsWith("AQ.") || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("placeholder")) {
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (err) {
    console.warn("[Gemini Init Warning]:", err);
    return null;
  }
}

function safeParseJson(raw: string): any {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      const fixed = cleaned.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\");
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

function getDeterministicResult(
  substances: string[],
  volume: number = 0.5,
  lang: string = "en",
  isHeated: boolean = false
) {
  const isVi = lang === "vi";
  const subStr = substances.join(" + ");
  const normalized = Array.from(
    new Set(substances.map((s) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "")))
  ).sort();
  const isPureWaterOrIce = normalized.length === 0 || normalized.every((t) => t.includes("h2o"));
  const primaryName = substances[0] || "H2O";
  const isWater = isPureWaterOrIce || primaryName.toLowerCase().includes("h2o");
  const isIce = primaryName.toLowerCase().includes("h2o_s") || primaryName.toLowerCase().includes("ice");

  const canonicalKey = normalized.join("_") || (isHeated ? "heated_mixture" : "empty_mixture");

  return {
    reaction_id: canonicalKey,
    summary: isVi
      ? isIce
        ? "Nước đá / Nước cất (H₂O rắn tan chảy)"
        : isWater
        ? "Nước tinh khiết / Nước cất (H₂O)"
        : `Hỗn hợp các chất: ${subStr}`
      : isIce
      ? "Ice / Distilled Water (H₂O solid phase)"
      : isWater
      ? "Pure Distilled Water (H₂O)"
      : `Mixture of substances: ${subStr}`,
    equation: isIce ? "H₂O(s) ⇌ H₂O(l)" : isWater ? "H₂O" : subStr ? `${subStr} (hỗn hợp)` : "H₂O",
    reactants: substances.length > 0 ? substances : ["H2O"],
    products: substances.length > 0 ? substances : ["H2O"],
    safety_notes: isVi
      ? "Tuân thủ quy tắc an toàn và bảo hộ phòng thí nghiệm tiêu chuẩn."
      : "Standard laboratory safety measures apply.",
    observable_changes: isVi
      ? "Các chất hòa tan và khuấy trộn đồng đều trong bình phản ứng."
      : "Substances disperse and mix uniformly in the reaction vessel.",
    new_vessel_state: {
      liquid_color: isWater ? "#f8fafc" : "#e2e8f0",
      liquid_level: Math.min(1.0, Math.max(0.1, volume)),
      temperature_c: isHeated ? 60.0 : 25.0,
      has_precipitate: false,
      is_boiling: isHeated,
      has_gas: false,
      is_explosion: false,
    },
    program: {
      schema: "chemdex.program/1",
      id: canonicalKey,
      provenance: "fallback",
      chemistry: {
        equation: isWater ? "H₂O" : subStr,
        species: substances.map((s) => ({
          formula: s,
          role: "reactant" as const,
          coeff: 1,
          phase: "aq" as const,
          colorHex: "#ffffff",
        })),
        deltaH_kJ_per_mol: 0,
        kinetics: { model: "instant" as const, halfTime_s: 1.0 },
        hazards: [],
      },
      visual: {
        duration_s: 3.0,
        timeline: [
          {
            id: "atom_1",
            atom: "liquidSwirl",
            anchor: "bulk" as const,
            window: [0.0, 0.8] as [number, number],
            intensity: 1.0,
            params: {},
          },
        ],
        after: {
          liquidColor: isWater ? "#f8fafc" : "#e2e8f0",
          liquidOpacity: 1.0,
          turbidity: 0.0,
          gasesOffgassed: [],
        },
      },
      explain: {
        observation_vi: isVi
          ? "Các chất hòa tan và khuấy trộn đồng đều trong dung dịch."
          : "Substances mix uniformly.",
        observation_en: "Substances dissolve and mix uniformly.",
        why_vi: isVi
          ? "Quá trình hòa tan vật lý và khuếch tán phân tử."
          : "Physical dissolution and diffusion.",
        why_en: "Physical dissolution and molecular diffusion.",
      },
      confidence: 1.0,
    },
    effects: [{ type: "COLOR_CHANGE", duration: 1, color: isWater ? "#f8fafc" : "#e2e8f0" }],
    confidence: 1.0,
    is_dangerous: false,
    _resolutionSource: "deterministic",
    _canonicalKey: canonicalKey,
  };
}

const SYSTEM_PROMPT = `You are an expert chemistry AI assistant and visual director for a physically-faithful 3D virtual lab simulation.
Your task is to predict the chemical outcome of mixing reagents and compose an experiment reaction result.

SAFETY & EDUCATIONAL FRAMING:
This is an educational visual simulation. Dangerous combinations (acid+bleach -> Cl2, water into conc. H2SO4, heavy metals, toxic gases) MUST be shown with hazard overlays and safety warnings, NEVER with step-by-step real-world synthesis instructions or quantities.

You MUST return ONLY valid JSON matching this schema:
{
  "reaction_id": "String (lowercase canonical id, e.g. 'caco3_hcl')",
  "summary": "String describing the reaction briefly",
  "equation": "Balanced full equation with states, e.g. CaCO3(s) + 2HCl(aq) -> CaCl2(aq) + H2O(l) + CO2(g)",
  "ionic_equation": "String (optional)",
  "conditions": "String (optional)",
  "reactants": ["Array of chemical formulas"],
  "products": ["Array of chemical formulas"],
  "safety_notes": "String describing safety precautions",
  "observable_changes": "String describing visual changes (color, gas, precipitate)",
  "new_vessel_state": {
    "liquid_color": "Hex string (e.g. #ffffff)",
    "liquid_level": number (0 to 1),
    "temperature_c": number,
    "has_precipitate": boolean,
    "precipitate_color": "Hex string (optional)",
    "precipitate_substance": "Formula string (optional)",
    "precipitate_amount_g": number,
    "is_boiling": boolean,
    "has_gas": boolean,
    "gas_color": "Hex string (optional)",
    "is_explosion": boolean
  },
  "program": {
    "schema": "chemdex.program/1",
    "id": "canonical_id",
    "provenance": "ai",
    "chemistry": {
      "equation": "Balanced equation",
      "species": [
        { "formula": "Formula", "role": "reactant", "coeff": 1, "phase": "aq", "colorHex": "#ffffff" }
      ],
      "deltaH_kJ_per_mol": number,
      "kinetics": { "model": "instant", "halfTime_s": 1.5 },
      "hazards": ["GHS05_corrosive"]
    },
    "visual": {
      "duration_s": 4.0,
      "timeline": [
        {
          "id": "atom_1",
          "atom": "liquidSwirl",
          "anchor": "bulk",
          "window": [0.0, 0.8],
          "intensity": 1.0,
          "params": {}
        }
      ],
      "after": {
        "liquidColor": "#ffffff",
        "liquidOpacity": 1.0,
        "turbidity": 0.0,
        "gasesOffgassed": []
      }
    },
    "explain": { "observation_vi": "...", "observation_en": "...", "why_vi": "...", "why_en": "..." },
    "confidence": 0.95
  },
  "effects": [],
  "confidence": 0.95,
  "is_dangerous": boolean,
  "warning_message": "String (optional)"
}

RULES:
1. ONLY return the JSON object. Do not include markdown code blocks.
2. Balance all chemical equations accurately.
3. Colors must be lowercase 6-digit hex format (#ffffff).
4. If mixing water into concentrated acid, set is_dangerous=true, is_explosion=true, and return warning_message.`;

export default async function handler(req: any, res: any) {
  // Support both Edge Request and Node.js (req, res)
  const isNode = Boolean(res && typeof res.status === "function");

  if (req.method !== "POST") {
    if (isNode) {
      return res.status(405).json({ error: "Method not allowed" });
    }
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: any = {};
  try {
    if (req.body) {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } else if (typeof req.json === "function") {
      body = await req.json();
    }
  } catch {
    body = {};
  }

  const { substances = [], volume = 0.5, lang = "en", isHeated = false } = body;

  if (!Array.isArray(substances)) {
    const errObj = { error: "substances must be an array" };
    if (isNode) return res.status(400).json(errObj);
    return new Response(JSON.stringify(errObj), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const fallback = getDeterministicResult(substances, volume, lang, isHeated);
  const ai = getGeminiClient();

  if (!ai || substances.length === 0) {
    if (isNode) return res.status(200).json(fallback);
    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const input = `Mix the following substances: ${substances.join(
      " and "
    )}. Current liquid level is ${volume}. Heated: ${isHeated ? "Yes" : "No"}. Language: ${
      lang === "vi" ? "Vietnamese" : "English"
    }. Compose both summary and reaction program.`;

    const preferredModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    let response;
    try {
      response = await ai.models.generateContent({
        model: preferredModel,
        contents: [{ role: "user", parts: [{ text: input }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
        },
      });
    } catch {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: input }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
        },
      });
    }

    const text = response?.text;
    if (!text) {
      if (isNode) return res.status(200).json(fallback);
      return new Response(JSON.stringify(fallback), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parsed = safeParseJson(text);
    if (!parsed || typeof parsed !== "object") {
      if (isNode) return res.status(200).json(fallback);
      return new Response(JSON.stringify(fallback), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = {
      ...fallback,
      ...parsed,
      _resolutionSource: "gemini",
      _canonicalKey: fallback._canonicalKey,
    };

    if (isNode) return res.status(200).json(result);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.warn("[/api/experiment/mix] Falling back to deterministic:", err?.message || err);
    if (isNode) return res.status(200).json(fallback);
    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
