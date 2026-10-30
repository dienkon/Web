import { BeakerAsset, ReagentBottleAsset } from '../assets/LabwareAssets';
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CABINET_SIZE, STORAGE_CABINETS, STORAGE_RACK } from '../../../data/scene/storageLayout';
import { useLabEquipment } from '../../../store/useLabEquipment';
import { useReducedLabMotion } from '../../../systems/device/useReducedLabMotion';
import { Pipe, Solid } from '../assets/AssetPrimitives';
import { StaticAssetCopies } from '../assets/StaticAssetCopies';

function Panel({at,size,color='#c4d2d9'}:{at:[number,number,number];size:[number,number,number];color?:string}) {
 return <mesh position={at} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.48} metalness={.25}/></mesh>;
}
function CabinetLabel({label}:{label:string}) {
 const texture=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const c=canvas.getContext('2d')!;c.fillStyle='#f9f8ef';c.fillRect(0,0,512,256);
  c.strokeStyle='#bc5b4a';c.lineWidth=8;c.beginPath();c.moveTo(256,20);c.lineTo(295,60);c.lineTo(256,100);c.lineTo(217,60);c.closePath();c.stroke();
  c.fillStyle='#34444d';c.textAlign='center';c.font='bold 52px sans-serif';c.fillText('!',256,79);
  c.font='bold 43px sans-serif';c.fillText(label,256,158);c.font='23px sans-serif';c.fillText('GIỮ KÍN · ĐỌC NHÃN',256,210);
  const result=new THREE.CanvasTexture(canvas);result.colorSpace=THREE.SRGBColorSpace;return result;
 },[label]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh position={[0,.38,.024]}><planeGeometry args={[.37,.185]}/><meshStandardMaterial map={texture} roughness={.8}/></mesh>;
}
export function ChemicalCabinetAsset({cabinet,position=cabinet.position,rotationY=-Math.PI/2,open:forcedOpen,interactive=true,name=cabinet.id}:{cabinet:typeof STORAGE_CABINETS[number];position?:[number,number,number];rotationY?:number;open?:boolean;interactive?:boolean;name?:string}) {
 const left=useRef<THREE.Group>(null),right=useRef<THREE.Group>(null);
 const reduced=useReducedLabMotion();
 useFrame((_,delta)=>{
  const open=forcedOpen??!!useLabEquipment.getState().progress[cabinet.id]?.active;
  if(left.current)left.current.rotation.y=reduced?(open?-1.45:0):THREE.MathUtils.damp(left.current.rotation.y,open?-1.45:0,8,Math.min(delta,.1));
  if(right.current)right.current.rotation.y=reduced?(open?1.45:0):THREE.MathUtils.damp(right.current.rotation.y,open?1.45:0,8,Math.min(delta,.1));
 });
 const [w,h,d]=CABINET_SIZE;
 return <group name={name} userData={interactive?{labItem:{id:cabinet.id,title:cabinet.title,kind:'storage'}}:undefined} position={position} rotation={[0,rotationY,0]}>
  <Panel at={[0,.09,0]} size={[w-.1,.18,d-.05]} color="#657581"/>
  <Panel at={[0,h/2+.04,-d/2+.018]} size={[w,h-.08,.036]} color={cabinet.color}/>
  {[-1,1].map(side=><Panel key={side} at={[side*(w/2-.018),h/2+.04,0]} size={[.036,h-.08,d]} color={cabinet.color}/>)}
  <Panel at={[0,h-.022,0]} size={[w,.044,d]} color={cabinet.color}/><Panel at={[0,.2,0]} size={[w,.06,d]} color={cabinet.color}/>
  {[.24,.8,1.35].map(y=><group key={y}><Panel at={[0,y,0]} size={[w-.08,.035,d-.08]}/><Panel at={[0,y+.035,.23]} size={[w-.1,.035,.016]}/></group>)}
  {['#a68a5a','#788f82'].map((color,variant)=><StaticAssetCopies key={color} placements={[.24,.8,1.35].flatMap(y=>(variant?[0]:[-.3,.3]).map(x=>({at:[x,y+.0175,0],scale:[.85,.9,.85]})))}><ReagentBottleAsset amber color={color}/></StaticAssetCopies>)}
  {[-1,1].map(side=><group key={side} ref={side<0?left:right} name={`cabinet-hinge-${side<0?'left':'right'}`} position={[side*(w/2-.04),.98,d/2]}>
   <group position={[-side*.255,0,0]}>
    <Panel at={[0,0,0]} size={[.502,1.54,.035]} color={cabinet.color}/><Panel at={[-side*.17,0,.04]} size={[.022,.19,.035]} color="#d5e0e3"/>
    <CabinetLabel label={cabinet.label}/>{[-.5,-.45,-.4].map(y=><Panel key={y} at={[0,y,.019]} size={[.28,.009,.005]} color="#56737a"/>)}
   </group>
  </group>)}
  {[-.68,.68].map(y=><Panel key={y} at={[.5,.98+y,.35]} size={[.025,.08,.025]} color="#738692"/>)}
 </group>;
}
export const GeneralStorageRack=({position=STORAGE_RACK.position,rotationY=-Math.PI/2}:{position?:[number,number,number];rotationY?:number})=> <group name={STORAGE_RACK.id} userData={{labItem:{id:STORAGE_RACK.id,title:'Giá dụng cụ thủy tinh',kind:'glass'}}} position={position} rotation={[0,rotationY,0]}>
  {[-.57,.57].flatMap(x=>[-.195,.195].map(z=><Solid key={`foot-${x}-${z}`} size={[.065,.012,.065]} at={[x,.006,z]} color="#7e98a5"/>))}
  {[-.57,.57].flatMap(x=>[-.195,.195].map(z=><Panel key={`${x}-${z}`} at={[x,1.1,z]} size={[.035,2.2,.035]} color="#8297a3"/>))}
  {STORAGE_RACK.shelves.map(y=><group key={y}>
   <Panel at={[0,y,0]} size={[1.18,.03,.43]}/><Panel at={[0,y+.035,.205]} size={[1.16,.04,.015]} color="#92a9b6"/>
  </group>)}
  <StaticAssetCopies placements={STORAGE_RACK.shelves.flatMap((y,index)=>[-.4,-.13,.14,.41].map((x,i)=>({at:[x,y+.015,0],scale:[.72,1,.72],name:`shelf-${index}-vessel-${i}`})))}><BeakerAsset fill={0}/></StaticAssetCopies>
  {[-1,1].map(side=><Pipe key={side} points={[[-side*.57,.12,-.22],[side*.57,2.12,-.22]]} radius={.009} color="#8ba0aa"/>)}
 </group>;
export const StorageCabinets:React.FC=()=> <group name="east-storage-wall">
 {STORAGE_CABINETS.map(cabinet=><ChemicalCabinetAsset key={cabinet.id} cabinet={cabinet}/>)}
 <GeneralStorageRack/>
</group>;
