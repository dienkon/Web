import type { VesselProfile } from '../../pour/physics/profiles';

export interface ParticleBounds {
  radius: number;
  liquidBottomY: number;
  surfaceY: number;
  vesselProfile?: VesselProfile;
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
