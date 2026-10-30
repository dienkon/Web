import React, { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useQualityStore, QUALITY_CONFIGS } from '../quality';
import { getSoftParticleTexture } from '../textures';
import { useAppStore } from '../../store/useAppStore';
import { simulationFrameDt } from '../../core/clock';
import { roomGasClouds, representativeGasOpacity, type GasCloudSource } from '../../simulation/effects/GasCloudRepository';
import { createInstancedMistMaterial, mistParticleAppearance } from '../../simulation/render/mistAppearance';
import { gasVisualState } from '../gasVisualState';
import { GAS_FUME_TABLE } from '../catalog/gasTable';
import { getVesselProfile, getWorldVesselProfile } from '../../pour/physics/profiles';
import { renderedVesselBody } from '../../simulation/render/vesselBodyFrames';
import { DEFAULT_LAB_ENVIRONMENT } from '../../science/labEnvironment';
import { LAB_PHYSICS } from '../../engine/interactionEngine';
import { FRAME_ORDER } from '../../simulation/core/frameOrder';

const visibleSpecies = Object.entries(GAS_FUME_TABLE).filter(([s, info]) => s !== 'H2O' && info.visible).map(([s]) => s);

/** One room clock, independent of the conditional per-vessel VFX tree. */
export function GasClouds() {
  useFrame((_, delta) => {
    const state = useAppStore.getState(); roomGasClouds.syncEpoch(state.pourEpoch);
    const dt = simulationFrameDt(delta, state); if (!(dt > 0)) return;
    const sources: GasCloudSource[] = [];
    for (const v of Object.values(state.vessels)) {
      if (v.id.startsWith('lesson_vessel_') || !v.gasFlux) continue;
      const body = renderedVesselBody(v.id), matrix = body?.matrixWorld.clone() ?? new THREE.Matrix4().makeTranslation(...v.position);
      const shape = body ? getVesselProfile(v.type, v.capacity_ml) : getWorldVesselProfile(v.type, v.capacity_ml);
      const env = { ...DEFAULT_LAB_ENVIRONMENT, ...v.environment, ...v.effectsEnvironment };
      for (const gas of gasVisualState(v).visible) sources.push({ vesselId: v.id, revision: v.effectSampleRevision ?? 0,
        receipt: v.gasFlux, seconds: v.gasFlux.dt_s, species: gas.formula,
        input: { rate: gas.rate, mol_s: gas.mol_s, temperature_c: v.temperature_c, ambient_c: env.temperature_c,
          molarMass: gas.molarMass, mouthY: shape.baseY + shape.H, mouthRadius: shape.mouthR,
          floorY: LAB_PHYSICS.TABLE_SURFACE_Y, wind_m_s: env.airSpeed_m_s,
          sourceToWorld: point => new THREE.Vector3(...point).applyMatrix4(matrix).toArray() } });
    }
    roomGasClouds.advance(dt, sources);
  }, FRAME_ORDER.physics);
  return <group name="room_gas_clouds">{visibleSpecies.map(species => <GasCloudLayer key={species} species={species} />)}</group>;
}

function GasCloudLayer({ species }: { species: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const tier = useQualityStore(s => s.effectiveTier);
  const maximum = Math.max(16, Math.floor((tier === 'high' || tier === 'ultra' ? 140 : tier === 'medium' ? 70 : 30)
    * QUALITY_CONFIGS[tier].particleMultiplier));
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.setAttribute('aMistOpacity', new THREE.InstancedBufferAttribute(new Float32Array(maximum), 1)); return g;
  }, [maximum]);
  const texture = useMemo(() => getSoftParticleTexture(128), []);
  const material = useMemo(() => {
    const m = createInstancedMistMaterial(texture); m.color.set(GAS_FUME_TABLE[species].colorHex ?? '#ffffff'); return m;
  }, [texture, species]);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(frame => {
    const target = mesh.current; if (!target) return;
    const particles = [...roomGasClouds.clouds.values()].filter(c => c.species === species).flatMap(c => c.system.particles);
    const count = Math.min(maximum, particles.length);
    target.count = count; target.visible = count > 0; if (!count) return;
    target.parent?.updateWorldMatrix(true, false);
    target.matrix.copy(target.parent?.matrixWorld ?? new THREE.Matrix4()).invert(); target.updateWorldMatrix(false, false);
    const opacity = geometry.getAttribute('aMistOpacity') as THREE.InstancedBufferAttribute, weight = particles.length / count;
    for (let i = 0; i < count; i++) {
      const p = particles[Math.floor(i * weight)], appearance = mistParticleAppearance(p);
      scratch.position.set(p.x, p.y, p.z); scratch.quaternion.copy(frame.camera.quaternion);
      scratch.scale.setScalar(appearance.diameter); scratch.updateMatrix(); target.setMatrixAt(i, scratch.matrix);
      opacity.setX(i, representativeGasOpacity(appearance.opacity, weight));
    }
    target.instanceMatrix.needsUpdate = true; opacity.needsUpdate = true;
  }, FRAME_ORDER.particles);
  return <instancedMesh ref={mesh} name={`gas_clouds_${species}`} matrixAutoUpdate={false}
    args={[undefined, undefined, maximum]} geometry={geometry} material={material} dispose={null}
    frustumCulled={false} renderOrder={6} visible={false} />;
}
