/**
 * resolver.ts — 5-Tier Reaction Program Resolution Pipeline
 * 
 * Implements §2.2 Resolution Pipeline:
 * Priority (first hit wins):
 * 1. handcrafted — exact match in the program library / legacy controllers
 * 2. rule-derived — deterministic inorganic rule engine (solubility, activity, acid-base, indicators)
 * 3. cache — previously validated program in LRU / localStorage
 * 4. ai — Gemini generates structured ReactionProgram
 * 5. fallback — conservative ledger-driven mixing swirl
 */

import { ReactionProgram, validateProgram } from '../../shared/programSchema';
import { SubstanceContent } from '../../types/chemistry';
import { ALL_HANDCRAFTED_PROGRAMS, getProgramById } from './library/index';
import { PrecipMorphology, GasSpecies, GAS_SPECIES_TABLE } from '../catalog/vocab';

export interface ResolveEnv {
  temperature_c?: number;
  isHeated?: boolean;
  isSealed?: boolean;
  lang?: string;
  volume_ml?: number;
}

export interface ResolveResult {
  program: ReactionProgram;
  provenance: 'handcrafted' | 'rule-derived' | 'cache' | 'ai' | 'fallback';
}

/**
 * Creates canonical key from a list of chemical substance names/formulas.
 * e.g. ['HCl', 'NaOH'] -> 'hcl+naoh'
 */
export function canonicalProgramKey(substances: string[]): string {
  return substances
    .map(s => s.replace(/\s*\([a-z0-9%]+\)/gi, '').trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('+');
}

/**
 * Tier 2: Rule-Derived Program Generator
 * Deterministically analyzes ionic species to produce fully parameterized ReactionPrograms.
 */
function deriveProgramFromRules(substances: string[], env: ResolveEnv): ReactionProgram | null {
  const normSubs = substances.map(s => s.replace(/\s*\([a-z0-9%]+\)/gi, '').trim().toLowerCase());
  const has = (sub: string) => normSubs.some(s => s === sub.toLowerCase());

  // 1. Carbonate / Bicarbonate + Acid -> CO2 Gas
  const hasCarbonate = normSubs.some(s => s.includes('co3') || s === 'caco3' || s === 'na2co3' || s === 'nahco3' || s === 'k2co3');
  const hasAcid = normSubs.some(s => s === 'hcl' || s === 'h2so4' || s === 'hno3' || s === 'ch3cooh');
  if (hasCarbonate && hasAcid) {
    const carbSub = substances.find(s => s.toLowerCase().includes('co3')) || 'Carbonate';
    const acidSub = substances.find(s => ['hcl', 'h2so4', 'hno3', 'ch3cooh'].includes(s.toLowerCase())) || 'Acid';
    const id = canonicalProgramKey([carbSub, acidSub]);
    return {
      schema: 'chemdex.program/1',
      id,
      provenance: 'rule-derived',
      chemistry: {
        equation: `${carbSub} + ${acidSub} -> Salt + H2O + CO2(g)`,
        species: [
          { formula: carbSub, role: 'reactant', coeff: 1, phase: 's' },
          { formula: acidSub, role: 'reactant', coeff: 2, phase: 'aq' },
          { formula: 'CO2', role: 'product', coeff: 1, phase: 'g' }
        ],
        kinetics: { model: 'instant', halfTime_s: 1.0 },
        hazards: []
      },
      visual: {
        duration_s: 6.0,
        timeline: [
          { id: 'eff', atom: 'effervescenceBurst', anchor: 'bottom', window: [0, 0.7], intensity: 1.2, params: { intensity: 2.5, churnRadius: 0.45, gasSpecies: 'CO2' } },
          { id: 'sound', atom: 'proceduralAcoustics', anchor: 'bulk', window: [0, 0.7], intensity: 0.9, params: { soundProfile: 'fizz_effervescence', volume: 0.75 } }
        ],
        after: { liquidColor: '#ffffff', liquidOpacity: 0.95, turbidity: 0.0, gasesOffgassed: [{ species: 'CO2', mol: 'fromLedger', escaped: true }] }
      },
      explain: {
        observation_vi: 'Sủi bọt khí không màu CO2 do axit phản ứng với muối cacbonat.',
        observation_en: 'Effervescence evolving colorless CO2 gas from acid-carbonate reaction.',
        why_vi: 'Axit đẩy axit cacbonic H2CO3 kém bền ra khỏi muối, sinh CO2 bay lên.',
        why_en: 'Acid displaces carbonic acid, which decomposes spontaneously to CO2 and water.'
      },
      confidence: 1.0
    };
  }

  // 2. Active Metal + Acid -> H2 Gas
  const metals = ['zn', 'mg', 'fe', 'al', 'ca'];
  const hasMetal = normSubs.find(s => metals.includes(s));
  if (hasMetal && hasAcid) {
    const metalName = substances.find(s => s.toLowerCase() === hasMetal) || hasMetal.toUpperCase();
    const id = canonicalProgramKey([metalName, 'acid']);
    return {
      schema: 'chemdex.program/1',
      id,
      provenance: 'rule-derived',
      chemistry: {
        equation: `${metalName} + Acid -> Salt + H2(g)`,
        species: [
          { formula: metalName, role: 'reactant', coeff: 1, phase: 's' },
          { formula: 'H2', role: 'product', coeff: 1, phase: 'g', hazards: ['GHS02_flammable'] }
        ],
        kinetics: { model: 'surface_limited', halfTime_s: 2.0 },
        hazards: ['GHS02_flammable']
      },
      visual: {
        duration_s: 7.0,
        timeline: [
          { id: 'bubbles', atom: 'nucleateBubbles', anchor: 'bottom', window: [0, 0.8], intensity: 1.1, params: { bubbleRate: 35, meanRadius_mm: 1.8, gasSpecies: 'H2' } },
          { id: 'erosion', atom: 'solidErosion', anchor: 'bottom', window: [0, 1.0], intensity: 1.0, params: { initialShape: 'granule', erosionRate: 0.15 } }
        ],
        after: { liquidColor: '#ffffff', liquidOpacity: 0.95, turbidity: 0.0, gasesOffgassed: [{ species: 'H2', mol: 'fromLedger', escaped: true }] }
      },
      explain: {
        observation_vi: `Kim loại ${metalName} sủi bọt khí H2 không màu và mòn dần.`,
        observation_en: `Metal ${metalName} steadily evolves H2 bubbles and slowly dissolves.`,
        why_vi: 'Kim loại hoạt động đứng trước hiđro khử ion H+ giải phóng khí H2.',
        why_en: 'Active metal reduces hydronium ions into gaseous hydrogen.'
      },
      confidence: 1.0
    };
  }

  // 3. Soluble Barium + Sulfate -> BaSO4 precipitate
  if ((has('bacl2') || has('ba(no3)2') || has('ba(oh)2')) && (has('na2so4') || has('k2so4') || has('h2so4') || has('cuso4') || has('feso4'))) {
    return getProgramById('bacl2_na2so4') || null;
  }

  // 4. Soluble Silver + Halide -> AgX precipitate
  if (has('agno3')) {
    if (has('nacl') || has('kcl') || has('hcl')) return getProgramById('agno3_nacl') || null;
    if (has('kbr') || has('nabr')) return getProgramById('agno3_kbr') || null;
    if (has('ki') || has('nai')) return getProgramById('agno3_ki') || null;
  }

  // 5. Soluble Lead + Iodide -> PbI2
  if (has('pb(no3)2') && (has('ki') || has('nai'))) {
    return getProgramById('pbno32_ki') || null;
  }

  // 6. Soluble Transition Metal + NaOH -> Metal Hydroxide Precipitate
  if (has('naoh') || has('koh')) {
    if (has('cuso4') || has('cucl2') || has('cu(no3)2')) return getProgramById('cuso4_naoh') || null;
    if (has('fecl3') || has('fe2(so4)3')) return getProgramById('fecl3_naoh') || null;
    if (has('feso4') || has('fecl2')) return getProgramById('feso4_naoh') || null;
    if (has('alcl3') || has('al2(so4)3')) return getProgramById('alcl3_naoh') || null;
  }

  // 7. Sulfide + Heavy Metal -> Metal Sulfide Black Precipitate
  if (has('na2s') || has('k2s')) {
    if (has('cuso4') || has('cucl2')) return getProgramById('na2s_cuso4') || null;
    if (has('pb(no3)2')) return getProgramById('na2s_pbno32') || null;
  }

  return null;
}

/**
 * Tier 5: Fallback Program
 * Generates a clean, truthful conservative program from the ledger and thermodynamics.
 * Zero fake dramatic effects.
 */
function createFallbackProgram(substances: string[], env: ResolveEnv): ReactionProgram {
  const id = canonicalProgramKey(substances);
  return {
    schema: 'chemdex.program/1',
    id,
    provenance: 'fallback',
    chemistry: {
      equation: `${substances.join(' + ')} (Physical Mixture)`,
      species: substances.map(s => ({ formula: s, role: 'reactant', coeff: 1, phase: 'aq' })),
      kinetics: { model: 'instant', halfTime_s: 0.5 },
      hazards: []
    },
    visual: {
      duration_s: 3.5,
      timeline: [
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.6], intensity: 0.8, params: { speed: 1.0, color: '#e2e8f0' } }
      ],
      after: {
        liquidColor: '#f8fafc',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Các chất trộn lẫn vào nhau tạo hỗn hợp đồng nhất, không có hiện tượng phản ứng hóa học đột biến.',
      observation_en: 'Substances physically mix into a homogeneous solution without spontaneous reaction.',
      why_vi: 'Không có ion kết hợp tạo kết tủa, chất khí hay chất điện ly yếu.',
      why_en: 'No driving force for precipitation, gas evolution, or redox electron transfer.'
    },
    confidence: 0.85
  };
}

// -------------------------------------------------------------
// Tier 3 Cache & Tier 4 AI Storage
// -------------------------------------------------------------

const PROGRAM_CACHE = new Map<string, ReactionProgram>();
const PROGRAM_CACHE_KEY = 'chemdex_programs_cache_v1';

export function getCachedProgram(key: string, lang?: string): ReactionProgram | null {
  const cacheKey = `${key}_${lang || 'en'}`;
  if (PROGRAM_CACHE.has(cacheKey)) {
    return PROGRAM_CACHE.get(cacheKey)!;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(PROGRAM_CACHE_KEY);
      if (raw) {
        const store = JSON.parse(raw);
        if (store[cacheKey]) {
          const val = validateProgram(store[cacheKey]);
          if (val.success && val.program) {
            PROGRAM_CACHE.set(cacheKey, val.program);
            return val.program;
          }
        }
      }
    } catch {}
  }
  return null;
}

export function setCachedProgram(key: string, program: ReactionProgram, lang?: string): void {
  const cacheKey = `${key}_${lang || 'en'}`;
  PROGRAM_CACHE.set(cacheKey, program);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(PROGRAM_CACHE_KEY) || '{}';
      const store = JSON.parse(raw);
      store[cacheKey] = program;
      window.localStorage.setItem(PROGRAM_CACHE_KEY, JSON.stringify(store));
    } catch {}
  }
}

export function clearProgramCache(): void {
  PROGRAM_CACHE.clear();
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(PROGRAM_CACHE_KEY);
    } catch {}
  }
}

/**
 * Master Reaction Program Resolver — 5-Tier Pipeline (§2.2)
 * Priority: 1. handcrafted -> 2. rule-derived -> 3. cache -> 4. ai -> 5. fallback
 */
export async function resolveReactionProgram(
  substances: string[],
  contents: SubstanceContent[] = [],
  env: ResolveEnv = {}
): Promise<ResolveResult> {
  const key = canonicalProgramKey(substances);

  // 1. Handcrafted exact match
  const exact = getProgramById(key);
  if (exact) {
    return { program: exact, provenance: 'handcrafted' };
  }

  // Check any pairwise combinations with exact normalized formulas
  const normInput = substances.map(s => s.replace(/\s*\([a-z0-9%]+\)/gi, '').replace(/\..*$/, '').trim().toLowerCase());
  for (const prog of ALL_HANDCRAFTED_PROGRAMS) {
    const progSubs = prog.chemistry.species
      .filter(s => s.role === 'reactant')
      .map(s => s.formula.replace(/\s*\([a-z0-9%]+\)/gi, '').replace(/\..*$/, '').trim().toLowerCase());
    if (progSubs.length > 0 && progSubs.length === normInput.length && progSubs.every(ps => normInput.includes(ps))) {
      return { program: prog, provenance: 'handcrafted' };
    }
  }

  // 2. Rule-derived program
  const ruleDerived = deriveProgramFromRules(substances, env);
  if (ruleDerived) {
    return { program: ruleDerived, provenance: 'rule-derived' };
  }

  // 3. Cache lookup
  const cached = getCachedProgram(key, env.lang);
  if (cached) {
    return { program: cached, provenance: 'cache' };
  }

  // 4. AI resolution (Gemini via /api/experiment/mix)
  if (typeof fetch === 'function') {
    try {
      const res = await fetch('/api/experiment/mix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          substances,
          volume: (env.volume_ml || 50) / 100,
          lang: env.lang || 'en',
          isHeated: env.isHeated || false
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.program) {
          const val = validateProgram(data.program);
          if (val.success && val.program) {
            setCachedProgram(key, val.program, env.lang);
            return { program: val.program, provenance: 'ai' };
          }
        }
      }
    } catch {
      // Offline fallback
    }
  }

  // 5. Fallback (safe & deterministic)
  const fallback = createFallbackProgram(substances, env);
  return { program: fallback, provenance: 'fallback' };
}
