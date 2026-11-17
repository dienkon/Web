import { Quaternion, Vector3, type BufferGeometry } from 'three';
import type { VesselState } from '../types/chemistry';
import { findChemical, getSolidMorphology } from '../data/chemicals';
import { createStockSolidGeometry, stockSolidChunkCount } from '../science/stockSolidGeometry';
import { getWorldVesselProfile, type VesselProfile } from '../pour/physics/profiles';
import { vesselWorldLiquidSurfaceY } from '../science/vesselGeometry';
import { vesselLocalToWorld, vesselWorldToLocal } from '../science/vesselScale';
import { liquidSurfaceVolume } from '../engine/waterPhase';
import { solveLevel } from '../pour/physics/retained';
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
    || !(vessel.capacity_ml > 0)) return null;
  // Stock meshes enclose one material unit; this world scale preserves grams
  // and density independently of the receiving vessel's display scale.
  const shape = insertionShape(geometry, scale);
  const profile = getWorldVesselProfile(vessel.type, vessel.capacity_ml);
  const margin = profile.mouthR - shape.radius - 1e-5;
  if (!(margin >= 0) || !profile.contour?.length) return null;
  const minimumY = Math.min(...shape.vertices.map(p => p[1]));
  const mouthLocalY = vesselWorldToLocal(vessel, vesselLocalToWorld(vessel, [0, vesselLocalToWorld(vessel, [0, profile.H, 0])[1], 0]));
  const mouthWorld = vesselLocalToWorld(vessel, [0, vesselLocalToWorld(vessel, [0, profile.H, 0])[1], 0]);
  const localInteriorY = vesselWorldToLocal(vessel, mouthWorld)[1];
  const localTopY = vesselWorldToLocal(vessel, vesselLocalToWorld(vessel, [0, vesselWorldToLocal(vessel, mouthWorld)[1], 0]))[1];
  const topLocal = vesselWorldToLocal(vessel, vesselLocalToWorld(vessel, [0, vesselWorldToLocal(vessel, mouthWorld)[1], 0]))[1];
  const topY = vesselWorldToLocal(vessel, vesselLocalToWorld(vessel, [0, profile.H, 0]))[1];
  const upWorld = new Vector3(...vesselLocalToWorld(vessel, [0, profile.H + 1, 0])).sub(new Vector3(...mouthWorld)).normalize();
  const tilted = Math.hypot(upWorld.x, upWorld.z) > 1e-5;
  const startOffset = upWorld.clone().multiplyScalar(.55);
  const startY = mouthWorld[1] + startOffset.y - minimumY;
  const hasLiquid = vessel.volume_ml > .05 && liquidInventoryMass(vessel) > 0;
  const liquidY = !tilted ? vessel.position[1] + vesselWorldLiquidSurfaceY(vessel) : undefined;
  const localSurface = !tilted ? undefined : solveLevel(profile, Math.atan2(Math.hypot(upWorld.x, upWorld.z), upWorld.y), liquidSurfaceVolume(vessel)).c;
  const localShape = shape.vertices.map(point => new Vector3(...vesselLocalToWorld(vessel, [point[0], topY + point[1], point[2]])).sub(new Vector3(...mouthWorld)));
  const trace = (center: Vector3) => {
    const inside = (distance: number) => {
      const c = center.clone().addScaledVector(new Vector3(0, -1, 0), distance);
      return localShape.every(offset => {
        const point = vesselWorldToLocal(vessel, c.clone().add(offset).toArray() as Point3);
        return point[1] >= profile.baseY - 1e-7 && point[1] <= topY + 1e-7
          && Math.hypot(point[0], point[2]) <= profile.r(point[1]) + 1e-7;
      });
    };
    let entry = -1, exit = -1;
    for (let i = 0; i <= 400; i++) {
      const distance = i * .01;
      if (entry < 0 && inside(distance)) entry = distance;
      else if (entry >= 0 && !inside(distance)) { exit = distance; break; }
    }
    if (entry < 0) return null;
    if (exit < 0) exit = 4;
    let low = Math.max(entry, exit - .01), high = exit;
    for (let i = 0; i < 32; i++) { const middle = (low + high) / 2; if (inside(middle)) low = middle; else high = middle; }
    const contact = center.clone().addScaledVector(new Vector3(0, -1, 0), low);
    return { contact, wallY: contact.y, entry };
  };
  const flights = Array.from({ length: count }, (_, index): SolidStockFlight => {
    const angle = index * 2.39996, spread = Math.sqrt((index + 1) / count) * margin * .42;
    const localCenter = new Vector3(Math.cos(angle) * spread, 0, Math.sin(angle) * spread);
    const center = new Vector3(...mouthWorld).add(startOffset).add(new Vector3(...vesselLocalToWorld(vessel,
      [localCenter.x, topY, localCenter.z])).sub(new Vector3(...mouthWorld)));
    const traced = trace(center);
    if (!traced) return { releaseAt: 0, flightTime: Infinity, start: center.toArray() as Point3,
      contact: center.toArray() as Point3, rotation: shape.rotation.toArray() as Quat, mass_g: amount_g / count, contactKind: 'wall' };
    const wet = hasLiquid && !tilted && liquidY !== undefined && traced.contact.y >= liquidY - minimumY;
    return { releaseAt: .26 + index * .038, flightTime: Math.sqrt(2 * Math.max(0, startY - traced.contact.y) / SCENE_GRAVITY),
      start: center.toArray() as Point3, contact: traced.contact.toArray() as Point3,
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
