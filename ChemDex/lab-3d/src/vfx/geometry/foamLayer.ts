import type { VesselState } from '../../types/chemistry';
import { liquidSurfaceVolume } from '../../engine/waterPhase';
import { liquidLevelForVolume, vesselInterior, contourRadius } from '../../science/vesselDimensions';
import { getVesselProfile } from '../../pour/physics/profiles';
import { liquidParticlePlane, type Point3 } from '../../simulation/effects/liquidParticleFrame';

/** Model-local foam envelope from gas displacement, never a second source of
 * liquid or an overflow animation. The inventory has already vented excess gas. */
export function foamLayer(vessel: VesselState, localUp: Point3 = [0, 1, 0]) {
  const capacity = vessel.capacity_ml, gas = vessel.foam_ml ?? 0;
  if (vessel.isShattered || !(vessel.volume_ml > 0) || !(capacity > 0) || !(gas > 0.05)
    || ![capacity, gas, vessel.volume_ml].every(Number.isFinite)) return null;
  const baseVolume = liquidSurfaceVolume(vessel), topVolume = Math.min(capacity, baseVolume + gas);
  const bottom = liquidLevelForVolume(vessel.type, baseVolume, capacity);
  const top = liquidLevelForVolume(vessel.type, topVolume, capacity);
  if (!(top > bottom)) return null;
  const profile = getVesselProfile(vessel.type, capacity);
  const lowerPlane = liquidParticlePlane(profile, baseVolume, localUp);
  const upperPlane = lowerPlane ? liquidParticlePlane(profile, topVolume, localUp) : undefined;
  return { type: vessel.type, capacity, baseVolume, gasVolume: topVolume - baseVolume, bottom, top, lowerPlane, upperPlane };
}

export function foamGlyph(layer: NonNullable<ReturnType<typeof foamLayer>>, index: number, count: number, time: number,
  target = { x: 0, y: 0, z: 0, radius: 0 }) {
  if (layer.lowerPlane && layer.upperPlane) {
    const interior = vesselInterior(layer.type), n = layer.lowerPlane.normal;
    const lower = layer.lowerPlane.offset, upper = layer.upperPlane.offset;
    // Sample planes perpendicular to gravity, then reject points outside the
    // glass contour. Foam stays horizontal in the room when the body tilts.
    const fraction = (index + 0.5) / count, middle = lower + (upper - lower) * fraction;
    const offset = middle + Math.sin(time * 1.5 + index) * (upper - lower) * Math.min(fraction, 1 - fraction) * 0.15;
    if (Math.abs(n[1]) > 0.08) for (let attempt = 0; attempt < 64; attempt++) {
      const serial = index + attempt * count, angle = serial * 2.39996322973;
      const r = interior.maximumRadius * Math.sqrt(((serial + 0.5) * 0.61803398875) % 1);
      const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      const y = (offset - n[0] * x - n[2] * z) / n[1];
      if (y <= interior.floorY || y >= interior.topY) continue;
      const wall = contourRadius(interior.points, y) - r;
      if (!(wall > 0)) continue;
      target.x = x; target.y = y; target.z = z;
      target.radius = Math.max(0, Math.min(0.035 + index % 4 * 0.012, wall * 0.5,
        offset - lower, upper - offset, y - interior.floorY, interior.topY - y)) * 0.9;
      return target;
    }
    target.radius = 0;
    return target;
  }
  const fraction = (index + 0.5) / count;
  const middle = liquidLevelForVolume(layer.type, layer.baseVolume + layer.gasVolume * fraction, layer.capacity);
  const amplitude = Math.min(0.008, (middle - layer.bottom) * 0.3, (layer.top - middle) * 0.3);
  const y = middle + Math.sin(time * (1.5 + index % 3 * 0.5) + index * 0.7) * amplitude;
  const wallRadius = contourRadius(vesselInterior(layer.type).points, y);
  const radialFraction = Math.sqrt(((index + 0.5) * 0.61803398875) % 1) * 0.92;
  const distance = wallRadius * radialFraction, angle = index * 2.39996322973;
  target.x = Math.cos(angle) * distance; target.z = Math.sin(angle) * distance; target.y = y;
  target.radius = Math.max(0, Math.min(0.035 + index % 4 * 0.012, wallRadius - distance,
    y - layer.bottom, layer.top - y)) * (0.94 + 0.04 * Math.sin(time * 3 + index));
  return target;
}
