import * as THREE from 'three';

// Only the glass body registers here; effects consume its exact render matrix.
// Cleanup is identity checked so a remount cannot retire its replacement.
const bodies = new Map<string, THREE.Object3D>();
export function registerVesselBody(id: string, body: THREE.Object3D) {
  bodies.set(id, body);
  return () => { if (bodies.get(id) === body) bodies.delete(id); };
}
export function renderedVesselBody(id: string) {
  const body = bodies.get(id);
  body?.updateWorldMatrix(true, false);
  return body;
}
