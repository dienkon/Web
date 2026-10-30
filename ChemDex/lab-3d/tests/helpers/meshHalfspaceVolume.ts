import type { BufferGeometry } from 'three';
type Point = readonly [number, number, number];
/** Independent signed tetrahedra from uploaded triangles after clipping.
 * The origin lies on the clipping plane; a closing cap contributes zero. */
export function meshHalfspaceVolume(geometry: BufferGeometry, normal: Point, c: number): number {
  const p = geometry.attributes.position, index = geometry.index;
  const dot = (v: Point) => normal[0] * v[0] + normal[1] * v[1] + normal[2] * v[2];
  const length2 = dot(normal), origin = normal.map(n => n * c / length2);
  let total = 0;
  for (let i = 0; i < (index?.count ?? p.count); i += 3) {
    const triangle = [0, 1, 2].map(j => {
      const k = index ? index.getX(i + j) : i + j; return [p.getX(k), p.getY(k), p.getZ(k)] as const;
    });
    const clipped: Point[] = [];
    for (let j = 0; j < 3; j++) {
      const a = triangle[j], b = triangle[(j + 1) % 3], da = dot(a) - c, db = dot(b) - c;
      if (da <= 0) clipped.push(a);
      if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
        const t = da / (da - db);
        clipped.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
      }
    }
    for (let j = 1; j + 1 < clipped.length; j++) {
      const a = clipped[0].map((v, k) => v - origin[k]), b = clipped[j].map((v, k) => v - origin[k]), d = clipped[j + 1].map((v, k) => v - origin[k]);
      total += (a[0] * (b[1] * d[2] - b[2] * d[1]) + a[1] * (b[2] * d[0] - b[0] * d[2]) + a[2] * (b[0] * d[1] - b[1] * d[0])) / 6;
    }
  }
  return Math.abs(total);
}
