/** One global display scale for flight through the lab. Glassware capacities
 * are separately calibrated to their modeled interiors, not certified SI sizes. */
export const METERS_PER_SCENE_UNIT = 0.035;
export const CENTIMETERS_PER_SCENE_UNIT = METERS_PER_SCENE_UNIT * 100;
export const GRAVITY_M_S2 = 9.8;
export const SCENE_GRAVITY = GRAVITY_M_S2 / METERS_PER_SCENE_UNIT;

/** Descending intersection with a horizontal plane; null if it is unreachable. */
export function descendingFlightTime(startY: number, initialVy: number, targetY: number): number | null {
  if (![startY, initialVy, targetY].every(Number.isFinite)) return null;
  const distance = startY - targetY;
  const discriminant = initialVy * initialVy + 2 * SCENE_GRAVITY * distance;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const time = distance > 0 && initialVy < 0 ? 2 * distance / (root - initialVy)
    : (initialVy + root) / SCENE_GRAVITY;
  return Number.isFinite(time) && time >= 0 ? time : null;
}

/** Q = A v; mL is cm^3 and all returned lengths are in scene units. */
export function streamRadiusForFlow(flow_ml_s: number, speed_scene_s: number): number {
  if (!(flow_ml_s > 0) || !(speed_scene_s > 0) || !Number.isFinite(flow_ml_s) || !Number.isFinite(speed_scene_s)) return 0;
  return Math.sqrt(flow_ml_s / (CENTIMETERS_PER_SCENE_UNIT ** 3 * speed_scene_s * Math.PI));
}
export function liquidDropRadius(volume_ml: number): number {
  return Number.isFinite(volume_ml) && volume_ml > 0
    ? Math.cbrt(3 * volume_ml / (4 * Math.PI)) / CENTIMETERS_PER_SCENE_UNIT : 0;
}
