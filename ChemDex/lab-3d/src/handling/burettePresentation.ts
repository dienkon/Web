import { Quaternion, Vector3 } from 'three';
import type { VesselState } from '../types/chemistry';
import { vesselLiquidSurfaceY } from '../science/vesselGeometry';
import { vesselLocalToWorld } from '../science/vesselScale';
import { dropFlightPosition, dropRadius, verticalDropFlight, type DropPoint, type VerticalDropFlight } from './dropFlight';
import { BURETTE_NOZZLE_LOCAL_Y } from './buretteTarget';

export const BURETTE_TIP_LOCAL_Y = BURETTE_NOZZLE_LOCAL_Y;
export const MAX_BURETTE_PRESENTATIONS = 128;
export const BURETTE_DROP_MAX_ML = 0.05;
export const BURETTE_DRAIN_S = 0.12;

export interface BurettePresentationInput {
  target: VesselState;
  epoch: number;
  standPosition: DropPoint;
  volume_ml: number;
  color: string | null;
  /** Age within the rendering frame for metered events emitted in a batch. */
  initialAge_s?: number;
}
export interface BurettePresentation {
  id: number; targetId: string; targetType: string; targetCapacity_ml: number;
  targetSignature: string; targetPose: { position: DropPoint; rotation: [number, number, number, number] };
  epoch: number; standPosition: DropPoint; outlet: DropPoint; surface: DropPoint;
  volume_ml: number; color: string; radius: number; flight: VerticalDropFlight;
  duration_s: number; elapsed_s: number;
}

export function buretteTargetSignature(v: VesselState): string {
  return JSON.stringify([v.type, v.capacity_ml, ...v.position, v.rotationY ?? 0, v.rotationZ ?? 0, v.physicalMotion?.rotation ?? null]);
}

export function buretteTargetUnchanged(receipt: BurettePresentation, vessel: VesselState | undefined): boolean {
  if (!vessel || vessel.id !== receipt.targetId || vessel.isShattered || vessel.isSealed
    || vessel.type !== receipt.targetType || vessel.capacity_ml !== receipt.targetCapacity_ml) return false;
  const q = targetOrientation(vessel);
  const saved = new Quaternion(...receipt.targetPose.rotation);
  const angle = 2 * Math.acos(Math.min(1, Math.abs(q.dot(saved))));
  return vessel.position.every((p, i) => Math.abs(p - receipt.targetPose.position[i]) <= 1e-5) && angle <= 1e-5;
}

function targetOrientation(v: VesselState): Quaternion {
  return v.physicalMotion ? new Quaternion(...v.physicalMotion.rotation).normalize()
    : new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), v.rotationY ?? 0)
      .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), v.rotationZ ?? 0));
}

export function makeBurettePresentation(input: BurettePresentationInput, id: number): BurettePresentation | null {
  const { target, epoch, standPosition, volume_ml, color, initialAge_s = 0 } = input;
  if (!target || target.isShattered || target.isSealed || !target.id || !color || !Number.isFinite(epoch)
    || !Number.isFinite(volume_ml) || volume_ml <= 0 || volume_ml > BURETTE_DROP_MAX_ML
    || !Number.isFinite(initialAge_s) || initialAge_s < 0
    || ![...target.position, target.capacity_ml, ...standPosition].every(Number.isFinite)) return null;
  const orientation = targetOrientation(target);
  const center = vesselLocalToWorld(target, [0, vesselLiquidSurfaceY(target), 0]);
  const outlet: DropPoint = [standPosition[0], standPosition[1] + BURETTE_TIP_LOCAL_Y, standPosition[2]];
  const normal = new Vector3(0, 1, 0).applyQuaternion(orientation);
  const surfaceY = normal.y > 1e-4 ? center[1] - (normal.x * (outlet[0] - center[0])
    + normal.z * (outlet[2] - center[2])) / normal.y : center[1];
  const surface: DropPoint = [outlet[0], Math.min(outlet[1], surfaceY), outlet[2]];
  const flight = verticalDropFlight(outlet, surface[1]);
  return { id, targetId: target.id, targetType: target.type, targetCapacity_ml: target.capacity_ml,
    targetSignature: buretteTargetSignature(target), targetPose: { position: [...target.position], rotation: orientation.toArray() as [number,number,number,number] },
    epoch, standPosition: [...standPosition], outlet, surface, volume_ml, color, radius: dropRadius(volume_ml), flight,
    duration_s: flight.flightTime + BURETTE_DRAIN_S, elapsed_s: initialAge_s };
}

export function advanceBurettePresentations(queue: readonly BurettePresentation[], dt: number, epoch: number,
  isTargetValid: (receipt: BurettePresentation) => boolean = () => true): BurettePresentation[] {
  const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
  return queue.filter(receipt => receipt.epoch === epoch && isTargetValid(receipt))
    .map(receipt => step > 0 ? { ...receipt, elapsed_s: receipt.elapsed_s + step } : receipt)
    .filter(receipt => receipt.elapsed_s < receipt.duration_s - 1e-12);
}

export function burettePresentationView(receipt: BurettePresentation) {
  return { position: dropFlightPosition(receipt.flight, receipt.elapsed_s), visible: receipt.elapsed_s < receipt.flight.flightTime,
    impactProgress: receipt.elapsed_s < receipt.flight.flightTime ? 0 : Math.min(1, (receipt.elapsed_s - receipt.flight.flightTime) / BURETTE_DRAIN_S),
    radius: receipt.radius, impact: receipt.surface };
}
