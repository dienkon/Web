import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { updateThermalResponse } from '../../../engine/interactionEngine';

const stemGlassMaterial = new THREE.MeshPhysicalMaterial({
  roughness: 0.08,
  transmission: 0.94,
  thickness: 0.2,
  ior: 1.5,
  transparent: true,
  opacity: 0.85,
});

export const InteractiveThermometer = React.memo(function InteractiveThermometer({
  position = [-7.8, 0.4, 2.0],
}: {
  position?: [number, number, number];
}) {
  const activeTool = useAppStore(state => state.activeTool);
  const setActiveTool = useAppStore(state => state.setActiveTool);
  const selectedVesselId = useAppStore(state => state.selectedVesselId);
  const vessels = useAppStore(state => state.vessels);

  const groupRef = useRef<THREE.Group>(null);
  const textRef = useRef<any>(null);
  const fluidColumnRef = useRef<THREE.Mesh>(null);
  const currentTempRef = useRef(25.0);

  const targetVessel = selectedVesselId ? vessels[selectedVesselId] : null;
  const isActive = activeTool === 'thermometer';

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (isActive && targetVessel) {
      // Immerse thermometer bulb into the vessel's liquid
      const immersionY = targetVessel.position[1] + 0.35;
      const targetPos = new THREE.Vector3(
        targetVessel.position[0] + 0.2,
        immersionY + 0.8,
        targetVessel.position[2] + 0.1
      );
      groupRef.current.position.lerp(targetPos, delta * 8.0);
      groupRef.current.rotation.set(0.12, 0, -0.15);

      // Newton cooling / heating curve
      currentTempRef.current = updateThermalResponse(
        currentTempRef.current,
        targetVessel.temperature_c,
        delta,
        1.8
      );
    } else {
      // Resting on rack
      const restPos = new THREE.Vector3(...position);
      groupRef.current.position.lerp(restPos, delta * 8.0);
      groupRef.current.rotation.set(0, 0, 0);

      // Cool back down to room ambient temperature (25°C)
      currentTempRef.current = updateThermalResponse(
        currentTempRef.current,
        25.0,
        delta,
        3.0
      );
    }

    const t = currentTempRef.current;
    if (textRef.current) {
      textRef.current.text = `${t.toFixed(1)}°C`;
    }

    // Update red alcohol column height (scaled from -10°C to 110°C)
    if (fluidColumnRef.current) {
      const normalizedTemp = Math.max(0, Math.min(1.0, (t - 0) / 100));
      const colHeight = Math.max(0.05, normalizedTemp * 1.6);
      fluidColumnRef.current.scale.set(1, colHeight, 1);
      fluidColumnRef.current.position.y = -0.6 + colHeight / 2;
    }
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        setActiveTool(isActive ? 'none' : 'thermometer');
      }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* Wooden / Acrylic Rest Block */}
      {!isActive && (
        <mesh position={[0, -0.6, 0]} receiveShadow>
          <boxGeometry args={[0.35, 0.4, 0.35]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
        </mesh>
      )}

      {/* Glass Stem */}
      <mesh material={stemGlassMaterial} position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 2.0, 16, 1, true]} />
      </mesh>

      {/* Bottom Mercury / Alcohol Reservoir Bulb */}
      <mesh position={[0, -0.75, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#ef4444" roughness={0.2} metalness={0.2} />
      </mesh>

      {/* Rising Red Liquid Column */}
      <mesh ref={fluidColumnRef} position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.0, 12]} />
        <meshStandardMaterial color="#ef4444" roughness={0.2} />
      </mesh>

      {/* Glass Graduation Marks */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[0, -0.4 + i * 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.046, 0.048, 12]} />
          <meshBasicMaterial color="#ffffff" opacity={0.6} transparent />
        </mesh>
      ))}

      {/* Digital LCD Head Housing */}
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[0.34, 0.22, 0.12]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>

      {/* Digital Screen Faceplate */}
      <mesh position={[0, 1.35, 0.062]}>
        <planeGeometry args={[0.3, 0.16]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* Live Temperature Text */}
      <Text
        ref={textRef}
        position={[0, 1.35, 0.065]}
        fontSize={0.075}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        25.0°C
      </Text>
    </group>
  );
});
