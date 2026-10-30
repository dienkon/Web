import { VesselProfile, getVesselProfile } from './profiles';
import { roundPlaneVolume } from './roundPlaneVolume';
export { segArea } from './roundPlaneVolume';

/** Volume below n·p <= c. Plane/wall crossings are integration boundaries. */
export function volumeBelowPlane(profile: VesselProfile, nx: number, ny: number, c: number, slices = 64): number {
  const length = Math.hypot(nx, ny);
  if (!(length > 0) || !Number.isFinite(length) || !Number.isFinite(c)) return 0;
  return roundPlaneVolume(profile, nx / length, ny / length, slices).evaluate(c / length).volume;
}

const RETAINED_CACHE = new WeakMap<VesselProfile, number[]>();
const SAMPLE_COUNT = 64;
/** Coarse samples seed the assist only; discharge uses the actual lip plane. */
export function getRetainedVolumeSamples(profile: VesselProfile): number[] {
  const cached = RETAINED_CACHE.get(profile); if (cached) return cached;
  const samples = Array.from({ length: SAMPLE_COUNT }, (_, i) => retainedVolume(profile, i / (SAMPLE_COUNT - 1) * Math.PI));
  RETAINED_CACHE.set(profile, samples); return samples;
}

export function retainedVolume(typeOrProfile: string | VesselProfile, thetaRad: number): number {
  const theta = Math.min(Math.PI, Math.abs(thetaRad));
  if (!Number.isFinite(theta) || theta >= Math.PI) return 0;
  const profile = typeof typeOrProfile === 'string' ? getVesselProfile(typeOrProfile) : typeOrProfile;
  const nx = -Math.sin(theta), ny = Math.cos(theta), section = roundPlaneVolume(profile, nx, ny);
  const raw = section.evaluate(nx * profile.lipLocal[0] + ny * profile.lipLocal[1]).volume;
  return section.full > 0 ? Math.max(0, Math.min(profile.capacity_ml, raw / section.full * profile.capacity_ml)) : 0;
}

/** Solve the smaller liquid/air volume, accurate near empty and full. Newton
 * uses integrated section area; bisection safeguards the bracket. */
export function solveLevel(profile: VesselProfile, thetaRad: number, volume_ml: number): { c: number; liquidTopY: number; surfaceArea: number; depth: number } {
  const nx = -Math.sin(thetaRad), ny = Math.cos(thetaRad);
  const fraction = Math.max(0, Math.min(1, volume_ml / profile.capacity_ml));
  const sign = fraction > 0.5 ? -1 : 1;
  const section = roundPlaneVolume(profile, sign * nx, sign * ny);
  const target = (sign < 0 ? 1 - fraction : fraction) * section.full;
  let low = section.low, high = section.high, c = low, area = 0;
  if (target > 0) {
    c = low + (high - low) * target / section.full;
    for (let i = 0; i < 64; i++) {
      const value = section.evaluate(c); area = value.area;
      const error = value.volume - target;
      if (Math.abs(error) <= target * 2e-11) break;
      if (error < 0) low = c; else high = c;
      const next = c - error / area;
      const middle = low + (high - low) / 2;
      if (middle === low || middle === high) break;
      c = Number.isFinite(next) && next > low && next < high ? next : middle;
    }
  }
  c *= sign;
  const liquidTopY = Math.abs(ny) > 1e-8 ? Math.max(profile.baseY, Math.min(profile.baseY + profile.H, c / ny))
    : profile.baseY + profile.H / 2;
  return { c, liquidTopY, surfaceArea: area, depth: Math.max(0, c - (sign > 0 ? section.low : -section.high)) };
}

export function findPouringTilt(profile: VesselProfile, currentVolume_ml: number): number {
  if (!(currentVolume_ml > 0)) return 0;
  const samples = getRetainedVolumeSamples(profile), targetRetained = currentVolume_ml * 0.85;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i] <= targetRetained) return Math.max(0.55, Math.min(2.1, i / (samples.length - 1) * Math.PI + 0.12));
  }
  return 1.65;
}
