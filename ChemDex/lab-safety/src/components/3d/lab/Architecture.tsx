import { ShoeMatAsset } from '../assets/ShoeMatAsset';
import React from 'react';
import { DoorAsset, DuctAsset, HoodExhaustAsset, SmokeDetectorAsset, SprinklerAsset, VentGrilleAsset, WindowAsset } from '../assets/ArchitectureAssets';
import { InstancedBoxes } from '../assets/AssetPrimitives';
import { NORTH_WINDOWS, NorthWallAsset } from '../assets/RoomWallAsset';
import { FUME_HOOD_LAYOUT } from '../../../data/scene/fixtureLayout';

export const LabBaseRoom: React.FC = () => <group name="lab-architecture">
 <group position={[-6,.001,6.8]}><ShoeMatAsset/></group>
 <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[20,15]}/><meshStandardMaterial color="#dce4e8" roughness={.4} metalness={.04}/></mesh>
 <InstancedBoxes color="#9db5bf" parts={[{at:[0,.002,-7.25],size:[19.6,.004,.15]},{at:[0,.002,7.25],size:[19.6,.004,.15]},{at:[-9.75,.002,0],size:[.15,.004,14.5]},{at:[9.75,.002,0],size:[.15,.004,14.5]}]}/>
 <InstancedBoxes color="#bed0d4" parts={[-5,0,5].map(x=>({at:[x,.002,0],size:[.012,.004,14.5]})).concat([-3.5,0,3.5].map(z=>({at:[0,.002,z],size:[19.5,.004,.012]}))) as {at:[number,number,number];size:[number,number,number]}[]}/>
 <mesh rotation={[Math.PI/2,0,0]} position={[0,3.8,0]}><planeGeometry args={[20,15]}/><meshStandardMaterial color="#ecf0e8" roughness={.9}/></mesh>
 {[-1.5,2.5].map(z=><group key={z} position={[0,3.4,z]} userData={{labItem:{title:'Ống thông gió trần',kind:'ventilation'}}}><DuctAsset length={19.6}/></group>)}
 <group position={[FUME_HOOD_LAYOUT.position[0]+.15,2.76,FUME_HOOD_LAYOUT.position[2]]}><HoodExhaustAsset/></group>
 {[-6,0,6].flatMap(x=>[-4,0,4].map(z=><group key={x+'/'+z} position={[x,3.78,z]} rotation={[Math.PI,0,0]} userData={{labItem:{title:'Đầu báo khói và đầu phun trần',kind:'smokeAlarm'}}}><SmokeDetectorAsset/><group position={[.24,0,0]}><SprinklerAsset/></group></group>))}
 <NorthWallAsset/>
 {NORTH_WINDOWS.map(x=><group key={x} position={[x,3.075,-7.38]} userData={{labItem:{title:'Cửa sổ cao',kind:'ventilation'}}}><WindowAsset/></group>)}
 {[-9,9].map(x=><group key={x} position={[x,2.7,-7.36]} userData={{labItem:{title:'Lưới thông gió tường',kind:'ventilation'}}}><VentGrilleAsset/></group>)}
 <InstancedBoxes color="#e1e8e5" parts={[{at:[-8.55,1.9,7.5],size:[2.9,3.8,.2]},{at:[0,1.9,7.5],size:[9.8,3.8,.2]},{at:[8.55,1.9,7.5],size:[2.9,3.8,.2]},{at:[-6,3.1,7.5],size:[2.2,1.4,.2]},{at:[6,3.1,7.5],size:[2.2,1.4,.2]},{at:[-10,1.9,0],size:[.2,3.8,15]},{at:[10,1.9,0],size:[.2,3.8,15]}]}/>
 <InstancedBoxes color="#c8d6d8" parts={[{at:[-8.55,.7,7.39],size:[2.9,1.4,.014]},{at:[0,.7,7.39],size:[9.8,1.4,.014]},{at:[8.55,.7,7.39],size:[2.9,1.4,.014]},{at:[0,.7,-7.39],size:[19.8,1.4,.014]},{at:[-9.89,.7,0],size:[.014,1.4,14.8]},{at:[9.89,.7,0],size:[.014,1.4,14.8]}]}/>
 {[-6,6].map(x=><group key={x} position={[x,0,7.42]} rotation={[0,Math.PI,0]} userData={{labItem:{title:x<0?'Cửa vào và lối thoát Tây':'Cửa thoát Đông',kind:'door'}}}><DoorAsset/></group>)}
</group>;
