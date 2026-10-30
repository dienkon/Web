import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { LabScenario } from '../types';
import { getScenarioLayout } from './sceneLayout';
import { useStore } from '../../store/useStore';
import { useReducedLabMotion } from '../../systems/device/useReducedLabMotion';

/** Local inspection details, never a wobble of the whole bench or a running motor with an open lid. */
export function ScenarioMotion({scenario,layout}:{scenario:LabScenario;layout:ReturnType<typeof getScenarioLayout>}) {
 const detail=useRef<THREE.Group>(null),elapsed=useRef(0);
 const active=useStore(s=>s.cinematic===`scenario:${scenario.id}`);
 const reduced=useReducedLabMotion();
 const a=layout.offsets[0],b=layout.offsets[1];
 useFrame((_,delta)=>{
  const node=detail.current;if(!node)return;
  if(!active){elapsed.current=0;return;}
  if(!reduced&&!document.hidden&&useStore.getState().runState==='RUNNING')elapsed.current+=Math.min(delta,.05);
  const t=reduced?1:elapsed.current;
  node.position.set(0,0,0);node.rotation.set(0,0,0);node.scale.setScalar(1);
  switch(scenario.id){
   case 'unknown-bottle':node.position.set(0,.02*Math.sin(t*1.2),0);break; // detached label, bottle stationary
   case 'cracked-glass':node.position.set(a[0]+Math.sin(t*.8)*.045,.08+(Math.sin(t*.55)+1)*.06,a[2]+.095);break;
   case 'gas-hose':node.position.set(-.48+((t*.08)%.44),.035,.03);break;
   case 'hot-glass':node.position.set(b[0],.24+((t*.035)%.1),b[2]);node.scale.setScalar(.7+((t*.35)%1)*.3);break;
   case 'incompatible-storage':node.position.y=.012;node.scale.x=.95+Math.sin(t*.65)*.035;break;
   case 'pipette-bulb':node.position.set(.1,.065+Math.sin(t*.9)*.01,.08);node.scale.y=.9+Math.sin(t*.9)*.08;break;
   case 'centrifuge-balance':node.rotation.y=Math.sin(t*.6)*.2;node.position.set(0,.205,-.06);break; // inspection arc, not rotor
   case 'blocked-exit':node.position.set(.26,.007,.3-((t*.08)%.5));break;
   case 'eye-protection':node.position.set(a[0],.022,a[2]);node.scale.setScalar(1+Math.sin(t*.8)*.035);break;
   case 'dirty-gloves':node.position.set(a[0],.027,a[2]);node.rotation.y=Math.sin(t*.65)*.22;break;
   case 'waste-mixing':node.position.set(b[0],.31,b[2]);node.scale.setScalar(.9+Math.sin(t*.8)*.04);break;
   case 'vacuum-check':node.position.set(a[0],.13+Math.sin(t*.7)*.06,a[2]);break;
   case 'reagent-return':node.position.set(.08,.025,.08+Math.sin(t*.55)*.035);break;
   case 'crowded-bench':node.position.set(-.18+((t*.09)%.4),.018,-.1);break;
   case 'shutdown-check':node.position.set(a[0],.07,a[2]);node.rotation.y=Math.sin(t*.7)*.35;break;
  }
 });
 const metal=<meshStandardMaterial color="#6c9eaa" roughness={.4} metalness={.3}/>;
 const ring=(radius:number,color='#78a4a4')=><mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[radius,radius+.004,32]}/><meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={.65} depthWrite={false}/></mesh>;
 let art:React.ReactNode;
 switch(scenario.id){
 case 'unknown-bottle':art=<mesh position={[-.1,.14,.11]} rotation={[0,0,-.15]}><planeGeometry args={[.05,.075]}/><meshStandardMaterial color="#f4ecd5" side={THREE.DoubleSide}/></mesh>;break;
 case 'cracked-glass':art=<><mesh><torusGeometry args={[.037,.003,6,24]}/>{metal}</mesh><mesh position={[.032,-.04,0]} rotation={[0,0,.7]}><cylinderGeometry args={[.004,.004,.055,8]}/>{metal}</mesh></>;break;
 case 'gas-hose':art=ring(.025,'#b99a64');break;
 case 'hot-glass':art=<>{[-.025,0,.025].map(x=><mesh key={x} position={[x,0,0]}><torusGeometry args={[.02,.0015,4,12,Math.PI]}/><meshStandardMaterial color="#b9987f" transparent opacity={.35} depthWrite={false}/></mesh>)}</>;break;
 case 'incompatible-storage':art=<>{[-.42,0].map(x=><group key={x} position={[x,.001,0]}>{ring(.105)}</group>)}</>;break;
 case 'pipette-bulb':art=ring(.044,'#cb9a90');break;
 case 'centrifuge-balance':art=<>{[0,Math.PI].map(angle=><mesh key={angle} rotation={[-Math.PI/2,0,angle]}><ringGeometry args={[.15,.154,24,1,0,Math.PI/3]}/><meshStandardMaterial color="#7faab5" side={THREE.DoubleSide}/></mesh>)}</>;break;
 case 'blocked-exit':art=<mesh rotation={[-Math.PI/2,0,0]}><coneGeometry args={[.035,.085,3]}/><meshStandardMaterial color="#589b7a"/></mesh>;break;
 case 'eye-protection':art=<>{[-.064,.064].map(x=><group key={x} position={[x,0,.07]}>{ring(.06)}</group>)}</>;break;
 case 'dirty-gloves':art=<mesh rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.044,16]}/><meshStandardMaterial color="#a5ad75" transparent opacity={.35} depthWrite={false}/></mesh>;break;
 case 'waste-mixing':art=ring(.035,'#b4a36f');break;
 case 'vacuum-check':art=ring(.065,'#8daec0');break;
 case 'reagent-return':art=<mesh rotation={[-Math.PI/2,0,-.1]}><planeGeometry args={[.08,.04]}/><meshStandardMaterial color="#efe4be" side={THREE.DoubleSide}/></mesh>;break;
 case 'crowded-bench':art=<mesh><boxGeometry args={[.035,.009,.025]}/><meshStandardMaterial color="#8aabba"/></mesh>;break;
 case 'shutdown-check':art=ring(.04,'#a9b38c');break;
 default:art=null;
 }
 return <group ref={detail} name={`scenario-motion-${scenario.id}`} visible={active}>{art}</group>;
}
