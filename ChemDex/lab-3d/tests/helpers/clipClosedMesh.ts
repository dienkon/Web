import { BufferGeometry, BufferAttribute } from 'three';

/** Independent reference construction: clip each face, then explicitly close
 * the cut with oriented triangle fans. Signed fans allow separate/nonconvex
 * loops without depending on a sorted cap contour. Used only in audits/tests. */
export function clipClosedMesh(geometry: BufferGeometry, normal: readonly [number, number, number], c: number): BufferGeometry {
  const p = geometry.attributes.position, ix = geometry.index, points: number[] = [];
  const length2 = normal.reduce((s, n) => s + n * n, 0), origin = normal.map(n => n * c / length2);
  const distance = (v: readonly number[]) => v.reduce((s, x, k) => s + normal[k] * x, -c);
  const triangle = (a: readonly number[], b: readonly number[], d: readonly number[]) => points.push(...a, ...b, ...d);
  for (let i = 0; i < (ix?.count ?? p.count); i += 3) {
    const vertices = [0, 1, 2].map(j => { const k = ix ? ix.getX(i + j) : i + j; return [p.getX(k), p.getY(k), p.getZ(k)]; });
    const polygon: number[][] = [];
    for (let j = 0; j < 3; j++) {
      const a = vertices[j], b = vertices[(j + 1) % 3], da = distance(a), db = distance(b);
      if (da <= 0) polygon.push(a);
      if ((da < 0 && db > 0) || (da > 0 && db < 0)) polygon.push(a.map((x, k) => x + (b[k] - x) * da / (da - db)));
    }
    for (let j = 1; j + 1 < polygon.length; j++) triangle(polygon[0], polygon[j], polygon[j + 1]);
    if (vertices.some(a => distance(a) > 0)) for (let j = 0; j < polygon.length; j++) {
      const a = polygon[j], b = polygon[(j + 1) % polygon.length];
      if (Math.abs(distance(a)) < 1e-12 && Math.abs(distance(b)) < 1e-12) triangle(origin, b, a);
    }
  }
  return new BufferGeometry().setAttribute('position', new BufferAttribute(new Float64Array(points), 3));
}
