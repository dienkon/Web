import type { VesselProfile } from '../../pour/physics/profiles';
import { pointPlaneDepth, projectToLiquidPlane, type LiquidPlane } from './liquidParticleFrame';
import type { Point3 } from './liquidParticleFrame';

export interface ParticleBounds {
  radius: number;
  liquidBottomY: number;
  surfaceY: number;
  vesselProfile?: VesselProfile;
  /** Unit world-up vector and volume-preserving surface, in model coordinates. */
  surfacePlane?: LiquidPlane;
}

export const PARTICLE_WALL_CLEARANCE = 1e-6;

/** Lowest permitted grain-center height under gravity. Use the same finite
 * grain envelope as containment, so a microscopic grain can touch a sloping
 * floor/wall corner without first penetrating the glass by its own radius. */
export function particleSupportOffset(bounds: ParticleBounds, normal: Point3, extent: number): number {
  const profile = bounds.vesselProfile, contour = profile?.contour;
  const bottom = bounds.liquidBottomY + extent;
  const top = (profile ? profile.baseY + profile.H : bounds.surfaceY) - extent;
  const horizontal = Math.hypot(normal[0], normal[2]);
  let minimum = Infinity;
  const sample = (height: number) => {
    const y = Math.max(bottom, Math.min(top, height));
    let available = profile ? Math.min(profile.r(y - extent), profile.r(y + extent)) : bounds.radius;
    for (const [r, knot] of contour ?? []) if (knot > y - extent && knot < y + extent) available = Math.min(available, r);
    const radial = available - extent - PARTICLE_WALL_CLEARANCE;
    if (radial >= 0) minimum = Math.min(minimum, normal[1] * y - horizontal * radial);
  };
  sample(bottom); sample(top);
  for (const [, y] of contour ?? []) { sample(y - extent); sample(y); sample(y + extent); }
  return minimum;
}

/** Resolve a physical grain's penetration along the sloping glass normal.
 * A radial-only clamp discards the tangential part of gravity: grains in a
 * horizontal flask then stick halfway up its conical wall forever. This is a
 * frictionless contact projection, not a resolved wall hydrodynamics model. */
export function slideParticleAlongWall(p: { x: number; y: number; z: number; radius: number }, bounds: ParticleBounds): void {
  const contour = bounds.vesselProfile?.contour;
  if (!contour) return;
  for (let iteration = 0; iteration < 4; iteration++) {
    const radial = Math.hypot(p.x, p.z);
    if (!(radial > 0)) return;
    let resolved = false;
    for (let i = 1; i < contour.length; i++) {
      const [r0, y0] = contour[i - 1], [r1, y1] = contour[i];
      if (!(y1 > y0) || p.y < y0 || p.y > y1) continue;
      const slope = (r1 - r0) / (y1 - y0);
      const available = r0 + slope * (p.y - y0);
      const penetration = radial + p.radius * (1 + Math.abs(slope)) + PARTICLE_WALL_CLEARANCE - available;
      if (!(penetration > 0)) return;
      const correction = penetration / (1 + slope * slope);
      const scale = Math.max(0, radial - correction) / radial;
      p.x *= scale; p.z *= scale;
      p.y += correction * slope;
      resolved = true;
      break;
    }
    if (!resolved) return;
  }
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
      const limit = available - extent - PARTICLE_WALL_CLEARANCE;
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
      const radial = Math.hypot(p.x, p.z), limit = available - extent - PARTICLE_WALL_CLEARANCE;
      if (radial > limit) { p.x *= Math.max(0, limit) / radial; p.z *= Math.max(0, limit) / radial; }
      const slope = plane.vortex ? 0.65 * plane.vortex.amplitude / plane.vortex.coreRadius : 0;
      const depth = pointPlaneDepth(p, bounds.surfaceY, plane), target = atSurface ? 0 : extent * Math.sqrt(1 + slope * slope);
      if ((atSurface ? Math.abs(depth) : target - depth) <= 1e-9) {
        p.radius = extent / factor; return true;
      }
      projectToLiquidPlane(p, bounds.surfaceY, plane, target);
    }
  }
  return false;
}
