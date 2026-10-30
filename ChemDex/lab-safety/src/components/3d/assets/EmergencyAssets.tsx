import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssetLabel, GlassSurface, InstancedBoxes, Pipe, Ring, Solid } from './AssetPrimitives';
import { ReagentBottleAsset } from './LabwareAssets';
import { useReducedLabMotion } from '../../../systems/device/useReducedLabMotion';

function Turned({profile,color='#a6bcc6',metal=.5}:{profile:[number,number][];color?:string;metal?:number}){
 const key=JSON.stringify(profile),points=useMemo(()=>[...profile,profile[0]].map(p=>new THREE.Vector2(...p)),[key]);
 return <mesh castShadow receiveShadow><latheGeometry args={[points,40]}/><meshStandardMaterial color={color} metalness={metal} roughness={.4} side={THREE.DoubleSide}/></mesh>;
}

/** The bowl has a rolled lip, separate inner and outer walls, and a real drain. */
export function EyewashAsset({active=false}:{active?:boolean}){
 return <group name="asset-eyewash" userData={{assetId:'eyewash',active}}>
  <Turned profile={[[.024,0],[.055,.004],[.11,.025],[.17,.08],[.18,.10],[.176,.108],[.168,.103],[.16,.084],[.102,.031],[.05,.012],[.024,.01]]}/>
  <mesh position={[0,.006,0]}><cylinderGeometry args={[.023,.023,.009,24,1,true]}/><meshStandardMaterial color="#7593a0" side={THREE.DoubleSide}/></mesh>
  <Pipe points={[[-.065,.065,0],[-.065,.10,0],[.065,.10,0],[.065,.065,0]]} radius={.009} color="#89a9a1"/>
  {[-.065,.065].map(x=><group key={x} position={[x,.10,0]}>
   <Turned profile={[[.013,0],[.021,.014],[.023,.032],[.019,.04],[.006,.04],[.006,.015],[.01,0]]} color="#709f94" metal={.1}/>
   <group position={[0,.04,-.023]} rotation={[active?-1.8:0,0,0]}><Solid size={[.052,.009,.05]} at={[0,.005,.023]} color="#cfb873" rounded/><Pipe points={[[0,0,0],[0,-.025,-.01],[0,-.04,.015]]} radius={.0018} color="#8caaa5"/></group>
  </group>)}
  <Pipe points={[[.17,.06,0],[.225,.06,0],[.225,.12,0]]} radius={.007} color="#88a8a1"/>
  <group position={[.225,.135,0]} rotation={[0,0,active?-.65:0]}><Solid size={[.07,.075,.008]} color="#cfbb76" rounded/><AssetLabel lines={['PUSH']} size={[.055,.025]} at={[0,0,.005]} paper={null}/></group>
  {active&&<EyewashFlow/>}
 </group>;
}

function EyewashFlow(){
 const curves=useMemo(()=>[-.065,.065].map(x=>new THREE.CatmullRomCurve3([[x,.14,0],[x*.75,.27,.02],[x*.35,.29,.055],[x*.1,.035,.10]].map(p=>new THREE.Vector3(...p)))),[]);
 const drops=useRef<THREE.InstancedMesh>(null),clock=useRef(0),m=useMemo(()=>new THREE.Matrix4(),[]),reduced=useReducedLabMotion();
 useFrame((_,dt)=>{if(!drops.current)return;if(!reduced&&!document.hidden)clock.current+=Math.min(dt,.05);for(let i=0;i<20;i++){const p=curves[i%2].getPointAt((i/20+clock.current*.7)%1);m.makeTranslation(p.x,p.y,p.z);drops.current.setMatrixAt(i,m);}drops.current.instanceMatrix.needsUpdate=true;drops.current.computeBoundingBox();});
 return <group name="asset-eyewash-jets">
  {curves.map((curve,i)=><mesh key={i}><tubeGeometry args={[curve,32,.0035,8,false]}/><meshStandardMaterial color="#95c7d6" transparent opacity={.55} depthWrite={false}/></mesh>)}
  <instancedMesh ref={drops} args={[undefined,undefined,20]} frustumCulled={false}><sphereGeometry args={[.004,8,6]}/><meshStandardMaterial color="#bfdfeb" transparent opacity={.7} depthWrite={false}/></instancedMesh>
 </group>;
}

export function ShowerHeadAsset(){
 const holes=useMemo(()=>{const s=new THREE.Shape();s.absarc(0,0,.142,0,Math.PI*2,false);for(let i=0;i<37;i++){const ring=i<12?12:24,r=i===36?0:i<12?.06:.113,a=i/ring*Math.PI*2,h=new THREE.Path();h.absarc(Math.sin(a)*r,Math.cos(a)*r,.003,0,Math.PI*2,true);s.holes.push(h);}return s;},[]);
 return <group name="asset-shower-head" userData={{assetId:'shower-head'}}>
  <Turned profile={[[.145,0],[.15,.009],[.12,.045],[.035,.085],[.018,.09],[.013,.09],[.013,.078],[.033,.077],[.114,.037],[.139,.007],[.139,0]]}/>
  <mesh position={[0,.004,0]} rotation={[-Math.PI/2,0,0]}><extrudeGeometry args={[holes,{depth:.003,bevelEnabled:false,curveSegments:8}]}/><meshStandardMaterial color="#bacbd0" metalness={.5} roughness={.4} side={THREE.DoubleSide}/></mesh>
 </group>;
}

function ShowerFlow(){
 const ref=useRef<THREE.Points>(null),time=useRef(0),reduced=useReducedLabMotion();
 const positions=useMemo(()=>new Float32Array(144*3),[]);
 useFrame((_,dt)=>{if(!ref.current)return;if(!reduced&&!document.hidden)time.current+=Math.min(dt,.05);const p=ref.current.geometry.attributes.position as THREE.BufferAttribute;
  for(let i=0;i<144;i++){const t=(i/144+time.current*.8)%1,a=i*2.39996,r=(.04+(i%7)/7*.08)*(1+t*1.8);p.setXYZ(i,Math.sin(a)*r,2.335-t*2.31,.8+Math.cos(a)*r);}p.needsUpdate=true;
 });
 return <points ref={ref} name="asset-shower-water" frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" count={144} array={positions} itemSize={3}/></bufferGeometry><pointsMaterial size={.015} color="#b6dce6" transparent opacity={.65} depthWrite={false}/></points>;
}

export function ShowerPullAsset({active=false}:{active?:boolean}){
 const rod=useRef<THREE.Group>(null),lever=useRef<THREE.Group>(null),angle=useRef(0),reduced=useReducedLabMotion();
 useFrame((_,dt)=>{angle.current=reduced?(active?-.65:0):THREE.MathUtils.damp(angle.current,active?-.65:0,10,Math.min(dt,.1));if(lever.current)lever.current.rotation.z=angle.current;if(rod.current)rod.current.position.set(.18*Math.cos(angle.current),2.65+.18*Math.sin(angle.current),.44);});
 return <group name="asset-shower-pull">
  <group position={[0,2.65,.44]}><group ref={lever}><Pipe points={[[0,0,0],[.18,0,0]]} radius={.008} color="#ac9f73"/></group></group>
  <group ref={rod} name="asset-shower-pull-rod" position={[.18,2.65,.44]}>
   <Pipe points={[[0,0,0],[0,-.92,0]]} radius={.005} color="#c7b677"/>
   <Pipe points={[[0,-.92,0],[-.08,-.99,0],[.08,-.99,0],[0,-.92,0]]} radius={.007} color="#cab477"/>
  </group>
 </group>;
}

export function EmergencyShowerAsset({shower=false,eyewash=false}:{shower?:boolean;eyewash?:boolean}){
 return <group name="asset-emergency-shower" userData={{assetId:'emergency-shower'}}>
  <mesh position={[0,.006,0]}><cylinderGeometry args={[.115,.125,.012,40]}/><meshStandardMaterial color="#7e9e9c" metalness={.4}/></mesh>
  <Pipe points={[[0,.012,0],[0,2.59,0],[0,2.65,.10],[0,2.65,.72],[0,2.59,.8],[0,2.425,.8]]} radius={.028} color="#74a498"/>
  {[.15,1.0,2.55].map(y=><Ring key={y} radius={.032} at={[0,y,0]} tube={.006} color="#a6bcb9"/>)}
  <Pipe points={[[0,1.0,0],[0,1.0,.21],[0,1.0,.28]]} radius={.021} color="#81a89f"/>
  <group position={[0,1.0,.28]} userData={{labItem:{title:'Bồn rửa mắt khẩn cấp',kind:'shower'}}}><EyewashAsset active={eyewash}/></group>
  <group position={[0,2.335,.8]} userData={{labItem:{title:'Vòi tắm trên cao',kind:'shower'}}}><ShowerHeadAsset/></group>
  <ShowerPullAsset active={shower}/>
  {shower&&<ShowerFlow/>}
  <AssetLabel lines={['TẮM · RỬA MẮT','MÔ PHỎNG']} size={[.29,.14]} at={[0,2.05,.035]} paper="#d9e6df"/>
 </group>;
}

function Gauge(){
 return <group name="extinguisher-pressure-gauge" position={[0,.45,.065]}>
  <mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.023,.023,.014,32]}/><meshStandardMaterial color="#b4c7cf" metalness={.65}/></mesh>
  <mesh position={[0,0,.008]}><circleGeometry args={[.020,32]}/><meshStandardMaterial color="#e3e6d8"/></mesh>
  <mesh position={[0,0,.009]} rotation={[0,0,Math.PI/6]}><torusGeometry args={[.014,.003,5,20,Math.PI*2/3]}/><meshStandardMaterial color="#82ae90"/></mesh>
  <Pipe points={[[-.008,-.011,.010],[0,0,.010],[.007,.011,.010]]} radius={.001} color="#435f6c"/>
 </group>;
}

export function ExtinguisherAsset({type='powder',carried=false,squeezeState,name}:{type?:'powder'|'co2';carried?:boolean;squeezeState?:React.RefObject<{squeezing:boolean;pinPulled:boolean}>;name?:string}){
 const co2=type==='co2';
 const lever=useRef<THREE.Group>(null),pin=useRef<THREE.Group>(null),reduced=useReducedLabMotion();
 useFrame((_,dt)=>{if(!carried)return;const state=squeezeState?.current;if(lever.current)lever.current.rotation.z=reduced?(state?.squeezing?-.18:0):THREE.MathUtils.damp(lever.current.rotation.z,state?.squeezing?-.18:0,20,Math.min(dt,.05));if(pin.current)pin.current.visible=!state?.pinPulled;});
 return <group name={name??`asset-extinguisher-${type}`} userData={{assetId:'extinguisher-'+type}}>
  <Turned color={co2?'#a8655b':'#b97564'} metal={.22} profile={[[0,0],[.063,0],[.076,.013],[.076,.35],[.067,.39],[.028,.415],[.021,.427],[0,.427]]}/>
  <Ring radius={.073} at={[0,.016,0]} tube={.003} color="#6e7c7b"/>
  <mesh position={[0,.447,0]}><cylinderGeometry args={[.018,.018,.043,24]}/><meshStandardMaterial color="#aabcc4" metalness={.6}/></mesh>
  <Solid size={[.027,.03,.036]} at={[0,.477,0]} color="#869da9" rounded/>
  <Pipe points={[[-.015,.48,0],[.025,.503,0],[.085,.503,0]]} radius={.006} color="#4f6a77"/>
  <group ref={lever} name={name==='asset-mirror-extinguisher'?'asset-mirror-extinguisher-lever':carried?'asset-carried-extinguisher-lever':'asset-extinguisher-lever'} position={[.005,.519,0]}><Solid size={[.085,.01,.025]} at={[.042,0,0]} color="#587685" rounded/></group>
  <Pipe points={[[.005,.49,0],[.005,.519,0]]} radius={.006} color="#587685"/>
  <group ref={pin} name={name==='asset-mirror-extinguisher'?'asset-mirror-extinguisher-pin':carried?'asset-carried-extinguisher-pin':'asset-extinguisher-pin'}>
  <mesh position={[-.023,.478,.015]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.0025,.0025,.055,12]}/><meshStandardMaterial color="#bacbd0" metalness={.6}/></mesh>
  <mesh position={[-.065,.478,.016]}><torusGeometry args={[.012,.002,6,24]}/><meshStandardMaterial color="#b5c6ca" metalness={.5}/></mesh>
  <Pipe points={[[-.05,.47,.015],[-.057,.44,.021],[-.04,.425,.04]]} radius={.0015} color="#b9a06c"/>
  <Solid size={[.022,.038,.002]} at={[-.04,.413,.041]} color="#c5b178"/>
  </group>
  {carried?(co2?null:<Gauge/>):co2?<>
   <Pipe points={[[.016,.458,0],[.091,.46,0],[.116,.405,0]]} radius={.008} color="#465f6c" metal={0}/>
   <group position={[.116,.25,0]}><Turned color="#435e6c" metal={0} profile={[[.046,0],[.048,.01],[.023,.115],[.012,.16],[.008,.16],[.018,.115],[.041,.009],[.041,0]]}/></group>
  </>:<>
   <Gauge/>
   <Pipe points={[[.02,.46,0],[.095,.445,-.01],[.11,.30,-.015],[.105,.10,.02]]} radius={.008} color="#48616d" metal={0}/>
   <group position={[.105,.10,.02]}><Turned color="#587785" metal={0} profile={[[.012,0],[.01,.055],[.006,.055],[.007,0]]}/></group>
  </>}
  <AssetLabel lines={[co2?'CO₂':'BỘT ABC','MẪU HUẤN LUYỆN','CHEMDEX']} size={[.105,.16]} at={[0,.24,0]} curveRadius={.077} paper="#e6e5d9"/>
 </group>;
}

export function ExtinguisherCabinetAsset({open=false}:{open?:boolean}){
 return <group name="asset-extinguisher-cabinet" userData={{assetId:'extinguisher-cabinet'}}>
  <Solid size={[.58,.86,.018]} at={[0,.43,-.116]} color="#a96f65"/>
  {[-.281,.281].map(x=><Solid key={x} size={[.018,.86,.24]} at={[x,.43,0]} color="#b77c6a"/>)}
  {[.009,.851].map(y=><Solid key={y} size={[.58,.018,.24]} at={[0,y,0]} color="#b97969"/>)}
  {[-.13,.13].map((x,i)=><group key={x} position={[x,.035,0]} scale={.82} userData={{labItem:{title:i?'Bình chữa cháy CO₂':'Bình chữa cháy bột',kind:'extinguisher'}}}><ExtinguisherAsset type={i?'co2':'powder'}/></group>)}
  <group position={[-.281,0,.128]} rotation={[0,open?-1.2:0,0]} name="extinguisher-cabinet-door">
   <group position={[.281,0,0]}>
    <mesh position={[0,.41,0]}><boxGeometry args={[.536,.72,.005]}/><GlassSurface opacity={.12}/></mesh>
    {[-.271,.271].map(x=><Solid key={x} size={[.02,.84,.018]} at={[x,.43,0]} color="#b07869"/>)}
    {[.02,.79].map(y=><Solid key={y} size={[.56,.04,.018]} at={[0,y,0]} color="#b27a6c"/>)}
    <Solid size={[.018,.12,.022]} at={[.23,.42,.02]} color="#a9bcc4" rounded/>
    <AssetLabel lines={['THIẾT BỊ CHỮA CHÁY']} size={[.48,.045]} at={[0,.79,.012]} paper={null}/>
   </group>
  </group>
 </group>;
}

export function FireBlanketAsset(){
 return <group name="asset-fire-blanket" userData={{assetId:'fire-blanket'}}>
  <Solid size={[.32,.34,.095]} at={[0,.27,0]} color="#b77968" rounded/>
  <Solid size={[.33,.025,.105]} at={[0,.449,0]} color="#a46b60" rounded/>
  <Solid size={[.25,.009,.004]} at={[0,.11,.05]} color="#6c7472"/>
  {[-.075,.075].map(x=><group key={x}><Solid size={[.021,.12,.004]} at={[x,.06,.052]} color="#e0dfce"/><Solid size={[.027,.005,.006]} at={[x,.005,.052]} color="#c7c8b9"/></group>)}
  <AssetLabel lines={['CHĂN CHỮA CHÁY','FIRE BLANKET','HAI ĐAI KÉO']} size={[.25,.21]} at={[0,.28,.049]} ink="#f3eee0" paper={null}/>
 </group>;
}

export function GauzePackAsset(){
 return <group name="asset-gauze-pack" userData={{assetId:'gauze-pack'}}>
  <Solid size={[.11,.018,.085]} at={[0,.009,0]} color="#e5e4d4" roughness={.95} rounded/>
  <InstancedBoxes color="#bfc8c0" roughness={.85} parts={[-.051,.051].map(x=>({at:[x,.0185,0],size:[.005,.001,.078]}))}/>
  <AssetLabel lines={['GẠC · MẪU','CHEMDEX']} size={[.08,.055]} at={[0,.019,0]} rotation={[-Math.PI/2,0,0]} paper={null}/>
 </group>;
}

export function BandageRollAsset(){
 return <group name="asset-bandage-roll" userData={{assetId:'bandage-roll'}}>
  <Turned color="#d6cbb1" metal={0} profile={[[.014,0],[.037,0],[.039,.006],[.039,.065],[.037,.07],[.014,.07]]}/>
  {[.002,.014,.026,.038,.05,.062,.068].map(y=><Ring key={y} radius={.038} at={[0,y,0]} tube={.0007} color="#c0bda9"/>)}
  <Solid size={[.035,.002,.04]} at={[.045,.001,0]} color="#d6cbb1"/>
 </group>;
}

export function FirstAidCabinetAsset({open=true}:{open?:boolean}){
 return <group name="asset-first-aid-cabinet" userData={{assetId:'first-aid-cabinet'}}>
  <Solid size={[.48,.55,.014]} at={[0,.275,-.10]} color="#b1c5cc"/>
  {[-.232,.232].map(x=><Solid key={x} size={[.016,.55,.21]} at={[x,.275,0]} color="#cbd7d6"/>)}
  {[.008,.267,.542].map(y=><Solid key={y} size={[.464,.016,.21]} at={[0,y,0]} color="#c1d2d5"/>)}
  {[-.12,0,.12].map((x,i)=><group key={x} position={[x,.275,0]} scale={.45}><ReagentBottleAsset amber={i===0} color="#b1c9cc"/></group>)}
  <group position={[-.12,.016,0]}><GauzePackAsset/></group><group position={[-.12,.036,0]}><GauzePackAsset/></group>
  <group position={[.07,.016,0]}><BandageRollAsset/></group>
  <group position={[-.24,0,.116]} rotation={[0,open?-1.15:0,0]} name="first-aid-door">
   <Solid size={[.48,.55,.016]} at={[.24,.275,0]} color="#d3ddd7" rounded/>
   <InstancedBoxes color="#71a796" parts={[{at:[.24,.30,.01],size:[.055,.17,.004]},{at:[.24,.30,.011],size:[.17,.055,.004]}]}/>
   <Solid size={[.017,.09,.022]} at={[.43,.275,.02]} color="#819fac" rounded/>
   <AssetLabel lines={['SƠ CỨU · MÔ PHỎNG']} size={[.37,.04]} at={[.24,.1,.01]} paper={null}/>
  </group>
 </group>;
}

export function ScoopAsset(){
 return <group name="asset-scoop" userData={{assetId:'scoop'}}>
  <Solid size={[.11,.009,.14]} at={[0,.0045,0]} color="#9fb6c2"/>
  {[-.051,.051].map(x=><Solid key={x} size={[.008,.045,.14]} at={[x,.025,0]} color="#9fb6c2"/>)}
  <Solid size={[.11,.045,.008]} at={[0,.025,-.066]} color="#9fb6c2"/>
  <Pipe points={[[0,.03,-.066],[0,.065,-.12],[0,.065,-.28]]} radius={.009} color="#8ba6b3"/>
  <Ring radius={.018} at={[0,.065,-.29]} tube={.004} color="#8ba6b3"/>
 </group>;
}

export function SpillCartAsset({open=false}:{open?:boolean}){
 return <group name="asset-spill-cart" userData={{assetId:'spill-cart'}}>
  <Turned color="#cab47c" metal={0} profile={[[0,.045],[.216,.045],[.245,.07],[.258,.65],[.25,.68],[.231,.68],[.238,.65],[.226,.08],[.206,.065],[0,.065]]}/>
  {[.10,.58,.66].map(y=><Ring key={y} radius={y<.2?.242:.255} at={[0,y,0]} tube={.007} color="#aa976d"/>)}
  <mesh position={[0,.075,-.175]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.012,.012,.48,16]}/><meshStandardMaterial color="#7793a1" metalness={.5}/></mesh>
  {[-.238,.238].map(x=><group key={x}><mesh position={[x,.075,-.175]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.075,.075,.028,24]}/><meshStandardMaterial color="#4b6470" roughness={.85}/></mesh><mesh position={[x+Math.sign(x)*.015,.075,-.175]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.026,.026,.004,20]}/><meshStandardMaterial color="#94abb6" metalness={.5}/></mesh></group>)}
  {[-.13,.13].map(x=><Solid key={x} size={[.05,.05,.05]} at={[x,.025,.16]} color="#7b8b7d" rounded/>)}
  <Pipe points={[[-.16,.3,-.2],[-.16,.86,-.2],[-.12,.90,-.2],[.12,.90,-.2],[.16,.86,-.2],[.16,.3,-.2]]} radius={.012} color="#829aa6"/>
  <group position={[0,.679,-.258]} rotation={[open?-1.15:0,0,0]}><group position={[0,0,.258]}><mesh position={[0,.012,0]}><cylinderGeometry args={[.269,.266,.024,40]}/><meshStandardMaterial color="#bba472" roughness={.6}/></mesh><Ring radius={.25} at={[0,.027,0]} tube={.004} color="#dec999"/><Solid size={[.11,.018,.035]} at={[0,.037,0]} color="#8b927e" rounded/></group></group>
  <AssetLabel lines={['BỘ XỬ LÝ TRÀN','SPILL KIT','MẪU HUẤN LUYỆN']} size={[.30,.22]} at={[0,.4,0]} curveRadius={.254} curveSlope={.022} paper="#e7e3d0"/>
  <group position={[.205,.3,.14]} rotation={[Math.PI/2,0,-.25]} scale={.7}><ScoopAsset/></group>
 </group>;
}
