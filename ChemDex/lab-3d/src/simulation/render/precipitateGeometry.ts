import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PrecipitateProfile } from '../core/SimulationTypes';
import { createGelGeometry } from './gelGeometry';

/** Representative aggregates, not resolved primary particles. All vertices fit
 * the unit ball so the transport system's existing glyph envelope stays valid.
 * Shape never changes a particle's physical radius or represented mass. */
export function createPrecipitateGeometry(profile: PrecipitateProfile): THREE.BufferGeometry {
  let geometry: THREE.BufferGeometry;
  if (['Ag', 'Cu', 'Pb'].includes(profile.id)) {
    const pieces: THREE.BufferGeometry[] = [];
    const branch = (a: THREE.Vector3, b: THREE.Vector3, width: number) => {
      const direction = b.clone().sub(a);
      const g = new THREE.CylinderGeometry(width * 0.4, width, direction.length(), 5);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
      g.translate(...a.clone().add(b).multiplyScalar(0.5).toArray()); pieces.push(g);
    };
    branch(new THREE.Vector3(0, -0.65, 0), new THREE.Vector3(0, 0.72, 0), 0.065);
    for (let i = 0; i < 8; i++) {
      const a = i * 2.4, y = -0.45 + i * 0.13;
      branch(new THREE.Vector3(0, y, 0), new THREE.Vector3(Math.cos(a) * 0.48, y + 0.32, Math.sin(a) * 0.48), 0.045);
    }
    geometry = mergeGeometries(pieces); pieces.forEach(g => g.dispose());
  } else if (profile.id === 'PbCl2' && profile.morphology === 'crystalline') {
    geometry = new THREE.CylinderGeometry(0.07, 0.07, 1.5, 4);
  } else if (profile.morphology === 'crystalline') {
    // PbI2 plates only when the inventory records the crystallization route.
    geometry = new THREE.CylinderGeometry(0.72, 0.72, 0.06, 6);
  } else if (profile.morphology === 'gel_like') geometry = createGelGeometry();
  else if (profile.morphology === 'flocculent') {
    const pieces = Array.from({ length: 7 }, (_, i) => {
      const g = new THREE.IcosahedronGeometry(i === 0 ? 0.36 : 0.25, 1);
      if (i) { const a = i * 2.4; g.translate(Math.cos(a) * 0.35, Math.sin(i * 3.1) * 0.28, Math.sin(a) * 0.35); }
      return g;
    });
    geometry = mergeGeometries(pieces); pieces.forEach(g => g.dispose());
  } else if (profile.morphology === 'granular') geometry = new THREE.OctahedronGeometry(0.65);
  else geometry = new THREE.IcosahedronGeometry(0.5, 0);
  geometry.computeBoundingSphere();
  return geometry;
}
