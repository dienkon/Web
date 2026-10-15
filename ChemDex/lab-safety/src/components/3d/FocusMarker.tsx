import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useInteractionStore } from '../../core/InteractionSystem';
import { useStore } from '../../store/useStore';
import { isSceneInputBlocked } from '../../systems/input/sceneInput';

export function FocusMarker() {
  const point = useInteractionStore(s => s.focusPoint);
  const radius = useInteractionStore(s => s.focusRadius);
  const blocked = useStore(isSceneInputBlocked);
  const root = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (root.current) root.current.quaternion.copy(camera.quaternion);
  });
  if (!point || blocked) return null;
  const size = Math.max(.13, Math.min(.48, radius));
  return <group ref={root} position={point} name="detected-item-green-ring" renderOrder={30}>
    <mesh raycast={() => null}>
      <ringGeometry args={[size, size + .015, 48]} />
      <meshBasicMaterial color="#15803d" transparent opacity={.95} depthWrite={false} depthTest={false} toneMapped={false} />
    </mesh>
    <mesh raycast={() => null}>
      <ringGeometry args={[size + .025, size + .03, 48]} />
      <meshBasicMaterial color="#86efac" transparent opacity={.9} depthWrite={false} depthTest={false} toneMapped={false} />
    </mesh>
  </group>;
}
