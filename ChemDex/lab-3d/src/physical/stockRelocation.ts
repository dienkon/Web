import type { VesselState } from '../types/chemistry';
import { METERS_PER_SCENE_UNIT } from '../science/sceneUnits';
import { isContactSuspensionRow } from './stockLiquidContact';
import { Quaternion, Vector3 } from 'three';

const positionChanged = (before: VesselState, after: VesselState) =>
  after.position.some((coordinate, axis) => coordinate !== before.position[axis]);
const orientation = (vessel: VesselState) => vessel.physicalMotion
  ? new Quaternion(...vessel.physicalMotion.rotation).normalize()
  : new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), vessel.rotationY ?? 0)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), vessel.rotationZ ?? 0));

/** Linked apparatus moves atomically. A locked child cannot silently follow an
 * unlocked rack/tongs, or detach from an assembly whose root was moved. */
export function relocationMovesLockedVessel(before: Record<string, VesselState>, after: Record<string, VesselState>): boolean {
  return Object.entries(after).some(([id, vessel]) => before[id]?.isLocked && positionChanged(before[id], vessel));
}

/** A receiving vessel must stay under an already released stock dose until
 * its contact transactions finish. Chemistry-only updates remain allowed. */
export function relocationMovesVessel(before: Record<string, VesselState>, after: Record<string, VesselState>, id: string): boolean {
  const previous = before[id], next = after[id];
  if (!previous || !next) return false;
  return positionChanged(previous, next) || (previous.rotationY ?? 0) !== (next.rotationY ?? 0)
    || (previous.rotationZ ?? 0) !== (next.rotationZ ?? 0)
    || (previous.physicalMotion?.rotation ?? [0, 0, 0, 1])
      .some((coordinate, axis) => coordinate !== (next.physicalMotion?.rotation ?? [0, 0, 0, 1])[axis]);
}

/** Button placement changes the glass immediately. Move the same finite
 * macrostock poses with it, without inventing a flight or changing inventory.
 * Active pointer carries stay with the existing recorded worker boundary path.
 * Replacing canonical coordinates also rejects a pre-placement worker reply. */
export function relocateVesselStocks(before: Record<string, VesselState>, after: Record<string, VesselState>,
  carried: ReadonlySet<string> = new Set()): Record<string, VesselState> {
  let result = after;
  for (const [id, vessel] of Object.entries(after)) {
    const previous = before[id];
    if (!previous || carried.has(id) || vessel.stockMotion !== previous.stockMotion
      || ![...previous.position, ...vessel.position].every(Number.isFinite)) continue;
    const rotation = orientation(vessel).multiply(orientation(previous).invert());
    if (!positionChanged(previous, vessel) && Math.abs(rotation.w) >= 1 - 1e-12) continue;
    const motion = previous.stockMotion;
    const hasStock = motion || previous.contents?.some(row => row.phase === 's' && row.mass_g > 1e-10
      && row.location !== 'filter' && row.location !== 'foam' && !isContactSuspensionRow(previous, row));
    if (!hasStock) continue;
    const from = new Vector3(...previous.position).multiplyScalar(METERS_PER_SCENE_UNIT);
    const to = new Vector3(...vessel.position).multiplyScalar(METERS_PER_SCENE_UNIT);
    const stockMotion = { tick: motion?.tick ?? 0, grains: motion?.grains.map(pose => ({ ...pose,
      position_m: new Vector3(...pose.position_m).sub(from).applyQuaternion(rotation).add(to).toArray() as [number, number, number],
      rotation: rotation.clone().multiply(new Quaternion(...pose.rotation)).toArray() as [number, number, number, number],
      velocity_m_s: new Vector3(...pose.velocity_m_s).applyQuaternion(rotation).toArray() as [number, number, number],
      angularVelocity_rad_s: new Vector3(...pose.angularVelocity_rad_s).applyQuaternion(rotation).toArray() as [number, number, number] })) ?? [] };
    if (result === after) result = { ...after };
    result[id] = { ...vessel, stockMotion };
  }
  return result;
}
