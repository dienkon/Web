import React from 'react';

export const HandwashSink: React.FC = () => {
  return (
    <group position={[3.5, 0, 7.1]}>
      {/* Heavy Stainless Steel Counter Cabinet: 2.0m W x 0.6m D x 0.9m H */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.9, 0.6]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Dual Deep Stainless Steel Sink Basins */}
      <mesh position={[-0.45, 0.82, 0]}>
        <boxGeometry args={[0.7, 0.18, 0.45]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0.45, 0.82, 0]}>
        <boxGeometry args={[0.7, 0.18, 0.45]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Automatic Touchless Sensor Faucets */}
      <mesh position={[-0.45, 1.08, 0.16]}>
        <cylinderGeometry args={[0.015, 0.015, 0.32]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.1} />
      </mesh>
      <mesh position={[0.45, 1.08, 0.16]}>
        <cylinderGeometry args={[0.015, 0.015, 0.32]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Antibacterial Soap Dispensers */}
      <mesh position={[-0.85, 1.35, 0.22]}>
        <boxGeometry args={[0.15, 0.25, 0.12]} />
        <meshStandardMaterial color="#0284C7" roughness={0.3} />
      </mesh>
      <mesh position={[0.85, 1.35, 0.22]}>
        <boxGeometry args={[0.15, 0.25, 0.12]} />
        <meshStandardMaterial color="#0284C7" roughness={0.3} />
      </mesh>

      {/* Paper Towel Dispenser on Wall */}
      <mesh position={[0, 1.55, 0.24]}>
        <boxGeometry args={[0.35, 0.42, 0.14]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.4} />
      </mesh>
    </group>
  );
};
