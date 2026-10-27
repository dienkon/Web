import { simulationFrameDt } from '../../core/clock';
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { getVesselProfile } from '../../pour/physics/profiles';
import { liquidGeometry, vesselLiquidSurfaceY } from '../../science/vesselGeometry';
import { applySodiumPelletShape, sodiumPelletShape, sodiumPelletRadius } from '../../vfx/geometry/sodiumPellet';
import { SCENE_GRAVITY } from '../../science/sceneUnits';

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
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry();
    applySodiumPelletShape(result, sodiumPelletShape(0));
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, delta) => {
    if (completed.current) return;
    const state = useAppStore.getState(), vessel = state.vessels[targetId];
    if (!vessel || vessel.isShattered) { completed.current = true; onComplete(); return; }
    if (state.isSimulationPaused) return;
    elapsed.current += simulationFrameDt(delta, state);
    const t = elapsed.current;
    const radius = sodiumPelletRadius(vessel, amount), shape = sodiumPelletShape(0);
    const mouth = vessel.position[1] + getVesselProfile(vessel.type).lipLocal[1];
    const releaseY = mouth + 0.35;
    const approach = THREE.MathUtils.smoothstep(t, 0, 0.35);
    const x = vessel.position[0] + (1 - approach) * 1.4;
    const y = releaseY + (1 - approach) * 0.7;
    if (forceps.current) {
      const retract = Math.max(0, t - 0.6);
      forceps.current.position.set(x + 0.6 + retract, y + retract * 0.7, vessel.position[2]);
      forceps.current.visible = t < 1.5;
    }
    if (metal.current) {
      const fallTime = Math.max(0, t - 0.35);
      const floor = vessel.position[1] + liquidGeometry(vessel.type).floorY;
      const surface = vessel.position[1] + vesselLiquidSurfaceY(vessel);
      const hasWater = vessel.contents.some(item => item.formula === 'H2O' && item.phase !== 's' && item.phase !== 'g' && item.moles > 1e-12);
      const fallingY = t <= 0.35 ? y : releaseY - 0.5 * SCENE_GRAVITY * fallTime * fallTime;
      // First contact occurs at the bottom of the falling piece, before equilibrium immersion.
      if (!contacted.current && t > 0.35 && fallingY + shape.bottom * radius <= (hasWater ? surface : floor)) {
        contacted.current = true;
        state.contactPour(doseId);
      }
      metal.current.visible = !contacted.current;
      metal.current.position.set(x, Math.max(floor - shape.bottom * radius, fallingY), vessel.position[2]);
      metal.current.scale.setScalar(radius);
      metal.current.rotation.set(0, 0.3 + fallTime, 0);
    }
    if (contacted.current && t > 1.5) { completed.current = true; onComplete(); }
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
