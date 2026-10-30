import React, { useEffect, useMemo, useRef } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssetLabel, GlassSurface, InstancedBoxes, Pipe, Ring, Solid } from './AssetPrimitives';
import { roundedOpening } from './StationAssets';
import { useReducedLabMotion } from '../../../systems/device/useReducedLabMotion';

export function DoorAsset(){
 const shape=useMemo(()=>{const s=roundedOpening(0,1.18,.96,2.32,.008);s.holes.push(roundedOpening(0,1.5,.32,.75,.025));return s;},[]);
 return <group name="asset-lab-door" userData={{assetId:'lab-door'}}>
  <InstancedBoxes color="#63818f" parts={[-1.04,1.04].map(x=>({at:[x,1.2,0],size:[.08,2.4,.10]})).concat([{at:[0,2.38,0],size:[2.16,.08,.10]}]) as {at:[number,number,number];size:[number,number,number]}[]}/>
  {[-1,1].map(side=><group key={side} name={side===-1?'door-leaf-left':'door-leaf-right'} position={[side,0,0]}>
   <group position={[-side*.5,0,0]}>
    <mesh position={[0,0,-.0225]} castShadow><extrudeGeometry args={[shape,{depth:.045,bevelEnabled:false,curveSegments:12}]}/><meshStandardMaterial color="#c4d4d7" roughness={.6}/></mesh>
    <mesh position={[0,1.5,0]}><boxGeometry args={[.32,.75,.006]}/><GlassSurface opacity={.3}/></mesh>
    <InstancedBoxes color="#87a2ad" parts={[-.175,.175].map(x=>({at:[x,1.5,.026],size:[.018,.79,.012]})).concat([1.115,1.885].map(y=>({at:[0,y,.026],size:[.36,.018,.012]}))) as {at:[number,number,number];size:[number,number,number]}[]}/>
    {[-.3,.3].map(x=><Solid key={x} size={[.04,.07,.04]} at={[x,1,.045]} color="#88a4b0" rounded/>)}
    <Solid size={[.72,.05,.035]} at={[0,1,.075]} color="#a5bdc6" rounded/>
    <Solid size={[.2,.04,.05]} at={[side*.22,2.27,.04]} color="#8aa5b1" rounded/>
    <Pipe points={[[side*.22,2.29,.065],[0,2.34,.08],[-side*.2,2.34,.025]]} radius={.006}/>
    <AssetLabel lines={['ĐẨY']} size={[.13,.05]} at={[0,1.08,.025]} paper={null}/>
   </group>
   {[.3,1.18,2.08].map(y=><mesh key={y} position={[0,y,0]}><cylinderGeometry args={[.014,.014,.10,16]}/><meshStandardMaterial color="#8faab6" metalness={.5}/></mesh>)}
  </group>)}
  <Solid size={[.68,.22,.06]} at={[0,2.57,.02]} color="#77a896" rounded/>
  <AssetLabel lines={['← EXIT →','LỐI THOÁT']} size={[.61,.16]} at={[0,2.57,.052]} ink="#f0eee0" paper={null}/>
 </group>;
}

export function WindowAsset(){
 return <group name="asset-transom-window" userData={{assetId:'transom-window'}}>
  <InstancedBoxes color="#8ba6b1" parts={[-1.385,1.385].map(x=>({at:[x,.275,0],size:[.03,.55,.08]})).concat([.015,.535].map(y=>({at:[0,y,0],size:[2.8,.03,.08]})),[{at:[0,.18,0],size:[2.75,.02,.06]}]) as {at:[number,number,number];size:[number,number,number]}[]}/>
  <mesh position={[0,.3575,0]}><boxGeometry args={[2.74,.325,.005]}/><GlassSurface opacity={.18}/></mesh>
  <mesh position={[0,.09,0]}><boxGeometry args={[2.74,.15,.005]}/><meshPhysicalMaterial color="#c7d8d6" transparent opacity={.45} roughness={.45} depthWrite={false}/></mesh>
  <Solid size={[2.86,.014,.12]} at={[0,.007,.02]} color="#a0b6bd"/>
  <Solid size={[.1,.018,.025]} at={[.85,.21,.045]} color="#6e8e9d" rounded/>
 </group>;
}

export function LEDPanelAsset(){
 return <group name="asset-led-panel" userData={{assetId:'led-panel'}}>
  <InstancedBoxes color="#aabfc6" parts={[{at:[-.68,.0175,0],size:[.04,.035,.4]},{at:[.68,.0175,0],size:[.04,.035,.4]},{at:[0,.0175,-.18],size:[1.32,.035,.04]},{at:[0,.0175,.18],size:[1.32,.035,.04]}]}/>
  <Solid size={[1.32,.005,.32]} at={[0,.0325,0]} color="#beced0"/>
  <mesh position={[0,.003,0]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[1.32,.32]}/><meshStandardMaterial color="#e0e8df" emissive="#e0e8df" emissiveIntensity={.8} roughness={.75}/></mesh>
  {[-.67,.67].flatMap(x=>[-.17,.17].map(z=><mesh key={`${x}/${z}`} position={[x,.0015,z]}><cylinderGeometry args={[.004,.004,.003,10]}/><meshStandardMaterial color="#829eaa"/></mesh>))}
 </group>;
}

export function VentGrilleAsset(){
 return <group name="asset-vent-grille" userData={{assetId:'vent-grille'}}>
  <InstancedBoxes color="#91adb8" parts={[-.241,.241].map(x=>({at:[x,.11,0],size:[.018,.22,.04]})).concat([.009,.211].map(y=>({at:[0,y,0],size:[.50,.018,.04]}))) as {at:[number,number,number];size:[number,number,number]}[]}/>
  <InstancedBoxes color="#9bb6c0" parts={Array.from({length:8},(_,i)=>({at:[0,.035+i*.022,0],size:[.465,.010,.035],rotation:[-.35,0,0]}))}/>
  {[-.235,.235].flatMap(x=>[.025,.195].map(y=><mesh key={`${x}/${y}`} position={[x,y,.023]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.003,.003,.003,10]}/><meshStandardMaterial color="#637f8d"/></mesh>))}
 </group>;
}

export function DuctAsset({length=3}:{length?:number}){
 const bands=Math.max(2,Math.round(length/2)+1);
 return <group name="asset-ventilation-duct" userData={{assetId:'ventilation-duct'}}>
  <mesh position={[0,.16,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.15,.15,length,40,1,true]}/><meshStandardMaterial color="#aabfc8" metalness={.5} roughness={.4} side={THREE.DoubleSide}/></mesh>
  {Array.from({length:bands},(_,i)=>(i/(bands-1)-.5)*length).map(x=><group key={x} position={[x,.16,0]} rotation={[0,0,Math.PI/2]}><Ring radius={.153} tube={.006}/></group>)}
  {[-length*.32,length*.32].map(x=><group key={x}><Solid size={[.012,.25,.012]} at={[x,.275,.16]} color="#829fab"/><Solid size={[.012,.25,.012]} at={[x,.275,-.16]} color="#829fab"/><Pipe points={[[x,.15,-.16],[x,.01,0],[x,.15,.16]]} radius={.006}/></group>)}
 </group>;
}

export function SmokeDetectorAsset(){
 const points=useMemo(()=>[[0,0],[.075,0],[.085,.008],[.085,.022],[.072,.04],[.045,.05],[0,.05]].map(p=>new THREE.Vector2(...p)),[]);
 return <group name="asset-smoke-detector" userData={{assetId:'smoke-detector'}}>
  <mesh><latheGeometry args={[points,32]}/><meshStandardMaterial color="#d2ddd8" roughness={.75}/></mesh>
  <InstancedBoxes color="#6e8c98" parts={Array.from({length:16},(_,i)=>{const a=i/16*Math.PI*2;return {at:[Math.sin(a)*.075,.03,Math.cos(a)*.075],size:[.008,.008,.006],rotation:[0,a,0]};})}/>
  <mesh position={[.04,.047,0]}><sphereGeometry args={[.003,10,6]}/><meshStandardMaterial color="#8db696"/></mesh>
  <AssetLabel lines={['TEST']} size={[.028,.009]} at={[0,.051,0]} rotation={[-Math.PI/2,0,0]} paper={null}/>
 </group>;
}

export function HoodExhaustAsset(){
 return <group name="asset-hood-exhaust" userData={{assetId:'hood-exhaust'}}>
  <mesh position={[0,.06,0]}><cylinderGeometry args={[.13,.18,.12,40,1,true]}/><meshStandardMaterial color="#9fb7c2" metalness={.45} roughness={.4} side={THREE.DoubleSide}/></mesh>
  <Pipe points={[[0,.11,0],[0,.42,0],[0,.80,.40],[0,.80,2]]} radius={.13} color="#a7bcc5"/>
  <Ring radius={.18} tube={.004} at={[0,.004,0]}/>
 </group>;
}

export function SprinklerAsset(){
 return <group name="asset-sprinkler" userData={{assetId:'sprinkler'}}>
  <mesh position={[0,.007,0]}><cylinderGeometry args={[.038,.038,.014,28]}/><meshStandardMaterial color="#b4c7cc" metalness={.5}/></mesh>
  <mesh position={[0,.022,0]}><cylinderGeometry args={[.012,.012,.025,20]}/><meshStandardMaterial color="#a5916b" metalness={.5}/></mesh>
  <Pipe points={[[-.017,.025,0],[-.022,.075,0],[0,.09,0],[.022,.075,0],[.017,.025,0]]} radius={.0035} color="#a18b68"/>
  <mesh position={[0,.058,0]}><capsuleGeometry args={[.004,.028,4,10]}/><meshPhysicalMaterial color="#bd8378" transparent opacity={.7} roughness={.2}/></mesh>
  <mesh position={[0,.092,0]}><cylinderGeometry args={[.032,.032,.003,24]}/><meshStandardMaterial color="#a18d6d" metalness={.5}/></mesh>
  <InstancedBoxes color="#b49e7a" parts={Array.from({length:10},(_,i)=>{const a=i/10*Math.PI*2;return {at:[Math.sin(a)*.03,.093,Math.cos(a)*.03],size:[.008,.003,.012],rotation:[0,a,0]};})}/>
 </group>;
}

export function ClockAsset({running=false}:{running?:boolean}){
 const hour=useRef<THREE.Group>(null),minute=useRef<THREE.Group>(null),second=useRef<THREE.Group>(null),reduced=useReducedLabMotion();
 useFrame(()=>{if(!running)return;const d=new Date(),s=reduced?0:d.getSeconds(),m=d.getMinutes()+s/60,h=d.getHours()%12+m/60;if(hour.current)hour.current.rotation.z=-h/12*Math.PI*2;if(minute.current)minute.current.rotation.z=-m/60*Math.PI*2;if(second.current)second.current.rotation.z=-s/60*Math.PI*2;});
 return <group name="asset-wall-clock" userData={{assetId:'wall-clock'}}>
  <mesh position={[0,.22,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.22,.22,.035,48]}/><meshStandardMaterial color="#73919f" metalness={.3}/></mesh>
  <mesh position={[0,.22,.019]}><circleGeometry args={[.205,48]}/><meshStandardMaterial color="#e2e6d9"/></mesh>
  <InstancedBoxes color="#607c88" parts={Array.from({length:60},(_,i)=>{const a=i/60*Math.PI*2;return {at:[Math.sin(a)*.19,.22+Math.cos(a)*.19,.022],size:[i%5?.002:.005,i%5?.009:.019,.002],rotation:[0,0,-a]};})}/>
  <group ref={hour} position={[0,.22,.025]} rotation={[0,0,-Math.PI*9.16/6]}><Solid size={[.009,.11,.003]} at={[0,.045,0]} color="#496674"/></group>
  <group ref={minute} position={[0,.22,.029]} rotation={[0,0,-Math.PI/3]}><Solid size={[.006,.16,.003]} at={[0,.067,0]} color="#496674"/></group>
  <group ref={second} position={[0,.22,.032]}><Solid size={[.002,.18,.002]} at={[0,.07,0]} color="#b17f64"/></group>
  <mesh position={[0,.22,.034]}><circleGeometry args={[.009,16]}/><meshStandardMaterial color="#678997"/></mesh>
  <AssetLabel lines={['CHEMDEX']} size={[.09,.018]} at={[0,.29,.024]} paper={null}/>
 </group>;
}

export function MarkerAsset({color='#668ca2'}:{color?:string}){
 return <group name="asset-whiteboard-marker" userData={{assetId:'whiteboard-marker'}}>
  <mesh position={[0,.008,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.007,.007,.14,16]}/><meshStandardMaterial color="#d4dfda" roughness={.7}/></mesh>
  <mesh position={[0,.008,-.076]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.008,.008,.024,16]}/><meshStandardMaterial color={color}/></mesh>
  <Solid size={[.002,.003,.022]} at={[.006,.016,-.076]} color={color} rounded/>
 </group>;
}

export function EraserAsset(){return <group name="asset-whiteboard-eraser" userData={{assetId:'whiteboard-eraser'}}><Solid size={[.105,.008,.055]} at={[0,.004,0]} color="#6e858d" roughness={1}/><Solid size={[.105,.025,.055]} at={[0,.0205,0]} color="#9ab6be" rounded/></group>;}

export function BoardFrame({width,height,children}:{width:number;height:number;children?:React.ReactNode}){
 return <group name="asset-board-frame">
  <Solid size={[width,height,.035]} at={[0,height/2,0]} color="#91adb8" rounded/>
  <Solid size={[width-.05,height-.05,.006]} at={[0,height/2,.021]} color="#dde5de"/>
  {children}
 </group>;
}

const GHS=[['Độc tính cấp','chat-doc-cap-tinh'],['Dễ cháy','de-chay'],['Ăn mòn','chat-an-mon'],['Dễ nổ','chat-no'],['Oxy hóa','chat-oxy-hoa'],['Môi trường','chat-nguy-hiem-moi-truong'],['Sức khỏe','nguy-hiem-suc-khoe-lau-dai'],['Kích ứng','nguy-hai'],['Khí nén','khi-nen']];
export function GHSBoardAsset(){
 const textures=useTexture(GHS.map(g=>'/SYMBOLS-IMG/bien-bao-'+g[1]+'.png'));
 return <group name="asset-ghs-board" userData={{assetId:'ghs-board'}}><BoardFrame width={2.8} height={1.6}>
  <AssetLabel lines={['BIỂU TƯỢNG CẢNH BÁO GHS']} size={[2.55,.13]} at={[0,1.48,.027]} paper={null}/>
  {GHS.map(([label],i)=><group key={label} position={[(i%3-1)*.82,1.17-Math.floor(i/3)*.42,.027]}>
   <mesh><planeGeometry args={[.29,.29]}/><meshStandardMaterial map={textures[i]} transparent roughness={.9}/></mesh>
   <AssetLabel lines={[label]} size={[.70,.06]} at={[0,-.18,.001]} paper={null}/>
  </group>)}
 </BoardFrame></group>;
}
