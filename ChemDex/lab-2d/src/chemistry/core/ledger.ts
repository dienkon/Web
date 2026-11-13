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
import { calculateMixtureOptics } from '../optics/liquidOptics';

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
/**
 * Multi-species linear-sRGB Beer-Lambert spectral absorbance & Tyndall scatter calculation
 * (ported from lab-3d optics.ts): computes A_lambda = sum(eps_i * c_i * L_cm),
 * transmittance T = 10^(-A), forward scatter blending, and sRGB gamma encoding.
 */
export function calculateBeerLambertColor(
  contents: SubstanceQuantity[],
  volume_ml: number,
  defaultColorHex = '#f8fafc',
  pathLength_cm = 4.5
): string {
  return calculateMixtureOptics(contents, volume_ml, [0, 0, 0], pathLength_cm, defaultColorHex).colorHex;
}
