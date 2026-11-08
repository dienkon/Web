import { Quaternion } from 'three';
import type { StockGrainPose } from './stockTypes';
import type { Vec3, Quat } from './types';

interface Frame { pose: StockGrainPose; previous: StockGrainPose; received: number; interval: number }
const frames = new Map<string, Frame>();

/** Presentation only. The inventory, contacts and immersion queries always use
 * the authoritative fixed-step poses, never these interpolated coordinates. */
export function publishStockPresentation(poses: StockGrainPose[], interval: number, now = performance.now()) {
  const alive = new Set<string>();
  for (const pose of poses) {
    alive.add(pose.id);
    const old = frames.get(pose.id);
    frames.set(pose.id, { pose, previous: old?.pose ?? pose, received: now, interval });
  }
  for (const id of frames.keys()) if (!alive.has(id)) frames.delete(id);
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
