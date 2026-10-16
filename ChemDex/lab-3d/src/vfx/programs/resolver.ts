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
import { assessProgramConditions } from '../../science/conditions';
import { identifySpecies } from '../../science/speciesIdentity';
import { LESSON_PROGRAM_IDS } from '../../lesson/programCompiler';
import { PrecipMorphology, GasSpecies, GAS_SPECIES_TABLE } from '../catalog/vocab';

export interface ResolveEnv {
  temperature_c?: number;
  isHeated?: boolean;
  isSealed?: boolean;
  lang?: string;
  volume_ml?: number;
  pH?: number;
  pressure_bar?: number;
  light?: boolean;
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
    .map(s => { const identity = identifySpecies(s); return `${identity.formula}${identity.concentration ? ':' + identity.concentration : ''}${identity.phase ? ':' + identity.phase : ''}`.toLowerCase(); })
    .filter(Boolean)
    .sort()
    .join('+');
}

/**
 * Tier 2: Rule-Derived Program Generator
 * Deterministically analyzes ionic species to produce fully parameterized ReactionPrograms.
 */
export function deriveProgramFromRules(substances: string[], env: ResolveEnv): ReactionProgram | null {
  const normSubs = substances.map(s => identifySpecies(s).formula.toLowerCase());
  const has = (sub: string) => normSubs.some(s => s === sub.toLowerCase());

  // Only produce a quantitative program when every counterion is known.
  const carbonates: Record<string, { formula: string; cation: string; charge: number; hydrogen: boolean; phase: 's' | 'aq' }> = {
    na2co3: { formula: 'Na2CO3', cation: 'Na', charge: 1, hydrogen: false, phase: 'aq' },
    k2co3: { formula: 'K2CO3', cation: 'K', charge: 1, hydrogen: false, phase: 'aq' },
    nahco3: { formula: 'NaHCO3', cation: 'Na', charge: 1, hydrogen: true, phase: 'aq' },
    khco3: { formula: 'KHCO3', cation: 'K', charge: 1, hydrogen: true, phase: 'aq' },
    caco3: { formula: 'CaCO3', cation: 'Ca', charge: 2, hydrogen: false, phase: 's' },
    mgco3: { formula: 'MgCO3', cation: 'Mg', charge: 2, hydrogen: false, phase: 's' },
  };
  const acids: Record<string, { formula: string; anion: string }> = {
    hcl: { formula: 'HCl', anion: 'Cl' },
    hno3: { formula: 'HNO3', anion: 'NO3' },
    ch3cooh: { formula: 'CH3COOH', anion: 'CH3COO' },
  };
  const carbonate = normSubs.map(name => carbonates[name]).find(Boolean);
  const acid = normSubs.map(name => acids[name]).find(Boolean);
  if (carbonate && acid) {
    const acidCoeff = carbonate.hydrogen ? 1 : 2;
    const saltCoeff = acidCoeff / carbonate.charge;
    const salt = carbonate.charge === 1
      ? (acid.anion === 'CH3COO' ? acid.anion + carbonate.cation : carbonate.cation + acid.anion)
      : carbonate.cation + (acid.anion.length > 2 ? '(' + acid.anion + ')' : acid.anion) + carbonate.charge;
    const coeff = (value: number) => value === 1 ? '' : String(value);
    const id = canonicalProgramKey([carbonate.formula, acid.formula]);
    return {
      schema: 'chemdex.program/1', id, provenance: 'rule-derived',
      chemistry: {
        equation: carbonate.formula + ' + ' + coeff(acidCoeff) + acid.formula + ' -> ' + coeff(saltCoeff) + salt + ' + H2O + CO2(g)',
        species: [
          { formula: carbonate.formula, role: 'reactant', coeff: 1, phase: carbonate.phase },
          { formula: acid.formula, role: 'reactant', coeff: acidCoeff, phase: 'aq' },
          { formula: salt, role: 'product', coeff: saltCoeff, phase: 'aq' },
          { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' },
          { formula: 'CO2', role: 'product', coeff: 1, phase: 'g' },
        ],
        kinetics: { model: 'instant', halfTime_s: 1 }, hazards: [],
      },
      visual: {
        duration_s: 6,
        timeline: [{ id: 'bubbles', atom: 'nucleateBubbles', anchor: 'bulk', window: [0, 0.8], intensity: 0.7, params: { gasSpecies: 'CO2', bubbleRate: 20 } }],
        after: { liquidColor: '#f8fafc', liquidOpacity: 0.95, turbidity: 0, gasesOffgassed: [{ species: 'CO2', mol: 'fromLedger', escaped: true }] },
      },
      explain: {
        observation_vi: 'Sủi bọt CO2 không màu; lượng sinh ra theo chất giới hạn.',
        observation_en: 'Colorless carbon dioxide evolves according to the limiting reagent.',
        why_vi: 'Axit tiêu thụ cacbonat hoặc hiđrocacbonat; muối tan và nước được giữ trong sổ lượng chất.',
        why_en: 'Acid consumes carbonate or bicarbonate; counterions and water remain in the inventory.',
      }, confidence: 1,
    };
  }
  // No universal metal + acid template: oxidizing acids and passivation need
  // their own reaction and conditions, rather than an invented H2 equation.

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
      observation_vi: 'Chưa xác định được phản ứng có đủ dữ liệu kiểm chứng cho tổ hợp này; hiện chỉ hiển thị thao tác trộn.',
      observation_en: 'No verified reaction is available for this combination; only mixing is shown.',
      why_vi: 'Thiếu phương trình hoặc điều kiện phù hợp không có nghĩa là chứng minh các chất không phản ứng.',
      why_en: 'Missing reaction data does not establish chemical inertness.'
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
  if (exact && !LESSON_PROGRAM_IDS.has(exact.id) && assessProgramConditions(exact, contents, env).ready) {
    return { program: exact, provenance: 'handcrafted' };
  }

  // Check any pairwise combinations with exact normalized formulas
  const normInput = substances.map(s => identifySpecies(s).formula.toLowerCase());
  for (const prog of ALL_HANDCRAFTED_PROGRAMS) {
    // These programs require explicit lesson conditions (catalyst, ignition,
    // enzyme, etc.); a free-mixing lookup must not bypass those gates.
    if (LESSON_PROGRAM_IDS.has(prog.id) || !assessProgramConditions(prog, contents, env).ready) continue;
    const progSubs = prog.chemistry.species
      .filter(s => s.role === 'reactant')
      .map(s => identifySpecies(s.formula).formula.toLowerCase());
    if (progSubs.length > 0 && progSubs.length === normInput.length && progSubs.every(ps => normInput.includes(ps))) {
      return { program: prog, provenance: 'handcrafted' };
    }
  }

  // 2. Rule-derived program
  const ruleDerived = deriveProgramFromRules(substances, env);
  const ruleMatchesInputs = ruleDerived?.chemistry.species.filter(item => item.role === 'reactant')
    .every(item => normInput.includes(identifySpecies(item.formula).formula.toLowerCase()));
  if (ruleDerived && ruleMatchesInputs && validateProgram(ruleDerived).valid && assessProgramConditions(ruleDerived, contents, env).ready) {
    return { program: ruleDerived, provenance: 'rule-derived' };
  }

  // 3. Cache lookup
  const cached = getCachedProgram(key, env.lang);
  if (cached && validateProgram(cached).valid && assessProgramConditions(cached, contents, env).ready) {
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
          if (val.success && val.program && assessProgramConditions(val.program, contents, env).ready) {
            setCachedProgram(key, val.program, env.lang);
            return { program: val.program, provenance: 'ai' };
          }
        } else if (data.equation || data.summary) {
          const fallback = createFallbackProgram(substances, env);
          if (data.equation) fallback.chemistry.equation = data.equation;
          if (data.summary) {
            fallback.explain.observation_vi = data.observable_changes || data.summary;
            fallback.explain.why_vi = data.summary;
          }
          return { program: fallback, provenance: 'fallback' };
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
