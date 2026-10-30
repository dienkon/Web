import { BrushAsset, GripHandAsset, HeldPanAsset, NozzleAsset, WasteCarrierAsset } from '../assets/ActorAssets';
import { ExtinguisherAsset } from '../assets/EmergencyAssets';
import { useReducedLabMotion } from '../../../systems/device/useReducedLabMotion';
import { toolControls } from '../../../systems/input/toolControls';
import { fireSimulation } from '../../../core/fire/FireSim';
import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, playerCoords } from '../../../store/useStore';
import { MutableTubeGeometry } from './MutableTubeGeometry';
import { SleeveCuffAsset } from '../assets/ClothingParts';
import { WARDROBE } from '../assets/wardrobe';

function HeldHose({meshRef}:{meshRef:React.RefObject<THREE.Mesh|null>}){
 const geometry=useMemo(()=>new MutableTubeGeometry(),[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh name="held-extinguisher-hose" ref={meshRef} geometry={geometry}><meshStandardMaterial color="#17202d" roughness={.8}/></mesh>;
}

export const FPSHands: React.FC = () => {
  const { camera } = useThree();
  const valveAnchor = useRef<THREE.Object3D>(null);
  const nozzleAnchor = useRef<THREE.Object3D>(null);
  const nozzleAimRef=useRef<THREE.Group>(null);
  const hoseMesh = useRef<THREE.Mesh>(null);
  const hoseTime = useRef(0);
  const hosePoints = useMemo(() => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], []);
  const rootRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const carriedState=useRef({squeezing:false,pinPulled:false});
  const reduced=useReducedLabMotion();

  const activeTool = useStore(s => s.activeTool);
  const view = useStore((s) => s.view);
  const player = useStore((s) => s.player);
  const character = useStore((s) => s.character);
  const runState = useStore((s) => s.runState);

  // Dynamic PPE Materials
  const hasLabCoat = player.equipment.hasLabCoat;
  const hasGloves = player.equipment.hasGloves;
  const handColor = hasGloves ? WARDROBE.glove : character.skinTone || '#F7D3BA';

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
    carriedState.current.squeezing=squeezing;
    carriedState.current.pinPulled=!!fireSimulation.currentExtinguisher?.pinPulled;
    // 1. Lock Viewmodel position & rotation to Camera
    rootRef.current.position.copy(camera.position);
    rootRef.current.quaternion.copy(camera.quaternion);

    // 2. Mouse Look Sway (Inertial lag behind camera turns)
    const dPitch = THREE.MathUtils.euclideanModulo(camera.rotation.x - prevCamRot.current.x + Math.PI, Math.PI * 2) - Math.PI;
    const dYaw = THREE.MathUtils.euclideanModulo(camera.rotation.y - prevCamRot.current.y + Math.PI, Math.PI * 2) - Math.PI;
    prevCamRot.current.copy(camera.rotation);

    const targetSwayX = reduced?0:THREE.MathUtils.clamp(-dYaw * 0.12, -0.04, 0.04);
    const targetSwayY = reduced?0:THREE.MathUtils.clamp(dPitch * 0.12, -0.04, 0.04);

    swayOffset.current.x = THREE.MathUtils.damp(swayOffset.current.x, targetSwayX, 10, delta);
    swayOffset.current.y = THREE.MathUtils.damp(swayOffset.current.y, targetSwayY, 10, delta);

    // 3. Movement Bobbing (harmonic walking figure-8)
    let bobX = 0;
    let bobY = 0;
    if (playerCoords.isMoving && !reduced) {
      walkBobTimer.current += delta * 10;
      bobX = Math.sin(walkBobTimer.current) * 0.012;
      bobY = Math.abs(Math.cos(walkBobTimer.current)) * 0.01 - 0.005;
    } else {
      walkBobTimer.current = 0;
      // Idle breathing sway
      const idleTime = performance.now() * 0.0018;
      bobX = reduced?0:Math.sin(idleTime) * 0.002;
      bobY = reduced?0:Math.cos(idleTime * 2) * 0.002;
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
    if(nozzleAimRef.current&&leftArmRef.current)nozzleAimRef.current.quaternion.copy(leftArmRef.current.quaternion).invert();
    hoseTime.current += delta;
    if (hoseMesh.current && valveAnchor.current && nozzleAnchor.current && hoseTime.current >= 1 / 30) {
      hoseTime.current = 0;
      rootRef.current.updateWorldMatrix(true, true);
      valveAnchor.current.getWorldPosition(hosePoints[0]);
      nozzleAnchor.current.getWorldPosition(hosePoints[3]);
      rootRef.current.worldToLocal(hosePoints[0]); rootRef.current.worldToLocal(hosePoints[3]);
      hosePoints[1].lerpVectors(hosePoints[0], hosePoints[3], .32); hosePoints[1].y -= .12;
      hosePoints[2].lerpVectors(hosePoints[0], hosePoints[3], .75); hosePoints[2].y -= .1;
      (hoseMesh.current.geometry as MutableTubeGeometry).update(hosePoints);
    }
  });

  if (view !== 'game') return null;

  return (
    <group name="fps-hands" ref={rootRef} renderOrder={999} raycast={() => null}>
      {activeTool === 'extinguisher' && player.inventory.hasFireExtinguisher && <HeldHose meshRef={hoseMesh}/>}
      {/* ================= 1. RIGHT ARM (PRIMARY ACTION ARM) ================= */}
      <group ref={rightArmRef}>
        <group position={[.04,.027,.19]} rotation={[Math.PI,0,-.12]}><SleeveCuffAsset coat={hasLabCoat} gloved={hasGloves} skin={character.skinTone} shirt={character.shirtColor} length={.36} radius={.045}/></group>
        {/* Right Hand (Gloved Nitrile or Skin) */}
        <group name="held-right-palm" position={[0.02, 0.04, 0.22]}>
          <GripHandAsset color={handColor} gloved={hasGloves} pose={activeTool?'grip':'relaxed'} centered/>

          {/* ---------------- ITEM 1: FIRE EXTINGUISHER ---------------- */}
          {activeTool === 'extinguisher' && player.inventory.hasFireExtinguisher && (
            <group name="held-extinguisher" scale={.65} position={[-.02,-.325,-.015]} rotation={[.08,-.1,.05]}>
             <ExtinguisherAsset name="asset-carried-extinguisher" type={fireSimulation.currentExtinguisher?.agent==='abc_powder'?'powder':'co2'} carried squeezeState={carriedState}/>
             <object3D name="held-valve-port" ref={valveAnchor} position={[.02,.458,0]}/>
             <object3D name="held-extinguisher-grip" position={[.047,.503,0]}/>
            </group>
          )}

          {/* ---------------- ITEM 2: SPILL KIT SWEEPER & SCOOP ---------------- */}
          {activeTool === 'spillKit' && player.inventory.hasSweeper && (
            <group name="held-spillKit" position={[0,-.215,-.03]} rotation={[Math.PI/2,0,0]}><HeldPanAsset/><object3D name="held-pan-grip" position={[0,.055,-.205]}/></group>
          )}

          {/* ---------------- ITEM 3: HAZARD WASTE CONTAINER ---------------- */}
          {activeTool === 'waste' && player.inventory.isHoldingTrash && (
            <group name="held-waste" position={[0,-.20,player.inventory.heldTrashType==='sharps'?.027:-.025]} rotation={[.12,0,-.08]}><WasteCarrierAsset kind={player.inventory.heldTrashType??'chemical'}/><object3D name="held-waste-grip" position={player.inventory.heldTrashType==='sharps'?[0,.196,-.051]:[0,.2,0]}/></group>
          )}
        </group>
      </group>

      {/* ================= 2. LEFT ARM (SUPPORT / STEADYING ARM) ================= */}
      <group ref={leftArmRef}>
        <group position={[-.04,.027,.19]} rotation={[Math.PI,0,.12]}><SleeveCuffAsset coat={hasLabCoat} gloved={hasGloves} skin={character.skinTone} shirt={character.shirtColor} length={.36} radius={.045}/></group>
        <group name="held-left-palm" position={[-.02,.04,.22]}>
          <GripHandAsset color={handColor} gloved={hasGloves} pose={activeTool?'grip':'relaxed'} left centered/>
          {activeTool==='spillKit'&&player.inventory.hasSweeper&&<group name="held-brush" position={[0,-.17,-.04]} rotation={[Math.PI/2,0,0]}><BrushAsset/><object3D name="held-brush-grip" position={[0,.065,-.16]}/></group>}
          {activeTool==='extinguisher'&&player.inventory.hasFireExtinguisher&&<group ref={nozzleAimRef} name="held-nozzle" position={[0,.01,-.06]}>
           <object3D name="held-nozzle-port" ref={nozzleAnchor} position={[0,0,.06]}/>
           <object3D name="extinguisher-muzzle" position={[0,0,-.06]}/>
           <group position={[0,0,.06]} rotation={[-Math.PI/2,0,0]}><NozzleAsset/></group>
          </group>}
        </group>
      </group>
    </group>
  );
};
