import * as THREE from 'three';

/** Smooth irregular glyph for hydrated flocs, not a resolved polymer/gel mesh.
 * Kept inside radius 0.9 so existing finite-particle containment also bounds it.
 */
export function createGelGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const r = 0.68 + 0.12 * Math.sin(3 * x + 2 * y) * Math.cos(3 * z - y);
    positions.setXYZ(i, x * r, y * r * 0.8, z * r * 0.9);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
