/**
 * Acid-Base Equilibrium, pH Calculation and Indicator Response Model
 * Complies with educational and thermodynamic principles:
 * - Dilute aqueous assumption (Kw = 1.0e-14 at 298.15 K)
 * - Excess reactant concentration accounting
 * - Weak acid / buffer equilibrium (Henderson-Hasselbalch)
 * - Multi-indicator spectral responses
 */

import { SubstanceQuantity } from '../../types/chemistry';

export type IndicatorType =
  | 'phenolphthalein'
  | 'litmus'
  | 'universal'
  | 'bromothymol_blue'
  | 'methyl_orange'
  | 'thymolphthalein';

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
    // Weak base NH3 / NH4OH
    else if (f === 'NH3' || f === 'NH4OH') {
      // NH3 + H2O <=> NH4+ + OH- (Kb = 1.8e-5, pKb = 4.75 -> effective basicity)
      strongBaseOH_moles += item.moles * 0.15; // Weakly dissociated hydroxide
    }
    // Conjugate base salts (e.g. CH3COONa, NaHCO3)
    else if (f.includes('CH3COONA')) {
      conjugateBaseA_moles += item.moles;
      pKa = 4.76;
    } else if (f.includes('NAHCO3')) {
      // Bicarbonate buffer
      weakAcidHA_moles += item.moles * 0.5;
      conjugateBaseA_moles += item.moles * 0.5;
      pKa = 6.35;
    } else if (f.includes('NA2CO3')) {
      strongBaseOH_moles += item.moles * 0.35; // Hydrolyzed carbonate pH ~11.5
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

  // 2. Weak Acid / Buffer system (e.g. Acetic acid / Acetate)
  if (inv.weakAcidHA_moles > 1e-6 && inv.pKa) {
    const Ka = Math.pow(10, -inv.pKa);
    if (inv.conjugateBaseA_moles > 1e-6) {
      // Henderson-Hasselbalch equation
      const ph = inv.pKa + Math.log10(inv.conjugateBaseA_moles / inv.weakAcidHA_moles);
      return Math.round(ph * 100) / 100;
    } else {
      // Weak acid alone in water: [H+] ≈ sqrt(Ka * Ca)
      const Ca = inv.weakAcidHA_moles / volL;
      const concH = Math.sqrt(Ka * Ca);
      const ph = -Math.log10(concH);
      return Math.round(ph * 100) / 100;
    }
  }

  // Pure salt or water -> Neutral pH 7.00
  return 7.0;
}

/**
 * Returns color hex for given indicator at specified pH.
 */
export function getIndicatorColor(indicator: IndicatorType, ph: number): string {
  switch (indicator) {
    case 'phenolphthalein':
      if (ph < 8.2) return '#f8fafc'; // Colorless in acid / neutral
      if (ph < 9.0) return '#f472b6'; // Light pink transition
      if (ph <= 12.5) return '#ec4899'; // Vivid magenta/pink
      return '#fdf2f8'; // Colorless in extremely concentrated alkali (pH > 12.5)

    case 'litmus':
      if (ph < 4.5) return '#ef4444'; // Red in acid
      if (ph <= 8.3) return '#a855f7'; // Purple (neutral)
      return '#3b82f6'; // Blue in base

    case 'methyl_orange':
      if (ph < 3.1) return '#ef4444'; // Red in strong acid
      if (ph <= 4.4) return '#f97316'; // Orange transition
      return '#eab308'; // Yellow in weak acid / neutral / base

    case 'thymolphthalein':
      if (ph < 9.3) return '#f8fafc'; // Colorless
      if (ph <= 10.5) return '#60a5fa'; // Light blue transition
      return '#1d4ed8'; // Vivid royal blue

    case 'universal':
      if (ph <= 2.0) return '#dc2626'; // Deep red (pH 1-2)
      if (ph <= 4.0) return '#ea580c'; // Orange (pH 3-4)
      if (ph <= 6.0) return '#eab308'; // Yellow (pH 5-6)
      if (ph <= 7.5) return '#22c55e'; // Green (pH 7)
      if (ph <= 9.0) return '#06b6d4'; // Blue-green (pH 8-9)
      if (ph <= 11.0) return '#2563eb'; // Deep blue (pH 10-11)
      return '#7c3aed'; // Violet (pH 12-14)

    case 'bromothymol_blue':
      if (ph < 6.0) return '#eab308'; // Yellow
      if (ph <= 7.6) return '#22c55e'; // Green
      return '#2563eb'; // Blue
  }
}
