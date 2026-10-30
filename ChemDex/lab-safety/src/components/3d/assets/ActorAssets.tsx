import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { AssetLabel, InstancedBoxes, Pipe, Ring, Solid } from './AssetPrimitives';
import { SharpsBoxAsset } from './WasteAssets';

export { GripHandAsset, WornCoatAsset } from './PlayerWardrobe';

export function HeldPanAsset(){
 return <group name="asset-held-pan" userData={{assetId:'held-pan'}}>
  <Solid size={[.17,.009,.17]} at={[0,.0045,0]} color="#a4bac4"/>
  <Solid size={[.17,.05,.009]} at={[0,.029,-.0805]} color="#95b1bd"/>
  <InstancedBoxes color="#95b1bd" parts={[-.0805,.0805].map(x=>({at:[x,.029,0],size:[.009,.05,.17]}))}/>
  <Pipe points={[[0,.035,-.08],[0,.055,-.11],[0,.055,-.21]]} radius={.011} color="#8aa8b6"/>
  <Ring radius={.016} tube={.004} at={[0,.055,-.215]} color="#8aa8b6"/>
  <Solid size={[.17,.004,.025]} at={[0,.002,.09]} color="#7899a9"/>
 </group>;
}

export function BrushAsset(){
 return <group name="asset-hand-brush" userData={{assetId:'hand-brush'}}>
  <InstancedBoxes color="#57717b" roughness={1} parts={Array.from({length:11},(_,i)=>({at:[-.055+i*.011,.014,0],size:[.007,.028,.043]}))}/>
  <Solid size={[.13,.025,.055]} at={[0,.0405,0]} color="#b9a575" rounded/>
  <Pipe points={[[0,.047,-.015],[0,.065,-.08],[0,.065,-.17]]} radius={.011} color="#b29d6b" metal={0}/>
  <Solid size={[.013,.004,.045]} at={[0,.065,-.145]} color="#8e805f" rounded/>
 </group>;
}

export function NozzleAsset(){
 const points=useMemo(()=>[[.014,0],[.014,.05],[.028,.12],[.023,.12],[.010,.05],[.010,0],[.014,0]].map(p=>new THREE.Vector2(...p)),[]);
 return <group name="asset-extinguisher-nozzle" userData={{assetId:'extinguisher-nozzle'}}><mesh><latheGeometry args={[points,32]}/><meshStandardMaterial color="#496674" roughness={.65} side={THREE.DoubleSide}/></mesh><Ring radius={.0145} at={[0,.006,0]} tube={.002}/></group>;
}

export function WasteCarrierAsset({kind='chemical'}:{kind?:'chemical'|'domestic'|'sharps'}){
 const points=useMemo(()=>{
  const g=new THREE.LatheGeometry([[0,0],[.045,0],[.064,.018],[.07,.075],[.06,.13],[.025,.19],[.022,.205],[.012,.22],[0,.215]].map(p=>new THREE.Vector2(...p)),32),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(x,z),f=1+Math.sin(a*11+y*45)*.025*(1-THREE.MathUtils.smoothstep(Math.cos(a),.7,.95));p.setXYZ(i,x*f,y,z*f);}g.computeVertexNormals();return g;
 },[]);useEffect(()=>()=>points.dispose(),[points]);
 if(kind==='sharps')return <group name="asset-sharps-carrier" userData={{assetId:'sharps-carrier'}} scale={.35}><SharpsBoxAsset name="asset-held-sharps-box" closed/></group>;
 return <group name={`asset-${kind}-carrier`} userData={{assetId:kind+'-carrier'}}>
  <mesh geometry={points} castShadow><meshStandardMaterial color={kind==='domestic'?'#cdd9d5':'#c2ad78'} roughness={.9}/></mesh>
  <Ring radius={.023} tube={.002} at={[0,.193,0]} color="#7d938f"/>
  <AssetLabel lines={[kind==='domestic'?'GIẤY SẠCH':'RẮN NHIỄM','MẪU']} size={[.07,.04]} at={[0,.11,0]} curveRadius={.0648} curveSlope={-.182} paper="#e8e6d6"/>
 </group>;
}

