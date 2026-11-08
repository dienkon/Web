import { BufferGeometry, Float32BufferAttribute } from 'three';
import { solidColumnIntervals } from '../../science/solidColumnIntervals';
import { vesselInterior } from '../../science/vesselDimensions';

/** A mass-normalized continuum skin over resting coarse contact carriers.
 * The 28° repose angle / 55% packing remain explicit approximations. Moving
 * carriers are rendered separately and never counted in this bed a second time. */
export function createPowderContactGeometry(type: string, bulkVolume: number,
  anchors: { x: number; y: number; z: number; radius: number }[]) {
  if (!(bulkVolume > 0) || !anchors.length) return null;
  const interior = vesselInterior(type), radius = interior.maximumRadius * 0.98, rings = 24, sides = 64;
  const points = [{ x: 0, z: 0 }];
  for (let r = 1; r <= rings; r++) for (let a = 0; a < sides; a++) {
    const angle = a / sides * Math.PI * 2;
    points.push({ x: radius * r / rings * Math.cos(angle), z: radius * r / rings * Math.sin(angle) });
  }
  const triangles: number[] = [];
  for (let a = 0; a < sides; a++) triangles.push(0, 1 + (a + 1) % sides, 1 + a);
  for (let r = 1; r < rings; r++) for (let a = 0; a < sides; a++) {
    const i = 1 + (r - 1) * sides + a, j = 1 + (r - 1) * sides + (a + 1) % sides;
    triangles.push(i, j + sides, i + sides, i, j, j + sides);
  }
  const slope = Math.tan(28 * Math.PI / 180);
  const columns = points.map(p => {
    const intervals = solidColumnIntervals(type, Math.hypot(p.x, p.z), undefined, true), first = intervals[0];
    const floor = first?.[0] ?? interior.topY, ceiling = first?.[1] ?? interior.topY;
    const peak = Math.max(...anchors.map(a => a.y + a.radius - slope * Math.hypot(p.x - a.x, p.z - a.z)));
    return { ...p, floor, ceiling, peak };
  });
  const weights = new Float64Array(points.length);
  for (let i = 0; i < triangles.length; i += 3) {
    const [a, b, c] = triangles.slice(i, i + 3), p = points[a], q = points[b], r = points[c];
    const area = Math.abs((q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x)) / 2;
    weights[a] += area / 3; weights[b] += area / 3; weights[c] += area / 3;
  }
  const height = (i: number, shift: number) => Math.max(columns[i].floor, Math.min(columns[i].ceiling, columns[i].peak + shift));
  const volume = (shift: number) => columns.reduce((sum, c, i) => sum + (height(i, shift) - c.floor) * weights[i], 0);
  let low = -interior.height * 4, high = interior.height;
  for (let i = 0; i < 16 && volume(high) < bulkVolume; i++) high *= 2;
  for (let i = 0; i < 48; i++) { const middle = (low + high) / 2; if (volume(middle) < bulkVolume) low = middle; else high = middle; }
  const shift = (low + high) / 2, vertices: number[] = [];
  for (const [i, p] of columns.entries()) vertices.push(p.x, height(i, shift), p.z);
  for (const p of columns) vertices.push(p.x, p.floor, p.z);
  const n = points.length, indices = [...triangles];
  for (let i = 0; i < triangles.length; i += 3) indices.push(triangles[i] + n, triangles[i + 2] + n, triangles[i + 1] + n);
  for (let a = 0; a < sides; a++) {
    const i = 1 + (rings - 1) * sides + a, j = 1 + (rings - 1) * sides + (a + 1) % sides;
    indices.push(i, j + n, i + n, i, j, j + n);
  }
  const geometry = new BufferGeometry(); geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices);
  const uv = vertices.flatMap((_, i) => i % 3 === 0 ? [vertices[i] * 8, vertices[i + 2] * 8] : []);
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  geometry.userData.powder = { bulkVolume, representedVolume: volume(shift), reposeAngle_deg: 28, poseBasis: 'contact-carriers' };
  return geometry;
}
