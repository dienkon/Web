import { Quaternion, Vector3 } from 'three';
import type { SpillState } from '../types/chemistry';
import { getSolidMorphology } from '../data/chemicals';
import { createStockSolidGeometry } from '../components/three/stockSolidGeometry';
import { solveSessileDrop, type SessileDropShape } from '../science/sessileDrop';
import { METERS_PER_SCENE_UNIT as U } from '../science/sceneUnits';
import { supportPlaneScene } from '../core/labGeometry';

const SAMPLE_COUNT = 128;
const samples = new Map<string, { points: number[][]; extent: number }>();
/** Equal-area surface quadrature, bounded independently of mesh complexity.
 * This is a contact estimate, not a resolved capillary/wetting calculation. */
function surfaceSamples(formula: string, powder: boolean) {
  const key = powder ? ':powder' : formula, cached = samples.get(key);
  if (cached) return cached;
  let points: number[][], extent: number;
  if (powder) {
    const r = Math.cbrt(3 / (4 * Math.PI));
    extent = r;
    points = Array.from({ length: SAMPLE_COUNT }, (_, i) => {
      const y = 1 - 2 * (i + 0.5) / SAMPLE_COUNT, a = i * Math.PI * (3 - Math.sqrt(5));
      return [r * Math.sqrt(1 - y * y) * Math.cos(a), r * y, r * Math.sqrt(1 - y * y) * Math.sin(a)];
    });
  } else {
    const geometry = createStockSolidGeometry(getSolidMorphology(formula), formula);
    const p = geometry.getAttribute('position'), index = geometry.index, count = index?.count ?? p.count;
    geometry.computeBoundingSphere(); extent = geometry.boundingSphere!.radius + geometry.boundingSphere!.center.length();
    const triangles: { a: Vector3; b: Vector3; c: Vector3; end: number }[] = [];
    let area = 0;
    for (let i = 0; i < count; i += 3) {
      const a = new Vector3().fromBufferAttribute(p, index ? index.getX(i) : i);
      const b = new Vector3().fromBufferAttribute(p, index ? index.getX(i + 1) : i + 1);
      const c = new Vector3().fromBufferAttribute(p, index ? index.getX(i + 2) : i + 2);
      area += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
      triangles.push({ a, b, c, end: area });
    }
    let triangle = 0;
    points = Array.from({ length: SAMPLE_COUNT }, (_, i) => {
      while (triangle + 1 < triangles.length && triangles[triangle].end < (i + 0.5) * area / SAMPLE_COUNT) triangle++;
      const t = triangles[triangle], u = Math.sqrt(((i + 0.5) * 0.7548776662466927) % 1), v = ((i + 0.5) * 0.5698402909980532) % 1;
      return t.a.clone().multiplyScalar(1 - u).addScaledVector(t.b, u * (1 - v)).addScaledVector(t.c, u * v).toArray();
    });
    geometry.dispose();
  }
  if (samples.size >= 64) samples.delete(samples.keys().next().value!);
  const result = { points, extent }; samples.set(key, result); return result;
}

function heightAt(drop: SessileDropShape, radius: number): number {
  if (radius >= drop.radius_m) return 0;
  const p = drop.profile;
  let low = 0, high = p.length - 1;
  while (low < high) { const mid = (low + high) >>> 1; if (p[mid].radius_m < radius) low = mid + 1; else high = mid; }
  if (low === 0) return p[0].height_m;
  const a = p[low - 1], b = p[low], t = (radius - a.radius_m) / Math.max(1e-15, b.radius_m - a.radius_m);
  return a.height_m + t * (b.height_m - a.height_m);
}

export interface StockWetContact { fraction: number; position: [number, number, number] }
/** Authoritative SI pose versus the same free surface used to draw the pool.
 * The 50 µm floor allowance covers the published rigid-contact tolerance. */
export function stockWetContact(grain: SpillState, pool: SpillState): StockWetContact | null {
  const pose = grain.stockMotion;
  if (!pose || !(pose.scale_m > 0) || !(pool.volume_ml > 0) || pool.stockMotion) return null;
  const floor = supportPlaneScene(pool.position) * U, cx = pool.position[0] * U, cz = pool.position[2] * U;
  // Cheap conservative cull before solving the drop or sampling any surfaces.
  const surface = surfaceSamples(pose.formula, pose.powder), reach = pose.scale_m * surface.extent;
  if (pose.position_m[1] + reach < floor - 0.00005
    || Math.hypot(pose.position_m[0] - cx, pose.position_m[2] - cz) > pool.radius * U + reach) return null;
  const drop = solveSessileDrop(pool.volume_ml);
  if (!drop || pose.position_m[1] - reach > floor + drop.height_m) return null;
  const q = new Quaternion(...pose.rotation), p = new Vector3();
  let wet = 0, x = 0, y = 0, z = 0;
  for (const point of surface.points) {
    p.set(point[0], point[1], point[2]).multiplyScalar(pose.scale_m).applyQuaternion(q);
    p.x += pose.position_m[0]; p.y += pose.position_m[1]; p.z += pose.position_m[2];
    const height = heightAt(drop, Math.hypot(p.x - cx, p.z - cz));
    if (height <= 0 || p.y < floor - 0.00005 || p.y > floor + height) continue;
    wet++; x += p.x; y += p.y; z += p.z;
  }
  return wet ? { fraction: wet / SAMPLE_COUNT, position: [x / wet / U, y / wet / U, z / wet / U] } : null;
}
