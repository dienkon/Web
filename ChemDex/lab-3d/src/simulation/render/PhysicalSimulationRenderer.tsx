import { simulationFrameDt } from '../../core/clock';
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SimulationEngine } from '../core/SimulationEngine';
import { FRAME_ORDER } from '../core/frameOrder';
import { precipitateComponents } from '../../science/precipitateInventory';
import { sameMolecularFormula } from '../../science/speciesIdentity';
import { SedimentMesh } from './SedimentMesh';
import { getBubbleSpriteTexture, getSoftParticleTexture } from '../../vfx/textures';
import { useQualityStore } from '../../vfx/quality';
import { useAppStore } from '../../store/useAppStore';
import { PrecipitateParticleLayer } from './PrecipitateParticleLayer';
import { createInstancedMistMaterial, mistParticleAppearance } from './mistAppearance';

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
  const componentSignature = useAppStore(state => {
    const vessel = state.vessels[vesselId];
    if (!vessel) return '[]';
    const active = reactionPrecipitateSubstance || vessel.precipitateSubstance;
    return JSON.stringify(precipitateComponents(vessel.contents, active).map(c => [c.formula,
      c.formation ?? (active && sameMolecularFormula(active, c.formula) ? vessel.precipitateMorphology : undefined)]));
  });
  const components = useMemo(() => JSON.parse(componentSignature) as [string, string | null][], [componentSignature]);
  const effectiveTier = useQualityStore((state) => state.effectiveTier);
  const mgr = useMemo(() => SimulationEngine.getManager(vesselId, effectiveTier), [vesselId, effectiveTier]);

  const bubbleMeshRef = useRef<THREE.InstancedMesh>(null);
  const evaporationMeshRef = useRef<THREE.InstancedMesh>(null);

  const bubbleTexture = useMemo(() => getBubbleSpriteTexture(128), []);
  const vaporTexture = useMemo(() => getSoftParticleTexture(128), []);
  const vaporGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute('aMistOpacity', new THREE.InstancedBufferAttribute(new Float32Array(mgr.evaporationSystem.maxParticles), 1));
    return geometry;
  }, [mgr]);
  const vaporMaterial = useMemo(() => createInstancedMistMaterial(vaporTexture), [vaporTexture]);
  useEffect(() => () => { vaporGeometry.dispose(); }, [vaporGeometry]);
  useEffect(() => () => { vaporMaterial.dispose(); }, [vaporMaterial]);

  const scratchPos = useMemo(() => new THREE.Vector3(), []);
  const scratchScale = useMemo(() => new THREE.Vector3(), []);
  const scratchQuat = useMemo(() => new THREE.Quaternion(), []);
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
    zeroInstances(evaporationMeshRef.current, mgr.evaporationSystem.maxParticles);

    return () => {
      SimulationEngine.removeManager(vesselId);
    };
  }, [mgr, vesselId]);

  useFrame((state, delta) => {
    const app = useAppStore.getState();
    const dt = simulationFrameDt(delta, app);
    const vessel = useAppStore.getState().vessels[vesselId];
    if (!vessel || vessel.isShattered || (vessel.volume_ml ?? 0) <= 0.2) {
      if (vessel?.isShattered) {
        mgr.reset();
      }
      if (bubbleMeshRef.current?.visible) bubbleMeshRef.current.visible = false;
      if (evaporationMeshRef.current?.visible) evaporationMeshRef.current.visible = false;
      if (!vessel || vessel.isShattered) return;
    }

    // The store already allocates finite burner/hotplate/virtual-source heat.
    // Read the last accepted mean input; flame temperature is not power.
    const heatPower_W = vessel.thermalHeatingPower_W ?? 0;

    // Check stirring rod agitation
    const activeTool = useAppStore.getState().activeTool;
    const isStirringThisVessel = activeTool === 'stirring_rod' && useAppStore.getState().selectedVesselId === vesselId;
    const agitation = isStirringThisVessel ? 0.85 : 0;

    // Step physical simulation
    if (dt > 0) mgr.step(vessel, dt, {
      thermalStateAuthoritative: true,
      heatPower_W,
      agitation,
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
        bubbleMeshRef.current.count = bList.length;
        for (let i = 0; i < bList.length; i++) {
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
        evaporationMeshRef.current.count = eList.length;
        for (let i = 0; i < eList.length; i++) {
          if (i < eList.length) {
            const e = eList[i];
            scratchPos.set(e.x, e.y, e.z);
            scratchQuat.copy(cam.quaternion);
            const appearance = mistParticleAppearance(e);
            scratchScale.setScalar(appearance.diameter);
            (vaporGeometry.getAttribute('aMistOpacity') as THREE.InstancedBufferAttribute).setX(i, appearance.opacity);

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
        vaporGeometry.getAttribute('aMistOpacity').needsUpdate = true;
      }
    }
  }, FRAME_ORDER.physics);

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

      {components.map(([formula, formation]) => <PrecipitateParticleLayer key={formula} vesselId={vesselId}
        system={mgr.getPrecipitationSystem(formula)} formation={formation ?? undefined} capacity={mgr.maxPrecipitateParticles} />)}

      {/* 3. Bottom Sediment Bed Mesh */}
      <SedimentMesh
        vesselId={vesselId}
        baseY={baseY}
        radius={radius}
        sedimentBed={mgr.sedimentBed}
      />

      {/* 4. Surface Evaporation Vapor InstancedMesh */}
      <instancedMesh
        ref={evaporationMeshRef}
        args={[undefined, undefined, mgr.evaporationSystem.maxParticles]}
        geometry={vaporGeometry}
        material={vaporMaterial}
        dispose={null}
        frustumCulled={false}
        renderOrder={6}
        visible={false}
      />
    </group>
  );
});
