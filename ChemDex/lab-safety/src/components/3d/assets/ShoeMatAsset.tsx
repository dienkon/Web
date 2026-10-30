import React, { useMemo } from 'react';
import * as THREE from 'three';
import { AssetLabel, InstancedBoxes, Solid } from './AssetPrimitives';
export function ShoeMatAsset(){
 const sole=useMemo(()=>{const s=new THREE.Shape();s.moveTo(-.055,-.13);s.quadraticCurveTo(-.075,.02,-.05,.11);s.quadraticCurveTo(0,.16,.05,.11);s.quadraticCurveTo(.075,.02,.055,-.13);s.closePath();return s;},[]);
 return <group name="asset-shoes-mat" userData={{assetId:'shoes-mat'}}>
  <Solid size={[1.6,.01,1.2]} at={[0,.005,0]} color="#809b9b" roughness={.95} rounded/>
  <InstancedBoxes color="#91aaa5" roughness={1} parts={Array.from({length:27},(_,i)=>({at:[0,.0102,-.5+i*.035],size:[1.50,.0006,.003]}))}/>
  {[-.17,.17].map((x,i)=><mesh key={x} position={[x,.0106,-.10]} rotation={[-Math.PI/2,0,i?.08:-.08]}><extrudeGeometry args={[sole,{depth:.001,bevelEnabled:false,curveSegments:12}]}/><meshStandardMaterial color="#c0d0c6" roughness={1}/></mesh>)}
  <AssetLabel lines={['KIỂM TRA GIÀY KÍN MŨI']} size={[1.1,.12]} at={[0,.011,.39]} rotation={[-Math.PI/2,0,0]} ink="#e0e7d8" paper={null}/>
 </group>;
}
