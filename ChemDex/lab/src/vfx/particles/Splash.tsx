import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticlePool, ParticleState } from './ParticlePool';
import { useQualityStore, QUALITY_CONFIGS } from '../quality';
import { vfxBus } from '../bus';

export interface SplashProps {
  color?: string;
  active?: boolean;
}

export const Splash = React.memo(function Splash({
  color = '#38bdf8',
  active = true,
}: SplashProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const effectiveTier = useQualityStore((state) => state.effectiveTier);
  const multiplier = QUALITY_CONFIGS[effectiveTier].particleMultiplier;

  const maxCount = useMemo(() => {
    return Math.max(16, Math.floor((effectiveTier === 'high' ? 80 : effectiveTier === 'medium' ? 40 : 16) * multiplier));
  }, [effectiveTier, multiplier]);

  const pool = useMemo(() => new ParticlePool(maxCount), [maxCount]);
  const splashColor = useMemo(() => new THREE.Color(color), [color]);

  // Subscribe to pour impact events on vfxBus
  useEffect(() => {
    if (!active) return;
    if (meshRef.current) pool.init(meshRef.current);

    const unsub = vfxBus.on('pour:impact', (e) => {
      const burstCount = Math.floor((6 + Math.random() * 8) * multiplier);
      const splashC = e.color ? new THREE.Color(e.color) : splashColor;

      for (let i = 0; i < burstCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const speed = 0.6 + Math.random() * 0.9;
        const elevation = 0.5 + Math.random() * 0.5;

        const vx = Math.cos(theta) * speed * (1 - elevation * 0.5);
        const vy = speed * elevation * 1.4;
        const vz = Math.sin(theta) * speed * (1 - elevation * 0.5);

        const baseSize = 0.02 + Math.random() * 0.025;

        pool.spawn({
          x: e.position[0] + (Math.random() - 0.5) * 0.04,
          y: e.position[1],
          z: e.position[2] + (Math.random() - 0.5) * 0.04,
          vx,
          vy,
          vz,
          baseSize,
          size: baseSize,
          life: 0.45 + Math.random() * 0.35,
          r: splashC.r,
          g: splashC.g,
          b: splashC.b,
          alpha: 0.95,
        });
      }
    });

    return () => {
      unsub();
      if (meshRef.current) pool.clear(meshRef.current);
    };
  }, [pool, active, multiplier, splashColor]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.05);

    pool.update(dt, (p: ParticleState) => {
      // Ballistic gravity
      p.vy += -9.8 * dt;

      // Die if it falls below table plane
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
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial
        color={splashColor}
        roughness={0.1}
        metalness={0.1}
        transparent
        opacity={0.88}
        depthWrite={false}
      />
    </instancedMesh>
  );
});
