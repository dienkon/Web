/**
 * CHEMDEX LAB - Physics Limits & Handling Constraints
 * Unified single source of truth for object physical manipulation bounds.
 */

export const TILT_MIN = 0;
export const TILT_MAX = Math.PI; // 180 degrees = fully inverted

export const LIFT_MIN = -0.135; // Resting on table
export const LIFT_MAX = 4.5;    // Maximum lifting height

export interface HandleLimits {
  tilt: [number, number];       // [min, max] radians
  lift: [number, number];       // [min, max] scene units
  yaw?: [number, number];        // [min, max] radians
  allowInversion?: boolean;     // whether vessel can drain inverted
  fixedInClamp?: boolean;       // whether tilt is forbidden
  reason?: string;
}

export const VESSEL_LIMITS: Record<string, HandleLimits> = {
  burette: {
    tilt: [0, 0],
    lift: [0.2, 2.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: false,
    fixedInClamp: true,
    reason: 'Burette is vertically clamped to retort stand'
  },
  wash_bottle: {
    tilt: [0, (150 * Math.PI) / 180],
    lift: [-0.135, 3.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: false
  },
  test_tube: {
    tilt: [0, Math.PI],
    lift: [-0.135, 3.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: true
  },
  beaker: {
    tilt: [0, Math.PI],
    lift: [-0.135, 3.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: true
  },
  flask: {
    tilt: [0, Math.PI],
    lift: [-0.135, 3.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: true
  },
  cylinder: {
    tilt: [0, Math.PI],
    lift: [-0.135, 3.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: true
  },
  volumetric_flask: {
    tilt: [0, Math.PI],
    lift: [-0.135, 3.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: true
  },
  separatory_funnel: {
    tilt: [0, Math.PI],
    lift: [-0.135, 3.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: true
  },
  crucible: {
    tilt: [0, Math.PI],
    lift: [-0.135, 3.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: true
  },
  evaporating_dish: {
    tilt: [0, Math.PI],
    lift: [-0.135, 3.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: true
  },
  watch_glass: {
    tilt: [0, Math.PI],
    lift: [-0.135, 3.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: true
  },
  petri_dish: {
    tilt: [0, Math.PI],
    lift: [-0.135, 3.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: true
  },
  mortar_pestle: {
    tilt: [0, Math.PI * 0.85],
    lift: [-0.135, 2.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: false
  },
  filter_funnel: {
    tilt: [0, Math.PI],
    lift: [-0.135, 3.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: true
  },
  condenser: {
    tilt: [0, Math.PI * 0.5],
    lift: [0, 3.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: false
  },
  test_tube_rack: {
    tilt: [0, 0.25],
    lift: [-0.135, 2.0],
    yaw: [-Math.PI, Math.PI],
    allowInversion: false
  },
  tongs: {
    tilt: [-Math.PI * 0.5, Math.PI * 0.5],
    lift: [-0.135, 4.0],
    yaw: [-Math.PI, Math.PI],
    allowInversion: true
  },
  retort_stand: {
    tilt: [0, 0],
    lift: [-0.135, 2.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: false,
    fixedInClamp: true
  },
  retort_clamp: {
    tilt: [-Math.PI * 0.5, Math.PI * 0.5],
    lift: [-0.135, 3.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: false
  },
  stopper: {
    tilt: [0, Math.PI],
    lift: [-0.135, 3.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: true
  },
  pneumatic_trough: {
    tilt: [0, 0],
    lift: [-0.135, 2.0],
    yaw: [-Math.PI, Math.PI],
    allowInversion: false,
    fixedInClamp: true
  },
  hot_plate: {
    tilt: [0, 0],
    lift: [-0.135, 1.5],
    yaw: [-Math.PI, Math.PI],
    allowInversion: false,
    fixedInClamp: true
  }
};

const DEFAULT_LIMITS: HandleLimits = {
  tilt: [TILT_MIN, TILT_MAX],
  lift: [LIFT_MIN, LIFT_MAX],
  yaw: [-Math.PI, Math.PI],
  allowInversion: true
};

export function getHandleLimits(vesselType?: string): HandleLimits {
  if (!vesselType) return DEFAULT_LIMITS;
  return VESSEL_LIMITS[vesselType] || DEFAULT_LIMITS;
}

export function clampTilt(vesselType: string | undefined, tiltRad: number): number {
  const limits = getHandleLimits(vesselType);
  return Math.max(limits.tilt[0], Math.min(limits.tilt[1], tiltRad));
}

export function clampLift(vesselType: string | undefined, liftY: number): number {
  const limits = getHandleLimits(vesselType);
  return Math.max(limits.lift[0], Math.min(limits.lift[1], liftY));
}
