import { VesselProfile } from './profiles';
import { retainedVolume, solveLevel } from './retained';

export interface FlowResult {
  isPouring: boolean;
  flowRate_ml_s: number;
  excessVolume_ml: number;
  head_cm: number;
  isWallClinging: boolean;
  isGlugging: boolean;
  glugPulse: number; // 0..1 amplitude
}

const GRAVITY = 981.0; // cm / s^2
const TEAPOT_HEAD_THRESHOLD_CM = 0.12; // 1.2 mm
const MIN_FLOW_ML_S = 0.15;
const MAX_FLOW_ML_S = 60.0;

/**
 * Calculates real-time weir flow discharge based on excess volume over weir crest.
 */
export function calculateWeirFlow(
  profile: VesselProfile,
  currentVolume_ml: number,
  tiltAngleRad: number,
  simTime: number = 0,
  viscosity: number = 1.0, // 1.0 for aqueous, ~1.4 for conc H2SO4, 0.8 for ethanol
  timeCompression: number = 1.6
): FlowResult {
  if (currentVolume_ml <= 0.001 || tiltAngleRad <= 0.005) {
    return {
      isPouring: false,
      flowRate_ml_s: 0,
      excessVolume_ml: 0,
      head_cm: 0,
      isWallClinging: false,
      isGlugging: false,
      glugPulse: 0
    };
  }

  const vRetained = retainedVolume(profile, tiltAngleRad);
  const excess = Math.max(0, currentVolume_ml - vRetained);

  if (excess <= 0.01) {
    return {
      isPouring: false,
      flowRate_ml_s: 0,
      excessVolume_ml: 0,
      head_cm: 0,
      isWallClinging: false,
      isGlugging: false,
      glugPulse: 0
    };
  }

  // Surface area calculation for head determination
  const { surfaceArea } = solveLevel(profile, tiltAngleRad, currentVolume_ml);
  const safeArea = Math.max(0.5, surfaceArea * (profile.sceneScale * profile.sceneScale)); // cm^2
  const head_cm = Math.min(2.5, excess / safeArea);

  // Weir discharge: Francis formula Q = Cd * (2/3) * sqrt(2g) * b * h^(3/2)
  const Cd = 0.62 / Math.max(0.6, Math.sqrt(viscosity));
  const b_cm = profile.spoutWidth * profile.sceneScale;
  const rawQ_cm3_s = Cd * (2 / 3) * Math.sqrt(2 * GRAVITY) * b_cm * Math.pow(Math.max(0.01, head_cm), 1.5);

  let flowRate = Math.max(MIN_FLOW_ML_S, Math.min(MAX_FLOW_ML_S, rawQ_cm3_s * timeCompression));

  // 1. Teapot Effect (Wall-clinging due to surface tension at low flow / small head)
  const isWallClinging = head_cm < TEAPOT_HEAD_THRESHOLD_CM || flowRate < 1.2;

  // 2. Glug Effect for narrow-necked vessels at steep tilt
  const isNarrowNeck = profile.mouthR < 0.4;
  const isSteep = tiltAngleRad > 0.85; // > ~48 degrees
  let isGlugging = false;
  let glugPulse = 0;

  if (isNarrowNeck && isSteep && currentVolume_ml > profile.capacity_ml * 0.3) {
    isGlugging = true;
    const freqHz = 3.5;
    glugPulse = Math.pow(Math.sin(simTime * Math.PI * 2 * freqHz), 2);
    // Modulate flow: air gulping reduces discharge intermittently
    flowRate *= (0.55 + 0.45 * glugPulse);
  }

  return {
    isPouring: true,
    flowRate_ml_s: flowRate,
    excessVolume_ml: excess,
    head_cm,
    isWallClinging,
    isGlugging,
    glugPulse
  };
}
