import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useQualityStore, QUALITY_CONFIGS } from '../quality';
import { useAppStore } from '../../store/useAppStore';

export interface FoamProps {
  vesselId: string;
  radius?: number;
  surfaceY?: number;
  vesselTopY?: number;
  capacity_ml?: number;
  liquidColor?: string;
  active?: boolean;
}

export const Foam = React.memo(function Foam({
  vesselId,
  radius = 0.55,
  surfaceY = 0.0,
  vesselTopY = 1.0,
  capacity_ml = 250,
  liquidColor = '#f8fafc',
  active = true,
}: FoamProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const effectiveTier = useQualityStore((state) => state.effectiveTier);
  const multiplier = QUALITY_CONFIGS[effectiveTier].particleMultiplier;

  const count = useMemo(() => {
    return Math.max(16, Math.floor((effectiveTier === 'high' ? 96 : effectiveTier === 'medium' ? 48 : 20) * multiplier));
  }, [effectiveTier, multiplier]);

  // Persistent pseudo-random positions for the foam cluster
  const clusterData = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i * 2.39996); // Golden angle
      const rRatio = Math.sqrt((i + 1) / count);
      return {
        rRatio,
        angle,
        // Realistic fine cellular froth bubbles
        baseScale: 0.022 + (i % 4) * 0.008,
        verticalPhase: (i % 7) * 0.4,
        speed: 1.5 + (i % 3) * 0.5,
      };
    });
  }, [count]);

  const scratchPos = useMemo(() => new THREE.Vector3(), []);
  const scratchQuat = useMemo(() => new THREE.Quaternion(), []);
  const scratchScale = useMemo(() => new THREE.Vector3(), []);
  const scratchMat4 = useMemo(() => new THREE.Matrix4(), []);
  const foamColor = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    if (meshRef.current) {
      scratchPos.set(0, -9999, 0);
      scratchScale.set(0, 0, 0);
      scratchQuat.identity();
      scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
      for (let i = 0; i < count; i++) {
        meshRef.current.setMatrixAt(i, scratchMat4);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
      meshRef.current.visible = false;
    }
  }, [count, scratchMat4, scratchPos, scratchQuat, scratchScale]);

  useFrame((state) => {
    if (!meshRef.current || !active) return;

    const vessel = useAppStore.getState().vessels[vesselId];
    const foamMl = vessel?.foam_ml ?? 0;

    if (foamMl <= 0.05) {
      if (meshRef.current.visible) {
        meshRef.current.visible = false;
      }
      return;
    }

    meshRef.current.visible = true;

    // Calculate foam column height based on foam_ml
    const cap = vessel?.capacity_ml || capacity_ml;
    const foamVolumeRatio = Math.min(3.0, foamMl / Math.max(1, cap));
    const columnHeight = foamVolumeRatio * 1.2;

    const time = state.clock.getElapsedTime();
    foamColor.set(vessel?.liquidColor || liquidColor).lerp(new THREE.Color('#ffffff'), 0.82);

    for (let i = 0; i < count; i++) {
      const d = clusterData[i];
      const hFrac = (i / count);
      let y = surfaceY + hFrac * columnHeight + Math.sin(time * d.speed + d.verticalPhase) * 0.02;

      let r = d.rRatio * radius;

      // Overflow behavior: if foam rises above vesselTopY, spill outwards and down
      if (y > vesselTopY) {
        const overflow = y - vesselTopY;
        r = radius + overflow * 0.35; // Expands outward
        y = vesselTopY - overflow * 0.5; // Cascades downward outside
      }

      scratchPos.set(
        Math.cos(d.angle) * r,
        y,
        Math.sin(d.angle) * r
      );

      const wobbleScale = d.baseScale * (1.0 + Math.sin(time * 3.0 + i) * 0.08);
      scratchScale.set(wobbleScale, wobbleScale * 0.85, wobbleScale);
      scratchQuat.identity();

      scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
      meshRef.current.setMatrixAt(i, scratchMat4);
      meshRef.current.setColorAt(i, foamColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled={false}
      renderOrder={4}
      visible={false}
    >
      <sphereGeometry args={[1, 10, 10]} />
      <meshStandardMaterial
        roughness={0.2}
        metalness={0.05}
        transparent
        opacity={0.88}
        depthWrite={false}
      />
    </instancedMesh>
  );
});
