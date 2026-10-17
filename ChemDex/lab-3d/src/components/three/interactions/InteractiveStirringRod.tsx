import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { labSound } from '../../../utils/audio';
import { useToolDock } from '../../../handling/toolDock';
import { instrumentHome } from '../../../handling/instrumentCatalog';

const rodGlassMaterial = new THREE.MeshPhysicalMaterial({
  roughness: 0.1,
  transmission: 0.92,
  thickness: 0.25,
  ior: 1.5,
  transparent: true,
  opacity: 0.8,
});

export const InteractiveStirringRod = React.memo(function InteractiveStirringRod({
  position: initialPosition = instrumentHome('stirring_rod'),
}: {
  position?: [number, number, number];
}) {
  const dock = useToolDock('stirring_rod', initialPosition);
  const position = dock.position;
  const animationTarget = useRef(new THREE.Vector3());
  const activeTool = useAppStore(state => state.activeTool);
  const setActiveTool = useAppStore(state => state.setActiveTool);
  const selectedVesselId = useAppStore(state => state.selectedVesselId);
  const targetVessel = useAppStore(state => state.selectedVesselId ? state.vessels[state.selectedVesselId] : undefined);
  const stirVessel = useAppStore(state => state.stirVessel);

  const groupRef = useRef<THREE.Group>(null);
  const isActive = activeTool === 'stirring_rod' && !dock.moveMode;

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
          if (targetVessel.substances.length > 0) {
            useAppStore.getState().touchToolChemical('stirring_rod', targetVessel.substances[0]);
          }
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

      const targetPos = animationTarget.current.set(
        targetVessel.position[0] + Math.cos(angle) * radius,
        targetVessel.position[1] + 0.8,
        targetVessel.position[2] + Math.sin(angle) * radius
      );

      groupRef.current.position.lerp(targetPos, 1 - Math.exp(-delta * 12));
      groupRef.current.rotation.z = Math.sin(angle) * 0.18;
      groupRef.current.rotation.x = Math.cos(angle) * 0.18;

      // Natural stir sound when active and fast
      if (stirSpeedRef.current > 0.4 && Math.random() < delta * 1.5) {
        labSound.playStir();
      }
      stirSpeedRef.current = Math.max(0, stirSpeedRef.current - delta * 0.6);
    } else {
      // Resting position in rack
      const restPos = animationTarget.current.set(...position);
      groupRef.current.position.lerp(restPos, 1 - Math.exp(-delta * 8));
      groupRef.current.rotation.set(-Math.PI / 2, 0, 0);
    }
  });

  if (!dock.visible) return null;

  return (
    <group
      ref={groupRef}
      name="tool-stirring_rod" visible={dock.visible}
      position={position} rotation={isActive ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}
      onPointerDown={dock.onPointerDown}
      onClick={(e) => {
        e.stopPropagation();
        if (dock.moveMode) return;
        setActiveTool(isActive ? 'none' : 'stirring_rod');
      }}
      onPointerOver={() => { document.body.style.cursor = dock.moveMode ? 'grab' : 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
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
