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
import { vesselAgitation } from '../../science/stirring';
import { createInstancedMistMaterial, mistParticleAppearance } from './mistAppearance';
import { physicalEffectsRuntime } from '../core/PhysicalEffectsRuntime';
import { bubbleOpacity, withParticleOpacity } from './particleAppearance';
import { activePrecipitateVessels, precipitateSceneBudget } from './precipitateBudget';

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
  agitationOverride?: number; // Explicit carrier forcing for controlled specimen comparisons
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
  reactionPrecipitateSubstance,
  agitationOverride,
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
  const activePrecipitates = useAppStore(state => activePrecipitateVessels(state.vessels));
  const budget = precipitateSceneBudget(effectiveTier, activePrecipitates);
  const precipitateBudget = Math.max(components.length, budget.physical);
  useEffect(() => mgr.setPrecipitateBudget(precipitateBudget), [mgr, precipitateBudget]);

  const bubbleMeshRef = useRef<THREE.InstancedMesh>(null);
  const evaporationMeshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const bubbleTexture = useMemo(() => getBubbleSpriteTexture(128), []);
  const vaporTexture = useMemo(() => getSoftParticleTexture(128), []);
  const vaporGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute('aMistOpacity', new THREE.InstancedBufferAttribute(new Float32Array(mgr.evaporationSystem.maxParticles), 1));
    geometry.setAttribute('aMistStructure', new THREE.InstancedBufferAttribute(new Float32Array(mgr.evaporationSystem.maxParticles * 2), 2));
    return geometry;
  }, [mgr]);
  const vaporMaterial = useMemo(() => createInstancedMistMaterial(vaporTexture), [vaporTexture]);
  const bubbleGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute('aParticleOpacity', new THREE.InstancedBufferAttribute(new Float32Array(mgr.boilingSystem.maxBubbles), 1));
    return geometry;
  }, [mgr]);
  const bubbleMaterial = useMemo(() => withParticleOpacity(new THREE.MeshBasicMaterial({
    map: bubbleTexture, color: '#f8fafc', transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide,
  })), [bubbleTexture]);
  useEffect(() => () => { bubbleGeometry.dispose(); }, [bubbleGeometry]);
  useEffect(() => () => { bubbleMaterial.dispose(); }, [bubbleMaterial]);
  useEffect(() => () => { vaporGeometry.dispose(); }, [vaporGeometry]);
  useEffect(() => () => { vaporMaterial.dispose(); }, [vaporMaterial]);

  const scratchPos = useMemo(() => new THREE.Vector3(), []);
  const scratchScale = useMemo(() => new THREE.Vector3(), []);
  const scratchQuat = useMemo(() => new THREE.Quaternion(), []);
  const inverseBodyQuat = useMemo(() => new THREE.Quaternion(), []);
  const scratchMat4 = useMemo(() => new THREE.Matrix4(), []);
  const bodyMatrix = useMemo(() => new THREE.Matrix4(), []);
  const bodyRotation = useMemo(() => new THREE.Matrix4(), []);
  const forcing = useRef({ agitationOverride, reactionGasRate, reactionPrecipitateActive, reactionPrecipitateSubstance });
  forcing.current = { agitationOverride, reactionGasRate, reactionPrecipitateActive, reactionPrecipitateSubstance };
  useEffect(() => physicalEffectsRuntime.register(vesselId, dt => {
    const app = useAppStore.getState(), vessel = app.vessels[vesselId];
    if (!vessel || vessel.isShattered) return;
    groupRef.current?.updateWorldMatrix(true, false);
    const f = forcing.current;
    mgr.step(vessel, dt, {
      bodyMatrixWorld: groupRef.current?.matrixWorld.elements,
      thermalStateAuthoritative: true,
      heatPower_W: vessel.thermalHeatingPower_W ?? 0,
      agitation: f.agitationOverride === undefined ? vesselAgitation(vessel, app) : f.agitationOverride,
      reactionGasRate: f.reactionGasRate,
      reactionPrecipitateActive: f.reactionPrecipitateActive,
      reactionPrecipitateSubstance: f.reactionPrecipitateSubstance,
    });
  }), [mgr, vesselId]);

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
      // A renderer may remount when quality/canvas settings change. The sample
      // still owns its population history; only removing the vessel retires it.
      const live = useAppStore.getState().vessels[vesselId];
      if (!live) SimulationEngine.removeManager(vesselId);
      else if (live.isShattered) mgr.reset();
    };
  }, [mgr, vesselId]);

  useFrame((state) => {
    const vessel = useAppStore.getState().vessels[vesselId];
    if (!vessel || vessel.isShattered || (vessel.volume_ml ?? 0) <= 0.2) {
      if (vessel?.isShattered) {
        mgr.reset();
      }
      if (bubbleMeshRef.current?.visible) bubbleMeshRef.current.visible = false;
      if (evaporationMeshRef.current?.visible) evaporationMeshRef.current.visible = false;
      if (!vessel || vessel.isShattered) return;
    }

    groupRef.current?.updateWorldMatrix(true, false);
    if (groupRef.current) bodyMatrix.copy(groupRef.current.matrixWorld);
    inverseBodyQuat.setFromRotationMatrix(bodyRotation.extractRotation(bodyMatrix)).invert();

    // Quantitative steps ran in PhysicalEffectsRuntime before this upload.

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
            (bubbleGeometry.getAttribute('aParticleOpacity') as THREE.InstancedBufferAttribute).setX(i, bubbleOpacity(b));
            scratchPos.set(b.x, b.y, b.z);
            scratchQuat.copy(inverseBodyQuat).multiply(cam.quaternion);

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
        bubbleGeometry.getAttribute('aParticleOpacity').needsUpdate = true;
      }
    }

    // 3. UPDATE PHYSICAL EVAPORATION VAPOR
    if (evaporationMeshRef.current) {
      // Mist particles already live in world space once emitted. Cancel the
      // container transform while retaining the same React ownership/lifecycle.
      if (bodyMatrix) evaporationMeshRef.current.matrix.copy(bodyMatrix).invert();
      evaporationMeshRef.current.updateWorldMatrix(false, false);
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
            (vaporGeometry.getAttribute('aMistStructure') as THREE.InstancedBufferAttribute).setXY(i, e.curlSeed, e.age);

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
        vaporGeometry.getAttribute('aMistStructure').needsUpdate = true;
      }
    }
  }, FRAME_ORDER.physics);

  return (
    <group ref={groupRef} name={`physical_sim_${vesselId}`}>
      {/* 1. Boiling Bubbles InstancedMesh */}
      <instancedMesh
        ref={bubbleMeshRef}
        name={`physical_bubbles_${vesselId}`}
        args={[undefined, undefined, mgr.boilingSystem.maxBubbles]}
        geometry={bubbleGeometry}
        material={bubbleMaterial}
        frustumCulled={false}
        renderOrder={5}
        visible={false}
      />

      {components.map(([formula, formation]) => <PrecipitateParticleLayer key={formula} vesselId={vesselId}
        system={mgr.getPrecipitationSystem(formula)} formation={formation ?? undefined}
        capacity={Math.ceil(budget.visible / Math.max(1, components.length))} />)}

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
        name={`physical_mist_${vesselId}`}
        matrixAutoUpdate={false}
        args={[undefined, undefined, mgr.evaporationSystem.maxParticles]}
        geometry={vaporGeometry}
        material={vaporMaterial}
        frustumCulled={false}
        renderOrder={6}
        visible={false}
      />
    </group>
  );
});
