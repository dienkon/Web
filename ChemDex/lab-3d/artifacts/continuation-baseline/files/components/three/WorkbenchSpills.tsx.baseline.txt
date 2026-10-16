import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { GasPlume } from '../../vfx/particles';

export const WorkbenchSpills = React.memo(function WorkbenchSpills() {
  const spills = useAppStore(state => state.spills);
  const spillList = useMemo(() => Object.values(spills || {}), [spills]);

  if (spillList.length === 0) return null;

  return (
    <group>
      {spillList.map((spill) => (
        <SpillPuddle key={spill.id} spill={spill} />
      ))}
    </group>
  );
});

function SpillPuddle({ spill }: { spill: any }) {
  const { position, color, radius, isHazard } = spill;
  const groupRef = React.useRef<THREE.Group>(null);
  const currentRadiusRef = React.useRef(0.04);

  // Smooth expanding puddle animation directly on 3D transform (zero React re-renders)
  useFrame((_, delta) => {
    if (groupRef.current && currentRadiusRef.current < radius) {
      currentRadiusRef.current = Math.min(radius, currentRadiusRef.current + delta * 0.9);
      const scale = currentRadiusRef.current / Math.max(0.06, radius);
      groupRef.current.scale.set(scale, 1, scale);
    }
  });

  // Tiny scattered droplets around the main puddle
  const droplets = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const angle = (i / 6) * Math.PI * 2 + (Math.sin(i * 3) * 0.4);
      const dist = radius * (1.1 + Math.sin(i * 7) * 0.25);
      return {
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        size: 0.025 + (i % 3) * 0.015,
      };
    });
  }, [radius]);

  const puddleY = typeof position[1] === 'number' && position[1] < -0.5 ? position[1] : -1.155;

  return (
    <group ref={groupRef} position={[position[0], puddleY, position[2]]}>
      {/* Main Fluid Puddle on Table Surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[Math.max(0.06, radius), 32]} />
        <meshPhysicalMaterial
          color={color || '#38bdf8'}
          transparent
          opacity={0.82}
          roughness={0.06}
          transmission={0.4}
          ior={1.38}
          clearcoat={0.9}
          clearcoatRoughness={0.05}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Surface Gloss Rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[Math.max(0.06, radius * 0.88), Math.max(0.08, radius), 32]} />
        <meshBasicMaterial
          color={isHazard ? '#fbbf24' : '#ffffff'}
          transparent
          opacity={isHazard ? 0.35 : 0.18}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Satellite Droplets */}
      {droplets.map((d, idx) => (
        <mesh
          key={idx}
          position={[d.x, 0.001, d.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[d.size, 16]} />
          <meshPhysicalMaterial
            color={color || '#38bdf8'}
            transparent
            opacity={0.85}
            roughness={0.08}
            transmission={0.3}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Fuming smoke/effervescence if hazardous acid/corrosive chemical spilled */}
      {isHazard && (
        <GasPlume
          origin={[0, 0.05, 0]}
          color="#f8fafc"
          density="light"
          rate={8}
          turbidity={0.35}
        />
      )}
    </group>
  );
}

export default WorkbenchSpills;
