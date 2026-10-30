import React from 'react';
import * as THREE from 'three';
import type {CharacterProfile} from '../../../types';
import {useBakedGeometry,spherePart,capsulePart,type BakedPart} from './BakedParts';
import {HairTieAsset} from './PPEAssets';

export function HairAsset({style,color}:{style:CharacterProfile['hairStyle'];color:string}){
 const geometry=useBakedGeometry(()=>{
  const cap=new THREE.SphereGeometry(.192,28,18,0,Math.PI*2,0,Math.PI*.56),p=cap.attributes.position;
  for(let i=0;i<p.count;i++){const z=p.getZ(i),y=p.getY(i);p.setY(i,y+Math.pow(Math.max(0,z/.192),4)*Math.max(0,1-y/.192)*.075);}cap.computeVertexNormals();
  const parts:BakedPart[]=[{geometry:cap,color,scale:[.915,1.005,.89],at:[0,.025,-.01]}];
  parts.push({...spherePart([-.035,.105,.137],[.077,.026,.026],color),rotation:[0,0,-.18]});
  parts.push({...spherePart([.066,.094,.127],[.036,.023,.023],color),rotation:[0,0,.25]});
  if(style==='ponytail')parts.push(capsulePart([0,-.08,-.185],.05,.19,color));
  if(style==='long')parts.push({...capsulePart([0,-.14,-.12],.12,.17,color),scale:[1,1,.58]});
  if(style==='bun')parts.push(spherePart([0,.185,-.10],[.068,.059,.058],color));
  if(style==='braided')for(let i=0;i<5;i++)parts.push(spherePart([.126+(i%2)*.008,-.07-i*.039,-.10],[.034-i*.003,.032-i*.002,.028-i*.002],color,12));
  return parts;
 },[style,color]);
 return <group name="asset-player-hair" userData={{hairStyle:style}}><mesh geometry={geometry} castShadow><meshStandardMaterial vertexColors roughness={.96}/></mesh>
  {style==='ponytail'&&<group position={[0,.025,-.185]} scale={1.6}><HairTieAsset/></group>}
  {style==='braided'&&<group position={[.13,-.24,-.1]} scale={.65}><HairTieAsset/></group>}
  {style==='bun'&&<group position={[0,.15,-.10]} scale={1.4}><HairTieAsset/></group>}
 </group>;
}
