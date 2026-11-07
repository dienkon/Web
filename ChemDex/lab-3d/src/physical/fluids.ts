import { BoxGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import { compileSolid, clippedSolidVolume, type CompiledSolid } from '../science/clippedSolidVolume';
import { CONSTANTS } from '../core/units';
import type { Quat, Vec3 } from './types';

const cubes = new Map<string, CompiledSolid>();
/** Exact clipped volume of an oriented box, separate from its display scale. */
export function submergedBoxVolume(dimensions_m: Vec3, position_m: Vec3, rotation: Quat, surfaceY_m: number): number {
  const key = dimensions_m.join(':');
  let mesh = cubes.get(key);
  if (!mesh) {
    const g = new BoxGeometry(...dimensions_m); mesh = compileSolid(g); g.dispose();
    if (cubes.size > 128) cubes.clear(); cubes.set(key, mesh);
  }
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
