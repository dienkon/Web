import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticlePool, ParticleState } from './ParticlePool';
import { useQualityStore, QUALITY_CONFIGS } from '../quality';
import { getSoftParticleTexture } from '../textures';

export interface GasPlumeProps {
  vesselId?: string;
  origin?: [number, number, number];
  surfaceY?: number;
  radius?: number;
  color?: string;
  density?: 'heavy' | 'light' | 'neutral';
  rate?: number;
  turbidity?: number;
  active?: boolean;
}

export const GasPlume = React.memo(function GasPlume({
  origin = [0, 1.2, 0],
  surfaceY,
  radius = 0.45,
  color = '#f1f5f9',
  density = 'neutral',
  rate = 22,
  turbidity = 0.6,
  active = true,
}: GasPlumeProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const effectiveTier = useQualityStore((state) => state.effectiveTier);
  const multiplier = QUALITY_CONFIGS[effectiveTier].particleMultiplier;

  const maxCount = useMemo(() => {
    return Math.max(16, Math.floor((effectiveTier === 'high' ? 140 : effectiveTier === 'medium' ? 70 : 30) * multiplier));
  }, [effectiveTier, multiplier]);

  const pool = useMemo(() => new ParticlePool(maxCount), [maxCount]);
  const plumeTexture = useMemo(() => getSoftParticleTexture(128), []);
  const spawnTimer = useRef(0);

  const plumeColor = useMemo(() => new THREE.Color(color), [color]);

  useEffect(() => {
    if (meshRef.current) {
      pool.init(meshRef.current);
    }
    return () => {
      if (meshRef.current) pool.clear(meshRef.current);
    };
  }, [pool]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.05);

    if (active && rate > 0) {
      spawnTimer.current += dt * rate * multiplier;

      while (spawnTimer.current >= 1.0) {
        spawnTimer.current -= 1.0;

        // Disperse across the full liquid surface area
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random() * 0.88 + 0.1) * (radius || 0.45);
        const px = origin[0] + Math.cos(angle) * r;
        const py = (surfaceY !== undefined ? surfaceY : origin[1]) + (Math.random() - 0.5) * 0.02;
        const pz = origin[2] + Math.sin(angle) * r;

        let initialVy = 0.55 + Math.random() * 0.25;
        let initialVx = Math.cos(angle) * 0.06 + (Math.random() - 0.5) * 0.06;
        let initialVz = Math.sin(angle) * 0.06 + (Math.random() - 0.5) * 0.06;
        let life = 2.4;

        if (density === 'heavy') {
          // Heavy gas spills over the lip of vessel and descends slightly
          initialVy = -0.08 - Math.random() * 0.12;
          const rimAngle = Math.random() * Math.PI * 2;
          initialVx = Math.cos(rimAngle) * 0.22;
          initialVz = Math.sin(rimAngle) * 0.22;
          life = 3.2;
        } else if (density === 'light') {
          // Light gas rises briskly
          initialVy = 1.3 + Math.random() * 0.8;
          life = 1.8;
        }

        const baseSize = 0.09 + Math.random() * 0.06;

        pool.spawn({
          x: px,
          y: py,
          z: pz,
          vx: initialVx,
          vy: initialVy,
          vz: initialVz,
          baseSize,
          size: baseSize,
          life,
          r: plumeColor.r,
          g: plumeColor.g,
          b: plumeColor.b,
          alpha: turbidity * 0.75,
          rotZ: Math.random() * Math.PI * 2,
          vRotZ: (Math.random() - 0.5) * 0.6,
          seed: Math.random() * 50.0,
        });
      }
    }

    pool.update(dt, (p: ParticleState) => {
      // Buoyancy, aerodynamic drag, and bench-level pooling
      if (density === 'heavy') {
        const benchY = origin[1] - 0.75;
        if (p.y <= benchY) {
          p.y = benchY;
          p.vy = 0;
          p.vx *= 1.02;
          p.vz *= 1.02;
        } else {
          p.vy += -0.22 * dt; // Slow sinking
          p.vx *= 0.98;
          p.vz *= 0.98;
        }
      } else {
        p.vy += 0.15 * dt; // Thermal lift
        // Multi-octave natural curl turbulence
        const curlX = Math.sin(p.y * 3.2 + p.seed) * 0.07;
        const curlZ = Math.cos(p.y * 2.8 + p.seed) * 0.07;
        p.vx = THREE.MathUtils.lerp(p.vx, curlX, dt * 2.0);
        p.vz = THREE.MathUtils.lerp(p.vz, curlZ, dt * 2.0);
      }

      // Soft expansion and smooth fade out
      const progress = p.age / p.life;
      p.size = p.baseSize * (1.0 + progress * 2.6);
      p.alpha = turbidity * 0.75 * Math.sin(progress * Math.PI);

      return true;
    }, meshRef.current, state.camera);
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, maxCount]}
      frustumCulled={false}
      renderOrder={6}
      visible={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={plumeTexture}
        color={plumeColor}
        transparent
        opacity={0.65}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
});
