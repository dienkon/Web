import { Quaternion, Vector3, type BufferGeometry } from 'three';
import type { VesselState } from '../types/chemistry';
import { findChemical, getSolidMorphology } from '../data/chemicals';
import { createStockSolidGeometry, stockSolidChunkCount } from '../science/stockSolidGeometry';
import { getWorldVesselProfile, type VesselProfile } from '../pour/physics/profiles';
import { vesselWorldLiquidSurfaceY } from '../science/vesselGeometry';
import { liquidInventoryMass } from './solidOccupancy';
import { CENTIMETERS_PER_SCENE_UNIT, SCENE_GRAVITY } from '../science/sceneUnits';

type Point3 = [number, number, number];
type Quat = [number, number, number, number];
export interface SolidStockFlight {
  releaseAt: number; flightTime: number; start: Point3; contact: Point3;
  rotation: Quat; mass_g: number; contactKind: 'liquid' | 'wall'; liquidSurfaceY?: number;
}
export interface SolidStockDose {
  scale: number; count: number; flights: SolidStockFlight[];
  /** Material vertices after the fixed insertion orientation, in scene units. */
  vertices: Point3[];
}
const geometries = new Map<string, BufferGeometry>();
function geometryFor(formula: string) {
  let geometry = geometries.get(formula);
  if (!geometry) { geometry = createStockSolidGeometry(getSolidMorphology(formula), formula); geometries.set(formula, geometry); }
  return geometry;
}
function insertionShape(geometry: BufferGeometry, scale: number) {
  const positions = geometry.getAttribute('position');
  const candidates = [new Quaternion(),
    new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2),
    new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2)];
  return candidates.map(rotation => {
    const vertices = Array.from({ length: positions.count }, (_, i) => new Vector3().fromBufferAttribute(positions, i)
      .multiplyScalar(scale).applyQuaternion(rotation).toArray() as Point3);
    return { rotation, vertices, radius: Math.max(...vertices.map(p => Math.hypot(p[0], p[2]))) };
  }).sort((a, b) => a.radius - b.radius)[0];
}
/** First inner-wall support encountered while a point descends from the mouth.
 * Each contour segment is linear, so its crossing is exact. */
function supportY(profile: VesselProfile, radius: number) {
  const points = profile.contour!;
  for (let i = points.length - 1; i > 0; i--) {
    const [r1, y1] = points[i], [r0, y0] = points[i - 1];
    if (y1 <= y0) continue;
    if (r0 < radius) return y0 + (y1 - y0) * (radius - r0) / (r1 - r0);
  }
  return profile.baseY;
}

/** Guided vertical insertion uses the actual finite stock geometry. A grain
 * never passes through a narrow neck, shrinks to fit, or tumbles through glass.
 * The rigid-contact solver takes over at its first liquid/wall contact. */
export function planSolidStockDose(vessel: VesselState, formula: string, amount_g: number): SolidStockDose | null {
  const chemical = findChemical(formula), count = stockSolidChunkCount(getSolidMorphology(formula));
  if (chemical.type !== 'solid' || !(chemical.density! > 0) || !Number.isFinite(chemical.density)) return null;
  const scale = Math.cbrt(amount_g / chemical.density! / count) / CENTIMETERS_PER_SCENE_UNIT;
  return planSolidGeometryDose(vessel, geometryFor(formula), scale, amount_g, count);
}

/** A dedicated whole-piece dose can use its own material geometry and scale
 * while sharing exactly the same opening/contact path as stock additions. */
export function planSolidGeometryDose(vessel: VesselState, geometry: BufferGeometry, scale: number,
  amount_g: number, count: number): SolidStockDose | null {
  const up = new Vector3(0, 1, 0).applyQuaternion(vessel.physicalMotion
    ? new Quaternion(...vessel.physicalMotion.rotation) : new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), vessel.rotationZ ?? 0));
  if (!(amount_g > 0) || !(scale > 0) || !Number.isInteger(count) || count < 1
    || ![amount_g, scale, vessel.capacity_ml, ...vessel.position, up.y].every(Number.isFinite)
    || !(vessel.capacity_ml > 0) || up.y < 1 - 1e-6) return null;
  // Stock meshes enclose one material unit; this world scale preserves grams
  // and density independently of the receiving vessel's display scale.
  const shape = insertionShape(geometry, scale);
  const profile = getWorldVesselProfile(vessel.type, vessel.capacity_ml);
  const margin = profile.mouthR - shape.radius - 1e-5;
  if (!(margin >= 0) || !profile.contour?.length) return null;
  const minimumY = Math.min(...shape.vertices.map(p => p[1]));
  // Both the profile and material vertices already use world scene units.
  // Applying the glass body's display scale again moves the support below
  // the real floor, especially for small-capacity vessels.
  const topY = profile.baseY + profile.H;
  const startY = vessel.position[1] + topY + .55 - minimumY;
  const hasLiquid = vessel.volume_ml > .05 && liquidInventoryMass(vessel) > 0;
  const liquidY = vessel.position[1] + vesselWorldLiquidSurfaceY(vessel);
  const flights = Array.from({ length: count }, (_, index): SolidStockFlight => {
    const angle = index * 2.39996, spread = Math.sqrt((index + 1) / count) * margin * .42;
    const x = Math.cos(angle) * spread, z = Math.sin(angle) * spread;
    let wallY = -Infinity;
    for (const point of shape.vertices) {
      wallY = Math.max(wallY, supportY(profile, Math.hypot(x + point[0], z + point[2])) - point[1]);
    }
    wallY += vessel.position[1];
    const wet = hasLiquid && liquidY - minimumY >= wallY;
    const contactY = wet ? liquidY - minimumY : wallY;
    return { releaseAt: .26 + index * .038, flightTime: Math.sqrt(2 * Math.max(0, startY - contactY) / SCENE_GRAVITY),
      start: [vessel.position[0] + x, startY, vessel.position[2] + z],
      contact: [vessel.position[0] + x, contactY, vessel.position[2] + z],
      rotation: shape.rotation.toArray() as Quat, mass_g: amount_g / count, contactKind: wet ? 'liquid' : 'wall',
      ...(wet ? { liquidSurfaceY: liquidY } : {}) };
  });
  return flights.every(flight => Number.isFinite(flight.flightTime)) ? { scale, count, flights, vertices: shape.vertices } : null;
}

export function solidStockDoseProblem(vessel: VesselState, formula: string, amount_g: number): string | null {
  if (findChemical(formula).type !== 'solid') return null;
  const up = new Vector3(0, 1, 0).applyQuaternion(vessel.physicalMotion
    ? new Quaternion(...vessel.physicalMotion.rotation) : new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), vessel.rotationZ ?? 0));
  if (up.y < 1 - 1e-6) return 'Đặt bình nhận thẳng đứng trước khi thêm chất rắn.';
  return planSolidStockDose(vessel, formula, amount_g) ? null
    : 'Hạt mẫu lớn hơn miệng bình hoặc dữ liệu mẫu không hợp lệ. Chọn bình miệng rộng hơn hoặc lượng mẫu nhỏ hơn.';
}

export function solidStockFlightPosition(flight: SolidStockFlight, age_s: number): Point3 {
  if (age_s >= flight.flightTime) return [...flight.contact];
  const t = Math.max(0, Math.min(flight.flightTime, age_s));
  return [flight.start[0], Math.max(flight.contact[1], flight.start[1] - .5 * SCENE_GRAVITY * t * t), flight.start[2]];
}
