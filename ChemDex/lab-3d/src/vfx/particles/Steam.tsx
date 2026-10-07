import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticlePool, ParticleState } from './ParticlePool';
import { useQualityStore, QUALITY_CONFIGS } from '../quality';
import { getSoftParticleTexture } from '../textures';
import { useAppStore } from '../../store/useAppStore';

export interface SteamProps {
  vesselId: string;
  origin?: [number, number, number];
  surfaceY?: number;
  radius?: number;
  temperature_c?: number;
  active?: boolean;
}

export const Steam = React.memo(function Steam({
  vesselId,
  origin,
  surfaceY = 0.5,
  radius = 0.45,
  temperature_c,
  active = true,
}: SteamProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const effectiveTier = useQualityStore((state) => state.effectiveTier);
  const multiplier = QUALITY_CONFIGS[effectiveTier].particleMultiplier;

  const maxCount = useMemo(() => {
    return Math.max(12, Math.floor((effectiveTier === 'high' ? 90 : effectiveTier === 'medium' ? 45 : 18) * multiplier));
  }, [effectiveTier, multiplier]);

  const pool = useMemo(() => new ParticlePool(maxCount), [maxCount]);
  const steamTexture = useMemo(() => getSoftParticleTexture(128), []);
  const spawnTimer = useRef(0);

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

    const vessel = useAppStore.getState().vessels[vesselId];
    if (!vessel || vessel.isShattered || (vessel.volume_ml ?? 0) <= 0.5) {
      pool.clear(meshRef.current);
      return;
    }

    const currentTemp = temperature_c ?? (vessel?.temperature_c || 25);
    const isBoiling = vessel?.isBoiling || currentTemp >= 98;

    // Steam/evaporation activates starting at 48°C or when boiling
    const heatExcess = Math.max(0, currentTemp - 48);
    const steamIntensity = isBoiling 
      ? 2.2 
      : (heatExcess > 0 ? Math.min(1.8, Math.pow(heatExcess / 45, 1.25)) : 0);

    if (active && steamIntensity > 0.01) {
      const rate = (isBoiling ? 26 : (5 + steamIntensity * 12)) * multiplier;
      spawnTimer.current += dt * rate;

      while (spawnTimer.current >= 1.0) {
        spawnTimer.current -= 1.0;

        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random() * 0.9 + 0.1) * radius * 0.88;
        const px = (origin ? origin[0] : 0) + Math.cos(angle) * r;
        const py = (origin ? origin[1] : surfaceY) + (Math.random() - 0.5) * 0.015;
        const pz = (origin ? origin[2] : 0) + Math.sin(angle) * r;

        // Realistic delicate vapor puff sizing
        const baseSize = 0.045 + Math.random() * 0.03;
        const verticalLift = 0.45 + (isBoiling ? 0.6 : 0.25) * Math.min(2.0, steamIntensity);
        const outwardSpeed = 0.03 + Math.random() * 0.03;
        const vx = Math.cos(angle) * outwardSpeed + (Math.random() - 0.5) * 0.02;
        const vz = Math.sin(angle) * outwardSpeed + (Math.random() - 0.5) * 0.02;

        pool.spawn({
          x: px,
          y: py,
          z: pz,
          vx,
          vy: verticalLift + (Math.random() - 0.5) * 0.1,
          vz,
          baseSize,
          size: baseSize,
          life: 1.3 + Math.random() * 0.7,
          r: 0.96,
          g: 0.98,
          b: 1.0,
          alpha: 0.35 * Math.min(1.0, 0.4 + steamIntensity * 0.5),
          rotZ: Math.random() * Math.PI * 2,
          vRotZ: (Math.random() - 0.5) * 0.6,
          seed: Math.random() * 20.0,
        });
      }
    }

    pool.update(
      dt,
      (p: ParticleState) => {
        // Convective thermal upward acceleration
        p.vy += 0.25 * dt;
        // Atmospheric vapor curl turbulence
        p.vx = THREE.MathUtils.lerp(p.vx, Math.sin(p.y * 3.8 + p.seed) * 0.05, dt * 2.5);
        p.vz = THREE.MathUtils.lerp(p.vz, Math.cos(p.y * 3.4 + p.seed) * 0.05, dt * 2.5);
        p.x += p.vx * dt;
        p.z += p.vz * dt;

        // Soft expansion and natural dissipation
        const progress = p.age / p.life;
        p.size = p.baseSize * (1.0 + progress * 2.4);
        p.alpha = 0.35 * Math.sin(progress * Math.PI) * Math.min(1.0, 0.4 + steamIntensity * 0.5);

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
      renderOrder={6}
      visible={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={steamTexture}
        color="#f8fafc"
        transparent
        opacity={0.35}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
});
