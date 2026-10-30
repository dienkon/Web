import { SCENE_GRAVITY, descendingFlightTime } from './sceneUnits';

/** Detached drop released from rest, in the shared scene scale. Air drag,
 * aerodynamic breakup and rebound are outside this ballistic closure. */
export function overflowDropFlight(fromY: number, tableY: number, age_s: number) {
  if (![fromY, tableY, age_s].every(Number.isFinite) || fromY <= tableY || age_s < 0) return null;
  const flightTime_s = descendingFlightTime(fromY, 0, tableY)!;
  const t = Math.min(age_s, flightTime_s);
  return { flightTime_s, y: Math.max(tableY, fromY - 0.5 * SCENE_GRAVITY * t * t),
    vy: -SCENE_GRAVITY * t, arrived: age_s >= flightTime_s };
}
