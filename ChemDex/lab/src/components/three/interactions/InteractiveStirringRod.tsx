import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { labSound } from '../../../utils/audio';

const rodGlassMaterial = new THREE.MeshPhysicalMaterial({
  roughness: 0.1,
  transmission: 0.92,
  thickness: 0.25,
  ior: 1.5,
  transparent: true,
  opacity: 0.8,
});

export const InteractiveStirringRod = React.memo(function InteractiveStirringRod({
  position = [-5.2, 0.4, 2.0],
}: {
  position?: [number, number, number];
}) {
  const activeTool = useAppStore(state => state.activeTool);
  const setActiveTool = useAppStore(state => state.setActiveTool);
  const selectedVesselId = useAppStore(state => state.selectedVesselId);
  const vessels = useAppStore(state => state.vessels);
  const stirVessel = useAppStore(state => state.stirVessel);

  const groupRef = useRef<THREE.Group>(null);
  const targetVessel = selectedVesselId ? vessels[selectedVesselId] : null;
  const isActive = activeTool === 'stirring_rod';

  const [stirAngle, setStirAngle] = useState(0);
  const lastPointerRef = useRef({ x: 0, y: 0, time: 0 });
  const stirSpeedRef = useRef(0);

  // Manual circular motion tracking
  useEffect(() => {
    if (!isActive) return;

    const handlePointerMove = (e: MouseEvent) => {
      const now = performance.now();
      const dt = (now - lastPointerRef.current.time) / 1000;
      if (dt > 0.016) {
        const dx = e.movementX;
        const dy = e.movementY;
        const speed = Math.hypot(dx, dy) / 10;
        stirSpeedRef.current = THREE.MathUtils.lerp(stirSpeedRef.current, Math.min(1.0, speed), 0.3);
        lastPointerRef.current = { x: e.clientX, y: e.clientY, time: now };

        if (stirSpeedRef.current > 0.3 && targetVessel) {
          stirVessel(targetVessel.id);
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [isActive, targetVessel, stirVessel]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (isActive && targetVessel) {
      // Circular vortex orbiting motion
      const time = state.clock.elapsedTime;
      const speed = Math.max(0.8, stirSpeedRef.current * 4);
      const angle = time * speed * Math.PI;
      const radius = 0.28;

      const targetPos = new THREE.Vector3(
        targetVessel.position[0] + Math.cos(angle) * radius,
        targetVessel.position[1] + 0.8,
        targetVessel.position[2] + Math.sin(angle) * radius
      );

      groupRef.current.position.lerp(targetPos, delta * 12.0);
      groupRef.current.rotation.z = Math.sin(angle) * 0.18;
      groupRef.current.rotation.x = Math.cos(angle) * 0.18;

      // Natural stir sound when active and fast
      if (stirSpeedRef.current > 0.4 && Math.random() < delta * 1.5) {
        labSound.playStir();
      }
      stirSpeedRef.current = Math.max(0, stirSpeedRef.current - delta * 0.6);
    } else {
      // Resting position in rack
      const restPos = new THREE.Vector3(...position);
      groupRef.current.position.lerp(restPos, delta * 8.0);
      groupRef.current.rotation.set(0.1, 0, 0.1);
    }
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        setActiveTool(isActive ? 'none' : 'stirring_rod');
      }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* Resting Stand block when not held */}
      {!isActive && (
        <mesh position={[0, -0.6, 0]} receiveShadow>
          <boxGeometry args={[0.3, 0.4, 0.3]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
        </mesh>
      )}

      {/* Solid Glass Stirring Rod */}
      <mesh material={rodGlassMaterial} position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 2.4, 16]} />
      </mesh>

      {/* Rounded Glass End Beads */}
      <mesh material={rodGlassMaterial} position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.045, 12, 12]} />
      </mesh>
      <mesh material={rodGlassMaterial} position={[0, -0.8, 0]}>
        <sphereGeometry args={[0.045, 12, 12]} />
      </mesh>
    </group>
  );
});
