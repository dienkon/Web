import type { BufferAttribute, InterleavedBufferAttribute, Matrix4 } from 'three';
import { vesselInterior, contourRadius } from './vesselDimensions';

/** Ground rotated vertices; contain their radial envelope at every contour
 * knot. Visual collision only, not a rigid-body or packing simulation. */
export function placeSolidChunk(p: { x: number; y: number; z: number; scale: number },
  vertices: BufferAttribute | InterleavedBufferAttribute, rotation: Matrix4, type: string, floorOverride?: number) {
  const interior = vesselInterior(type), m = rotation.elements;
  const minimumFloor = Math.max(interior.floorY, floorOverride ?? interior.floorY);
  let floor = minimumFloor;
  let low = Infinity, high = -Infinity, radial = 0;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    const ry = m[1] * x + m[5] * y + m[9] * z;
    low = Math.min(low, ry); high = Math.max(high, ry);
    radial = Math.max(radial, Math.hypot(m[0] * x + m[4] * y + m[8] * z,
      m[2] * x + m[6] * y + m[10] * z));
  }
  if (!Number.isFinite(low) || !(p.scale > 0) || !(interior.topY > floor)) { p.scale = 0; return; }
  p.scale = Math.min(p.scale, (interior.topY - floor) / Math.max(1e-12, high - low));
  for (let attempt = 0; attempt < 20; attempt++) {
    floor = minimumFloor;
    const extent = radial * p.scale;
    // Rounded bottoms cannot support a finite radial envelope at their zero-radius pole.
    if (contourRadius(interior.points, floor) <= extent + 1e-6) {
      for (let i = 1; i < interior.points.length; i++) {
        const [r0, y0] = interior.points[i - 1], [r1, y1] = interior.points[i];
        if (y1 > floor && r1 > extent + 2e-6 && r1 > r0) {
          floor = Math.max(floor, y0 + (extent + 2e-6 - r0) / (r1 - r0) * (y1 - y0));
          break;
        }
      }
    }
    const top = floor + (high - low) * p.scale;
    let available = Math.min(contourRadius(interior.points, floor), contourRadius(interior.points, top));
    for (const [r, y] of interior.points) if (y > floor && y < top) available = Math.min(available, r);
    if (top <= interior.topY && available > extent + 1e-6) {
      const distance = Math.hypot(p.x, p.z), limit = available - extent - 1e-6;
      if (distance > limit) { p.x *= limit / distance; p.z *= limit / distance; }
      p.y = floor - low * p.scale;
      return;
    }
    p.scale *= 0.5;
  }
  p.scale = 0;
}
