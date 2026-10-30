import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { V3 } from './AssetPrimitives';

export interface AssetPlacement { at: V3; scale?: V3; rotation?: V3; name?: string }

/** Static copies borrow a single model's resources. Transparent surfaces remain
 * separate meshes so Three can still sort each vessel back to front. Only opaque
 * parts are instanced. Named copies retain their geometry for bounds/picking. */
export function StaticAssetCopies({ children, placements }: { children: React.ReactNode; placements: AssetPlacement[] }) {
 const source = useMemo(() => new THREE.Group(), []);
 const root = useRef<THREE.Group>(null);
 const rebuild = useRef(true);
 const cleanup = useRef<() => void>(() => {});
 const key = JSON.stringify(placements);
 useLayoutEffect(() => {
  rebuild.current = true;
  return () => { cleanup.current(); cleanup.current = () => {}; };
 }, [key, children]);

 useFrame(() => {
  // Portals and the model's own layout effects must have committed first.
  if (!rebuild.current || !root.current || !source.children.length) return;
  rebuild.current = false;
  source.updateMatrixWorld(true);
  const output = new THREE.Group();
  const batches: THREE.InstancedMesh[] = [];
  const transforms = placements.map(p => new THREE.Matrix4().compose(
   new THREE.Vector3(...p.at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(p.rotation ?? [0, 0, 0]))), new THREE.Vector3(...(p.scale ?? [1, 1, 1])),
  ));
  source.traverse(object => {
   if (!(object instanceof THREE.Mesh) || Array.isArray(object.material) || object.material.transparent) return;
   const count = object instanceof THREE.InstancedMesh ? object.count : 1;
   const batch = new THREE.InstancedMesh(object.geometry, object.material, placements.length * count);
   batch.name = 'static-copy-batch';
   batch.castShadow = object.castShadow; batch.receiveShadow = object.receiveShadow;
   batch.renderOrder = object.renderOrder;
   // Picking uses the original named copies, whose parent metadata is retained.
   batch.raycast = () => {};
   const local = new THREE.Matrix4(), instance = new THREE.Matrix4();
   transforms.forEach((placement, i) => {
    local.multiplyMatrices(placement, object.matrixWorld);
    for (let j = 0; j < count; j++) {
     if (object instanceof THREE.InstancedMesh) { object.getMatrixAt(j, instance); instance.premultiply(local); }
     else instance.copy(local);
     batch.setMatrixAt(i * count + j, instance);
    }
   });
   batch.instanceMatrix.needsUpdate = true;
   batch.computeBoundingBox(); batch.computeBoundingSphere();
   output.add(batch); batches.push(batch);
  });
  const borrowedInstances: THREE.InstancedMesh[] = [];
  placements.forEach((placement, i) => {
   const copy = source.clone(true);
   copy.name = placement.name ?? '';
   copy.matrix.copy(transforms[i]); copy.matrixAutoUpdate = false;
   copy.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    if (!Array.isArray(object.material) && !object.material.transparent) object.visible = false;
    if (object instanceof THREE.InstancedMesh) borrowedInstances.push(object);
   });
   output.add(copy);
  });
  const parent = root.current;
  parent.add(output);
  cleanup.current = () => {
   parent.remove(output);
   // Geometry, materials and textures belong to the React portal. Never dispose
   // those borrowed resources here; only release per-copy instance buffers.
   for (const batch of [...batches, ...borrowedInstances]) batch.dispose();
  };
 });
 return <><group ref={root} />{createPortal(children, source)}</>;
}
