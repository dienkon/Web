import type { ParticleBounds } from '../effects/particleBounds';
import { pointPlaneDepth } from '../effects/liquidParticleFrame';
import type { PhysicalPrecipitateParticle, PrecipitateProfile } from '../core/SimulationTypes';

/** A representative floc is a visual glyph, not one physical primary particle.
 * Enlarge only its display radius, at the same center and within glass/liquid.
 * Transport radius, mass, Brownian motion, settling and bulk opacity stay owned
 * by the quantitative population model. Fine powder remains a fine haze. */
export function readablePrecipitateRadius(p: Pick<PhysicalPrecipitateParticle, 'x' | 'y' | 'z' | 'radius'>,
  profile: Pick<PrecipitateProfile, 'morphology'>, bounds?: ParticleBounds, enlarge = true) {
  if (!bounds) return p.radius;
  const target = enlarge && ['gel_like', 'flocculent'].includes(profile.morphology)
    ? Math.max(p.radius, Math.min(0.025, bounds.radius * 0.025)) : p.radius;
  const vessel = bounds.vesselProfile, top = vessel ? vessel.baseY + vessel.H : bounds.surfaceY;
  let radius = Math.max(0, Math.min(target, p.y - bounds.liquidBottomY, top - p.y,
    pointPlaneDepth(p, bounds.surfaceY, bounds.surfacePlane)));
  const radial = Math.hypot(p.x, p.z);
  for (let attempt = 0; attempt < 12; attempt++) {
    const low = p.y - radius, high = p.y + radius;
    let available = vessel ? Math.min(vessel.r(low), vessel.r(high)) : bounds.radius;
    for (const [r, y] of vessel?.contour ?? []) if (y > low && y < high) available = Math.min(available, r);
    if (radial + radius <= available) return radius;
    radius *= 0.5;
  }
  return 0;
}
