import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssetLabel, GlassSurface, InstancedBoxes, Pipe, Ring, Solid } from './AssetPrimitives';
import { BenchSinkAsset, CountertopAsset } from './StationAssets';
import { GasTapAsset } from './CombustionAssets';
import { BENCH_SINK_LAYOUT } from '../../../data/scene/fixtureLayout';
import { useLabEquipment } from '../../../store/useLabEquipment';
import { useReducedLabMotion } from '../../../systems/device/useReducedLabMotion';

export function StoolAsset(){
 const spokes=useMemo(()=>Array.from({length:5},(_,i)=>i/5*Math.PI*2),[]);
 const legs=useRef<THREE.InstancedMesh>(null),feet=useRef<THREE.InstancedMesh>(null);
 const legCurve=useMemo(()=>new THREE.CatmullRomCurve3([[0,.095,0],[0,.055,.11],[0,.025,.203]].map(p=>new THREE.Vector3(...p))),[]);
 React.useLayoutEffect(()=>{
  const matrix=new THREE.Matrix4();
  spokes.forEach((a,i)=>{
   matrix.makeRotationY(a);legs.current!.setMatrixAt(i,matrix);
   matrix.makeTranslation(Math.sin(a)*.203,.012,Math.cos(a)*.203);feet.current!.setMatrixAt(i,matrix);
  });
  for(const mesh of [legs.current!,feet.current!]){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();}
 },[spokes]);
 return <group name="asset-stool" userData={{assetId:'stool'}}>
  <instancedMesh ref={legs} args={[undefined,undefined,5]} castShadow><tubeGeometry args={[legCurve,32,.011,8,false]}/><meshStandardMaterial color="#8da7b3" metalness={.5} roughness={.3}/></instancedMesh>
  <instancedMesh ref={feet} args={[undefined,undefined,5]}><cylinderGeometry args={[.016,.017,.024,16]}/><meshStandardMaterial color="#58717c" roughness={.85}/></instancedMesh>
  <mesh position={[0,.185,0]}><cylinderGeometry args={[.032,.038,.25,24]}/><meshStandardMaterial color="#718e9c" metalness={.5} roughness={.4}/></mesh>
  <mesh position={[0,.407,0]}><cylinderGeometry args={[.018,.018,.32,24]}/><meshStandardMaterial color="#b4c8d1" metalness={.65} roughness={.25}/></mesh>
  <Ring radius={.168} tube={.011} at={[0,.225,0]} color="#96afba"/>
  <InstancedBoxes color="#8fa9b5" parts={[0,Math.PI*2/3,Math.PI*4/3].map(a=>({at:[Math.sin(a)*.09,.225,Math.cos(a)*.09],size:[.012,.012,.16],rotation:[0,a,0]}))}/>
  <Solid size={[.17,.025,.17]} at={[0,.565,0]} color="#587582" rounded/>
  <mesh position={[0,.6,0]} castShadow><cylinderGeometry args={[.17,.165,.045,48]}/><meshStandardMaterial color="#415d6c" roughness={.84}/></mesh>
  <Ring radius={.168} tube={.002} at={[0,.606,0]} color="#6d8995"/>
  <Pipe points={[[.035,.555,0],[.12,.55,0],[.15,.565,0]]} radius={.005}/>
  <Solid size={[.045,.014,.025]} at={[.15,.565,0]} color="#455f6b" rounded/>
 </group>;
}

export function DrawerAsset({open=false}:{open?:boolean}){
 return <group name="asset-drawer" userData={{assetId:'drawer',open}} position={[0,0,open?.22:0]}>
  <Solid size={[.91,.018,1.07]} at={[0,.009,0]} color="#bacbd0"/>
  <Solid size={[.91,.26,.018]} at={[0,.14,-.526]} color="#a4bbc5"/>
  {[-.45,.45].map(x=><group key={x}><Solid size={[.018,.26,1.07]} at={[x,.14,0]} color="#b1c4cc"/><Solid size={[.006,.025,.95]} at={[x+Math.sign(x)*.012,.08,0]} color="#7895a3"/></group>)}
  <Solid size={[.96,.32,.026]} at={[0,.16,.55]} color="#c1d0d4" rounded/>
  {[-.13,.13].map(x=><Solid key={x} size={[.018,.018,.032]} at={[x,.205,.579]} color="#829eaa" rounded/>)}
  <Solid size={[.278,.022,.021]} at={[0,.205,.602]} color="#8ca7b2" rounded/>
 </group>;
}

function SlidingDrawer({id,x,y}:{id:string;x:number;y:number}){
 const open=useLabEquipment(s=>Boolean(s.progress[id]?.active)),root=useRef<THREE.Group>(null),reduced=useReducedLabMotion();
 useFrame((_,dt)=>{if(root.current)root.current.position.z=reduced?(open?.22:0):THREE.MathUtils.damp(root.current.position.z,open?.22:0,10,Math.min(dt,.1));});
 return <group position={[x,y,0]} userData={{labItem:{id,title:'Ngăn kéo dụng cụ',kind:'drawer'},ownsDrawerMotion:true}}>
  <group ref={root} name={`drawer-slide-${id}`}><DrawerAsset/></group>
 </group>;
}

export function BenchCabinetAsset({id='study-bench'}:{id?:string}){
 return <group name="asset-bench-cabinet" userData={{assetId:'bench-cabinet'}}>
  <InstancedBoxes color="#8ba5b2" parts={[-1.43,1.43].flatMap(x=>[-.49,.49].map(z=>({at:[x,.04,z],size:[.08,.08,.08]})))}/>
  <Solid size={[3.1,.04,1.2]} at={[0,.1,0]} color="#afc2cb"/>
  <Solid size={[3.1,.73,.025]} at={[0,.485,-.5875]} color="#b8c9ce"/>
  <InstancedBoxes color="#b8c9cf" parts={[-1.5375,-.5,.5,1.5375].map(x=>({at:[x,.485,0],size:[.025,.73,1.2]}))}/>
  <group name="bench-sink-service-bay"><Solid size={[.97,.69,.025]} at={[-1.01,.475,.6125]} color="#bacbd1" rounded/><Solid size={[.26,.025,.025]} at={[-1.01,.61,.641]} color="#8ca6b2" rounded/><AssetLabel lines={['SERVICE']} size={[.16,.045]} at={[-1.01,.23,.627]} paper={null}/></group>
  {[0,1.01].flatMap((x,col)=>[.13,.49].map((y,row)=><SlidingDrawer key={`${col}/${row}`} id={`${id}-drawer-${col}-${row}`} x={x} y={y}/>))}
  <group position={[0,.85,0]}><CountertopAsset width={3.2} depth={1.4} thickness={.05} holes={[BENCH_SINK_LAYOUT.hole]} color="#354d58"/></group>
  <InstancedBoxes color="#4c6570" parts={[...[-.69,.69].map(z=>({at:[0,.905,z] as [number,number,number],size:[3.2,.02,.02] as [number,number,number]})),...[-1.59,1.59].map(x=>({at:[x,.905,0] as [number,number,number],size:[.02,.02,1.4] as [number,number,number]}))]}/>
  <group position={BENCH_SINK_LAYOUT.position} userData={{labItem:{title:'Bồn rửa dụng cụ trên bàn',kind:'wash'}}}><BenchSinkAsset/></group>
  <Pipe points={[[-1.35,.76,.38],[-1.35,.53,.38],[-1.35,.45,.28],[-1.35,.54,.15],[-1.35,.56,-.55]]} radius={.015}/>
  <group position={[.7,.901,.4]} userData={{labItem:{title:'Van cấp khí trên bàn',kind:'gas'}}}><GasTapAsset/></group>
 </group>;
}

export function ReagentRackAsset(){
 return <group name="asset-reagent-rack" userData={{assetId:'reagent-rack'}}>
  {[-1.1,0,1.1].map(x=><group key={x}><mesh position={[x,.28,0]}><cylinderGeometry args={[.018,.018,.56,20]}/><meshStandardMaterial color="#9eb7c1" metalness={.6} roughness={.35}/></mesh><mesh position={[x,.004,0]}><cylinderGeometry args={[.031,.031,.008,20]}/><meshStandardMaterial color="#718e9b"/></mesh></group>)}
  {[.24,.5].map(y=><group key={y}><Solid size={[2.4,.02,.28]} at={[0,y,0]} color="#c9d6d7"/><InstancedBoxes color="#8ba7b2" parts={[-.135,.135].map(z=>({at:[0,y+.028,z],size:[2.4,.035,.008]}))}/></group>)}
  {[-.6,.6].map(x=><group key={x} position={[x,.1,.14]} userData={{labItem:{title:'Ổ cấp nguồn trên bàn',kind:'electrical'}}}>
   <Solid size={[.16,.08,.025]} color="#cdd9d8" rounded/>
   <InstancedBoxes color="#526f7c" parts={[-.04,.04].flatMap(cx=>[-.012,.012].map(dx=>({at:[cx+dx,0,.0135],size:[.006,.018,.002]})))}/>
   <AssetLabel lines={['SIM']} size={[.025,.013]} at={[0,-.023,.0135]} paper={null}/>
  </group>)}
 </group>;
}

export function StirringRodAsset(){
 const ends=useMemo(()=>[-.16,.16],[]);
 return <group name="asset-stirring-rod" userData={{assetId:'stirring-rod'}}>
  <mesh position={[0,.005,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.005,.005,.32,16]}/><GlassSurface opacity={.6}/></mesh>
  {ends.map(z=><mesh key={z} position={[0,.005,z]}><sphereGeometry args={[.005,12,8]}/><GlassSurface opacity={.6}/></mesh>)}
 </group>;
}
