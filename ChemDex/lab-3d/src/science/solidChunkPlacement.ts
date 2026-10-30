import type { BufferAttribute, InterleavedBufferAttribute, Matrix4 } from 'three';
import { vesselInterior, contourRadius } from './vesselDimensions';
import { solidColumnIntervals } from './solidColumnIntervals';

/** Ground a rotated chunk without changing its material volume. Returns false
 * if its cylinder envelope cannot fit. Callers must handle that result rather
 * than silently shrinking the body. This is not a rigid-body simulation. */
export function placeSolidChunk(p: { x: number; y: number; z: number; scale: number },
  vertices: BufferAttribute | InterleavedBufferAttribute, rotation: Matrix4, type: string, floorOverride?: number) {
  const interior = vesselInterior(type), m = rotation.elements;
  const minimumFloor = Math.max(interior.floorY, floorOverride ?? interior.floorY);
  let low = Infinity, high = -Infinity, radial = 0;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    const ry = m[1] * x + m[5] * y + m[9] * z;
    low = Math.min(low, ry); high = Math.max(high, ry);
    radial = Math.max(radial, Math.hypot(m[0] * x + m[4] * y + m[8] * z,
      m[2] * x + m[6] * y + m[10] * z));
  }
  if (!Number.isFinite(low) || !(p.scale > 0) || !(interior.topY > minimumFloor)) return false;
  const extent = radial * p.scale, height = (high - low) * p.scale, epsilon = interior.height * 1e-7;
  for (const [a, b] of solidColumnIntervals(type, extent + epsilon, minimumFloor)) {
    if (b - a < height) continue;
    const top = a + height;
    let available = Math.min(contourRadius(interior.points, a), contourRadius(interior.points, top));
    for (const [r, y] of interior.points) if (y > a && y < top) available = Math.min(available, r);
    const distance = Math.hypot(p.x, p.z), limit = Math.max(0, available - extent - epsilon);
    if (distance > limit) { p.x *= limit / distance; p.z *= limit / distance; }
    p.y = a - low * p.scale;
    return true;
  }
  return false;
}
