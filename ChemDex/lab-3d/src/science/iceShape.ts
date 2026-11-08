import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { compileSolid, clippedSolidVolume } from './clippedSolidVolume';
import { solidBlockDimensions } from './vesselDimensions';
import { ICE_DENSITY_G_ML } from '../engine/waterProperties';

type Reservoir = { type: string; capacity_ml: number };
let cached: ReturnType<typeof createIceShape> | undefined;

function createIceShape() {
  // Fixed representative shape, not a measured melt-front law. Scaling it
  // follows the actual ice inventory and preserves its enclosed volume.
  const geometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.14);
  geometry.computeBoundingBox();
  const mesh = compileSolid(geometry), positions = geometry.getAttribute('position');
  const levels = [...new Set(Array.from({ length: positions.count }, (_, i) =>
    Math.round(positions.getY(i) * 1e7) / 1e7))].sort((a, b) => a - b);
  const clip = (y: number) => clippedSolidVolume(mesh, [{ normal: [0, 1, 0], offset: y }], [0, y, 0]) / mesh.volume;
  // Between vertex heights, a polyhedron's cross-section is quadratic and its
  // cumulative volume is cubic. Precompute the four interpolation ordinates;
  // runtime level solves need no triangle traversal or per-frame allocation.
  const intervals = levels.slice(1).map((top, i) => {
    const bottom = levels[i];
    return { bottom, top, values: [0, 1 / 3, 2 / 3, 1].map(t => clip(bottom + t * (top - bottom))) };
  });
  const fractionBelow = (y: number): number => {
    if (y <= levels[0]) return 0;
    if (y >= levels.at(-1)!) return 1;
    const section = intervals.find(s => y <= s.top)!;
    const t = (y - section.bottom) / (section.top - section.bottom), [a, b, c, d] = section.values;
    return Math.max(0, Math.min(1,
      a * -4.5 * (t - 1 / 3) * (t - 2 / 3) * (t - 1)
      + b * 13.5 * t * (t - 2 / 3) * (t - 1)
      - c * 13.5 * t * (t - 1 / 3) * (t - 1)
      + d * 4.5 * t * (t - 1 / 3) * (t - 2 / 3)));
  };
  let low = -0.5, high = 0.5;
  for (let i = 0; i < 48; i++) {
    const middle = (low + high) / 2;
    if (fractionBelow(middle) < ICE_DENSITY_G_ML) low = middle; else high = middle;
  }
  return { geometry, unitVolume: mesh.volume, fractionBelow, floatingPlane: (low + high) / 2 };
}

/** Shared cached geometry for renderer and upright ice/water displacement. */
export function iceShape() { return cached ??= createIceShape(); }

export function iceBlockDimensions(vessel: Reservoir, volume_ml: number) {
  return solidBlockDimensions(vessel, volume_ml / iceShape().unitVolume);
}

export function iceGroundedDisplacementMl(vessel: Reservoir, volume_ml: number, surfaceY: number) {
  const chunk = iceBlockDimensions(vessel, volume_ml);
  if (!(chunk.height > 0)) return 0;
  return volume_ml * iceShape().fractionBelow((surfaceY - chunk.floorY) / chunk.height - 0.5);
}

export function iceCenterY(vessel: Reservoir, volume_ml: number, surfaceY: number) {
  const chunk = iceBlockDimensions(vessel, volume_ml);
  return Math.max(chunk.floorY + chunk.height / 2, surfaceY - iceShape().floatingPlane * chunk.height);
}
