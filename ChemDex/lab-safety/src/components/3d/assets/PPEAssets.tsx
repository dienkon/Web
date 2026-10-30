import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { WARDROBE } from './wardrobe';
import { AssetLabel, InstancedBoxes, Pipe, Ring, Solid } from './AssetPrimitives';

export { GogglesAsset, MaskAsset } from './FittedPPE';

export function GloveAsset({color=WARDROBE.glove,left=false}:{color?:string;left?:boolean}){
 return <group name="asset-glove" userData={{assetId:'glove'}} scale={[left?-1:1,1,1]}>
  <group scale={[1,1,.4]}>
   <mesh position={[0,.038,0]}><cylinderGeometry args={[.033,.038,.076,24,1,true]}/><meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={.8}/></mesh>
   <Ring radius={.038} tube={.002} at={[0,.002,0]} color="#8db5bc"/>
  </group>
  <mesh position={[0,.11,0]} scale={[1.12,1.3,.35]}><sphereGeometry args={[.045,24,20]}/><meshStandardMaterial color={color} roughness={.83}/></mesh>
  {[-.032,-.01,.012,.034].map((x,i)=>{const length=[.065,.08,.074,.052][i],palmTop=.11+.0585*Math.sqrt(1-Math.pow(x/.0504,2));return <mesh key={x} position={[x,palmTop-.005+length/2+.009,0]} rotation={[0,0,(i-1.5)*-.035]}><capsuleGeometry args={[.009,length,5,16]}/><meshStandardMaterial color={color} roughness={.8}/></mesh>;})}
  <mesh position={[-.045,.129,0]} rotation={[0,0,-.55]}><capsuleGeometry args={[.013,.055,5,16]}/><meshStandardMaterial color={color} roughness={.83}/></mesh>
  {[-.023,0,.023].map(x=><Pipe key={x} points={[[x,.052,.013],[x-.002,.063,.016],[x+.002,.077,.016]]} radius={.0008} color="#94bdc2" metal={0}/>)}
 </group>;
}

export function HangerAsset(){
 return <group name="asset-hanger" userData={{assetId:'hanger'}}>
  <Pipe points={[[-.155,.005,0],[-.15,.018,0],[0,.09,0],[.15,.018,0],[.155,.005,0]]} radius={.0025}/>
  <Pipe points={[[-.155,.005,0],[.155,.005,0]]} radius={.0025}/>
  <Pipe points={[[0,.09,0],[.016,.11,0],[.014,.145,0],[-.01,.149,0],[-.02,.136,0]]} radius={.0025}/>
 </group>;
}

export function LabCoatAsset(){
 const geometry=useMemo(()=>{
  const s=new THREE.Shape(),points=[[-.15,0],[.15,0],[.16,.4],[.22,.37],[.275,.405],[.22,.69],[.13,.76],[.05,.76],[0,.69],[-.05,.76],[-.13,.76],[-.22,.69],[-.275,.405],[-.22,.37],[-.16,.4]];
  points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:.012,bevelEnabled:true,bevelSize:.0015,bevelThickness:.001,bevelSegments:2,steps:1}),p=g.attributes.position;
  for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+.006*Math.pow(p.getX(i)/.15,2));g.computeVertexNormals();return g;
 },[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <group name="asset-lab-coat" userData={{assetId:'lab-coat'}}>
  <mesh geometry={geometry} castShadow><meshStandardMaterial color={WARDROBE.coat} roughness={.96}/></mesh>
  <group position={[0,.735,0]}><HangerAsset/></group>
  {[-1,1].map(side=><group key={side}>
   <Solid size={[.075,.09,.003]} at={[side*.095,.205,.018]} color={WARDROBE.pocket} rounded/>
   <Pipe points={[[side*.132,.25,.022],[side*.132,.161,.022],[side*.058,.161,.022],[side*.058,.25,.022]]} radius={.0009} color="#a4b5b0" metal={0}/>
   <Pipe points={[[side*.05,.755,.02],[side*.077,.655,.02],[side*.01,.6,.021]]} radius={.002} color="#b9c9c2" metal={0}/>
   <Pipe points={[[side*.22,.377,.028],[side*.27,.409,.033]]} radius={.002} color="#b3c1b9" metal={0}/>
  </group>)}
  <Solid size={[.005,.59,.002]} at={[0,.3,.015]} color="#c1d0c7"/>
  <Solid size={[.06,.065,.003]} at={[.09,.515,.018]} color={WARDROBE.pocket}/>
  {[.09,.18,.27,.36,.45,.54].map(y=><mesh key={y} position={[.009,y,.018]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.004,.004,.002,12]}/><meshStandardMaterial color={WARDROBE.button} roughness={.6}/></mesh>)}
  <Pipe points={[[-.145,.009,.021],[0,.008,.018],[.145,.009,.021]]} radius={.001} color="#bbc9bf" metal={0}/>
 </group>;
}

export function GloveDispenserAsset({size='M',color='#719ba9'}:{size?:string;color?:string}){
 return <group name="asset-glove-dispenser" userData={{assetId:'glove-dispenser'}}>
  <Solid size={[.18,.12,.006]} at={[0,.06,-.047]} color={color}/>
  {[-1,1].map(side=><React.Fragment key={side}>
   <Solid size={[.006,.12,.09]} at={[side*.087,.06,0]} color={color}/>
   <Solid size={[.18,.006,.09]} at={[0,.06+side*.057,0]} color={color}/>
  </React.Fragment>)}
  <Solid size={[.18,.044,.004]} at={[0,.098,.047]} color={color}/>
  <Solid size={[.18,.044,.004]} at={[0,.022,.047]} color={color}/>
  {[-1,1].map(side=><Solid key={side} size={[.035,.032,.004]} at={[side*.0725,.06,.047]} color={color}/>)}
  <AssetLabel lines={['NITRILE · '+size,'GĂNG THỰC HÀNH']} size={[.145,.032]} at={[0,.098,.05]}/>
  <group position={[.012,.074,.051]} rotation={[-.4,0,Math.PI]} scale={.2}><GloveAsset color={WARDROBE.glove}/></group>
  <Pipe points={[[-.08,.117,.045],[.08,.117,.045]]} radius={.0008} color="#b3cdd0" metal={0}/>
 </group>;
}

export function BackpackAsset({color='#688faa'}:{color?:string}){
 return <group name="asset-backpack" userData={{assetId:'backpack'}}>
  <Solid size={[.28,.35,.16]} at={[0,.175,0]} color={color} rounded roughness={.92} metal={0}/>
  <Solid size={[.23,.145,.06]} at={[0,.092,.103]} color="#50758b" rounded roughness={.9} metal={0}/>
  <Pipe points={[[-.12,.18,.092],[0,.185,.128],[.12,.18,.092]]} radius={.0015} color="#b4c8cf" metal={0}/>
  <Solid size={[.009,.025,.003]} at={[.06,.174,.12]} color="#b5c8cc" rounded/>
  {[-1,1].map(side=><Pipe key={side} points={[[side*.08,.29,-.075],[side*.1,.22,-.125],[side*.1,.06,-.12],[side*.075,.04,-.075]]} radius={.012} color="#4c6c80" metal={0}/>)}
  <Pipe points={[[-.045,.347,0],[-.035,.38,0],[.035,.38,0],[.045,.347,0]]} radius={.007} color="#4c6c80" metal={0}/>
  <AssetLabel lines={['LAB · 01']} size={[.08,.032]} at={[0,.09,.135]}/>
 </group>;
}

export function HairTieAsset(){
 return <group name="asset-hair-tie" userData={{assetId:'hair-tie'}}>
  <mesh position={[0,.004,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.03,.004,8,32]}/><meshStandardMaterial color={WARDROBE.hairTie} roughness={.95}/></mesh>
  <InstancedBoxes color="#b49aa7" roughness={.95} parts={Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2;return {at:[Math.sin(a)*.03,.004,Math.cos(a)*.03],size:[.001,.007,.007],rotation:[0,-a,0]};})}/>
 </group>;
}