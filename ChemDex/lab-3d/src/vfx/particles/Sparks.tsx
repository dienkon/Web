import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticlePool, ParticleState } from './ParticlePool';
import { particleOpacityShader } from './particleOpacity';
import { useQualityStore, QUALITY_CONFIGS } from '../quality';
import { getSparkTexture } from '../textures';
import { PRNG } from '../../core/rng';
import { simulationFrameDt } from '../../core/clock';
import { useAppStore } from '../../store/useAppStore';
import { advanceSplatterFlight } from '../../science/splatterFlight';
import { LAB_PHYSICS } from '../../engine/interactionEngine';
import { vfxBus } from '../bus';

export interface SparksProps {
  origin?: [number, number, number];
  rate?: number;
  burstCount?: number;
  color?: string;
  active?: boolean;
  listenToEvents?: boolean;
  groundY?: number;
}

export const Sparks = React.memo(function Sparks({
  origin = [0, 0, 0],
  rate = 30,
  burstCount = 0,
  color = '#fbbf24',
  active = true,
  listenToEvents = false,
  groundY = LAB_PHYSICS.TABLE_SURFACE_Y,
}: SparksProps) {
  const rng = useMemo(() => new PRNG(), []);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const effectiveTier = useQualityStore((state) => state.effectiveTier);
  const multiplier = QUALITY_CONFIGS[effectiveTier].particleMultiplier;

  const maxCount = useMemo(() => {
    const isHighOrUltra = effectiveTier === 'high' || effectiveTier === 'ultra';
    const base = isHighOrUltra ? 100 : effectiveTier === 'medium' ? 50 : 20;
    return Math.max(16, Math.floor(base * multiplier));
  }, [effectiveTier, multiplier]);

  const pool = useMemo(() => new ParticlePool(maxCount), [maxCount]);
  const sparkTexture = useMemo(() => getSparkTexture(), []);
  const spawnTimer = useRef(0);
  const sparkColor = useMemo(() => new THREE.Color(color), [color]);
  const emission = useRef({ origin, sparkColor, multiplier });
  emission.current.origin = origin;
  emission.current.sparkColor = sparkColor;
  emission.current.multiplier = multiplier;

  useEffect(() => {
    return () => {
      if (meshRef.current) pool.clear(meshRef.current);
    };
  }, [pool]);

  useEffect(() => {
    if (!listenToEvents) return;
    return vfxBus.on('sparks', event => {
      const tint = new THREE.Color(event.color || '#fbbf24');
      const count = Math.min(maxCount, Math.max(0, Math.floor(event.count * multiplier)));
      for (let i = 0; i < count; i++) {
        const angle = rng.next() * Math.PI * 2, elevation = 0.3 + rng.next() * 0.7;
        const speed = (event.speed ?? 16) * (0.6 + rng.next() * 0.8);
        pool.spawn({ x: event.position[0], y: event.position[1], z: event.position[2],
          vx: Math.cos(angle) * speed * (1 - elevation), vy: speed * elevation,
          vz: Math.sin(angle) * speed * (1 - elevation), baseSize: 0.025 + rng.next() * 0.025,
          life: 0.25 + rng.next() * 0.25, r: tint.r, g: tint.g, b: tint.b });
      }
    });
  }, [listenToEvents, pool, maxCount, multiplier, rng]);

  // Burst trigger if burstCount > 0
  useEffect(() => {
    const { origin, sparkColor, multiplier } = emission.current;
    if (burstCount > 0 && active) {
      const countToSpawn = Math.floor(burstCount * multiplier);
      for (let i = 0; i < countToSpawn; i++) {
        const theta = rng.next() * Math.PI * 2;
        const phi = rng.next() * (Math.PI * 0.45); // Upward hemisphere cone
        const speed = 2.0 + rng.next() * 3.5;

        const vx = Math.cos(theta) * Math.sin(phi) * speed;
        const vy = Math.cos(phi) * speed * 1.2;
        const vz = Math.sin(theta) * Math.sin(phi) * speed;

        const baseSize = 0.04 + rng.next() * 0.035;

        pool.spawn({
          x: origin[0],
          y: origin[1],
          z: origin[2],
          vx,
          vy,
          vz,
          baseSize,
          size: baseSize,
          life: 0.35 + rng.next() * 0.35,
          r: sparkColor.r,
          g: sparkColor.g,
          b: sparkColor.b,
          alpha: 1.0,
        });
      }
    }
  }, [burstCount, active, pool]);

  useFrame((frame, delta) => {
    if (!meshRef.current) return;
    const dt = simulationFrameDt(delta, useAppStore.getState());

    // Continuous emission
    if (active && rate > 0) {
      spawnTimer.current += dt * rate * multiplier;

      while (spawnTimer.current >= 1.0) {
        spawnTimer.current -= 1.0;

        const theta = rng.next() * Math.PI * 2;
        const phi = rng.next() * (Math.PI * 0.4);
        const speed = 1.8 + rng.next() * 2.8;

        const vx = Math.cos(theta) * Math.sin(phi) * speed;
        const vy = Math.cos(phi) * speed;
        const vz = Math.sin(theta) * Math.sin(phi) * speed;

        const baseSize = 0.035 + rng.next() * 0.025;

        pool.spawn({
          age: spawnTimer.current / (rate * multiplier) - dt,
          x: origin[0] + (rng.next() - 0.5) * 0.05,
          y: origin[1],
          z: origin[2] + (rng.next() - 0.5) * 0.05,
          vx,
          vy,
          vz,
          baseSize,
          size: baseSize,
          life: 0.3 + rng.next() * 0.25,
          r: sparkColor.r,
          g: sparkColor.g,
          b: sparkColor.b,
          alpha: 1.0,
        });
      }
    }

    pool.update(dt, (p: ParticleState, particleDt) => {
      p.alpha = Math.sqrt(Math.max(0, 1 - p.age / p.life));
      const flight = advanceSplatterFlight(p, particleDt, groundY);
      Object.assign(p, { x: flight.x, y: flight.y, z: flight.z, vx: flight.vx, vy: flight.vy, vz: flight.vz });
      p.rotZ = Math.atan2(p.vy, Math.hypot(p.vx, p.vz));
      return !flight.hit;
    }, meshRef.current, frame.camera, false);
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, maxCount]}
      frustumCulled={false}
      renderOrder={7}
      name={listenToEvents ? 'reaction-event-sparks' : 'reaction-continuous-sparks'}
    >
      <planeGeometry args={[1.5, 0.4]} />
      <meshBasicMaterial onBeforeCompile={particleOpacityShader}
        map={sparkTexture}
        color="#ffffff"
        transparent
        opacity={1.0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
});
