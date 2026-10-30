import React from 'react';
import * as THREE from 'three';
import { ASSET_COLORS as C, AssetLabel, GlassSurface, LathedGlass, Pipe, Ring, Solid } from './AssetPrimitives';
import { BeakerAsset, FlaskAsset, TestTubeAsset } from './LabwareAssets';

function Feet({x,z}:{x:number;z:number}) {
 return <>{[-x,x].flatMap(px=>[-z,z].map(pz=><mesh key={`${px}/${pz}`} position={[px,.008,pz]}><cylinderGeometry args={[.014,.016,.016,16]}/><meshStandardMaterial color={C.rubber} roughness={.9}/></mesh>))}</>;
}

export function BalanceAsset({reading='0.000 g'}:{reading?:string}) {
 return <group name="asset-balance" userData={{assetId:'balance'}}>
  <Feet x={.115} z={.14}/><Solid size={[.32,.06,.36]} at={[0,.046,0]} color="#d5dede" rounded/>
  <Solid size={[.29,.008,.28]} at={[0,.08,-.025]} color="#c0d1d5" rounded/>
  <mesh position={[0,.102,-.025]}><cylinderGeometry args={[.072,.072,.012,40]}/><meshStandardMaterial color="#c1d0d2" metalness={.55} roughness={.26}/></mesh>
  <mesh position={[0,.092,-.025]}><cylinderGeometry args={[.04,.035,.01,24]}/><meshStandardMaterial color={C.dark}/></mesh>
  {[-1,1].map(side=><group key={side}>
   <Solid size={[.008,.23,.008]} at={[side*.14,.195,-.16]} color="#7f98a3" metal={.6}/>
   <Solid size={[.008,.23,.008]} at={[side*.14,.195,.11]} color="#7f98a3" metal={.6}/>
   <mesh position={[side*.137,.195,-.025]}><boxGeometry args={[.002,.218,.262]}/><GlassSurface opacity={.17}/></mesh>
   <Solid size={[.008,.008,.28]} at={[side*.14,.084,-.025]} color="#829da8"/>
  </group>)}
  <mesh position={[0,.195,-.16]}><boxGeometry args={[.27,.218,.002]}/><GlassSurface opacity={.2}/></mesh>
  <mesh position={[0,.195,.111]}><boxGeometry args={[.264,.218,.002]}/><GlassSurface opacity={.13}/></mesh>
  <Solid size={[.05,.009,.01]} at={[.07,.12,.121]} color="#6d8b97" rounded/>
  <Solid size={[.294,.008,.29]} at={[0,.312,-.025]} color="#a9bdc5" rounded/>
  <mesh position={[0,.317,-.025]}><boxGeometry args={[.264,.002,.26]}/><GlassSurface opacity={.2}/></mesh>
  <AssetLabel lines={[reading,'TARE    UNIT']} size={[.116,.038]} at={[-.024,.045,.181]} ink="#b7e3c4" paper="#304e4e"/>
  {[-.07,-.038,.085].map(x=><mesh key={x} position={[x,.043,.185]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.006,.006,.005,16]}/><meshStandardMaterial color={x>.05?'#6d9d96':'#a0b3b8'}/></mesh>)}
  <AssetLabel lines={['ANALYTICAL']} size={[.08,.014]} at={[.065,.071,.17]} paper={null}/>
 </group>;
}

export function HotplateAsset({flask=false}:{flask?:boolean}) {
 return <group name="asset-hotplate" userData={{assetId:'hotplate'}}>
  <Feet x={.082} z={.085}/><Solid size={[.24,.065,.26]} at={[0,.0485,0]} color="#bfcfce" rounded/>
  <Solid size={[.225,.009,.235]} at={[0,.0855,0]} color="#e4e6de" rounded/>
  <mesh position={[0,.092,0]}><cylinderGeometry args={[.092,.092,.006,40]}/><meshStandardMaterial color="#74878d" roughness={.55} metalness={.15}/></mesh>
  <Ring radius={.087} tube={.001} at={[0,.096,0]} color="#a7b8bb"/>
  {[-.067,.067].map(x=><group key={x} position={[x,.046,.135]} rotation={[Math.PI/2,0,0]}>
   <mesh><cylinderGeometry args={[.018,.018,.015,24]}/><meshStandardMaterial color="#536f79" roughness={.65}/></mesh>
   <Solid size={[.003,.002,.014]} at={[0,-.009,-.004]} color="#d9e5de"/>
  </group>)}
  <AssetLabel lines={['HEAT   STIR','OFF     OFF']} size={[.1,.032]} at={[0,.047,.131]} ink="#496c73" paper={null}/>
  <mesh position={[.093,.073,.131]}><sphereGeometry args={[.0035,10,8]}/><meshStandardMaterial color="#ad785b"/></mesh>
  {[-.09,-.06,-.03,0,.03,.06,.09].map(x=><Solid key={x} size={[.011,.003,.002]} at={[x,.025,-.131]} color="#8aa0a5"/>)}
  {flask&&<group position={[0,.096,0]}><FlaskAsset fill={.65}/></group>}
 </group>;
}

export function BuretteAsset(){
 return <group name="asset-burette" userData={{assetId:'burette'}}>
  <Solid size={[.24,.024,.3]} at={[0,.012,0]} color="#536c77" rounded/>
  <mesh position={[.082,.34,-.06]}><cylinderGeometry args={[.007,.007,.656,20]}/><meshStandardMaterial color={C.steel} roughness={.28} metalness={.65}/></mesh>
  <Ring radius={.011} at={[.082,.035,-.06]} tube={.003} color="#6a8794"/>
  {[.36,.54].map(y=><group key={y} position={[0,y,-.06]}>
   <Solid size={[.16,.018,.025]} at={[.018,0,0]} color="#8ea6af" metal={.4} rounded/>
   <mesh position={[.075,0,.025]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.012,.012,.025,16]}/><meshStandardMaterial color="#596f78"/></mesh>
   <Ring radius={.014} at={[-.045,0,.005]} tube={.003} color="#83a4a6"/>
  </group>)}
  <group position={[-.045,.17,-.055]}>
   <LathedGlass profile={[[.001,0],[.003,.035],[.006,.055],[.009,.073],[.009,.45],[.012,.465],[.008,.465],[.006,.45],[.006,.075],[.002,.04]]}/>
   <mesh position={[0,.205,0]}><cylinderGeometry args={[.005,.005,.26,20]}/><meshStandardMaterial color="#9dcbd1" transparent opacity={.7} depthWrite={false}/></mesh>
   {Array.from({length:21},(_,i)=><Solid key={i} size={[i%5===0?.011:.006,.001,.001]} at={[0,.09+i*.015,.0095]} color="#426b7b" metal={0}/>)}
   <mesh position={[0,.061,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.01,.01,.042,16]}/><meshStandardMaterial color="#dae6e7"/></mesh>
   <Solid size={[.04,.006,.009]} at={[.016,.061,.012]} color="#a86560" rounded/>
   <AssetLabel lines={['50 mL']} size={[.023,.016]} at={[0,.437,.01]} paper={null}/>
  </group>
  <group position={[-.045,.024,-.055]} scale={.43}><FlaskAsset color="#d0a9b1"/></group>
 </group>;
}

export function PHMeterAsset(){
 return <group name="asset-ph-meter" userData={{assetId:'ph-meter'}}>
  <Feet x={.08} z={.07}/><Solid size={[.21,.075,.19]} at={[0,.0535,0]} color="#b9cdcd" rounded/>
  <group position={[0,.092,.02]} rotation={[-Math.PI/2+.22,0,0]}><AssetLabel lines={['pH  7.00','READY · SAMPLE']} size={[.135,.065]} ink="#c5e9d2" paper="#365557"/></group>
  {[-.055,0,.055].map(x=><mesh key={x} position={[x,.086,.074]}><cylinderGeometry args={[.008,.008,.005,16]}/><meshStandardMaterial color="#6a9097"/></mesh>)}
  <mesh position={[-.083,.225,-.055]}><cylinderGeometry args={[.006,.006,.35,16]}/><meshStandardMaterial color={C.steel} metalness={.65}/></mesh>
  <Pipe points={[[-.083,.39,-.055],[-.035,.395,-.055],[.065,.34,-.055],[.16,.34,-.025]]} radius={.006}/>
  {[[-.083,.39,-.055],[.065,.34,-.055]].map((p,i)=><mesh key={i} position={p as [number,number,number]}><sphereGeometry args={[.013,16,12]}/><meshStandardMaterial color="#698c95"/></mesh>)}
  <group position={[.16,.055,-.025]} scale={[1,1.5,1]}><ElectrodeAsset/></group>
  <group position={[.16,0,-.025]} scale={.55}><BeakerAsset fill={.65}/></group>
  <Pipe points={[[-.05,.08,-.099],[-.12,.15,-.11],[-.14,.4,-.08],[.03,.43,-.05],[.16,.344,-.025]]} radius={.003} color="#56717e" metal={0}/>
 </group>;
}

export function ElectrodeAsset(){
 return <group name="asset-electrode" userData={{assetId:'electrode'}}>
  <mesh position={[0,.12,0]}><cylinderGeometry args={[.008,.008,.14,20]}/><meshStandardMaterial color="#527d89" roughness={.45}/></mesh>
  <LathedGlass profile={[[0,0],[.003,.001],[.005,.005],[.005,.05],[.007,.054],[.007,.061],[.004,.061],[.003,.006],[0,.004]]}/>
  <mesh position={[0,.003,0]}><sphereGeometry args={[.003,16,10]}/><meshStandardMaterial color="#98abc3" roughness={.15}/></mesh>
  <Ring radius={.009} at={[0,.177,0]} tube={.0015} color="#c1d9d7"/>
  <AssetLabel lines={['pH']} size={[.012,.025]} at={[0,.13,0]} curveRadius={.0086} paper={null}/>
 </group>;
}

export function CentrifugeAsset({open=true}:{open?:boolean}) {
 const slotAngles=[0,Math.PI/3,2*Math.PI/3,Math.PI,4*Math.PI/3,5*Math.PI/3];
 return <group name="asset-centrifuge" userData={{assetId:'centrifuge'}}>
  <Feet x={.14} z={.13}/>
  <mesh position={[0,.09,0]}><cylinderGeometry args={[.232,.215,.148,48]}/><meshStandardMaterial color="#d3dddc" roughness={.4}/></mesh>
  <mesh position={[0,.165,0]}><cylinderGeometry args={[.193,.193,.012,48]}/><meshStandardMaterial color="#425e6b" metalness={.2} roughness={.5}/></mesh>
  <mesh position={[0,.176,0]}><cylinderGeometry args={[.166,.166,.014,48]}/><meshStandardMaterial color="#9eb4bf" metalness={.5} roughness={.35}/></mesh>
  {slotAngles.map((angle,i)=><group key={i} position={[Math.sin(angle)*.119,.185,Math.cos(angle)*.119]}>
   <mesh rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.023,24]}/><meshStandardMaterial color="#3e5866"/></mesh>
   <Ring radius={.023} tube={.002} at={[0,.001,0]} color="#748e9d"/>
   <AssetLabel lines={[String(i+1)]} size={[.018,.012]} at={[Math.sin(angle)*.027,.001,Math.cos(angle)*.027]} rotation={[-Math.PI/2,0,0]} paper={null}/>
  </group>)}
  <mesh position={[0,.192,0]}><cylinderGeometry args={[.029,.034,.018,24]}/><meshStandardMaterial color="#c9d5da" metalness={.55}/></mesh>
  {open&&[0,1].map(i=><group key={i} position={[Math.sin(slotAngles[i])*.119,.183,Math.cos(slotAngles[i])*.119]} scale={.3}><TestTubeAsset color={i?'#a7bdc4':'#c5b07f'}/></group>)}
  <group name="centrifuge-lid-hinge" position={[0,.18,-.218]} rotation={[open?-1.12:0,0,0]}>
   <group position={[0,0,.218]}>
    <mesh><cylinderGeometry args={[.23,.23,.025,48]}/><meshStandardMaterial color="#c4d4d7" roughness={.4}/></mesh>
    <mesh position={[0,-.014,0]}><cylinderGeometry args={[.18,.18,.006,48]}/><meshStandardMaterial color="#9aaeb8" roughness={.5}/></mesh>
    <Ring radius={.197} at={[0,-.014,0]} tube={.004} color="#68828c"/>
    <Solid size={[.09,.018,.025]} at={[0,.025,.13]} color="#75929f" rounded/>
   </group>
  </group>
  <AssetLabel lines={['STOP','LOCK · CHECK']} size={[.095,.044]} at={[0,.095,0]} rotation={[0,-.16,0]} curveRadius={.225} curveSlope={.115} ink="#bad9c9" paper="#345257"/>
  {[.055,.093,.13].map(x=>{const radius=.224,theta=Math.asin(x/radius);return <group key={x} position={[x,.088,Math.cos(theta)*radius]} rotation={[0,theta,0]}><mesh position={[0,0,.004]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.007,.007,.008,16]}/><meshStandardMaterial color="#7a9da2"/></mesh></group>;})}
  <AssetLabel lines={['CENTRIFUGE']} size={[.12,.018]} at={[0,.137,0]} curveRadius={.2297} curveSlope={.115} paper={null}/>
 </group>;
}
