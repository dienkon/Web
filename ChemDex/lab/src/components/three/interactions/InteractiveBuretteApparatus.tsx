import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { LAB_PHYSICS } from '../../../engine/interactionEngine';
import { ContinuousLiquidStream } from './ContinuousLiquidStream';
import { labSound } from '../../../utils/audio';

const glassMaterial = new THREE.MeshPhysicalMaterial({
  roughness: 0.05,
  transmission: 0.94,
  thickness: 0.2,
  ior: 1.52,
  transparent: true,
  opacity: 0.82,
});

export const InteractiveBuretteApparatus = React.memo(function InteractiveBuretteApparatus({
  position = LAB_PHYSICS.BURETTE_STAND_POSITION,
}: {
  position?: [number, number, number];
}) {
  const burette = useAppStore(state => state.burette);
  const toggleStopcock = useAppStore(state => state.toggleBuretteStopcock);
  const dispenseDrop = useAppStore(state => state.dispenseBuretteDrop);
  const vessels = useAppStore(state => state.vessels);
  const selectedVesselId = useAppStore(state => state.selectedVesselId);

  const [valveAngle, setValveAngle] = useState(burette.isDispensing ? Math.PI / 2 : 0);
  const [isValveHovered, setIsValveHovered] = useState(false);
  const dropTimerRef = useRef(0);

  // Synchronize valveAngle if burette.isDispensing changes from external button
  const targetValveAngle = burette.isDispensing ? Math.PI / 2 : 0;
  if (Math.abs(valveAngle - targetValveAngle) > 0.01 && !isValveHovered) {
    // Smooth transition
  }

  // Find vessel directly beneath burette tip (around [0, 0, 0] relative to stand or world position)
  const targetVessel = useMemo(() => {
    const tipWorldX = position[0];
    const tipWorldZ = position[2];
    for (const v of Object.values(vessels)) {
      const dx = v.position[0] - tipWorldX;
      const dz = v.position[2] - tipWorldZ;
      if (Math.hypot(dx, dz) < 1.2) {
        return v;
      }
    }
    // Fallback to selected vessel
    if (selectedVesselId && vessels[selectedVesselId]) {
      return vessels[selectedVesselId];
    }
    return null;
  }, [vessels, position, selectedVesselId]);

  const fillRatio = Math.max(0, Math.min(1.0, burette.currentVolume_ml / burette.maxVolume_ml));
  const isDispensing = burette.isDispensing && burette.currentVolume_ml > 0;

  // Stream positions
  const streamFromPos: [number, number, number] = [position[0], position[1] + 0.1, position[2]];
  const streamToPos: [number, number, number] = targetVessel
    ? [targetVessel.position[0], targetVessel.position[1] + 0.35, targetVessel.position[2]]
    : [position[0], position[1] - 0.9, position[2]];

  useFrame((_, delta) => {
    if (isDispensing && targetVessel) {
      dropTimerRef.current += delta;
      // Dispense continuous drops or stream
      if (dropTimerRef.current > 0.28) {
        dropTimerRef.current = 0;
        dispenseDrop(targetVessel.id);
        labSound.playDrop();
      }
    }
  });

  const handleStopcockClick = (e: any) => {
    e.stopPropagation();
    labSound.playTap();
    toggleStopcock();
  };

  return (
    <group position={position}>
      {/* Heavy Cast Iron Retort Base */}
      <mesh position={[-0.7, -1.05, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.5, 0.16, 1.1]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.8} />
      </mesh>

      {/* Heavy Steel Vertical Retort Rod */}
      <mesh position={[-1.15, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 4.6, 16]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.9} />
      </mesh>

      {/* Retort Rod Top Cap */}
      <mesh position={[-1.15, 3.56, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Cast Double Burette Clamp */}
      <group position={[-0.58, 2.2, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[1.15, 0.09, 0.18]} />
          <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.6} />
        </mesh>
        {/* Clamp Adjusting Screws */}
        <mesh position={[-0.45, 0.12, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.15, 12]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
        </mesh>
        <mesh position={[0.45, 0.12, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.15, 12]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
        </mesh>
      </group>

      {/* Lower Stabilizing Clamp */}
      <group position={[-0.58, 1.1, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[1.15, 0.07, 0.14]} />
          <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.6} />
        </mesh>
      </group>

      {/* Burette Glass Column Body (3.2m scaled) */}
      <mesh material={glassMaterial} position={[0, 2.0, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 3.2, 24, 1, true]} />
      </mesh>

      {/* Burette Graduations Ring Texture / Rings along barrel */}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[0, 0.7 + i * 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.086, 0.089, 16]} />
          <meshBasicMaterial color="#ffffff" opacity={0.65} transparent />
        </mesh>
      ))}

      {/* Titrant Liquid Inside Burette */}
      {fillRatio > 0.005 && (
        <mesh position={[0, 0.4 + (fillRatio * 3.0) / 2, 0]}>
          <cylinderGeometry args={[0.076, 0.076, fillRatio * 3.0, 16]} />
          <meshStandardMaterial 
            color="#f8fafc" 
            transparent 
            opacity={0.8} 
            roughness={0.12} 
          />
        </mesh>
      )}

      {/* Titrant Curved Meniscus */}
      {fillRatio > 0.005 && (
        <mesh position={[0, 0.4 + fillRatio * 3.0, 0]}>
          <cylinderGeometry args={[0.076, 0.076, 0.02, 16]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.1} />
        </mesh>
      )}

      {/* Precision PTFE / Glass Stopcock Valve */}
      <group
        position={[0, 0.35, 0]}
        onClick={handleStopcockClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsValveHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setIsValveHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        {/* Stopcock Barrel Outer Collar */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.28, 16]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.2} />
        </mesh>

        {/* Rotatable Stopcock Handle (Rotates 90 deg when open) */}
        <group rotation={[burette.isDispensing ? Math.PI / 2 : 0, 0, 0]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.36, 12]} />
            <meshStandardMaterial
              color={burette.isDispensing ? '#22c55e' : '#ef4444'}
              roughness={0.3}
            />
          </mesh>
          {/* Valve Wing Grip */}
          <mesh position={[0, 0.16, 0]}>
            <boxGeometry args={[0.04, 0.1, 0.16]} />
            <meshStandardMaterial
              color={isValveHovered ? '#3b82f6' : (burette.isDispensing ? '#16a34a' : '#dc2626')}
              roughness={0.3}
            />
          </mesh>
        </group>
      </group>

      {/* Burette Glass Capillary Delivery Tip */}
      <mesh material={glassMaterial} position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.05, 0.015, 0.4, 16]} />
      </mesh>

      {/* Falling Continuous Droplet Stream onto Vessel Below */}
      <ContinuousLiquidStream
        fromPos={streamFromPos}
        toPos={streamToPos}
        color="#e0f2fe"
        flowRate={isDispensing ? 18 : 0}
        thickness={0.02}
        active={isDispensing}
      />
    </group>
  );
});
