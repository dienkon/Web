import type { PhysicalPrecipitateParticle } from '../simulation/core/SimulationTypes';

/** Fixed numerical transport resolution. GPU quality must never change it. */
export const PRECIPITATE_TRANSPORT_CAPACITY = 128;

/** Number moment up to the constant material-density sphere factor. For a
 * compact species M/r³ is conserved when grains dissolve by uniform shrinkage. */
export function parcelNumberWeight(particle: PhysicalPrecipitateParticle, fallbackRadius_m: number) {
  return particle.mass_ug / 1e6 / (particle.physicalRadius_m ?? fallbackRadius_m) ** 3;
}

/** Bounded spatial sampling, not physical coagulation. Merge nearby parcels
 * preserving mass, momentum and the compact-grain number moment. The resulting
 * mean radius does not resolve a full size distribution within that parcel. */
export function compactPrecipitateParcels(particles: PhysicalPrecipitateParticle[], capacity: number,
  constrain: (particle: PhysicalPrecipitateParticle) => void) {
  if (particles.length <= capacity) return;
  const radiusCohort = (particle: PhysicalPrecipitateParticle) => Math.round(Math.log(particle.physicalRadius_m!) / 1e-6);
  particles.sort((a, b) => radiusCohort(a) - radiusCohort(b) || a.x - b.x || a.y - b.y || a.z - b.z || a.id - b.id);
  while (particles.length > capacity) {
    let nearest = 0, distance = Infinity, sizeDifference = Infinity;
    // Adjacent sorted candidates bound the work; this is not a claim of an
    // exact nearest-neighbor search or a physical collision criterion.
    for (let i = 0; i < particles.length - 1; i++) {
      const a = particles[i], b = particles[i + 1];
      const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
      // Prefer equal grain-size cohorts. Spatial proximity alone would mix
      // old dissolved grains with fresh large grains and bias settling flux.
      const size = Math.abs(radiusCohort(a) - radiusCohort(b));
      if (size < sizeDifference || size === sizeDifference && d < distance) {
        sizeDifference = size; distance = d; nearest = i;
      }
    }
    const a = particles[nearest], b = particles[nearest + 1];
    const total = a.mass_ug + b.mass_ug, fraction = b.mass_ug / total;
    const radiusA = a.physicalRadius_m!, radiusB = b.physicalRadius_m!;
    const radius = Math.cbrt(total / (a.mass_ug / radiusA ** 3 + b.mass_ug / radiusB ** 3));
    for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'age', 'density'] as const) a[key] += (b[key] - a[key]) * fraction;
    a.radius *= radius / radiusA;
    if (a.primaryDisplayRadius_scene !== undefined && b.primaryDisplayRadius_scene !== undefined)
      a.primaryDisplayRadius_scene += (b.primaryDisplayRadius_scene - a.primaryDisplayRadius_scene) * fraction;
    a.physicalRadius_m = radius;
    a.mass_ug = total;
    // A centroid can leave a nonconvex wet domain (neck/tilted vortex). Only
    // position is projected back; mass, size moment and momentum remain intact.
    constrain(a);
    particles.splice(nearest + 1, 1);
  }
}

/** Evenly spaced display selection without modifying the transport population. */
export function precipitateDisplayIndex(index: number, displayCount: number, transportCount: number) {
  return Math.min(transportCount - 1, Math.floor((index + 0.5) * transportCount / displayCount));
}
