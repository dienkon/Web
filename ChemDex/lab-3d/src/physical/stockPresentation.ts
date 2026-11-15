import { Matrix4, Quaternion, Vector3 } from 'three';
import type { StockContainerPose, StockGrainPose } from './stockTypes';
import type { Vec3, Quat } from './types';
import type { VesselState } from '../types/chemistry';
import { stockFrameLocalMatrix, stockLocalMatrix } from './stockCoordinates';

interface Frame {
  pose: StockGrainPose; previous: StockGrainPose; received: number; interval: number;
  containers?: ReadonlyMap<string, StockContainerPose>;
  previousContainers?: ReadonlyMap<string, StockContainerPose>;
  displayCarry?: boolean;
}
const frames = new Map<string, Frame>();
// Rapier publishes float32 poses while the rendered glass uses scene doubles.
// This model-local tolerance is below a micrometre at laboratory vessel scale.
const RELEASE_FRAME_TOLERANCE = 2e-5;

/** Presentation only. The inventory, contacts and immersion queries always use
 * the authoritative fixed-step poses, never these interpolated coordinates. */
export function publishStockPresentation(poses: StockGrainPose[], interval: number, now = performance.now(), containers?: readonly StockContainerPose[]) {
  const alive = new Set<string>();
  const containerFrames = containers ? new Map(containers.map(frame => [frame.id, frame])) : undefined;
  for (const pose of poses) {
    alive.add(pose.id);
    const old = frames.get(pose.id);
    // A rejected worker reply or a chemistry-only mass change retains these
    // canonical coordinate arrays. Do not pair that older grain with the
    // new reply's container frame or restart its display interpolation.
    if (containerFrames && old?.containers && old.pose.position_m === pose.position_m && old.pose.rotation === pose.rotation) {
      frames.set(pose.id, { ...old, pose });
      continue;
    }
    frames.set(pose.id, { pose, previous: old?.pose ?? pose, received: now, interval,
      containers: containerFrames, previousContainers: old?.containers ?? containerFrames, displayCarry: old?.displayCarry });
  }
  for (const id of frames.keys()) if (!alive.has(id)) frames.delete(id);
}

type DisplayVessel = Pick<VesselState, 'id' | 'position' | 'rotationY' | 'rotationZ' | 'physicalMotion' | 'type' | 'capacity_ml'>;

/** Move-tool relocation carries the displayed sample in container coordinates.
 * Old worker replies cannot leave it behind the instantly moved glass. The
 * previous carry frame also covers drop/release until its last reply arrives;
 * ordinary pouring and freely simulated motion retain world interpolation. */
export function presentedStockLocalMatrix(vessel: DisplayVessel, pose: StockGrainPose, bodyMatrix?: Matrix4,
  activelyCarried = false, now = performance.now()): Matrix4 {
  const frame = frames.get(pose.id);
  const matches = frame && (frame.pose === pose || frame.pose.position_m === pose.position_m && frame.pose.rotation === pose.rotation);
  // Undo/restore replaces the canonical coordinate arrays. A pending visual
  // gesture from the replaced branch must not attach the restored specimen.
  if (frame && !matches) frame.displayCarry = false;
  const container = matches ? frame.containers?.get(vessel.id) : undefined;
  const previousContainer = matches ? frame.previousContainers?.get(vessel.id) : undefined;
  const alpha = frame && frame.interval > 0 ? Math.min(1, Math.max(0, (now - frame.received) / (frame.interval * 1000))) : 1;
  if (matches && activelyCarried) frame.displayCarry = true;
  const ordinary = () => stockLocalMatrix(vessel, presentedStockPose(pose, now), bodyMatrix);
  if (!container || !(activelyCarried || frame?.displayCarry || container.carryStock || previousContainer?.carryStock && alpha < 1))
    return ordinary();
  const current = stockFrameLocalMatrix(vessel, pose, container);
  // A complete quick drag can precede the first carrying reply. Keep its local
  // display until a released snapshot actually agrees with the placed glass,
  // instead of snapping back to the pre-drag world coordinates on pointer-up.
  if (frame?.displayCarry && !activelyCarried && !container.carryStock && alpha >= 1) {
    const released = ordinary();
    if (current.elements.every((value, index) => Math.abs(value - released.elements[index]) < RELEASE_FRAME_TOLERANCE)) {
      frame.displayCarry = false;
      return released;
    }
  }
  if (!frame || !previousContainer || alpha >= 1) return current;
  const previous = stockFrameLocalMatrix(vessel, { ...frame.previous, scale_m: pose.scale_m }, previousContainer);
  const position = new Vector3(), rotation = new Quaternion(), scale = new Vector3();
  const nextPosition = new Vector3(), nextRotation = new Quaternion(), nextScale = new Vector3();
  previous.decompose(position, rotation, scale); current.decompose(nextPosition, nextRotation, nextScale);
  return new Matrix4().compose(position.lerp(nextPosition, alpha), rotation.slerp(nextRotation, alpha), nextScale);
}

export function presentedStockPose(pose: StockGrainPose, now = performance.now()): StockGrainPose {
  const frame = frames.get(pose.id);
  // Undo/restore can replace the canonical object before a Worker reply arrives.
  if (!frame || (frame.pose !== pose && (frame.pose.position_m !== pose.position_m || frame.pose.rotation !== pose.rotation)) || !(frame.interval > 0)) return pose;
  const alpha = Math.min(1, Math.max(0, (now - frame.received) / (frame.interval * 1000)));
  if (alpha >= 1) return pose;
  const previous = frame.previous;
  const rotation = new Quaternion(...previous.rotation).slerp(new Quaternion(...pose.rotation), alpha).toArray() as Quat;
  return { ...pose, position_m: pose.position_m.map((x, i) => previous.position_m[i] + (x - previous.position_m[i]) * alpha) as Vec3, rotation };
}

export function clearStockPresentation() { frames.clear(); }
