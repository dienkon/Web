import React from 'react';
import { TeacherNPC } from './TeacherNPC';

export const LabDecor: React.FC = () => {
  return (
    <group>
      {/* 1. Large Ceramic Whiteboard on North Wall at (0, 2.0, -7.42) */}
      <group position={[0, 2.0, -7.42]}>
        {/* Aluminum Frame */}
        <mesh>
          <boxGeometry args={[5.2, 1.8, 0.04]} />
          <meshStandardMaterial color="#64748B" metalness={0.8} />
        </mesh>
        {/* White Writing Surface */}
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[5.0, 1.65]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.12} />
        </mesh>
        {/* Pen & Eraser Tray */}
        <mesh position={[0, -0.9, 0.05]}>
          <boxGeometry args={[3.2, 0.03, 0.08]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      </group>

      {/* 2. Teacher Demonstration Bench at (0, 0, -5.5) */}
      <group position={[0, 0, -5.5]}>
        <mesh position={[0, 0.875, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.0, 0.05, 1.1]} />
          <meshStandardMaterial color="#1E2124" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.425, 0]} receiveShadow>
          <boxGeometry args={[2.9, 0.85, 1.0]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.6} />
        </mesh>
      </group>

      {/* 3. Teacher NPC using teacher.glb at (0, 0, -4.5) facing South */}
      <TeacherNPC position={[0, 0, -4.5]} rotationY={0} scale={0.88} />

      {/* 4. Chemical Safety GHS Pictogram Board on North Wall (+5.5, 2.0, -7.42) */}
      <group position={[5.5, 2.0, -7.42]}>
        <mesh>
          <boxGeometry args={[2.8, 1.6, 0.03]} />
          <meshStandardMaterial color="#1E293B" />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[2.7, 1.5]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.4} />
        </mesh>
        {/* GHS Red Diamonds Header */}
        <mesh position={[0, 0.65, 0.025]}>
          <planeGeometry args={[2.5, 0.14]} />
          <meshStandardMaterial color="#DC2626" />
        </mesh>
      </group>

      {/* 5. Periodic Table of Elements on North Wall (-5.5, 2.0, -7.42) */}
      <group position={[-5.5, 2.0, -7.42]}>
        <mesh>
          <boxGeometry args={[2.8, 1.6, 0.03]} />
          <meshStandardMaterial color="#1E293B" />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[2.7, 1.5]} />
          <meshStandardMaterial color="#F1F5F9" roughness={0.4} />
        </mesh>
        {/* Header Ribbon */}
        <mesh position={[0, 0.65, 0.025]}>
          <planeGeometry args={[2.5, 0.14]} />
          <meshStandardMaterial color="#0284C7" />
        </mesh>
      </group>

      {/* 6. Analog Wall Clock at (0, 3.2, -7.42) */}
      <group position={[0, 3.2, -7.42]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.03, 32]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <ringGeometry args={[0.21, 0.22, 32]} />
          <meshStandardMaterial color="#0F172A" />
        </mesh>
      </group>

      {/* 7. Student Bag & Locker Rack at Entrance (-8.2, 0, 6.8) */}
      <group position={[-8.2, 0, 6.8]}>
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.9, 0.45]} />
          <meshStandardMaterial color="#64748B" roughness={0.6} />
        </mesh>
        {/* Backpacks */}
        <mesh position={[-0.4, 1.05, 0]}>
          <boxGeometry args={[0.3, 0.35, 0.25]} />
          <meshStandardMaterial color="#0284C7" roughness={0.7} />
        </mesh>
        <mesh position={[0.4, 1.05, 0]}>
          <boxGeometry args={[0.3, 0.35, 0.25]} />
          <meshStandardMaterial color="#DC2626" roughness={0.7} />
        </mesh>
      </group>

      {/* 8. 16 Recessed Overhead LED Panel Luminaires (1.4m x 0.4m at Y = 3.78m) */}
      {[
        [-6.0, -5.0], [-2.0, -5.0], [2.0, -5.0], [6.0, -5.0],
        [-6.0, -1.8], [-2.0, -1.8], [2.0, -1.8], [6.0, -1.8],
        [-6.0, 1.8], [-2.0, 1.8], [2.0, 1.8], [6.0, 1.8],
        [-6.0, 5.0], [-2.0, 5.0], [2.0, 5.0], [6.0, 5.0],
      ].map(([panelX, panelZ], i) => (
        <group key={i} position={[panelX, 3.78, panelZ]}>
          <mesh>
            <boxGeometry args={[1.4, 0.04, 0.4]} />
            <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
