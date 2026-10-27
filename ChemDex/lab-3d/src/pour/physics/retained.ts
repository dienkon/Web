import { VesselProfile, getVesselProfile } from './profiles';
import { contourVolumeBelow } from '../../science/vesselDimensions';

/**
 * Calculates the cross-sectional circular segment area of radius R where x <= s.
 * Exact analytical formula with continuous derivative dA/ds = 2*sqrt(R^2 - s^2).
 */
export function segArea(R: number, s: number): number {
  if (R <= 0.0001) return 0;
  if (s <= -R) return 0;
  if (s >= R) return Math.PI * R * R;
  const clampedS = Math.max(-R, Math.min(R, s));
  return R * R * Math.acos(-clampedS / R) + clampedS * Math.sqrt(Math.max(0, R * R - clampedS * clampedS));
}

/**
 * Calculates volume of liquid inside vessel below plane n · p <= c
 * using Simpson's / numerical slice integration.
 */
type Slice = { y: number; radius: number; weight: number };
const quadratures = new WeakMap<VesselProfile, Map<number, Slice[]>>();
function volumeSlices(profile: VesselProfile, count: number): Slice[] {
  const evenCount = Math.max(8, Math.ceil(count / 2) * 2);
  let cache = quadratures.get(profile);
  if (!cache) { cache = new Map(); quadratures.set(profile, cache); }
  const cached = cache.get(evenCount);
  if (cached) return cached;
  const base = profile.baseY, top = base + profile.H;
  const knots = [...new Set([base, ...(profile.contour ?? []).map(([, y]) => y), top])]
    .filter(y => y >= base && y <= top).sort((a, b) => a - b);
  const result: Slice[] = [];
  for (let k = 1; k < knots.length; k++) {
    const a = knots[k - 1], b = knots[k];
    const steps = Math.max(2, Math.ceil(evenCount * (b - a) / profile.H / 2) * 2);
    const dy = (b - a) / steps;
    for (let i = 0; i <= steps; i++) {
      const y = a + i * dy;
      result.push({ y, radius: profile.r(y), weight: dy / 3 * (i === 0 || i === steps ? 1 : i % 2 ? 4 : 2) });
    }
  }
  cache.set(evenCount, result);
  return result;
}
function uprightVolumeBelow(profile: VesselProfile, y: number, count: number): number {
  if (profile.contour) return contourVolumeBelow(profile.contour, y);
  const a = profile.baseY, b = Math.min(a + profile.H, y);
  if (b <= a) return 0;
  const steps = Math.max(8, Math.ceil(count / 2) * 2), dy = (b - a) / steps;
  let sum = 0;
  for (let i = 0; i <= steps; i++) {
    const r = profile.r(a + i * dy);
    sum += Math.PI * r * r * (i === 0 || i === steps ? 1 : i % 2 ? 4 : 2);
  }
  return sum * dy / 3;
}
export function volumeBelowPlane(profile: VesselProfile, nx: number, ny: number, c: number, slices = 64): number {
  const length = Math.hypot(nx, ny);
  if (!(length > 0) || !Number.isFinite(length) || !Number.isFinite(c)) return 0;
  nx /= length; ny /= length; c /= length;
  if (Math.abs(nx) < 1e-8) {
    const below = uprightVolumeBelow(profile, c / ny, slices);
    return ny > 0 ? below : Math.max(0, uprightVolumeBelow(profile, profile.baseY + profile.H, slices) - below);
  }
  let volume = 0;
  for (const slice of volumeSlices(profile, slices)) {
    const area = segArea(slice.radius, (c - ny * slice.y) / nx);
    volume += slice.weight * (nx > 0 ? area : Math.PI * slice.radius * slice.radius - area);
  }
  return Math.max(0, volume);
}

/**
 * Precomputed 64-sample retained volume cache per vessel profile.
 */
const RETAINED_CACHE = new WeakMap<VesselProfile, number[]>();
const SAMPLE_COUNT = 64;

export function getRetainedVolumeSamples(profile: VesselProfile): number[] {
  const cached = RETAINED_CACHE.get(profile);
  if (cached) return cached;

  const samples: number[] = new Array(SAMPLE_COUNT);
  const maxTheta = Math.PI; // Full range 0 to 180 degrees (inversion)

  // Base upright volume at theta = 0
  const rawUpright = volumeBelowPlane(profile, 0, 1, profile.baseY + profile.H, 64);
  const scaleToMl = rawUpright > 0 ? profile.capacity_ml / rawUpright : 1.0;

  let prevVol = profile.capacity_ml;

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    if (i === SAMPLE_COUNT - 1) {
      // Inverted pose: liquid completely drains out of open-top vessel
      samples[i] = 0;
      prevVol = 0;
      continue;
    }

    const theta = (i / (SAMPLE_COUNT - 1)) * maxTheta;
    // Tilted towards the pouring spout at +lipX:
    // Upward free surface normal has nx < 0 (pointing opposite to tilt) and ny > 0
    const nx = -Math.sin(theta);
    const ny = Math.cos(theta);

    // Plane passing through pouring lip at (lipX, lipY)
    const lipX = profile.lipLocal[0];
    const lipY = profile.lipLocal[1];
    const cSpill = nx * lipX + ny * lipY;

    const rawVol = volumeBelowPlane(profile, nx, ny, cSpill, 48) * scaleToMl;
    const monotonicVol = Math.max(0, Math.min(prevVol, rawVol));
    samples[i] = monotonicVol;
    prevVol = monotonicVol;
  }

  RETAINED_CACHE.set(profile, samples);
  return samples;
}

/**
 * Returns the maximum liquid volume (mL) that the vessel can retain at tilt angle theta (radians).
 * Liquid spills when vessel volume exceeds this retained capacity.
 */
export function retainedVolume(typeOrProfile: string | VesselProfile, thetaRad: number): number {
  const absTheta = Math.abs(thetaRad);
  if (absTheta >= Math.PI - 1e-4) {
    return 0;
  }
  const profile = typeof typeOrProfile === 'string' ? getVesselProfile(typeOrProfile) : typeOrProfile;
  const samples = getRetainedVolumeSamples(profile);

  const maxTheta = Math.PI;
  const clampedTheta = Math.max(0, Math.min(maxTheta, absTheta));
  const frac = clampedTheta / maxTheta;
  const indexFloat = frac * (SAMPLE_COUNT - 1);
  const i0 = Math.floor(indexFloat);
  const i1 = Math.min(SAMPLE_COUNT - 1, i0 + 1);
  const t = indexFloat - i0;

  const res = (1 - t) * samples[i0] + t * samples[i1];
  return Math.max(0, isNaN(res) ? 0 : res);
}

/**
 * Solves the liquid surface level c for a given liquid volume and tilt angle.
 * Used for horizontal clipping plane rendering and meniscus elevation.
 */
export function solveLevel(
  profile: VesselProfile,
  thetaRad: number,
  volume_ml: number
): { c: number; liquidTopY: number; surfaceArea: number } {
  const nx = -Math.sin(thetaRad), ny = Math.cos(thetaRad);
  const full = profile.referenceSceneVolume ?? volumeBelowPlane(profile, 0, 1, profile.baseY + profile.H);
  const target = Math.max(0, Math.min(1, volume_ml / profile.capacity_ml)) * full;
  const bounds = volumeSlices(profile, 64);
  let low = Infinity, high = -Infinity;
  for (const slice of bounds) {
    low = Math.min(low, ny * slice.y - Math.abs(nx) * slice.radius);
    high = Math.max(high, ny * slice.y + Math.abs(nx) * slice.radius);
  }
  for (let i = 0; i < 24; i++) {
    const middle = (low + high) / 2;
    if (volumeBelowPlane(profile, nx, ny, middle, 64) < target) low = middle;
    else high = middle;
  }
  const c = (low + high) / 2;
  // dV/dc is the actual area cut by a plane with unit normal, even near 90 deg.
  const epsilon = Math.max(1e-6, profile.H * 1e-4);
  const area = (volumeBelowPlane(profile, nx, ny, c + epsilon) - volumeBelowPlane(profile, nx, ny, c - epsilon)) / (2 * epsilon);
  const liquidTopY = Math.abs(ny) > 1e-8 ? Math.max(profile.baseY, Math.min(profile.baseY + profile.H, c / ny))
    : profile.baseY + profile.H / 2;
  return { c, liquidTopY, surfaceArea: Math.max(1e-6, area) };
}

/**
 * Finds the optimal tilt angle (radians) required for liquid to reach the pouring lip
 * and establish controlled weir flow discharge (§3.2 Step C).
 */
export function findPouringTilt(profile: VesselProfile, currentVolume_ml: number): number {
  if (currentVolume_ml <= 0.05) return 0;
  const samples = getRetainedVolumeSamples(profile);
  const targetRetained = currentVolume_ml * 0.85; // ensure excess volume exists for weir flow
  const maxTheta = Math.PI;

  for (let i = 0; i < samples.length; i++) {
    if (samples[i] <= targetRetained) {
      const theta = (i / (samples.length - 1)) * maxTheta;
      return Math.max(0.55, Math.min(2.1, theta + 0.12));
    }
  }
  return 1.65; // ~95 degrees
}
