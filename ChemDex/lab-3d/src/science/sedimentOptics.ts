import { contourRadius, vesselInterior } from './vesselDimensions';
import { vesselBodyTransform } from './vesselScale';
import { opacityFromOpticalDepth } from './opticalDepth';
import type { PrecipitateProfile } from '../simulation/core/SimulationTypes';

export interface SedimentOpticalCohort {
  mass_g: number;
  profile: Pick<PrecipitateProfile, 'particleDensity_g_cm3' | 'baseParticleRadius_mm'>;
}

/** Finite normal-view bed coverage from equivalent-sphere projected area.
 * The material radius/density are the transport profile's illustrative inputs;
 * this is not measured reflectance, plate habit or a fitted optical spectrum.
 * Physical bed thickness/volume remain owned by the sediment transport model. */
export function sedimentBedOptics(vessel: { type: string; capacity_ml: number }, levelY: number,
  cohorts: Iterable<SedimentOpticalCohort>) {
  const empty = { opacity: 0, opticalDepth: 0, footprintArea_m2: 0 };
  if (!Number.isFinite(levelY) || !Number.isFinite(vessel.capacity_ml) || vessel.capacity_ml <= 0) return empty;
  const interior = vesselInterior(vessel.type);
  const radius = contourRadius(interior.points, Math.max(interior.floorY, Math.min(interior.topY, levelY)))
    * vesselBodyTransform(vessel).metersPerLocalUnit;
  const footprintArea_m2 = Math.PI * radius ** 2;
  if (!(footprintArea_m2 > 0)) return empty;
  let opticalDepth = 0;
  for (const cohort of cohorts) {
    const density = cohort.profile.particleDensity_g_cm3, radius_m = cohort.profile.baseParticleRadius_mm * 1e-3;
    if (![cohort.mass_g, density, radius_m].every(Number.isFinite) || cohort.mass_g <= 0 || density <= 0 || radius_m <= 0) continue;
    const solidVolume_m3 = cohort.mass_g / density * 1e-6;
    opticalDepth += 3 * solidVolume_m3 / (4 * radius_m * footprintArea_m2);
  }
  return { opacity: opacityFromOpticalDepth(opticalDepth), opticalDepth, footprintArea_m2 };
}
