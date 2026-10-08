import React from 'react';

export const SafetyWall: React.FC = () => {
  return (
    <group>
      {/* ================= 1. EMERGENCY BODY SHOWER & EYEWASH (-9.2, 0, -4.0) ================= */}
      <group position={[-9.2, 0, -4.0]}>
        {/* High-visibility yellow safety floor boundary & drainage grate */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <circleGeometry args={[0.9, 32]} />
          <meshStandardMaterial color="#EAB308" roughness={0.6} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
          <ringGeometry args={[0.2, 0.35, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>

        {/* Vertical Stainless Safety Green Pipe */}
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 3.0]} />
          <meshStandardMaterial color="#16A34A" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Overhead Drench Shower Head at Y = 2.4m */}
        <group position={[0, 2.4, 0.4]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.8]} />
            <meshStandardMaterial color="#16A34A" metalness={0.7} />
          </mesh>
          {/* Shower Rose Dispersal Head */}
          <mesh position={[0.4, -0.05, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.18, 0.12, 24]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.1} />
          </mesh>
          {/* High-visibility Triangular Pull Rod */}
          <mesh position={[0.4, -0.65, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 1.1]} />
            <meshStandardMaterial color="#EAB308" metalness={0.8} />
          </mesh>
        </group>

        {/* Dual Aerated Eyewash Bowl & Spray Heads at Y = 1.05m */}
        <group position={[0, 1.05, 0.35]}>
          {/* Stainless steel catch bowl */}
          <mesh>
            <cylinderGeometry args={[0.18, 0.14, 0.1, 24]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Dual Eyewash Nozzles with Yellow Dust Caps */}
          <mesh position={[-0.05, 0.07, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.04]} />
            <meshStandardMaterial color="#EAB308" />
          </mesh>
          <mesh position={[0.05, 0.07, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.04]} />
            <meshStandardMaterial color="#EAB308" />
          </mesh>
          {/* Push-to-Operate Actuator Flag */}
          <mesh position={[0.18, 0.05, 0]} rotation={[0, 0, -0.3]}>
            <boxGeometry args={[0.08, 0.08, 0.01]} />
            <meshStandardMaterial color="#EAB308" />
          </mesh>
        </group>
      </group>

      {/* ================= 2. FIRE EXTINGUISHERS CABINET (-9.85, 1.1, -1.5) ================= */}
      <group position={[-9.85, 1.1, -1.5]}>
        {/* Red Heavy Steel Cabinet Body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.26, 0.95, 0.55]} />
          <meshStandardMaterial color="#DC2626" roughness={0.4} />
        </mesh>
        {/* Clear Glass Inspection Window */}
        <mesh position={[0.135, 0, 0]}>
          <planeGeometry args={[0.48, 0.82]} />
          <meshPhysicalMaterial transparent opacity={0.35} color="#BAE6FD" roughness={0.1} />
        </mesh>
        {/* ABC Dry Powder Extinguisher Inside */}
        <group position={[0, -0.15, -0.12]}>
          <mesh>
            <cylinderGeometry args={[0.075, 0.075, 0.44]} />
            <meshStandardMaterial color="#DC2626" roughness={0.3} />
          </mesh>
          {/* Pressure Gauge */}
          <mesh position={[0.08, 0.16, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.01]} />
            <meshStandardMaterial color="#22C55E" />
          </mesh>
        </group>
        {/* CO2 Cylinder Extinguisher Inside (with black horn) */}
        <group position={[0, -0.15, 0.12]}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.07, 0.48]} />
            <meshStandardMaterial color="#B91C1C" roughness={0.3} />
          </mesh>
          {/* Large Black Flare Horn Nozzle */}
          <mesh position={[0.07, 0.15, 0]} rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.045, 0.015, 0.18]} />
            <meshStandardMaterial color="#0F172A" roughness={0.7} />
          </mesh>
        </group>
      </group>

      {/* ================= 3. FIRE BLANKET QUICK-PULL BOX (-9.85, 1.4, -0.4) ================= */}
      <group position={[-9.85, 1.4, -0.4]}>
        <mesh castShadow>
          <boxGeometry args={[0.14, 0.35, 0.38]} />
          <meshStandardMaterial color="#DC2626" roughness={0.4} />
        </mesh>
        {/* Quick Release Pull Straps */}
        <mesh position={[0.075, -0.22, -0.06]}>
          <boxGeometry args={[0.02, 0.1, 0.03]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0.075, -0.22, 0.06]}>
          <boxGeometry args={[0.02, 0.1, 0.03]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* ================= 4. WALL-MOUNTED FIRST AID STATION (-9.85, 1.4, 1.0) ================= */}
      <group position={[-9.85, 1.4, 1.0]}>
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.45, 0.45]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
        </mesh>
        {/* Green Medical Cross */}
        <mesh position={[0.085, 0, 0]}>
          <boxGeometry args={[0.01, 0.22, 0.07]} />
          <meshStandardMaterial color="#16A34A" />
        </mesh>
        <mesh position={[0.085, 0, 0]}>
          <boxGeometry args={[0.01, 0.07, 0.22]} />
          <meshStandardMaterial color="#16A34A" />
        </mesh>
      </group>

      {/* ================= 5. MOBILE CHEMICAL SPILL KIT CART (-9.3, 0, 3.0) ================= */}
      <group position={[-9.3, 0, 3.0]}>
        {/* High-visibility Yellow Wheeled Drum/Cart */}
        <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.28, 0.75, 24]} />
          <meshStandardMaterial color="#FACC15" roughness={0.4} />
        </mesh>
        {/* Screw Lid */}
        <mesh position={[0, 0.77, 0]}>
          <cylinderGeometry args={[0.31, 0.31, 0.05, 24]} />
          <meshStandardMaterial color="#CA8A04" />
        </mesh>
        {/* Heavy Rubber Wheels */}
        <mesh position={[0.26, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.05, 16]} />
          <meshStandardMaterial color="#1E293B" />
        </mesh>
        {/* Spill Scoop and Shovel Handle */}
        <mesh position={[0, 0.6, 0.25]} rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.5]} />
          <meshStandardMaterial color="#64748B" metalness={0.8} />
        </mesh>
      </group>

      {/* ================= 6. EMERGENCY EVACUATION FLOOR PLAN (-9.85, 1.8, 5.0) ================= */}
      <group position={[-9.85, 1.8, 5.0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[1.2, 0.85, 0.03]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.2} />
        </mesh>
        {/* Green Safety Header Banner */}
        <mesh position={[0, 0.35, 0.02]}>
          <planeGeometry args={[1.15, 0.12]} />
          <meshStandardMaterial color="#15803D" />
        </mesh>
        {/* Emergency LED Backlight */}
        <mesh position={[0, 0.48, 0.04]}>
          <boxGeometry args={[0.3, 0.04, 0.04]} />
          <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={0.6} />
        </mesh>
      </group>
    </group>
  );
};
