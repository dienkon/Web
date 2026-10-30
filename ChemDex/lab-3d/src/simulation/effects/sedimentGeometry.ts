import * as THREE from 'three';
import { liquidLevelForVolume, vesselInterior, contourRadius } from '../../science/vesselDimensions';
import { METERS_PER_SCENE_UNIT } from '../../science/sceneUnits';

/** Cylinder fallback for independent previews without a vessel profile.
 * No minimum visible thickness: the represented bed volume follows mass. */
export function cylinderSedimentThickness(radius_scene: number, mass_g: number, density_g_ml: number, packingFraction = 0.65): number {
  if (![radius_scene, mass_g, density_g_ml].every(Number.isFinite)
    || radius_scene <= 0 || mass_g <= 0 || density_g_ml <= 0 || !(packingFraction > 0 && packingFraction <= 1)) return 0;
  const cmPerSceneUnit = METERS_PER_SCENE_UNIT * 100;
  return mass_g / (density_g_ml * packingFraction * Math.PI * radius_scene ** 2 * cmPerSceneUnit ** 3);
}

/** Packed-bed volume in mL; porosity remains a visual-model assumption. */
export function sedimentLevel(type: string, capacity_ml: number, mass_g: number, density_g_ml: number, packingFraction = 0.65): number {
  return liquidLevelForVolume(type, mass_g / (density_g_ml * packingFraction), capacity_ml);
}

export function createSedimentGeometry(type: string, levelY: number): THREE.LatheGeometry {
  const interior = vesselInterior(type);
  const top = Math.min(interior.topY, Math.max(interior.floorY, levelY));
  const inset = (r: number) => Math.max(0, r - 1e-5);
  const points = [new THREE.Vector2(0, interior.floorY),
    new THREE.Vector2(inset(contourRadius(interior.points, interior.floorY)), interior.floorY)];
  for (const [r, y] of interior.points) {
    if (y > interior.floorY && y < top) points.push(new THREE.Vector2(inset(r), y));
  }
  points.push(new THREE.Vector2(inset(contourRadius(interior.points, top)), top), new THREE.Vector2(0, top));
  return new THREE.LatheGeometry(points, 48);
}
