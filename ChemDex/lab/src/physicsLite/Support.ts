/**
 * CHEMDEX LAB - Physics Lite: Support & Tipping Stability (K5.2 & K5.4)
 * Calculates Center of Mass (COM) including liquid volume, support polygon,
 * and tipping angle thresholds for glassware.
 */

import { getVesselProfile } from '../pour/physics/profiles';

export interface StabilityResult {
  isStable: boolean;
  com: [number, number, number];
  baseRadius: number;
  tippingAngleRad: number; // Maximum tilt angle before tipping over
  tendencyToRoll: boolean; // True for round bottom / spherical vessels
}

/**
 * Calculates vessel stability based on physical geometry, mass distribution,
 * liquid fill level, and support contact polygon.
 */
export function calculateVesselStability(
  type: string,
  liquidVolume_ml: number = 0,
  liquidDensity_g_ml: number = 1.0,
  hasCorkRingOrRack: boolean = false
): StabilityResult {
  const profile = getVesselProfile(type);
  const emptyGlassMass_g = profile.capacity_ml * 0.45; // ~110g for 250ml beaker
  const liquidMass_g = liquidVolume_ml * liquidDensity_g_ml;
  const totalMass_g = emptyGlassMass_g + liquidMass_g;

  // Empty glass COM height above base
  const glassComY = profile.baseY + profile.H * 0.42;

  // Liquid COM height above base
  const fillFraction = Math.max(0, Math.min(1.0, liquidVolume_ml / profile.capacity_ml));
  const liquidHeight = profile.H * fillFraction;
  const liquidComY = profile.baseY + liquidHeight * 0.5;

  // Combined COM Y
  const combinedComY = (emptyGlassMass_g * glassComY + liquidMass_g * liquidComY) / Math.max(1, totalMass_g);
  const comHeightAboveFloor = Math.max(0.1, combinedComY - profile.baseY);

  // Base support radius
  let baseRadius = type === 'cylinder' ? profile.r(profile.baseY) * 0.72 : profile.r(profile.baseY);
  let tendencyToRoll = false;

  if (type === 'test_tube') {
    // Hemispherical bottom cannot stand alone on flat bench
    baseRadius = hasCorkRingOrRack ? 0.35 : 0.02;
    tendencyToRoll = !hasCorkRingOrRack;
  } else if (type === 'flask' && type.includes('round_bottom')) {
    baseRadius = hasCorkRingOrRack ? 0.8 : 0.05;
    tendencyToRoll = !hasCorkRingOrRack;
  }

  // Tipping angle θ_crit = arctan(baseRadius / comHeight)
  const tippingAngleRad = Math.atan2(baseRadius, comHeightAboveFloor);

  return {
    isStable: !tendencyToRoll,
    com: [0, combinedComY, 0],
    baseRadius,
    tippingAngleRad,
    tendencyToRoll
  };
}

/**
 * Checks whether an applied tilt or disturbance exceeds tipping stability.
 */
export function willVesselTip(
  type: string,
  tiltRad: number,
  liquidVolume_ml: number = 0,
  hasCorkRingOrRack: boolean = false
): boolean {
  const stability = calculateVesselStability(type, liquidVolume_ml, 1.0, hasCorkRingOrRack);
  if (stability.tendencyToRoll) return true;
  return Math.abs(tiltRad) > stability.tippingAngleRad;
}
