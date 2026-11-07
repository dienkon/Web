import { BoxGeometry, Quaternion, Vector3 } from 'three';
import { compileSolid, clippedSolidVolume, type CompiledSolid } from '../science/clippedSolidVolume';
import { CONSTANTS } from '../core/units';
import type { Quat, Vec3 } from './types';

const cubes = new Map<string, CompiledSolid>();
export function compiledBox(dimensions_m: Vec3): CompiledSolid {
  const key = dimensions_m.join(':');
  let mesh = cubes.get(key);
  if (!mesh) {
    const g = new BoxGeometry(...dimensions_m); mesh = compileSolid(g); g.dispose();
    if (cubes.size > 128) cubes.clear(); cubes.set(key, mesh);
  }
  return mesh;
}
/** Exact clipped volume of an oriented box, separate from its display scale. */
export function submergedBoxVolume(dimensions_m: Vec3, position_m: Vec3, rotation: Quat, surfaceY_m: number): number {
  // Volume under a plane equals the CDF of a sum of up to three uniforms.
  // Inclusion/exclusion integrates the clipped parallelepiped analytically;
  // ill-conditioned near-parallel orientations retain the mesh oracle path.
  const [x, y, z, w] = rotation;
  const projected = [Math.abs(2 * (x * y + z * w)) * dimensions_m[0],
    Math.abs(1 - 2 * (x * x + z * z)) * dimensions_m[1],
    Math.abs(2 * (y * z - x * w)) * dimensions_m[2]];
  const width = projected.reduce((sum, a) => sum + a, 0), height = surfaceY_m - position_m[1];
  const total = dimensions_m[0] * dimensions_m[1] * dimensions_m[2];
  if (height <= -width / 2) return 0;
  if (height >= width / 2) return total;
  if (Math.abs(height) < 1e-16) return total / 2;
  const axes = projected.filter(a => a > width * 1e-12);
  const largest = Math.max(...axes), smallest = Math.min(...axes);
  if (axes.length === 1 || smallest / largest >= 1e-5) {
    const a = axes.map(value => value / largest), n = a.length;
    const s = (width / 2 - Math.abs(height)) / largest;
    let sum = 0;
    for (let mask = 0; mask < (1 << n); mask++) {
      let shifted = s, parity = 1;
      for (let i = 0; i < n; i++) if (mask & (1 << i)) { shifted -= a[i]; parity = -parity; }
      sum += parity * Math.max(0, shifted) ** n;
    }
    const factorial = n === 3 ? 6 : n === 2 ? 2 : 1;
    const fraction = Math.max(0, Math.min(0.5, sum / (factorial * a.reduce((product, value) => product * value, 1))));
    return total * (height > 0 ? 1 - fraction : fraction);
  }
  const mesh = compiledBox(dimensions_m);
  const inverse = new Quaternion(...rotation).normalize().invert();
  const normal = new Vector3(0, 1, 0).applyQuaternion(inverse);
  const offset = surfaceY_m - position_m[1];
  const origin = normal.clone().multiplyScalar(offset);
  return clippedSolidVolume(mesh, [{ normal: [normal.x, normal.y, normal.z], offset }], [origin.x, origin.y, origin.z]);
}
export function buoyancyForce_N(density_kg_m3: number, submerged_m3: number): number {
  if (!(density_kg_m3 > 0) || !(submerged_m3 >= 0) || !Number.isFinite(density_kg_m3 + submerged_m3)) throw new Error('Invalid buoyancy input');
  return density_kg_m3 * CONSTANTS.g * submerged_m3;
}
/** Sphere drag closure; the dimensions describe an equivalent sphere, not a calibrated irregular particle. */
export function sphereDragCoefficient(reynolds: number): number {
  if (!(reynolds > 0)) return 0;
  return reynolds < 1000 ? 24 / reynolds * (1 + 0.15 * reynolds ** 0.687) : 0.44;
}
export function viscousDragImpulse(velocity_m_s: Vec3, mass_kg: number, radius_m: number,
  density_kg_m3: number, viscosity_Pas: number, dt: number, submergedFraction = 1): Vec3 {
  if (![...velocity_m_s, mass_kg, radius_m, density_kg_m3, viscosity_Pas, dt, submergedFraction].every(Number.isFinite)
    || mass_kg <= 0 || radius_m <= 0 || viscosity_Pas <= 0 || density_kg_m3 <= 0 || dt < 0) throw new Error('Invalid drag input');
  const speed = Math.hypot(...velocity_m_s);
  if (speed === 0 || dt === 0) return [0, 0, 0];
  const re = density_kg_m3 * speed * 2 * radius_m / viscosity_Pas;
  const coefficient = 0.5 * density_kg_m3 * sphereDragCoefficient(re) * Math.PI * radius_m ** 2 * speed * Math.max(0, Math.min(1, submergedFraction));
  // Exact damping for frozen drag coefficient cannot reverse velocity at high viscosity.
  const fraction = -Math.expm1(-coefficient * dt / mass_kg);
  return velocity_m_s.map(v => -mass_kg * v * fraction) as Vec3;
}
export function apparentWeight_N(mass_kg: number, displaced_m3: number, liquidDensity_kg_m3: number): number {
  return mass_kg * CONSTANTS.g - buoyancyForce_N(liquidDensity_kg_m3, displaced_m3);
}
