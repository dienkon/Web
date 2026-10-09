import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface TeacherNPCProps {
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
}

export const TeacherNPC: React.FC<TeacherNPCProps> = ({
  position = [0, 0, -4.2],
  rotationY = 0,
  scale = 0.88,
}) => {
  const { scene } = useGLTF('/teacher.glb');

  // Clone scene to avoid mutation across instances and ensure shadows are cast
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* 
        teacher.glb bounds: Y is -1 to +1 (height = 2 units).
        Positioning at Y = 1.0 * scale aligns the feet directly on the floor (Y = 0).
      */}
      <primitive 
        object={clonedScene} 
        position={[0, scale * 1.0, 0]} 
        scale={[scale, scale, scale]} 
      />
      
      {/* Subtle indicator beacon above Teacher */}
      <group position={[0, 2.1, 0]}>
        <pointLight intensity={0.4} distance={3} color="#38BDF8" />
      </group>
    </group>
  );
};

// Preload teacher.glb to avoid pop-in latency
useGLTF.preload('/teacher.glb');
