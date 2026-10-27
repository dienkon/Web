import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PrecipitationSystem } from '../effects/PrecipitationSystem';
import { getPrecipitateProfile } from '../core/SimulationConfig';
import { FRAME_ORDER } from '../core/frameOrder';
import { createGelGeometry } from './gelGeometry';
import { useAppStore } from '../../store/useAppStore';

/** One material/geometry batch per species: a new reaction cannot recolor or
 * reshape the representative particles of an older product in the same cup. */
export function PrecipitateParticleLayer({ vesselId, system, formation, capacity }: {
  vesselId: string; system: PrecipitationSystem; formation?: string; capacity: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const morphology = getPrecipitateProfile(system.profile.id, formation).morphology;
  const gel = useMemo(() => createGelGeometry(), []);
  useEffect(() => () => gel.dispose(), [gel]);
  const scratch = useMemo(() => ({ position: new THREE.Vector3(), scale: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(), euler: new THREE.Euler(), matrix: new THREE.Matrix4() }), []);

  useFrame(({ camera }) => {
    if (!mesh.current) return;
    const app = useAppStore.getState(), vessel = app.vessels[vesselId];
    if (!vessel || vessel.isShattered || vessel.volume_ml <= 0.2) { mesh.current.visible = false; return; }
    if (app.isSimulationPaused) return;
    const particles = system.particles;
    mesh.current.visible = particles.length > 0;
    mesh.current.count = Math.min(capacity, particles.length);
    if (!particles.length) return;
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
      } else scratch.quaternion.copy(camera.quaternion);
      scratch.scale.setScalar(p.radius * 2);
      scratch.matrix.compose(scratch.position, scratch.quaternion, scratch.scale);
      mesh.current.setMatrixAt(i, scratch.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  }, FRAME_ORDER.particles);

  return <instancedMesh ref={mesh} args={[undefined, undefined, capacity]} frustumCulled={false} renderOrder={4} visible={false}>
    {morphology === 'crystalline' ? <cylinderGeometry args={[1, 1, 0.12, 6]} />
      : morphology === 'gel_like' ? <primitive object={gel} attach="geometry" />
      : morphology === 'flocculent' ? <icosahedronGeometry args={[0.7, 0]} />
      : morphology === 'granular' ? <octahedronGeometry args={[0.6, 0]} />
      : <dodecahedronGeometry args={[0.45, 0]} />}
    <meshPhysicalMaterial clearcoat={morphology === 'crystalline' ? 1 : 0} clearcoatRoughness={0.08}
      color={system.profile.color} roughness={system.profile.roughness} metalness={system.profile.metalness ?? 0}
      transparent opacity={morphology === 'gel_like' ? 0.62 : 0.92} depthWrite={false} />
  </instancedMesh>;
}
