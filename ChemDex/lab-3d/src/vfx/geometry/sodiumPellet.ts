import * as THREE from 'three';
import type { VesselState } from '../../types/chemistry';
import { solidSceneVolume, liquidGeometry } from '../../science/vesselDimensions';
import { vesselLiquidSurfaceY } from '../../science/vesselGeometry';
import { SODIUM_DENSITY_G_ML } from '../../science/sodiumWater';
import { liquidInventoryMass } from '../../handling/solidOccupancy';

const UNIT_VOLUME = 4 * Math.PI / 3;
const template = new THREE.IcosahedronGeometry(1, 2);
const sphere = (template.attributes.position.array as Float32Array).slice();
template.dispose();
const cut = sphere.map((value, i) => {
  const start = i - i % 3;
  return value / Math.max(Math.abs(sphere[start]), Math.abs(sphere[start + 1]), Math.abs(sphere[start + 2]));
});
const tetra = (ax: number, ay: number, az: number, bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number) =>
  (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;

/** Volume below a horizontal plane. Clipped faces close on that plane; their
 * closing cap has zero tetrahedral volume with an origin on the same plane. */
export function submergedPelletVolume(positions: Float32Array, planeY: number): number {
  let volume = 0;
  for (let i = 0; i < positions.length; i += 9) {
    let ax = positions[i], ay = positions[i + 1] - planeY, az = positions[i + 2];
    let bx = positions[i + 3], by = positions[i + 4] - planeY, bz = positions[i + 5];
    let cx = positions[i + 6], cy = positions[i + 7] - planeY, cz = positions[i + 8];
    const count = Number(ay <= 0) + Number(by <= 0) + Number(cy <= 0);
    if (!count) continue;
    if (count === 3) { volume += tetra(ax, ay, az, bx, by, bz, cx, cy, cz); continue; }
    // Cyclic permutation keeps winding while putting the isolated vertex first.
    const isolatedInside = count === 1;
    if ((ay <= 0) !== isolatedInside) {
      if ((by <= 0) === isolatedInside) {
        [ax, ay, az, bx, by, bz, cx, cy, cz] = [bx, by, bz, cx, cy, cz, ax, ay, az];
      } else {
        [ax, ay, az, bx, by, bz, cx, cy, cz] = [cx, cy, cz, ax, ay, az, bx, by, bz];
      }
    }
    const ab = -ay / (by - ay), ac = -ay / (cy - ay);
    const px = ax + ab * (bx - ax), pz = az + ab * (bz - az);
    const qx = ax + ac * (cx - ax), qz = az + ac * (cz - az);
    volume += count === 1 ? tetra(ax, ay, az, px, 0, pz, qx, 0, qz)
      : tetra(bx, by, bz, cx, cy, cz, qx, 0, qz) + tetra(bx, by, bz, qx, 0, qz, px, 0, pz);
  }
  return Math.abs(volume);
}

export interface SodiumPelletShape {
  positions: Float32Array;
  bottom: number;
  top: number;
  horizontalRadius: number;
  volume: number;
  densityRatio?: number;
  waterline?: number;
}
const shapes = new Map<number, SodiumPelletShape>();

/** Bounded cache: 65 melt shapes, each normalized to the SAME solid volume.
 * Morphing from a cut piece to a ball must not create or remove metal. */
export function sodiumPelletShape(melt: number): SodiumPelletShape {
  const key = Math.round(Math.max(0, Math.min(1, melt)) * 64);
  const cached = shapes.get(key);
  if (cached) return cached;
  const fraction = key / 64;
  const positions = cut.map((value, i) => value + (sphere[i] - value) * fraction);
  const factor = Math.cbrt(UNIT_VOLUME / submergedPelletVolume(positions, 2));
  let bottom = Infinity, top = -Infinity, horizontalRadius = 0;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] *= factor; positions[i + 1] *= factor; positions[i + 2] *= factor;
    bottom = Math.min(bottom, positions[i + 1]); top = Math.max(top, positions[i + 1]);
    horizontalRadius = Math.max(horizontalRadius, Math.hypot(positions[i], positions[i + 2]));
  }
  const result = { positions, bottom, top, horizontalRadius, volume: submergedPelletVolume(positions, 2) };
  shapes.set(key, result);
  return result;
}

export function applySodiumPelletShape(geometry: THREE.BufferGeometry, shape: SodiumPelletShape): void {
  if (geometry.userData.sodiumShape === shape) return;
  const position = geometry.getAttribute('position');
  if (position) { (position.array as Float32Array).set(shape.positions); position.needsUpdate = true; }
  else geometry.setAttribute('position', new THREE.BufferAttribute(shape.positions.slice(), 3));
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  geometry.userData.sodiumShape = shape;
}

export function sodiumPelletRadius(vessel: Pick<VesselState, 'type' | 'capacity_ml'>, mass_g: number): number {
  return Math.cbrt(solidSceneVolume(vessel, Math.max(0, mass_g) / SODIUM_DENSITY_G_ML) / UNIT_VOLUME);
}

export function sodiumPelletPlacement(vessel: VesselState, mass_g: number, melt: number) {
  const shape = sodiumPelletShape(melt), radius = sodiumPelletRadius(vessel, mass_g);
  const floor = liquidGeometry(vessel.type).floorY, surface = vesselLiquidSurfaceY(vessel);
  const water = vessel.volume_ml > 0 && vessel.contents.some(item => item.formula === 'H2O'
    && !['s', 'g'].includes(item.phase ?? item.state ?? 'l') && item.moles > 1e-12);
  let centerY = floor - shape.bottom * radius;
  if (water) {
    const density = liquidInventoryMass(vessel) / vessel.volume_ml;
    const ratio = Math.max(0, Math.min(1, SODIUM_DENSITY_G_ML / Math.max(1e-9, density)));
    if (shape.densityRatio !== ratio) {
      let low = shape.bottom, high = shape.top;
      for (let i = 0; i < 22; i++) {
        const plane = (low + high) / 2;
        if (submergedPelletVolume(shape.positions, plane) / shape.volume < ratio) low = plane;
        else high = plane;
      }
      shape.waterline = (low + high) / 2; shape.densityRatio = ratio;
    }
    centerY = Math.max(centerY, surface - shape.waterline! * radius);
  }
  return { shape, radius, centerY, surface, floor, hasWater: water,
    horizontalRadius: shape.horizontalRadius * radius, bottomY: centerY + shape.bottom * radius };
}
