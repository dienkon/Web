import React from 'react';

export const LabBaseRoom: React.FC = () => {
  return (
    <group>
      {/* ================= 1. FLOOR (20m x 15m) ================= */}
      {/* Light grey non-slip epoxy terrazzo floor with realistic grid lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 15]} />
        <meshStandardMaterial color="#D3D7DC" roughness={0.25} metalness={0.08} />
      </mesh>

      {/* Decorative Floor Perimeter Border (Darker slate trim) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[9.5, 9.9, 4, 1, 0, Math.PI * 2]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.4} />
      </mesh>

      {/* ================= 2. CEILING (20m x 15m, Y = 3.8m) ================= */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.8, 0]}>
        <planeGeometry args={[20, 15]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.9} />
      </mesh>

      {/* Exposed Industrial Ventilation Ducts (Running along ceiling at Y = 3.65) */}
      <group position={[0, 3.65, -1.5]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.22, 19.6, 24]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
      <group position={[0, 3.65, 2.5]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.22, 19.6, 24]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Fire Sprinkler Nozzles & Smoke Detectors */}
      {[
        [-6, -4], [0, -4], [6, -4],
        [-6, 0], [0, 0], [6, 0],
        [-6, 4], [0, 4], [6, 4],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 3.77, z]}>
          {/* Smoke detector disc */}
          <mesh>
            <cylinderGeometry args={[0.12, 0.12, 0.04, 16]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
          </mesh>
          {/* Small green status LED */}
          <mesh position={[0.08, -0.02, 0]}>
            <sphereGeometry args={[0.015]} />
            <meshBasicMaterial color="#22C55E" />
          </mesh>
        </group>
      ))}

      {/* ================= 3. SOUTH WALL (Z = +7.5, Width = 20m) ================= */}
      {/* Wall sections with Main Entrance at X = -6.0 and Secondary Exit at X = +6.0 */}
      {/* Left section: X: -10 to -7.1 */}
      <mesh position={[-8.55, 1.9, 7.5]} receiveShadow>
        <boxGeometry args={[2.9, 3.8, 0.2]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.8} />
      </mesh>
      {/* Above Main Door: X: -6.0, Y: 2.4 to 3.8 */}
      <mesh position={[-6.0, 3.1, 7.5]} receiveShadow>
        <boxGeometry args={[2.2, 1.4, 0.2]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.8} />
      </mesh>
      {/* Middle section: X: -4.9 to +4.9 */}
      <mesh position={[0, 1.9, 7.5]} receiveShadow>
        <boxGeometry args={[9.8, 3.8, 0.2]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.8} />
      </mesh>
      {/* Above Secondary Door: X: +6.0, Y: 2.4 to 3.8 */}
      <mesh position={[6.0, 3.1, 7.5]} receiveShadow>
        <boxGeometry args={[2.2, 1.4, 0.2]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.8} />
      </mesh>
      {/* Right section: X: +7.1 to +10 */}
      <mesh position={[8.55, 1.9, 7.5]} receiveShadow>
        <boxGeometry args={[2.9, 3.8, 0.2]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.8} />
      </mesh>

      {/* ================= 4. NORTH WALL (Z = -7.5, Width = 20m) ================= */}
      {/* Features 4 large double-glazed windows letting sunlight stream in */}
      <mesh position={[0, 1.9, -7.5]} receiveShadow>
        <boxGeometry args={[20, 3.8, 0.2]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.8} />
      </mesh>
      {/* 4 Panoramic High Windows at Z = -7.4 */}
      {[-6.5, -2.2, 2.2, 6.5].map((winX, i) => (
        <group key={i} position={[winX, 2.4, -7.4]}>
          {/* Aluminum Window Frame */}
          <mesh>
            <boxGeometry args={[2.8, 1.6, 0.08]} />
            <meshStandardMaterial color="#64748B" metalness={0.8} />
          </mesh>
          {/* Upper Clear Glass */}
          <mesh position={[0, 0.2, 0.01]}>
            <planeGeometry args={[2.6, 1.0]} />
            <meshPhysicalMaterial transparent opacity={0.3} color="#E0F2FE" roughness={0.05} />
          </mesh>
          {/* Lower Frosted Safety Glass */}
          <mesh position={[0, -0.45, 0.01]}>
            <planeGeometry args={[2.6, 0.4]} />
            <meshPhysicalMaterial transparent opacity={0.7} color="#F8FAFC" roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* ================= 5. WEST WALL (X = -10.0, Depth = 15m) ================= */}
      <mesh position={[-10.0, 1.9, 0]} receiveShadow>
        <boxGeometry args={[0.2, 3.8, 15]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.8} />
      </mesh>

      {/* ================= 6. EAST WALL (X = +10.0, Depth = 15m) ================= */}
      <mesh position={[10.0, 1.9, 0]} receiveShadow>
        <boxGeometry args={[0.2, 3.8, 15]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.8} />
      </mesh>

      {/* ================= 7. WAINSCOTING (1.4m high protective ceramic base) ================= */}
      <mesh position={[0, 0.7, 7.39]}>
        <planeGeometry args={[19.8, 1.4]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.2} metalness={0.05} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]} position={[0, 0.7, -7.39]}>
        <planeGeometry args={[19.8, 1.4]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.2} metalness={0.05} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-9.89, 0.7, 0]}>
        <planeGeometry args={[14.8, 1.4]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.2} metalness={0.05} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[9.89, 0.7, 0]}>
        <planeGeometry args={[14.8, 1.4]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.2} metalness={0.05} />
      </mesh>

      {/* ================= 8. MAIN ENTRANCE DOUBLE DOORS (X = -6.0, Z = 7.42) ================= */}
      <group position={[-6.0, 0, 7.42]}>
        {/* Door Frame */}
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[2.1, 2.4, 0.08]} />
          <meshStandardMaterial color="#334155" roughness={0.4} />
        </mesh>
        {/* Left Door Leaf */}
        <mesh position={[-0.5, 1.18, 0]}>
          <boxGeometry args={[0.96, 2.32, 0.05]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.5} />
        </mesh>
        {/* Right Door Leaf */}
        <mesh position={[0.5, 1.18, 0]}>
          <boxGeometry args={[0.96, 2.32, 0.05]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.5} />
        </mesh>
        {/* Wire-reinforced glass vision panels */}
        <mesh position={[-0.5, 1.45, 0.01]}>
          <boxGeometry args={[0.3, 0.75, 0.06]} />
          <meshPhysicalMaterial transparent opacity={0.4} roughness={0.1} color="#BAE6FD" />
        </mesh>
        <mesh position={[0.5, 1.45, 0.01]}>
          <boxGeometry args={[0.3, 0.75, 0.06]} />
          <meshPhysicalMaterial transparent opacity={0.4} roughness={0.1} color="#BAE6FD" />
        </mesh>
        {/* Stainless Steel Panic Push Bars */}
        <mesh position={[-0.5, 1.0, -0.05]}>
          <boxGeometry args={[0.75, 0.06, 0.04]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0.5, 1.0, -0.05]}>
          <boxGeometry args={[0.75, 0.06, 0.04]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Illuminated Green EXIT Sign above door */}
        <group position={[0, 2.5, -0.06]}>
          <mesh>
            <boxGeometry args={[0.65, 0.22, 0.06]} />
            <meshStandardMaterial color="#14532D" />
          </mesh>
          <mesh position={[0, 0, 0.032]}>
            <planeGeometry args={[0.58, 0.16]} />
            <meshBasicMaterial color="#22C55E" />
          </mesh>
        </group>
      </group>

      {/* ================= 9. SECONDARY EXIT DOOR (X = +6.0, Z = 7.42) ================= */}
      <group position={[6.0, 0, 7.42]}>
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[2.1, 2.4, 0.08]} />
          <meshStandardMaterial color="#334155" roughness={0.4} />
        </mesh>
        <mesh position={[-0.5, 1.18, 0]}>
          <boxGeometry args={[0.96, 2.32, 0.05]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.5} />
        </mesh>
        <mesh position={[0.5, 1.18, 0]}>
          <boxGeometry args={[0.96, 2.32, 0.05]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.5} />
        </mesh>
        <group position={[0, 2.5, -0.06]}>
          <mesh>
            <boxGeometry args={[0.65, 0.22, 0.06]} />
            <meshStandardMaterial color="#14532D" />
          </mesh>
          <mesh position={[0, 0, 0.032]}>
            <planeGeometry args={[0.58, 0.16]} />
            <meshBasicMaterial color="#22C55E" />
          </mesh>
        </group>
      </group>
    </group>
  );
};
