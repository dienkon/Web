import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useQualityStore, QUALITY_CONFIGS } from '../quality';
import { useAppStore } from '../../store/useAppStore';
import { getBubbleSpriteTexture } from '../textures';
import { simulationFrameDt } from '../../core/clock';
import { foamLayer, foamGlyph } from '../geometry/foamLayer';
import { RealisticLiquid } from '../materials/liquid';

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
  const specimen = useAppStore(s => s.vessels[vesselId]);
  const filledLayer = useMemo(() => specimen && active ? foamLayer(specimen) : null, [specimen, active]);
  const simulationTime = useRef(0);
  const sampleRevision = useRef(-1);
  const glyphScratch = useMemo(() => ({ x: 0, y: 0, z: 0, radius: 0 }), []);
  const envelope = useRef({ sample: null as unknown, x: NaN, y: NaN, z: NaN,
    layer: null as ReturnType<typeof foamLayer> });
  const effectiveTier = useQualityStore((state) => state.effectiveTier);
  const multiplier = QUALITY_CONFIGS[effectiveTier].particleMultiplier;
  const bubbleTexture = useMemo(() => getBubbleSpriteTexture(128), []);

  const count = useMemo(() => {
    const isHighOrUltra = effectiveTier === 'high' || effectiveTier === 'ultra';
    const base = isHighOrUltra ? 96 : effectiveTier === 'medium' ? 48 : 20;
    return Math.max(16, Math.floor(base * multiplier));
  }, [effectiveTier, multiplier]);

  const scratchPos = useMemo(() => new THREE.Vector3(), []);
  const scratchQuat = useMemo(() => new THREE.Quaternion(), []);
  const bodyQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const localUp = useMemo(() => new THREE.Vector3(), []);
  const scratchScale = useMemo(() => new THREE.Vector3(), []);
  const scratchMat4 = useMemo(() => new THREE.Matrix4(), []);
  const foamColor = useMemo(() => new THREE.Color(), []);
  const white = useMemo(() => new THREE.Color('#ffffff'), []);
  const lastColor = useRef<string | null>(null);

  useEffect(() => {
    lastColor.current = null;
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

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    if (!active) { meshRef.current.visible = false; return; }

    const vessel = useAppStore.getState().vessels[vesselId];
    if (!vessel || vessel.isShattered || (vessel.volume_ml ?? 0) <= 0.2) {
      if (meshRef.current.visible) {
        meshRef.current.visible = false;
      }
      return;
    }

    const foamMl = vessel?.foam_ml ?? 0;

    if (foamMl <= 0.05) {
      if (meshRef.current.visible) {
        meshRef.current.visible = false;
      }
      return;
    }

    meshRef.current.visible = true;

    meshRef.current.getWorldQuaternion(bodyQuaternion).invert();
    localUp.set(0, 1, 0).applyQuaternion(bodyQuaternion);
    const cached = envelope.current;
    if (cached.sample !== vessel || Math.abs(cached.x - localUp.x) > 1e-8 || Math.abs(cached.y - localUp.y) > 1e-8
      || Math.abs(cached.z - localUp.z) > 1e-8) {
      cached.sample = vessel; cached.x = localUp.x; cached.y = localUp.y; cached.z = localUp.z;
      cached.layer = foamLayer(vessel, [localUp.x, localUp.y, localUp.z]);
    }
    const layer = cached.layer;
    if (!layer) { meshRef.current.visible = false; return; }
    const revision = vessel.effectSampleRevision ?? 0;
    if (sampleRevision.current !== revision) { sampleRevision.current = revision; simulationTime.current = 0; }
    simulationTime.current += simulationFrameDt(delta, useAppStore.getState());
    const time = simulationTime.current;
    const colorKey = vessel.liquidColor || liquidColor;
    const recolor = lastColor.current !== colorKey;
    if (recolor) foamColor.set(colorKey).lerp(white, 0.88);
    scratchQuat.copy(bodyQuaternion).multiply(state.camera.quaternion);

    for (let i = 0; i < count; i++) {
      const glyph = foamGlyph(layer, i, count, time, glyphScratch);
      scratchPos.set(glyph.x, glyph.y, glyph.z);
      scratchScale.set(glyph.radius, glyph.radius, glyph.radius);
      scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
      meshRef.current.setMatrixAt(i, scratchMat4);
      if (recolor) meshRef.current.setColorAt(i, foamColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (recolor && meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    lastColor.current = colorKey;
  });

  return <group>
    {filledLayer && specimen && <RealisticLiquid vesselId={vesselId} vesselType={specimen.type} capacity_ml={specimen.capacity_ml}
      volumeOverride_ml={filledLayer.baseVolume + filledLayer.gasVolume} bottomVolume_ml={filledLayer.baseVolume}
      colorOverride="#f1f5f9" appearance="foam" />}
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled={false}
      renderOrder={4}
      name={`finite-foam-${vesselId}`}
      visible={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={bubbleTexture}
        color="#ffffff"
        transparent
        opacity={0.65}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  </group>;
});
