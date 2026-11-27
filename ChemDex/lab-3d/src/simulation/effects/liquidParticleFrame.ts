import type { VesselProfile } from '../../pour/physics/profiles';
import { solveLevel } from '../../pour/physics/retained';
import { vortexHeight, vortexSlope, type VortexSurface } from '../../science/liquidVortex';

export type Point3 = readonly [number, number, number];
export interface LiquidPlane { normal: Point3; offset: number; vortex?: VortexSurface }

/** The axisymmetric contour allows the existing 2D volume integral to solve
 * any horizontal world plane, even when its local normal has a z component. */
export function liquidParticlePlane(profile: VesselProfile, volume_ml: number, localUp: Point3): LiquidPlane | undefined {
  const length = Math.hypot(...localUp);
  if (!(length > 0) || !Number.isFinite(length)) return undefined;
  const normal = localUp.map(x => x / length) as [number, number, number];
  const tilt = Math.atan2(Math.hypot(normal[0], normal[2]), normal[1]);
  if (tilt < 1e-8) return undefined; // Preserve the exact upright path.
  return { normal, offset: solveLevel(profile, tilt, volume_ml).c };
}

export function pointPlaneDepth(point: { x: number; y: number; z: number }, surfaceY: number, plane?: LiquidPlane) {
  if (plane?.vortex) return vortexHeight(point.x, point.z, plane.vortex) - point.y;
  return plane ? plane.offset - (plane.normal[0] * point.x + plane.normal[1] * point.y + plane.normal[2] * point.z) : surfaceY - point.y;
}

/** Vertical clearance for a finite sphere under the curved surface. Bound
 * the slope only over the sphere's footprint, including the steepest radius. */
export function liquidSurfaceClearance(point: { x: number; z: number }, extent: number, plane?: LiquidPlane) {
  const vortex = plane?.vortex;
  if (!vortex) return extent;
  const r = Math.hypot(point.x, point.z);
  const peak = vortex.coreRadius / Math.sqrt(3);
  const steepest = Math.max(r - extent, Math.min(peak, r + extent));
  return extent * Math.hypot(1, vortexSlope(steepest, vortex));
}

export function liquidSurfaceNormal(point: { x: number; z: number }, plane?: LiquidPlane): Point3 {
  const vortex = plane?.vortex;
  if (!vortex) return plane?.normal ?? [0, 1, 0];
  const r = Math.hypot(point.x, point.z);
  if (r === 0) return [0, 1, 0];
  const slope = vortexSlope(r, vortex);
  const up = 1 / Math.hypot(1, slope), horizontal = -slope * up / r;
  return [point.x * horizontal, up, point.z * horizontal];
}

export function projectToLiquidPlane<T extends { x: number; y: number; z: number }>(point: T, surfaceY: number,
  plane?: LiquidPlane, depth = 0): T {
  if (plane?.vortex) { point.y = vortexHeight(point.x, point.z, plane.vortex) - depth; return point; }
  if (!plane) { point.y = surfaceY - depth; return point; }
  const delta = pointPlaneDepth(point, surfaceY, plane) - depth;
  point.x += delta * plane.normal[0]; point.y += delta * plane.normal[1]; point.z += delta * plane.normal[2];
  return point;
}
