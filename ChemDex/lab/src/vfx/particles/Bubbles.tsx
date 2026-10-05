import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticlePool, ParticleState } from './ParticlePool';
import { useQualityStore, QUALITY_CONFIGS } from '../quality';
import { getBubbleSpriteTexture } from '../textures';
import { vfxBus } from '../bus';
import { labSound } from '../../utils/audio';

export interface BubblesProps {
  vesselId?: string;
  rate?: number; // particles/sec
  liquidBottomY?: number;
  surfaceY?: number;
  radius?: number;
  gasType?: string;
  active?: boolean;
  color?: string;
}

export const Bubbles = React.memo(function Bubbles({
  vesselId,
  rate = 18,
  liquidBottomY = -0.85,
  surfaceY = 0.15,
  radius = 0.6,
  gasType = 'gas',
  active = true,
  color = '#e0f2fe',
}: BubblesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const effectiveTier = useQualityStore((state) => state.effectiveTier);
  const multiplier = QUALITY_CONFIGS[effectiveTier].particleMultiplier;

  const maxCount = useMemo(() => {
    return Math.max(16, Math.floor((effectiveTier === 'high' ? 120 : effectiveTier === 'medium' ? 60 : 25) * multiplier));
  }, [effectiveTier, multiplier]);

  const pool = useMemo(() => new ParticlePool(maxCount), [maxCount]);
  const bubbleTexture = useMemo(() => getBubbleSpriteTexture(128), []);
  const spawnTimer = useRef(0);

  const bubbleColor = useMemo(() => new THREE.Color(color), [color]);

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

    // Spawning logic
    if (active && rate > 0) {
      spawnTimer.current += dt * rate * multiplier;
      const heightRange = Math.max(0.1, surfaceY - liquidBottomY);

      while (spawnTimer.current >= 1.0) {
        spawnTimer.current -= 1.0;

        // Random cylindrical offset within liquid
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius * 0.78;
        const px = Math.cos(angle) * r;
        const pz = Math.sin(angle) * r;
        const py = liquidBottomY + Math.random() * (heightRange * 0.15); // Start near bottom

        // Realistic fine pearl bubble size (0.012 - 0.024)
        const baseSize = 0.012 + Math.random() * 0.012;

        pool.spawn({
          x: px,
          y: py,
          z: pz,
          vx: (Math.random() - 0.5) * 0.05,
          vy: 0.65 + Math.random() * 0.35, // Rising velocity
          vz: (Math.random() - 0.5) * 0.05,
          baseSize,
          size: baseSize,
          life: 3.5,
          r: bubbleColor.r,
          g: bubbleColor.g,
          b: bubbleColor.b,
          alpha: 0.85,
          rotZ: Math.random() * Math.PI * 2,
          seed: Math.random() * 10.0,
        });
      }
    }

    // Per-particle simulation updater with camera billboarding
    pool.update(
      dt,
      (p: ParticleState) => {
        // Buoyancy acceleration through fluid column
        p.vy += 0.35 * dt;

        // Realistic hydrodynamic vortex wobble while ascending
        const wobble = Math.sin(p.age * 12.0 + p.seed) * 0.003;
        p.x += wobble;
        p.z += Math.cos(p.age * 10.0 + p.seed) * 0.003;

        const totalH = Math.max(0.01, surfaceY - liquidBottomY);
        const frac = Math.max(0, Math.min(1.0, (p.y - liquidBottomY) / totalH));

        // Bubble expands slightly as it ascends due to decreasing hydrostatic pressure
        p.size = p.baseSize * (1.0 + frac * 0.45);

        // Check if reached liquid surface
        if (p.y >= surfaceY) {
          // Film rupture & bubble pop
          p.size *= 1.25;
          const isVigorous = gasType === 'H2' || gasType === 'boil';
          const burstProb = isVigorous ? 0.38 : 0.24;

          if (Math.random() < burstProb) {
            // Worthington micro-jet and droplet ejecta
            const ejectaColor = gasType === 'H2' ? '#fef08a' : (gasType === 'NO2' ? '#b45309' : '#f8fafc');
            vfxBus.emit('particle:burst', {
              position: [p.x, surfaceY + 0.005, p.z],
              count: isVigorous ? 4 : 2,
              color: ejectaColor,
              speed: isVigorous ? 0.95 : 0.65,
            });

            // Capillary surface ripple
            vfxBus.emit('surface:ripple', {
              x: p.x / radius,
              z: p.z / radius,
              intensity: Math.min(1.0, p.size * 3.0),
              vesselId,
            });

            // Minnaert acoustic bubble burst ("bóp bóp như thiệt")
            const radiusMm = Math.max(0.8, p.size * 160);
            labSound.playMinnaertBubble(radiusMm, true, Math.min(0.22, 0.06 + p.size * 3.0));
          }
          return false; // Dies at surface
        }

        return true;
      },
      meshRef.current,
      state.camera
    );
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, maxCount]}
      frustumCulled={false}
      renderOrder={5}
      visible={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={bubbleTexture}
        color={bubbleColor}
        transparent
        opacity={0.85}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
});
