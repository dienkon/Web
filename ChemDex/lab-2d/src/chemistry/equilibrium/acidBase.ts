/**
 * Acid-Base Equilibrium, pH Calculation and Indicator Response Model
 * Complies with educational and thermodynamic principles:
 * - Dilute aqueous assumption (Kw = 1.0e-14 at 298.15 K)
 * - Excess reactant concentration accounting
 * - Weak acid / buffer equilibrium (Henderson-Hasselbalch)
 * - Multi-indicator spectral responses
 */

import { SubstanceQuantity, IndicatorType } from '../../types/chemistry';
import { computeContinuousIndicatorColor } from '../optics/indicatorAppearance';

export type { IndicatorType };

export interface AcidBaseInventory {
  strongAcidH_moles: number;
  strongBaseOH_moles: number;
  weakAcidHA_moles: number;
  conjugateBaseA_moles: number;
  pKa?: number;
}

/**
 * Categorizes and aggregates acidic and basic species in solution.
 */
export function analyzeAcidBaseInventory(contents: SubstanceQuantity[]): AcidBaseInventory {
  let strongAcidH_moles = 0;
  let strongBaseOH_moles = 0;
  let weakAcidHA_moles = 0;
  let conjugateBaseA_moles = 0;
  let pKa: number | undefined = undefined;

  for (const item of contents) {
    if (item.moles <= 1e-8) continue;
    const f = item.formula.toUpperCase().replace(/\s+/g, '');

    // Strong acids
    if (f === 'HCL' || f.includes('HNO3')) {
      strongAcidH_moles += item.moles;
    } else if (f.includes('H2SO4')) {
      // Diprotic strong acid: 2 protons per mole in neutralization stoichiometry
      strongAcidH_moles += item.moles * 2;
    } else if (f.includes('HCLO4')) {
      strongAcidH_moles += item.moles;
    }
    // Weak acids (triprotic / diprotic / monoprotic)
    else if (f.includes('H3PO4')) {
      weakAcidHA_moles += item.moles * 1.5;
      pKa = 2.15;
    } else if (f.includes('HF')) {
      weakAcidHA_moles += item.moles;
      pKa = 3.17;
    } else if (f.includes('H2SO3')) {
      weakAcidHA_moles += item.moles;
      pKa = 1.85;
    } else if (f.includes('H2S')) {
      weakAcidHA_moles += item.moles;
      pKa = 7.05;
    } else if (f.includes('HCOOH')) {
      weakAcidHA_moles += item.moles;
      pKa = 3.75;
    } else if (f.includes('CH3COOH') || f === 'C2H4O2') {
      weakAcidHA_moles += item.moles;
      pKa = 4.76;
    }
    // Strong bases
    else if (f === 'NAOH' || f === 'KOH') {
      strongBaseOH_moles += item.moles;
    } else if (f.includes('BA(OH)2') || f.includes('CA(OH)2')) {
      strongBaseOH_moles += item.moles * 2;
    }
    // Weak bases: amines and ammonia / NH4OH
    else if (f === 'NH3' || f === 'NH4OH') {
      conjugateBaseA_moles += item.moles;
      pKa = pKa ? Math.max(pKa, 9.25) : 9.25;
    } else if (f === 'CH3NH2') {
      conjugateBaseA_moles += item.moles;
      pKa = pKa ? Math.max(pKa, 10.64) : 10.64;
    } else if (f === 'C2H5NH2') {
      conjugateBaseA_moles += item.moles;
      pKa = pKa ? Math.max(pKa, 10.75) : 10.75;
    } else if (f === 'C6H5NH2') {
      conjugateBaseA_moles += item.moles;
      pKa = pKa ? Math.max(pKa, 4.63) : 4.63;
    }
    // Conjugate base / hydrolyzing basic salts
    else if (f.includes('CH3COONA')) {
      conjugateBaseA_moles += item.moles;
      pKa = pKa ? Math.max(pKa, 4.76) : 4.76;
    } else if (f === 'C6H5ONA') {
      conjugateBaseA_moles += item.moles;
      pKa = pKa ? Math.max(pKa, 9.99) : 9.99;
    } else if (f === 'C17H35COONA') {
      conjugateBaseA_moles += item.moles;
      pKa = pKa ? Math.max(pKa, 4.9) : 4.9;
    } else if (f.includes('NAHCO3')) {
      // Bicarbonate buffer
      weakAcidHA_moles += item.moles * 0.5;
      conjugateBaseA_moles += item.moles * 0.5;
      pKa = 6.35;
    } else if (f === 'NA2CO3' || f === 'K2CO3') {
      conjugateBaseA_moles += item.moles;
      pKa = pKa ? Math.max(pKa, 10.33) : 10.33;
    } else if (f === 'NA2S' || f === 'K2S') {
      conjugateBaseA_moles += item.moles;
      pKa = pKa ? Math.max(pKa, 12.9) : 12.9;
    } else if (f === 'NA3PO4') {
      conjugateBaseA_moles += item.moles;
      pKa = pKa ? Math.max(pKa, 12.35) : 12.35;
    } else if (f === 'NA2SIO3') {
      conjugateBaseA_moles += item.moles;
      pKa = pKa ? Math.max(pKa, 12.6) : 12.6;
    } else if (f === 'NA2C2O4') {
      conjugateBaseA_moles += item.moles;
      pKa = pKa ? Math.max(pKa, 4.27) : 4.27;
    }
    // Weak organic acids (phenol, oxalic acid, glycine)
    else if (f === 'C6H5OH') {
      weakAcidHA_moles += item.moles;
      pKa = pKa ? Math.min(pKa, 9.99) : 9.99;
    } else if (f === 'H2C2O4') {
      weakAcidHA_moles += item.moles;
      pKa = pKa ? Math.min(pKa, 1.25) : 1.25;
    } else if (f === 'NH2CH2COOH') {
      weakAcidHA_moles += item.moles;
      pKa = pKa ? Math.min(pKa, 10.94) : 10.94;
    }
    // Acidic cation salt hydrolysis (Fe3+, Al3+, Cu2+, Zn2+, NH4+)
    else if (f === 'FECL3' || f === 'FE(NO3)3') {
      weakAcidHA_moles += item.moles;
      pKa = pKa ? Math.min(pKa, 2.2) : 2.2;
    } else if (f === 'FE2(SO4)3') {
      weakAcidHA_moles += item.moles * 2;
      pKa = pKa ? Math.min(pKa, 2.2) : 2.2;
    } else if (f === 'ALCL3' || f === 'AL(NO3)3') {
      weakAcidHA_moles += item.moles;
      pKa = pKa ? Math.min(pKa, 4.95) : 4.95;
    } else if (f === 'AL2(SO4)3') {
      weakAcidHA_moles += item.moles * 2;
      pKa = pKa ? Math.min(pKa, 4.95) : 4.95;
    } else if (f === 'CUSO4' || f === 'CUCL2' || f === 'CU(NO3)2') {
      weakAcidHA_moles += item.moles;
      pKa = pKa ? Math.min(pKa, 7.53) : 7.53;
    } else if (f === 'ZNSO4' || f === 'ZNCL2') {
      weakAcidHA_moles += item.moles;
      pKa = pKa ? Math.min(pKa, 8.96) : 8.96;
    } else if (f === 'NH4CL' || f === 'NH4NO3') {
      weakAcidHA_moles += item.moles;
      pKa = pKa ? Math.min(pKa, 9.25) : 9.25;
    } else if (f === '(NH4)2SO4') {
      weakAcidHA_moles += item.moles * 2;
      pKa = pKa ? Math.min(pKa, 9.25) : 9.25;
    }
  }

  return {
    strongAcidH_moles,
    strongBaseOH_moles,
    weakAcidHA_moles,
    conjugateBaseA_moles,
    pKa,
  };
}

/**
 * Calculates theoretical equilibrium pH for the current solution mixture.
 * Assumes dilute aqueous medium (volume in mL, minimum 1 mL).
 */
export function calculateSolutionPh(contents: SubstanceQuantity[], volume_ml: number): number {
  if (volume_ml <= 0 || contents.length === 0) {
    return 7.0; // Standard ambient neutral baseline
  }

  const volL = Math.max(0.001, volume_ml / 1000.0);
  const inv = analyzeAcidBaseInventory(contents);

  // 1. Strong Acid vs Strong Base excess
  const netH = inv.strongAcidH_moles - inv.strongBaseOH_moles;
  const netOH = inv.strongBaseOH_moles - inv.strongAcidH_moles;

  if (netH > 1e-6) {
    const concH = netH / volL;
    const ph = -Math.log10(concH);
    return Math.max(0.1, Math.min(6.95, Math.round(ph * 100) / 100));
  }

  if (netOH > 1e-6) {
    const concOH = netOH / volL;
    const pOH = -Math.log10(concOH);
    const ph = 14.0 - pOH;
    return Math.max(7.05, Math.min(14.0, Math.round(ph * 100) / 100));
  }

  // 2. Weak Acid / Conjugate Base / Buffer system
  if (inv.weakAcidHA_moles > 1e-6 && inv.pKa) {
    const Ka = Math.pow(10, -inv.pKa);
    if (inv.conjugateBaseA_moles > 1e-6) {
      // Henderson-Hasselbalch equation
      const ph = inv.pKa + Math.log10(inv.conjugateBaseA_moles / inv.weakAcidHA_moles);
      return Math.round(Math.min(14, Math.max(0, ph)) * 100) / 100;
    } else {
      // Exact quadratic weak acid dissociation: [H+]^2 + Ka[H+] - Ka*Ca = 0
      const Ca = inv.weakAcidHA_moles / volL;
      const concH = Math.max(1e-7, (-Ka + Math.sqrt(Ka * Ka + 4 * Ka * Ca)) / 2);
      const ph = Math.min(7, -Math.log10(concH));
      return Math.round(ph * 100) / 100;
    }
  } else if (inv.conjugateBaseA_moles > 1e-6 && inv.pKa) {
    // Standalone basic anion / weak base hydrolysis: [OH-]^2 + Kb[OH-] - Kb*Cb = 0
    const Ka = Math.pow(10, -inv.pKa);
    const Kb = 1e-14 / Ka;
    const Cb = inv.conjugateBaseA_moles / volL;
    const concOH = Math.max(1e-7, (-Kb + Math.sqrt(Kb * Kb + 4 * Kb * Cb)) / 2);
    const ph = Math.min(14, Math.max(7, 14 + Math.log10(concOH)));
    return Math.round(ph * 100) / 100;
  }

  // Pure salt or water -> Neutral pH 7.00
  return 7.0;
}

/**
 * Returns color hex for given indicator at specified pH.
/**
 * Computes continuous Henderson-Hasselbalch indicator color hex for given pH.
 * Smoothly blends across transition ranges around pKa while reaching crisp textbook
 * acid/base endpoint colors at extremes.
 */
export function getIndicatorColor(indicator: IndicatorType, ph: number): string {
  return computeContinuousIndicatorColor(indicator, ph);
}
