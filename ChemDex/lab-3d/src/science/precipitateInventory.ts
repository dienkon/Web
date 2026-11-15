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
      formation: previous ? (previous.formation === c.precipitateFormation ? previous.formation : undefined) : c.precipitateFormation });
  }
  return [...result.values()].sort((a, b) => a.formula.localeCompare(b.formula));
}

/** Only distinct supported physical profiles create transport cohorts. Unknown
 * appearance labels never create an unbounded number of physical populations. */
export function canonicalPrecipitateFormation(formula: string, formation?: string): string | undefined {
  return sameMolecularFormula(formula, 'PbI2') && formation === 'CRYSTAL_PLATE' ? formation
    : sameMolecularFormula(formula, 'PbCl2') && formation === 'CRYSTAL_NEEDLE' ? formation : undefined;
}

/** New material with a supported alternative profile must carry an explicit
 * default too, so an old vessel-level crystal label cannot reinterpret it. */
export function explicitPrecipitateFormation(formula: string, formation?: string): string | undefined {
  return canonicalPrecipitateFormation(formula, formation)
    ?? (sameMolecularFormula(formula, 'PbI2') || sameMolecularFormula(formula, 'PbCl2') ? 'FINE_POWDER' : formation);
}

export function precipitateCohortKey(formula: string, formation?: string): string {
  const identity = identifySpecies(formula).formula, route = canonicalPrecipitateFormation(identity, formation);
  return route ? `${identity}|${route}` : identity;
}

export function rowPrecipitateFormation(row: SubstanceContent, contents: readonly SubstanceContent[],
  legacyFormula?: string, legacyFormation?: string): string | undefined {
  // Old saved specimens only had a vessel label. Once explicit row provenance
  // exists, that label cannot reinterpret an unlabelled fresh powder addition.
  const legacy = legacyFormula && sameMolecularFormula(row.formula, legacyFormula)
    && !contents.some(c => sameMolecularFormula(c.formula, row.formula) && c.precipitateFormation !== undefined)
    ? legacyFormation : undefined;
  return canonicalPrecipitateFormation(row.formula, row.precipitateFormation ?? legacy);
}

/** Materialize the existing legacy interpretation before a new row or UI
 * label changes the fallback. Only suspension rows acquire this provenance;
 * separately added macrostock keeps its own identity. */
export function withPrecipitateFormationOrigins(contents: readonly SubstanceContent[],
  legacyFormula?: string, legacyFormation?: string): SubstanceContent[] {
  return contents.map(row => {
    if (!isSuspensionRow(row, contents, legacyFormula)) return row;
    const formation = explicitPrecipitateFormation(row.formula, row.precipitateFormation
      ?? rowPrecipitateFormation(row, contents, legacyFormula, legacyFormation));
    return formation === row.precipitateFormation ? row : { ...row, precipitateFormation: formation };
  });
}

/** Formation-resolved physical projection. Chemistry/UI keep using the formula
 * totals above; these stable keys retain old powder beside newly grown plates. */
export function precipitateCohorts(contents: readonly SubstanceContent[], legacyFormula?: string, legacyFormation?: string) {
  const result = new Map<string, { key: string; formula: string; mass_g: number; formation?: string }>();
  for (const row of contents) {
    if (!isSuspensionRow(row, contents, legacyFormula) || !Number.isFinite(row.mass_g) || !(row.mass_g > 0)) continue;
    const formula = identifySpecies(row.formula).formula;
    const formation = rowPrecipitateFormation(row, contents, legacyFormula, legacyFormation);
    const key = precipitateCohortKey(formula, formation), previous = result.get(key);
    result.set(key, { key, formula, formation, mass_g: (previous?.mass_g ?? 0) + row.mass_g });
  }
  return [...result.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** Formula counter remains a compatibility summary; new withdrawals also
 * record cohort counters so a settled form cannot be removed as another form. */
export function precipitateCohortOutflow(vessel: Pick<VesselState, 'precipitateOutflow_g' | 'precipitateCohortOutflow_g'>,
  key: string, formula: string): number {
  return vessel.precipitateCohortOutflow_g ? vessel.precipitateCohortOutflow_g[key] ?? 0
    : key === formula ? vessel.precipitateOutflow_g?.[formula] ?? 0 : 0;
}

export function isSuspensionRow(item: SubstanceContent, contents: readonly SubstanceContent[], legacyFormula?: string): boolean {
  if ((item.phase ?? identifySpecies(item.formula).phase) !== 's' || (item.location && item.location !== 'bulk')) return false;
  if (item.solidOrigin === 'precipitate') return true;
  return !!legacyFormula && sameMolecularFormula(item.formula, legacyFormula)
    && !contents.some(c => c.solidOrigin === 'precipitate' && sameMolecularFormula(c.formula, item.formula));
}

/** Clear only haze previously attributable to an actual suspended solid.
 * Other cloudy samples retain their own optical model. In particular an
 * organic dispersed phase or active foam is not made clear by acid dissolution.
 * Undefined means this transition does not own the vessel's turbidity. */
export function clearedPrecipitateTurbidity(previous: Pick<VesselState, 'contents' | 'precipitateSubstance' | 'foam_ml'>,
  contents: readonly SubstanceContent[]): 0 | undefined {
  if ((previous.foam_ml ?? 0) > 0.05
    || contents.some(c => c.liquidLayer === 'organic' && c.moles > 0 && (!c.location || c.location === 'bulk'))
    || !precipitateComponents(previous.contents, previous.precipitateSubstance).length
    || precipitateComponents(contents, previous.precipitateSubstance).length) return undefined;
  return 0;
}

/** Migrate the amount explicitly recorded by an older vessel before another
 * reaction replaces its legacy species label. Splitting rows changes no mass
 * or moles; any independently added remainder retains its chunk identity. */
export function withLegacyPrecipitateOrigins(vessel: VesselState): SubstanceContent[] {
  const formula = vessel.precipitateSubstance, amount = vessel.precipitateAmount_g ?? 0;
  const liveLegacyStock = formula && vessel.stockMotion?.grains.some(pose => sameMolecularFormula(pose.formula, formula));
  const materialize = (contents: SubstanceContent[]) => {
    // A posed macrostock defeats legacy origin inference for untagged rows,
    // but cannot erase a valid legacy formation on explicitly tagged solids.
    const eligible = liveLegacyStock ? contents.filter(row => row.solidOrigin === 'precipitate') : contents;
    const resolved = withPrecipitateFormationOrigins(eligible, formula, vessel.precipitateMorphology);
    const byRow = new Map(eligible.map((row, i) => [row, resolved[i]]));
    return contents.map(row => byRow.get(row) ?? row);
  };
  if (liveLegacyStock || !vessel.hasPrecipitate || !formula || !(amount > 0) || !Number.isFinite(amount)
    || vessel.contents.some(c => c.solidOrigin === 'precipitate' && sameMolecularFormula(c.formula, formula))) {
    return materialize(vessel.contents.map(c => ({ ...c })));
  }
  const eligible = (c: SubstanceContent) => (c.phase ?? identifySpecies(c.formula).phase) === 's'
    && (!c.location || c.location === 'bulk') && sameMolecularFormula(c.formula, formula)
    && Number.isFinite(c.mass_g) && c.mass_g > 0;
  const total = vessel.contents.filter(eligible).reduce((s, c) => s + c.mass_g, 0);
  if (!(total > 0)) return materialize(vessel.contents.map(c => ({ ...c })));
  const fraction = Math.min(1, amount / total);
  const scale = (c: SubstanceContent, f: number) => ({ ...c, mass_g: c.mass_g * f, moles: c.moles * f,
    ...(c.initialMoles !== undefined ? { initialMoles: c.initialMoles * f } : {}),
    ...(c.initialMass_g !== undefined ? { initialMass_g: c.initialMass_g * f } : {}) });
  return materialize(vessel.contents.flatMap(c => !eligible(c) ? [{ ...c }] : [
    { ...scale(c, fraction), solidOrigin: 'precipitate' as const, precipitateFormation: vessel.precipitateMorphology },
    ...(fraction < 1 ? [scale(c, 1 - fraction)] : []),
  ]));
}
