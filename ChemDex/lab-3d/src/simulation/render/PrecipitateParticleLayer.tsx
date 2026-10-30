import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PrecipitationSystem } from '../effects/PrecipitationSystem';
import { getPrecipitateProfile } from '../core/SimulationConfig';
import { FRAME_ORDER } from '../core/frameOrder';
import { createPrecipitateGeometry } from './precipitateGeometry';
import { useAppStore } from '../../store/useAppStore';

/** One material/geometry batch per species: a new reaction cannot recolor or
 * reshape the representative particles of an older product in the same cup. */
export function PrecipitateParticleLayer({ vesselId, system, formation, capacity }: {
  vesselId: string; system: PrecipitationSystem; formation?: string; capacity: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const uploaded = useRef<{ mesh: THREE.InstancedMesh; particles: unknown; count: number; time: number; profile: unknown } | undefined>(undefined);
  const profile = getPrecipitateProfile(system.profile.id, formation);
  const morphology = profile.morphology;
  const geometry = useMemo(() => createPrecipitateGeometry(profile), [profile.id, morphology]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const scratch = useMemo(() => ({ position: new THREE.Vector3(), scale: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(), euler: new THREE.Euler(), matrix: new THREE.Matrix4() }), []);

  useFrame(({ camera }) => {
    if (!mesh.current) return;
    const app = useAppStore.getState(), vessel = app.vessels[vesselId];
    if (!vessel || vessel.isShattered || vessel.volume_ml <= 0.2) { mesh.current.visible = false; return; }
    // Upload the retained snapshot while paused too: a moved vessel, a
    // remounted quality tier or an externally prepared specimen still renders.
    const particles = system.particles;
    mesh.current.visible = particles.length > 0;
    mesh.current.count = Math.min(capacity, particles.length);
    if (!particles.length) return;
    const last = uploaded.current;
    if (app.isSimulationPaused && last?.mesh === mesh.current && last.particles === particles
      && last.count === mesh.current.count && last.time === system.integratedTime_s && last.profile === system.profile) return;
    const material = mesh.current.material as THREE.MeshPhysicalMaterial;
    material.color.set(system.profile.color);
    material.roughness = system.profile.roughness;
    material.metalness = system.profile.metalness ?? 0;
    for (let i = 0; i < mesh.current.count; i++) {
      const p = particles[i];
      scratch.position.set(p.x, p.y, p.z);
      if (morphology === 'crystalline' || morphology === 'gel_like') {
        scratch.euler.set(p.age * 0.65 + p.brownianSeed, p.age * 0.85, Math.sin(p.age * 1.1 + p.brownianSeed) * 0.6);
        scratch.quaternion.setFromEuler(scratch.euler);
      } else {
        scratch.euler.set(p.brownianSeed, p.brownianSeed * 2.4, p.brownianSeed * 0.7);
        scratch.quaternion.setFromEuler(scratch.euler);
      }
      scratch.scale.setScalar(p.radius * 2);
      scratch.matrix.compose(scratch.position, scratch.quaternion, scratch.scale);
      mesh.current.setMatrixAt(i, scratch.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    uploaded.current = { mesh: mesh.current, particles, count: mesh.current.count, time: system.integratedTime_s, profile: system.profile };
  }, FRAME_ORDER.particles);

  return <instancedMesh ref={mesh} name={`physical_precipitate_${vesselId}_${system.profile.id}`} args={[undefined, undefined, capacity]} frustumCulled={false} renderOrder={4} visible={false}>
    <primitive object={geometry} attach="geometry" />
    <meshPhysicalMaterial clearcoat={morphology === 'crystalline' ? 1 : 0} clearcoatRoughness={0.08}
      color={system.profile.color} roughness={system.profile.roughness} metalness={system.profile.metalness ?? 0}
      transparent opacity={morphology === 'gel_like' ? 0.62 : 0.92} depthWrite={false} />
  </instancedMesh>;
}
