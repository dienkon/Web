import { sameMolecularFormula } from '../../science/speciesIdentity';
import type { VesselState } from '../../types/chemistry';
import { freePrecipitateCohorts } from '../../science/freePrecipitateCohorts';
import { attachedMetalMassForRow } from '../../science/metalSurfaceAppearance';

interface SuspensionSnapshot {
  lastInputMass_g: number | null;
  profile: { id: string };
  cloudiness: number;
}

/** Null means the particle system has not yet caught up with this inventory.
 * A valid zero is authoritative: retained bed mass is not suspended cloudiness.
 */
export function currentPrecipitateTurbidity(vessel: VesselState, snapshot: SuspensionSnapshot): number | null {
  const formula = vessel.precipitateSubstance;
  if (!formula || snapshot.lastInputMass_g === null || !sameMolecularFormula(formula, snapshot.profile.id)) return null;
  const mass = freePrecipitateCohorts(vessel).filter(c => sameMolecularFormula(c.formula, formula))
    .reduce((sum, c) => sum + c.mass_g, 0);
  if (!Number.isFinite(mass) || Math.abs(mass - snapshot.lastInputMass_g) > Math.max(1e-10, mass * 1e-8)) return null;
  if (!Number.isFinite(snapshot.cloudiness)) return null;
  return Math.max(0, Math.min(1, snapshot.cloudiness));
}

export function currentMixedPrecipitateTurbidity(vessel: VesselState, snapshot: {
  hasPrecipitationSnapshot: boolean;
  precipitationSystems: ReadonlyMap<string, SuspensionSnapshot>;
  cloudiness: number;
}): number | null {
  const components = freePrecipitateCohorts(vessel);
  // Even before the first physical step (e.g. a paused restored specimen),
  // an inventory containing only attached products has no suspended solid.
  // A legacy hasPrecipitate label must not turn that water milky.
  const otherHaze = (vessel.turbidity ?? 0) > 0 || (vessel.foam_ml ?? 0) > 0.05
    || (vessel.immiscibleOrganicVolume_ml ?? 0) > 0
    || vessel.contents.some(row => row.liquidLayer === 'organic' && row.moles > 0);
  if (!components.length && otherHaze) return null;
  if (!components.length && !otherHaze && vessel.contents.some(row => attachedMetalMassForRow(vessel, row) > 0)) return 0;
  if (!snapshot.hasPrecipitationSnapshot || !Number.isFinite(snapshot.cloudiness)) return null;
  // An empty precipitate registry does not own haze from other mechanisms
  // such as emulsions. Preserve the caller's model when no solid is declared.
  if (!components.length && !vessel.precipitateSubstance && !vessel.hasPrecipitate) return null;
  if (components.length !== snapshot.precipitationSystems.size) return null;
  for (const c of components) {
    const system = snapshot.precipitationSystems.get(c.key);
    const mass = c.mass_g;
    if (!system || system.lastInputMass_g === null || !sameMolecularFormula(system.profile.id, c.formula)
      || Math.abs(mass - system.lastInputMass_g) > Math.max(1e-10, mass * 1e-8)) return null;
  }
  return Math.max(0, Math.min(1, snapshot.cloudiness));
}
