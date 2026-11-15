import { Euler, Quaternion, Vector3 } from 'three';
import type { VesselState } from '../types/chemistry';
import { getVesselProfile } from '../pour/physics/profiles';
import { vesselLiquidSurfaceY } from '../science/vesselGeometry';
import { vesselLocalToWorld } from '../science/vesselScale';
import { HANDHELD_PIPETTE_TIP_LOCAL_Y, dropFlightPosition, dropRadius, verticalDropFlight,
  type DropPoint, type VerticalDropFlight } from './dropFlight';

export const MAX_PIPETTE_PRESENTATIONS = 32;
export const PIPETTE_DISCRETE_LIMIT_ML = 0.2;
export const PIPETTE_DROP_ML = 0.05;
export const PIPETTE_FLOW_ML_S = 4;
export const PIPETTE_TARGET_POSITION_TOLERANCE = 1e-5;
export const PIPETTE_TARGET_ROTATION_TOLERANCE_RAD = 1e-5;

export interface PipetteInventoryView { volume_ml: number; color: string | null }
export interface PipettePresentationInput {
  target: VesselState;
  epoch: number;
  direction: 'aspirate' | 'dispense';
  volume_ml: number;
  before: PipetteInventoryView;
  after: PipetteInventoryView;
}
export interface PipettePresentation {
  id: number;
  targetId: string;
  targetSignature: string;
  targetType: string;
  targetCapacity_ml: number;
  targetPose: { position: DropPoint; rotation: [number, number, number, number] };
  epoch: number;
  direction: 'aspirate' | 'dispense';
  volume_ml: number;
  color: string;
  before: PipetteInventoryView;
  after: PipetteInventoryView;
  toolPosition: DropPoint;
  outlet: DropPoint;
  surface: DropPoint;
  toolRotation: [number, number, number, number];
  position_s: number;
  transfer_s: number;
  drain_s: number;
  duration_s: number;
  elapsed_s: number;
  drops: { volume_ml: number; release_s: number; flight: VerticalDropFlight }[];
}

/** Fill changes do not move an already-issued transfer; moving/removing the
 * actual receiver cancels its view instead of pouring onto an empty old spot. */
export function pipetteTargetSignature(vessel: VesselState): string {
  return JSON.stringify([vessel.type, vessel.capacity_ml, ...vessel.position, vessel.rotationY ?? 0,
    vessel.rotationZ ?? 0, vessel.physicalMotion?.rotation ?? null]);
}

export function pipetteTargetUnchanged(receipt: PipettePresentation, vessel: VesselState | undefined): boolean {
  if (!vessel || vessel.isShattered || vessel.isSealed || receipt.targetId !== vessel.id
    || vessel.type !== receipt.targetType || vessel.capacity_ml !== receipt.targetCapacity_ml) return false;
  const rotation = vessel.physicalMotion ? new Quaternion(...vessel.physicalMotion.rotation)
    : new Quaternion().setFromEuler(new Euler(0, vessel.rotationY ?? 0, vessel.rotationZ ?? 0));
  const saved = new Quaternion(...receipt.targetPose.rotation);
  const angle = 2 * Math.acos(Math.min(1, Math.abs(rotation.dot(saved))));
  return vessel.position.every((value, i) => Math.abs(value - receipt.targetPose.position[i]) <= PIPETTE_TARGET_POSITION_TOLERANCE)
    && angle <= PIPETTE_TARGET_ROTATION_TOLERANCE_RAD;
}

/** Build an immutable optical receipt from the accepted transfer, never from
 * whichever vessel/sample happens to be selected during a later render. */
export function makePipettePresentation(input: PipettePresentationInput, id: number): PipettePresentation | null {
  const { target, direction, volume_ml, epoch, before, after } = input;
  const color = direction === 'dispense' ? before.color : after.color;
  if (!target || target.isShattered || target.isSealed || !target.id || !color
    || ![volume_ml, epoch, before.volume_ml, after.volume_ml, ...target.position, target.capacity_ml].every(Number.isFinite)
    || volume_ml <= 0 || volume_ml > 10 || before.volume_ml < 0 || after.volume_ml < 0
    || before.volume_ml > 10 + 1e-9 || after.volume_ml > 10 + 1e-9
    || Math.abs((direction === 'dispense' ? before.volume_ml - after.volume_ml : after.volume_ml - before.volume_ml) - volume_ml) > 1e-8) return null;
  const profile = getVesselProfile(target.type, target.capacity_ml);
  const surfaceCenter: DropPoint = vesselLocalToWorld(target, [0, vesselLiquidSurfaceY(target), 0]);
  // Pipettes enter the center of the neck; the profile's radial lip coordinate
  // describes a pouring spout and would put a receiver stream over the rim.
  const lip: DropPoint = vesselLocalToWorld(target, [0, profile.lipLocal[1], 0]);
  const orientation = vesselOrientation(target);
  const normal = new Vector3(0, 1, 0).applyQuaternion(orientation).normalize();
  const outletPoint = new Vector3(...(direction === 'aspirate' ? surfaceCenter : lip)).addScaledVector(normal, direction === 'aspirate' ? -0.035 : 0.12);
  const outlet = outletPoint.toArray() as DropPoint;
  const gravityPlaneY = normal.y > 1e-4 ? surfaceCenter[1] - (normal.x * (outlet[0] - surfaceCenter[0])
    + normal.z * (outlet[2] - surfaceCenter[2])) / normal.y : surfaceCenter[1];
  const impact: DropPoint = [outlet[0], Math.min(outlet[1], gravityPlaneY), outlet[2]];
  const surface: DropPoint = direction === 'aspirate' ? surfaceCenter : impact;
  const drops: PipettePresentation['drops'] = [];
  if (direction === 'dispense' && volume_ml <= PIPETTE_DISCRETE_LIMIT_ML + 1e-12) {
    const count = Math.ceil(volume_ml / PIPETTE_DROP_ML - 1e-12);
    for (let i = 0; i < count; i++) drops.push({ volume_ml: Math.min(PIPETTE_DROP_ML, volume_ml - i * PIPETTE_DROP_ML),
      release_s: i * 0.2, flight: verticalDropFlight(outlet, impact[1]) });
  }
  const transfer_s = drops.length ? drops.at(-1)!.release_s + drops.at(-1)!.flight.flightTime
    : volume_ml / PIPETTE_FLOW_ML_S;
  const position_s = 0.25, drain_s = 0.1;
  const targetRotation = orientation;
  return { id, targetId: target.id, targetSignature: pipetteTargetSignature(target), targetType: target.type,
    targetCapacity_ml: target.capacity_ml,
    targetPose: { position: [...target.position], rotation: targetRotation.toArray() as [number, number, number, number] },
    epoch, direction, volume_ml, color, toolRotation: targetRotation.toArray() as [number, number, number, number],
    before: { ...before, color: before.volume_ml > 1e-12 ? before.color : null },
    after: { ...after, color: after.volume_ml > 1e-12 ? after.color : null },
    toolPosition: new Vector3(...outlet).sub(new Vector3(0, HANDHELD_PIPETTE_TIP_LOCAL_Y, 0).applyQuaternion(targetRotation)).toArray() as DropPoint,
    outlet, surface, position_s, transfer_s, drain_s, duration_s: position_s + transfer_s + drain_s, elapsed_s: 0, drops };
}

function vesselOrientation(vessel: VesselState): Quaternion {
  if (vessel.physicalMotion) return new Quaternion(...vessel.physicalMotion.rotation).normalize();
  return new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), vessel.rotationY ?? 0)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), vessel.rotationZ ?? 0));
}

/** Carry excess simulated time to the next queued receipt; pause supplies zero.
 * This view queue cannot change or refund any material ledger. */
export function advancePipettePresentations(queue: readonly PipettePresentation[], dt: number, epoch: number,
  isTargetValid: (receipt: PipettePresentation) => boolean = () => true): PipettePresentation[] {
  const valid = queue.filter(receipt => receipt.epoch === epoch && isTargetValid(receipt));
  let remaining = Number.isFinite(dt) && dt > 0 ? dt : 0;
  while (valid.length && remaining > 0) {
    const active = valid[0], available = Math.max(0, active.duration_s - active.elapsed_s);
    if (remaining + 1e-12 >= available) { remaining = Math.max(0, remaining - available); valid.shift(); }
    else { valid[0] = { ...active, elapsed_s: active.elapsed_s + remaining }; remaining = 0; }
  }
  return valid;
}

export function pipettePresentationView(receipt: PipettePresentation) {
  const t = receipt.elapsed_s - receipt.position_s;
  const phase = t < 0 ? 'positioning' : t < receipt.transfer_s ? 'transferring' : 'draining';
  const discrete = receipt.drops.length > 0;
  const released = discrete ? receipt.drops.reduce((sum, drop) => sum + (t >= drop.release_s ? drop.volume_ml : 0), 0)
    : receipt.volume_ml * Math.min(1, Math.max(0, t / receipt.transfer_s));
  const progress = Math.min(1, Math.max(0, released / receipt.volume_ml));
  const inventory_ml = receipt.before.volume_ml + (receipt.after.volume_ml - receipt.before.volume_ml) * progress;
  return { phase, progress, inventory: { volume_ml: Math.max(0, inventory_ml), color: inventory_ml > 1e-12 ? receipt.color : null },
    stream: receipt.direction === 'dispense' && !discrete && phase === 'transferring',
    flowRate_ml_s: discrete ? 0 : receipt.volume_ml / receipt.transfer_s,
    drops: receipt.drops.map(drop => ({ volume_ml: drop.volume_ml, radius: dropRadius(drop.volume_ml),
      visible: t >= drop.release_s && t < drop.release_s + drop.flight.flightTime,
      position: dropFlightPosition(drop.flight, t - drop.release_s) })) };
}
