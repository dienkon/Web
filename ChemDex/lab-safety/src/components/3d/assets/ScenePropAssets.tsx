import React, { useMemo } from 'react';
import * as THREE from 'three';
import { AssetLabel, GlassSurface, InstancedBoxes, Pipe, Solid } from './AssetPrimitives';

export function WarningConeAsset(){
 const points=useMemo(()=>[[.084,.026],[.012,.37],[.007,.37],[.079,.026],[.084,.026]].map(p=>new THREE.Vector2(...p)),[]);
 const radius=(y:number)=>.084-(y-.026)*.072/.344+.0007;
 return <group name="asset-warning-cone" userData={{assetId:'warning-cone'}}>
  <Solid size={[.22,.026,.22]} at={[0,.013,0]} color="#b69062" rounded/>
  <mesh><latheGeometry args={[points,32]}/><meshStandardMaterial color="#cfaa73" roughness={.7} side={THREE.DoubleSide}/></mesh>
  {[.15,.245].map(y=><mesh key={y} position={[0,y,0]}><cylinderGeometry args={[radius(y+.018),radius(y-.018),.036,32,1,true]}/><meshStandardMaterial color="#dfe4d7" roughness={.6} side={THREE.DoubleSide}/></mesh>)}
 </group>;
}

export function ShippingCrateAsset(){
 return <group name="asset-shipping-crate" userData={{assetId:'shipping-crate'}}>
  <Solid size={[.55,.44,.42]} at={[0,.22,0]} color="#bca37d" roughness={.95} rounded/>
  <InstancedBoxes color="#a38d6d" roughness={1} parts={[-.265,.265].flatMap(x=>[-.20,.20].map(z=>({at:[x,.22,z],size:[.004,.42,.004]})))}/>
  <Solid size={[.535,.002,.006]} at={[0,.441,0]} color="#927f64"/>
  <Solid size={[.09,.003,.415]} at={[0,.443,0]} color="#ccbb94"/>
  <AssetLabel lines={['VẬT TƯ LAB','CHEMDEX · 01','↑ GIỮ THẲNG ↑']} size={[.27,.18]} at={[0,.24,.211]} paper="#e9e1cb"/>
 </group>;
}

export function PhoneAsset(){
 return <group name="asset-phone" userData={{assetId:'phone'}}>
  <Solid size={[.085,.011,.16]} at={[0,.0055,0]} color="#526d7c" rounded/>
  <Solid size={[.075,.001,.145]} at={[0,.0115,0]} color="#a8c6ca" rounded/>
  <Solid size={[.022,.001,.003]} at={[0,.0122,-.065]} color="#4b6979" rounded/>
  <Solid size={[.002,.003,.022]} at={[.043,.006,-.017]} color="#718e9c" rounded/>
  <Solid size={[.001,.003,.016]} at={[-.043,.006,-.02]} color="#718e9c" rounded/>
  <AssetLabel lines={['ĐIỆN THOẠI','MẪU']} size={[.062,.055]} at={[0,.0124,.003]} rotation={[-Math.PI/2,0,0]} paper={null}/>
 </group>;
}

export function PowerSwitchAsset({on=false}:{on?:boolean}){
 return <group name="asset-power-switch" userData={{assetId:'power-switch',on}}>
  <Solid size={[.12,.045,.085]} at={[0,.0225,0]} color="#bacdd0" rounded/>
  <Solid size={[.062,.003,.049]} at={[0,.046,0]} color="#597a89" rounded/>
  <group position={[0,.052,0]} rotation={[on?-.16:.16,0,0]}><Solid size={[.054,.012,.04]} color="#94b2b4" rounded/><AssetLabel lines={['I  O']} size={[.035,.022]} at={[0,.0065,0]} rotation={[-Math.PI/2,0,0]} paper={null}/></group>
  <Pipe points={[[0,.017,-.043],[0,.006,-.09],[.10,.006,-.12]]} radius={.004} color="#708996" metal={0}/>
 </group>;
}

export function SafetyShieldAsset(){
 return <group name="asset-safety-shield" userData={{assetId:'safety-shield'}}>
  <InstancedBoxes color="#809daa" parts={[-.125,.125].map(x=>({at:[x,.008,0],size:[.06,.016,.08]}))}/>
  <mesh position={[0,.106,0]}><boxGeometry args={[.3,.18,.006]}/><GlassSurface opacity={.5}/></mesh>
  <InstancedBoxes color="#91aeb9" parts={[-.146,.146].map(x=>({at:[x,.108,0],size:[.008,.184,.014]}))}/>
 </group>;
}

export function UtilityTrayAsset(){
 return <group name="asset-utility-tray" userData={{assetId:'utility-tray'}}>
  <Solid size={[.38,.008,.25]} at={[0,.004,0]} color="#b6cbd0" rounded/>
  <InstancedBoxes color="#9db8c4" parts={[-.186,.186].map(x=>({at:[x,.018,0],size:[.008,.028,.25]})).concat([-.121,.121].map(z=>({at:[0,.018,z],size:[.38,.028,.008]}))) as {at:[number,number,number];size:[number,number,number]}[]}/>
 </group>;
}

export function MirrorFrameAsset(){
 return <group name="asset-mirror-frame" userData={{assetId:'mirror-frame'}}>
  <InstancedBoxes color="#8ba8b5" parts={[-.595,.595].map(x=>({at:[x,1.14,0],size:[.05,2.14,.05]})).concat([.095,2.185].map(y=>({at:[0,y,0],size:[1.24,.05,.05]}))) as {at:[number,number,number];size:[number,number,number]}[]}/>
  {[-.5,.5].map(x=><group key={x}><Solid size={[.08,.04,.36]} at={[x,.02,-.02]} color="#748f9d" rounded/><Pipe points={[[Math.sign(x)*.595,1.4,-.025],[x,.04,-.15]]} radius={.014}/></group>)}
 </group>;
}
