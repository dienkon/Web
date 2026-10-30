import { PRECIPITATES_DATABASE } from '../data/precipitates';
import type { PrecipitateProfile } from '../simulation/core/SimulationTypes';

const fractions = new Map(Object.values(PRECIPITATES_DATABASE).map(p => [p.formula, p.packingFraction_phi]));
/** Species-dependent illustrative wet-bed packing; not a measured compression
 * law. Mineral density describes material volume, not a hydrated gel's volume.
 */
export function precipitatePackingFraction(profile: PrecipitateProfile): number {
  return fractions.get(profile.id) ?? (profile.morphology === 'gel_like' ? 0.08
    : profile.morphology === 'flocculent' ? 0.15 : profile.morphology === 'granular' ? 0.4 : 0.35);
}
