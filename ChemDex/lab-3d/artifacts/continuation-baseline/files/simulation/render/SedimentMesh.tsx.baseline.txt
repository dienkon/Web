import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SedimentBedState } from '../core/SimulationTypes';

export interface SedimentMeshProps {
  baseY: number;
  radius: number;
  sedimentBed?: SedimentBedState;
}

/**
 * 3D Physical sediment bed accumulating on the vessel floor
 */
export const SedimentMesh = React.memo(function SedimentMesh({
  baseY,
  radius,
  sedimentBed
}: SedimentMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const colorObj = useRef(new THREE.Color('#f8fafc'));

  useFrame(() => {
    if (!meshRef.current) return;
    const thickness = sedimentBed?.thickness || 0;
    const amount = sedimentBed?.amount_g || 0;

    if (amount <= 0.001 || thickness <= 0.001) {
      meshRef.current.visible = false;
      return;
    }

    meshRef.current.visible = true;
    meshRef.current.position.set(0, baseY + thickness * 0.5, 0);
    meshRef.current.scale.set(radius * 0.94, thickness, radius * 0.94);

    if (sedimentBed?.color) {
      colorObj.current.set(sedimentBed.color);
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.color.copy(colorObj.current);
        mat.roughness = sedimentBed.roughness ?? 0.85;
      }
    }
  });

  return (
    <mesh ref={meshRef} visible={false} renderOrder={3}>
      <cylinderGeometry args={[1, 1, 1, 32]} />
      <meshStandardMaterial
        color="#f8fafc"
        roughness={0.85}
        metalness={0.08}
        transparent
        opacity={0.96}
        depthWrite={false}
      />
    </mesh>
  );
});
