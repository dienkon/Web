import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { MeshBasicMaterial } from 'three';
import { useAppStore } from '../store/useAppStore';

interface HotPlateProps {
  position: [number, number, number];
  plateId?: string;
  temperature_c?: number;
  setPoint_c?: number;
  stirrerRpm?: number;
  isOn?: boolean;
}

/**
 * HotPlate & Magnetic Stirrer Component (K6.9)
 * Laboratory ceramic-top heating plate with magnetic stirring speed controls.
 */
export const HotPlate: React.FC<HotPlateProps> = React.memo(function HotPlate({
  position,
  plateId,
  temperature_c = 25,
  setPoint_c = 100,
  stirrerRpm = 450,
  isOn = false
}) {
  const led = useRef<MeshBasicMaterial>(null);
  useFrame(() => {
    if (!led.current) return;
    const state = plateId ? useAppStore.getState().vessels[plateId] : undefined;
    led.current.color.set(state?.hotPlate?.isOn ?? isOn ? '#f97316' : (state?.temperature_c ?? temperature_c) > 50 ? '#ef4444' : '#334155');
  });

  return (
    <group position={position}>
      {/* Main Base Housing */}
      <mesh position={[0, 0.12, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.5, 0.24, 1.5]} />
        <meshStandardMaterial color="#334155" roughness={0.35} metalness={0.6} />
      </mesh>

      {/* Chemical-Resistant Ceramic Top Plate */}
      <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.4, 0.04, 1.4]} />
        <meshStandardMaterial 
          color="#f8fafc"
          roughness={0.2} 
        />
      </mesh>

      {/* Front Control Dials */}
      <group position={[0, 0.12, 0.76]}>
        {/* Temp Dial */}
        <mesh position={[-0.35, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.04, 16]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Stirrer RPM Dial */}
        <mesh position={[0.35, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.04, 16]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* LED Digital Display */}
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.32, 0.1, 0.02]} />
          <meshBasicMaterial ref={led} color="#334155" />
        </mesh>
      </group>
    </group>
  );
});
