import { Vector3, type BufferGeometry } from 'three';
import { getSolidMorphology } from '../data/chemicals';
import { createStockSolidGeometry } from './stockSolidGeometry';

export interface StockSurfaceSample { point: Vector3; normal: Vector3; area: number }

/** Equal-area deterministic quadrature shared by wet-contact eligibility and
 * reaction source placement. This resolves geometry, not capillary wetting. */
export function sampleGeometrySurface(geometry: BufferGeometry, count = 128): StockSurfaceSample[] {
  const p = geometry.getAttribute('position'), index = geometry.index;
  const size = index?.count ?? p.count;
  const ends = new Float64Array(Math.floor(size / 3)), offsets = new Uint32Array(ends.length);
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), normal = new Vector3(), edge = new Vector3();
  const read = (i: number) => {
    a.fromBufferAttribute(p, index ? index.getX(i) : i);
    b.fromBufferAttribute(p, index ? index.getX(i + 1) : i + 1);
    c.fromBufferAttribute(p, index ? index.getX(i + 2) : i + 2);
    normal.copy(b).sub(a).cross(edge.copy(c).sub(a));
  };
  // Retain only cumulative areas and original indices. A changing powder
  // envelope can contain thousands of triangles while needing just 128 samples;
  // expanding every triangle into vector objects creates avoidable GC pressure.
  let area = 0, valid = 0;
  for (let i = 0; i < size; i += 3) {
    read(i);
    const increment = normal.length() / 2;
    if (!(increment > 1e-15)) continue;
    area += increment; offsets[valid] = i; ends[valid++] = area;
  }
  if (!valid) return [];
  let triangle = 0;
  return Array.from({ length: count }, (_, i) => {
    while (triangle + 1 < valid && ends[triangle] < (i + 0.5) * area / count) triangle++;
    read(offsets[triangle]);
    const u = Math.sqrt(((i + 0.5) * 0.7548776662466927) % 1), v = ((i + 0.5) * 0.5698402909980532) % 1;
    return { point: a.clone().multiplyScalar(1 - u).addScaledVector(b, u * (1 - v)).addScaledVector(c, u * v),
      normal: normal.clone().normalize(), area: area / count };
  });
}

const cache = new Map<string, { points: number[][]; extent: number; area: number }>();
/** Unit-volume stock surface, including spherical coarse powder carriers. */
export function stockSurfacePoints(formula: string, powder: boolean) {
  const key = powder ? ':powder' : formula, cached = cache.get(key);
  if (cached) return cached;
  let points: number[][], extent: number, area: number;
  if (powder) {
    const r = Math.cbrt(3 / (4 * Math.PI)); extent = r; area = 4 * Math.PI * r * r;
    points = Array.from({ length: 128 }, (_, i) => {
      const y = 1 - 2 * (i + 0.5) / 128, a = i * Math.PI * (3 - Math.sqrt(5));
      return [r * Math.sqrt(1 - y * y) * Math.cos(a), r * y, r * Math.sqrt(1 - y * y) * Math.sin(a)];
    });
  } else {
    const geometry = createStockSolidGeometry(getSolidMorphology(formula), formula);
    extent = geometry.boundingSphere!.radius + geometry.boundingSphere!.center.length();
    const samples = sampleGeometrySurface(geometry); area = samples.reduce((sum, sample) => sum + sample.area, 0);
    points = samples.map(sample => sample.point.toArray()); geometry.dispose();
  }
  if (cache.size >= 64) cache.delete(cache.keys().next().value!);
  const result = { points, extent, area }; cache.set(key, result); return result;
}
