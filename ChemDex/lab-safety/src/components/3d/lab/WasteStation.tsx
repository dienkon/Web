import React from 'react';

export const WasteStation: React.FC = () => {
  return (
    <group>
      {/* 1. General domestic waste bin (Grey) at (+5.3, 0, 3.0) */}
      <group position={[5.3, 0, 3.0]}>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.2, 0.17, 0.6, 24]} />
          <meshStandardMaterial color="#64748B" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.61, 0]}>
          <cylinderGeometry args={[0.21, 0.21, 0.04, 24]} />
          <meshStandardMaterial color="#475569" roughness={0.4} />
        </mesh>
      </group>

      {/* 2. Chemical liquid waste carboy drum (Yellow/Blue HDPE) at (+5.3, 0, 3.55) */}
      <group position={[5.3, 0, 3.55]}>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.6, 24]} />
          <meshStandardMaterial color="#0284C7" roughness={0.3} />
        </mesh>
        {/* Yellow screw cap with vapor vent */}
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.06, 16]} />
          <meshStandardMaterial color="#FACC15" roughness={0.3} />
        </mesh>
      </group>

      {/* 3. Broken Glass puncture-proof collection box (Green) at (+5.3, 0, 4.1) */}
      <group position={[5.3, 0, 4.1]}>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.38, 0.6, 0.38]} />
          <meshStandardMaterial color="#16A34A" roughness={0.5} />
        </mesh>
        {/* Glass symbol label */}
        <mesh position={[-0.2, 0.35, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.25, 0.18]} />
          <meshStandardMaterial color="#DCFCE7" />
        </mesh>
      </group>

      {/* 4. Sharps Disposal Container (Red) at (+4.65, 0, 3.6) */}
      <group position={[4.65, 0, 3.6]}>
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.5, 0.3]} />
          <meshStandardMaterial color="#DC2626" roughness={0.4} />
        </mesh>
        {/* One-way drop slit */}
        <mesh position={[0, 0.51, 0]}>
          <boxGeometry args={[0.18, 0.02, 0.05]} />
          <meshStandardMaterial color="#1E293B" />
        </mesh>
      </group>
    </group>
  );
};
