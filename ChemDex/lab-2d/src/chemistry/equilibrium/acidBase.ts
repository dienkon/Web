/**
 * Acid-Base Equilibrium, pH Calculation and Indicator Response Model
 * Complies with educational and thermodynamic principles:
 * - Dilute aqueous assumption (Kw = 1.0e-14 at 298.15 K)
 * - Excess reactant concentration accounting
 * - Weak acid / buffer equilibrium (Henderson-Hasselbalch)
 * - Multi-indicator spectral responses
 */

import { SubstanceQuantity } from '../../types/chemistry';

export type IndicatorType = 'phenolphthalein' | 'litmus' | 'universal' | 'bromothymol_blue';

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
    // Strong bases
    else if (f === 'NAOH' || f === 'KOH') {
      strongBaseOH_moles += item.moles;
    } else if (f.includes('BA(OH)2') || f.includes('CA(OH)2')) {
      strongBaseOH_moles += item.moles * 2;
    }
    // Weak acids (e.g. Acetic acid CH3COOH)
    else if (f.includes('CH3COOH') || f === 'C2H4O2') {
      weakAcidHA_moles += item.moles;
      pKa = 4.76;
    }
    // Conjugate base salts (e.g. CH3COONa)
    else if (f.includes('CH3COONA')) {
      conjugateBaseA_moles += item.moles;
      pKa = 4.76;
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
      if (ph < 8.2) return '#f8fafc'; // Colorless
      if (ph < 9.0) return '#f472b6'; // Light pink transition
      return '#ec4899'; // Vivid magenta/pink
    
    case 'litmus':
      if (ph < 5.0) return '#ef4444'; // Red
      if (ph <= 8.0) return '#a855f7'; // Purple (neutral)
      return '#3b82f6'; // Blue
    
    case 'universal':
      if (ph <= 2.0) return '#dc2626'; // Deep red
      if (ph <= 4.0) return '#ea580c'; // Orange
      if (ph <= 6.0) return '#eab308'; // Yellow
      if (ph <= 7.5) return '#22c55e'; // Green (neutral)
      if (ph <= 9.0) return '#06b6d4'; // Blue-green
      if (ph <= 11.0) return '#2563eb'; // Deep blue
      return '#7c3aed'; // Violet
    
    case 'bromothymol_blue':
      if (ph < 6.0) return '#eab308'; // Yellow
      if (ph <= 7.6) return '#22c55e'; // Green
      return '#2563eb'; // Blue
  }
}
