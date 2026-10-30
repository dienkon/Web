import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useInteractionStore } from '../../core/InteractionSystem';
import { playerCoords, useStore } from '../../store/useStore';
import { isSceneInputBlocked } from '../../systems/input/sceneInput';
import {
  advanceFocusLatch,
  createFocusLatch,
  FOCUS_POLICY,
  rankFocusCandidates,
} from '../../core/focus/FocusResolver';

export const InteractionManager: React.FC = () => {
  const { camera, scene } = useThree();
  const elapsed = useRef(0);
  const latch = useRef(createFocusLatch());
  const direction = useRef(new THREE.Vector3());
  const ray = useRef(new THREE.Raycaster());
  const intersections = useRef<THREE.Intersection[]>([]);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const game = useStore.getState();
    const store = useInteractionStore.getState();
    if (isSceneInputBlocked(game)) {
      latch.current = createFocusLatch();
      store.setFocus(null);
      if (game.activeInteraction !== null) game.setActiveInteraction(null);
      elapsed.current = 0;
      return;
    }
    if (elapsed.current < FOCUS_POLICY.sampleSeconds) return;
    const dt = elapsed.current;
    elapsed.current = 0;
    camera.getWorldDirection(direction.current);
    const ranked = rankFocusCandidates(
      Object.values(store.interactables),
      {
        eye: [camera.position.x, camera.position.y, camera.position.z],
        feet: playerCoords.position,
        forward: [direction.current.x, direction.current.y, direction.current.z],
      },
      latch.current.activeId,
    );
    ray.current.set(camera.position, direction.current);
    ray.current.far = 3.0;
    const visible = ranked.filter(entry => {
      const item = store.interactables[entry.candidate.id];
      if (!item.requireSurfaceHit || !item.object) return true;
      intersections.current.length = 0;
      ray.current.intersectObject(item.object, true, intersections.current);
      return intersections.current.some(hit => {
        let node: THREE.Object3D | null = hit.object;
        while (node) {
          if (!node.visible&&!node.userData.staticRenderProxy) return false;
          node = node.parent;
        }
        return true;
      });
    });
    // Compare the closest surface only when equipment has a plausible aim hit.
    // Transparent labels, floor rings and the player's held tool never block focus.
    const firstEquipment = visible.find(entry => entry.candidate.requireSurfaceHit);
    if (firstEquipment) {
      intersections.current.length = 0;
      ray.current.intersectObjects(scene.children, true, intersections.current);
      const firstSurface = intersections.current.find(hit => {
        const mesh = hit.object as THREE.Mesh;
        if (!mesh.isMesh || !mesh.visible&&!mesh.userData.staticRenderProxy) return false;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        if (materials.every(material => !material.visible || material.opacity < .4)) return false;
        let node: THREE.Object3D | null = hit.object;
        while (node) {
          if ((!node.visible&&!node.userData.staticRenderProxy) || node.userData.focusOverlay || node.name.startsWith('held-') || node.name === 'detected-item-green-ring') return false;
          node = node.parent;
        }
        return true;
      });
      if (firstSurface) {
        for (let index = visible.length - 1; index >= 0; index--) {
          const item = store.interactables[visible[index].candidate.id];
          if (!item.requireSurfaceHit || !item.object) continue;
          const targetHits: THREE.Intersection[] = [];
          ray.current.intersectObject(item.object, true, targetHits);
          // A clear vessel can be the intended target even when the first opaque
          // surface is the bench behind it. Only nearer geometry blocks access.
          if (targetHits.some(hit => hit.distance <= firstSurface.distance + .015)) continue;
          let ancestor: THREE.Object3D | null = firstSurface.object;
          while (ancestor && ancestor !== item.object) ancestor = ancestor.parent;
          if (!ancestor) visible.splice(index, 1);
        }
      }
    }
    const selectedId = advanceFocusLatch(
      latch.current,
      visible[0]?.candidate.id ?? null,
      dt,
      visible.some(entry => entry.candidate.id === latch.current.activeId),
    );
    const item = selectedId ? store.interactables[selectedId] : null;
    store.setFocus(selectedId, item?.aimPosition ?? item?.position, item?.radius);
    const label = item?.label ?? null;
    if (game.activeInteraction !== label) game.setActiveInteraction(label);
  });
  return null;
};
