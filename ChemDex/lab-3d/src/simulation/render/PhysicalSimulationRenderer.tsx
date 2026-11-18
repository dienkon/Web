import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SimulationEngine } from '../core/SimulationEngine';
import { FRAME_ORDER } from '../core/frameOrder';
import { freePrecipitateCohorts } from '../../science/freePrecipitateCohorts';
import { SedimentMesh } from './SedimentMesh';
import { getBubbleSpriteTexture, getSoftParticleTexture } from '../../vfx/textures';
import { useQualityStore } from '../../vfx/quality';
import { useVesselVisualRuntime, useVesselVisualState, useVesselVisualStore } from './VesselVisualContext';
import { PrecipitateParticleLayer } from './PrecipitateParticleLayer';
import { vesselAgitation } from '../../science/stirring';
import { createInstancedMistMaterial, mistParticleAppearance } from './mistAppearance';
import { physicalEffectsRuntime } from '../core/PhysicalEffectsRuntime';
import { bubbleOpacity, withParticleOpacity } from './particleAppearance';
import { activePrecipitateVessels, precipitateSceneBudget } from './precipitateBudget';
import { studioProgramForReaction } from '../../engine/studioProgram';


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
  const runtime = useVesselVisualRuntime(), store = useVesselVisualStore();
  const external = runtime?.externallyStepped ?? false;
  const componentSignature = useVesselVisualState(state => {
    const vessel = state.vessels[vesselId];
    if (!vessel) return '[]';
    const active = reactionPrecipitateSubstance || vessel.precipitateSubstance;
    return JSON.stringify(freePrecipitateCohorts(vessel, active).map(c => [c.key, c.formula, c.formation]));
  });
  const components = useMemo(() => JSON.parse(componentSignature) as [string, string, string | null][], [componentSignature]);
  const effectiveTier = useQualityStore((state) => state.effectiveTier);
  const mgr = useMemo(() => runtime?.manager ?? SimulationEngine.getManager(vesselId, effectiveTier), [runtime?.manager, vesselId, effectiveTier]);
  const activePrecipitates = useVesselVisualState(state => activePrecipitateVessels(state.vessels));
  const budget = precipitateSceneBudget(effectiveTier, activePrecipitates);
  const precipitateBudget = Math.max(components.length, budget.physical);
  useEffect(() => { if (!external) mgr.setPrecipitateBudget(precipitateBudget); }, [mgr, precipitateBudget, external]);

  const bubbleMeshRef = useRef<THREE.InstancedMesh>(null);
  const evaporationMeshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const bubbleTexture = useMemo(() => getBubbleSpriteTexture(128), []);
  const vaporTexture = useMemo(() => getSoftParticleTexture(128), []);
  const vaporGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute('aMistOpacity', new THREE.InstancedBufferAttribute(new Float32Array(mgr.evaporationSystem.maxParticles), 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aMistStructure', new THREE.InstancedBufferAttribute(new Float32Array(mgr.evaporationSystem.maxParticles * 2), 2).setUsage(THREE.DynamicDrawUsage));
    return geometry;
  }, [mgr]);
  const vaporMaterial = useMemo(() => createInstancedMistMaterial(vaporTexture), [vaporTexture]);
  const bubbleGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute('aParticleOpacity', new THREE.InstancedBufferAttribute(new Float32Array(mgr.boilingSystem.maxBubbles), 1).setUsage(THREE.DynamicDrawUsage));
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
  useEffect(() => {
    if (external) return;
    return physicalEffectsRuntime.register(vesselId, dt => {
      const app = store.getState(), vessel = app.vessels[vesselId];
      if (!vessel || vessel.isShattered) return;
      groupRef.current?.updateWorldMatrix(true, false);
      const f = forcing.current;
      mgr.step(vessel, dt, {
        bodyMatrixWorld: groupRef.current?.matrixWorld.elements,
        thermalStateAuthoritative: true,
        liquidMotionAuthoritative: f.agitationOverride === undefined,
        heatPower_W: vessel.thermalHeatingPower_W ?? 0,
        agitation: f.agitationOverride === undefined ? vesselAgitation(vessel, app) : f.agitationOverride,
        reactionGasRate: f.reactionGasRate,
        reactionProgram: app.activeKinetics[vesselId]?.program ?? studioProgramForReaction(
          app.activeKinetics[vesselId]?.reactionId ?? vessel.lastReactionId ?? vessel.studioProgramId ?? ''),
        reactionPrecipitateActive: f.reactionPrecipitateActive,
        reactionPrecipitateSubstance: f.reactionPrecipitateSubstance,
      });
    });
  }, [mgr, vesselId, store, external]);

  // Initialize all instanced matrices to scale 0 at (0, -9999, 0)
  const zeroInstances = (mesh: THREE.InstancedMesh | null, maxCount: number) => {
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
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
      if (external) return;
      const live = store.getState().vessels[vesselId];
      if (!live) SimulationEngine.removeManager(vesselId);
      else if (live.isShattered) mgr.reset();
    };
  }, [mgr, vesselId, store, external]);

  useFrame((state) => {
    const vessel = store.getState().vessels[vesselId];
    if (!vessel || vessel.isShattered || (vessel.volume_ml ?? 0) <= 0.2) {
      if (vessel?.isShattered && !external) mgr.reset();
      if (bubbleMeshRef.current?.visible) bubbleMeshRef.current.visible = false;
      if (evaporationMeshRef.current?.visible) evaporationMeshRef.current.visible = false;
      if (!vessel || vessel.isShattered) return;
    }

    groupRef.current?.updateWorldMatrix(true, false);
    if (groupRef.current) bodyMatrix.copy(groupRef.current.matrixWorld);
    inverseBodyQuat.setFromRotationMatrix(bodyRotation.extractRotation(bodyMatrix)).invert();

    if (!external) mgr.syncLiquidMotion(vessel, undefined, true, forcing.current.agitationOverride === undefined);

    // Quantitative steps ran in PhysicalEffectsRuntime before this upload.

    const cam = state.camera;

    // 1. UPDATE PHYSICAL BUBBLES
    if (bubbleMeshRef.current) {
      const bList = mgr.boilingSystem.bubbles;
      if (bList.length === 0) {
        bubbleMeshRef.current.count = 0;
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
        bubbleMeshRef.current.instanceMatrix.clearUpdateRanges();
        bubbleMeshRef.current.instanceMatrix.addUpdateRange(0, bList.length * 16);
        (bubbleGeometry.getAttribute('aParticleOpacity') as THREE.InstancedBufferAttribute).clearUpdateRanges();
        (bubbleGeometry.getAttribute('aParticleOpacity') as THREE.InstancedBufferAttribute).addUpdateRange(0, bList.length);
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
      if (eList.length === 0) {
        evaporationMeshRef.current.count = 0;
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
        evaporationMeshRef.current.instanceMatrix.clearUpdateRanges();
        evaporationMeshRef.current.instanceMatrix.addUpdateRange(0, eList.length * 16);
        (vaporGeometry.getAttribute('aMistOpacity') as THREE.InstancedBufferAttribute).clearUpdateRanges();
        (vaporGeometry.getAttribute('aMistOpacity') as THREE.InstancedBufferAttribute).addUpdateRange(0, eList.length);
        (vaporGeometry.getAttribute('aMistStructure') as THREE.InstancedBufferAttribute).clearUpdateRanges();
        (vaporGeometry.getAttribute('aMistStructure') as THREE.InstancedBufferAttribute).addUpdateRange(0, eList.length * 2);
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

      {components.map(([cohortKey, formula, formation], index) => <PrecipitateParticleLayer key={cohortKey} vesselId={vesselId} formula={formula} cohortKey={cohortKey}
        system={mgr.getPrecipitationSystem(formula, formation ?? undefined)} formation={formation ?? undefined}
        capacity={Math.floor(budget.visible / Math.max(1, components.length))
          + (index < budget.visible % Math.max(1, components.length) ? 1 : 0)} />)}

      {/* 3. Bottom Sediment Bed Mesh */}
      <SedimentMesh
        vesselId={vesselId}
        baseY={baseY}
        radius={radius}
        sedimentBed={mgr.sedimentBed}
        readOpticalCohorts={() => [...mgr.precipitationSystems.values()].map(system => ({
          mass_g: system.sedimentBed.amount_g, profile: system.profile }))}
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
