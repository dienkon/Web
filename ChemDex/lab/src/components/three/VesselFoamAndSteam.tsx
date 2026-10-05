import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface VesselFoamAndSteamProps {
  radius: number;
  height: number;
  liquidY: number; // Y position of liquid surface
  temperature_c: number;
  isBoiling: boolean;
  boilingIntensity?: number;
  foam_ml?: number;
  capacity_ml: number;
  liquidColor?: string;
  hasGas?: boolean;
  gasColor?: string;
}

export const VesselFoamAndSteam = React.memo(function VesselFoamAndSteam({
  radius,
  height,
  liquidY,
  temperature_c,
  isBoiling,
  boilingIntensity = 0.5,
  foam_ml = 0,
  capacity_ml,
  liquidColor = '#ffffff',
  hasGas = false,
  gasColor = '#cbd5e1'
}: VesselFoamAndSteamProps) {
  const steamRef = useRef<THREE.InstancedMesh>(null);
  const foamRef = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Number of rising steam/vapor particles when hot or boiling
  const steamCount = (isBoiling || temperature_c >= 75) ? 18 : 0;

  const steamParticles = useMemo(() => {
    return Array.from({ length: 18 }).map(() => ({
      x: (Math.random() - 0.5) * radius * 1.4,
      y: Math.random() * 0.8,
      z: (Math.random() - 0.5) * radius * 1.4,
      speed: 0.35 + Math.random() * 0.45,
      size: 0.04 + Math.random() * 0.04,
      life: Math.random(),
    }));
  }, [radius]);

  // Foam bubbles count based on foam_ml
  const foamCount = Math.min(24, Math.floor((foam_ml / 8) * 12));
  const foamBubbles = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (radius * 0.92);
      return {
        x: Math.cos(angle) * dist,
        y: (Math.random() * 0.12),
        z: Math.sin(angle) * dist,
        size: 0.035 + (i % 4) * 0.015,
      };
    });
  }, [radius]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);

    // Animate rising steam vapor when boiling
    if (steamRef.current && steamCount > 0) {
      steamParticles.forEach((p, idx) => {
        p.life = (p.life + dt * p.speed) % 1.0;
        const currentY = liquidY + p.life * (height * 0.75);
        // Vapor spreads wider as it rises
        const spread = 1.0 + p.life * 1.5;
        dummy.position.set(p.x * spread, currentY, p.z * spread);
        const scale = p.size * (1.0 + p.life * 2.2);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        steamRef.current!.setMatrixAt(idx, dummy.matrix);
      });
      steamRef.current.instanceMatrix.needsUpdate = true;
    }

    // Animate foam breathing/bubbling
    if (foamRef.current && foam_ml > 0) {
      const time = state.clock.elapsedTime;
      const wobble = Math.sin(time * 6) * 0.01;
      foamRef.current.position.y = liquidY + wobble;
    }
  });

  return (
    <group>
      {/* 1. Cellular Foam Layer on top of liquid meniscus */}
      {foam_ml > 0 && (
        <group ref={foamRef} position={[0, liquidY, 0]}>
          {/* Frothy base disc */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[radius * 0.96, 24]} />
            <meshStandardMaterial
              color="#ffffff"
              transparent
              opacity={0.88}
              roughness={0.4}
              metalness={0.05}
              depthWrite={false}
            />
          </mesh>
          {/* Multi-bubble foam clusters */}
          {foamBubbles.slice(0, foamCount).map((b, i) => (
            <mesh key={i} position={[b.x, b.y, b.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[b.size, 16]} />
              <meshStandardMaterial
                color="#ffffff"
                transparent
                opacity={0.65}
                roughness={0.2}
                metalness={0.1}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* 2. Soft Steam & Vapor Particles rising from liquid surface */}
      {steamCount > 0 && (
        <instancedMesh ref={steamRef} args={[undefined, undefined, 18]} renderOrder={4}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={isBoiling ? 0.28 * Math.max(0.4, boilingIntensity) : 0.12}
            depthWrite={false}
          />
        </instancedMesh>
      )}
    </group>
  );
});

export default VesselFoamAndSteam;
