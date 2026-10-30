import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useReducedLabMotion } from '../../../systems/device/useReducedLabMotion';
import { ASSET_COLORS as C, AssetLabel, InstancedBoxes, LathedGlass, Liquid, Pipe, Ring, Solid } from './AssetPrimitives';

type FlameState='off'|'yellow'|'blue';
function MetalTurned({profile,color=C.steel,start=0,length=Math.PI*2}:{profile:[number,number][];color?:string;start?:number;length?:number}){
 const key=JSON.stringify(profile),points=useMemo(()=>[...profile,profile[0]].map(p=>new THREE.Vector2(...p)),[key]);
 return <mesh castShadow><latheGeometry args={[points,40,start,length]}/><meshStandardMaterial color={color} metalness={.55} roughness={.32} side={THREE.DoubleSide}/></mesh>;
}

/** A local flame, with bounded changes of scale; the apparatus itself remains still. */
export function TrainingFlame({mode='yellow',alcohol=false}:{mode?:Exclude<FlameState,'off'>;alcohol?:boolean}){
 const root=useRef<THREE.Group>(null),time=useRef(0),reduced=useReducedLabMotion();
 useFrame((_,dt)=>{if(!root.current)return;if(!reduced&&!document.hidden)time.current+=Math.min(dt,.05);
  const t=reduced?0:time.current;
  const wave=alcohol?Math.sin(t*6.1)*.025+Math.sin(t*10.7)*.015:Math.sin(t*8.2)*.03+Math.sin(t*13.1)*.012;
  root.current.scale.set(1-wave*.45,1+wave,1-wave*.45);
 });
 const h=alcohol?.12:mode==='blue'?.14:.17,r=alcohol?.017:mode==='blue'?.023:.03;
 const profile=[new THREE.Vector2(0,0),new THREE.Vector2(r*.65,h*.04),new THREE.Vector2(r,h*.24),new THREE.Vector2(r*.65,h*.58),new THREE.Vector2(r*.22,h*.84),new THREE.Vector2(0,h)];
 return <group ref={root} name={alcohol?'asset-alcohol-flame':'asset-bunsen-flame'}>
  <mesh><latheGeometry args={[profile,28]}/><meshBasicMaterial color={mode==='blue'?'#6cb8e4':'#efbd6a'} transparent opacity={.65} depthWrite={false}/></mesh>
  <mesh position={[0,.001,0]} scale={[.48,.58,.48]}><latheGeometry args={[profile,24]}/><meshBasicMaterial color={mode==='blue'?'#a1ddf1':'#c6dcd5'} transparent opacity={.9} depthWrite={false}/></mesh>
 </group>;
}

export function GasTapAsset({open=false}:{open?:boolean}){
 return <group name="asset-gas-tap" userData={{assetId:'gas-tap',open}}>
  <mesh position={[0,.009,0]}><cylinderGeometry args={[.032,.036,.018,24]}/><meshStandardMaterial color="#9aabb2" metalness={.5} roughness={.4}/></mesh>
  <mesh position={[0,.052,0]}><cylinderGeometry args={[.014,.019,.086,24]}/><meshStandardMaterial color="#b09a70" metalness={.5} roughness={.36}/></mesh>
  <group position={[0,.045,-.032]} rotation={[-Math.PI/2,0,0]}>
   <MetalTurned profile={[[.006,0],[.008,.007],[.007,.012],[.008,.017],[.007,.025],[.006,.035],[.0035,.035],[.0035,0]]} color="#a99877"/>
  </group>
  <group name="gas-tap-lever" position={[0,.1,0]} rotation={[0,open?Math.PI/2:0,0]}>
   <Solid size={[.085,.012,.023]} color="#b66d61" rounded/>
   <mesh position={[0,.008,0]}><cylinderGeometry args={[.006,.006,.005,16]}/><meshStandardMaterial color="#d5d1bb"/></mesh>
  </group>
  <AssetLabel lines={['GAS']} size={[.035,.015]} at={[0,.035,.019]} paper={null}/>
 </group>;
}

export function BunsenAsset({flame='off',airOpen=false,strikeBack=false}:{flame?:FlameState;airOpen?:boolean;strikeBack?:boolean}){
 return <group name="asset-bunsen" userData={{assetId:'bunsen',flame,strikeBack,airOpen}}>
  <mesh position={[0,.013,0]} castShadow><cylinderGeometry args={[.074,.084,.026,8]}/><meshStandardMaterial color="#596c75" metalness={.4} roughness={.6}/></mesh>
  <Ring radius={.024} at={[0,.028,0]} tube={.003} color="#a4916f"/>
  <MetalTurned profile={[[.02,.026],[.02,.047],[.012,.047],[.012,.026]]} color="#a89267"/>
  <group name="bunsen-barrel">
   <mesh position={[0,.153,0]}><cylinderGeometry args={[.014,.014,.14,32,1,true]}/><meshStandardMaterial color="#b2c1c7" metalness={.6} roughness={.27} side={THREE.DoubleSide} emissive={strikeBack?'#bd5648':'#000000'} emissiveIntensity={strikeBack?.45:0}/></mesh>
   {[.55,Math.PI+.55].map(start=><mesh key={start} position={[0,.065,0]}><cylinderGeometry args={[.014,.014,.036,20,1,true,start,Math.PI-1.1]}/><meshStandardMaterial color="#a3b7c2" metalness={.55} roughness={.3} side={THREE.DoubleSide}/></mesh>)}
   <Ring radius={.0145} at={[0,.223,0]} tube={.002} color="#d0dcdd"/>
  </group>
  <group name="bunsen-air-collar" rotation={[0,airOpen?0:Math.PI/2,0]}>
   {[.55,Math.PI+.55].map(start=><MetalTurned key={start} start={start} length={Math.PI-1.1} color="#b5a078" profile={[[.019,.047],[.021,.049],[.021,.079],[.019,.083],[.016,.083],[.016,.047]]}/>)}
   <Ring radius={.019} at={[0,.048,0]} tube={.002} color="#b8a47b"/><Ring radius={.019} at={[0,.081,0]} tube={.002} color="#b8a47b"/>
   <Solid size={[.006,.018,.005]} at={[.02,.065,0]} color="#8c805f"/>
  </group>
  <group position={[.02,.035,0]} rotation={[0,0,-Math.PI/2]}>
   <MetalTurned color="#b39d72" profile={[[.009,0],[.009,.02],[.008,.026],[.01,.032],[.008,.038],[.009,.044],[.007,.052],[.004,.052],[.004,0]]}/>
  </group>
  <AssetLabel lines={['BUNSEN']} size={[.055,.012]} at={[0,.013,.078]} paper={null}/>
  {flame!=='off'&&!strikeBack&&<group position={[0,.225,0]}><TrainingFlame mode={flame}/></group>}
 </group>;
}

export function GasHoseAsset({disconnected=false}:{disconnected?:boolean}){
 return <group name="asset-gas-hose" userData={{assetId:'gas-hose'}}>
  <Pipe points={[[-.25,.03,-.07],[-.22,.012,.10],[0,.012,.16],[.23,.012,.09],[.25,.03,-.07]]} radius={.008} color="#8d7660" metal={0}/>
  {[-1,1].map(side=><group key={side} position={[side*.25,.03,-.07-(side>0&&disconnected?.04:0)]} rotation={[-Math.PI/2,0,0]}>
   <MetalTurned profile={[[.009,0],[.01,.009],[.008,.013],[.01,.02],[.008,.034],[.005,.034],[.005,0]]}/>
   <Ring radius={.011} at={[0,.005,0]} tube={.0016} color="#798f98"/>
  </group>)}
 </group>;
}

export function TripodAsset(){
 const parts=Array.from({length:17},(_,i)=>-.08+i*.01).flatMap(p=>[{at:[p,.40475,0] as [number,number,number],size:[.0013,.0015,.18] as [number,number,number]},{at:[0,.40625,p] as [number,number,number],size:[.18,.0015,.0013] as [number,number,number]}]);
 return <group name="asset-tripod" userData={{assetId:'tripod'}}>
  {[0,2*Math.PI/3,4*Math.PI/3].map(a=><Pipe key={a} points={[[Math.sin(a)*.13,.004,Math.cos(a)*.13],[Math.sin(a)*.10,.24,Math.cos(a)*.10],[Math.sin(a)*.088,.4,Math.cos(a)*.088]]} radius={.004} color="#71858d"/>)}
  <Ring radius={.09} at={[0,.4,0]} tube={.004}/>
  <InstancedBoxes parts={parts} color="#98acb3" roughness={.65}/>
  <mesh position={[0,.4085,0]}><cylinderGeometry args={[.035,.035,.003,32]}/><meshStandardMaterial color="#d9dfd5" roughness={.95}/></mesh>
 </group>;
}

export function BunsenAssemblyAsset({flame='off',airOpen=false,gasOpen=false,strikeBack=false,tripod=true}:{flame?:FlameState;airOpen?:boolean;gasOpen?:boolean;strikeBack?:boolean;tripod?:boolean}){
 return <group name="asset-bunsen-assembly" userData={{assetId:'bunsen-assembly'}}>
  <BunsenAsset flame={flame} airOpen={airOpen} strikeBack={strikeBack}/>
  <group position={[.3,0,.16]}><GasTapAsset open={gasOpen}/></group>
  <Pipe points={[[.071,.035,0],[.13,.013,.035],[.19,.013,.18],[.29,.013,.21],[.3,.04,.097]]} radius={.0078} color="#566b73" metal={0}/>
  {tripod&&<TripodAsset/>}
 </group>;
}

export function SnufferCapAsset(){
 return <group name="asset-snuffer-cap" userData={{assetId:'snuffer-cap'}}>
  <MetalTurned profile={[[.043,0],[.045,.004],[.043,.046],[.034,.06],[.012,.068],[0,.069],[0,.065],[.012,.064],[.03,.055],[.039,.042],[.04,0]]}/>
  <mesh position={[0,.083,0]}><torusGeometry args={[.012,.0025,6,24]}/><meshStandardMaterial color="#859da8" metalness={.55} roughness={.35}/></mesh>
  <Ring radius={.043} tube={.0015} at={[0,.003,0]} color="#d1dbdb"/>
 </group>;
}

export function AlcoholLampAsset({lit=false,covered=false}:{lit?:boolean;covered?:boolean}){
 return <group name="asset-alcohol-lamp" userData={{assetId:'alcohol-lamp',covered,lit:lit&&!covered}}>
  <LathedGlass profile={[[0,0],[.052,0],[.071,.009],[.086,.03],[.09,.06],[.086,.092],[.069,.117],[.038,.132],[.024,.138],[.024,.15],[.019,.15],[.019,.138],[.035,.135],[.064,.119],[.081,.09],[.085,.06],[.081,.032],[.065,.012],[.05,.005],[0,.005]]}/>
  <Liquid radius={.084} at={.012} height={.047} color="#a0c4ce" profile={[[0,.012],[.062,.012],[.08,.032],[.084,.059],[0,.059]]}/>
  <MetalTurned color="#b7a686" profile={[[.024,.143],[.028,.147],[.028,.166],[.018,.174],[.008,.174],[.008,.143]]}/>
  <mesh position={[0,.183,0]}><cylinderGeometry args={[.006,.007,.03,16]}/><meshStandardMaterial color="#d6c7a1" roughness={.95}/></mesh>
  <AssetLabel lines={['ĐÈN CỒN','MẪU HUẤN LUYỆN']} size={[.068,.032]} at={[0,.075,0]} curveRadius={.089} paper={null}/>
  {covered?<group position={[0,.143,0]}><SnufferCapAsset/></group>:lit&&<group position={[0,.198,0]}><TrainingFlame alcohol/></group>}
 </group>;
}

export function AlcoholStationAsset({lit=true,covered=false}:{lit?:boolean;covered?:boolean}){
 return <group name="asset-alcohol-station" userData={{assetId:'alcohol-station'}}>
  <Solid size={[.48,.018,.30]} at={[0,.009,0]} color="#7f949c" rounded/>
  <group position={[-.06,.019,0]}><AlcoholLampAsset lit={lit} covered={covered}/></group>
  {!covered&&<group position={[.16,.019,0]}><SnufferCapAsset/></group>}
 </group>;
}
