import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticlePool, ParticleState } from './ParticlePool';
import { useQualityStore, QUALITY_CONFIGS } from '../quality';

export interface PrecipitateProps {
  vesselId?: string;
  substance?: string; // 'PbI2' | 'BaSO4' | 'AgCl' | 'Cu(OH)2' | string
  color?: string;
  radius?: number;
  liquidTopY?: number;
  liquidBottomY?: number;
  rate?: number;
  active?: boolean;
}

export const Precipitate = React.memo(function Precipitate({
  substance = 'BaSO4',
  color,
  radius = 0.55,
  liquidTopY = 0.2,
  liquidBottomY = -0.85,
  rate = 25,
  active = true,
}: PrecipitateProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const effectiveTier = useQualityStore((state) => state.effectiveTier);
  const multiplier = QUALITY_CONFIGS[effectiveTier].particleMultiplier;

  const isPbI2 = substance.toUpperCase().includes('PBI2') || substance.toLowerCase().includes('lead');
  const isCuOH2 = substance.toUpperCase().includes('CU(OH)2') || substance.toLowerCase().includes('copper');

  const maxCount = useMemo(() => {
    return Math.max(20, Math.floor((effectiveTier === 'high' ? 160 : effectiveTier === 'medium' ? 80 : 35) * multiplier));
  }, [effectiveTier, multiplier]);

  const pool = useMemo(() => new ParticlePool(maxCount), [maxCount]);
  const spawnTimer = useRef(0);

  const particleColor = useMemo(() => {
    if (color) return new THREE.Color(color);
    if (isPbI2) return new THREE.Color('#facc15'); // Golden yellow glittering flakes
    if (isCuOH2) return new THREE.Color('#0284c7'); // Bright azure blue gelatinous floc
    return new THREE.Color('#f8fafc'); // Milky white curd (BaSO4, AgCl)
  }, [color, isPbI2, isCuOH2]);

  useEffect(() => {
    if (meshRef.current) {
      pool.init(meshRef.current);
    }
    return () => {
      if (meshRef.current) pool.clear(meshRef.current);
    };
  }, [pool]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.05);

    if (active && rate > 0) {
      spawnTimer.current += dt * rate * multiplier;

      while (spawnTimer.current >= 1.0) {
        spawnTimer.current -= 1.0;

        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius * 0.85;
        const px = Math.cos(angle) * r;
        const py = liquidTopY - Math.random() * 0.15; // Form near upper reaction mixing zone
        const pz = Math.sin(angle) * r;

        // Terminal settling velocity (Stokes drag for thin platelets vs gelatinous curds)
        const settlingVy = isPbI2
          ? -(0.065 + Math.random() * 0.04) // Hexagonal flakes flutter down gracefully
          : isCuOH2
            ? -(0.05 + Math.random() * 0.035) // Gel settles very slowly
            : -(0.09 + Math.random() * 0.05); // Microcrystals

        const baseSize = isPbI2
          ? (0.028 + Math.random() * 0.022)
          : isCuOH2
            ? (0.045 + Math.random() * 0.035)
            : (0.018 + Math.random() * 0.016);

        pool.spawn({
          x: px,
          y: py,
          z: pz,
          vx: (Math.random() - 0.5) * (isPbI2 ? 0.06 : 0.03),
          vy: settlingVy,
          vz: (Math.random() - 0.5) * (isPbI2 ? 0.06 : 0.03),
          baseSize,
          size: baseSize,
          life: isPbI2 ? 14.0 : 8.0,
          r: particleColor.r,
          g: particleColor.g,
          b: particleColor.b,
          alpha: isPbI2 ? 0.98 : (isCuOH2 ? 0.75 : 0.9),
          rotX: Math.random() * Math.PI * 2,
          rotY: Math.random() * Math.PI * 2,
          rotZ: Math.random() * Math.PI * 2,
          vRotX: isPbI2 ? (Math.random() - 0.5) * 5.0 : (Math.random() - 0.5) * 1.0,
          vRotY: isPbI2 ? (Math.random() - 0.5) * 5.0 : (Math.random() - 0.5) * 1.0,
          vRotZ: isPbI2 ? (Math.random() - 0.5) * 5.0 : (Math.random() - 0.5) * 1.0,
        });
      }
    }

    pool.update(dt, (p: ParticleState) => {
      // Hexagonal flake aerodynamic flutter (tumbling leaf effect)
      if (isPbI2 && p.y > liquidBottomY + 0.02) {
        p.x += Math.sin(p.age * 4.5 + p.rotX) * dt * 0.06;
        p.z += Math.cos(p.age * 4.5 + p.rotZ) * dt * 0.06;
      }

      // Reached sediment floor layer
      if (p.y <= liquidBottomY + 0.02) {
        p.vy = 0;
        p.vx = 0;
        p.vz = 0;
        p.vRotX = 0;
        p.vRotY = 0;
        p.vRotZ = 0;
        // Keep settled sediment visible during reaction
        if (p.age > (isPbI2 ? 16.0 : 6.0)) return false;
      }

      return true;
    }, meshRef.current);
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, maxCount]}
      frustumCulled={false}
      renderOrder={4}
      visible={false}
    >
      {isPbI2 ? (
        // Authentic hexagonal prism platelet for PbI2 crystalline structure
        <cylinderGeometry args={[1, 1, 0.12, 6]} />
      ) : (
        <sphereGeometry args={[1, 8, 8]} />
      )}
      <meshStandardMaterial
        color={particleColor}
        roughness={isPbI2 ? 0.12 : 0.85}
        metalness={isPbI2 ? 0.92 : 0.05}
        transparent
        opacity={isPbI2 ? 0.98 : (isCuOH2 ? 0.75 : 0.9)}
        depthWrite={false}
      />
    </instancedMesh>
  );
});
