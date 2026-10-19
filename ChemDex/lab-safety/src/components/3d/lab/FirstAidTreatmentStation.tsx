import React from 'react';
const FIRST_AID_POS: [number, number, number] = [-9.85, 1.4, 1.0];
export function FirstAidTreatmentStation() {
  return (
    <group userData={{labItem:{title:'Bàn thực hành sơ cứu',kind:'firstAid'}}} position={FIRST_AID_POS}>
      {/* 1. Cabinet Base Shell */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.16, 0.55, 0.45]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Internal Cabinet Cavity */}
      <mesh position={[0.02, 0, 0]}>
        <boxGeometry args={[0.14, 0.5, 0.41]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.5} />
      </mesh>

      {/* Internal Shelves */}
      <mesh position={[0.02, 0, 0]}>
        <boxGeometry args={[0.12, 0.02, 0.4]} />
        <meshStandardMaterial color="#94A3B8" />
      </mesh>

      {/* Interior First Aid Items: Bottles, Gauze packs, Bandages */}
      <group position={[0.02, 0.08, -0.1]}>
        {/* Antiseptic Bottle */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.12, 12]} />
          <meshStandardMaterial color="#78350F" />
        </mesh>
        {/* Saline Bottle */}
        <mesh position={[0, 0, 0.07]}>
          <cylinderGeometry args={[0.025, 0.025, 0.14, 12]} />
          <meshStandardMaterial color="#38BDF8" transparent opacity={0.8} />
        </mesh>
        {/* Sterile Gauze Box */}
        <mesh position={[0, -0.16, 0.05]}>
          <boxGeometry args={[0.08, 0.08, 0.14]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        {/* Elastic Bandage Roll */}
        <mesh position={[0, -0.16, -0.08]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 0.07, 16]} />
          <meshStandardMaterial color="#FED7AA" />
        </mesh>
      </group>

      {/* 2. Animated Cabinet Door with Green Medical Cross */}
      <group rotation={[0, -.45, 0]} position={[0.08, 0, -0.22]}>
        {/* Door Pane */}
        <mesh position={[0, 0, 0.22]} castShadow>
          <boxGeometry args={[0.02, 0.54, 0.44]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.1} />
        </mesh>

        {/* Green Medical Cross Symbol */}
        <mesh position={[0.012, 0, 0.22]}>
          <boxGeometry args={[0.005, 0.2, 0.06]} />
          <meshBasicMaterial color="#16A34A" />
        </mesh>
        <mesh position={[0.012, 0, 0.22]}>
          <boxGeometry args={[0.005, 0.06, 0.2]} />
          <meshBasicMaterial color="#16A34A" />
        </mesh>

        {/* Door Handle */}
        <mesh position={[0.02, 0, 0.38]}>
          <boxGeometry args={[0.015, 0.08, 0.015]} />
          <meshStandardMaterial color="#64748B" metalness={0.9} />
        </mesh>
      </group>

    </group>
  );
}
