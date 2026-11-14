import React, { useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PrecipitationSystem } from '../effects/PrecipitationSystem';
import { getPrecipitateProfile } from '../core/SimulationConfig';
import { FRAME_ORDER } from '../core/frameOrder';
import { createPrecipitateGeometry } from './precipitateGeometry';
import { useAppStore } from '../../store/useAppStore';
import { useQualityStore } from '../../vfx/quality';
import { immersedPrecipitateOpacity, precipitateFinish, withParticleOpacity } from './particleAppearance';
import { vesselInterior } from '../../science/vesselDimensions';
import { readablePrecipitateRadius } from './precipitateReadability';
import { SimulationEngine } from '../core/SimulationEngine';
import { precipitateDisplayIndex } from '../../science/precipitateParcels';

/** One material/geometry batch per species: a new reaction cannot recolor or
 * reshape the representative particles of an older product in the same cup. */
export function PrecipitateParticleLayer({ vesselId, formula, system, formation, capacity }: {
  vesselId: string; formula: string; system: PrecipitationSystem; formation?: string; capacity: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const uploaded = useRef<{ mesh: THREE.InstancedMesh; geometry: THREE.BufferGeometry; particles: unknown; count: number; time: number; profile: unknown; readable: boolean } | undefined>(undefined);
  const profile = getPrecipitateProfile(system.profile.id, formation);
  const morphology = profile.morphology;
  const reduced = useQualityStore(state => !['high', 'ultra'].includes(state.effectiveTier));
  const readable = useQualityStore(state => state.readablePrecipitates);
  const vesselType = useAppStore(state => state.vessels[vesselId]?.type ?? 'beaker');
  const geometry = useMemo(() => {
    const result = createPrecipitateGeometry(profile, reduced ? 'reduced' : 'full');
    result.setAttribute('aParticleOpacity', new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage));
    return result;
  }, [profile.id, morphology, reduced, capacity]);
  const material = useMemo(() => withParticleOpacity(new THREE.MeshPhysicalMaterial({
    ...precipitateFinish(profile), color: profile.color, transparent: true, opacity: 1, depthWrite: false,
  })), [profile.id, morphology]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const interior = vesselInterior(vesselType), half = interior.height / 2;
    mesh.current.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, (interior.floorY + interior.topY) / 2, 0),
      Math.hypot(interior.maximumRadius, half));
  }, [vesselType, capacity]);
  const scratch = useMemo(() => ({ position: new THREE.Vector3(), scale: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(), euler: new THREE.Euler(), matrix: new THREE.Matrix4() }), []);

  useFrame(() => {
    if (!mesh.current) return;
    const app = useAppStore.getState(), vessel = app.vessels[vesselId];
    if (!vessel || vessel.isShattered || vessel.volume_ml <= 0.2) { mesh.current.visible = false; return; }
    // A species may dissolve and reappear between React commits. Always read
    // the live population; a retained prop must never animate an orphan system.
    const liveSystem = SimulationEngine.findManager(vesselId)?.precipitationSystems.get(formula);
    if (!liveSystem) { mesh.current.visible = false; mesh.current.count = 0; return; }
    // Upload the retained snapshot while paused too: a moved vessel, a
    // remounted quality tier or an externally prepared specimen still renders.
    const particles = liveSystem.particles;
    mesh.current.visible = particles.length > 0;
    mesh.current.count = Math.min(capacity, liveSystem.maxParticles, particles.length);
    if (!particles.length) return;
    const last = uploaded.current;
    if (app.isSimulationPaused && last?.mesh === mesh.current && last.geometry === geometry && last.particles === particles
      && last.count === mesh.current.count && last.time === liveSystem.integratedTime_s && last.profile === liveSystem.profile && last.readable === readable) return;
    const material = mesh.current.material as THREE.MeshPhysicalMaterial;
    material.color.set(liveSystem.profile.color);
    material.roughness = liveSystem.profile.roughness;
    material.metalness = liveSystem.profile.metalness ?? 0;
    material.specularIntensity = liveSystem.profile.specularReflectivity;
    for (let i = 0; i < mesh.current.count; i++) {
      const p = particles[precipitateDisplayIndex(i, mesh.current.count, particles.length)];
      scratch.position.set(p.x, p.y, p.z);
      if (morphology === 'crystalline' || morphology === 'gel_like') {
        scratch.euler.set(p.age * 0.65 + p.brownianSeed, p.age * 0.85, Math.sin(p.age * 1.1 + p.brownianSeed) * 0.6);
        scratch.quaternion.setFromEuler(scratch.euler);
      } else {
        scratch.euler.set(p.brownianSeed, p.brownianSeed * 2.4, p.brownianSeed * 0.7);
        scratch.quaternion.setFromEuler(scratch.euler);
      }
      // Representative display enlargement has its own containment bound;
      // it never feeds back into the carrier's physical radius or motion.
      scratch.scale.setScalar(readablePrecipitateRadius(p, liveSystem.profile, liveSystem.renderBounds, readable));
      (geometry.getAttribute('aParticleOpacity') as THREE.InstancedBufferAttribute).setX(i, immersedPrecipitateOpacity(p, liveSystem.profile, liveSystem.renderBounds, liveSystem.cloudiness));
      scratch.matrix.compose(scratch.position, scratch.quaternion, scratch.scale);
      mesh.current.setMatrixAt(i, scratch.matrix);
    }
    mesh.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.current.instanceMatrix.clearUpdateRanges();
    mesh.current.instanceMatrix.addUpdateRange(0, mesh.current.count * 16);
    mesh.current.instanceMatrix.needsUpdate = true;
    const opacity = geometry.getAttribute('aParticleOpacity') as THREE.InstancedBufferAttribute;
    opacity.clearUpdateRanges(); opacity.addUpdateRange(0, mesh.current.count); opacity.needsUpdate = true;
    uploaded.current = { mesh: mesh.current, geometry, particles, count: mesh.current.count, time: liveSystem.integratedTime_s, profile: liveSystem.profile, readable };
  }, FRAME_ORDER.particles);

  return <instancedMesh ref={mesh} name={`physical_precipitate_${vesselId}_${system.profile.id}`} args={[undefined, undefined, capacity]}
    geometry={geometry} material={material} renderOrder={4} visible={false} />;
}
