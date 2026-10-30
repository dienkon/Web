import { GripHandAsset, WornCoatAsset, WasteCarrierAsset, BrushAsset, HeldPanAsset, NozzleAsset } from './assets/ActorAssets';
import { ExtinguisherAsset } from './assets/EmergencyAssets';
import { GogglesAsset, MaskAsset } from './assets/PPEAssets';
import { SleeveCuffAsset, ShoeAsset, TrouserLegAsset, FaceDetailsAsset } from './assets/ClothingParts';
import { HairAsset } from './assets/HairAsset';
import { WARDROBE, WORN_FIT } from './assets/wardrobe';
import { useReducedLabMotion } from '../../systems/device/useReducedLabMotion';
import React, { useRef, useMemo, useEffect } from 'react';
import { MutableTubeGeometry } from './fps/MutableTubeGeometry';
import { fireSimulation } from '../../core/fire/FireSim';
import { toolControls } from '../../systems/input/toolControls';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CharacterProfile, PlayerState } from '../../types';
import { useStore, playerCoords } from '../../store/useStore';
interface Props { position?: [number,number,number]; rotationY?: number; isMoving?: boolean; player?: PlayerState; character?: CharacterProfile; followCameraLook?: boolean; gesture?: 'reach' | 'warn'; }
function Capsule({position, radius, length, color, scale}: {position:[number,number,number];radius:number;length:number;color:string;scale?:[number,number,number]}) {
  return <mesh position={position} scale={scale}><capsuleGeometry args={[radius,length,4,12]} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>;
}
export const PlayerModel: React.FC<Props> = ({position, rotationY, isMoving, player: givenPlayer, character: givenCharacter, followCameraLook = false, gesture}) => {
  const storedPlayer = useStore(s=>s.player), storedCharacter = useStore(s=>s.character);
  const player = givenPlayer ?? storedPlayer, character = givenCharacter ?? storedCharacter;
  const heldTool = useStore(s => s.activeTool);
  const reduced=useReducedLabMotion();
  const head = useRef<THREE.Group>(null);
  const look = useRef(new THREE.Vector3());
  const root = useRef<THREE.Group>(null), body = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null), rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null), rightLeg = useRef<THREE.Group>(null);
  const valve=useRef<THREE.Object3D>(null),nozzlePort=useRef<THREE.Object3D>(null),nozzle=useRef<THREE.Group>(null);
  const hose=useRef<THREE.Mesh>(null),hoseTime=useRef(0),carriedState=useRef({squeezing:false,pinPulled:false});
  const hoseGeometry=useMemo(()=>new MutableTubeGeometry(),[]);
  const hosePoints=useMemo(()=>Array.from({length:4},()=>new THREE.Vector3()),[]);
  useEffect(()=>()=>hoseGeometry.dispose(),[hoseGeometry]);
  const skin = character.skinTone, hair = character.hairColor;
  const coat = player.equipment.hasLabCoat, clothes = coat ? WARDROBE.coat : character.shirtColor;
  const gloves = player.equipment.hasGloves ? WARDROBE.glove : skin;
  const hairstyle = player.equipment.hairTied && character.hairStyle === 'long' ? 'ponytail' : character.hairStyle;
  useFrame(({clock, camera}, delta)=>{
    if (!root.current) return;
    if(position&&isMoving===false&&!followCameraLook&&!gesture)return;
    root.current.position.set(...(position ?? playerCoords.position));
    root.current.rotation.y = rotationY ?? playerCoords.rotationY + Math.PI;
    const moving = isMoving ?? playerCoords.isMoving, phase = clock.elapsedTime * 8;
    const swing = moving&&!reduced ? Math.sin(phase) * 0.36 : 0;
    const alpha = reduced?1:1-Math.exp(-Math.min(delta,.05)*12);
    for (const [ref,angle] of [[leftLeg,swing],[rightLeg,-swing],[leftArm,-swing*.75],[rightArm,swing*.75]] as const) if(ref.current) ref.current.rotation.x=THREE.MathUtils.lerp(ref.current.rotation.x,angle,alpha);
    if (gesture && rightArm.current) rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, gesture === 'reach' ? -1.1 : -1.65, alpha);
    if (followCameraLook && head.current) {
      camera.getWorldDirection(look.current);
      head.current.rotation.x = THREE.MathUtils.clamp(-Math.asin(look.current.y), -0.6, 0.6);
    }
    if (followCameraLook && heldTool) {
      if (rightArm.current) rightArm.current.rotation.x = -0.7;
      if (leftArm.current && heldTool === 'extinguisher') leftArm.current.rotation.x = -0.5;
    }
    if(followCameraLook&&heldTool==='extinguisher'){
      carriedState.current.pinPulled=!!fireSimulation.currentExtinguisher?.pinPulled;
      carriedState.current.squeezing=toolControls.spraying&&!!fireSimulation.currentExtinguisher?.isDischarging;
      if(nozzle.current)nozzle.current.rotation.x=(head.current?.rotation.x??0)-(leftArm.current?.rotation.x??0);
      if(hose.current&&valve.current&&nozzlePort.current&&clock.elapsedTime-hoseTime.current>1/30){
        hoseTime.current=clock.elapsedTime;root.current.updateWorldMatrix(true,true);
        valve.current.getWorldPosition(hosePoints[0]);nozzlePort.current.getWorldPosition(hosePoints[3]);
        root.current.worldToLocal(hosePoints[0]);root.current.worldToLocal(hosePoints[3]);
        hosePoints[1].lerpVectors(hosePoints[0],hosePoints[3],.32);hosePoints[1].y-=.12;
        hosePoints[2].lerpVectors(hosePoints[0],hosePoints[3],.75);hosePoints[2].y-=.1;
        (hose.current.geometry as MutableTubeGeometry).update(hosePoints);
      }
    }
    if(body.current)body.current.position.y=0;
  });
  return <group name="asset-character" ref={root} position={position ?? [0,0,0]} rotation={[0,rotationY??0,0]}><group ref={body}>
    {([-1,1] as const).map(side=><group key={side} ref={side===-1?leftLeg:rightLeg} position={[side*0.105,.7945,0]}>
      <TrouserLegAsset/>
      <group position={[0,-.7945,0]}><ShoeAsset closed={player.equipment.hasClosedShoes} skin={skin}/></group>
    </group>)}
    {!coat&&<Capsule position={[0,1.08,0]} radius={.18} length={.24} color={clothes} scale={[1.18,1,.68]}/> }
    {!coat&&<mesh name="asset-trouser-waist" position={[0,.82,0]} scale={[.18,.12,.11]}><sphereGeometry args={[1,24,16]}/><meshStandardMaterial color={WARDROBE.trousers} roughness={.95}/></mesh>}
    {coat&&<WornCoatAsset shirt={character.shirtColor}/>}
    {([-1,1] as const).map(side=><group key={side} ref={side===-1?leftArm:rightArm} position={[side*WORN_FIT.shoulderX,WORN_FIT.shoulderY,0]} rotation={[0,0,-side*.08]}>
      <group position={[0,-.44,0]}><SleeveCuffAsset coat={coat} gloved={player.equipment.hasGloves} skin={skin} shirt={character.shirtColor} length={.44} radius={.057}/></group>
      <group name={side===-1?'avatar-left-palm':'avatar-right-palm'} position={[0,-.44,.01]}>
       <GripHandAsset color={gloves} gloved={player.equipment.hasGloves} pose={followCameraLook&&heldTool?'grip':'relaxed'} left={side===-1} centered/>
       {followCameraLook&&side===1&&heldTool==='extinguisher'&&player.inventory.hasFireExtinguisher&&<group name="held-mirror-extinguisher" position={[-.03,-.327,0]} scale={.65}><ExtinguisherAsset name="asset-mirror-extinguisher" type={fireSimulation.currentExtinguisher?.agent==='abc_powder'?'powder':'co2'} carried squeezeState={carriedState}/><object3D name="held-mirror-valve-port" ref={valve} position={[.02,.458,0]}/><object3D name="held-mirror-extinguisher-grip" position={[.047,.503,0]}/></group>}
       {followCameraLook&&side===1&&heldTool==='waste'&&player.inventory.isHoldingTrash&&<group name="held-mirror-waste" position={[0,-.20,player.inventory.heldTrashType==='sharps'?.027:-.025]} rotation={[.12,0,-.08]}><WasteCarrierAsset kind={player.inventory.heldTrashType??'chemical'}/><object3D name="held-mirror-waste-grip" position={player.inventory.heldTrashType==='sharps'?[0,.196,-.051]:[0,.2,0]}/></group>}
       {followCameraLook&&heldTool==='spillKit'&&player.inventory.hasSweeper&&(side===1?<group name="held-mirror-pan" position={[0,-.215,-.03]} rotation={[Math.PI/2,0,0]}><HeldPanAsset/><object3D name="held-mirror-pan-grip" position={[0,.055,-.205]}/></group>:<group name="held-mirror-brush" position={[0,-.17,-.04]} rotation={[Math.PI/2,0,0]}><BrushAsset/><object3D name="held-mirror-brush-grip" position={[0,.065,-.16]}/></group>)}
       {followCameraLook&&side===-1&&heldTool==='extinguisher'&&player.inventory.hasFireExtinguisher&&<group name="held-mirror-nozzle" ref={nozzle} position={[0,.01,.025]}><object3D name="held-mirror-nozzle-port" ref={nozzlePort}/><object3D name="held-mirror-muzzle" position={[0,0,.12]}/><group rotation={[Math.PI/2,0,0]}><NozzleAsset/></group></group>}
      </group>
    </group>)}
    {followCameraLook&&heldTool==='extinguisher'&&player.inventory.hasFireExtinguisher&&<mesh name="held-mirror-hose" ref={hose} geometry={hoseGeometry}><meshStandardMaterial color="#17202d" roughness={.8}/></mesh>}
    <Capsule position={[0,1.42,0]} radius={.055} length={.08} color={skin}/>
    <group ref={head} position={[0,1.6,0]}>
      <mesh scale={[.9,1,.87]}><sphereGeometry args={[.19,20,16]}/><meshStandardMaterial color={skin} roughness={.8}/></mesh>
      <HairAsset style={hairstyle} color={hair}/>
      <FaceDetailsAsset skin={skin} hair={hair}/>
      {player.equipment.hasGoggles&&<group position={WORN_FIT.goggles.position} scale={WORN_FIT.goggles.scale}><GogglesAsset name="asset-worn-goggles" strapDepth={WORN_FIT.goggles.strapDepth} wrapDepth={WORN_FIT.goggles.wrap}/></group>}
      {player.equipment.hasMask&&<group position={WORN_FIT.mask.position} scale={WORN_FIT.mask.scale}><MaskAsset name="asset-worn-mask" earDepth={WORN_FIT.mask.earDepth} earLift={WORN_FIT.mask.earLift} wrapDepth={WORN_FIT.mask.wrap}/></group>}
    </group>
  </group></group>;
};
