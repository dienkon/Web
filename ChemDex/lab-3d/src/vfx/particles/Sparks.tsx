import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticlePool, ParticleState } from './ParticlePool';
import { useQualityStore, QUALITY_CONFIGS } from '../quality';
import { getSparkTexture } from '../textures';

export interface SparksProps {
  origin?: [number, number, number];
  rate?: number;
  burstCount?: number;
  color?: string;
  active?: boolean;
}

export const Sparks = React.memo(function Sparks({
  origin = [0, 0, 0],
  rate = 30,
  burstCount = 0,
  color = '#fbbf24',
  active = true,
}: SparksProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const effectiveTier = useQualityStore((state) => state.effectiveTier);
  const multiplier = QUALITY_CONFIGS[effectiveTier].particleMultiplier;

  const maxCount = useMemo(() => {
    return Math.max(16, Math.floor((effectiveTier === 'high' ? 100 : effectiveTier === 'medium' ? 50 : 20) * multiplier));
  }, [effectiveTier, multiplier]);

  const pool = useMemo(() => new ParticlePool(maxCount), [maxCount]);
  const sparkTexture = useMemo(() => getSparkTexture(), []);
  const spawnTimer = useRef(0);
  const sparkColor = useMemo(() => new THREE.Color(color), [color]);

  useEffect(() => {
    return () => {
      if (meshRef.current) pool.clear(meshRef.current);
    };
  }, [pool]);

  // Burst trigger if burstCount > 0
  useEffect(() => {
    if (burstCount > 0 && active) {
      const countToSpawn = Math.floor(burstCount * multiplier);
      for (let i = 0; i < countToSpawn; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * (Math.PI * 0.45); // Upward hemisphere cone
        const speed = 2.0 + Math.random() * 3.5;

        const vx = Math.cos(theta) * Math.sin(phi) * speed;
        const vy = Math.cos(phi) * speed * 1.2;
        const vz = Math.sin(theta) * Math.sin(phi) * speed;

        const baseSize = 0.04 + Math.random() * 0.035;

        pool.spawn({
          x: origin[0],
          y: origin[1],
          z: origin[2],
          vx,
          vy,
          vz,
          baseSize,
          size: baseSize,
          life: 0.35 + Math.random() * 0.35,
          r: sparkColor.r,
          g: sparkColor.g,
          b: sparkColor.b,
          alpha: 1.0,
        });
      }
    }
  }, [burstCount, active, multiplier, origin, pool, sparkColor]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.05);

    // Continuous emission
    if (active && rate > 0) {
      spawnTimer.current += dt * rate * multiplier;

      while (spawnTimer.current >= 1.0) {
        spawnTimer.current -= 1.0;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * (Math.PI * 0.4);
        const speed = 1.8 + Math.random() * 2.8;

        const vx = Math.cos(theta) * Math.sin(phi) * speed;
        const vy = Math.cos(phi) * speed;
        const vz = Math.sin(theta) * Math.sin(phi) * speed;

        const baseSize = 0.035 + Math.random() * 0.025;

        pool.spawn({
          x: origin[0] + (Math.random() - 0.5) * 0.05,
          y: origin[1],
          z: origin[2] + (Math.random() - 0.5) * 0.05,
          vx,
          vy,
          vz,
          baseSize,
          size: baseSize,
          life: 0.3 + Math.random() * 0.25,
          r: sparkColor.r,
          g: sparkColor.g,
          b: sparkColor.b,
          alpha: 1.0,
        });
      }
    }

    pool.update(dt, (p: ParticleState) => {
      // Strong gravity and air resistance
      p.vy += -14.0 * dt;
      p.vx *= 0.96;
      p.vz *= 0.96;

      // Orient spark towards velocity direction
      const angle = Math.atan2(p.vy, Math.sqrt(p.vx * p.vx + p.vz * p.vz));
      p.rotZ = angle;

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
      renderOrder={7}
    >
      <planeGeometry args={[1.5, 0.4]} />
      <meshBasicMaterial
        map={sparkTexture}
        color={sparkColor}
        transparent
        opacity={1.0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
});
