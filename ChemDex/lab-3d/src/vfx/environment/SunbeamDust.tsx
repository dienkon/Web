import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useQualityStore } from '../quality';

export const SunbeamDust = React.memo(function SunbeamDust() {
  const effectiveTier = useQualityStore((state) => state.effectiveTier);
  const pointsRef = useRef<THREE.Points>(null);

  // 60 particles floating within the window sunbeam cone
  const particleCount = 50;

  const [positions, initialPositions] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const init = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Positioned near the window and beam path: X: -10 to -3, Y: 1.5 to 7.0, Z: -5 to 2
      const x = -9 + Math.random() * 7;
      const y = 2.0 + Math.random() * 4.5;
      const z = -4.5 + Math.random() * 6.0;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      init[i * 3] = x;
      init[i * 3 + 1] = y;
      init[i * 3 + 2] = z;
    }
    return [pos, init];
  }, [particleCount]);

  useFrame((state) => {
    if (!pointsRef.current || effectiveTier === 'low') return;
    const geom = pointsRef.current.geometry;
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
    if (!posAttr) return;

    const t = state.clock.getElapsedTime() * 0.4;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const initX = initialPositions[idx];
      const initY = initialPositions[idx + 1];
      const initZ = initialPositions[idx + 2];

      // Gentle organic drift using sine combinations
      array[idx] = initX + Math.sin(t + i * 1.7) * 0.35;
      array[idx + 1] = initY + Math.cos(t * 0.8 + i * 2.3) * 0.25;
      array[idx + 2] = initZ + Math.sin(t * 0.6 + i * 0.9) * 0.35;
    }

    posAttr.needsUpdate = true;
  });

  if (effectiveTier === 'low') return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.065}
        color="#fffbeb"
        transparent
        opacity={0.55}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
});
