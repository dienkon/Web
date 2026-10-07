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

export interface ProgramDirectorRequest {
  species: Array<{
    formula: string;
    phase?: string;
    moles?: number;
    mass_g?: number;
    volume_ml?: number;
    conc_M?: number;
  }>;
  vessel?: {
    type?: string;
    capacity_ml?: number;
    T_c?: number;
    sealed?: boolean;
    stirred?: boolean;
    heated?: boolean;
    atmosphere?: string;
  };
  orderOfAddition?: string[];
  verdict?: any;
  lang?: string;
}

export function logAIProgram(entry: {
  timestamp: string;
  request: ProgramDirectorRequest;
  program: any;
  validation: { valid: boolean; errors: string[] };
}) {
  try {
    const logsDir = path.resolve(process.cwd(), 'server/logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logFile = path.join(logsDir, 'ai_programs.jsonl');
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf-8');
  } catch (err) {
    console.warn('[AI Logging] Failed to append to ai_programs.jsonl:', err);
  }
}

export function getDirectorSystemPrompt(): string {
  return `You are the Effect Director of a physically faithful virtual chemistry lab (ChemDex).
Your job: given the chemistry verdict and the experimental situation, output ONE JSON object
conforming exactly to the supplied ReactionProgram schema. You output DATA ONLY.

HARD RULES:
1. Use ONLY effect atoms that appear in the provided catalog digest, with parameters inside the stated ranges. Never invent atom names, anchors, gases, morphologies or fields.
2. Chemistry first. Provide a balanced equation with states (s,l,g,aq), limiting-reagent logic, and realistic products. If nothing happens under given conditions, return kind "no_reaction", a mixing-only timeline, and explain why.
3. Be quantitative: use the given moles/volumes; decide limiting reagent; state product moles; never produce more than limiting reagent allows. Conservation of mass, atoms and charge is mandatory.
4. Physical appearance must match real observations: colors from known ion colors; precipitate morphology, color and settling behavior; gas identity, color, density relative to air, odor tag; heat sign and magnitude; speed (instant / seconds / minutes / needs heating); induction periods and stochastic crystallization where real.
5. Invisible gases (H2, O2, CO2, SO2, NH3, H2S, CH4) are NEVER drawn as colored smoke. Show them through bubbles, indicator tests, balloon/pressure effects. Visible "steam"/fog is condensed droplets.
6. Heavy gases sink and pool; light gases rise. Choose atoms and anchors accordingly.
7. Ledger binding: prefer binding intensities to species rates/amounts ("rate:CO2", "amount:Zn(s)").
8. Time honesty: set visual.duration_s for display and timeWarp.physical_s when real process is much slower.
9. Safety: never provide synthesis or misuse guidance. For toxic-gas-forming or energetic combinations return conservative visuals, hazards[], and clear warnings; for out-of-scope compounds return kind "out_of_scope".
10. Language: all *_vi fields in Vietnamese, *_en in English; short, observational, like a lab notebook.
11. Output JSON only, no markdown, no comments. Maximum 24 atoms. Colors as #rrggbb.

${getCatalogDigestPrompt()}`;
}

export async function generateProgramFromAI(req: ProgramDirectorRequest): Promise<any | null> {
  const ai = getAIClient();
  if (!ai) {
    console.log('[AI Notice] Gemini API key not configured. Cannot run AI effect director.');
    return null;
  }

  const situationDescription = `Experimental situation:
Species: ${req.species.map(s => `${s.formula} (${s.phase || 'aq'}, moles: ${s.moles ?? 'unknown'}, conc: ${s.conc_M ?? 'unknown'} M)`).join(', ')}
Vessel: ${req.vessel?.type || 'beaker'}, capacity: ${req.vessel?.capacity_ml || 100} mL, T: ${req.vessel?.T_c ?? 25} C, sealed: ${req.vessel?.sealed ? 'Yes' : 'No'}, heated: ${req.vessel?.heated ? 'Yes' : 'No'}
Order of addition: ${req.orderOfAddition?.join(' -> ') || 'simultaneous'}
Verdict: ${JSON.stringify(req.verdict || {})}
Language: ${req.lang || 'en'}`;

  const preferredModel = CURRENT_GEMINI_MODEL;
  let responseText: string | null = null;
  const systemInstruction = getDirectorSystemPrompt();

  try {
    const res = await ai.models.generateContent({
      model: preferredModel,
      contents: [{ role: 'user', parts: [{ text: situationDescription }] }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      }
    });
    responseText = res.text || null;
  } catch (err: any) {
    console.warn(`[AI Warning] ${preferredModel} failed in generateProgramFromAI, trying fallback:`, err?.message || err);
    try {
      const resFallback = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: situationDescription }] }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        }
      });
      responseText = resFallback.text || null;
    } catch (fErr) {
      console.warn('[AI Error] Fallback model also failed in generateProgramFromAI:', fErr);
      return null;
    }
  }

  if (!responseText) return null;

  try {
    const rawProgram = safeParseJson(responseText);
    const validation = validateProgram(rawProgram);
    
    // Log to server/logs/ai_programs.jsonl
    logAIProgram({
      timestamp: new Date().toISOString(),
      request: req,
      program: rawProgram,
      validation: { valid: validation.valid, errors: validation.errors }
    });

    if (validation.valid && validation.program) {
      return validation.program;
    } else {
      console.warn('[AI Warning] AI Program failed validation:', validation.errors);
      return validation.program || null;
    }
  } catch (parseErr) {
    console.error('[AI Error] Failed to parse AI Program JSON:', parseErr);
    return null;
  }
}

