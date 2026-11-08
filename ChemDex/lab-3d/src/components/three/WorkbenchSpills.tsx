import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { simulationFrameDt } from '../../core/clock';
import { useAppStore } from '../../store/useAppStore';
import type { SpillState } from '../../types/chemistry';
import { SpilledSolids } from './SpilledSolids';
import { LAB_PHYSICS } from '../../engine/interactionEngine';
import { supportPlaneScene } from '../../core/labGeometry';
import { solveSessileDrop } from '../../science/sessileDrop';
import type { SessileDropShape } from '../../science/sessileDrop';
import { METERS_PER_SCENE_UNIT } from '../../science/sceneUnits';
import { createSpillGeometry } from '../../pour/render/spillGeometry';
import { Steam } from '../../vfx/particles/Steam';
import { waterVisualState } from '../../vfx/waterVisualState';
import { useLabEnvironment } from '../../store/useLabEnvironment';
import { SpilledSodium, type SpillSodiumContactPoint } from './SpilledSodium';
import { StockSpillGrain } from './StockSpillGrain';
import { spillSurfaceY } from '../../vfx/geometry/spillSodium';
import { sodiumMetalMass } from '../../science/sodiumWater';
import { useQualityStore, getQualitySettings } from '../../vfx/quality';
import { spillAbsorptionPerMeter } from '../../science/spillOptics';
import { createSpillOpticalMaterials } from '../../vfx/materials/spillOpticalMaterial';

export const WorkbenchSpills = React.memo(function WorkbenchSpills() {
  const spills = useAppStore(state => state.spills);
  return <group>{Object.values(spills || {}).map(spill => spill.stockMotion ? <StockSpillGrain key={spill.id} spill={spill} /> : <SpillPuddle key={spill.id} spill={spill} />)}</group>;
});

function SpillPuddle({ spill }: { spill: SpillState }) {
  const sodiumContact = useRef<SpillSodiumContactPoint>({ active: false, x: 0, y: 0, z: 0, radius: 0 });
  const environment = useLabEnvironment(s => s.conditions);
  const vapor = useMemo(() => waterVisualState({ volume_ml: spill.volume_ml, temperature_c: spill.temperature_c ?? 25,
    evaporationRate_g_s: spill.vaporRate_g_s ?? 0, isBoiling: (spill.vaporRate_g_s ?? 0) > 0, environment }),
    [spill.volume_ml, spill.temperature_c, spill.vaporRate_g_s, environment]);
  const refractive = useQualityStore(s => getQualitySettings(s.effectiveTier).glassTransmission);
  const optical = useMemo(() => createSpillOpticalMaterials(refractive), [refractive]);
  // Deposition coordinates belong to the inventory, including after remount.
  const position: [number, number, number] = [spill.position[0], supportPlaneScene(spill.position) + 0.001, spill.position[2]];
  const drop = useMemo(() => solveSessileDrop(spill.volume_ml), [spill.volume_ml]);
  const geometry = useMemo(() => drop ? createSpillGeometry(drop) : null, [drop]);
  useLayoutEffect(() => optical.update(spillAbsorptionPerMeter(spill.color || '#ffffff', spill.optics),
    drop ? 2 * Math.hypot(drop.radius_m, drop.height_m) : 0), [optical, spill.color, spill.optics, drop]);
  useEffect(() => () => optical.dispose(), [optical]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  return <group position={position}>
    <SpilledSolids spill={spill} />
    {sodiumMetalMass({ contents: spill.contents ?? [] }) > 1e-10 && <SpilledSodium spill={spill} drop={drop}
      contact={sodiumContact} airSpeed_m_s={environment.airSpeed_m_s} />}
    <SpillReactionBubbles spill={spill} drop={drop} pressure_atm={environment.pressure_atm} contact={sodiumContact} />
    {(spill.thermalVaporEnthalpy_J ?? 0) > 0 && <Steam vesselId={spill.id}
      surfaceY={(drop?.height_m ?? 0) / METERS_PER_SCENE_UNIT} radius={spill.radius} sourceState={vapor} />}
    {geometry && <mesh name={`spill-optics:${spill.id}`} geometry={geometry} material={optical.volume} renderOrder={refractive ? 0 : -2} />}
    {geometry && optical.reflection && <mesh name={`spill-optics:reflection:${spill.id}`} geometry={geometry} material={optical.reflection} renderOrder={-1} />}
  </group>;
}

/** Bounded packets of generated gas, with no source after chemistry stops. */
function SpillReactionBubbles({ spill, drop, pressure_atm, contact }: { spill: SpillState; drop: SessileDropShape | null;
  pressure_atm: number; contact: React.MutableRefObject<SpillSodiumContactPoint> }) {
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
        const source = contact.current;
        // A final accepted packet can outlive the exhausted pellet for one
        // store interval; keep that packet at the last metal contact point.
        const local = spill.reactionProgramId === 'na_h2o' && (source.active || !!spill.sodiumContact);
        const r = Math.sqrt(((n * 0.618034) % 1)) * (local ? source.radius : spill.radius * 0.7);
        bubble.x = (local ? source.x : 0) + Math.cos(angle) * r;
        bubble.z = (local ? source.z : 0) + Math.sin(angle) * r; bubble.age = 0;
        const sites = spill.solidContactSites;
        if ((spill.gasRate_mol_s ?? 0) > 0 && sites?.length) {
          let weight = ((n * 0.61803398875) % 1) * sites.reduce((s, site) => s + site.weight, 0);
          let site = sites[sites.length - 1];
          for (const candidate of sites) { weight -= candidate.weight; if (weight <= 0) { site = candidate; break; } }
          bubble.x = site.position[0] - spill.position[0]; bubble.z = site.position[2] - spill.position[2];
        }
        bubble.y = spillSurfaceY(drop, bubble.x, bubble.z);
      }
      const life = Math.min(1, bubble.age / 0.4);
      transform.position.set(bubble.x, bubble.y + 0.006 + life * 0.03, bubble.z);
      transform.scale.setScalar(bubble.age < 0.4 ? 0.012 * Math.sin(Math.PI * life) : 0);
      transform.updateMatrix(); mesh.current.setMatrixAt(i, transform.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh name={`spill-bubbles:${spill.id}`} ref={mesh} args={[undefined, undefined, 16]} frustumCulled={false}>
    <sphereGeometry args={[1, 8, 6]} />
    <meshPhysicalMaterial color="#f8fafc" transparent opacity={0.45} roughness={0.05} depthWrite={false} />
  </instancedMesh>;
}

export default WorkbenchSpills;
