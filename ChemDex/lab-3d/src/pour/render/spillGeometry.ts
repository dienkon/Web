import * as THREE from 'three';
import type { SessileDropShape } from '../../science/sessileDrop';
import { METERS_PER_SCENE_UNIT } from '../../science/sceneUnits';

/** Closed body of revolution, bottom centre -> contact line -> apex. */
export function createSpillGeometry(drop: SessileDropShape): THREE.LatheGeometry {
  const points = [new THREE.Vector2(0, 0), ...drop.profile.slice().reverse().map(p =>
    new THREE.Vector2(p.radius_m / METERS_PER_SCENE_UNIT, p.height_m / METERS_PER_SCENE_UNIT))];
  return new THREE.LatheGeometry(points, 96);
}
