import type { VesselProfile } from '../../pour/physics/profiles';
import { solveLevel } from '../../pour/physics/retained';

export type Point3 = readonly [number, number, number];
export interface LiquidPlane { normal: Point3; offset: number }

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
  return plane ? plane.offset - (plane.normal[0] * point.x + plane.normal[1] * point.y + plane.normal[2] * point.z) : surfaceY - point.y;
}

export function projectToLiquidPlane<T extends { x: number; y: number; z: number }>(point: T, surfaceY: number,
  plane?: LiquidPlane, depth = 0): T {
  if (!plane) { point.y = surfaceY - depth; return point; }
  const delta = pointPlaneDepth(point, surfaceY, plane) - depth;
  point.x += delta * plane.normal[0]; point.y += delta * plane.normal[1]; point.z += delta * plane.normal[2];
  return point;
}
