import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { GoogleGenAI } from '@google/genai';
import { MixResultSchema } from '../src/shared/schemas';

export const CURRENT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

let _ai: GoogleGenAI | null = null;
export function getAIClient(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
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

const SYSTEM_PROMPT = `You are an expert chemistry AI assistant for a 3D virtual lab simulation.
Your task is to generate a structured JSON result for mixing specified chemicals.
You MUST return ONLY valid JSON matching this schema:
{
  "summary": "String describing the reaction briefly",
  "equation": "String, e.g., HCl + NaOH -> NaCl + H2O (can be No Reaction)",
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
    "is_boiling": boolean,
    "has_gas": boolean,
    "gas_color": "Hex string (optional)",
    "is_explosion": boolean
  },
  
  "effects": [
    {
      "type": "COLOR_CHANGE" | "PRECIPITATE" | "GAS" | "BOIL" | "EXPLOSION" | "CLEAR",
      "duration": number (in seconds, e.g. 2),
      "color": "Hex string (optional, e.g., gas color or new liquid color)"
    }
  ],
  
  "confidence": 0.0 to 1.0 (float),
  "is_dangerous": boolean (true if explosion risk, highly toxic, etc.),
  "warning_message": "String (optional). Strong warning if dangerous (e.g., Water poured into Conc. Acid)."
}

RULES:
1. ONLY return the JSON object. Do not include markdown code blocks (\`\`\`json).
2. Write text fields (summary, safety_notes, observable_changes, warning_message) in the requested language.
3. Be realistic with colors and physical states (e.g. CuSO4 is blue, Fe is solid).
4. Predict the resulting volume (liquid_level) by adding the volumes of mixed liquids.
5. Generate appropriate effects (e.g., if gas is produced, add a 'GAS' effect). Ensure reactions are realistic.
6. If mixing water into concentrated acid, it MUST cause boiling/splashing and return a warning_message!`;

export async function generateMixResult(substances: string[], currentVolume: number = 0.5, lang: string = 'en', isHeated: boolean = false) {
  const ai = getAIClient();
  const input = `Mix the following substances: ${substances.join(' and ')}. Current liquid level is ${currentVolume}. Heated: ${isHeated ? 'Yes' : 'No'}. Language: ${lang === 'vi' ? 'Vietnamese' : 'English'}.`;

  const preferredModel = CURRENT_GEMINI_MODEL;
  let response;
  try {
    response = await ai.models.generateContent({
      model: preferredModel,
      contents: [{ role: 'user', parts: [{ text: input }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      }
    });
  } catch (err) {
    console.warn(`[AI Warning] ${preferredModel} fallback triggered:`, err);
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
  if (!text) throw new Error("No response from AI");
  
  const parsed = safeParseJson(text);
  return MixResultSchema.parse(parsed); // Validate with Zod
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

