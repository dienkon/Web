import React from 'react';

export const HandwashSink: React.FC = () => {
  return (
    <group position={[3.2, 0, 4.2]}>
      {/* Stainless counter cabinet: 1.4m W x 0.6m D x 0.9m H */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.9, 0.6]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Inset stainless sink basin */}
      <mesh position={[0, 0.82, 0]}>
        <boxGeometry args={[0.7, 0.18, 0.42]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Sensor faucet */}
      <mesh position={[0, 1.05, 0.16]}>
        <cylinderGeometry args={[0.015, 0.015, 0.28]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Liquid soap dispenser */}
      <mesh position={[0.45, 0.96, 0.1]}>
        <cylinderGeometry args={[0.04, 0.04, 0.12]} />
        <meshStandardMaterial color="#38BDF8" roughness={0.2} />
      </mesh>

      {/* Paper towel dispenser on wall above */}
      <mesh position={[0, 1.5, 0.22]}>
        <boxGeometry args={[0.3, 0.35, 0.12]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
      </mesh>
    </group>
  );
};
