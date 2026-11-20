/**
 * Tier 1 (Multi-Stage Equilibria & Special Hazards) + Tier 2 (Deterministic Rule-Derived Instant Solver)
 * Brings full lab-3d 5-tier reaction resolution parity to lab-2d.
 */

import {
  PhysicalState,
  SubstanceQuantity,
  ReactionExecutionRecord,
  PrecipitateMorphology,
  ReactionArchetype,
  SolidChunkItem,
  SolidMorphology,
  PrecipitateLayerState,
  StoichiometricSpecies,
} from '../../types/chemistry';
import { balanceEquation, formatEquation, gcd } from '@shared/chemistry/formula.mjs';
import { baritePrecipitationExtent } from '@shared/chemistry/barite.mjs';
import { normalizeFormula, computeMolarMass } from '../core/formula';
import { calculateReactionDeltaT } from '../thermodynamics/calorimetry';
import { computeParticleBuoyancy, getPrecipitateProfile2D } from '../physical/precipitateProfiles';

export interface InstantRuleResolutionOutput {
  reactionsOccurred: ReactionExecutionRecord[];
  temperature_c: number;
  isBoiling: boolean;
  hasGas: boolean;
  gasInfo?: {
    formula: string;
    molesReleased: number;
    effervescenceSpeed: 'slow' | 'vigorous' | 'instant';
    colorHex?: string;
  };
  /** Gas mass that escaped from an open vessel during rule execution. */
  escapedGas_g?: Record<string, number>;
  precipitateOverride?: {
    formula: string;
    colorHex: string;
    mass_g: number;
    morphology: PrecipitateMorphology;
  };
  surfacePlating?: {
    substrateFormula: string;
    coatingFormula: string;
    coatingColorHex: string;
    progress: number;
  };
  isExplosion?: boolean;
  isDangerous?: boolean;
  warning_en?: string;
  warning_vi?: string;
  hasSublimation?: boolean;
  sublimationColorHex?: string;
  activeControllerIds: string[];
}

// ─── Ion Dissociation Table for Tier 2 Rule-Derived Engine ─────────────────
interface DissociatedSalt {
  cation: string;
  cationCharge: number;
  anion: string;
  anionCharge: number;
}

const SALT_ION_TABLE: Record<string, DissociatedSalt> = {
  // Chlorides
  'NACL': { cation: 'Na', cationCharge: 1, anion: 'Cl', anionCharge: 1 },
  'KCL': { cation: 'K', cationCharge: 1, anion: 'Cl', anionCharge: 1 },
  'BACL2': { cation: 'Ba', cationCharge: 2, anion: 'Cl', anionCharge: 1 },
  'CACL2': { cation: 'Ca', cationCharge: 2, anion: 'Cl', anionCharge: 1 },
  'MGCL2': { cation: 'Mg', cationCharge: 2, anion: 'Cl', anionCharge: 1 },
  'CUCL2': { cation: 'Cu', cationCharge: 2, anion: 'Cl', anionCharge: 1 },
  'FECL3': { cation: 'Fe3', cationCharge: 3, anion: 'Cl', anionCharge: 1 },
  'FECL2': { cation: 'Fe2', cationCharge: 2, anion: 'Cl', anionCharge: 1 },
  'ALCL3': { cation: 'Al', cationCharge: 3, anion: 'Cl', anionCharge: 1 },
  'ZNCL2': { cation: 'Zn', cationCharge: 2, anion: 'Cl', anionCharge: 1 },
  'NH4CL': { cation: 'NH4', cationCharge: 1, anion: 'Cl', anionCharge: 1 },
  'COCL2': { cation: 'Co', cationCharge: 2, anion: 'Cl', anionCharge: 1 },
  // Nitrates
  'AGNO3': { cation: 'Ag', cationCharge: 1, anion: 'NO3', anionCharge: 1 },
  'PB(NO3)2': { cation: 'Pb', cationCharge: 2, anion: 'NO3', anionCharge: 1 },
  'CU(NO3)2': { cation: 'Cu', cationCharge: 2, anion: 'NO3', anionCharge: 1 },
  'BA(NO3)2': { cation: 'Ba', cationCharge: 2, anion: 'NO3', anionCharge: 1 },
  'CA(NO3)2': { cation: 'Ca', cationCharge: 2, anion: 'NO3', anionCharge: 1 },
  'FE(NO3)3': { cation: 'Fe3', cationCharge: 3, anion: 'NO3', anionCharge: 1 },
  'ZN(NO3)2': { cation: 'Zn', cationCharge: 2, anion: 'NO3', anionCharge: 1 },
  'KNO3': { cation: 'K', cationCharge: 1, anion: 'NO3', anionCharge: 1 },
  'NANO3': { cation: 'Na', cationCharge: 1, anion: 'NO3', anionCharge: 1 },
  // Sulfates
  'NA2SO4': { cation: 'Na', cationCharge: 1, anion: 'SO4', anionCharge: 2 },
  'K2SO4': { cation: 'K', cationCharge: 1, anion: 'SO4', anionCharge: 2 },
  'CUSO4': { cation: 'Cu', cationCharge: 2, anion: 'SO4', anionCharge: 2 },
  'FESO4': { cation: 'Fe2', cationCharge: 2, anion: 'SO4', anionCharge: 2 },
  'FE2(SO4)3': { cation: 'Fe3', cationCharge: 3, anion: 'SO4', anionCharge: 2 },
  'ZNSO4': { cation: 'Zn', cationCharge: 2, anion: 'SO4', anionCharge: 2 },
  'MGSO4': { cation: 'Mg', cationCharge: 2, anion: 'SO4', anionCharge: 2 },
  'AL2(SO4)3': { cation: 'Al', cationCharge: 3, anion: 'SO4', anionCharge: 2 },
  'NISO4': { cation: 'Ni', cationCharge: 2, anion: 'SO4', anionCharge: 2 },
  'H2SO4': { cation: 'H', cationCharge: 1, anion: 'SO4', anionCharge: 2 },
  // Halides (Br, I)
  'KI': { cation: 'K', cationCharge: 1, anion: 'I', anionCharge: 1 },
  'NAI': { cation: 'Na', cationCharge: 1, anion: 'I', anionCharge: 1 },
  'KBR': { cation: 'K', cationCharge: 1, anion: 'Br', anionCharge: 1 },
  'NABR': { cation: 'Na', cationCharge: 1, anion: 'Br', anionCharge: 1 },
  // Carbonates, Sulfides, Chromates, Hydroxides, Thiocyanates
  'NA2CO3': { cation: 'Na', cationCharge: 1, anion: 'CO3', anionCharge: 2 },
  'K2CO3': { cation: 'K', cationCharge: 1, anion: 'CO3', anionCharge: 2 },
  'NA2S': { cation: 'Na', cationCharge: 1, anion: 'S', anionCharge: 2 },
  'K2CRO4': { cation: 'K', cationCharge: 1, anion: 'CrO4', anionCharge: 2 },
  'NAOH': { cation: 'Na', cationCharge: 1, anion: 'OH', anionCharge: 1 },
  'KOH': { cation: 'K', cationCharge: 1, anion: 'OH', anionCharge: 1 },
  'BA(OH)2': { cation: 'Ba', cationCharge: 2, anion: 'OH', anionCharge: 1 },
  'CA(OH)2': { cation: 'Ca', cationCharge: 2, anion: 'OH', anionCharge: 1 },
  'KSCN': { cation: 'K', cationCharge: 1, anion: 'SCN', anionCharge: 1 },
  'NASCN': { cation: 'Na', cationCharge: 1, anion: 'SCN', anionCharge: 1 },
  'NH4SCN': { cation: 'NH4', cationCharge: 1, anion: 'SCN', anionCharge: 1 },
  'HCL': { cation: 'H', cationCharge: 1, anion: 'Cl', anionCharge: 1 },
  'C17H35COONA': { cation: 'Na', cationCharge: 1, anion: 'Stearate', anionCharge: 1 },
  'NAC17H35COO': { cation: 'Na', cationCharge: 1, anion: 'Stearate', anionCharge: 1 },
};

interface InsolublePrecipitateRule {
  cation: string;
  anion: string;
  formula: string;
  colorHex: string;
  morphology: PrecipitateMorphology;
  controllerId: string;
  name_vi: string;
  name_en: string;
}

const INSOLUBLE_PRECIPITATE_RULES: InsolublePrecipitateRule[] = [
  { cation: 'Ag', anion: 'Cl', formula: 'AgCl', colorHex: '#f8fafc', morphology: 'curdy', controllerId: 'agcl_curdy', name_vi: 'Kết tủa Bạc clorua trắng vón cục', name_en: 'Curdy white Silver Chloride precipitation' },
  { cation: 'Ag', anion: 'Br', formula: 'AgBr', colorHex: '#fef9c3', morphology: 'curdy', controllerId: 'agcl_curdy', name_vi: 'Kết tủa Bạc bromua vàng nhạt', name_en: 'Pale yellow Silver Bromide precipitation' },
  { cation: 'Ag', anion: 'I', formula: 'AgI', colorHex: '#fde047', morphology: 'curdy', controllerId: 'agcl_curdy', name_vi: 'Kết tủa Bạc iotua vàng đậm', name_en: 'Yellow Silver Iodide precipitation' },
  { cation: 'Ag', anion: 'CrO4', formula: 'Ag2CrO4', colorHex: '#991b1b', morphology: 'powder', controllerId: 'baso4_milky', name_vi: 'Kết tủa Bạc cromat đỏ gạch', name_en: 'Brick-red Silver Chromate precipitation' },
  { cation: 'Ag', anion: 'S', formula: 'Ag2S', colorHex: '#18181b', morphology: 'powder', controllerId: 'baso4_milky', name_vi: 'Kết tủa Bạc sunfua đen', name_en: 'Black Silver Sulfide precipitation' },
  { cation: 'Ba', anion: 'SO4', formula: 'BaSO4', colorHex: '#ffffff', morphology: 'milky', controllerId: 'baso4_milky', name_vi: 'Kết tủa Bari sunfat trắng đục sữa', name_en: 'Milky white Barium Sulfate precipitation' },
  { cation: 'Ba', anion: 'CO3', formula: 'BaCO3', colorHex: '#f8fafc', morphology: 'milky', controllerId: 'baso4_milky', name_vi: 'Kết tủa Bari cacbonat trắng', name_en: 'White Barium Carbonate precipitation' },
  { cation: 'Ba', anion: 'CrO4', formula: 'BaCrO4', colorHex: '#facc15', morphology: 'powder', controllerId: 'baso4_milky', name_vi: 'Kết tủa Bari cromat vàng tươi', name_en: 'Bright yellow Barium Chromate precipitation' },
  { cation: 'Pb', anion: 'I', formula: 'PbI2', colorHex: '#eab308', morphology: 'plates', controllerId: 'pbi2_golden_rain', name_vi: 'Kết tủa Chì(II) iotua vàng óng ánh (Mưa vàng)', name_en: 'Golden Rain Lead(II) Iodide precipitation' },
  { cation: 'Pb', anion: 'SO4', formula: 'PbSO4', colorHex: '#ffffff', morphology: 'milky', controllerId: 'baso4_milky', name_vi: 'Kết tủa Chì(II) sunfat trắng', name_en: 'White Lead(II) Sulfate precipitation' },
  { cation: 'Pb', anion: 'CrO4', formula: 'PbCrO4', colorHex: '#eab308', morphology: 'powder', controllerId: 'baso4_milky', name_vi: 'Kết tủa Chì(II) cromat vàng', name_en: 'Chrome yellow Lead(II) Chromate precipitation' },
  { cation: 'Pb', anion: 'S', formula: 'PbS', colorHex: '#18181b', morphology: 'powder', controllerId: 'baso4_milky', name_vi: 'Kết tủa Chì(II) sunfua đen', name_en: 'Black Lead(II) Sulfide precipitation' },
  { cation: 'Ca', anion: 'CO3', formula: 'CaCO3', colorHex: '#f8fafc', morphology: 'milky', controllerId: 'baso4_milky', name_vi: 'Kết tủa Canxi cacbonat trắng', name_en: 'White Calcium Carbonate precipitation' },
  { cation: 'Cu', anion: 'OH', formula: 'Cu(OH)2', colorHex: '#38bdf8', morphology: 'gel', controllerId: 'cuoh2_gel', name_vi: 'Kết tủa keo xanh lam Đồng(II) hiđroxit', name_en: 'Gelatinous blue Copper(II) Hydroxide precipitation' },
  { cation: 'Cu', anion: 'S', formula: 'CuS', colorHex: '#09090b', morphology: 'powder', controllerId: 'baso4_milky', name_vi: 'Kết tủa Đồng(II) sunfua đen', name_en: 'Black Copper(II) Sulfide precipitation' },
  { cation: 'Fe3', anion: 'OH', formula: 'Fe(OH)3', colorHex: '#9a3412', morphology: 'floc', controllerId: 'feoh3_floc', name_vi: 'Kết tủa bông nâu đỏ Sắt(III) hiđroxit', name_en: 'Reddish-brown flocculent Iron(III) Hydroxide precipitation' },
  { cation: 'Fe2', anion: 'OH', formula: 'Fe(OH)2', colorHex: '#d9f99d', morphology: 'floc', controllerId: 'feoh3_floc', name_vi: 'Kết tủa trắng xanh Sắt(II) hiđroxit', name_en: 'Greenish-white Iron(II) Hydroxide precipitation' },
  { cation: 'Mg', anion: 'OH', formula: 'Mg(OH)2', colorHex: '#ffffff', morphology: 'gel', controllerId: 'baso4_milky', name_vi: 'Kết tủa trắng Magie hiđroxit', name_en: 'White Magnesium Hydroxide precipitation' },
  { cation: 'Al', anion: 'OH', formula: 'Al(OH)3', colorHex: '#f1f5f9', morphology: 'gel', controllerId: 'aloh3_amphoteric', name_vi: 'Kết tủa keo trắng Nhôm hiđroxit', name_en: 'Gelatinous white Aluminium Hydroxide precipitation' },
  { cation: 'Zn', anion: 'OH', formula: 'Zn(OH)2', colorHex: '#f1f5f9', morphology: 'gel', controllerId: 'aloh3_amphoteric', name_vi: 'Kết tủa keo trắng Kẽm hiđroxit', name_en: 'Gelatinous white Zinc Hydroxide precipitation' },
  { cation: 'Ni', anion: 'OH', formula: 'Ni(OH)2', colorHex: '#4ade80', morphology: 'gel', controllerId: 'cuoh2_gel', name_vi: 'Kết tủa xanh lục Niken(II) hiđroxit', name_en: 'Apple-green Nickel(II) Hydroxide precipitation' },
  { cation: 'Co', anion: 'OH', formula: 'Co(OH)2', colorHex: '#f472b6', morphology: 'gel', controllerId: 'cuoh2_gel', name_vi: 'Kết tủa hồng Coban(II) hiđroxit', name_en: 'Pink Cobalt(II) Hydroxide precipitation' },
  { cation: 'Ca', anion: 'Stearate', formula: 'Ca(C17H35COO)2', colorHex: '#f8fafc', morphology: 'curdy', controllerId: 'agcl_curdy', name_vi: 'Váng kết tủa xà phòng Canxi stearat nổi trên mặt nước', name_en: 'Floating white Calcium Stearate soap curd precipitation' },
  { cation: 'Mg', anion: 'Stearate', formula: 'Mg(C17H35COO)2', colorHex: '#f1f5f9', morphology: 'curdy', controllerId: 'agcl_curdy', name_vi: 'Váng kết tủa xà phòng Magie stearat nổi trên mặt nước', name_en: 'Floating white Magnesium Stearate soap curd precipitation' },
];

// Electrochemical reactivity rank (higher = more reactive reducing metal)
const METAL_REACTIVITY: Record<string, { rank: number; valence: number; ionColorHex: string; metalColorHex: string }> = {
  'K': { rank: 100, valence: 1, ionColorHex: '#f8fafc', metalColorHex: '#e2e8f0' },
  'NA': { rank: 95, valence: 1, ionColorHex: '#f8fafc', metalColorHex: '#e2e8f0' },
  'CA': { rank: 90, valence: 2, ionColorHex: '#f8fafc', metalColorHex: '#cbd5e1' },
  'MG': { rank: 80, valence: 2, ionColorHex: '#f8fafc', metalColorHex: '#e2e8f0' },
  'AL': { rank: 70, valence: 3, ionColorHex: '#f8fafc', metalColorHex: '#cbd5e1' },
  'ZN': { rank: 60, valence: 2, ionColorHex: '#f8fafc', metalColorHex: '#94a3b8' },
  'FE': { rank: 50, valence: 2, ionColorHex: '#bbf7d0', metalColorHex: '#64748b' },
  'NI': { rank: 40, valence: 2, ionColorHex: '#4ade80', metalColorHex: '#94a3b8' },
  'SN': { rank: 35, valence: 2, ionColorHex: '#f8fafc', metalColorHex: '#cbd5e1' },
  'PB': { rank: 30, valence: 2, ionColorHex: '#f8fafc', metalColorHex: '#475569' },
  'H': { rank: 20, valence: 1, ionColorHex: '#f8fafc', metalColorHex: '#f8fafc' },
  'CU': { rank: 15, valence: 2, ionColorHex: '#38bdf8', metalColorHex: '#b85d3b' },
  'AG': { rank: 10, valence: 1, ionColorHex: '#f8fafc', metalColorHex: '#e2e8f0' },
};

/**
 * Maps a reaction ID or product profile to one of the 30+ dedicated visual controller IDs
 */
export function resolveControllerIdForReaction(rxId: string, gasFormula?: string, precipFormula?: string): string {
  const id = rxId.toLowerCase();
  if (id.includes('sodium_water') || id.includes('na_water')) return 'na_water_skitter';
  if (id.includes('potassium_water') || id.includes('k_water')) return 'k_water_skitter';
  if (id.includes('pbi2') || precipFormula === 'PbI2') return 'pbi2_golden_rain';
  if (id.includes('agcl') || precipFormula === 'AgCl' || precipFormula === 'AgBr' || precipFormula === 'AgI') return 'agcl_curdy';
  if (id.includes('baso4') || precipFormula === 'BaSO4') return 'baso4_milky';
  if (id.includes('cuoh2') && (id.includes('decomp') || id.includes('thermal'))) return 'cuoh2_thermal_decomp';
  if (id.includes('cu_nh3') || id.includes('tetraammine') || id.includes('cuoh2_nh3')) return 'cuso4_nh3_multistage';
  if (id.includes('aloh3') || id.includes('aluminate') || precipFormula === 'Al(OH)3') return 'aloh3_amphoteric';
  if (id.includes('cuoh2') || precipFormula === 'Cu(OH)2') return 'cuoh2_gel';
  if (id.includes('feoh3') || precipFormula === 'Fe(OH)3') return 'feoh3_floc';
  if (id.includes('thiosulfate') || id.includes('colloidal_sulfur') || precipFormula === 'S') return 'colloidal_sulfur_clock';
  if (id.includes('iodine_clock')) return 'iodine_clock_flash';
  if (id.includes('kmno4') && (id.includes('oxalic') || id.includes('h2c2o4'))) return 'kmno4_autocatalytic';
  if (id.includes('fescn') || id.includes('thiocyanate')) return 'fescn_blood_red';
  if (id.includes('fe_cuso4') || (id.includes('iron') && id.includes('copper'))) return 'fe_cuso4_plating';
  if (id.includes('zn_cuso4') || (id.includes('zinc') && id.includes('copper'))) return 'zn_cuso4_plating';
  if (id.includes('h2o2') && id.includes('mno2')) return 'h2o2_mno2_catalytic';
  if (id.includes('cu_hno3') || gasFormula === 'NO2') return 'cu_hno3_no2_plume';
  if (id.includes('nh3_hcl') || id.includes('smoke')) return 'nh3_hcl_smoke';
  if (id.includes('magnesium_combustion') || id.includes('burn_mg')) return 'mg_blinding_flash';
  if (id.includes('iodine_sublimation')) return 'iodine_sublimation';
  if (id.includes('conc_h2so4_water')) return 'water_into_conc_h2so4_explosion';
  if (gasFormula === 'CO2') return 'caco3_hcl_effervescence';
  if (gasFormula === 'H2') return 'metal_acid_h2_bubbles';
  if (precipFormula) return 'baso4_milky';
  return 'neutralization_thermal_schlieren';
}

/**
 * Executes multi-stage equilibrium checks, special hazard checks, and Tier 2 rule-derived reactions.
 * Mutates `workingContents` in place when a reaction occurs.
 */
export function resolveInstantRulesAndEquilibria(
  workingContents: SubstanceQuantity[],
  existingReactions: ReactionExecutionRecord[],
  volume_ml: number,
  currentTemp_c: number,
  isHeated: boolean,
  isOpenVessel: boolean,
  options?: { includeTier2Fallback?: boolean; tier2Only?: boolean },
): InstantRuleResolutionOutput {
  const reactionsOccurred: ReactionExecutionRecord[] = [...existingReactions];
  let temp_c = currentTemp_c;
  let isBoiling = false;
  let hasGas = false;
  let gasInfo: InstantRuleResolutionOutput['gasInfo'] = undefined;
  const escapedGas_g: Record<string, number> = {};
  const recordEscapedGas = (formula: string, moles: number) => {
    if (!isOpenVessel || moles <= 1e-8) return;
    escapedGas_g[formula] = (escapedGas_g[formula] ?? 0) + moles * computeMolarMass(formula);
  };
  let precipitateOverride: InstantRuleResolutionOutput['precipitateOverride'] = undefined;
  let surfacePlating: InstantRuleResolutionOutput['surfacePlating'] = undefined;
  let isExplosion = false;
  let isDangerous = false;
  let warning_en: string | undefined;
  let warning_vi: string | undefined;
  let hasSublimation = false;
  let sublimationColorHex: string | undefined;
  const activeControllerIds = new Set<string>();

  for (const r of existingReactions) {
    const cid = r.controllerId || resolveControllerIdForReaction(r.reactionId);
    activeControllerIds.add(cid);
    if (r.reactionId.includes('fe_cuso4') || r.reactionId === 'rx_fe_cuso4') {
      surfacePlating = {
        substrateFormula: 'Fe',
        coatingFormula: 'Cu',
        coatingColorHex: '#b85d3b',
        progress: 1.0,
      };
    } else if (r.reactionId.includes('zn_cuso4') || r.reactionId === 'rx_zn_cuso4') {
      surfacePlating = {
        substrateFormula: 'Zn',
        coatingFormula: 'Cu',
        coatingColorHex: '#b85d3b',
        progress: 1.0,
      };
    }
  }

  const findItem = (formulaNorm: string) =>
    workingContents.find(c => normalizeFormula(c.formula) === formulaNorm && c.moles > 1e-6);

  const addOrUpdateSpecies = (formula: string, molesToAdd: number, state: 'aq' | 's' | 'l' | 'g') => {
    if (molesToAdd <= 1e-8) return;
    const norm = normalizeFormula(formula);
    const mm = computeMolarMass(formula);
    const existing = workingContents.find(c => normalizeFormula(c.formula) === norm && c.state === state);
    if (existing) {
      existing.moles += molesToAdd;
      existing.mass_g = existing.moles * mm;
      existing.state = state;
      if (state === 'aq' && volume_ml > 0) {
        existing.concentration_M = existing.moles / (volume_ml / 1000.0);
      }
    } else {
      workingContents.push({
        formula,
        moles: molesToAdd,
        mass_g: molesToAdd * mm,
        state,
        concentration_M: state === 'aq' && volume_ml > 0 ? molesToAdd / (volume_ml / 1000.0) : undefined,
      });
    }
  };

  // ─── 1. Potassium (K) + Water Pyrotechnic Skittering & Lilac Flame ─────────
  const kSolid = findItem('K');
  const h2oItem = findItem('H2O');
  if (!options?.tier2Only) {
  if (kSolid && kSolid.state === 's' && h2oItem) {
    const xi = Math.min(kSolid.moles / 2, h2oItem.moles / 2);
    if (xi > 1e-6) {
      kSolid.moles = Math.max(0, kSolid.moles - 2 * xi);
      kSolid.mass_g = kSolid.moles * computeMolarMass('K');
      h2oItem.moles = Math.max(0, h2oItem.moles - 2 * xi);
      h2oItem.mass_g = h2oItem.moles * 18.015;
      addOrUpdateSpecies('KOH', 2 * xi, 'aq');
      if (!isOpenVessel) addOrUpdateSpecies('H2', xi, 'g');
      else recordEscapedGas('H2', xi);

      const thermal = calculateReactionDeltaT(xi, -392.0, Math.max(10, volume_ml), temp_c);
      temp_c = thermal.finalTemp_c;
      if (thermal.isBoiling) isBoiling = true;
      hasGas = true;
      gasInfo = { formula: 'H2', molesReleased: xi, effervescenceSpeed: 'instant' };
      isExplosion = true;
      isDangerous = true;
      warning_vi = 'CẢNH BÁO: Kali phản ứng nổ mãnh liệt với nước, tự bốc cháy ngọn lửa tím hoa cà!';
      warning_en = 'WARNING: Potassium reacts explosively with water and ignites with a lilac flame!';
      activeControllerIds.add('k_water_skitter');

      reactionsOccurred.push({
        reactionId: 'rx_potassium_water_pyrotechnic',
        name_en: 'Explosive Reaction of Metallic Potassium with Water',
        name_vi: 'Phản ứng nổ mãnh liệt của Kali kim loại với nước',
        equation: '2K + 2H₂O → 2KOH + H₂↑',
        ionic_equation: '2K(s) + 2H₂O(l) → 2K⁺(aq) + 2OH⁻(aq) + H₂(g)↑',
        extent_moles: Math.round(xi * 100000) / 100000,
        heatReleased_J: thermal.heatReleased_J,
        limitingReactant: 'K',
        excessReactants: { K: kSolid.moles, H2O: h2oItem.moles },
        observable_en: 'Potassium melts into a silvery globule, skitters violently across the meniscus with a lilac flame and sparks.',
        observable_vi: 'Mẩu Kali nóng chảy thành giọt bạc chạy cực nhanh trên mặt nước, bốc cháy ngọn lửa tím hoa cà và bắn tia lửa.',
        tier: 'handcrafted',
        archetype: 'alkali_water_violent',
        controllerId: 'k_water_skitter',
      });
    }
  }

  // ─── 2. Multi-Stage Amphoteric Redissolution: Al(OH)3(s) + OH- -> Na[Al(OH)4](aq) ───
  const aloh3Solid = findItem('AL(OH)3');
  const strongBase = findItem('NAOH') || findItem('KOH');
  if (aloh3Solid && aloh3Solid.state === 's' && strongBase) {
    const xi = Math.min(aloh3Solid.moles, strongBase.moles);
    if (xi > 1e-6) {
      aloh3Solid.moles = Math.max(0, aloh3Solid.moles - xi);
      aloh3Solid.mass_g = aloh3Solid.moles * computeMolarMass('Al(OH)3');
      strongBase.moles = Math.max(0, strongBase.moles - xi);
      strongBase.mass_g = strongBase.moles * computeMolarMass(strongBase.formula);
      const aluminateFormula = normalizeFormula(strongBase.formula) === 'KOH' ? 'K[Al(OH)4]' : 'Na[Al(OH)4]';
      addOrUpdateSpecies(aluminateFormula, xi, 'aq');

      const thermal = calculateReactionDeltaT(xi, -28.0, Math.max(10, volume_ml), temp_c);
      temp_c = thermal.finalTemp_c;
      activeControllerIds.add('aloh3_amphoteric');

      reactionsOccurred.push({
        reactionId: 'rx_aloh3_amphoteric_dissolution',
        name_en: 'Amphoteric Dissolution of Aluminium Hydroxide in Excess Alkali',
        name_vi: 'Hòa tan kết tủa keo trắng Al(OH)₃ trong kiềm dư tạo phức Aluminat',
        equation: `Al(OH)₃↓ + ${strongBase.formula} → ${aluminateFormula}`,
        ionic_equation: 'Al(OH)₃(s) + OH⁻(aq) → [Al(OH)₄]⁻(aq)',
        extent_moles: Math.round(xi * 100000) / 100000,
        heatReleased_J: thermal.heatReleased_J,
        limitingReactant: aloh3Solid.moles <= 1e-6 ? 'Al(OH)3' : strongBase.formula,
        excessReactants: { 'Al(OH)3': aloh3Solid.moles, [strongBase.formula]: strongBase.moles },
        observable_en: 'Gelatinous white Al(OH)3 precipitate swirls and dissolves completely in excess alkali to form a clear solution.',
        observable_vi: 'Kết tủa keo trắng Al(OH)₃ tan dần hoàn toàn trong kiềm dư tạo dung dịch trong suốt.',
        tier: 'handcrafted',
        archetype: 'amphoteric_dissolution',
        controllerId: 'aloh3_amphoteric',
      });
    }
  }

  // ─── 3. Multi-Stage Complexation: Cu(OH)2(s) + 4NH3 -> [Cu(NH3)4](OH)2(aq) ───
  const cuoh2Solid = findItem('CU(OH)2');
  const nh3Item = findItem('NH3') || findItem('NH4OH');
  if (cuoh2Solid && cuoh2Solid.state === 's' && nh3Item) {
    const xi = Math.min(cuoh2Solid.moles, nh3Item.moles / 4);
    if (xi > 1e-6) {
      cuoh2Solid.moles = Math.max(0, cuoh2Solid.moles - xi);
      cuoh2Solid.mass_g = cuoh2Solid.moles * computeMolarMass('Cu(OH)2');
      nh3Item.moles = Math.max(0, nh3Item.moles - 4 * xi);
      nh3Item.mass_g = nh3Item.moles * computeMolarMass(nh3Item.formula);
      addOrUpdateSpecies('[Cu(NH3)4](OH)2', xi, 'aq');

      const thermal = calculateReactionDeltaT(xi, -42.0, Math.max(10, volume_ml), temp_c);
      temp_c = thermal.finalTemp_c;
      activeControllerIds.add('cuso4_nh3_multistage');

      reactionsOccurred.push({
        reactionId: 'rx_cuoh2_nh3_complex_dissolution',
        name_en: 'Complexation Dissolution of Copper(II) Hydroxide in Excess Ammonia',
        name_vi: 'Hòa tan kết tủa Cu(OH)₂ trong NH₃ dư tạo phức đồng-amoniac xanh lam đậm',
        equation: 'Cu(OH)₂↓ + 4NH₃ → [Cu(NH₃)₄](OH)₂',
        ionic_equation: 'Cu(OH)₂(s) + 4NH₃(aq) → [Cu(NH₃)₄]²⁺(aq) + 2OH⁻(aq)',
        extent_moles: Math.round(xi * 100000) / 100000,
        heatReleased_J: thermal.heatReleased_J,
        limitingReactant: cuoh2Solid.moles <= 1e-6 ? 'Cu(OH)2' : nh3Item.formula,
        excessReactants: { 'Cu(OH)2': cuoh2Solid.moles, [nh3Item.formula]: nh3Item.moles },
        observable_en: 'Pale blue Cu(OH)2 precipitate dissolves into a deep royal sapphire-blue tetraamminecopper(II) complex solution.',
        observable_vi: 'Kết tủa keo xanh lam Cu(OH)₂ tan hết tạo thành dung dịch phức [Cu(NH₃)₄]²⁺ màu xanh lam đậm (nước Cường Thanh).',
        tier: 'handcrafted',
        archetype: 'complexation',
        controllerId: 'cuso4_nh3_multistage',
      });
    }
  }

  // ─── 4. Thermal Sublimation of Solid Iodine (I2(s) -> I2(g) violet vapor & frost) ───
  const i2Solid = findItem('I2');
  if (i2Solid && i2Solid.state === 's' && (isHeated || temp_c >= 48)) {
    hasSublimation = true;
    sublimationColorHex = '#9333ea'; // Deep violet iodine vapor
    activeControllerIds.add('iodine_sublimation');
    if (!reactionsOccurred.some(r => r.reactionId === 'rx_iodine_sublimation')) {
      reactionsOccurred.push({
        reactionId: 'rx_iodine_sublimation',
        name_en: 'Thermal Sublimation and Recrystallization of Iodine',
        name_vi: 'Sự thăng hoa và kết tinh lại của Tinh thể Iốt khi đun nóng',
        equation: 'I₂(s) ⇌ I₂(g)↑',
        extent_moles: Math.min(0.002, i2Solid.moles * 0.15),
        heatReleased_J: 62.4,
        limitingReactant: 'I2',
        excessReactants: { I2: i2Solid.moles },
        observable_en: 'Dark grey-violet iodine crystals sublime directly into dense purple vapor, depositing glittering frost crystals on the cooler upper glass wall.',
        observable_vi: 'Tinh thể iốt tím đen thăng hoa trực tiếp thành làn hơi màu tím sẫm, gặp thành bình lạnh phía trên ngưng kết lại thành lớp sương tinh thể lấp lánh.',
        tier: 'handcrafted',
        archetype: 'sublimation',
        controllerId: 'iodine_sublimation',
      });
    }
  }

  // ─── 5. Concentrated H2SO4 Dilution Exothermic Hazard ──────────────────────
  const h2so4Item = findItem('H2SO4');
  if (h2so4Item && h2oItem && h2so4Item.moles > 0.08 && volume_ml > 0 && (h2so4Item.moles / (volume_ml / 1000)) >= 4.0) {
    // High-concentration sulfuric acid hydration heat
    if (reactionsOccurred.length === 0 && temp_c < 85) {
      const hydrationHeatJ = h2so4Item.moles * 75000;
      const deltaT = Math.min(90, hydrationHeatJ / (Math.max(15, volume_ml) * 4.184));
      temp_c = Math.min(115, temp_c + deltaT);
      if (temp_c >= 100) isBoiling = true;
      isDangerous = true;
      warning_vi = 'CẢNH BÁO AN TOÀN: Pha loãng H₂SO₄ đặc tỏa nhiệt cực lớn! Luôn rót từ từ axit vào nước, tuyệt đối không rót nước vào axit đặc.';
      warning_en = 'SAFETY HAZARD: Diluting concentrated H2SO4 releases intense heat! Always add acid slowly to water, never water into concentrated acid.';
      activeControllerIds.add('water_into_conc_h2so4_explosion');
    }
  }
  }

  // ─── 6. TIER 2 DETERMINISTIC RULE-DERIVED INSTANT SOLVER ───────────────────
  if ((options?.includeTier2Fallback ?? true) && reactionsOccurred.length === 0 && workingContents.length >= 2) {
    const acid = workingContents.find(row => row.state === 'aq' && row.moles > 1e-6
      && Object.hasOwn(AQUEOUS_ACIDS, row.formula));
    const gasSalt = workingContents.find(row => row.moles > 1e-6 && Object.hasOwn(GAS_SALTS, row.formula)
      && row.state === GAS_SALTS[row.formula].state);
    if (acid && gasSalt) {
      const salt = GAS_SALTS[gasSalt.formula];
      const { anion, charge } = AQUEOUS_ACIDS[acid.formula];
      const counterionSalt = saltFormula(salt.cation, salt.charge, anion, charge);
      const reaction = applyBalancedRule(workingContents, [gasSalt, acid], [
        { formula: counterionSalt, state: saltPhase(counterionSalt) },
        { formula: salt.gas, state: 'g' },
        ...(salt.gas === 'H2S' ? [] : [{ formula: 'H2O', state: 'l' } as const]),
      ], isOpenVessel, recordEscapedGas);
      if (reaction) {
        hasGas = true;
        gasInfo = { formula: salt.gas, molesReleased: reaction.gasMoles, effervescenceSpeed: 'vigorous' };
        const controllerId = 'caco3_hcl_effervescence';
        activeControllerIds.add(controllerId);
        reactionsOccurred.push({
          ...reaction.record,
          reactionId: `rx_rule_gas_${normalizeFormula(gasSalt.formula)}_${normalizeFormula(acid.formula)}`,
          observable_en: 'Gas evolves from the mixture.',
          observable_vi: 'Khí thoát ra từ hỗn hợp.',
          archetype: 'gas_evolution',
          controllerId,
        });
      }
    }

    if (reactionsOccurred.length === 0) {
      const dissolvedItems = workingContents.filter(row => row.state === 'aq' && row.moles > 1e-12
        && Object.hasOwn(SALT_ION_TABLE, normalizeFormula(row.formula)));
      outerLoop: for (const cationSource of dissolvedItems) {
        const cationSalt = SALT_ION_TABLE[normalizeFormula(cationSource.formula)];
        for (const anionSource of dissolvedItems) {
          if (cationSource.formula === anionSource.formula) continue;
          const anionSalt = SALT_ION_TABLE[normalizeFormula(anionSource.formula)];
          const rule = INSOLUBLE_PRECIPITATE_RULES.find(r => r.cation === cationSalt.cation && r.anion === anionSalt.anion);
          if (!rule) continue;
          const extentLimit = rule.formula === 'BaSO4' ? bariteExtent2D(workingContents, volume_ml, temp_c) : null;
          const companion = saltFormula(anionSalt.cation, anionSalt.cationCharge, cationSalt.anion, cationSalt.anionCharge);
          const reaction = applyBalancedRule(workingContents, [cationSource, anionSource], [
            { formula: rule.formula, state: 's' },
            { formula: companion, state: saltPhase(companion) },
          ], isOpenVessel, recordEscapedGas, extentLimit);
          if (!reaction) continue;

          precipitateOverride = {
            formula: rule.formula,
            colorHex: rule.colorHex,
            mass_g: workingContents.find(row => row.formula === rule.formula && row.state === 's')!.mass_g,
            morphology: rule.morphology,
          };
          activeControllerIds.add(rule.controllerId);
          reactionsOccurred.push({
            ...reaction.record,
            reactionId: `rx_rule_precip_${rule.formula.toLowerCase()}`,
            name_en: rule.name_en,
            name_vi: rule.name_vi,
            observable_en: rule.name_en,
            observable_vi: rule.name_vi,
            archetype: 'precipitation',
            controllerId: rule.controllerId,
          });
          break outerLoop;
        }
      }
    }

    if (reactionsOccurred.length === 0) {
      const metal = workingContents.find(row => row.state === 's' && row.moles > 1e-6
        && DISPLACEMENT_METALS.has(row.formula));
      if (metal) {
        const metalKey = normalizeFormula(metal.formula);
        const metalInfo = METAL_REACTIVITY[metalKey];
        for (const solution of workingContents) {
          if (solution.state !== 'aq' || solution.moles <= 1e-6) continue;
          const dissolved = SALT_ION_TABLE[normalizeFormula(solution.formula)];
          if (!dissolved) continue;
          const displaced = dissolved.cation.replace(/^Fe[23]$/, 'Fe');
          const targetKey = normalizeFormula(displaced);
          const targetInfo = METAL_REACTIVITY[targetKey];
          if (!targetInfo || metalInfo.rank <= targetInfo.rank || dissolved.cation === 'Fe3') continue;
          const hydrogen = targetKey === 'H';
          const formula = saltFormula(metal.formula, metalInfo.valence, dissolved.anion, dissolved.anionCharge);
          const reaction = applyBalancedRule(workingContents, [metal, solution], [
            { formula, state: saltPhase(formula) },
            hydrogen ? { formula: 'H2', state: 'g' } : { formula: displaced, state: 's' },
          ], isOpenVessel, recordEscapedGas);
          if (!reaction) continue;
          const controllerId = hydrogen ? 'metal_acid_h2_bubbles' : 'fe_cuso4_plating';
          if (hydrogen) {
            hasGas = true;
            gasInfo = { formula: 'H2', molesReleased: reaction.gasMoles, effervescenceSpeed: 'vigorous' };
          } else {
            surfacePlating = {
              substrateFormula: metal.formula,
              coatingFormula: displaced,
              coatingColorHex: targetInfo.metalColorHex,
              progress: 1,
            };
          }
          activeControllerIds.add(controllerId);
          reactionsOccurred.push({
            ...reaction.record,
            reactionId: `rx_rule_${hydrogen ? 'metal_acid' : 'displacement'}_${metalKey}_${targetKey}`,
            observable_en: hydrogen ? 'Hydrogen evolves at the metal surface.' : 'Metal deposits on the solid surface.',
            observable_vi: hydrogen ? 'Khí hiđro thoát ra ở bề mặt kim loại.' : 'Kim loại bám lên bề mặt mẫu rắn.',
            archetype: hydrogen ? 'gas_evolution' : 'metal_displacement',
            controllerId,
          });
          break;
        }
      }
    }
  }

  return {
    reactionsOccurred,
    temperature_c: temp_c,
    isBoiling,
    hasGas,
    gasInfo,
    escapedGas_g: Object.keys(escapedGas_g).length > 0 ? escapedGas_g : undefined,
    precipitateOverride,
    surfacePlating,
    isExplosion,
    isDangerous,
    warning_en,
    warning_vi,
    hasSublimation,
    sublimationColorHex,
    activeControllerIds: Array.from(activeControllerIds),
  };
}

/**
 * Builds physical 2D solid chunk descriptors and precipitate layer states from the vessel contents
 * so that submerged metals (Fe nail, Zn granule, Mg ribbon, CaCO3 chips, Na/K floating pellet)
 * and Stokes-settling / buoyant precipitates render with authentic laboratory morphology.
 */
export function buildPhysicalSolidAndPrecipitateStates(
  contents: SubstanceQuantity[],
  surfacePlating?: InstantRuleResolutionOutput['surfacePlating'],
  precipitateInfo?: { formula: string; colorHex: string; mass_g: number; morphology: PrecipitateMorphology },
  options?: {
    fluidDensity_g_ml?: number;
    hasGas?: boolean;
    viscosity_mPa_s?: number;
    initialSolidMassByFormula?: Record<string, number>;
  }
): {
  solidChunks: SolidChunkItem[];
  precipitateLayers: PrecipitateLayerState[];
} {
  const solidChunks: SolidChunkItem[] = [];
  const precipitateLayers: PrecipitateLayerState[] = [];
  const fluidDensity = options?.fluidDensity_g_ml ?? 1.0;
  const hasGas = Boolean(options?.hasGas);
  const viscosity = options?.viscosity_mPa_s ?? 0.89;
  const initialMap = options?.initialSolidMassByFormula;

  const PRECIPITATE_FORMULAS = new Set(
    INSOLUBLE_PRECIPITATE_RULES.map(r => r.formula.toUpperCase()).concat([
      'AGCL', 'AGBR', 'AGI', 'BASO4', 'BACO3', 'PBI2', 'PBSO4', 'PBS', 'PBCL2',
      'CU(OH)2', 'FE(OH)3', 'FE(OH)2', 'MG(OH)2', 'AL(OH)3', 'ZN(OH)2', 'MN(OH)2', 'CR(OH)3',
      'NI(OH)2', 'CO(OH)2', 'S', 'MGO', 'CUO', 'CU2O', 'AG2O', 'AG2SO4', 'SRSO4', 'SRCO3',
      'FEPO4', 'CA(OH)2', 'CA(C17H35COO)2', 'MG(C17H35COO)2', 'C', 'C6H2BR3OH', 'C6H2BR3NH2',
      'CUS', 'AGS', 'CDS', 'MNS', 'KFE[FE(CN)6]', 'KFE(FE(CN)6)', 'CU2[FE(CN)6]', 'CU2(FE(CN)6)',
    ])
  );

  let chunkIdx = 0;
  for (const item of contents) {
    if (item.state !== 's' || item.mass_g <= 0.0001) continue;
    const norm = normalizeFormula(item.formula);

    // Check if this solid is a plated metal product while substrate still exists
    const hasActiveSubstrate =
      surfacePlating &&
      contents.some(
        c =>
          c.state === 's' &&
          c.mass_g > 0.0001 &&
          normalizeFormula(c.formula) === normalizeFormula(surfacePlating.substrateFormula)
      );
    if (surfacePlating && hasActiveSubstrate && normalizeFormula(surfacePlating.coatingFormula) === norm) {
      continue;
    }

    // Distinguish discrete laboratory reagent chunks (metals, marble chips, I2 crystals, MnO2, CaO, NaHCO3, K, Ca, Fe2O3) from precipitated clouds
    const isDiscreteChunk = [
      'FE', 'ZN', 'MG', 'CU', 'AL', 'NA', 'K', 'CA', 'BA',
      'CACO3', 'I2', 'MNO2', 'FES', 'NA2SO3', 'CAO', 'CUO', 'FE2O3', 'NAHCO3', 'AGNO3',
    ].includes(norm);

    if (isDiscreteChunk) {
      let morphology: SolidMorphology = 'granule';
      let colorHex = '#94a3b8';
      let isFloating = false;

      if (norm === 'FE') {
        morphology = 'nail';
        colorHex = '#64748b';
      } else if (norm === 'ZN' || norm === 'AL' || norm === 'CA' || norm === 'BA') {
        morphology = 'granule';
        colorHex = '#cbd5e1';
      } else if (norm === 'MG') {
        morphology = 'ribbon';
        colorHex = '#e2e8f0';
        // Hydrogen bubbles buoy lightweight Mg ribbons slightly when violently reacting
        isFloating = hasGas && fluidDensity >= 1.0 && item.mass_g < 0.8;
      } else if (norm === 'CU') {
        morphology = 'wire';
        colorHex = '#b85d3b';
      } else if (norm === 'NA' || norm === 'K') {
        morphology = 'pellet';
        colorHex = norm === 'K' ? '#e2e8f0' : '#f1f5f9';
        isFloating = true;
      } else if (norm === 'CACO3' || norm === 'CAO') {
        morphology = 'chip';
        colorHex = '#f8fafc';
      } else if (norm === 'I2') {
        morphology = 'crystal';
        colorHex = '#4c1d95';
      } else if (norm === 'MNO2' || norm === 'CUO' || norm === 'FE2O3') {
        morphology = 'powder';
        colorHex = norm === 'FE2O3' ? '#9a3412' : '#18181b';
      } else if (norm === 'NAHCO3' || norm === 'AGNO3') {
        morphology = 'crystal';
        colorHex = '#f8fafc';
      }

      const hasPlating = surfacePlating && normalizeFormula(surfacePlating.substrateFormula) === norm;
      const recordedInitial = initialMap?.[norm] ?? initialMap?.[item.formula];
      const initialMass_g = recordedInitial ? Math.max(recordedInitial, item.mass_g) : Math.max(item.mass_g, 0.05);

      solidChunks.push({
        id: `chunk_${norm}_${chunkIdx}`,
        formula: item.formula,
        morphology,
        colorHex,
        mass_g: item.mass_g,
        initialMass_g,
        xNormalized: 0.32 + (chunkIdx % 3) * 0.18,
        coatingColorHex: hasPlating ? surfacePlating!.coatingColorHex : undefined,
        coatingProgress: hasPlating ? surfacePlating!.progress : undefined,
        isFloating,
      });
      chunkIdx++;
    } else if (PRECIPITATE_FORMULAS.has(norm) || precipitateInfo) {
      const rule = INSOLUBLE_PRECIPITATE_RULES.find(r => r.formula.toUpperCase() === norm);
      const prof = getPrecipitateProfile2D(item.formula);
      const morph: PrecipitateMorphology =
        rule?.morphology ||
        (norm === 'PBI2' ? 'plates' : norm === 'S' ? 'colloidal' : precipitateInfo?.morphology || prof.morphology || 'powder');
      const color =
        rule?.colorHex ||
        (norm === 'PBI2'
          ? '#eab308'
          : norm === 'CUO'
            ? '#18181b'
            : norm === 'S'
              ? '#fef08a'
              : precipitateInfo?.colorHex || prof.colorHex || '#ffffff');

      const buoy = computeParticleBuoyancy(item.formula, fluidDensity, hasGas, viscosity, color, morph);
      const settlingVelocity_mm_s =
        buoy.buoyancy === 'float'
          ? buoy.signedSettlingSpeed * 18
          : buoy.signedSettlingSpeed * 20;

      precipitateLayers.push({
        formula: item.formula,
        colorHex: color,
        mass_g: item.mass_g,
        morphology: morph,
        turbidity: morph === 'colloidal' || morph === 'milky' ? 0.9 : morph === 'gel' ? 0.75 : 0.55,
        sedimentHeight_mm: buoy.buoyancy === 'float' ? 0 : Math.min(18, Math.max(2, item.mass_g * 3.2)),
        floatingHeight_mm: buoy.buoyancy === 'float' ? Math.min(12, Math.max(2.5, item.mass_g * 2.8)) : 0,
        settlingVelocity_mm_s,
        density_g_cm3: buoy.density_g_cm3,
        buoyancy: buoy.buoyancy,
      });
    }
  }

  return { solidChunks, precipitateLayers };
}

// Species supported by the balanced fallback rules.
const AQUEOUS_ACIDS: Record<string, { anion: string; charge: number }> = {
  HCl: { anion: 'Cl', charge: 1 },
  HBr: { anion: 'Br', charge: 1 },
  HNO3: { anion: 'NO3', charge: 1 },
  H2SO4: { anion: 'SO4', charge: 2 },
  CH3COOH: { anion: 'CH3COO', charge: 1 },
};

const BASIC_OXIDES: Record<string, { cation: string; charge: number }> = {
  CuO: { cation: 'Cu', charge: 2 },
  MgO: { cation: 'Mg', charge: 2 },
  ZnO: { cation: 'Zn', charge: 2 },
  CaO: { cation: 'Ca', charge: 2 },
  BaO: { cation: 'Ba', charge: 2 },
  FeO: { cation: 'Fe', charge: 2 },
  Fe2O3: { cation: 'Fe', charge: 3 },
  Al2O3: { cation: 'Al', charge: 3 },
  Na2O: { cation: 'Na', charge: 1 },
  K2O: { cation: 'K', charge: 1 },
};

const HYDROXIDES: typeof BASIC_OXIDES = {
  NaOH: { cation: 'Na', charge: 1 },
  KOH: { cation: 'K', charge: 1 },
  'Ba(OH)2': { cation: 'Ba', charge: 2 },
  'Ca(OH)2': { cation: 'Ca', charge: 2 },
};

const AMMONIUM_SALTS: typeof AQUEOUS_ACIDS = {
  NH4Cl: AQUEOUS_ACIDS.HCl,
  NH4NO3: AQUEOUS_ACIDS.HNO3,
  '(NH4)2SO4': AQUEOUS_ACIDS.H2SO4,
  '(NH4)2CO3': { anion: 'CO3', charge: 2 },
};

const LOW_SOLUBILITY_SALTS = new Set(['BaSO4', 'CaSO4', 'BaCO3', 'CaCO3', 'PbSO4', 'PbCl2']);
const DISPLACEMENT_METALS = new Set(['Mg', 'Al', 'Zn', 'Fe', 'Ni', 'Sn', 'Pb', 'Cu', 'Ag']);
const STRONG_ACIDS = new Set(['HCl', 'HBr', 'HNO3']);

const GAS_SALTS: Record<string, { cation: string; charge: number; state: PhysicalState; gas: string }> = {
  Na2CO3: { cation: 'Na', charge: 1, state: 'aq', gas: 'CO2' },
  K2CO3: { cation: 'K', charge: 1, state: 'aq', gas: 'CO2' },
  NaHCO3: { cation: 'Na', charge: 1, state: 'aq', gas: 'CO2' },
  KHCO3: { cation: 'K', charge: 1, state: 'aq', gas: 'CO2' },
  CaCO3: { cation: 'Ca', charge: 2, state: 's', gas: 'CO2' },
  Na2SO3: { cation: 'Na', charge: 1, state: 'aq', gas: 'SO2' },
  K2SO3: { cation: 'K', charge: 1, state: 'aq', gas: 'SO2' },
  Na2S: { cation: 'Na', charge: 1, state: 'aq', gas: 'H2S' },
  K2S: { cation: 'K', charge: 1, state: 'aq', gas: 'H2S' },
};

function ionGroup(formula: string, count: number): string {
  if (count === 1) return formula;
  return /^[A-Z][a-z]?$/.test(formula) ? `${formula}${count}` : `(${formula})${count}`;
}

function saltFormula(cation: string, cationCharge: number, anion: string, anionCharge: number): string {
  const common = gcd(cationCharge, anionCharge);
  const formulaCation = cation.replace(/^Fe[23]$/, 'Fe');
  const formulaAnion = anion === 'Stearate' ? 'C17H35COO' : anion;
  if (formulaAnion === 'CH3COO' && cationCharge === 1 && formulaCation !== 'NH4') return formulaAnion + formulaCation;
  return ionGroup(formulaCation, anionCharge / common) + ionGroup(formulaAnion, cationCharge / common);
}

function saltPhase(formula: string): PhysicalState {
  return LOW_SOLUBILITY_SALTS.has(formula) || INSOLUBLE_PRECIPITATE_RULES.some(rule => rule.formula === formula) ? 's' : 'aq';
}

export function bariteExtent2D(inventory: readonly SubstanceQuantity[], volume_ml: number, temperature_c: number) {
  return baritePrecipitationExtent(
    inventory.map(({ formula, state, moles }) => ({ formula, phase: state, moles })),
    volume_ml, temperature_c
  );
}

function applyBalancedRule(
  inventory: SubstanceQuantity[],
  reagents: readonly [SubstanceQuantity, SubstanceQuantity],
  products: Pick<StoichiometricSpecies, 'formula' | 'state'>[],
  isOpenVessel: boolean,
  recordEscapedGas: (formula: string, moles: number) => void,
  extentLimit: number | null = null
) {
  type BalancedSpecies = Pick<StoichiometricSpecies, 'formula' | 'coefficient'>;
  let equation: { reactants: BalancedSpecies[]; products: BalancedSpecies[] };
  try {
    equation = balanceEquation(reagents.map(row => row.formula), products.map(row => row.formula));
  } catch {
    return null;
  }

  const stocks = reagents.map(reagent =>
    inventory.filter(row => row.formula === reagent.formula && row.state === reagent.state && row.moles > 0)
  );
  const maxExtents = stocks.map((rows, i) =>
    rows.reduce((sum, row) => sum + row.moles, 0) / equation.reactants[i].coefficient
  );
  const extent = Math.min(...maxExtents, extentLimit ?? Infinity);
  if (!(extent > (extentLimit === null ? 1e-6 : 1e-12))) return null;

  const excessReactants: Record<string, number> = {};
  for (const [i, reactant] of equation.reactants.entries()) {
    let outstanding = extent * reactant.coefficient;
    for (const row of stocks[i]) {
      const consumed = Math.min(row.moles, outstanding);
      row.moles -= consumed;
      row.mass_g = row.moles * computeMolarMass(row.formula);
      outstanding -= consumed;
    }
    excessReactants[reactant.formula] = stocks[i].reduce((sum, row) => sum + row.moles, 0);
  }

  let gasMoles = 0;
  let waterMoles = 0;
  const phaseProducts = equation.products.map((product, i) => {
    const formula = product.formula;
    const state = products[i].state;
    const moles = extent * product.coefficient;
    const mass = moles * computeMolarMass(formula);
    if (state === 'g') gasMoles += moles;
    if (state === 'l' && formula === 'H2O') waterMoles = moles;
    if (state === 'g' && isOpenVessel) {
      recordEscapedGas(formula, moles);
    } else {
      const row = inventory.find(item => item.formula === formula && item.state === state);
      if (row) {
        row.moles += moles;
        row.mass_g += mass;
      } else {
        inventory.push({ formula, state, moles, mass_g: mass });
      }
    }
    return { ...product, phase: state };
  });

  return {
    gasMoles,
    waterMoles,
    record: {
      equation: formatEquation(equation.reactants.map((row, i) => ({ ...row, phase: reagents[i].state })), phaseProducts),
      extent_moles: extent,
      heatReleased_J: 0,
      limitingReactant: maxExtents[0] <= maxExtents[1] ? reagents[0].formula : reagents[1].formula,
      excessReactants,
      tier: 'rule-derived' as const,
    },
  };
}

/** Handles acid–base pairs left over after the catalog and the other rules. */
export function resolveExtendedCatalogFamilies(
  workingContents: SubstanceQuantity[],
  reactionsOccurred: ReactionExecutionRecord[],
  volume_ml: number,
  initialTemp_c: number,
  isHeated: boolean,
  isOpenVessel: boolean
) {
  const result = {
    temperature_c: initialTemp_c,
    isBoiling: false,
    hasGas: false,
    gasInfo: undefined as InstantRuleResolutionOutput['gasInfo'],
    escapedGas_g: {} as Record<string, number>,
    activeControllerIds: [] as string[],
  };
  if (reactionsOccurred.length > 0 || workingContents.length < 2) return result;

  const findAvailable = (formulas: Record<string, unknown>, state: PhysicalState) =>
    workingContents.find(row => row.state === state && row.moles > 1e-6 && Object.hasOwn(formulas, row.formula));

  const acid = findAvailable(AQUEOUS_ACIDS, 'aq');
  const hydroxide = findAvailable(HYDROXIDES, 'aq');
  const oxide = acid && findAvailable(BASIC_OXIDES, 's');
  const ammonium = hydroxide && (isHeated || initialTemp_c >= 50) && findAvailable(AMMONIUM_SALTS, 'aq');
  const ammonia = acid && findAvailable({ NH3: true }, 'aq');
  const left = ammonium || acid;
  const right = ammonium ? hydroxide : oxide || hydroxide || ammonia;
  if (!left || !right) return result;

  const { anion, charge: anionCharge } = (ammonium ? AMMONIUM_SALTS : AQUEOUS_ACIDS)[left.formula];
  const { cation, charge: cationCharge } = right.formula === 'NH3'
    ? { cation: 'NH4', charge: 1 }
    : (oxide && !ammonium ? BASIC_OXIDES : HYDROXIDES)[right.formula];
  const salt = saltFormula(cation, cationCharge, anion, anionCharge);
  const products: Pick<StoichiometricSpecies, 'formula' | 'state'>[] = [{ formula: salt, state: saltPhase(salt) }];
  if (ammonium) products.push({ formula: 'NH3', state: 'g' });
  if (right.formula !== 'NH3') products.push({ formula: 'H2O', state: 'l' });
  const reaction = applyBalancedRule(workingContents, [left, right], products, isOpenVessel, (formula, moles) => {
    result.escapedGas_g[formula] = moles * computeMolarMass(formula);
  });
  if (!reaction) return result;

  const modelNeutralizationHeat = !ammonium && !oxide && right !== ammonia
    && STRONG_ACIDS.has(left.formula) && saltPhase(salt) === 'aq';
  if (modelNeutralizationHeat) {
    const thermal = calculateReactionDeltaT(reaction.waterMoles, -57.1, Math.max(10, volume_ml), initialTemp_c);
    result.temperature_c = thermal.finalTemp_c;
    result.isBoiling = thermal.isBoiling;
    reaction.record.heatReleased_J = thermal.heatReleased_J;
  }

  const name_vi = ammonium ? 'Muối amoni tác dụng với kiềm' : oxide ? 'Oxit bazơ tác dụng với axit' : 'Trung hòa axit–bazơ';
  const name_en = ammonium ? 'Ammonium salt and base' : oxide ? 'Basic oxide and acid' : 'Acid–base neutralization';
  const controllerId = ammonium ? 'carbonate_acid_effervescence'
    : modelNeutralizationHeat ? 'neutralization_thermal_schlieren'
    : saltPhase(salt) === 's' ? resolveControllerIdForReaction('', undefined, salt) : undefined;
  if (controllerId) result.activeControllerIds.push(controllerId);
  if (ammonium) {
    result.hasGas = true;
    result.gasInfo = { formula: 'NH3', molesReleased: reaction.gasMoles, effervescenceSpeed: 'slow' };
  }

  reactionsOccurred.push({
    ...reaction.record,
    reactionId: `rx_rule_${ammonium ? 'ammonium_base' : oxide ? 'oxide_acid' : 'neutralization'}_${normalizeFormula(left.formula)}_${normalizeFormula(right.formula)}`,
    name_en,
    name_vi,
    observable_en: name_en,
    observable_vi: name_vi,
    archetype: ammonium ? 'gas_evolution' : 'acid_base_neutralization',
    controllerId,
  });

  return result;
}
