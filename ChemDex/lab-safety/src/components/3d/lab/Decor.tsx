import React from 'react';

export const LabDecor: React.FC = () => {
  return (
    <group>
      {/* 1. Large Whiteboard on North Wall at (0, 1.6, -4.42) */}
      <group position={[0, 1.6, -4.42]}>
        {/* Aluminum frame */}
        <mesh>
          <boxGeometry args={[3.6, 1.2, 0.04]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.8} />
        </mesh>
        {/* White writing surface */}
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[3.5, 1.1]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.1} />
        </mesh>
        {/* Pen tray */}
        <mesh position={[0, -0.6, 0.04]}>
          <boxGeometry args={[2.0, 0.02, 0.06]} />
          <meshStandardMaterial color="#64748B" />
        </mesh>
      </group>

      {/* 2. Teacher Demo Bench at (0, 0, -3.2) */}
      <group position={[0, 0, -3.2]}>
        <mesh position={[0, 0.875, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.05, 0.9]} />
          <meshStandardMaterial color="#1E2124" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.425, 0]} receiveShadow>
          <boxGeometry args={[2.3, 0.85, 0.8]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.6} />
        </mesh>
      </group>

      {/* 3. Teacher NPC at (0, 0, -2.4) */}
      <group position={[0, 0, -2.4]}>
        {/* Legs & Formal Trousers */}
        <mesh position={[-0.09, 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.76, 12]} />
          <meshStandardMaterial color="#1E293B" roughness={0.7} />
        </mesh>
        <mesh position={[0.09, 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.76, 12]} />
          <meshStandardMaterial color="#1E293B" roughness={0.7} />
        </mesh>
        {/* Leather Shoes */}
        <mesh position={[-0.09, 0.04, 0.03]} castShadow>
          <boxGeometry args={[0.12, 0.08, 0.24]} />
          <meshStandardMaterial color="#0F172A" roughness={0.4} />
        </mesh>
        <mesh position={[0.09, 0.04, 0.03]} castShadow>
          <boxGeometry args={[0.12, 0.08, 0.24]} />
          <meshStandardMaterial color="#0F172A" roughness={0.4} />
        </mesh>

        {/* Torso & White Lab Coat */}
        <mesh position={[0, 1.05, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.24, 0.7, 16]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.6} />
        </mesh>
        {/* Lab coat flaps / skirt */}
        <mesh position={[0, 0.65, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.27, 0.35, 16]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.6} />
        </mesh>
        {/* Shirt collar & Tie */}
        <mesh position={[0, 1.34, 0.12]}>
          <boxGeometry args={[0.1, 0.12, 0.04]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0, 1.25, 0.15]}>
          <boxGeometry args={[0.04, 0.18, 0.02]} />
          <meshStandardMaterial color="#B91C1C" />
        </mesh>
        {/* Teacher ID Badge */}
        <mesh position={[-0.12, 1.24, 0.16]}>
          <boxGeometry args={[0.07, 0.09, 0.01]} />
          <meshStandardMaterial color="#38BDF8" />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 1.44, 0]}>
          <cylinderGeometry args={[0.07, 0.075, 0.1, 16]} />
          <meshStandardMaterial color="#F7D3BA" roughness={0.6} />
        </mesh>

        {/* Head */}
        <mesh position={[0, 1.62, 0]}>
          <sphereGeometry args={[0.13, 20, 20]} />
          <meshStandardMaterial color="#F7D3BA" roughness={0.6} />
        </mesh>
        {/* Teacher Hair (neat side-parting dark hair) */}
        <mesh position={[0, 1.7, -0.02]}>
          <sphereGeometry args={[0.135, 16, 16]} />
          <meshStandardMaterial color="#27272A" roughness={0.8} />
        </mesh>
        {/* Teacher Eyes */}
        <mesh position={[-0.045, 1.63, 0.12]}>
          <sphereGeometry args={[0.016, 8, 8]} />
          <meshStandardMaterial color="#0F172A" />
        </mesh>
        <mesh position={[0.045, 1.63, 0.12]}>
          <sphereGeometry args={[0.016, 8, 8]} />
          <meshStandardMaterial color="#0F172A" />
        </mesh>
        {/* Glasses Frame & Lens */}
        <group position={[0, 1.63, 0.12]}>
          <mesh>
            <boxGeometry args={[0.18, 0.045, 0.02]} />
            <meshStandardMaterial color="#1E293B" metalness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <boxGeometry args={[0.16, 0.04, 0.01]} />
            <meshPhysicalMaterial transparent opacity={0.35} color="#38BDF8" roughness={0.1} />
          </mesh>
        </group>

        {/* Left Arm holding Teacher Clipboard */}
        <group position={[-0.26, 1.3, 0]}>
          <mesh position={[0.05, -0.22, 0.1]} rotation={[Math.PI / 4, 0, -Math.PI / 8]} castShadow>
            <cylinderGeometry args={[0.055, 0.05, 0.38, 12]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.6} />
          </mesh>
          {/* Clipboard */}
          <group position={[0.12, -0.32, 0.26]} rotation={[Math.PI / 3, -Math.PI / 6, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.22, 0.32, 0.015]} />
              <meshStandardMaterial color="#78350F" roughness={0.8} /> {/* Wooden board */}
            </mesh>
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[0.18, 0.26]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.4} /> {/* Sheet of paper */}
            </mesh>
            <mesh position={[0, 0.14, 0.015]}>
              <boxGeometry args={[0.08, 0.03, 0.02]} />
              <meshStandardMaterial color="#94A3B8" metalness={0.9} /> {/* Metal clip */}
            </mesh>
          </group>
        </group>

        {/* Right Arm hanging relaxed */}
        <group position={[0.26, 1.3, 0]}>
          <mesh position={[0, -0.25, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.05, 0.45, 12]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.5, 0]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial color="#F7D3BA" roughness={0.6} />
          </mesh>
        </group>
      </group>

      {/* 4. Projector Screen on North-East Wall at (3.2, 1.9, -4.42) */}
      <group position={[3.2, 1.9, -4.42]}>
        <mesh>
          <boxGeometry args={[1.8, 1.1, 0.03]} />
          <meshStandardMaterial color="#1E293B" />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[1.7, 1.0]} />
          <meshStandardMaterial color="#F1F5F9" roughness={0.8} />
        </mesh>
      </group>

      {/* 5. Analog Wall Clock at (-3.0, 2.5, -4.42) */}
      <group position={[-3.0, 2.5, -4.42]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.03, 32]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <ringGeometry args={[0.17, 0.18, 32]} />
          <meshStandardMaterial color="#0F172A" />
        </mesh>
      </group>

      {/* 6. Emergency Evacuation Map on West Wall at (-5.9, 1.5, 3.4) */}
      <group position={[-5.89, 1.5, 3.4]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[0.9, 0.65, 0.02]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
        </mesh>
        {/* Green header banner */}
        <mesh position={[0, 0.25, 0.015]}>
          <planeGeometry args={[0.85, 0.1]} />
          <meshStandardMaterial color="#16A34A" />
        </mesh>
      </group>

      {/* 7. Student Bag Rack at Entrance (-5.2, 0, 4.1) */}
      <group position={[-5.2, 0.25, 4.1]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.5, 0.35]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.6} />
        </mesh>
        {/* Backpack on shelf */}
        <mesh position={[-0.15, 0.38, 0]}>
          <boxGeometry args={[0.26, 0.32, 0.22]} />
          <meshStandardMaterial color="#0284C7" roughness={0.7} />
        </mesh>
      </group>

      {/* 8. 8 Overhead Fluorescent Ceiling LED Panels (1.2m x 0.3m) */}
      {[
        [-3.0, -2.25],
        [0.0, -2.25],
        [3.0, -2.25],
        [-3.0, 0.0],
        [3.0, 0.0],
        [-3.0, 2.25],
        [0.0, 2.25],
        [3.0, 2.25],
      ].map(([panelX, panelZ], i) => (
        <group key={i} position={[panelX, 3.18, panelZ]}>
          <mesh>
            <boxGeometry args={[1.2, 0.04, 0.3]} />
            <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
