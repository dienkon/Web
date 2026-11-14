import { Quaternion, Vector3 } from 'three';
import type { SpillState } from '../types/chemistry';
import { stockSurfacePoints } from '../science/stockSurfaceSamples';
import { solveSessileDrop, type SessileDropShape } from '../science/sessileDrop';
import { METERS_PER_SCENE_UNIT as U } from '../science/sceneUnits';
import { supportPlaneScene } from '../core/labGeometry';

const SAMPLE_COUNT = 128;

function heightAt(drop: SessileDropShape, radius: number): number {
  if (radius >= drop.radius_m) return 0;
  const p = drop.profile;
  let low = 0, high = p.length - 1;
  while (low < high) { const mid = (low + high) >>> 1; if (p[mid].radius_m < radius) low = mid + 1; else high = mid; }
  if (low === 0) return p[0].height_m;
  const a = p[low - 1], b = p[low], t = (radius - a.radius_m) / Math.max(1e-15, b.radius_m - a.radius_m);
  return a.height_m + t * (b.height_m - a.height_m);
}

export interface StockWetContact { fraction: number; position: [number, number, number] }
/** Authoritative SI pose versus the same free surface used to draw the pool.
 * The 50 µm floor allowance covers the published rigid-contact tolerance. */
export function stockWetContact(grain: SpillState, pool: SpillState): StockWetContact | null {
  const pose = grain.stockMotion;
  if (!pose || !(pose.scale_m > 0) || !(pool.volume_ml > 0) || pool.stockMotion) return null;
  const floor = supportPlaneScene(pool.position) * U, cx = pool.position[0] * U, cz = pool.position[2] * U;
  // Cheap conservative cull before solving the drop or sampling any surfaces.
  const surface = stockSurfacePoints(pose.formula, pose.powder), reach = pose.scale_m * surface.extent;
  if (pose.position_m[1] + reach < floor - 0.00005
    || Math.hypot(pose.position_m[0] - cx, pose.position_m[2] - cz) > pool.radius * U + reach) return null;
  const drop = solveSessileDrop(pool.volume_ml);
  if (!drop || pose.position_m[1] - reach > floor + drop.height_m) return null;
  const q = new Quaternion(...pose.rotation), p = new Vector3();
  let wet = 0, x = 0, y = 0, z = 0;
  for (const point of surface.points) {
    p.set(point[0], point[1], point[2]).multiplyScalar(pose.scale_m).applyQuaternion(q);
    p.x += pose.position_m[0]; p.y += pose.position_m[1]; p.z += pose.position_m[2];
    const height = heightAt(drop, Math.hypot(p.x - cx, p.z - cz));
    if (height <= 0 || p.y < floor - 0.00005 || p.y > floor + height) continue;
    wet++; x += p.x; y += p.y; z += p.z;
  }
  return wet ? { fraction: wet / SAMPLE_COUNT, position: [x / wet / U, y / wet / U, z / wet / U] } : null;
}
