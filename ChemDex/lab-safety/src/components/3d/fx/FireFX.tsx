import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { fireSimulation } from '../../../core/fire/FireSim';

export const FireFX: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    // Animate flicker of flame mesh
    const time = performance.now() * 0.008;
    groupRef.current.children.forEach((child, idx) => {
      const scaleFlicker = 1.0 + Math.sin(time + idx * 2) * 0.15;
      child.scale.set(scaleFlicker, scaleFlicker * 1.1, scaleFlicker);
    });
  });

  return (
    <group ref={groupRef}>
      {fireSimulation.sources.map((source) =>
        source.cells.map((cell) => {
          if (cell.intensity <= 0.05) return null;
          return (
            <group key={cell.id} position={[cell.x, cell.y, cell.z]}>
              {/* Outer orange flame */}
              <mesh position={[0, 0.15 * cell.intensity, 0]}>
                <coneGeometry args={[0.12 * cell.intensity, 0.35 * cell.intensity, 12]} />
                <meshStandardMaterial
                  color="#EA580C"
                  emissive="#EA580C"
                  emissiveIntensity={2.0}
                  transparent
                  opacity={0.85}
                />
              </mesh>
              {/* Inner yellow hot core */}
              <mesh position={[0, 0.08 * cell.intensity, 0]}>
                <coneGeometry args={[0.06 * cell.intensity, 0.2 * cell.intensity, 12]} />
                <meshStandardMaterial
                  color="#FACC15"
                  emissive="#FDE047"
                  emissiveIntensity={3.0}
                  transparent
                  opacity={0.9}
                />
              </mesh>
              {/* Dynamic point light around fire */}
              <pointLight
                color="#F97316"
                intensity={1.2 * cell.intensity}
                distance={3.5}
                decay={2}
              />
            </group>
          );
        })
      )}
    </group>
  );
};
