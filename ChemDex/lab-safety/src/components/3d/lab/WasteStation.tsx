import React from 'react';

export const WasteStation: React.FC = () => {
  return (
    <group position={[8.8, 0, 5.0]}>
      {/* 1. Yellow Biohazard & Chemical Contaminated Solid Waste Can (with foot pedal) */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.25, 0.22, 0.7, 24]} />
          <meshStandardMaterial color="#EAB308" roughness={0.4} />
        </mesh>
        {/* Foot Pedal */}
        <mesh position={[0, 0.04, 0.24]}>
          <boxGeometry args={[0.12, 0.02, 0.08]} />
          <meshStandardMaterial color="#1E293B" metalness={0.8} />
        </mesh>
        {/* Biohazard Symbol Label */}
        <mesh position={[-0.23, 0.45, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.22, 0.16]} />
          <meshStandardMaterial color="#1E293B" />
        </mesh>
      </group>

      {/* 2. Blue Organic Solvent / Liquid Waste Carboy Drum (with vapor trap funnel) */}
      <group position={[0, 0, 0.8]}>
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.24, 0.24, 0.7, 24]} />
          <meshStandardMaterial color="#0284C7" roughness={0.35} />
        </mesh>
        {/* Large Wide Funnel with Vapor Trap Lid */}
        <mesh position={[0, 0.75, 0]}>
          <coneGeometry args={[0.16, 0.12, 20]} />
          <meshStandardMaterial color="#FACC15" roughness={0.4} />
        </mesh>
      </group>

      {/* 3. Broken Glass & Puncture-Proof Container (Green Poly) */}
      <group position={[0, 0, -0.8]}>
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.42, 0.7, 0.42]} />
          <meshStandardMaterial color="#15803D" roughness={0.4} />
        </mesh>
        <mesh position={[-0.22, 0.45, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.28, 0.2]} />
          <meshStandardMaterial color="#DCFCE7" />
        </mesh>
      </group>

      {/* 4. Red Sharps Disposal Box */}
      <group position={[-0.6, 0, 0]}>
        <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.32, 0.56, 0.32]} />
          <meshStandardMaterial color="#DC2626" roughness={0.4} />
        </mesh>
        {/* Drop Slit */}
        <mesh position={[0, 0.57, 0]}>
          <boxGeometry args={[0.2, 0.02, 0.06]} />
          <meshStandardMaterial color="#1E293B" />
        </mesh>
      </group>
    </group>
  );
};
