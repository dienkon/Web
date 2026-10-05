import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { GoogleGenAI } from '@google/genai';
import { MixResultSchema } from '../src/shared/schemas';

export const CURRENT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export function isGeminiConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return false;
  const trimmed = apiKey.trim();
  if (trimmed.startsWith('AQ.') || trimmed === 'MY_GEMINI_API_KEY' || trimmed.includes('placeholder')) {
    return false;
  }
  return true;
}

let _ai: GoogleGenAI | null = null;
export function getAIClient(): GoogleGenAI | null {
  if (!isGeminiConfigured()) return null;
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY!.trim();
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

export function safeParseJson(raw: string): any {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    try {
      // Repair invalid backslashes (such as LaTeX \Delta, \degree, etc.)
      const fixed = cleaned.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
      return JSON.parse(fixed);
    } catch {
      throw err;
    }
  }
}

import fs from 'fs';
import { validateProgram } from '../src/shared/programSchema';

let _cachedCatalogDigestText = '';
function getCatalogDigestPrompt(): string {
  if (_cachedCatalogDigestText) return _cachedCatalogDigestText;
  try {
    const digestPath = path.resolve(process.cwd(), 'server/generated/catalog.digest.json');
    if (fs.existsSync(digestPath)) {
      const digest = JSON.parse(fs.readFileSync(digestPath, 'utf-8'));
      _cachedCatalogDigestText = `AVAILABLE EFFECT ATOMS CATALOG (use ONLY these atom names in program.visual.timeline):\n` +
        digest.map((a: any) => `- "${a.name}" (${a.category}): ${a.summary_en}. Use when: ${a.useWhen?.join(', ')}. Avoid when: ${a.avoidWhen?.join(', ')}`).join('\n');
    }
  } catch (err) {
    console.warn('[AI] Could not load catalog.digest.json:', err);
  }
  return _cachedCatalogDigestText;
}

const SYSTEM_PROMPT = `You are an expert chemistry AI assistant and visual director for a physically-faithful 3D virtual lab simulation.
Your task is to predict the chemical outcome of mixing reagents and compose a declarative ReactionProgram.

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
    "liquid_color": "Hex string (e.g. #ffffff for clear, omit if empty)",
    "liquid_level": number (0 to 1, estimate volume increase),
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
        { "formula": "Formula", "role": "reactant|product", "coeff": 1, "phase": "s|l|g|aq", "colorHex": "#ffffff" }
      ],
      "deltaH_kJ_per_mol": number,
      "kinetics": { "model": "instant|first_order|second_order|surface_limited", "halfTime_s": 1.5 },
      "hazards": ["GHS05_corrosive", "GHS06_toxic", etc.]
    },
    "visual": {
      "duration_s": 5.0,
      "timeline": [
        {
          "id": "atom_1",
          "atom": "AtomNameFromCatalog",
          "anchor": "bulk|bottom|surface|rim|pourPoint|headspace",
          "window": [0.0, 0.8],
          "intensity": 1.0,
          "params": {}
        }
      ],
      "after": {
        "liquidColor": "#ffffff",
        "liquidOpacity": 1.0,
        "turbidity": 0.0,
        "precipitate": { "substance": "Formula", "morphology": "fine_powder|curd|floc|gel|crystal_plate|amorphous_black", "color": "#ffffff", "mass_g": "fromLedger" },
        "gasesOffgassed": [{ "species": "GasFormula", "mol": "fromLedger", "escaped": true }]
      }
    },
    "explain": { "observation_vi": "...", "observation_en": "...", "why_vi": "...", "why_en": "..." },
    "confidence": 0.95
  },
  
  "effects": [],
  "confidence": 0.0 to 1.0 (float),
  "is_dangerous": boolean,
  "warning_message": "String (optional). Strong warning if dangerous (e.g. Water poured into Conc. Acid)."
}

${getCatalogDigestPrompt()}

RULES:
1. ONLY return the JSON object. Do not include markdown code blocks (\`\`\`json).
2. Balance all chemical equations accurately.
3. Use ONLY atom names defined in the catalog above.
4. Colors must be lowercase 6-digit hex format (#ffffff).
5. If mixing water into concentrated acid, set is_dangerous=true, is_explosion=true, and return warning_message.`;

export async function generateMixResult(substances: string[], currentVolume: number = 0.5, lang: string = 'en', isHeated: boolean = false) {
  const ai = getAIClient();
  if (!ai) {
    console.log('[AI Notice] Gemini API key not configured or unsupported. Using deterministic chemistry engine.');
    return null;
  }

  const input = `Mix the following substances: ${substances.join(' and ')}. Current liquid level is ${currentVolume}. Heated: ${isHeated ? 'Yes' : 'No'}. Language: ${lang === 'vi' ? 'Vietnamese' : 'English'}. Compose both summary and program.`;
  const preferredModel = CURRENT_GEMINI_MODEL;
  let response;

  try {
    try {
      response = await ai.models.generateContent({
        model: preferredModel,
        contents: [{ role: 'user', parts: [{ text: input }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
        }
      });
    } catch (err: any) {
      console.warn(`[AI Warning] ${preferredModel} failed, trying fallback:`, err?.message || err);
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: input }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
        }
      });
    }

    const text = response.text;
    if (!text) return null;
    
    const parsed = safeParseJson(text);

    // Validate and repair ReactionProgram if present
    if (parsed.program) {
      const val = validateProgram(parsed.program);
      if (val.valid && val.program) {
        parsed.program = val.program;
        parsed.reaction_id = parsed.reaction_id || val.program.id;
      }
    }

    return MixResultSchema.parse(parsed); // Validate with Zod
  } catch (err: any) {
    console.warn('[AI Warning] Gemini API unavailable, falling back to local chemistry solver:', err?.message || err);
    return null;
  }
}

export interface ChemistryQueryParams {
  equation?: string;
  substances?: string[];
  userQuestion?: string;
  temperature_c?: number;
  isHeated?: boolean;
  lang?: string;
}

export interface ChemistryAIAnalysis {
  equation: string;
  reactionType: string;
  thermodynamics: {
    deltaH: string;
    deltaG: string;
    isExothermic: boolean;
    thermalNature: string;
  };
  kinetics: {
    rateLaw: string;
    activationEnergy: string;
    temperatureEffect: string;
    stirringEffect: string;
    catalystRole?: string;
  };
  conditions: {
    requiredTemperature: string;
    catalyst: string;
    medium: string;
    safetyPrecautions: string[];
  };
  laboratoryProcedure: {
    stepNumber: number;
    action: string;
    detail: string;
    warning?: string;
  }[];
  detailedAnswer: string;
}

const QUERY_SYSTEM_PROMPT = `You are a world-class physical chemistry research professor and laboratory instructor.
You provide precise scientific analysis of chemical equations, thermodynamics, reaction kinetics, and laboratory procedures.
You MUST output valid JSON conforming to this schema:
{
  "equation": "Balanced full chemical equation with states, e.g. HCl(aq) + NaOH(aq) -> NaCl(aq) + H2O(l)",
  "reactionType": "Specific category (e.g., Acid-Base Neutralization, Single Displacement, Redox, Esterification, Complexation)",
  "thermodynamics": {
    "deltaH": "Value in kJ/mol with sign, e.g. -57.3 kJ/mol",
    "deltaG": "Gibbs free energy change value or spontaneous assessment",
    "isExothermic": boolean,
    "thermalNature": "Short description (e.g. Tỏa nhiệt mạnh / Thu nhiệt cần đun nóng)"
  },
  "kinetics": {
    "rateLaw": "Rate equation, e.g. v = k [A]^m [B]^n",
    "activationEnergy": "Ea value or qualitative assessment (kJ/mol)",
    "temperatureEffect": "Impact of temperature rise (Arrhenius relationship)",
    "stirringEffect": "Effect of mechanical stirring on mass transport and rate",
    "catalystRole": "Specific role of any catalyst if applicable"
  },
  "conditions": {
    "requiredTemperature": "e.g. Nhiệt độ phòng (25°C) or Cần đun sôi (≥80°C)",
    "catalyst": "Catalyst if needed or 'Không yêu cầu'",
    "medium": "Aqueous / anhydrous / concentrated acid, etc.",
    "safetyPrecautions": ["List of critical PPE and safety rules"]
  },
  "laboratoryProcedure": [
    {
      "stepNumber": 1,
      "action": "Brief step title",
      "detail": "Accurate laboratory operation instructions",
      "warning": "Optional caution"
    }
  ],
  "detailedAnswer": "Thorough, pedagogically clear answer addressing the specific user inquiry or breaking down the equation in depth."
}

RULES:
- Return ONLY the JSON object without markdown code blocks.
- If language is Vietnamese ('vi'), all text explanations, procedures, and conditions MUST be in fluent, standard Vietnamese terminology (e.g. axit, bazơ, phản ứng tỏa nhiệt, xúc tác).
- Ensure scientific accuracy with real physical chemistry values.`;

export async function queryChemistryAI(params: ChemistryQueryParams): Promise<any> {
  const ai = getAIClient();
  const { equation, substances, userQuestion, temperature_c = 25, isHeated = false, lang = 'vi' } = params;

  const prompt = `Analyze this chemical scenario in detail:
Equation / Substances: ${equation || (substances ? substances.join(' + ') : 'N/A')}
Current Temperature: ${temperature_c}°C (Heated by burner: ${isHeated ? 'Yes' : 'No'})
User Specific Question: ${userQuestion || 'Cung cấp phân tích chi tiết thông số nhiệt động học, động học, điều kiện phản ứng và các bước thao tác phòng thí nghiệm chuẩn.'}
Language: ${lang === 'en' ? 'English' : 'Vietnamese'}.`;

  const preferredModel = CURRENT_GEMINI_MODEL;
  let response;
  try {
    response = await ai.models.generateContent({
      model: preferredModel,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: QUERY_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      }
    });
  } catch (err) {
    console.warn(`[AI Warning] ${preferredModel} fallback in queryChemistryAI:`, err);
    response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: QUERY_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      }
    });
  }

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  const parsed = safeParseJson(text);

  // Normalize so both standard ChemistryAIAnalysis and UI components receive expected fields
  const normalized = {
    ...parsed,
    equation: parsed.equation || equation || '',
    reaction_type: parsed.reaction_type || parsed.reactionType || 'Phản ứng hóa học',
    reactionType: parsed.reactionType || parsed.reaction_type || 'Phản ứng hóa học',
    thermodynamics: {
      ...parsed.thermodynamics,
      enthalpy_delta_h: parsed.thermodynamics?.enthalpy_delta_h || parsed.thermodynamics?.deltaH || 'N/A',
      gibbs_free_energy: parsed.thermodynamics?.gibbs_free_energy || parsed.thermodynamics?.deltaG || 'N/A',
      temperature_required: parsed.thermodynamics?.temperature_required || parsed.conditions?.requiredTemperature || '25°C',
    },
    kinetics: {
      ...parsed.kinetics,
      rate_law: parsed.kinetics?.rate_law || parsed.kinetics?.rateLaw || 'v = k[A][B]',
      reaction_speed: parsed.kinetics?.reaction_speed || (parsed.kinetics?.activationEnergy ? `Ea ~ ${parsed.kinetics.activationEnergy}` : 'Trung bình'),
      catalyst_needed: parsed.kinetics?.catalyst_needed || parsed.conditions?.catalyst || 'Không yêu cầu',
    },
    operational_procedure: {
      step_by_step: parsed.operational_procedure?.step_by_step || 
        (Array.isArray(parsed.laboratoryProcedure) 
          ? parsed.laboratoryProcedure.map((s: any) => typeof s === 'string' ? s : `${s.action}: ${s.detail}`) 
          : []),
      safety_precautions: parsed.operational_procedure?.safety_precautions || parsed.conditions?.safetyPrecautions || [],
    },
    explanation_vi: parsed.explanation_vi || parsed.detailedAnswer || '',
    explanation_en: parsed.explanation_en || parsed.detailedAnswer || '',
  };

  return normalized;
}

