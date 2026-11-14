import type { SubstanceContent } from '../types/chemistry';
import { identifySpecies, matchesReagent } from './speciesIdentity';

/** Legacy stock rows may use words instead of the program's phase symbols. */
export function reagentPhase(item: SubstanceContent): string | null {
  const raw = item.phase ?? item.state ?? identifySpecies(item.formula).phase;
  if (!raw) return null;
  const phase = raw.trim().toLowerCase();
  return ({ solid: 's', liquid: 'l', gas: 'g', aqueous: 'aq' } as Record<string, string>)[phase] ?? phase;
}

/** Only the finite inventory in the reaction compartment can be consumed.
 * Filter cake and foam remain in the ledger, but are not bulk reactants. */
export function availableInBulk(item: SubstanceContent, threshold = 1e-12): boolean {
  return Number.isFinite(item.moles) && item.moles > threshold
    && (!item.location || item.location === 'bulk');
}

/** Keep separated material out of the solution's saturation/speciation inputs.
 * Invalid bulk quantities are retained so a scientific solver can reject them. */
export function bulkInventory(contents: readonly SubstanceContent[]): SubstanceContent[] {
  return contents.filter(item => !item.location || item.location === 'bulk')
    .map(item => ({ ...item, phase: reagentPhase(item) ?? undefined }));
}

export function availableReagent(item: SubstanceContent, formula: string,
  expectedPhase?: string | null, threshold = 1e-12): boolean {
  if (!availableInBulk(item, threshold) || !matchesReagent(item.formula, formula)) return false;
  const phase = reagentPhase(item);
  const labelPhase = identifySpecies(item.formula).phase;
  if (labelPhase && phase && labelPhase !== phase) return false;
  const required = expectedPhase ?? identifySpecies(formula).phase;
  // Unlabelled historical rows retain their existing discovery behaviour;
  // explicit phase metadata must agree with the physical reaction.
  return !required || !phase || phase === required;
}
