import { simulationFrameDt } from '../../core/clock';
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { applySodiumPelletShape, sodiumPelletShape } from '../../vfx/geometry/sodiumPellet';
import { SCENE_GRAVITY, scenePointToSI } from '../../science/sceneUnits';
import { planSodiumStockDose } from '../../handling/sodiumStockDose';
import { solidStockFlightPosition, type SolidStockDose } from '../../handling/solidStockDose';

/** A single piece is released from forceps. Inventory transfer happens once,
 * when its falling surface first touches water (or the dry vessel floor). */
export function SodiumDoseAnimation({ doseId, targetId, amount, onComplete }: {
  doseId: number; targetId: string; amount: number; onComplete: () => void;
}) {
  const metal = useRef<THREE.Mesh>(null);
  const forceps = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const contacted = useRef(false);
  const completed = useRef(false);
  const delivery = useRef<Promise<void>>(Promise.resolve());
  const planned = useRef<SolidStockDose | null>(null);
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry();
    applySodiumPelletShape(result, sodiumPelletShape(0));
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, delta) => {
    if (completed.current) return;
    const state = useAppStore.getState(), vessel = state.vessels[targetId];
    if (!vessel || vessel.isShattered || vessel.isSealed) { completed.current = true; onComplete(); return; }
    if (!planned.current) planned.current = planSodiumStockDose(vessel, amount);
    if (!planned.current) { completed.current = true; onComplete(); return; }
    if (state.isSimulationPaused) return;
    elapsed.current += simulationFrameDt(delta, state);
    const t = elapsed.current;
    const plan = planned.current, flight = plan.flights[0], radius = plan.scale;
    const releaseY = flight.start[1];
    const approach = THREE.MathUtils.smoothstep(t, 0, 0.35);
    const x = flight.start[0] + (1 - approach) * 1.4;
    const y = releaseY + (1 - approach) * 0.7;
    if (forceps.current) {
      const retract = Math.max(0, t - 0.6);
      forceps.current.position.set(x + 0.6 + retract, y + retract * 0.7, flight.start[2]);
      forceps.current.visible = t < 1.5;
    }
    if (metal.current) {
      const fallTime = Math.max(0, t - flight.releaseAt);
      // First contact occurs at the bottom of the falling piece, before equilibrium immersion.
      if (!contacted.current && t >= flight.releaseAt + flight.flightTime) {
        contacted.current = true;
        delivery.current = state.advancePourContact(doseId, 1, [{ mass_g: amount,
          position_m: scenePointToSI(flight.contact), rotation: [...flight.rotation],
          velocity_m_s: scenePointToSI([0, -SCENE_GRAVITY * flight.flightTime, 0]), angularVelocity_rad_s: [0, 0, 0] }]);
      }
      metal.current.visible = !contacted.current;
      if (t <= flight.releaseAt) metal.current.position.set(x, y, flight.start[2]);
      else metal.current.position.set(...solidStockFlightPosition(flight, fallTime));
      metal.current.scale.setScalar(radius);
      metal.current.quaternion.fromArray(flight.rotation);
    }
    if (contacted.current && t > Math.max(1.5, flight.releaseAt + flight.flightTime + .1)) {
      completed.current = true;
      void delivery.current.then(onComplete);
    }
  });
  return <group name="sodium-forceps-addition">
    <group ref={forceps}>
      {[-1, 1].map(side => <mesh key={side} position={[0, 0, side * 0.04]} rotation={[0, side * 0.05, 0.1]} castShadow>
        <boxGeometry args={[1.25, 0.04, 0.035]} />
        <meshStandardMaterial color="#aebdc7" metalness={0.9} roughness={0.24} />
      </mesh>)}
    </group>
    <mesh ref={metal} geometry={geometry} dispose={null} castShadow>
      <meshStandardMaterial color="#cbd5df" metalness={0.92} roughness={0.3} />
    </mesh>
  </group>;
}
