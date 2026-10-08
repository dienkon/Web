import React from 'react';
import * as THREE from 'three';

export const LabBaseRoom: React.FC = () => {
  return (
    <group>
      {/* Floor: 12m (X) x 9m (Z), light grey non-slip tile texture/material */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 9]} />
        <meshStandardMaterial color="#C9CCCF" roughness={0.3} metalness={0.05} />
      </mesh>

      {/* Ceiling: Y = 3.2m, acoustic plaster */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.2, 0]}>
        <planeGeometry args={[12, 9]} />
        <meshStandardMaterial color="#F5F5F5" roughness={0.9} />
      </mesh>

      {/* South Wall (Z = +4.5): includes main entrance Door A at X = -4.0 */}
      {/* South Wall Left of door: X: -6.0 to -4.6 (width 1.4) */}
      <mesh position={[-5.3, 1.6, 4.5]} receiveShadow>
        <boxGeometry args={[1.4, 3.2, 0.2]} />
        <meshStandardMaterial color="#F2F0EA" roughness={0.8} />
      </mesh>
      {/* South Wall Above door: X: -4.0, Y: 2.1 to 3.2 (height 1.1) */}
      <mesh position={[-4.0, 2.65, 4.5]} receiveShadow>
        <boxGeometry args={[1.2, 1.1, 0.2]} />
        <meshStandardMaterial color="#F2F0EA" roughness={0.8} />
      </mesh>
      {/* South Wall Right of door: X: -3.4 to +6.0 (width 9.4) */}
      <mesh position={[1.3, 1.6, 4.5]} receiveShadow>
        <boxGeometry args={[9.4, 3.2, 0.2]} />
        <meshStandardMaterial color="#F2F0EA" roughness={0.8} />
      </mesh>

      {/* North Wall (Z = -4.5): includes emergency Exit B at X = -5.0 */}
      {/* North Wall Left of Exit B: X: -6.0 to -5.5 (width 0.5) */}
      <mesh position={[-5.75, 1.6, -4.5]} receiveShadow>
        <boxGeometry args={[0.5, 3.2, 0.2]} />
        <meshStandardMaterial color="#F2F0EA" roughness={0.8} />
      </mesh>
      {/* North Wall Above Exit B: X: -5.0, Y: 2.1 to 3.2 (height 1.1) */}
      <mesh position={[-5.0, 2.65, -4.5]} receiveShadow>
        <boxGeometry args={[1.0, 1.1, 0.2]} />
        <meshStandardMaterial color="#F2F0EA" roughness={0.8} />
      </mesh>
      {/* North Wall Right of Exit B: X: -4.5 to +6.0 (width 10.5) */}
      <mesh position={[0.75, 1.6, -4.5]} receiveShadow>
        <boxGeometry args={[10.5, 3.2, 0.2]} />
        <meshStandardMaterial color="#F2F0EA" roughness={0.8} />
      </mesh>

      {/* West Wall (X = -6.0): Emergency Safety Wall */}
      <mesh position={[-6.0, 1.6, 0]} receiveShadow>
        <boxGeometry args={[0.2, 3.2, 9]} />
        <meshStandardMaterial color="#F2F0EA" roughness={0.8} />
      </mesh>

      {/* East Wall (X = +6.0): Chemical Storage & Waste Wall */}
      <mesh position={[6.0, 1.6, 0]} receiveShadow>
        <boxGeometry args={[0.2, 3.2, 9]} />
        <meshStandardMaterial color="#F2F0EA" roughness={0.8} />
      </mesh>

      {/* Base tile wainscoting (1.2m high white tile strip around lower walls) */}
      <mesh position={[0, 0.6, 4.39]}>
        <planeGeometry args={[11.8, 1.2]} />
        <meshStandardMaterial color="#F7F7F5" roughness={0.2} metalness={0.05} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]} position={[0, 0.6, -4.39]}>
        <planeGeometry args={[11.8, 1.2]} />
        <meshStandardMaterial color="#F7F7F5" roughness={0.2} metalness={0.05} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-5.89, 0.6, 0]}>
        <planeGeometry args={[8.8, 1.2]} />
        <meshStandardMaterial color="#F7F7F5" roughness={0.2} metalness={0.05} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[5.89, 0.6, 0]}>
        <planeGeometry args={[8.8, 1.2]} />
        <meshStandardMaterial color="#F7F7F5" roughness={0.2} metalness={0.05} />
      </mesh>

      {/* Door A (Main Entrance - South Wall at X = -4.0, Z = 4.5) */}
      <group position={[-4.0, 0, 4.45]}>
        {/* Door frame */}
        <mesh position={[0, 1.05, 0]}>
          <boxGeometry args={[1.2, 2.1, 0.08]} />
          <meshStandardMaterial color="#E8ECEF" roughness={0.4} />
        </mesh>
        {/* Door glass window */}
        <mesh position={[0, 1.5, 0.01]}>
          <boxGeometry args={[0.25, 0.5, 0.09]} />
          <meshPhysicalMaterial transparent opacity={0.35} roughness={0.1} color="#C0E8F9" />
        </mesh>
        {/* Panic bar (push bar) */}
        <mesh position={[0, 1.0, -0.06]}>
          <boxGeometry args={[0.9, 0.06, 0.04]} />
          <meshStandardMaterial color="#B0B5B9" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Door B (Emergency Exit - North Wall at X = -5.0, Z = -4.5) */}
      <group position={[-5.0, 0, -4.45]}>
        <mesh position={[0, 1.05, 0]}>
          <boxGeometry args={[1.0, 2.1, 0.08]} />
          <meshStandardMaterial color="#E8ECEF" roughness={0.4} />
        </mesh>
        {/* Emergency Push Bar (Red) */}
        <mesh position={[0, 1.0, 0.06]}>
          <boxGeometry args={[0.8, 0.06, 0.04]} />
          <meshStandardMaterial color="#E53E3E" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* Glowing EXIT Sign above Door B */}
        <mesh position={[0, 2.4, 0.06]}>
          <boxGeometry args={[0.5, 0.22, 0.04]} />
          <meshStandardMaterial color="#38A169" emissive="#38A169" emissiveIntensity={0.6} />
        </mesh>
      </group>

      {/* Yellow/Black hazard stripe floor decal at Emergency Exit Zone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-5.0, 0.005, -3.5]}>
        <planeGeometry args={[1.2, 1.2]} />
        <meshStandardMaterial color="#ECC94B" roughness={0.6} />
      </mesh>
    </group>
  );
};
