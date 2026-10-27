/** Nominal educational drop volume; actual laboratory droppers need calibration. */
export const NOMINAL_DROP_ML = 0.05;
import { descendingFlightTime } from '../science/sceneUnits';
export { SCENE_GRAVITY } from '../science/sceneUnits';

export function fallingContactTime(height: number, initialDownSpeed = 0): number {
  if (!Number.isFinite(height) || !Number.isFinite(initialDownSpeed)) return 0;
  const speed = Math.max(0, initialDownSpeed);
  return descendingFlightTime(Math.max(0, height), -speed, 0) ?? 0;
}
export function continuousDoseFraction(elapsed: number, releaseStart: number, releaseEnd: number, flightTime: number): number {
  if (![elapsed, releaseStart, releaseEnd, flightTime].every(Number.isFinite) || releaseEnd <= releaseStart) return 0;
  return Math.max(0, Math.min(1, (elapsed - releaseStart - Math.max(0, flightTime)) / (releaseEnd - releaseStart)));
}
export function dropSchedule(amount_ml: number, fallHeight: number) {
  const count = Math.max(1, Math.ceil(Math.max(0, amount_ml) / NOMINAL_DROP_ML - 1e-9));
  const flightTime = fallingContactTime(fallHeight);
  const period = Math.max(0.6, flightTime + 0.2);
  const releaseStart = 0.75;
  const lastImpact = releaseStart + (count - 1) * period + flightTime;
  return { count, flightTime, period, releaseStart, lastImpact };
}
export function landedDropFraction(elapsed: number, amount_ml: number, fallHeight: number): number {
  if (!(amount_ml > 0)) return 0;
  const schedule = dropSchedule(amount_ml, fallHeight);
  const firstImpact = schedule.releaseStart + schedule.flightTime;
  const landed = Math.max(0, Math.min(schedule.count, Math.floor((elapsed - firstImpact + 1e-9) / schedule.period) + 1));
  return Math.min(1, landed * NOMINAL_DROP_ML / amount_ml);
}

export const STOCK_RELEASE_START_S = 0.854;
export const STOCK_RELEASE_END_S = 2.214;

/** Pose matches the stock-bottle animation. Horizontal exit velocity is the
 * explicit guided-dispensing aid; acceleration after exit is gravity only. */
export function stockLiquidPacket(releaseTime: number, mouthY: number, surfaceY: number) {
  const u = Math.max(0, Math.min(1, (releaseTime - 0.65) / 1.7 * 2.2));
  const angle = u * u * (3 - 2 * u) * 1.18;
  const x = 0.82 - Math.sin(angle) * 0.98;
  const y = mouthY + 0.62 + Math.cos(angle) * 0.98;
  const flightTime = Math.max(1e-6, fallingContactTime(y - surfaceY, 0.4));
  return { x, y, vx: -x / flightTime, vy: -0.4, flightTime, impactTime: releaseTime + flightTime };
}

/** Integrate a uniform dose over release time. Changing lip elevation changes
 * flight time; a fixed delay would separate the visual contact from chemistry. */
export function stockArrivedFraction(elapsed: number, mouthY: number, surfaceY: number): number {
  if (elapsed <= stockLiquidPacket(STOCK_RELEASE_START_S, mouthY, surfaceY).impactTime) return 0;
  if (elapsed >= stockLiquidPacket(STOCK_RELEASE_END_S, mouthY, surfaceY).impactTime) return 1;
  let lower = STOCK_RELEASE_START_S, upper = STOCK_RELEASE_END_S;
  for (let i = 0; i < 30; i++) {
    const middle = (lower + upper) / 2;
    if (stockLiquidPacket(middle, mouthY, surfaceY).impactTime <= elapsed) lower = middle;
    else upper = middle;
  }
  return ((lower + upper) / 2 - STOCK_RELEASE_START_S) / (STOCK_RELEASE_END_S - STOCK_RELEASE_START_S);
}
