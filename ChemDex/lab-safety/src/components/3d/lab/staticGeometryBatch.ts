import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const movingNames = /^(asset-character|asset-imported-teacher|asset-wall-clock|drawer-slide-|door-leaf-)/;

function batchMaterial(mesh: THREE.Mesh) {
  const material = mesh.material;
  if (!(material instanceof THREE.MeshStandardMaterial) || material.type !== 'MeshStandardMaterial'
    || material.transparent || material.vertexColors || !material.visible
    || Object.values(material).some(value => value instanceof THREE.Texture)
    || material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile
    || mesh.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender
    || mesh.customDepthMaterial || mesh.customDistanceMaterial
    || mesh instanceof THREE.SkinnedMesh || (mesh as THREE.BatchedMesh).isBatchedMesh
    || Object.values(mesh.geometry.morphAttributes).some(values => values.length > 0)
    || !mesh.geometry.getAttribute('position') || !mesh.geometry.getAttribute('normal')
    || mesh.geometry.drawRange.start !== 0
    || mesh.geometry.drawRange.count < (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count)
    || (mesh instanceof THREE.InstancedMesh && (mesh.instanceColor || mesh.morphTexture))
    || mesh.matrixWorld.determinant() <= 0) return null;
  if (mesh instanceof THREE.InstancedMesh) {
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      if (matrix.determinant() <= 0 || !matrix.elements.every(Number.isFinite)) return null;
    }
  }
  return material;
}

function signature(material: THREE.MeshStandardMaterial, mesh: THREE.Mesh) {
  // toJSON covers material depth, blend, stencil, alpha, shading and fog flags.
  // Only diffuse color may differ; preserve exact linear emissive/blend colors
  // and the clipping/shadow properties that material serialization omits.
  const { uuid, name, color, metadata, userData, ...properties } = material.toJSON();
  return JSON.stringify([
    properties, material.emissive.toArray(), material.blendColor.toArray(),
    material.shadowSide, material.clipIntersection, material.clipShadows,
    material.clippingPlanes?.map(plane => [...plane.normal.toArray(), plane.constant]),
    material.defines, material.customProgramCacheKey(), mesh.castShadow,
    mesh.receiveShadow, mesh.renderOrder, mesh.layers.mask, mesh.frustumCulled,
  ]);
}

/** Bake only immutable children into parent-local geometry. Named source meshes
 * remain available for bounds/picking; only owned buffers/materials are disposed. */
export function buildStaticGeometryBatch(parent: THREE.Group, id: string) {
  const started = performance.now();
  parent.updateWorldMatrix(true, true);
  const inverse = parent.matrixWorld.clone().invert();
  const groups = new Map<string, { material: THREE.MeshStandardMaterial; meshes: THREE.Mesh[] }>();
  const visit = (node: THREE.Object3D) => {
    if (!node.visible || node.userData.staticBatchRoot || movingNames.test(node.name)
      || ['seat', 'drawer'].includes(node.userData.labItem?.kind)) return;
    if (node instanceof THREE.Mesh) {
      const material = batchMaterial(node);
      if (material) {
        const key = signature(material, node);
        const group = groups.get(key) ?? { material, meshes: [] };
        group.meshes.push(node);
        groups.set(key, group);
      }
    }
    for (const child of node.children) visit(child);
  };
  for (const child of parent.children) visit(child);

  const batches: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] = [];
  const originals: THREE.Mesh[] = [];
  for (const group of groups.values()) {
    if (group.meshes.length < 2) continue;
    const geometries: THREE.BufferGeometry[] = [];
    for (const source of group.meshes) {
      const local = new THREE.Matrix4().multiplyMatrices(inverse, source.matrixWorld);
      const matrix = new THREE.Matrix4();
      const count = source instanceof THREE.InstancedMesh ? source.count : 1;
      const color = (source.material as THREE.MeshStandardMaterial).color;
      for (let i = 0; i < count; i++) {
        if (source instanceof THREE.InstancedMesh) {
          source.getMatrixAt(i, matrix); matrix.premultiply(local);
        } else matrix.copy(local);
        const geometry = source.geometry.index ? source.geometry.toNonIndexed() : source.geometry.clone();
        for (const attribute of Object.keys(geometry.attributes)) {
          if (!['position', 'normal'].includes(attribute)) geometry.deleteAttribute(attribute);
        }
        geometry.applyMatrix4(matrix);
        const rgb = new Float32Array(geometry.getAttribute('position').count * 3);
        for (let vertex = 0; vertex < rgb.length; vertex += 3) {
          rgb[vertex] = color.r; rgb[vertex + 1] = color.g; rgb[vertex + 2] = color.b;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
        geometries.push(geometry);
      }
    }
    const geometry = mergeGeometries(geometries);
    for (const source of geometries) source.dispose();
    if (!geometry) continue;
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const material = group.material.clone();
    material.color.setRGB(1, 1, 1); material.vertexColors = true;
    const first = group.meshes[0];
    const batch = new THREE.Mesh(geometry, material);
    batch.name = 'room-static-render-batch';
    batch.castShadow = first.castShadow; batch.receiveShadow = first.receiveShadow;
    batch.renderOrder = first.renderOrder; batch.layers.mask = first.layers.mask;
    batch.frustumCulled = first.frustumCulled;
    batch.raycast = () => {};
    parent.add(batch); batches.push(batch);
    for (const source of group.meshes) {
      source.userData.staticRenderProxy = true; source.visible = false; originals.push(source);
    }
  }
  parent.userData.renderBatch = { id, sourceMeshes: originals.length, drawBatches: batches.length, buildMs: performance.now() - started };
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    for (const source of originals) { source.visible = true; delete source.userData.staticRenderProxy; }
    for (const batch of batches) { parent.remove(batch); batch.geometry.dispose(); batch.material.dispose(); }
    delete parent.userData.renderBatch;
  };
}
