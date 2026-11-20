import type { VesselState } from '../types/chemistry';
import { vesselInterior } from '../science/vesselDimensions';
import { vesselBodyTransform, vesselLocalToWorld } from '../science/vesselScale';
import { getVesselProfile } from '../pour/physics/profiles';
import { buretteDeliveryPath } from './buretteTarget';
import { BURETTE_NOZZLE_LOCAL_Y } from './burettePlacement';
import { fallingContactTime, STOCK_RELEASE_START_S, STOCK_RELEASE_END_S } from './doseTiming';
import { SCENE_GRAVITY } from '../science/sceneUnits';

type Point3 = [number, number, number];
const reservoirs = new Set(['beaker', 'flask', 'test_tube', 'cylinder', 'burette', 'watch_glass',
  'evaporating_dish', 'crucible', 'petri_dish', 'volumetric_flask', 'separatory_funnel',
  'filter_funnel', 'mortar_pestle', 'wash_bottle', 'pneumatic_trough']);

function mouthFrame(vessel: VesselState) {
  const top = vesselInterior(vessel.type).topY;
  const mouth = vesselLocalToWorld(vessel, [0, top, 0]);
  const above = vesselLocalToWorld(vessel, [0, top + 1, 0]);
  const height = Math.hypot(...above.map((coordinate, axis) => coordinate - mouth[axis]));
  const upY = (above[1] - mouth[1]) / height;
  return { mouth, upY };
}

/** Apparatus with a positive display capacity is not automatically a vessel.
 * A position lock does not close its mouth or change its finite inventory. */
export function stockReceiverProblem(vessel: VesselState | undefined | null, _kind: 'liquid' | 'solid' | 'gas' = 'liquid'): string | null {
  if (!vessel || !reservoirs.has(vessel.type) || vessel.id.startsWith('lesson_vessel_'))
    return 'Chọn bình chứa để cấp hóa chất; dụng cụ này không có khoang nhận mẫu.';
  if (vessel.isShattered || vessel.isSealed) return 'Mở bình nhận còn nguyên vẹn trước khi cấp hóa chất.';
  if (![vessel.capacity_ml, vessel.volume_ml, ...vessel.position, vessel.rotationY ?? 0, vessel.rotationZ ?? 0]
    .every(Number.isFinite) || !(vessel.capacity_ml > 0) || vessel.volume_ml < 0)
    return 'Vị trí hoặc thể tích bình nhận không hợp lệ.';
  const { mouth, upY } = mouthFrame(vessel);
  if (!mouth.every(Number.isFinite) || !(upY > 1e-6)) return 'Đặt miệng bình hướng lên trước khi cấp hóa chất.';
  return null;
}

export interface StockLiquidTarget {
  mouth: Point3;
  outlet: Point3;
  contact: Point3;
  contactKind: 'liquid' | 'wall' | 'floor';
  /** Conservative horizontal radius of the projected mouth opening. */
  apertureRadius: number;
}

/** Aim in world gravity through the real posed opening, including physical
 * quaternions. The shared trace stops at the first wall, floor or liquid plane. */
export function stockLiquidTarget(vessel: VesselState, clearance = 0.45): StockLiquidTarget | null {
  if (stockReceiverProblem(vessel) || !Number.isFinite(clearance) || !(clearance > 0)) return null;
  const { mouth, upY } = mouthFrame(vessel);
  const path = buretteDeliveryPath(vessel, [mouth[0], mouth[1] + clearance - BURETTE_NOZZLE_LOCAL_Y, mouth[2]]);
  if (!path) return null;
  const profile = getVesselProfile(vessel.type, vessel.capacity_ml), body = vesselBodyTransform(vessel);
  return { mouth, ...path, apertureRadius: profile.mouthR * body.scale * upY };
}

export const STOCK_BOTTLE_OUTLET_LOCAL_Y = 0.92;
// Keep the bottle's body above the rim throughout the insertion/tilt arc.
export const STOCK_BOTTLE_CLEARANCE = 1.6;

export function stockBottleTilt(elapsed: number): number {
  const u = Math.max(0, Math.min(1, (elapsed - 0.65) / 1.7 * 2.2));
  return u * u * (3 - 2 * u) * 1.18;
}

/** The held bottle pivots around its outlet. Emitted packets leave that exact
 * world point vertically instead of being steered through a tilted glass wall. */
export function stockBottleDosePose(elapsed: number, target: StockLiquidTarget, finishTime: number) {
  let angle = stockBottleTilt(elapsed);
  if (elapsed >= 2.35) {
    const u = Math.max(0, Math.min(1, (elapsed - 2.35) / Math.max(0.6, finishTime - 2.35)));
    angle *= 1 - u * u * (3 - 2 * u);
  }
  const outlet: Point3 = [...target.outlet];
  if (elapsed < 0.65) {
    const u = Math.max(0, Math.min(1, elapsed / 0.65)), remaining = 1 - u * u * (3 - 2 * u);
    outlet[0] += 2.4 * remaining; outlet[1] += 1.5 * remaining;
  } else if (elapsed > 2.35) {
    const u = Math.max(0, Math.min(1, (elapsed - 2.35) / Math.max(0.6, finishTime - 2.35)));
    outlet[0] += 2.4 * u; outlet[1] += 1.5 * u;
  }
  return { position: [outlet[0] + Math.sin(angle) * STOCK_BOTTLE_OUTLET_LOCAL_Y,
    outlet[1] - Math.cos(angle) * STOCK_BOTTLE_OUTLET_LOCAL_Y, outlet[2]] as Point3, angle };
}

export function stockTargetLiquidPacket(releaseTime: number, target: StockLiquidTarget) {
  const flightTime = Math.max(1e-6, fallingContactTime(target.outlet[1] - target.contact[1], 0.4));
  return { start: target.outlet, contact: target.contact, flightTime, impactTime: releaseTime + flightTime,
    vy: -0.4, gravity: SCENE_GRAVITY };
}

export function stockTargetArrivedFraction(elapsed: number, target: StockLiquidTarget): number {
  const first = stockTargetLiquidPacket(STOCK_RELEASE_START_S, target).impactTime;
  return Math.max(0, Math.min(1, (elapsed - first) / (STOCK_RELEASE_END_S - STOCK_RELEASE_START_S)));
}
