import { sameMolecularFormula } from '../../science/speciesIdentity';
import type { VesselState } from '../../types/chemistry';
import { bulkPrecipitateMass, precipitateComponents } from '../../science/precipitateInventory';
import { metalSurfaceAppearance } from '../../science/metalSurfaceAppearance';

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
  const coating = metalSurfaceAppearance(vessel);
  const mass = Math.max(0, bulkPrecipitateMass(vessel.contents, formula)
    - (coating && sameMolecularFormula(coating.product, formula) ? coating.attachedMass_g : 0));
  if (!Number.isFinite(mass) || Math.abs(mass - snapshot.lastInputMass_g) > Math.max(1e-10, mass * 1e-8)) return null;
  if (!Number.isFinite(snapshot.cloudiness)) return null;
  return Math.max(0, Math.min(1, snapshot.cloudiness));
}

export function currentMixedPrecipitateTurbidity(vessel: VesselState, snapshot: {
  hasPrecipitationSnapshot: boolean;
  precipitationSystems: ReadonlyMap<string, SuspensionSnapshot>;
  cloudiness: number;
}): number | null {
  if (!snapshot.hasPrecipitationSnapshot || !Number.isFinite(snapshot.cloudiness)) return null;
  const coating = metalSurfaceAppearance(vessel);
  const components = precipitateComponents(vessel.contents, vessel.precipitateSubstance);
  // An empty precipitate registry does not own haze from other mechanisms
  // such as emulsions. Preserve the caller's model when no solid is declared.
  if (!components.length && !vessel.precipitateSubstance && !vessel.hasPrecipitate) return null;
  if (components.length !== snapshot.precipitationSystems.size) return null;
  for (const c of components) {
    const system = snapshot.precipitationSystems.get(c.formula);
    const mass = Math.max(0, c.mass_g - (coating && sameMolecularFormula(coating.product, c.formula) ? coating.attachedMass_g : 0));
    if (!system || system.lastInputMass_g === null || !sameMolecularFormula(system.profile.id, c.formula)
      || Math.abs(mass - system.lastInputMass_g) > Math.max(1e-10, mass * 1e-8)) return null;
  }
  return Math.max(0, Math.min(1, snapshot.cloudiness));
}
