import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticlePool, ParticleState } from './ParticlePool';
import { useQualityStore, QUALITY_CONFIGS } from '../quality';

export interface DropletsProps {
  origin: [number, number, number];
  target?: [number, number, number];
  rate?: number;
  color?: string;
  active?: boolean;
}

export const Droplets = React.memo(function Droplets({
  origin,
  target,
  rate = 14,
  color = '#38bdf8',
  active = true,
}: DropletsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const effectiveTier = useQualityStore((state) => state.effectiveTier);
  const multiplier = QUALITY_CONFIGS[effectiveTier].particleMultiplier;

  const maxCount = useMemo(() => {
    return Math.max(12, Math.floor((effectiveTier === 'high' ? 60 : effectiveTier === 'medium' ? 30 : 12) * multiplier));
  }, [effectiveTier, multiplier]);

  const pool = useMemo(() => new ParticlePool(maxCount), [maxCount]);
  const spawnTimer = useRef(0);
  const dropletColor = useMemo(() => new THREE.Color(color), [color]);

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

        let vx = (Math.random() - 0.5) * 0.2;
        let vy = -0.5 - Math.random() * 0.5;
        let vz = (Math.random() - 0.5) * 0.2;

        if (target) {
          const dx = target[0] - origin[0];
          const dy = target[1] - origin[1];
          const dz = target[2] - origin[2];
          const len = Math.max(0.1, Math.sqrt(dx * dx + dy * dy + dz * dz));
          const speed = 2.5 + Math.random() * 0.5;
          vx = (dx / len) * speed + (Math.random() - 0.5) * 0.2;
          vy = (dy / len) * speed;
          vz = (dz / len) * speed + (Math.random() - 0.5) * 0.2;
        }

        const baseSize = 0.022 + Math.random() * 0.016;

        pool.spawn({
          x: origin[0] + (Math.random() - 0.5) * 0.03,
          y: origin[1],
          z: origin[2] + (Math.random() - 0.5) * 0.03,
          vx,
          vy,
          vz,
          baseSize,
          size: baseSize,
          life: 0.8,
          r: dropletColor.r,
          g: dropletColor.g,
          b: dropletColor.b,
          alpha: 0.9,
        });
      }
    }

    pool.update(dt, (p: ParticleState) => {
      // Ballistic gravity & air drag
      p.vy += -9.8 * dt;
      p.vx *= 0.98;
      p.vz *= 0.98;

      if (p.y <= -1.02) {
        return false;
      }
      return true;
    }, meshRef.current);
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, maxCount]}
      frustumCulled={false}
      renderOrder={5}
      visible={false}
    >
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial
        color={dropletColor}
        roughness={0.1}
        metalness={0.1}
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </instancedMesh>
  );
});
