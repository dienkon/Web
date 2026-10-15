import { toolControls } from '../../../systems/input/toolControls';
import { fireSimulation } from '../../../core/fire/FireSim';
import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, playerCoords } from '../../../store/useStore';

export const FPSHands: React.FC = () => {
  const { camera } = useThree();
  const valveAnchor = useRef<THREE.Object3D>(null);
  const nozzleAnchor = useRef<THREE.Object3D>(null);
  const hoseMesh = useRef<THREE.Mesh>(null);
  const hoseTime = useRef(0);
  const hosePoints = useMemo(() => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], []);
  const rootRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const extinguisherTriggerRef = useRef<THREE.Mesh>(null);

  const activeTool = useStore(s => s.activeTool);
  const view = useStore((s) => s.view);
  const player = useStore((s) => s.player);
  const character = useStore((s) => s.character);
  const runState = useStore((s) => s.runState);
  const settings = useStore((s) => s.settings);

  // Dynamic PPE Materials
  const hasLabCoat = player.equipment.hasLabCoat;
  const hasGloves = player.equipment.hasGloves;
  const armColor = hasLabCoat ? '#FFFFFF' : character.shirtColor || '#0EA5B7';
  const handColor = hasGloves ? '#0284C7' : character.skinTone || '#F7D3BA';

  // Input states for weapon / item action
  const isLeftDown = useRef(false);
  const isRightDown = useRef(false);
  const recoilZ = useRef(0);
  const aimLerp = useRef(0);

  // Mouse inertia sway tracking
  const prevCamRot = useRef(new THREE.Euler().copy(camera.rotation));
  const swayOffset = useRef(new THREE.Vector2(0, 0));
  const walkBobTimer = useRef(0);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const state = useStore.getState();
      if (e.target instanceof Element && !e.target.closest('canvas')) return;
      if (state.sceneModalCount > 0 || state.runState !== 'RUNNING' || state.isDialogActive || state.showSettings || state.showRulesList || state.activeRuleDialog || state.showFireExtinguisherQuiz || state.showBandageQuiz || state.showChemicalSymbolsQuiz) return;
      if (e.button === 0) isLeftDown.current = true;
      if (e.button === 2) isRightDown.current = true;
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) isLeftDown.current = false;
      if (e.button === 2) isRightDown.current = false;
    };

    const reset = () => { isLeftDown.current = false; isRightDown.current = false; };
    window.addEventListener('blur', reset);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('blur', reset);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useFrame((_, delta) => {
    if (view !== 'game' || runState === 'PAUSED' || !rootRef.current) return;
    delta = Math.min(delta, 0.05);

    const squeezing=activeTool==='extinguisher' && toolControls.spraying && !!fireSimulation.currentExtinguisher?.isDischarging;
    // 1. Lock Viewmodel position & rotation to Camera
    rootRef.current.position.copy(camera.position);
    rootRef.current.quaternion.copy(camera.quaternion);

    // 2. Mouse Look Sway (Inertial lag behind camera turns)
    const dPitch = THREE.MathUtils.euclideanModulo(camera.rotation.x - prevCamRot.current.x + Math.PI, Math.PI * 2) - Math.PI;
    const dYaw = THREE.MathUtils.euclideanModulo(camera.rotation.y - prevCamRot.current.y + Math.PI, Math.PI * 2) - Math.PI;
    prevCamRot.current.copy(camera.rotation);

    const targetSwayX = THREE.MathUtils.clamp(-dYaw * 0.12, -0.04, 0.04);
    const targetSwayY = THREE.MathUtils.clamp(dPitch * 0.12, -0.04, 0.04);

    swayOffset.current.x = THREE.MathUtils.damp(swayOffset.current.x, targetSwayX, 10, delta);
    swayOffset.current.y = THREE.MathUtils.damp(swayOffset.current.y, targetSwayY, 10, delta);

    // 3. Movement Bobbing (harmonic walking figure-8)
    let bobX = 0;
    let bobY = 0;
    if (playerCoords.isMoving && !settings.reduceMotion) {
      walkBobTimer.current += delta * 10;
      bobX = Math.sin(walkBobTimer.current) * 0.012;
      bobY = Math.abs(Math.cos(walkBobTimer.current)) * 0.01 - 0.005;
    } else {
      walkBobTimer.current = 0;
      // Idle breathing sway
      const idleTime = performance.now() * 0.0018;
      bobX = Math.sin(idleTime) * 0.002;
      bobY = Math.cos(idleTime * 2) * 0.002;
    }

    // 4. Action Recoil & Aim lerp
    if (squeezing) {
      recoilZ.current = THREE.MathUtils.lerp(recoilZ.current, 0.035, delta * 25);
    } else {
      recoilZ.current = THREE.MathUtils.lerp(recoilZ.current, 0, delta * 15);
    }

    if (isRightDown.current && activeTool) {
      aimLerp.current = THREE.MathUtils.lerp(aimLerp.current, 1, delta * 12);
    } else {
      aimLerp.current = THREE.MathUtils.lerp(aimLerp.current, 0, delta * 12);
    }

    // Extinguisher trigger handle animation
    if (extinguisherTriggerRef.current) {
      const triggerAngle = squeezing ? -0.22 : 0;
      extinguisherTriggerRef.current.rotation.x = THREE.MathUtils.lerp(
        extinguisherTriggerRef.current.rotation.x,
        triggerAngle,
        delta * 20
      );
    }

    // Apply combined transform to arms container
    const posX = swayOffset.current.x + bobX;
    const posY = (activeTool ? -0.20 : -0.38) + swayOffset.current.y + bobY + (aimLerp.current * 0.04);
    const posZ = -0.72 - recoilZ.current + (aimLerp.current * 0.05);

    // Gentle arm sway rotation
    if (rightArmRef.current) {
      rightArmRef.current.position.set(0.27 + posX * 0.5, posY, posZ);
      rightArmRef.current.rotation.set(
        -0.25 + (squeezing ? 0.08 : 0) - (aimLerp.current * 0.1),
        0.15 - swayOffset.current.x * 2,
        -0.08
      );
    }

    if (leftArmRef.current) {
      leftArmRef.current.position.set(-0.2 + posX * 0.5, posY, posZ);
      leftArmRef.current.rotation.set(
        -0.28 + (aimLerp.current * 0.15),
        -0.18 + swayOffset.current.x * 2,
        0.08
      );
    }
    hoseTime.current += delta;
    if (hoseMesh.current && valveAnchor.current && nozzleAnchor.current && hoseTime.current >= 1 / 30) {
      hoseTime.current = 0;
      rootRef.current.updateWorldMatrix(true, true);
      valveAnchor.current.getWorldPosition(hosePoints[0]);
      nozzleAnchor.current.getWorldPosition(hosePoints[3]);
      rootRef.current.worldToLocal(hosePoints[0]); rootRef.current.worldToLocal(hosePoints[3]);
      hosePoints[1].lerpVectors(hosePoints[0], hosePoints[3], .32); hosePoints[1].y -= .12;
      hosePoints[2].lerpVectors(hosePoints[0], hosePoints[3], .75); hosePoints[2].y -= .1;
      const previous = hoseMesh.current.geometry;
      hoseMesh.current.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hosePoints), 16, .006, 6, false);
      previous.dispose();
    }
  });

  if (view !== 'game') return null;

  return (
    <group name="fps-hands" ref={rootRef} renderOrder={999} raycast={() => null}>
      {activeTool === 'extinguisher' && player.inventory.hasFireExtinguisher && <mesh ref={hoseMesh}><bufferGeometry /><meshStandardMaterial color="#17202d" roughness={.8} /></mesh>}
      {/* ================= 1. RIGHT ARM (PRIMARY ACTION ARM) ================= */}
      <group ref={rightArmRef}>
        {/* Forearm Sleeve */}
        <mesh position={[0.04, -0.16, 0.19]} rotation={[0, 0, -0.12]} castShadow={false}>
          <capsuleGeometry args={[0.045, 0.24, 8, 20]} />
          <meshStandardMaterial
            color={armColor}
            roughness={hasLabCoat ? 0.45 : 0.65}
            metalness={0.05}
          />
        </mesh>

        {/* Wrist Cuff Rim */}
        <mesh position={[0.04, -0.01, 0.19]} rotation={[-0.2, 0.1, -0.12]}>
          <cylinderGeometry args={[0.046, 0.046, 0.032, 20]} />
          <meshStandardMaterial
            color={hasLabCoat ? '#F1F5F9' : armColor}
            roughness={0.4}
          />
        </mesh>

        {/* Right Hand (Gloved Nitrile or Skin) */}
        <group position={[0.02, 0.04, 0.22]}>
          <GripHand color={handColor} />

          {/* ---------------- ITEM 1: FIRE EXTINGUISHER ---------------- */}
          {activeTool === 'extinguisher' && player.inventory.hasFireExtinguisher && (
            <group name="held-extinguisher" scale={0.65} position={[-0.015, -0.156, -0.015]} rotation={[0.08, -0.1, 0.05]}>
              {/* Cylinder Tank */}
              <mesh castShadow={false}>
                <cylinderGeometry args={[0.062, 0.062, 0.38, 24]} />
                <meshStandardMaterial
                  color="#DC2626"
                  roughness={0.2}
                  metalness={0.4}
                />
              </mesh>

              {/* Tank Base Ring */}
              <mesh position={[0, -0.19, 0]}>
                <cylinderGeometry args={[0.064, 0.064, 0.02, 24]} />
                <meshStandardMaterial color="#0F172A" roughness={0.6} />
              </mesh>

              {/* Inspection Label Decal */}
              <mesh position={[0, -0.02, 0.063]}>
                <planeGeometry args={[0.075, 0.14]} />
                <meshBasicMaterial color="#FEF08A" />
              </mesh>

              {/* Brass Valve Head */}
              <mesh position={[0, 0.21, 0]}>
                <cylinderGeometry args={[0.024, 0.035, 0.045, 16]} />
                <meshStandardMaterial color="#EAB308" metalness={0.8} roughness={0.2} />
              </mesh>

              {/* Pressure Gauge */}
              <group position={[0.028, 0.22, 0.02]} rotation={[0, 0.8, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.016, 0.016, 0.008, 16]} />
                  <meshStandardMaterial color="#E2E8F0" metalness={0.7} roughness={0.3} />
                </mesh>
                {/* Gauge Face (Green zone) */}
                <mesh position={[0, 0, 0.005]} rotation={[0, 0, 0]}>
                  <circleGeometry args={[0.012, 16]} />
                  <meshBasicMaterial color="#22C55E" />
                </mesh>
              </group>

              {/* Carrying Handle */}
              <mesh position={[-0.025, 0.24, 0]} rotation={[0, 0, 0.2]}>
                <boxGeometry args={[0.07, 0.014, 0.02]} />
                <meshStandardMaterial color="#0F172A" roughness={0.5} />
              </mesh>

              {/* Squeeze Lever (Animated on Left Click) */}
              <mesh
                ref={extinguisherTriggerRef}
                position={[-0.025, 0.265, 0]}
                rotation={[0, 0, -0.1]}
              >
                <boxGeometry args={[0.075, 0.012, 0.022]} />
                <meshStandardMaterial color="#DC2626" roughness={0.4} />
              </mesh>

              {/* Safety Pull Pin Ring */}
              <mesh position={[0.018, 0.25, 0.015]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.014, 0.003, 8, 16]} />
                <meshStandardMaterial color="#FBBF24" metalness={0.9} roughness={0.1} />
              </mesh>

              <object3D ref={valveAnchor} position={[.035, .21, 0]} />
            </group>
          )}

          {/* ---------------- ITEM 2: SPILL KIT SWEEPER & SCOOP ---------------- */}
          {activeTool === 'spillKit' && player.inventory.hasSweeper && (
            <group name="held-spillKit" position={[0, 0, -0.015]}>
              {/* Short grip passes through the palm; pan stays fully in view. */}
              <mesh position={[0, -.055, -.015]}><cylinderGeometry args={[.012,.012,.14,12]} /><meshStandardMaterial color="#b45309" roughness={.7} /></mesh>
              <group position={[0,-.16,-.055]} rotation={[.25,0,0]}>
                <mesh><boxGeometry args={[.19,.012,.19]} /><meshStandardMaterial color="#eab308" roughness={.6} /></mesh>
                <mesh position={[0,.028,.09]}><boxGeometry args={[.19,.06,.012]} /><meshStandardMaterial color="#ca8a04" /></mesh>
                {[-1,1].map(side=><mesh key={side} position={[side*.09,.024,0]}><boxGeometry args={[.012,.055,.19]} /><meshStandardMaterial color="#ca8a04" /></mesh>)}
                <mesh position={[0,.003,-.1]} rotation={[-.15,0,0]}><boxGeometry args={[.19,.007,.035]} /><meshStandardMaterial color="#64748b" metalness={.4} roughness={.5} /></mesh>
              </group>
            </group>
          )}

          {/* ---------------- ITEM 3: HAZARD WASTE CONTAINER ---------------- */}
          {activeTool === 'waste' && player.inventory.isHoldingTrash && (
            <group name="held-waste" position={[0, -0.1, -0.025]} rotation={[0.12, 0, -0.08]}>
              {player.inventory.heldTrashType === 'sharps' ? <group>
                <mesh><boxGeometry args={[0.13, 0.16, 0.1]} /><meshStandardMaterial color="#dc2626" roughness={0.65} /></mesh>
                <mesh position={[0, 0.085, 0]}><boxGeometry args={[0.14, 0.02, 0.11]} /><meshStandardMaterial color="#7f1d1d" /></mesh>
              </group> : <group>
                <mesh scale={[1, 1.15, 0.75]}><icosahedronGeometry args={[0.09, 1]} /><meshStandardMaterial color={player.inventory.heldTrashType === 'domestic' ? '#e2e8f0' : '#eab308'} roughness={0.85} flatShading /></mesh>
                <mesh position={[0, 0.095, 0]}><coneGeometry args={[0.025, 0.055, 8]} /><meshStandardMaterial color="#ca8a04" /></mesh>
                <mesh position={[0, 0.072, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.022, 0.005, 6, 12]} /><meshStandardMaterial color="#334155" /></mesh>
                <mesh position={[0, 0, 0.067]} rotation={[0, 0, Math.PI / 4]}><planeGeometry args={[0.045, 0.045]} /><meshBasicMaterial color="#1e293b" side={THREE.DoubleSide} /></mesh>
              </group>}
            </group>
          )}
        </group>
      </group>

      {/* ================= 2. LEFT ARM (SUPPORT / STEADYING ARM) ================= */}
      <group ref={leftArmRef}>
        {/* Forearm Sleeve */}
        <mesh position={[-0.04, -0.16, 0.19]} rotation={[0, 0, 0.12]} castShadow={false}>
          <capsuleGeometry args={[0.045, 0.24, 8, 20]} />
          <meshStandardMaterial
            color={armColor}
            roughness={hasLabCoat ? 0.45 : 0.65}
            metalness={0.05}
          />
        </mesh>

        {/* Wrist Cuff Rim */}
        <mesh position={[-0.04, -0.01, 0.19]} rotation={[-0.2, -0.1, 0.12]}>
          <cylinderGeometry args={[0.046, 0.046, 0.032, 20]} />
          <meshStandardMaterial
            color={hasLabCoat ? '#F1F5F9' : armColor}
            roughness={0.4}
          />
        </mesh>

        {/* Left Hand (Gloved Nitrile or Skin) */}
        <group position={[-0.02, 0.04, 0.22]}>
          <GripHand color={handColor} left />
          {activeTool === 'spillKit' && player.inventory.hasSweeper && <group name="held-brush" position={[0,0,-.025]}>
            <mesh position={[0,-.02,0]}><capsuleGeometry args={[.014,.1,4,12]} /><meshStandardMaterial color="#b45309" roughness={.7} /></mesh>
            <mesh position={[0,-.095,-.015]}><boxGeometry args={[.12,.035,.055]} /><meshStandardMaterial color="#eab308" /></mesh>
            {[-.045,-.025,0,.025,.045].map(x=><mesh key={x} position={[x,-.125,-.015]}><boxGeometry args={[.014,.035,.045]} /><meshStandardMaterial color="#334155" roughness={1} /></mesh>)}
          </group>}

          {/* Steadying Pose support for Extinguisher (Left hand holding base/nozzle) */}
          {activeTool === 'extinguisher' && player.inventory.hasFireExtinguisher && (
            <group position={[0, 0.01, -0.06]}>
              <object3D ref={nozzleAnchor} position={[0, 0, .08]} />
              <object3D name="extinguisher-muzzle" position={[0, 0, -0.06]} />
              <mesh rotation={[-Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.028, 0.014, 0.12, 20, 1, true]} /><meshStandardMaterial color="#1e293b" side={THREE.DoubleSide} roughness={0.5} /></mesh>
              <mesh position={[0, 0, 0.06]} rotation={[-Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.015, 0.015, 0.05, 12]} /><meshStandardMaterial color="#334155" roughness={0.75} /></mesh>
            </group>
          )}
        </group>
      </group>
    </group>
  );
};

// Segmented fingers curl around the handle instead of floating beside a sphere.
function GripHand({ color, left = false }: { color: string; left?: boolean }) {
  const side = left ? -1 : 1;
  return <group>
    <mesh scale={[.82, 1, .6]}><sphereGeometry args={[.039, 20, 16]} /><meshStandardMaterial color={color} roughness={.65} metalness={0} /></mesh>
    {[-.025, -.008, .009, .025].map((x, index) => <group key={x} position={[x, .019 - Math.abs(index - 1.5) * .003, -.016]}>
      <mesh rotation={[1.1, 0, 0]}><capsuleGeometry args={[.008, .025, 4, 10]} /><meshStandardMaterial color={color} roughness={.65} /></mesh>
      <mesh position={[0, -.013, -.022]} rotation={[.1, 0, 0]}><capsuleGeometry args={[.0075, .02, 4, 10]} /><meshStandardMaterial color={color} roughness={.65} /></mesh>
    </group>)}
    <mesh position={[-side * .03, -.005, -.025]} rotation={[.7, 0, side * .55]}><capsuleGeometry args={[.011, .029, 4, 10]} /><meshStandardMaterial color={color} roughness={.65} /></mesh>
  </group>;
}
