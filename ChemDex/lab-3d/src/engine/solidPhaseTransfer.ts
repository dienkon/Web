import type { SubstanceContent } from '../types/chemistry';
import { sameMolecularFormula } from '../science/speciesIdentity';

/** Transfer only the changed phase amount. Surviving stock keeps its origin,
 * layout reference and other metadata; crystallization creates a separate
 * precipitate pool. Callers supply only material eligible for liquid contact. */
export function transferSolidPhase(contents: readonly SubstanceContent[], formula: string,
  nextDissolved_mol: number, volume_ml: number, formation?: string): SubstanceContent[] {
  const matching = (row: SubstanceContent) => sameMolecularFormula(row.formula, formula)
    && (!row.location || row.location === 'bulk') && (row.phase === 's' || row.phase === 'aq');
  const solids = contents.filter(row => matching(row) && row.phase === 's');
  const aqueous = contents.filter(row => matching(row) && row.phase === 'aq');
  const solidMoles = solids.reduce((sum, row) => sum + row.moles, 0);
  const dissolved = aqueous.reduce((sum, row) => sum + row.moles, 0);
  const dissolvedMass = aqueous.reduce((sum, row) => sum + row.mass_g, 0);
  const next = Math.max(0, Math.min(solidMoles + dissolved, nextDissolved_mol));
  const delta = next - dissolved;
  let nextMass = dissolvedMass;
  let remaining: SubstanceContent[];
  if (delta > 0) {
    const removedFraction = Math.min(1, delta / solidMoles);
    nextMass += solids.reduce((sum, row) => sum + row.mass_g * removedFraction, 0);
    remaining = solids.map(row => ({ ...row, moles: row.moles * (1 - removedFraction),
      mass_g: row.mass_g * (1 - removedFraction) })).filter(row => row.moles > 0);
  } else {
    remaining = solids.map(row => ({ ...row }));
    if (delta < 0) {
      const newMass = dissolvedMass * (-delta / dissolved);
      nextMass -= newMass;
      const existing = remaining.find(row => row.solidOrigin === 'precipitate');
      if (existing) { existing.moles -= delta; existing.mass_g += newMass; }
      else remaining.push({ formula, phase: 's', moles: -delta, mass_g: newMass,
        solidOrigin: 'precipitate', ...(formation ? { precipitateFormation: formation } : {}) });
    }
  }
  const result = contents.filter(row => !matching(row));
  if (next > 0) result.push({ formula, phase: 'aq', moles: next, mass_g: nextMass,
    concentration_M: next / (volume_ml / 1000) });
  result.push(...remaining);
  return result;
}
