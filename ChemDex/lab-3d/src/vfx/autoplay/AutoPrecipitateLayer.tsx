import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AutoExperiment } from './AutoExperiment';
import { createPrecipitateGeometry } from '../../simulation/render/precipitateGeometry';
import { immersedPrecipitateOpacity, precipitateFinish, withParticleOpacity } from '../../simulation/render/particleAppearance';
import { readablePrecipitateRadius } from '../../simulation/render/precipitateReadability';

/** Uses the same species morphology, hydrated-gel finish, containment and
 * physical population as the hands-on bench. No independent particle source. */
export function AutoPrecipitateLayer({ experiment: e, formula }: { experiment: AutoExperiment; formula: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null), uploaded = useRef(-1);
  const capacity = e.physics.maxPrecipitateParticles;
  const geometries = useMemo(() => new Map<string, THREE.BufferGeometry>(), []);
  const material = useMemo(() => withParticleOpacity(new THREE.MeshPhysicalMaterial({
    color: 'white', transparent: true, depthWrite: false, roughness: 0.7, clearcoat: 0.2,
  })), []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => () => { geometries.forEach(g => g.dispose()); material.dispose(); }, [geometries, material]);
  useFrame(() => {
    const target = mesh.current, system = e.physics.precipitationSystems.get(formula);
    if (!target) return;
    target.visible = !!system?.particles.length;
    if (!system || !target.visible) { target.count = 0; uploaded.current = -1; return; }
    if (e.paused && uploaded.current === system.integratedTime_s) return;
    const profile = system.profile, key = `${profile.id}:${profile.morphology}`;
    let geometry = geometries.get(key);
    if (!geometry) {
      geometry = createPrecipitateGeometry(profile, 'reduced');
      geometry.setAttribute('aParticleOpacity', new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage));
      geometries.set(key, geometry);
    }
    if (target.geometry !== geometry) { target.geometry = geometry; material.needsUpdate = true; }
    Object.assign(material, precipitateFinish(profile)); material.color.set(profile.color);
    target.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const opacity = geometry.getAttribute('aParticleOpacity') as THREE.InstancedBufferAttribute;
    const count = Math.min(capacity, system.particles.length);
    for (let i = 0; i < count; i++) {
      const p = system.particles[i];
      scratch.position.set(p.x, p.y, p.z);
      scratch.rotation.set(p.brownianSeed, p.age * 0.4, p.brownianSeed * 0.6);
      scratch.scale.setScalar(readablePrecipitateRadius(p, profile, system.renderBounds)); scratch.updateMatrix();
      target.setMatrixAt(i, scratch.matrix);
      opacity.setX(i, immersedPrecipitateOpacity(p, profile, system.renderBounds, e.physics.cloudiness));
    }
    target.count = count;
    target.instanceMatrix.clearUpdateRanges(); target.instanceMatrix.addUpdateRange(0, count * 16); target.instanceMatrix.needsUpdate = true;
    opacity.clearUpdateRanges(); opacity.addUpdateRange(0, count); opacity.needsUpdate = true;
    uploaded.current = system.integratedTime_s;
  });
  return <instancedMesh ref={mesh} name={`auto_precipitate_${formula}`} args={[undefined, undefined, capacity]}
    material={material} visible={false} frustumCulled={false} renderOrder={4} dispose={null} />;
}
