import React from 'react';

export const SafetyWall: React.FC = () => {
  return (
    <group>
      {/* 1. Fire Extinguisher Wall Cabinet at (-5.82, 1.0, -0.8) */}
      <group position={[-5.82, 1.0, -0.8]}>
        {/* Red metal cabinet body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.25, 0.9, 0.45]} />
          <meshStandardMaterial color="#DC2626" roughness={0.4} />
        </mesh>
        {/* Glass door window */}
        <mesh position={[0.13, 0, 0]}>
          <planeGeometry args={[0.38, 0.78]} />
          <meshPhysicalMaterial transparent opacity={0.4} color="#BAE6FD" roughness={0.1} />
        </mesh>
        {/* Extinguisher model inside: ABC Powder */}
        <group position={[0, -0.15, -0.1]}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.07, 0.42]} />
            <meshStandardMaterial color="#DC2626" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.08]} />
            <meshStandardMaterial color="#1E293B" metalness={0.8} />
          </mesh>
        </group>
        {/* Extinguisher model inside: CO2 Cylinder */}
        <group position={[0, -0.15, 0.1]}>
          <mesh>
            <cylinderGeometry args={[0.065, 0.065, 0.44]} />
            <meshStandardMaterial color="#B91C1C" roughness={0.3} />
          </mesh>
          {/* Black horn nozzle */}
          <mesh position={[0.06, 0.15, 0]} rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.04, 0.015, 0.16]} />
            <meshStandardMaterial color="#0F172A" roughness={0.6} />
          </mesh>
        </group>
      </group>

      {/* 2. Fire Blanket Pack at (-5.82, 1.35, 0.3) */}
      <group position={[-5.82, 1.35, 0.3]}>
        <mesh castShadow>
          <boxGeometry args={[0.12, 0.3, 0.35]} />
          <meshStandardMaterial color="#EF4444" roughness={0.5} />
        </mesh>
        {/* Pull tapes */}
        <mesh position={[0.06, -0.18, -0.05]}>
          <boxGeometry args={[0.02, 0.08, 0.03]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0.06, -0.18, 0.05]}>
          <boxGeometry args={[0.02, 0.08, 0.03]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* 3. First Aid Cabinet at (-5.82, 1.5, 1.2) */}
      <group position={[-5.82, 1.5, 1.2]}>
        <mesh castShadow>
          <boxGeometry args={[0.15, 0.4, 0.4]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.4} />
        </mesh>
        {/* Green Cross Symbol */}
        <mesh position={[0.08, 0, 0]}>
          <boxGeometry args={[0.01, 0.18, 0.06]} />
          <meshStandardMaterial color="#16A34A" />
        </mesh>
        <mesh position={[0.08, 0, 0]}>
          <boxGeometry args={[0.01, 0.06, 0.18]} />
          <meshStandardMaterial color="#16A34A" />
        </mesh>
      </group>

      {/* 4. Chemical Spill Kit Drum at (-5.8, 0, 2.0) */}
      <group position={[-5.8, 0.3, 2.0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.25, 0.25, 0.6]} />
          <meshStandardMaterial color="#FACC15" roughness={0.4} /> {/* Yellow drum */}
        </mesh>
        {/* Lid */}
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.04]} />
          <meshStandardMaterial color="#CA8A04" />
        </mesh>
      </group>

      {/* 5. Emergency Body Shower at (-5.2, 0, -3.3) */}
      <group position={[-5.2, 0, -3.3]}>
        {/* Safety Yellow/Black hazard floor base */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <circleGeometry args={[0.7, 32]} />
          <meshStandardMaterial color="#EAB308" roughness={0.6} />
        </mesh>
        {/* Main stainless vertical pipe */}
        <mesh position={[0, 1.15, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 2.3]} />
          <meshStandardMaterial color="#22C55E" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Overhead horizontal pipe & shower head */}
        <mesh position={[0.25, 2.25, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.5]} />
          <meshStandardMaterial color="#22C55E" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0.5, 2.2, 0]}>
          <coneGeometry args={[0.15, 0.1, 24]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Pull triangle lever */}
        <mesh position={[0.4, 1.9, 0]}>
          <torusGeometry args={[0.07, 0.01, 8, 16]} />
          <meshStandardMaterial color="#EAB308" />
        </mesh>
      </group>

      {/* 6. Eyewash Station at (-4.6, 0, -3.8) */}
      <group position={[-4.6, 0, -3.8]}>
        {/* Pedestal stand */}
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.05, 0.06, 0.9]} />
          <meshStandardMaterial color="#16A34A" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Stainless bowl */}
        <mesh position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.22, 0.16, 0.12, 24]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Dual water aerator nozzles */}
        <mesh position={[-0.05, 0.98, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.06]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.8} />
        </mesh>
        <mesh position={[0.05, 0.98, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.06]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.8} />
        </mesh>
        {/* Push flag handle */}
        <mesh position={[0.18, 0.94, 0]} rotation={[0, 0, -Math.PI / 6]}>
          <boxGeometry args={[0.08, 0.06, 0.01]} />
          <meshStandardMaterial color="#EAB308" />
        </mesh>
      </group>
    </group>
  );
};
