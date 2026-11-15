import type { VesselState } from '../types/chemistry';
import { precipitateCohorts } from './precipitateInventory';
import { attachedMetalMassForRow } from './metalSurfaceAppearance';

/** Attached metal is inventory on a substrate, not a second mobile cloud.
 * Remove its exact row share before grouping independent formation histories. */
export function freePrecipitateCohorts(vessel: VesselState, legacyFormula = vessel.precipitateSubstance) {
  const contents = vessel.contents.map(row => {
    const attached = attachedMetalMassForRow(vessel, row);
    return attached > 0 ? { ...row, mass_g: Math.max(0, row.mass_g - attached) } : row;
  });
  return precipitateCohorts(contents, legacyFormula, vessel.precipitateMorphology);
}
