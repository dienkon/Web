import { VesselProfile, getVesselProfile } from './profiles';

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
export function volumeBelowPlane(
  profile: VesselProfile,
  nx: number,
  ny: number,
  c: number,
  slices: number = 64
): number {
  const y0 = profile.baseY;
  const y1 = profile.baseY + profile.H;
  const dy = (y1 - y0) / slices;

  let totalArea = 0;
  const lenN = Math.hypot(nx, ny);
  const normNx = lenN > 1e-6 ? nx / lenN : 0;
  const normNy = lenN > 1e-6 ? ny / lenN : 1;
  const normC = lenN > 1e-6 ? c / lenN : c;

  for (let i = 0; i <= slices; i++) {
    const y = y0 + i * dy;
    const R = profile.r(y);

    let area = 0;
    if (Math.abs(normNx) < 1e-6) {
      // Pure horizontal plane
      area = (normNy * y <= normC) ? Math.PI * R * R : 0;
    } else {
      // normNx * x + normNy * y <= normC
      const s = (normC - normNy * y) / normNx;
      if (normNx > 0) {
        area = segArea(R, s);
      } else {
        area = Math.max(0, Math.PI * R * R - segArea(R, s));
      }
    }

    // Simpson's rule weight
    const weight = (i === 0 || i === slices) ? 1 : (i % 2 === 1 ? 4 : 2);
    totalArea += area * weight;
  }

  const volumeSceneUnits = (totalArea * dy) / 3;
  return Math.max(0, volumeSceneUnits);
}

/**
 * Precomputed 64-sample retained volume cache per vessel profile.
 */
const RETAINED_CACHE: Record<string, number[]> = {};
const SAMPLE_COUNT = 64;

export function getRetainedVolumeSamples(profile: VesselProfile): number[] {
  if (RETAINED_CACHE[profile.type]) {
    return RETAINED_CACHE[profile.type];
  }

  const samples: number[] = new Array(SAMPLE_COUNT);
  const maxTheta = Math.PI; // Full range 0 to 180 degrees (inversion)

  // Base upright volume at theta = 0
  const rawUpright = volumeBelowPlane(profile, 0, 1, profile.lipLocal[1], 48);
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

  RETAINED_CACHE[profile.type] = samples;
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
  if (volume_ml <= 0.001) {
    return { c: profile.baseY - 0.5, liquidTopY: profile.baseY, surfaceArea: 0.1 };
  }

  const nx = -Math.sin(thetaRad);
  const ny = Math.cos(thetaRad);

  const fullVol = profile.capacity_ml;
  const targetRatio = Math.max(0.01, Math.min(1.0, volume_ml / fullVol));

  const rawUpright = volumeBelowPlane(profile, 0, 1, profile.lipLocal[1], 24);
  const scaleToMl = rawUpright > 0 ? profile.capacity_ml / rawUpright : 1.0;

  // Binary search for plane offset c
  let cMin = -3.5;
  let cMax = 3.5;
  let bestC = (cMin + cMax) / 2;

  for (let iter = 0; iter < 14; iter++) {
    const mid = (cMin + cMax) / 2;
    const vol = volumeBelowPlane(profile, nx, ny, mid, 24) * scaleToMl;
    if (vol < volume_ml) {
      cMin = mid;
    } else {
      cMax = mid;
    }
    bestC = mid;
  }

  const lipY = profile.lipLocal[1];
  const liquidTopY = profile.baseY + targetRatio * (lipY - profile.baseY);
  const radiusAtLevel = Math.max(0.1, profile.r(liquidTopY));
  const surfaceArea = Math.max(0.1, Math.PI * radiusAtLevel * radiusAtLevel);

  return { c: isNaN(bestC) ? 0 : bestC, liquidTopY, surfaceArea };
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
