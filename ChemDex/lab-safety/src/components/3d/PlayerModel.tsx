import React, { useRef } from 'react';
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
  const head = useRef<THREE.Group>(null);
  const look = useRef(new THREE.Vector3());
  const root = useRef<THREE.Group>(null), body = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null), rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null), rightLeg = useRef<THREE.Group>(null);
  const skin = character.skinTone, hair = character.hairColor;
  const coat = player.equipment.hasLabCoat, clothes = coat ? '#f8fafc' : character.shirtColor;
  const gloves = player.equipment.hasGloves ? '#38bdf8' : skin;
  const hairstyle = player.equipment.hairTied && character.hairStyle === 'long' ? 'ponytail' : character.hairStyle;
  useFrame(({clock, camera}, delta)=>{
    if (!root.current) return;
    root.current.position.set(...(position ?? playerCoords.position));
    root.current.rotation.y = rotationY ?? playerCoords.rotationY + Math.PI;
    const moving = isMoving ?? playerCoords.isMoving, phase = clock.elapsedTime * 8;
    const swing = moving ? Math.sin(phase) * 0.36 : 0;
    const alpha = 1 - Math.exp(-delta * 12);
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
    if(body.current) body.current.position.y = moving ? Math.abs(Math.sin(phase))*0.012 : Math.sin(clock.elapsedTime*2)*0.004;
  });
  return <group ref={root} position={position ?? [0,0,0]}><group ref={body}>
    {([-1,1] as const).map(side=><group key={side} ref={side===-1?leftLeg:rightLeg} position={[side*0.105,0.8,0]}>
      <Capsule position={[0,-0.36,0]} radius={0.075} length={0.57} color="#24374b" />
      <mesh position={[0,-0.735,0.055]}><boxGeometry args={[0.15,0.11,0.25]} /><meshStandardMaterial color={player.equipment.hasClosedShoes ? '#334155':'#8b5e3c'} roughness={0.8}/></mesh>
      <mesh position={[0,-0.782,0.055]}><boxGeometry args={[0.155,0.025,0.26]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
    </group>)}
    <Capsule position={[0,1.08,0]} radius={0.18} length={0.24} color={clothes} scale={[1.18,1,0.68]} />
    {coat && <group>
      <mesh position={[0,1.21,0.126]}><boxGeometry args={[0.15,0.23,0.025]} /><meshStandardMaterial color={character.shirtColor}/></mesh>
      {([-1,1] as const).map(side=><group key={side}>
        <mesh position={[side*.09,1.24,0.143]} rotation={[0,0,side*.24]}><boxGeometry args={[0.055,0.2,0.025]}/><meshStandardMaterial color="#ffffff"/></mesh>
        <mesh position={[side*.095,.82,0]}><boxGeometry args={[.19,.25,.25]}/><meshStandardMaterial color="#f8fafc" roughness={.8}/></mesh>
        <mesh position={[side*.12,.88,.14]}><boxGeometry args={[.08,.08,.012]}/><meshStandardMaterial color="#dbe5ec"/></mesh>
      </group>)}
      {[.99,1.05,1.11].map(y=><mesh key={y} position={[0,y,.15]}><sphereGeometry args={[.009,6,6]}/><meshBasicMaterial color="#94a3b8"/></mesh>)}
    </group>}
    {([-1,1] as const).map(side=><group key={side} ref={side===-1?leftArm:rightArm} position={[side*.23,1.31,0]} rotation={[0,0,-side*.08]}>
      <Capsule position={[0,-.2,0]} radius={.061} length={.28} color={clothes}/>
      <Capsule position={[0,-.44,.01]} radius={.044} length={.035} color={gloves} scale={[1,1,.7]}/>
      <Capsule position={[-side*.035,-.43,.035]} radius={.013} length={.027} color={gloves}/>
      {followCameraLook && side === 1 && heldTool === 'extinguisher' && player.inventory.hasFireExtinguisher && <group position={[0,-.59,.06]}>
        <mesh><cylinderGeometry args={[.065,.065,.34,16]}/><meshStandardMaterial color="#dc2626" metalness={.35} roughness={.3}/></mesh>
        <mesh position={[0,.2,0]}><boxGeometry args={[.1,.025,.035]}/><meshStandardMaterial color="#1e293b"/></mesh>
        <mesh position={[0,0,.065]}><planeGeometry args={[.07,.14]}/><meshStandardMaterial color="#fef08a"/></mesh>
      </group>}
      {followCameraLook && side === 1 && heldTool === 'waste' && player.inventory.isHoldingTrash && <group position={[0,-.56,.04]}>
        <mesh scale={[1,1.2,.8]}><icosahedronGeometry args={[.1,1]}/><meshStandardMaterial color={player.inventory.heldTrashType === 'chemical' ? '#eab308' : player.inventory.heldTrashType === 'sharps' ? '#dc2626' : '#e2e8f0'} flatShading/></mesh>
        <mesh position={[0,.11,0]}><coneGeometry args={[.025,.05,8]}/><meshStandardMaterial color="#ca8a04"/></mesh>
      </group>}
      {followCameraLook && side === 1 && heldTool === 'spillKit' && player.inventory.hasSweeper && <group position={[0,-.48,.04]}>
        <mesh><cylinderGeometry args={[.015,.015,.6,10]}/><meshStandardMaterial color="#ca8a04"/></mesh>
        <mesh position={[0,-.3,0]}><boxGeometry args={[.22,.065,.09]}/><meshStandardMaterial color="#334155"/></mesh>
      </group>}
    </group>)}
    <Capsule position={[0,1.42,0]} radius={.055} length={.08} color={skin}/>
    <group ref={head} position={[0,1.6,0]}>
      <mesh scale={[.9,1,.87]}><sphereGeometry args={[.19,20,16]}/><meshStandardMaterial color={skin} roughness={.8}/></mesh>
      <mesh position={[0,.045,-.015]}><sphereGeometry args={[.192,20,12,0,Math.PI*2,0,Math.PI*.53]}/><meshStandardMaterial color={hair} roughness={.9}/></mesh>
      <mesh position={[0,.095,.115]} rotation={[0,0,-.08]} scale={[1,.5,.35]}><sphereGeometry args={[.15,16,10]}/><meshStandardMaterial color={hair}/></mesh>
      {[-1,1].map(side=><group key={side}>
        <mesh position={[side*.166,-.005,0]} scale={[.5,1,.65]}><sphereGeometry args={[.036,10,8]}/><meshStandardMaterial color={skin}/></mesh>
        <mesh position={[side*.064,.005,.168]}><sphereGeometry args={[.018,10,8]}/><meshBasicMaterial color="#273344"/></mesh>
        <mesh position={[side*.059,.01,.184]}><sphereGeometry args={[.005,6,6]}/><meshBasicMaterial color="#fff"/></mesh>
      </group>)}
      <mesh position={[0,-.04,.169]}><sphereGeometry args={[.019,10,8]}/><meshStandardMaterial color={skin}/></mesh>
      <mesh position={[0,-.08,.158]} rotation={[0,0,Math.PI]}><torusGeometry args={[.028,.004,6,12,Math.PI]}/><meshBasicMaterial color="#9a534f"/></mesh>
      {hairstyle==='ponytail' && <Capsule position={[0,-.055,-.22]} radius={.057} length={.21} color={hair}/>}
      {hairstyle==='long' && <Capsule position={[0,-.17,-.115]} radius={.13} length={.16} color={hair} scale={[1,1,.55]}/>}
      {hairstyle==='bun' && <mesh position={[0,.19,-.08]}><sphereGeometry args={[.07,12,10]}/><meshStandardMaterial color={hair}/></mesh>}
      {hairstyle==='braided' && [0,1,2,3].map(i=><mesh key={i} position={[.12+(i%2)*.01,-.075-i*.063,-.1]}><sphereGeometry args={[.035-i*.004,10,8]}/><meshStandardMaterial color={hair}/></mesh>)}
      {player.equipment.hasGoggles && <group position={[0,.005,.178]}>
        <mesh><boxGeometry args={[.3,.07,.035]}/><meshStandardMaterial color="#cbd5e1"/></mesh>
        <mesh position={[0,0,.02]}><boxGeometry args={[.27,.048,.015]}/><meshStandardMaterial color="#a5e4f0" transparent opacity={.45} depthWrite={false}/></mesh>
      </group>}
      {player.equipment.hasMask && <mesh position={[0,-.065,.181]}><boxGeometry args={[.18,.09,.025]}/><meshStandardMaterial color="#93d9e5"/></mesh>}
    </group>
  </group></group>;
};
