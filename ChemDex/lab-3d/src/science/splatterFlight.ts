import { SCENE_GRAVITY, descendingFlightTime } from './sceneUnits';

export interface SplatterPoint { x: number; y: number; z: number; vx: number; vy: number; vz: number }

/** Read-only ballistic glyph transport. Scene lengths/speeds; gravity is
 * converted from SI once. No material inventory or calibrated air drag. */
export function advanceSplatterFlight(point: SplatterPoint, dt: number, planeY: number) {
  const unchanged = { ...point, hit: false, elapsed_s: 0 };
  if (![point.x, point.y, point.z, point.vx, point.vy, point.vz, dt, planeY].every(Number.isFinite) || dt <= 0) return unchanged;
  const landing = point.y < planeY || (point.y === planeY && point.vy <= 0)
    ? 0 : descendingFlightTime(point.y, point.vy, planeY);
  const hit = landing !== null && landing <= dt;
  const elapsed_s = hit ? landing! : dt;
  return { x: point.x + point.vx * elapsed_s, y: hit ? planeY
    : point.y + point.vy * elapsed_s - 0.5 * SCENE_GRAVITY * elapsed_s ** 2,
    z: point.z + point.vz * elapsed_s, vx: point.vx, vy: point.vy - SCENE_GRAVITY * elapsed_s,
    vz: point.vz, hit, elapsed_s };
}

/** Illustrative dissipative bounce. Coefficients are explicit presentation
 * assumptions, not measurements of drop/surface impact or capillary breakup. */
export function advanceSplatterBounce(point: SplatterPoint, dt: number, planeY: number,
  restitution = 0.25, tangentialRetention = 0.6): SplatterPoint {
  if (![dt, planeY, restitution, tangentialRetention, point.x, point.y, point.z, point.vx, point.vy, point.vz].every(Number.isFinite)
    || dt <= 0 || restitution < 0 || restitution > 1 || tangentialRetention < 0 || tangentialRetention > 1) return { ...point };
  let state = { ...point }, remaining = dt;
  for (let i = 0; i < 24 && remaining > 1e-12; i++) {
    const next = advanceSplatterFlight(state, remaining, planeY);
    state = { x: next.x, y: next.y, z: next.z, vx: next.vx, vy: next.vy, vz: next.vz };
    remaining -= next.elapsed_s;
    if (!next.hit) return state;
    state.vy = Math.abs(state.vy) * restitution;
    state.vx *= tangentialRetention; state.vz *= tangentialRetention;
    // End unresolved microscopic chatter by dissipating energy, never by
    // lifting a resting point above the plane on every frame.
    if (state.vy < 1e-5 || next.elapsed_s < 1e-12 && state.vy === 0) return { ...state, vx: 0, vy: 0, vz: 0 };
  }
  return { ...state, y: planeY, vx: 0, vy: 0, vz: 0 };
}
