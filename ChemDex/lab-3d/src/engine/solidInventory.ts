import type { SubstanceContent } from '../types/chemistry';
import { sameMolecularFormula } from '../science/speciesIdentity';

/** Animation progress cannot consume matter. Count only bulk solid inventory. */
export function solidInventoryFraction(contents: SubstanceContent[], formula: string): number | null {
  const matching = contents.filter(item => sameMolecularFormula(item.formula, formula));
  if (!matching.length) return contents.length ? 0 : null;
  const solid = matching.filter(item => (item.phase ?? item.state) === 's' && item.location !== 'filter');
  const remaining = solid.reduce((sum, item) => sum + Math.max(0, item.moles), 0);
  const initial = matching.reduce((sum, item) => sum + Math.max(0, item.initialMoles ?? item.moles), 0);
  return initial > 0 ? Math.min(1, remaining / initial) : 0;
}
