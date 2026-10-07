import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { LAB_PHYSICS, calculateVesselMass, getBalanceDisplayValue } from '../../../engine/interactionEngine';
import { labSound } from '../../../utils/audio';

export const InteractiveDigitalBalance = React.memo(function InteractiveDigitalBalance({
  position = LAB_PHYSICS.BALANCE_POSITION,
}: {
  position?: [number, number, number];
}) {
  const vessels = useAppStore(state => state.vessels);
  const language = useAppStore(state => state.language);
  const [tareMass, setTareMass] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Measure which vessel is currently resting on the balance pan
  const placedVessel = useMemo(() => {
    const [bx, , bz] = position;
    for (const v of Object.values(vessels)) {
      const dx = v.position[0] - bx;
      const dz = v.position[2] - bz;
      if (Math.hypot(dx, dz) < LAB_PHYSICS.BALANCE_PAN_RADIUS) {
        return v;
      }
    }
    return null;
  }, [vessels, position]);

  const rawMass = placedVessel ? calculateVesselMass(placedVessel) : 0.0;
  const netMass = Math.max(0, rawMass - tareMass);

  const displayRef = useRef<any>(null);
  const settledMassRef = useRef(netMass);
  const settleProgressRef = useRef(1.0);

  // When weight changes, initiate brief 0.6s stabilization jitter
  const lastTargetMass = useRef(netMass);
  if (Math.abs(lastTargetMass.current - netMass) > 0.05) {
    lastTargetMass.current = netMass;
    settleProgressRef.current = 0;
  }

  useFrame((state, delta) => {
    settleProgressRef.current = Math.min(1.0, settleProgressRef.current + delta * 2.2);
    const isSettled = settleProgressRef.current >= 0.95;
    settledMassRef.current = THREE.MathUtils.lerp(settledMassRef.current, netMass, delta * 8.0);

    if (displayRef.current) {
      const text = getBalanceDisplayValue(settledMassRef.current, state.clock.elapsedTime, isSettled);
      displayRef.current.text = text;
    }
  });

  const handleTare = (e: any) => {
    e.stopPropagation();
    labSound.playTap();
    setTareMass(rawMass);
    settleProgressRef.current = 0;
  };

  return (
    <group position={position}>
      {/* Precision Balance Cast Alloy Base Housing */}
      <mesh position={[0, 0.14, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.2, 0.28, 2.0]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.35} metalness={0.15} />
      </mesh>

      {/* Front Chamfered Control Bezel */}
      <mesh position={[0, 0.08, 1.02]} rotation={[-0.22, 0, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.18, 0.22, 0.12]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
      </mesh>

      {/* Heavy Stainless Steel Circular Weighing Pan (Draft Shield Pan) */}
      <mesh position={[0, 0.31, -0.15]} receiveShadow castShadow>
        <cylinderGeometry args={[0.78, 0.78, 0.05, 48]} />
        <meshStandardMaterial 
          color="#cbd5e1" 
          metalness={0.88} 
          roughness={0.18} 
        />
      </mesh>

      {/* Weighing Pan Center Ring Markings */}
      <mesh position={[0, 0.336, -0.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.32, 32]} />
        <meshBasicMaterial color="#94a3b8" />
      </mesh>

      {/* High-Contrast Digital Vacuum Fluorescent / Backlit LCD Screen */}
      <mesh position={[0, 0.16, 0.96]} rotation={[-0.22, 0, 0]}>
        <planeGeometry args={[1.1, 0.32]} />
        <meshBasicMaterial color="#0f172a" />
      </mesh>

      {/* Glowing 7-Segment Green Digital Font Display */}
      <group position={[0, 0.16, 0.98]} rotation={[-0.22, 0, 0]}>
        <Text
          ref={displayRef}
          fontSize={0.15}
          color="#22c55e"
          anchorX="center"
          anchorY="middle"
        >
          0.00 g
        </Text>
      </group>

      {/* Tare / Zero Precision Button */}
      <group
        position={[-0.68, 0.16, 0.98]}
        rotation={[-0.22, 0, 0]}
        onClick={handleTare}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setIsHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <mesh>
          <boxGeometry args={[0.32, 0.14, 0.04]} />
          <meshStandardMaterial 
            color={isHovered ? '#3b82f6' : '#2563eb'} 
            roughness={0.3} 
          />
        </mesh>
        <Text
          fontSize={0.06}
          color="#ffffff"
          position={[0, 0, 0.03]}
          anchorX="center"
          anchorY="middle"
        >
          TARE
        </Text>
      </group>

      {/* Brand & Specification Plate */}
      <group position={[0.62, 0.16, 0.98]} rotation={[-0.22, 0, 0]}>
        <Text
          fontSize={0.055}
          color="#64748b"
          anchorX="center"
          anchorY="middle"
        >
          LAB-200g
        </Text>
      </group>

      {/* Leveling Bubble Indicator on Top Right */}
      <group position={[0.85, 0.285, 0.65]}>
        <mesh>
          <cylinderGeometry args={[0.1, 0.1, 0.02, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.012, 0]}>
          <circleGeometry args={[0.07, 16]} />
          <meshBasicMaterial color="#86efac" />
        </mesh>
        <mesh position={[0.01, 0.015, -0.01]}>
          <circleGeometry args={[0.025, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
    </group>
  );
});
