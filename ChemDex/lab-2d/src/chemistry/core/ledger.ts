/**
 * Physical Conservation Ledger and Invariant Checker
 * Enforces:
 * 1. Conservation of Mass across system boundaries
 * 2. Conservation of Elements (atom counts before == after)
 * 3. Beer-Lambert Law color transmittance
 * 4. Non-ideal excess volume calculations
 */

import { parseChemicalFormula, computeMolarMass } from './formula';
import { SubstanceQuantity, ReactionDefinition } from '../../types/chemistry';

/** AI proposals must pass the same elemental conservation gate as catalog
 * reactions before they are allowed to modify physical inventories. */
export function isElementBalancedReaction(reaction: ReactionDefinition): boolean {
  try {
    if (!reaction.reactants?.length || !reaction.products?.length || !Number.isFinite(reaction.deltaH_kJ_mol)) return false;
    const count = (side: ReactionDefinition['reactants']) => {
      const totals: Record<string, number> = {};
      for (const species of side) {
        if (!Number.isFinite(species.coefficient) || species.coefficient <= 0 || !['aq','s','l','g'].includes(species.state)) throw new Error('Invalid species');
        const atoms = parseChemicalFormula(species.formula);
        if (!Object.keys(atoms).length || !(computeMolarMass(species.formula) > 0)) throw new Error('Unknown formula');
        for (const [element, amount] of Object.entries(atoms)) totals[element] = (totals[element] ?? 0) + amount * species.coefficient;
      }
      return totals;
    };
    const left = count(reaction.reactants), right = count(reaction.products);
    return [...new Set([...Object.keys(left), ...Object.keys(right)])].every(element => Math.abs((left[element] ?? 0) - (right[element] ?? 0)) < 1e-8);
  } catch { return false; }
}

export interface ConservationAudit {
  isConserved: boolean;
  initialMass_g: number;
  finalMass_g: number;
  massDiscrepancy_g: number;
  atomDiscrepancies: Record<string, number>; // Element -> difference
}

/**
 * Counts total atoms of each element in a list of substance quantities.
 */
export function countElementalAtoms(contents: SubstanceQuantity[]): Record<string, number> {
  const totalAtoms: Record<string, number> = {};

  for (const item of contents) {
    if (item.moles <= 0) continue;
    const atomsInFormula = parseChemicalFormula(item.formula);
    for (const [el, count] of Object.entries(atomsInFormula)) {
      // Moles of atoms of element = moles of compound * count in formula
      const molesOfElement = item.moles * count;
      totalAtoms[el] = (totalAtoms[el] || 0) + molesOfElement;
    }
  }

  return totalAtoms;
}

/**
 * Audits conservation of mass and elements between two states.
 * Allows gas escaping from open vessels to be tracked in `escapedGas_moles`.
 */
export function auditConservation(
  initialContents: SubstanceQuantity[],
  finalContents: SubstanceQuantity[],
  escapedGasContents: SubstanceQuantity[] = [],
  tolerance = 1e-4
): ConservationAudit {
  const initialAtoms = countElementalAtoms(initialContents);
  const combinedFinal = [...finalContents, ...escapedGasContents];
  const finalAtoms = countElementalAtoms(combinedFinal);

  let initialMass_g = initialContents.reduce((sum, item) => sum + item.mass_g, 0);
  let finalMass_g = combinedFinal.reduce((sum, item) => sum + item.mass_g, 0);

  const massDiscrepancy_g = Math.abs(finalMass_g - initialMass_g);

  const allElements = new Set([...Object.keys(initialAtoms), ...Object.keys(finalAtoms)]);
  const atomDiscrepancies: Record<string, number> = {};
  let isConserved = massDiscrepancy_g <= 0.05; // 50 mg tolerance for precision floats

  for (const el of allElements) {
    const init = initialAtoms[el] || 0;
    const fin = finalAtoms[el] || 0;
    const diff = Math.abs(fin - init);
    if (diff > tolerance) {
      atomDiscrepancies[el] = diff;
      isConserved = false;
    }
  }

  return {
    isConserved,
    initialMass_g: Math.round(initialMass_g * 1000) / 1000,
    finalMass_g: Math.round(finalMass_g * 1000) / 1000,
    massDiscrepancy_g: Math.round(massDiscrepancy_g * 1000) / 1000,
    atomDiscrepancies,
  };
}

/**
 * Calculates volume contraction for non-ideal mixtures (e.g. Ethanol + Water).
 */
export function calculateExcessVolumeContraction_ml(
  volWater_ml: number,
  volSolvent_ml: number,
  solventFormula: string
): number {
  const norm = solventFormula.toUpperCase();
  if (norm === 'C2H5OH' || norm === 'ETHANOL') {
    // Binary water-ethanol mixture contracts ~3.5% at roughly equal proportions
    const totalIdeal = volWater_ml + volSolvent_ml;
    if (totalIdeal <= 0) return 0;
    const fraction = Math.min(volWater_ml, volSolvent_ml) / totalIdeal;
    // Parabolic contraction model peaking around 50%
    return -totalIdeal * 0.035 * (4 * fraction * (1 - fraction));
  }
  return 0;
}

/**
 * Beer-Lambert Law color calculation for transmitted light through colored solutions:
 * T = 10^(-epsilon * c * l)
 */
export function calculateBeerLambertColor(
  contents: SubstanceQuantity[],
  volume_ml: number,
  defaultColorHex = '#f8fafc'
): string {
  if (contents.length === 0 || volume_ml <= 0) return defaultColorHex;

  // Key chromophores and their characteristic RGB absorption weights
  const chromophores: Record<string, { r: number; g: number; b: number; extinction: number }> = {
    'CUSO4': { r: 56, g: 189, b: 248, extinction: 50 },        // Sky blue
    '[CU(NH3)4]SO4': { r: 29, g: 78, b: 216, extinction: 200 }, // Royal blue
    'FECL3': { r: 202, g: 138, b: 4, extinction: 80 },         // Amber brown
    'KMNO4': { r: 126, g: 34, b: 206, extinction: 800 },       // Intense purple
    'K2CR2O7': { r: 234, g: 88, b: 12, extinction: 300 },      // Orange
    'FESO4': { r: 187, g: 247, b: 208, extinction: 20 },       // Pale green
    'NISO4': { r: 34, g: 197, b: 94, extinction: 60 },         // Emerald green
    'COCL2': { r: 244, g: 63, b: 94, extinction: 70 },         // Pink/magenta
    'I2': { r: 161, g: 98, b: 7, extinction: 250 },            // Iodine brown
  };

  let maxInfluence = 0;
  let activeColor = defaultColorHex;

  for (const item of contents) {
    const norm = item.formula.toUpperCase().replace(/\s+/g, '');
    const chrom = chromophores[norm];
    if (chrom && item.concentration_M && item.concentration_M > 0) {
      const absorbance = chrom.extinction * item.concentration_M;
      if (absorbance > maxInfluence) {
        maxInfluence = absorbance;
        // Hex representation
        const rHex = chrom.r.toString(16).padStart(2, '0');
        const gHex = chrom.g.toString(16).padStart(2, '0');
        const bHex = chrom.b.toString(16).padStart(2, '0');
        activeColor = `#${rHex}${gHex}${bHex}`;
      }
    }
  }

  return activeColor;
}
