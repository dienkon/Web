import React from 'react';
import * as THREE from 'three';

interface RetortStandProps {
  position: [number, number, number];
  rodHeight?: number;
}

/**
 * RetortStand Component (K6.1)
 * Heavy cast-iron laboratory stand base with vertical chrome-plated rod.
 */
export const RetortStand: React.FC<RetortStandProps> = React.memo(function RetortStand({
  position,
  rodHeight = 3.6
}) {
  return (
    <group position={position}>
      {/* Heavy Rectangular Cast-Iron Base Plate */}
      <mesh position={[0, -0.11, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.2, 0.05, 0.8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.4} />
      </mesh>

      {/* Chrome Vertical Support Rod */}
      <mesh position={[0.42, rodHeight / 2 - 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.024, 0.024, rodHeight, 16]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.15} metalness={0.9} />
      </mesh>
    </group>
  );
});
