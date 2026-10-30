import { VesselProfile } from './profiles';
import { retainedVolume, solveLevel } from './retained';
import { rectangularWeirDischarge, circularOrificeDischarge } from '../../science/discharge';

export interface FlowResult {
  isPouring: boolean;
  flowRate_ml_s: number;
  excessVolume_ml: number;
  head_cm: number;
  isWallClinging: boolean;
  isGlugging: boolean;
  glugPulse: number; // 0..1 amplitude
}

const TEAPOT_HEAD_THRESHOLD_CM = 0.12; // 1.2 mm

/** Separate occupied geometric volume from liquid which may leave the vessel.
 * Supplied by the inventory-aware boundary; no solid volume becomes a dose. */
export interface DischargeOccupancy {
  surfaceVolume_ml: number;
  retainedLiquidVolume_ml: number;
}

/**
 * Calculates real-time weir flow discharge based on excess volume over weir crest.
 */
export function calculateWeirFlow(
  profile: VesselProfile,
  currentVolume_ml: number,
  tiltAngleRad: number,
  _simTime: number = 0,
  viscosity: number = 1.0, // 1.0 for aqueous, ~1.4 for conc H2SO4, 0.8 for ethanol
  _timeCompression: number = 1.0,
  occupancy?: DischargeOccupancy
): FlowResult {
  if (![currentVolume_ml, tiltAngleRad, viscosity, profile.sceneScale, profile.spoutWidth, profile.mouthR].every(Number.isFinite)
    || currentVolume_ml <= 0 || tiltAngleRad < 0 || tiltAngleRad > Math.PI || viscosity <= 0 || profile.sceneScale <= 0
    || (occupancy && (![occupancy.surfaceVolume_ml, occupancy.retainedLiquidVolume_ml].every(Number.isFinite)
      || occupancy.surfaceVolume_ml < currentVolume_ml || occupancy.retainedLiquidVolume_ml < 0))) {
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

  const vRetained = occupancy?.retainedLiquidVolume_ml ?? retainedVolume(profile, tiltAngleRad);
  const excess = Math.max(0, currentVolume_ml - vRetained);

  if (excess <= 1e-12) {
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

  // Solve the actual horizontal free surface. Excess / local area is only
  // a linear approximation and fails near a curved shoulder or inversion.
  const { c } = solveLevel(profile, tiltAngleRad, occupancy?.surfaceVolume_ml ?? currentVolume_ml);
  const nx = -Math.sin(tiltAngleRad), ny = Math.cos(tiltAngleRad);
  const lipHeight = nx * profile.lipLocal[0] + ny * profile.lipLocal[1];
  const head_cm = Math.max(0, (c - lipHeight) * profile.sceneScale);

  // Retain the legacy viscosity correction as an explicit uncalibrated
  // coefficient. This is not a low-Re viscous/capillary flow solver.
  const Cd = Math.min(1, 0.62 / Math.max(0.6, Math.sqrt(viscosity)));
  const scale_m = profile.sceneScale / 100;
  const weirRate = rectangularWeirDischarge(profile.spoutWidth * scale_m, head_cm / 100, Cd);
  const mouthHead_m = Math.max(0, (c - ny * profile.lipLocal[1]) * scale_m);
  const orificeRate = circularOrificeDischarge(profile.mouthR * scale_m, mouthHead_m, Cd);
  // Smooth interpolation between two limiting closures, not a solved
  // free-surface topology transition. No V*2.8+8 drain-rate shortcut.
  const invertedWeight = Math.max(0, -ny) ** 2;
  const flowRate = ((1 - invertedWeight) * weirRate + invertedWeight * orificeRate) * 1e6;

  // 1. Teapot Effect (Wall-clinging due to surface tension at low flow / small head)
  const isWallClinging = head_cm < TEAPOT_HEAD_THRESHOLD_CM || flowRate < 1.2;

  // 2. Glug Effect for narrow-necked vessels at steep tilt
  const isNarrowNeck = profile.mouthR < 0.4;
  const isSteep = tiltAngleRad > 0.85; // > ~48 degrees
  let isGlugging = false;
  const glugPulse = 0;

  if (isNarrowNeck && isSteep && currentVolume_ml > profile.capacity_ml * 0.3) {
    isGlugging = true;
    // Potential air-entry restriction only. A fixed 3.5-Hz sine is not an
    // air/liquid pressure model and must not fabricate discharge pulses.
  }

  return {
    isPouring: flowRate > 0,
    flowRate_ml_s: flowRate,
    excessVolume_ml: excess,
    head_cm,
    isWallClinging,
    isGlugging,
    glugPulse
  };
}
