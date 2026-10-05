import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SimulationEngine } from '../core/SimulationEngine';
import { SedimentMesh } from './SedimentMesh';
import { getBubbleSpriteTexture, getSoftParticleTexture } from '../../vfx/textures';
import { useQualityStore } from '../../vfx/quality';
import { useAppStore } from '../../store/useAppStore';

export interface PhysicalSimulationRendererProps {
  vesselId: string;
  baseY: number;
  mouthY: number;
  radius: number;
  mouthRadius: number;
  color?: string;
  reactionGasRate?: number;
  reactionPrecipitateActive?: boolean;
  reactionPrecipitateSubstance?: string;
}

export const PhysicalSimulationRenderer = React.memo(function PhysicalSimulationRenderer({
  vesselId,
  baseY,
  mouthY,
  radius,
  mouthRadius,
  color = '#ffffff',
  reactionGasRate = 0,
  reactionPrecipitateActive = false,
  reactionPrecipitateSubstance
}: PhysicalSimulationRendererProps) {
  const effectiveTier = useQualityStore((state) => state.effectiveTier);
  const mgr = useMemo(() => SimulationEngine.getManager(vesselId, effectiveTier), [vesselId, effectiveTier]);

  const bubbleMeshRef = useRef<THREE.InstancedMesh>(null);
  const precipitateMeshRef = useRef<THREE.InstancedMesh>(null);
  const evaporationMeshRef = useRef<THREE.InstancedMesh>(null);

  const bubbleTexture = useMemo(() => getBubbleSpriteTexture(128), []);
  const vaporTexture = useMemo(() => getSoftParticleTexture(128), []);

  const scratchPos = useMemo(() => new THREE.Vector3(), []);
  const scratchScale = useMemo(() => new THREE.Vector3(), []);
  const scratchQuat = useMemo(() => new THREE.Quaternion(), []);
  const scratchEuler = useMemo(() => new THREE.Euler(), []);
  const scratchColor = useMemo(() => new THREE.Color(), []);
  const scratchMat4 = useMemo(() => new THREE.Matrix4(), []);

  // Initialize all instanced matrices to scale 0 at (0, -9999, 0)
  const zeroInstances = (mesh: THREE.InstancedMesh | null, maxCount: number) => {
    if (!mesh) return;
    scratchPos.set(0, -9999, 0);
    scratchScale.set(0, 0, 0);
    scratchQuat.identity();
    scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
    for (let i = 0; i < maxCount; i++) {
      mesh.setMatrixAt(i, scratchMat4);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.visible = false;
  };

  useEffect(() => {
    zeroInstances(bubbleMeshRef.current, mgr.boilingSystem.maxBubbles);
    zeroInstances(precipitateMeshRef.current, mgr.precipitationSystem.maxParticles);
    zeroInstances(evaporationMeshRef.current, mgr.evaporationSystem.maxParticles);

    return () => {
      SimulationEngine.removeManager(vesselId);
    };
  }, [mgr, vesselId]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const vessel = useAppStore.getState().vessels[vesselId];
    if (!vessel) return;

    // Check heating power from burners
    let heatPower_W = 0;
    const burners = useAppStore.getState().burners;
    for (const b of Object.values(burners)) {
      if (!b.isOn) continue;
      const hDist = Math.hypot(b.position[0] - vessel.position[0], b.position[2] - vessel.position[2]);
      const yDiff = vessel.position[1] - b.position[1];
      if (hDist < 0.85 && yDiff >= 0.6 && yDiff <= 2.8) {
        heatPower_W += (b.tempOutput_c || 450) * 0.08 * ((b.intensity || 3) / 3);
      }
    }

    // Check stirring rod agitation
    const activeTool = useAppStore.getState().activeTool;
    const isStirringThisVessel = activeTool === 'stirring_rod';
    const agitation = isStirringThisVessel ? 0.85 : 0;

    // Step physical simulation
    mgr.step(vessel, dt, {
      heatPower_W,
      agitation,
      ambientTemp_c: 25.0,
      reactionGasRate,
      reactionPrecipitateActive,
      reactionPrecipitateSubstance
    });

    const cam = state.camera;

    // 1. UPDATE PHYSICAL BUBBLES
    if (bubbleMeshRef.current) {
      const bList = mgr.boilingSystem.bubbles;
      const maxB = mgr.boilingSystem.maxBubbles;

      if (bList.length === 0) {
        if (bubbleMeshRef.current.visible) {
          bubbleMeshRef.current.visible = false;
        }
      } else {
        bubbleMeshRef.current.visible = true;
        for (let i = 0; i < maxB; i++) {
          if (i < bList.length) {
            const b = bList[i];
            scratchPos.set(b.x, b.y, b.z);
            scratchQuat.copy(cam.quaternion);

            // Volume-preserving oblate spheroidal deformation
            const ar = Math.max(0.5, Math.min(1.2, b.aspectRatio));
            const radY = b.radius * Math.pow(ar, 2 / 3);
            const radH = b.radius / Math.pow(ar, 1 / 3);
            scratchScale.set(radH * 2, radY * 2, radH * 2);

            scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
            bubbleMeshRef.current.setMatrixAt(i, scratchMat4);
          } else {
            scratchPos.set(0, -9999, 0);
            scratchScale.set(0, 0, 0);
            scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
            bubbleMeshRef.current.setMatrixAt(i, scratchMat4);
          }
        }
        bubbleMeshRef.current.instanceMatrix.needsUpdate = true;
      }
    }

    // 2. UPDATE PHYSICAL PRECIPITATE PARTICLES
    if (precipitateMeshRef.current) {
      const pList = mgr.precipitationSystem.particles;
      const maxP = mgr.precipitationSystem.maxParticles;

      if (pList.length === 0) {
        if (precipitateMeshRef.current.visible) {
          precipitateMeshRef.current.visible = false;
        }
      } else {
        precipitateMeshRef.current.visible = true;
        scratchColor.set(mgr.precipitationSystem.profile.color);
        const pMat = precipitateMeshRef.current.material as THREE.MeshStandardMaterial;
        if (pMat) {
          pMat.color.copy(scratchColor);
          pMat.roughness = mgr.precipitationSystem.profile.roughness;
          pMat.metalness = mgr.precipitationSystem.profile.specularReflectivity;
        }

        for (let i = 0; i < maxP; i++) {
          if (i < pList.length) {
            const p = pList[i];
            scratchPos.set(p.x, p.y, p.z);

            if (mgr.precipitationSystem.profile.morphology === 'crystalline') {
              // Crystalline flakes tumble with specular glint
              scratchEuler.set(p.age * 3.5 + p.brownianSeed, p.age * 4.0, p.brownianSeed);
              scratchQuat.setFromEuler(scratchEuler);
            } else {
              scratchQuat.copy(cam.quaternion);
            }

            const r = p.radius;
            scratchScale.set(r * 2, r * 2, r * 2);

            scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
            precipitateMeshRef.current.setMatrixAt(i, scratchMat4);

            if (precipitateMeshRef.current.instanceColor) {
              precipitateMeshRef.current.setColorAt(i, scratchColor);
            }
          } else {
            scratchPos.set(0, -9999, 0);
            scratchScale.set(0, 0, 0);
            scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
            precipitateMeshRef.current.setMatrixAt(i, scratchMat4);
          }
        }
        precipitateMeshRef.current.instanceMatrix.needsUpdate = true;
        if (precipitateMeshRef.current.instanceColor) {
          precipitateMeshRef.current.instanceColor.needsUpdate = true;
        }
      }
    }

    // 3. UPDATE PHYSICAL EVAPORATION VAPOR
    if (evaporationMeshRef.current) {
      const eList = mgr.evaporationSystem.particles;
      const maxE = mgr.evaporationSystem.maxParticles;

      if (eList.length === 0) {
        if (evaporationMeshRef.current.visible) {
          evaporationMeshRef.current.visible = false;
        }
      } else {
        evaporationMeshRef.current.visible = true;
        for (let i = 0; i < maxE; i++) {
          if (i < eList.length) {
            const e = eList[i];
            scratchPos.set(e.x, e.y, e.z);
            scratchQuat.copy(cam.quaternion);
            scratchScale.set(e.size * 2, e.size * 2, e.size * 2);

            scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
            evaporationMeshRef.current.setMatrixAt(i, scratchMat4);
          } else {
            scratchPos.set(0, -9999, 0);
            scratchScale.set(0, 0, 0);
            scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
            evaporationMeshRef.current.setMatrixAt(i, scratchMat4);
          }
        }
        evaporationMeshRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <group name={`physical_sim_${vesselId}`}>
      {/* 1. Boiling Bubbles InstancedMesh */}
      <instancedMesh
        ref={bubbleMeshRef}
        args={[undefined, undefined, mgr.boilingSystem.maxBubbles]}
        frustumCulled={false}
        renderOrder={5}
        visible={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={bubbleTexture}
          color="#f8fafc"
          transparent
          opacity={0.88}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      {/* 2. Precipitate Particles InstancedMesh */}
      <instancedMesh
        ref={precipitateMeshRef}
        args={[undefined, undefined, mgr.precipitationSystem.maxParticles]}
        frustumCulled={false}
        renderOrder={4}
        visible={false}
      >
        {mgr.precipitationSystem.profile.morphology === 'crystalline' ? (
          <cylinderGeometry args={[1, 1, 0.12, 6]} />
        ) : mgr.precipitationSystem.profile.morphology === 'flocculent' ? (
          <icosahedronGeometry args={[0.7, 0]} />
        ) : mgr.precipitationSystem.profile.morphology === 'granular' ? (
          <octahedronGeometry args={[0.6, 0]} />
        ) : (
          <dodecahedronGeometry args={[0.45, 0]} />
        )}
        <meshStandardMaterial
          color={mgr.precipitationSystem.profile.color}
          roughness={mgr.precipitationSystem.profile.roughness}
          metalness={mgr.precipitationSystem.profile.specularReflectivity}
          transparent
          opacity={0.92}
          depthWrite={false}
        />
      </instancedMesh>

      {/* 3. Bottom Sediment Bed Mesh */}
      <SedimentMesh
        baseY={baseY}
        radius={radius}
        sedimentBed={mgr.precipitationSystem.sedimentBed}
      />

      {/* 4. Surface Evaporation Vapor InstancedMesh */}
      <instancedMesh
        ref={evaporationMeshRef}
        args={[undefined, undefined, mgr.evaporationSystem.maxParticles]}
        frustumCulled={false}
        renderOrder={6}
        visible={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={vaporTexture}
          color="#f8fafc"
          transparent
          opacity={0.32}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </group>
  );
});
