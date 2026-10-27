import type { SubstanceContent, VesselState } from '../types/chemistry';
import { identifySpecies, sameMolecularFormula } from './speciesIdentity';

/** Only solid material in the vessel bulk can feed suspended particles/bed.
 * UI summaries never authorize production, and retained filter cake stays out.
 */
export function bulkPrecipitateMass(contents: readonly SubstanceContent[], formula?: string): number {
  if (!formula) return 0;
  return contents.reduce((sum, item) => {
    const phase = item.phase ?? identifySpecies(item.formula).phase;
    return phase === 's' && (!item.location || item.location === 'bulk')
      && sameMolecularFormula(item.formula, formula) && Number.isFinite(item.mass_g) && item.mass_g > 0
      ? sum + item.mass_g : sum;
  }, 0);
}

/** Explicit product rows survive changes of the single legacy UI label.
 * Untagged saved inventories retain that label as a compatibility fallback;
 * once a formula has tagged rows, its separately added untagged solid is not
 * also counted as a suspension. Filter/foam inventories never feed the cloud. */
export function precipitateComponents(contents: readonly SubstanceContent[], legacyFormula?: string) {
  const explicit = new Set(contents.filter(c => c.solidOrigin === 'precipitate')
    .map(c => identifySpecies(c.formula).formula));
  const result = new Map<string, { formula: string; mass_g: number; formation?: string }>();
  for (const c of contents) {
    const identity = identifySpecies(c.formula);
    if ((c.phase ?? identity.phase) !== 's' || (c.location && c.location !== 'bulk')
      || !Number.isFinite(c.mass_g) || !(c.mass_g > 0)) continue;
    if (c.solidOrigin !== 'precipitate' && (explicit.has(identity.formula)
      || !legacyFormula || !sameMolecularFormula(c.formula, legacyFormula))) continue;
    const previous = result.get(identity.formula);
    result.set(identity.formula, { formula: identity.formula, mass_g: (previous?.mass_g ?? 0) + c.mass_g,
      formation: c.precipitateFormation ?? previous?.formation });
  }
  return [...result.values()].sort((a, b) => a.formula.localeCompare(b.formula));
}

export function isSuspensionRow(item: SubstanceContent, contents: readonly SubstanceContent[], legacyFormula?: string): boolean {
  if ((item.phase ?? identifySpecies(item.formula).phase) !== 's' || (item.location && item.location !== 'bulk')) return false;
  if (item.solidOrigin === 'precipitate') return true;
  return !!legacyFormula && sameMolecularFormula(item.formula, legacyFormula)
    && !contents.some(c => c.solidOrigin === 'precipitate' && sameMolecularFormula(c.formula, item.formula));
}

/** Migrate the amount explicitly recorded by an older vessel before another
 * reaction replaces its legacy species label. Splitting rows changes no mass
 * or moles; any independently added remainder retains its chunk identity. */
export function withLegacyPrecipitateOrigins(vessel: VesselState): SubstanceContent[] {
  const formula = vessel.precipitateSubstance, amount = vessel.precipitateAmount_g ?? 0;
  if (!vessel.hasPrecipitate || !formula || !(amount > 0) || !Number.isFinite(amount)
    || vessel.contents.some(c => c.solidOrigin === 'precipitate' && sameMolecularFormula(c.formula, formula))) {
    return vessel.contents.map(c => ({ ...c }));
  }
  const eligible = (c: SubstanceContent) => (c.phase ?? identifySpecies(c.formula).phase) === 's'
    && (!c.location || c.location === 'bulk') && sameMolecularFormula(c.formula, formula)
    && Number.isFinite(c.mass_g) && c.mass_g > 0;
  const total = vessel.contents.filter(eligible).reduce((s, c) => s + c.mass_g, 0);
  if (!(total > 0)) return vessel.contents.map(c => ({ ...c }));
  const fraction = Math.min(1, amount / total);
  const scale = (c: SubstanceContent, f: number) => ({ ...c, mass_g: c.mass_g * f, moles: c.moles * f,
    ...(c.initialMoles !== undefined ? { initialMoles: c.initialMoles * f } : {}),
    ...(c.initialMass_g !== undefined ? { initialMass_g: c.initialMass_g * f } : {}) });
  return vessel.contents.flatMap(c => !eligible(c) ? [{ ...c }] : [
    { ...scale(c, fraction), solidOrigin: 'precipitate' as const, precipitateFormation: vessel.precipitateMorphology },
    ...(fraction < 1 ? [scale(c, 1 - fraction)] : []),
  ]);
}
