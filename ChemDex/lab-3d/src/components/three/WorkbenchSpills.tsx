import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { simulationFrameDt } from '../../core/clock';
import { useAppStore } from '../../store/useAppStore';
import type { SpillState } from '../../types/chemistry';
import { SpilledSolids } from './SpilledSolids';
import { LAB_PHYSICS } from '../../engine/interactionEngine';
import { solveSessileDrop } from '../../science/sessileDrop';
import type { SessileDropShape } from '../../science/sessileDrop';
import { METERS_PER_SCENE_UNIT } from '../../science/sceneUnits';
import { createSpillGeometry } from '../../pour/render/spillGeometry';
import { Steam } from '../../vfx/particles/Steam';
import { waterVisualState } from '../../vfx/waterVisualState';
import { useLabEnvironment } from '../../store/useLabEnvironment';

export const WorkbenchSpills = React.memo(function WorkbenchSpills() {
  const spills = useAppStore(state => state.spills);
  return <group>{Object.values(spills || {}).map(spill => <SpillPuddle key={spill.id} spill={spill} />)}</group>;
});

function SpillPuddle({ spill }: { spill: SpillState }) {
  const environment = useLabEnvironment(s => s.conditions);
  const vapor = useMemo(() => waterVisualState({ volume_ml: spill.volume_ml, temperature_c: spill.temperature_c ?? 25,
    evaporationRate_g_s: spill.vaporRate_g_s ?? 0, isBoiling: (spill.vaporRate_g_s ?? 0) > 0, environment }),
    [spill.volume_ml, spill.temperature_c, spill.vaporRate_g_s, environment]);
  const material = useRef<THREE.MeshPhysicalMaterial>(null);
  const targetColor = useMemo(() => new THREE.Color(), []);
  const initialColor = useRef(spill.color || '#f8fafc');
  useFrame((_, delta) => {
    const dt = simulationFrameDt(delta, useAppStore.getState());
    material.current?.color.lerp(targetColor.set(spill.color || '#f8fafc'), 1 - Math.exp(-dt * 5));
  });
  // Deposition coordinates belong to the inventory, including after remount.
  const position: [number, number, number] = [spill.position[0], LAB_PHYSICS.TABLE_SURFACE_Y + 0.001, spill.position[2]];
  const drop = useMemo(() => solveSessileDrop(spill.volume_ml), [spill.volume_ml]);
  const geometry = useMemo(() => drop ? createSpillGeometry(drop) : null, [drop]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  return <group position={position}>
    <SpilledSolids spill={spill} />
    <SpillReactionBubbles spill={spill} drop={drop} pressure_atm={environment.pressure_atm} />
    {(spill.thermalVaporEnthalpy_J ?? 0) > 0 && <Steam vesselId={spill.id}
      surfaceY={(drop?.height_m ?? 0) / METERS_PER_SCENE_UNIT} radius={spill.radius} sourceState={vapor} />}
    {geometry && <mesh geometry={geometry} receiveShadow>
      <meshPhysicalMaterial ref={material} color={initialColor.current} transparent opacity={0.88}
        roughness={0.03} transmission={0.86} ior={1.333} clearcoat={1} clearcoatRoughness={0.02}
        depthWrite={false} />
    </mesh>}
  </group>;
}

/** Bounded packets of generated gas, with no source after chemistry stops. */
function SpillReactionBubbles({ spill, drop, pressure_atm }: { spill: SpillState; drop: SessileDropShape | null; pressure_atm: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const transform = useMemo(() => new THREE.Object3D(), []);
  const pool = useRef({ credit: 0, serial: 0, particles: Array.from({ length: 16 }, () => ({ age: 1, x: 0, z: 0, y: 0 })) });
  useFrame((_, delta) => {
    if (!mesh.current) return;
    const dt = simulationFrameDt(delta, useAppStore.getState()), p = pool.current;
    const ml_s = (Math.max(0, spill.gasRate_mol_s ?? 0) + Math.max(0, spill.vaporRate_g_s ?? 0) / 18.015)
      * 82.057 * ((spill.temperature_c ?? 25) + 273.15) / pressure_atm;
    p.credit = ml_s > 0 ? Math.min(16, p.credit + ml_s * dt / 0.05) : 0;
    for (let i = 0; i < p.particles.length; i++) {
      const bubble = p.particles[i]; bubble.age += dt;
      if (bubble.age >= 0.4 && p.credit >= 1 && dt > 0) {
        p.credit--; const n = p.serial++, angle = n * 2.399963;
        const r = Math.sqrt(((n * 0.618034) % 1)) * spill.radius * 0.7;
        bubble.x = Math.cos(angle) * r; bubble.z = Math.sin(angle) * r; bubble.age = 0;
        const profile = drop?.profile ?? [], radius_m = r * METERS_PER_SCENE_UNIT;
        const index = profile.findIndex(point => point.radius_m >= radius_m);
        const a = profile[Math.max(0, index - 1)], b = profile[Math.max(0, index)];
        const fraction = a && b && b.radius_m > a.radius_m ? (radius_m - a.radius_m) / (b.radius_m - a.radius_m) : 0;
        bubble.y = a && b ? (a.height_m + (b.height_m - a.height_m) * fraction) / METERS_PER_SCENE_UNIT : 0;
      }
      const life = Math.min(1, bubble.age / 0.4);
      transform.position.set(bubble.x, bubble.y + 0.006 + life * 0.03, bubble.z);
      transform.scale.setScalar(bubble.age < 0.4 ? 0.012 * Math.sin(Math.PI * life) : 0);
      transform.updateMatrix(); mesh.current.setMatrixAt(i, transform.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, 16]} frustumCulled={false}>
    <sphereGeometry args={[1, 8, 6]} />
    <meshPhysicalMaterial color="#f8fafc" transparent opacity={0.45} roughness={0.05} depthWrite={false} />
  </instancedMesh>;
}

export default WorkbenchSpills;
