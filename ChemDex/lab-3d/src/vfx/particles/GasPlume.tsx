import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useQualityStore, QUALITY_CONFIGS } from '../quality';
import { getSoftParticleTexture } from '../textures';
import { useAppStore } from '../../store/useAppStore';
import { simulationFrameDt } from '../../core/clock';
import { PRNG, seedForLabel } from '../../core/rng';
import { GasPlumeSystem } from '../../simulation/effects/GasPlumeSystem';
import { createInstancedMistMaterial, mistParticleAppearance } from '../../simulation/render/mistAppearance';
import { gasVisualState } from '../gasVisualState';
import { GAS_FUME_TABLE } from '../catalog/gasTable';
import { contourRadius, vesselInterior } from '../../science/vesselDimensions';
import { DEFAULT_LAB_ENVIRONMENT } from '../../science/labEnvironment';
import { LAB_PHYSICS } from '../../engine/interactionEngine';

export interface GasPlumeProps {
  vesselId?: string;
  species?: string;
  // Legacy optical props never authorize a source or override species identity.
  origin?: [number, number, number]; surfaceY?: number; radius?: number;
  color?: string; density?: 'heavy' | 'light' | 'neutral'; rate?: number; turbidity?: number; active?: boolean;
}

export const GasPlume = React.memo(function GasPlume({ vesselId, species, active = true }: GasPlumeProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const revision = useRef<number | undefined>(undefined);
  const tier = useQualityStore(s => s.effectiveTier);
  const maximum = Math.max(16, Math.floor((tier === 'high' || tier === 'ultra' ? 140 : tier === 'medium' ? 70 : 30)
    * QUALITY_CONFIGS[tier].particleMultiplier));
  const system = useMemo(() => new GasPlumeSystem(maximum, new PRNG(seedForLabel(`${vesselId}:${species}:gas`))), [maximum, vesselId, species]);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.setAttribute('aMistOpacity', new THREE.InstancedBufferAttribute(new Float32Array(maximum), 1));
    return g;
  }, [maximum]);
  const texture = useMemo(() => getSoftParticleTexture(128), []);
  const material = useMemo(() => {
    const m = createInstancedMistMaterial(texture);
    m.color.set(GAS_FUME_TABLE[species ?? '']?.colorHex ?? '#ffffff');
    return m;
  }, [texture, species]);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((frame, delta) => {
    if (!mesh.current) return;
    const state = useAppStore.getState(), v = vesselId ? state.vessels[vesselId] : undefined;
    const info = GAS_FUME_TABLE[species ?? ''];
    if (!v || v.isShattered || !info?.visible || species === 'H2O') {
      system.reset(); mesh.current.visible = false; return;
    }
    if (revision.current !== v.effectSampleRevision) { system.reset(); revision.current = v.effectSampleRevision; }
    const dt = simulationFrameDt(delta, state);
    const gas = gasVisualState(v).visible.find(g => g.formula === species);
    const shape = vesselInterior(v.type), env = { ...DEFAULT_LAB_ENVIRONMENT, ...v.environment, ...v.effectsEnvironment };
    system.update(dt, { rate: active ? gas?.rate ?? 0 : 0, mol_s: active ? gas?.mol_s ?? 0 : 0,
      temperature_c: v.temperature_c, ambient_c: env.temperature_c, molarMass: info.molarMass_g_mol,
      mouthY: shape.topY, mouthRadius: contourRadius(shape.points, shape.topY),
      floorY: LAB_PHYSICS.TABLE_SURFACE_Y - v.position[1], wind_m_s: env.airSpeed_m_s });
    const opacity = geometry.getAttribute('aMistOpacity') as THREE.InstancedBufferAttribute;
    for (let i = 0; i < system.particles.length; i++) {
      const p = system.particles[i], appearance = mistParticleAppearance(p);
      scratch.position.set(p.x, p.y, p.z);
      scratch.quaternion.copy(frame.camera.quaternion);
      scratch.scale.setScalar(appearance.diameter); scratch.updateMatrix();
      mesh.current.setMatrixAt(i, scratch.matrix); opacity.setX(i, appearance.opacity);
    }
    mesh.current.count = system.particles.length;
    mesh.current.visible = system.particles.length > 0;
    mesh.current.instanceMatrix.needsUpdate = true; opacity.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, maximum]} geometry={geometry} material={material}
    dispose={null} frustumCulled={false} renderOrder={6} visible={false} />;
});