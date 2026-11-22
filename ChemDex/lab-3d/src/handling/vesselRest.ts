import { isPositionOnBalancePan, LAB_PHYSICS } from '../engine/interactionEngine';
import { vesselBodyTransform } from '../science/vesselScale';
import type { VesselState } from '../types/chemistry';

// Local lowest points of the rendered models. Tall glassware retains its
// existing support plinth; shallow vessels must not inherit a beaker's origin.
const MODEL_BOTTOM_Y: Record<string, number> = {
  watch_glass: -0.18, evaporating_dish: -0.42, petri_dish: -0.22,
  crucible: -0.65, mortar_pestle: -0.65, hot_plate: 0,
  retort_stand: -0.135, stopper: -0.11, pneumatic_trough: -0.3,
  test_tube_rack: -0.21, retort_clamp: -0.095,
  // Lowest rendered torus vertex after the two handle rotations.
  tongs: -0.9331352311658077,
};
const SCALED_MODEL_BOTTOM: Record<string, number> = {
  beaker: -1, flask: -1, test_tube: -1.04, cylinder: -1.04,
  volumetric_flask: -0.96, separatory_funnel: -1.28, filter_funnel: -1.16,
  condenser: -1.25, wash_bottle: -0.95,
};
const DEFAULT_CAPACITY: Record<string, number> = {
  beaker: 100, flask: 250, test_tube: 50, cylinder: 100, volumetric_flask: 100,
  separatory_funnel: 150, filter_funnel: 75, condenser: 120, wash_bottle: 250,
};
export function restingVesselHeight(type?: string, capacity_ml?: number): number {
  capacity_ml ??= type ? DEFAULT_CAPACITY[type] : undefined;
  if (type && capacity_ml !== undefined && SCALED_MODEL_BOTTOM[type] !== undefined) {
    const { scale, offsetY } = vesselBodyTransform({ type, capacity_ml });
    return LAB_PHYSICS.TABLE_SURFACE_Y - (SCALED_MODEL_BOTTOM[type] * scale + offsetY);
  }
  const bottom = type ? MODEL_BOTTOM_Y[type] : undefined;
  return bottom === undefined ? LAB_PHYSICS.VESSEL_REST_Y : LAB_PHYSICS.TABLE_SURFACE_Y - bottom;
}

export const { BALANCE_PAN_OFFSET_Z, BALANCE_PAN_TOP_OFFSET_Y } = LAB_PHYSICS;

type Position = readonly [number, number, number];

/** Exact world position placing a vessel's bottom flush and centered on the analytical balance pan. */
export function balancePanVesselPosition(
  balancePosition: Position,
  type?: string,
  capacity_ml?: number,
): [number, number, number] {
  const localBottomY = LAB_PHYSICS.TABLE_SURFACE_Y - restingVesselHeight(type, capacity_ml);
  return [
    balancePosition[0],
    balancePosition[1] + BALANCE_PAN_TOP_OFFSET_Y - localBottomY,
    balancePosition[2] + BALANCE_PAN_OFFSET_Z,
  ];
}

export function isVesselSupportedByBalance(vessel: VesselState, balance: Position): boolean {
  if (vessel.isShattered || !(vessel.capacity_ml > 0)) return false;
  const [x, y, z] = vessel.position;
  if (!isPositionOnBalancePan(x, z, balance)) return false;
  const expectedY = balancePanVesselPosition(balance, vessel.type, vessel.capacity_ml)[1];
  if (!(Math.abs(y - expectedY) <= 0.025)) return false;
  const motion = vessel.physicalMotion;
  if (!motion) return Math.cos(vessel.rotationZ ?? 0) >= Math.cos(0.03);
  const [qx, , qz] = motion.rotation;
  const upY = 1 - 2 * (qx ** 2 + qz ** 2);
  return upY >= Math.cos(0.03) && Math.hypot(...motion.velocity_m_s) <= 0.02
    && Math.hypot(...motion.angularVelocity_rad_s) <= 0.15;
}

/** The balance weighs one supported vessel once its motion has settled. */
export function findBalanceOccupant(
  vessels: Record<string, VesselState>, balance: Position, draggingVesselId?: string | null,
): VesselState | null {
  let occupant: VesselState | null = null;
  for (const vessel of Object.values(vessels)) {
    if (vessel.id === draggingVesselId || !isVesselSupportedByBalance(vessel, balance)) continue;
    if (occupant) return null;
    occupant = vessel;
  }
  return occupant;
}
