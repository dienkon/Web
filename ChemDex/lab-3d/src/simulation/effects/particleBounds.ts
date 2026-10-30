import type { VesselProfile } from '../../pour/physics/profiles';
import { pointPlaneDepth, projectToLiquidPlane, type LiquidPlane } from './liquidParticleFrame';

export interface ParticleBounds {
  radius: number;
  liquidBottomY: number;
  surfaceY: number;
  vesselProfile?: VesselProfile;
  /** Unit world-up vector and volume-preserving surface, in model coordinates. */
  surfacePlane?: LiquidPlane;
}

/** Conservative bounding sphere, including contour corners between its poles.
 * This is collision containment for visual glyphs, not a contact-force solver.
 */
export function containParticle(
  p: { x: number; y: number; z: number; radius: number },
  bounds: ParticleBounds,
  glyphRadiusFactor = 1,
  atSurface = false,
): boolean {
  if (bounds.surfacePlane) return containTiltedParticle(p, bounds, glyphRadiusFactor, atSurface);
  const height = bounds.surfaceY - bounds.liquidBottomY;
  if (!(height > 1e-8) || !(p.radius > 0)) return false;
  let extent = Math.min(p.radius * glyphRadiusFactor, height / 2);
  for (let attempt = 0; attempt < 16; attempt++) {
    const y = atSurface ? bounds.surfaceY
      : Math.max(bounds.liquidBottomY + extent, Math.min(bounds.surfaceY - extent, p.y));
    const lower = y - extent;
    const upper = Math.min(bounds.vesselProfile ? bounds.vesselProfile.baseY + bounds.vesselProfile.H : Infinity, y + extent);
    const profile = bounds.vesselProfile;
    let available = profile ? Math.min(profile.r(lower), profile.r(upper)) : bounds.radius;
    for (const [r, knotY] of profile?.contour ?? []) {
      if (knotY > lower && knotY < upper) available = Math.min(available, r);
    }
    if (available >= extent + 1e-6) {
      const radial = Math.hypot(p.x, p.z);
      const limit = available - extent - 1e-6;
      if (radial > limit) {
        p.x *= limit / radial;
        p.z *= limit / radial;
      }
      p.y = y;
      p.radius = extent / glyphRadiusFactor;
      return true;
    }
    extent *= 0.5;
  }
  return false;
}

function containTiltedParticle(p: { x: number; y: number; z: number; radius: number }, bounds: ParticleBounds,
  factor: number, atSurface: boolean) {
  const profile = bounds.vesselProfile;
  const bottom = bounds.liquidBottomY, top = profile ? profile.baseY + profile.H : bounds.surfaceY;
  const plane = bounds.surfacePlane!;
  if (![p.x, p.y, p.z, p.radius, bottom, top, ...plane.normal, plane.offset].every(Number.isFinite)
    || !(p.radius > 0) || !(top > bottom) || Math.abs(Math.hypot(...plane.normal) - 1) > 1e-8) return false;
  let extent = Math.min(p.radius * factor, (top - bottom) / 2);
  for (let attempt = 0; attempt < 16; attempt++, extent *= 0.5) {
    for (let iteration = 0; iteration < 24; iteration++) {
      p.y = Math.max(bottom + extent, Math.min(top - extent, p.y));
      const lower = p.y - extent, upper = p.y + extent;
      let available = profile ? Math.min(profile.r(lower), profile.r(upper)) : bounds.radius;
      for (const [r, y] of profile?.contour ?? []) if (y > lower && y < upper) available = Math.min(available, r);
      if (!(available > extent)) break;
      const radial = Math.hypot(p.x, p.z), limit = available - extent - 1e-6;
      if (radial > limit) { p.x *= Math.max(0, limit) / radial; p.z *= Math.max(0, limit) / radial; }
      const depth = pointPlaneDepth(p, bounds.surfaceY, plane), target = atSurface ? 0 : extent;
      if ((atSurface ? Math.abs(depth) : target - depth) <= 1e-9) {
        p.radius = extent / factor; return true;
      }
      projectToLiquidPlane(p, bounds.surfaceY, plane, target);
    }
  }
  return false;
}
