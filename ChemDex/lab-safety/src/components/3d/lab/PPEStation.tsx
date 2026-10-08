import React from 'react';
import { useStore } from '../../../store/useStore';

export const PPEStation: React.FC = () => {
  const player = useStore((s) => s.player);
  const equipItem = useStore((s) => s.equipItem);
  const setActiveInteraction = useStore((s) => s.setActiveInteraction);

  return (
    <group position={[-1.0, 0, 4.25]}>
      {/* Outer steel cabinet structure: 2.4m W x 0.5m D x 1.9m H */}
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.5, 1.9]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.2} roughness={0.5} />
      </mesh>

      {/* Internal shelves opening */}
      <mesh position={[0, 0.95, -0.05]}>
        <boxGeometry args={[2.3, 0.45, 1.8]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.7} />
      </mesh>

      {/* 3 Lab Coats hanging: Left section (-0.8, -0.4, 0.0) */}
      <group position={[-0.8, 1.2, -0.05]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.7]} />
          <meshStandardMaterial color="#64748B" metalness={0.8} />
        </mesh>
        {/* Lab coat models hanging */}
        <mesh position={[-0.15, -0.35, 0]}>
          <boxGeometry args={[0.2, 0.15, 0.7]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
        </mesh>
        <mesh position={[0.15, -0.35, 0]}>
          <boxGeometry args={[0.2, 0.15, 0.7]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
        </mesh>
      </group>

      {/* Safety Goggles display: Middle section (0.0, 1.1) */}
      <group position={[0.0, 1.1, 0.15]}>
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[0.6, 0.25, 0.02]} />
          <meshStandardMaterial color="#94A3B8" />
        </mesh>
        {/* 3 Pairs of safety goggles */}
        {[-0.2, 0.0, 0.2].map((xOffset, idx) => (
          <mesh key={idx} position={[xOffset, 0.05, 0.0]}>
            <boxGeometry args={[0.14, 0.08, 0.05]} />
            <meshPhysicalMaterial transparent opacity={0.6} roughness={0.1} color="#38BDF8" />
          </mesh>
        ))}
      </group>

      {/* Nitrile Glove Boxes (S/M/L): Right section (0.7, 1.1) */}
      <group position={[0.7, 1.1, 0.15]}>
        <mesh position={[-0.15, 0.04, 0]}>
          <boxGeometry args={[0.12, 0.2, 0.08]} />
          <meshStandardMaterial color="#3B82F6" roughness={0.4} /> {/* Blue box */}
        </mesh>
        <mesh position={[0.05, 0.04, 0]}>
          <boxGeometry args={[0.12, 0.2, 0.08]} />
          <meshStandardMaterial color="#A855F7" roughness={0.4} /> {/* Purple box */}
        </mesh>
      </group>

      {/* Face Mask Box */}
      <mesh position={[0.7, 0.7, 0.15]}>
        <boxGeometry args={[0.22, 0.15, 0.1]} />
        <meshStandardMaterial color="#0EA5E9" roughness={0.4} />
      </mesh>

      {/* Mirror on wall right above/adjacent to PPE station (-1.0, 1.45, 4.45) */}
      <group position={[0, 1.45, 0.24]}>
        <mesh>
          <boxGeometry args={[1.0, 0.02, 0.9]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Mirror reflective surface */}
        <mesh position={[0, 0.015, 0]}>
          <planeGeometry args={[0.96, 0.86]} />
          <meshStandardMaterial color="#DCE3EA" metalness={0.95} roughness={0.05} />
        </mesh>
      </group>
    </group>
  );
};
