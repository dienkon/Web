import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../../store/useStore';

interface SmokeProps {
  position?: [number, number, number];
  density?: number;
}

export const SmokeFX: React.FC<SmokeProps> = ({ position = [0, 2.4, 0], density = 0.45 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const settings = useStore(s => s.settings);

  const visible = useMemo(() => settings.graphicsQuality !== 'low' && settings.graphicsQuality !== 'potato' && density > 0.05, [settings.graphicsQuality, density]);
  if (!visible) return null;

  const safe = settings.safeEffects || settings.reduceMotion;
  const opacity = Math.min(0.28, density * 0.45) * (safe ? 0.55 : 1);

  useFrame(({ clock }) => {
    if (!meshRef.current || safe) return;
    const t = clock.elapsedTime * 0.18;
    meshRef.current.position.y = position[1] + Math.sin(t) * 0.08;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.opacity = opacity + Math.sin(t * 0.7) * 0.04;
  });

  return (
    <mesh ref={meshRef} position={new THREE.Vector3(...position)}>
      <planeGeometry args={[8, 5]} />
      <meshStandardMaterial color="#8A8F98" transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
};
