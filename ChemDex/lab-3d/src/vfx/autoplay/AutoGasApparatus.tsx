import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AUTO_TIMING, type AutoExperiment } from './AutoExperiment';
import { gasInlet, gasPort, gasSourceHome, gasSyringeSize, gasVolumeMl, inverseDoseFraction } from './gasDelivery';
import { vesselLiquidSurfaceY } from '../../science/vesselGeometry';

const ease = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
/** A metered gas syringe stays on its stand. A closed valve, flexible hose,
 * ground-glass inlet and (for liquid samples) submerged outlet replace pouring. */
export function AutoGasApparatus({ experiment: e, index, children }: { experiment: AutoExperiment; index: number; children?: React.ReactNode }) {
  const donor = e.donors[index], ordinal = e.gasOrdinal(index), home = gasSourceHome(ordinal, donor.row.moles), port = gasPort(ordinal);
  const { radius, length } = gasSyringeSize(donor.row.moles), outletX = length / 2 + 0.15;
  const plunger = useRef<THREE.Group>(null), valve = useRef<THREE.Mesh>(null), pipe = useRef<THREE.Mesh>(null);
  const hose = useRef<THREE.InstancedMesh>(null), bubbles = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => ({ object: new THREE.Object3D(), a: new THREE.Vector3(), b: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), dir: new THREE.Vector3(),
    points: [new THREE.Vector3(home[0] + outletX, home[1], home[2]), new THREE.Vector3(-2.2, 1.7, home[2]), new THREE.Vector3(-1.1, 2.65, -0.3), new THREE.Vector3(...port)] }), []);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(scratch.points), [scratch]);
  useFrame(() => {
    const active = index === e.donorIndex, connected = e.donorIndex > index ? 1 : active && e.phase !== 'prepare'
      ? e.phase === 'carry' ? ease(e.phaseTime / AUTO_TIMING.carry) : 1 : 0;
    const open = active && e.gasValveOpen, inlet = gasInlet(e, ordinal), lift = (1 - connected) * 0.45;
    if (plunger.current) plunger.current.position.x = -length / 2 + donor.fraction * length;
    if (valve.current) {
      valve.current.rotation.x = open ? Math.PI / 2 : 0;
      (valve.current.material as THREE.MeshStandardMaterial).color.set(open ? '#62d2a2' : '#b88652');
      valve.current.userData.open = open; valve.current.userData.flow_ml_s = active ? e.gasDeliveryRate_ml_s : 0;
    }
    if (hose.current) {
      scratch.points[3].set(port[0], port[1] + lift, port[2]);
      for (let i = 0; i < 24; i++) {
        curve.getPoint(i / 24, scratch.a); curve.getPoint((i + 1) / 24, scratch.b);
        scratch.object.position.copy(scratch.a).add(scratch.b).multiplyScalar(0.5);
        scratch.dir.subVectors(scratch.b, scratch.a); const length = scratch.dir.length();
        scratch.object.quaternion.setFromUnitVectors(scratch.up, scratch.dir.normalize());
        scratch.object.scale.set(0.025, length * 1.05, 0.025); scratch.object.updateMatrix(); hose.current.setMatrixAt(i, scratch.object.matrix);
      }
      hose.current.instanceMatrix.needsUpdate = true;
    }
    if (pipe.current) {
      const length = port[1] - inlet[1]; pipe.current.position.set(port[0], (port[1] + inlet[1]) / 2 + lift, port[2]); pipe.current.scale.y = length;
      pipe.current.userData.connected = connected >= 0.999;
      pipe.current.userData.submerged = connected >= 0.999 && e.sample.volume_ml > 0.2 && inlet[1] < 1.04 + vesselLiquidSurfaceY(e.sample);
    }
    if (bubbles.current) {
      let count = 0;
      if (donor.doseStartedAt !== undefined && e.sample.volume_ml > 0.2 && connected >= 0.999) {
        const volume = gasVolumeMl(donor.row.moles), total = Math.max(1, Math.min(180, Math.ceil(volume / 0.08)));
        const born = Math.floor(donor.fraction * total), now = e.elapsed - donor.doseStartedAt;
        const surface = 1.04 + vesselLiquidSurfaceY(e.sample), speed = 0.8;
        for (let i = Math.max(0, born - 24); i < born; i++) {
          const age = now - (AUTO_TIMING.tilt + AUTO_TIMING.flight + AUTO_TIMING.flow * inverseDoseFraction((i + 0.5) / total));
          const y = inlet[1] + age * speed;
          if (age < 0 || y >= surface) continue;
          scratch.object.position.set(inlet[0] + Math.sin(i * 2.4 + age * 8) * 0.018, y, inlet[2] + Math.cos(i * 2.4 + age * 7) * 0.018);
          scratch.object.rotation.set(0, 0, 0); scratch.object.scale.setScalar(Math.min(0.055, 0.025 + age * 0.03));
          scratch.object.updateMatrix(); bubbles.current.setMatrixAt(count++, scratch.object.matrix);
        }
      }
      bubbles.current.visible = count > 0; bubbles.current.count = count;
      if (count) bubbles.current.instanceMatrix.needsUpdate = true;
    }
  });
  return <>
    <group position={home} name={`auto_gas_supply_${donor.row.formula}`}>
      <group position={[0, radius + 0.15, 0]}>{children}</group>
      <mesh rotation={[0, 0, -Math.PI / 2]}><cylinderGeometry args={[radius, radius, length, 24, 1, true]} /><meshPhysicalMaterial color="#d2e9ef" transparent opacity={0.22} roughness={0.06} metalness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <group ref={plunger}><mesh rotation={[0, 0, -Math.PI / 2]}><cylinderGeometry args={[radius * 0.97, radius * 0.97, 0.055, 20]} /><meshStandardMaterial color="#345366" roughness={0.3} /></mesh>
        <mesh position={[-length / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><cylinderGeometry args={[0.035, 0.035, length, 12]} /><meshStandardMaterial color="#b2c6d0" metalness={0.7} roughness={0.2} /></mesh>
      </group>
      <mesh position={[outletX - 0.075, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><cylinderGeometry args={[0.045, radius, 0.15, 20]} /><meshStandardMaterial color="#87999e" metalness={0.8} roughness={0.25} /></mesh>
      <mesh ref={valve} name={`auto_gas_valve_${donor.row.formula}`} position={[outletX, 0.1, 0]}><boxGeometry args={[0.16, 0.035, 0.035]} /><meshStandardMaterial color="#b88652" /></mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[radius + 0.025, 0.02, 8, 32]} /><meshStandardMaterial color="#71868f" metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[0, -home[1] / 2, radius + 0.06]}><cylinderGeometry args={[0.025, 0.025, home[1], 12]} /><meshStandardMaterial color="#71868f" metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[0, 0.04 - home[1], 0]}><boxGeometry args={[Math.max(0.65, length * 0.6), 0.08, radius * 2]} /><meshStandardMaterial color="#334956" metalness={0.6} roughness={0.4} /></mesh>
    </group>
    <instancedMesh ref={hose} name={`auto_gas_line_${donor.row.formula}`} args={[undefined, undefined, 24]} count={24} frustumCulled={false}>
      <cylinderGeometry args={[1, 1, 1, 8]} /><meshStandardMaterial color="#89a6ac" roughness={0.35} transparent opacity={0.8} /></instancedMesh>
    <mesh ref={pipe} name={`auto_gas_inlet_${donor.row.formula}`}><cylinderGeometry args={[0.025, 0.025, 1, 12]} /><meshPhysicalMaterial color="#d9edf3" transparent opacity={0.45} roughness={0.05} depthWrite={false} /></mesh>
    <instancedMesh ref={bubbles} name={`auto_feed_bubbles_${donor.row.formula}`} args={[undefined, undefined, 24]} visible={false} frustumCulled={false} renderOrder={4}>
      <sphereGeometry args={[1, 10, 8]} /><meshPhysicalMaterial color="#e0eff5" transparent opacity={0.24} clearcoat={1} roughness={0.05} depthWrite={false} /></instancedMesh>
  </>;
}
export function AutoGasReceiver({ experiment: e }: { experiment: AutoExperiment }) {
  const root = useRef<THREE.Group>(null), first = e.donors.findIndex(d => d.row.phase === 'g');
  useFrame(() => {
    if (!root.current) return;
    root.current.visible = first >= 0 && e.donorIndex >= first && e.phase !== 'prepare';
    root.current.position.y = e.donorIndex === first && e.phase === 'carry' ? (1 - ease(e.phaseTime / AUTO_TIMING.carry)) * 0.55 : 0;
  });
  return <group ref={root} visible={false} name="auto_gas_receiver_cap">
    <mesh position={[0, 2.04, 0]}><cylinderGeometry args={[1, 1, 0.08, 48]} /><meshStandardMaterial color="#50626b" roughness={0.5} transparent opacity={0.82} /></mesh>
    <mesh position={[0, 2.11, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.055, 0.015, 8, 16]} /><meshStandardMaterial color="#98abb1" /></mesh>
    <mesh position={[0, 2.25, -0.35]}><cylinderGeometry args={[0.035, 0.035, 0.42, 12]} /><meshPhysicalMaterial color="#d9edf3" transparent opacity={0.5} roughness={0.05} /></mesh>
  </group>;
}
