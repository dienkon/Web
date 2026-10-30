import type { BufferGeometry } from 'three';

export type Point3 = readonly [number, number, number];
export interface SolidClipPlane { normal: Point3; offset: number }
export interface CompiledSolid { triangles: Float64Array; volume: number }

/** Immutable triangle snapshot; callers invalidate when geometry changes. */
export function compileSolid(geometry: BufferGeometry): CompiledSolid {
  const p = geometry.attributes.position, ix = geometry.index, count = ix?.count ?? p.count;
  const triangles = new Float64Array(count * 3);
  let signed = 0;
  for (let i = 0; i < count; i++) {
    const k = ix ? ix.getX(i) : i;
    triangles.set([p.getX(k), p.getY(k), p.getZ(k)], i * 3);
  }
  for (let i = 0; i < triangles.length; i += 9) {
    const a = triangles;
    signed += a[i] * (a[i + 4] * a[i + 8] - a[i + 5] * a[i + 7])
      + a[i + 1] * (a[i + 5] * a[i + 6] - a[i + 3] * a[i + 8])
      + a[i + 2] * (a[i + 3] * a[i + 7] - a[i + 4] * a[i + 6]);
  }
  return { triangles, volume: Math.abs(signed / 6) };
}

/** Volume of a closed oriented mesh inside one or two halfspaces. Origin must
 * lie on EVERY clipping plane: omitted closing caps then contribute zero signed
 * tetrahedral volume. Two planes need their intersection, not separate origins.
 * Scratch polygons are reused; no allocations inside the triangle loop. */
export function clippedSolidVolume(mesh: CompiledSolid, planes: readonly SolidClipPlane[], origin: Point3): number {
  if (planes.length > 2) throw new Error('At most two planes with a common origin are supported');
  let input = new Float64Array(24), output = new Float64Array(24), sum = 0;
  const a = mesh.triangles, [ox, oy, oz] = origin;
  for (let i = 0; i < a.length; i += 9) {
    for (let j = 0; j < 9; j++) input[j] = a[i + j];
    let count = 3;
    for (const plane of planes) {
      const [nx, ny, nz] = plane.normal; let next = 0;
      for (let j = 0; j < count; j++) {
        const k = j * 3, l = ((j + 1) % count) * 3;
        const ax = input[k], ay = input[k + 1], az = input[k + 2];
        const bx = input[l], by = input[l + 1], bz = input[l + 2];
        const da = nx * ax + ny * ay + nz * az - plane.offset;
        const db = nx * bx + ny * by + nz * bz - plane.offset;
        if (da <= 0) { output[next++] = ax; output[next++] = ay; output[next++] = az; }
        if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
          const t = da / (da - db);
          output[next++] = ax + (bx - ax) * t;
          output[next++] = ay + (by - ay) * t;
          output[next++] = az + (bz - az) * t;
        }
      }
      count = next / 3;
      const swap = input; input = output; output = swap;
      if (count < 3) break;
    }
    for (let j = 1; j + 1 < count; j++) {
      const k = j * 3, l = (j + 1) * 3;
      const ax = input[0] - ox, ay = input[1] - oy, az = input[2] - oz;
      const bx = input[k] - ox, by = input[k + 1] - oy, bz = input[k + 2] - oz;
      const cx = input[l] - ox, cy = input[l + 1] - oy, cz = input[l + 2] - oz;
      sum += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
    }
  }
  return Math.max(0, Math.min(mesh.volume, Math.abs(sum / 6)));
}
