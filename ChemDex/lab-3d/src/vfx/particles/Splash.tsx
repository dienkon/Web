import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticlePool, ParticleState } from './ParticlePool';
import { particleOpacityShader } from './particleOpacity';
import { useQualityStore, QUALITY_CONFIGS } from '../quality';
import { vfxBus } from '../bus';
import { simulationFrameDt } from '../../core/clock';
import { useAppStore } from '../../store/useAppStore';
import { advanceSplatterFlight } from '../../science/splatterFlight';
import { LAB_PHYSICS } from '../../engine/interactionEngine';

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
    const dt = simulationFrameDt(delta, useAppStore.getState());

    pool.update(dt, (p: ParticleState) => {
      p.alpha = 0.95 * Math.max(0, 1 - p.age / p.life);
      const flight = advanceSplatterFlight(p, dt, LAB_PHYSICS.TABLE_SURFACE_Y);
      Object.assign(p, { x: flight.x, y: flight.y, z: flight.z, vx: flight.vx, vy: flight.vy, vz: flight.vz });
      return !flight.hit;
    }, meshRef.current, undefined, false);
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, maxCount]}
      frustumCulled={false}
      renderOrder={5}
      visible={false}
    >
      <dodecahedronGeometry args={[0.75, 0]} />
      <meshStandardMaterial onBeforeCompile={particleOpacityShader}
        color="#ffffff"
        roughness={0.1}
        metalness={0.1}
        transparent
        opacity={0.88}
        depthWrite={false}
      />
    </instancedMesh>
  );
});
