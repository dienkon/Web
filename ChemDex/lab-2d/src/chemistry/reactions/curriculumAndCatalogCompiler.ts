/**
 * Unified Compiler for THPT Curriculum Protocols (131 reactions) and Shared Reaction Catalog (1,300 entries).
 * Normalizes formulas, infers missing physical states, enforces balanced stoichiometry, extracts thermal/catalyst
 * conditions, and attaches 2D/3D visual + VFX controller descriptors.
 */

import curriculumData from '../../data/curriculum/curriculumCore.json';
import {
  PhysicalState,
  PrecipitateMorphology,
  ReactionArchetype,
  ReactionDefinition,
  StoichiometricSpecies,
} from '../../types/chemistry';
import { normalizeFormula } from '../core/formula';
import { isElementBalancedReaction } from '../core/ledger';

export interface CompiledReactionEntry extends ReactionDefinition {
  source: 'curriculum' | 'catalog';
  family?: string;
  requiresCatalyst?: boolean;
  catalystFormula?: string;
  requiresAlkaneExcess?: boolean;
  tags?: string[];
}

interface RawCurriculumSpecies {
  formula: string;
  role?: string;
  coeff?: number;
  coefficient?: number;
  phase?: string;
  colorHex?: string;
}

interface RawCurriculumEntry {
  id: string;
  title_vi?: string;
  title_en?: string;
  equation?: string;
  equation_balanced?: string;
  ionic_equation?: string;
  conditions?: { description_vi?: string; description_en?: string; catalyst?: string };
  conditions_vi?: string;
  observation_vi?: string;
  observation_en?: string;
  explanation_vi?: string;
  safetyNotes_vi?: string;
  isDangerous?: boolean;
  reactants: RawCurriculumSpecies[];
  products: RawCurriculumSpecies[];
  thermochemistry?: { deltaH_kJ_per_mol_reaction?: number | null };
  effects?: {
    after?: {
      liquidColor?: string;
      turbidity?: number;
      gasesOffgassed?: Array<{ species: string }>;
      precipitate?: { formula?: string; colorHex?: string };
    };
  };
}

interface RawCatalogEntry {
  id: string;
  family: string;
  topic_vi?: string;
  title_vi?: string;
  equation: string;
  ionic?: { equation?: string };
  reactants: Array<{ formula: string; coefficient: number; phase: string }>;
  products: Array<{ formula: string; coefficient: number; phase: string }>;
  reversible?: boolean;
  conditions?: {
    description_vi?: string;
    catalyst?: string;
    activation?: string;
  };
  observation_vi?: string;
  explanation_vi?: string;
  effects?: {
    gases?: string[];
    solids?: string[];
    deltaH_kJ_per_mol?: number | null;
    color?: string | null;
  };
}

const GAS_FORMULAS = new Set([
  'H2', 'O2', 'N2', 'CL2', 'F2', 'CO2', 'CO', 'SO2', 'H2S', 'NO', 'NO2', 'N2O',
  'NH3', 'CH4', 'C2H4', 'C2H2', 'C2H6', 'C3H8', 'C4H10', 'C3H6', 'C4H8', 'HCL',
]);

const LIQUID_FORMULAS = new Set([
  'H2O', 'C2H5OH', 'CH3OH', 'CH3COOC2H5', 'CH3COOCH3', 'C2H5COOC2H5', 'HCOOCH3',
  'HCOOC2H5', 'C3H8O3', 'C3H5(OH)3', 'C2H4BR2', 'C2H2BR4', 'C6H6', 'C6H5CH3',
  'CCL4', 'CHCL3', 'C2H5OC2H5', 'C6H14', 'CH3CHO', 'C6H5NH2', 'CH3COOC6H5',
]);

const SOLID_FORMULAS = new Set([
  'C', 'S', 'P', 'I2', 'NA', 'K', 'LI', 'CA', 'BA', 'MG', 'AL', 'ZN', 'FE', 'NI',
  'SN', 'PB', 'CU', 'AG', 'AU', 'HG', 'MN', 'CR',
  'CUO', 'FE2O3', 'FEO', 'FE3O4', 'CAO', 'MGO', 'ZNO', 'AL2O3', 'BAO', 'PBO', 'AG2O',
  'MNO2', 'CR2O3', 'CACO3', 'BACO3', 'MGCO3', 'SRCO3', 'ZNCO3', 'FECO3', 'CUCO3',
  'CU(OH)2', 'FE(OH)2', 'FE(OH)3', 'AL(OH)3', 'ZN(OH)2', 'MG(OH)2', 'CR(OH)3',
  'NI(OH)2', 'CO(OH)2', 'MN(OH)2', 'PB(OH)2', 'CA(OH)2',
  'AGCL', 'AGBR', 'AGI', 'BASO4', 'PBSO4', 'PBI2', 'PBCL2', 'PBS', 'CUS', 'AGS',
  'FES', 'ZNS', 'CDS', 'MNS', 'FEPO4', 'CU2O', 'C6H2BR3OH', 'C6H2BR3NH2',
  'C6H10O5', 'KFE[FE(CN)6]', 'CU2[FE(CN)6]', 'CACL2', 'NA2CO3', 'K2CO3',
]);

const PRECIPITATE_STYLE_MAP: Record<string, { colorHex: string; morphology: PrecipitateMorphology }> = {
  AGCL: { colorHex: '#ffffff', morphology: 'curdy' },
  AGBR: { colorHex: '#fef08a', morphology: 'curdy' },
  AGI: { colorHex: '#eab308', morphology: 'curdy' },
  BASO4: { colorHex: '#ffffff', morphology: 'powder' },
  BACO3: { colorHex: '#ffffff', morphology: 'powder' },
  CACO3: { colorHex: '#ffffff', morphology: 'powder' },
  'CA3(PO4)2': { colorHex: '#ffffff', morphology: 'powder' },
  MGCO3: { colorHex: '#ffffff', morphology: 'powder' },
  PBSO4: { colorHex: '#ffffff', morphology: 'powder' },
  PBCL2: { colorHex: '#ffffff', morphology: 'crystalline' },
  PBI2: { colorHex: '#eab308', morphology: 'plates' },
  'CU(OH)2': { colorHex: '#0284c7', morphology: 'gel' },
  'FE(OH)3': { colorHex: '#9a3412', morphology: 'floc' },
  'FE(OH)2': { colorHex: '#cbd5e1', morphology: 'gel' },
  'AL(OH)3': { colorHex: '#f8fafc', morphology: 'gel' },
  'ZN(OH)2': { colorHex: '#f8fafc', morphology: 'gel' },
  'MG(OH)2': { colorHex: '#f8fafc', morphology: 'gel' },
  'MN(OH)2': { colorHex: '#fecdd3', morphology: 'floc' },
  'NI(OH)2': { colorHex: '#4ade80', morphology: 'gel' },
  'CO(OH)2': { colorHex: '#f472b6', morphology: 'floc' },
  'CR(OH)3': { colorHex: '#6ee7b7', morphology: 'gel' },
  CUS: { colorHex: '#18181b', morphology: 'powder' },
  PBS: { colorHex: '#18181b', morphology: 'powder' },
  AG2S: { colorHex: '#18181b', morphology: 'powder' },
  FES: { colorHex: '#27272a', morphology: 'powder' },
  ZNS: { colorHex: '#ffffff', morphology: 'powder' },
  CDS: { colorHex: '#facc15', morphology: 'powder' },
  MNS: { colorHex: '#fda4af', morphology: 'floc' },
  AG2O: { colorHex: '#78350f', morphology: 'powder' },
  CU2O: { colorHex: '#dc2626', morphology: 'powder' },
  CUO: { colorHex: '#18181b', morphology: 'powder' },
  MNO2: { colorHex: '#27272a', morphology: 'powder' },
  S: { colorHex: '#fef08a', morphology: 'colloidal' },
  FEPO4: { colorHex: '#fef08a', morphology: 'powder' },
  CU: { colorHex: '#b85d3b', morphology: 'crystalline' },
  AG: { colorHex: '#e2e8f0', morphology: 'crystalline' },
  C6H2BR3OH: { colorHex: '#ffffff', morphology: 'crystalline' },
  C6H2BR3NH2: { colorHex: '#ffffff', morphology: 'crystalline' },
  'KFE[FE(CN)6]': { colorHex: '#1e3a8a', morphology: 'colloidal' },
  'CU2[FE(CN)6]': { colorHex: '#7f1d1d', morphology: 'floc' },
  'CA(OH)2': { colorHex: '#ffffff', morphology: 'powder' },
};

const GAS_COLOR_MAP: Record<string, string> = {
  NO2: '#c2410c',
  CL2: '#bef264',
  I2: '#9333ea',
  BR2: '#9a3412',
};

/**
 * Normalizes polymer and symbolic formula syntax into balanced monomeric formulas
 * parseable by the stoichiometry engine while preserving display equations.
 */
function sanitizeFormulaToken(rawFormula: string): string {
  const trimmed = rawFormula.trim();
  if (trimmed === '(C6H10O5)n' || trimmed === 'C6H10O5n') return 'C6H10O5';
  if (/^n[A-Z(]/.test(trimmed)) return trimmed.slice(1);
  return trimmed.replace(/\[/g, '(').replace(/\]/g, ')');
}

function inferStateForCurriculum(formula: string, role?: string, contextId?: string): PhysicalState {
  const norm = normalizeFormula(formula);
  // Bromine water reactions in the curriculum use aqueous Br2
  if (norm === 'BR2' && contextId && /(ethene|ethyne|phenol|aniline)_bromine/i.test(contextId)) {
    return 'aq';
  }
  // CaO + H2O produces Ca(OH)2 suspension in excess water
  if (norm === 'CA(OH)2' && contextId === 'cao_water') return 'aq';
  if (norm === 'H2O') return 'l';
  if (norm === 'NH3' && contextId && /nh3/i.test(contextId)) return 'aq';
  if (norm === 'BR2') return 'aq';
  if (norm === 'HCL' && role === 'reactant') return 'aq';
  if (norm === 'HBR' && role === 'product') return 'aq';
  if (norm === 'NA2CO3' || norm === 'NAHCO3') {
    return contextId?.startsWith('acetic_') ? 'aq' : 's';
  }
  if (SOLID_FORMULAS.has(norm)) return 's';
  if (GAS_FORMULAS.has(norm)) return 'g';
  if (LIQUID_FORMULAS.has(norm)) return 'l';
  if (norm.startsWith('CU(') && !norm.includes('(OH)2')) return 'aq';
  return 'aq';
}

function mergeDuplicateSpecies(list: StoichiometricSpecies[]): StoichiometricSpecies[] {
  const byFormula = new Map<string, StoichiometricSpecies>();
  for (const sp of list) {
    const key = normalizeFormula(sp.formula);
    const existing = byFormula.get(key);
    if (existing) {
      existing.coefficient += sp.coefficient;
    } else {
      byFormula.set(key, { ...sp });
    }
  }
  return Array.from(byFormula.values());
}

function parseHeatingAndCatalystConditions(
  id: string,
  descVi: string,
  activation?: string,
  catalyst?: string,
  family?: string,
  reactants?: StoichiometricSpecies[],
  products?: StoichiometricSpecies[]
): {
  requiresHeating: boolean;
  minTemp_c?: number;
  requiresCatalyst: boolean;
  catalystFormula?: string;
} {
  const lower = descVi.toLowerCase();
  const singleFormula = reactants?.length === 1 ? normalizeFormula(reactants[0].formula) : '';
  const isThermalDecomp =
    reactants?.length === 1 &&
    (products?.length ?? 0) >= 2 &&
    singleFormula !== 'H2O2' &&
    singleFormula !== 'H2CO3' &&
    id !== 'glucose_fermentation' &&
    !lower.startsWith('men,');
  const isHighTempSolidOrBurn =
    /(decomp|thermal|_heat|combustion|_burn$|_o2$|^mg_o2|^fe_o2|^cu_o2|^c_o2|^s_o2|^p_o2|^h2_o2|^n2_h2|^so2_o2|^fe_s|^zn_s|^cu_s|^al_s|^al_fe2o3|^cuo_h2|^cuo_c|^fe2o3_co|^kclo3|^kmno4)/i.test(
      id
    );
  const isCombustion =
    id.includes('combustion') ||
    id.includes('_burn') ||
    family === 'combustion' ||
    lower.includes('mồi cháy') ||
    lower.includes('đốt');
  const isDehydration = id === 'ethanol_dehydration' || lower.includes('170');
  const isCalcination = id === 'caco3_heat' || lower.includes('lò nung') || lower.includes('nhiệt độ cao');
  const isHotConcAcid = id === 'cu_conc_h2so4' || id === 'kcl_conc_h2so4' || id === 'cuo_h2so4_conc';
  const isMandatoryHeat =
    isThermalDecomp ||
    isHighTempSolidOrBurn ||
    isCombustion ||
    isDehydration ||
    isCalcination ||
    isHotConcAcid ||
    family === 'thermal' ||
    family === 'synthesis' ||
    activation === 'heating' ||
    lower.includes('đun nóng') ||
    lower.includes('đun sôi') ||
    lower.includes('đun nhẹ') ||
    lower.includes('bể nước') ||
    lower.includes('nhiệt phân') ||
    (lower.includes('làm ấm') && !lower.includes('có thể làm ấm'));

  let minTemp_c: number | undefined;
  if (isDehydration) minTemp_c = 150;
  else if (isCalcination || family === 'thermal') minTemp_c = 85;
  else if (isCombustion) minTemp_c = 65;
  else if (isHotConcAcid || isThermalDecomp || isHighTempSolidOrBurn) minTemp_c = 65;
  else if (lower.includes('bể nước') || lower.includes('làm ấm') || lower.includes('đun nhẹ')) minTemp_c = 50;
  else if (isMandatoryHeat) minTemp_c = 65;

  let catalystFormula = catalyst;
  let requiresCatalyst = Boolean(catalystFormula);
  if (!catalystFormula && lower.includes('xúc tác axit')) {
    catalystFormula = 'H2SO4';
    requiresCatalyst = true;
  } else if (!catalystFormula && (lower.includes('xúc tác h2so4') || lower.includes('axit loãng'))) {
    catalystFormula = 'H2SO4';
    requiresCatalyst = true;
  } else if (!catalystFormula && lower.includes('ni, đun nóng')) {
    catalystFormula = 'Ni';
    requiresCatalyst = true;
  } else if (!catalystFormula && (id === 'glucose_fermentation' || lower.startsWith('men,'))) {
    catalystFormula = 'Yeast';
    requiresCatalyst = true;
  }

  return {
    requiresHeating: isMandatoryHeat,
    minTemp_c,
    requiresCatalyst,
    catalystFormula,
  };
}

function inferDeltaH(
  id: string,
  explicitDeltaH: number | null | undefined,
  family: string | undefined,
  requiresHeating: boolean
): number {
  if (typeof explicitDeltaH === 'number' && Number.isFinite(explicitDeltaH)) {
    return explicitDeltaH;
  }
  if (family === 'combustion' || id.includes('combustion')) return -950.0;
  if (family === 'thermal' || id === 'caco3_heat') return 178.0;
  if (family === 'neutralization' || family === 'oxide_acid' || family === 'ammonium_base') return -57.1;
  if (family === 'esterification' || id.includes('esterification') || id === 'ethyl_acetate_synthesis') return -4.0;
  if (family === 'saponification' || id.includes('saponification')) return -42.0;
  if (family === 'metal_acid' || family === 'displacement' || family === 'redox' || family === 'synthesis') return -145.0;
  if (family === 'carbonate_acid' || family === 'sulfite_acid' || family === 'sulfide_acid') return -24.0;
  if (family === 'precipitation') return -38.0;
  if (requiresHeating) return 35.0;
  return -32.0;
}

function buildVisualProfile(
  id: string,
  reactants: StoichiometricSpecies[],
  products: StoichiometricSpecies[],
  explicitLiquidColor?: string | null,
  family?: string
): {
  visual: ReactionDefinition['visual'];
  archetype: ReactionArchetype;
  controllerId: string;
} {
  const visual: ReactionDefinition['visual'] = {};
  let archetype: ReactionArchetype = 'physical_mixing';
  let controllerId = 'generic_rx';

  const solidProduct = products.find(p => p.state === 's');
  const gasProduct = products.find(p => p.state === 'g');

  if (solidProduct) {
    const key = normalizeFormula(solidProduct.formula);
    const style = PRECIPITATE_STYLE_MAP[key] ?? {
      colorHex: '#e2e8f0',
      morphology: 'powder' as PrecipitateMorphology,
    };
    visual.precipitate = {
      formula: solidProduct.formula,
      colorHex: style.colorHex,
      morphology: style.morphology,
    };
    archetype = 'precipitation';
    controllerId =
      key === 'AGCL'
        ? 'agcl_curdy'
        : key === 'CU(OH)2'
          ? 'cuoh2_gel'
          : key === 'FE(OH)3'
            ? 'feoh3_floc'
            : key === 'CU2O'
              ? 'benedict_brick_red_cu2o'
              : key === 'AG'
                ? 'silver_mirror_plating'
                : 'generic_precipitate';
  }

  if (gasProduct) {
    const gKey = normalizeFormula(gasProduct.formula);
    const colorHex = GAS_COLOR_MAP[gKey];
    const hasAlkaliOrActive = reactants.some(r => ['NA', 'K', 'CA', 'MG', 'ZN'].includes(normalizeFormula(r.formula)));
    const isH2 = gKey === 'H2';
    visual.gas = {
      formula: gasProduct.formula,
      colorHex,
      effervescenceSpeed: hasAlkaliOrActive && isH2 ? 'vigorous' : family === 'combustion' ? 'instant' : 'vigorous',
    };
    if (archetype === 'physical_mixing') {
      archetype = family === 'combustion' ? 'combustion_flash' : 'gas_evolution';
      controllerId =
        gKey === 'CO2'
          ? 'carbonate_acid_effervescence'
          : gKey === 'NO2' || gKey === 'NO'
            ? 'cu_hno3_redox_plume'
            : isH2
              ? 'metal_acid_h2_bubbles'
              : 'generic_gas_evolution';
    }
  }

  if (family === 'combustion' || id.includes('combustion')) {
    archetype = 'combustion_flash';
    controllerId = 'combustion_flame';
    visual.flame = { colorHex: id.includes('ethanol') ? '#38bdf8' : '#fb923c' };
  } else if (family === 'thermal' || id === 'caco3_heat') {
    archetype = 'thermal_decomposition';
    controllerId = 'thermal_decomposition';
  } else if (family === 'esterification' || id === 'ethyl_acetate_synthesis') {
    archetype = 'esterification_phase';
    controllerId = 'esterification_phase_layer';
  } else if (family === 'saponification' || id.includes('saponification')) {
    archetype = 'esterification_phase';
    controllerId = 'saponification_emulsion';
  }

  // Aqueous optical coloration hints
  const normProducts = products.map(p => normalizeFormula(p.formula));
  if (explicitLiquidColor && explicitLiquidColor.startsWith('#')) {
    visual.colorChange = { resultingColorHex: explicitLiquidColor };
  } else if (normProducts.some(f => f.startsWith('CU(') || f === 'CUCL2' || f === 'CUSO4' || f === 'CU(NO3)2')) {
    const isComplex = normProducts.some(f => f.includes('NH3') || f.includes('C3H7O3') || f.includes('C6H11O6'));
    visual.colorChange = { resultingColorHex: isComplex ? '#184ba6' : '#0284c7' };
    if (isComplex) {
      archetype = 'complexation';
      controllerId = 'blue_copper_polyol_complex';
    }
  } else if (normProducts.some(f => f === 'FECL3' || f === 'FE2(SO4)3' || f === 'FE(NO3)3')) {
    visual.colorChange = { resultingColorHex: '#f59e0b' };
  } else if (normProducts.some(f => f === 'C2H4BR2' || f === 'C2H2BR4' || f === 'C6H2BR3OH' || f === 'C6H2BR3NH2')) {
    visual.colorChange = { resultingColorHex: '#f8fafc' };
    controllerId = 'bromine_decolorization';
  } else if (family === 'neutralization' || family === 'ammonium_base') {
    visual.colorChange = { resultingColorHex: '#f8fafc', indicatorDriven: true };
    archetype = 'acid_base_neutralization';
    controllerId = 'acid_base_neutralization';
  }

  return { visual, archetype, controllerId };
}

export function compileCurriculumReactions(
  rawDataset: { reactions?: RawCurriculumEntry[] } = curriculumData as unknown as { reactions?: RawCurriculumEntry[] }
): CompiledReactionEntry[] {
  const entries = rawDataset.reactions ?? [];
  const compiled: CompiledReactionEntry[] = [];

  for (const raw of entries) {
    const reactants = mergeDuplicateSpecies(
      raw.reactants.map(r => {
        const formula = sanitizeFormulaToken(r.formula);
        const state = (['aq', 's', 'l', 'g'].includes(r.phase ?? '')
          ? r.phase
          : inferStateForCurriculum(formula, 'reactant', raw.id)) as PhysicalState;
        return {
          formula,
          coefficient: Math.max(1, Number(r.coeff ?? r.coefficient ?? 1)),
          state,
        };
      })
    );

    const products = mergeDuplicateSpecies(
      raw.products.map(p => {
        const formula = sanitizeFormulaToken(p.formula);
        const state = (['aq', 's', 'l', 'g'].includes(p.phase ?? '')
          ? p.phase
          : inferStateForCurriculum(formula, 'product', raw.id)) as PhysicalState;
        return {
          formula,
          coefficient: Math.max(1, Number(p.coeff ?? p.coefficient ?? 1)),
          state,
        };
      })
    );

    const condDesc = raw.conditions?.description_vi || raw.conditions_vi || '';
    const cond = parseHeatingAndCatalystConditions(
      raw.id,
      condDesc,
      undefined,
      raw.conditions?.catalyst,
      raw.id.includes('combustion') ? 'combustion' : undefined,
      reactants,
      products
    );
    const deltaH = inferDeltaH(
      raw.id,
      raw.thermochemistry?.deltaH_kJ_per_mol_reaction,
      raw.id.includes('combustion') ? 'combustion' : undefined,
      cond.requiresHeating
    );
    const { visual, archetype, controllerId } = buildVisualProfile(
      raw.id,
      reactants,
      products,
      raw.effects?.after?.liquidColor
    );

    if (raw.effects?.after?.precipitate?.colorHex && visual.precipitate) {
      visual.precipitate.colorHex = raw.effects.after.precipitate.colorHex;
    }

    const candidate: CompiledReactionEntry = {
      id: raw.id,
      source: 'curriculum',
      name_en: raw.title_en || raw.title_vi || raw.id,
      name_vi: raw.title_vi || raw.equation || raw.id,
      equation: raw.equation_balanced || raw.equation || '',
      ionic_equation: raw.ionic_equation,
      reactants,
      products,
      deltaH_kJ_mol: deltaH,
      requiresHeating: cond.requiresHeating,
      minTemp_c: cond.minTemp_c,
      requiresCatalyst: cond.requiresCatalyst,
      catalystFormula: cond.catalystFormula,
      archetype,
      controllerId,
      visual,
      observable_en: raw.observation_en || raw.observation_vi || `${raw.title_vi || raw.id} proceeds cleanly.`,
      observable_vi: raw.observation_vi || raw.explanation_vi || `Phản ứng ${raw.title_vi || raw.id} xảy ra.`,
      safetyNotes_vi: raw.safetyNotes_vi,
      isDangerous: Boolean(raw.isDangerous || raw.id.includes('combustion')),
    };

    if (isElementBalancedReaction(candidate)) {
      compiled.push(candidate);
    }
  }

  return compiled;
}

function compileCatalogReactions(entries: RawCatalogEntry[]): CompiledReactionEntry[] {
  const compiled: CompiledReactionEntry[] = [];

  for (const raw of entries) {
    const reactants = mergeDuplicateSpecies(
      raw.reactants.map(r => ({
        formula: sanitizeFormulaToken(r.formula),
        coefficient: Math.max(1, Number(r.coefficient || 1)),
        state: (['aq', 's', 'l', 'g'].includes(r.phase) ? r.phase : 'aq') as PhysicalState,
      }))
    );

    const products = mergeDuplicateSpecies(
      raw.products.map(p => ({
        formula: sanitizeFormulaToken(p.formula),
        coefficient: Math.max(1, Number(p.coefficient || 1)),
        state: (['aq', 's', 'l', 'g'].includes(p.phase) ? p.phase : 'aq') as PhysicalState,
      }))
    );

    const condDesc = raw.conditions?.description_vi || '';
    const cond = parseHeatingAndCatalystConditions(
      raw.id,
      condDesc,
      raw.conditions?.activation,
      raw.conditions?.catalyst,
      raw.family,
      reactants,
      products
    );
    const deltaH = inferDeltaH(
      raw.id,
      raw.effects?.deltaH_kJ_per_mol,
      raw.family,
      cond.requiresHeating
    );
    const { visual, archetype, controllerId } = buildVisualProfile(
      raw.id,
      reactants,
      products,
      raw.effects?.color,
      raw.family
    );

    const candidate: CompiledReactionEntry = {
      id: raw.id,
      source: 'catalog',
      family: raw.family,
      name_en: raw.title_vi || raw.equation,
      name_vi: raw.title_vi || raw.equation,
      equation: raw.equation,
      ionic_equation: raw.ionic?.equation,
      reactants,
      products,
      deltaH_kJ_mol: deltaH,
      requiresHeating: cond.requiresHeating,
      minTemp_c: cond.minTemp_c,
      requiresCatalyst: cond.requiresCatalyst,
      catalystFormula: cond.catalystFormula,
      archetype,
      controllerId,
      visual,
      observable_en: raw.observation_vi || raw.explanation_vi || raw.equation,
      observable_vi: raw.observation_vi || raw.explanation_vi || `Phản ứng: ${raw.equation}`,
      isDangerous: raw.family === 'combustion' || raw.id.includes('chlorine'),
    };

    if (isElementBalancedReaction(candidate)) {
      compiled.push(candidate);
    }
  }

  return compiled;
}

export const COMPILED_CURRICULUM_REACTIONS: CompiledReactionEntry[] = compileCurriculumReactions();
export const COMPILED_CATALOG_REACTIONS: CompiledReactionEntry[] = [];
export const ALL_COMPILED_REACTIONS: CompiledReactionEntry[] = [...COMPILED_CURRICULUM_REACTIONS];

const COMPILED_BY_ID = new Map<string, CompiledReactionEntry>();
const COMPILED_BY_SPECIES = new Map<string, CompiledReactionEntry[]>();

function registerCompiledReactions(entries: readonly CompiledReactionEntry[]): void {
  for (const rx of entries) {
    if (!COMPILED_BY_ID.has(rx.id)) {
      COMPILED_BY_ID.set(rx.id, rx);
    }
    for (const r of rx.reactants) {
      const key = normalizeFormula(r.formula);
      const bucket = COMPILED_BY_SPECIES.get(key) ?? [];
      if (!bucket.includes(rx)) bucket.push(rx);
      COMPILED_BY_SPECIES.set(key, bucket);
    }
  }
}

registerCompiledReactions(COMPILED_CURRICULUM_REACTIONS);

let catalogReady = false;
let catalogLoadPromise: Promise<void> | null = null;
const catalogReadyListeners = new Set<() => void>();

export function isCatalogReady(): boolean {
  return catalogReady;
}

export function onCatalogReady(listener: () => void): () => void {
  if (catalogReady) {
    listener();
    return () => {};
  }
  catalogReadyListeners.add(listener);
  return () => {
    catalogReadyListeners.delete(listener);
  };
}

/**
 * Dynamically imports the 1,300-entry shared reaction catalog JSON on idle/demand,
 * keeping initial bundle size fast while preserving all compiled lookups once ready.
 */
export function ensureCatalogCompiled(): Promise<void> {
  if (catalogReady) return Promise.resolve();
  if (catalogLoadPromise) return catalogLoadPromise;

  catalogLoadPromise = import('@shared/reaction-catalog.generated.json')
    .then((mod) => {
      const data = mod as unknown as {
        default?: { entries?: RawCatalogEntry[] };
        entries?: RawCatalogEntry[];
      };
      const entries = data.default?.entries ?? data.entries ?? [];
      const compiled = compileCatalogReactions(entries);

      if (!catalogReady) {
        COMPILED_CATALOG_REACTIONS.push(...compiled);
        ALL_COMPILED_REACTIONS.push(...compiled);
        registerCompiledReactions(compiled);
        catalogReady = true;

        const listeners = Array.from(catalogReadyListeners);
        catalogReadyListeners.clear();
        for (const listener of listeners) {
          try {
            listener();
          } catch {
            // Isolate listener errors so every subscriber runs.
          }
        }
      }
    })
    .catch((err) => {
      catalogLoadPromise = null;
      throw err;
    });

  return catalogLoadPromise;
}

export function getCompiledReactionById(id: string): CompiledReactionEntry | undefined {
  return COMPILED_BY_ID.get(id);
}

export function getCompiledReactionCandidates(formulas: string[]): CompiledReactionEntry[] {
  const seen = new Set<CompiledReactionEntry>();
  for (const f of formulas) {
    const key = normalizeFormula(f);
    for (const rx of COMPILED_BY_SPECIES.get(key) ?? []) {
      seen.add(rx);
    }
  }
  return Array.from(seen);
}
