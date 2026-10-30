import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useReducedLabMotion } from '../../../systems/device/useReducedLabMotion';
import { AssetLabel, GlassSurface, InstancedBoxes, Pipe, Ring, Solid } from './AssetPrimitives';
import { BeakerAsset } from './LabwareAssets';

export function roundedOpening(x:number,z:number,width:number,depth:number,radius:number){
 const x0=x-width/2,z0=z-depth/2,r=Math.min(radius,width/2,depth/2),s=new THREE.Shape();
 s.moveTo(x0+r,z0);s.lineTo(x0+width-r,z0);s.quadraticCurveTo(x0+width,z0,x0+width,z0+r);s.lineTo(x0+width,z0+depth-r);s.quadraticCurveTo(x0+width,z0+depth,x0+width-r,z0+depth);s.lineTo(x0+r,z0+depth);s.quadraticCurveTo(x0,z0+depth,x0,z0+depth-r);s.lineTo(x0,z0+r);s.quadraticCurveTo(x0,z0,x0+r,z0);return s;
}

export function CountertopAsset({width,depth,thickness=.025,holes=[],color='#b2c5cc'}:{width:number;depth:number;thickness?:number;holes?:{x:number;z:number;width:number;depth:number;radius:number}[];color?:string}){
 const key=JSON.stringify(holes),geometry=useMemo(()=>{
  const s=roundedOpening(0,0,width,depth,.018);
  // XY geometry maps y -> -world Z after rotation, so hole centres are reflected.
  holes.forEach(h=>s.holes.push(roundedOpening(h.x,-h.z,h.width,h.depth,h.radius)));
  return new THREE.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:false,curveSegments:12});
 },[width,depth,thickness,key]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh name="countertop-with-openings" geometry={geometry} rotation={[-Math.PI/2,0,0]} castShadow receiveShadow><meshStandardMaterial color={color} metalness={.28} roughness={.4}/></mesh>;
}

function basinGeometry(){
 const profiles=[{w:.7,d:.44,y:.206,r:.055},{w:.679,d:.419,y:.204,r:.052},{w:.662,d:.402,y:.182,r:.057},{w:.55,d:.28,y:.012,r:.055},{w:.57,d:.30,y:0,r:.058},{w:.694,d:.434,y:.182,r:.055},{w:.7,d:.44,y:.206,r:.055}];
 const points:number[]=[],indices:number[]=[],segments=12,ringCount=segments*4;
 profiles.forEach(p=>{const corners=[[p.w/2-p.r,p.d/2-p.r],[-p.w/2+p.r,p.d/2-p.r],[-p.w/2+p.r,-p.d/2+p.r],[p.w/2-p.r,-p.d/2+p.r]];
  corners.forEach(([cx,cz],corner)=>{for(let j=0;j<segments;j++){const a=(corner+j/segments)*Math.PI/2;points.push(cx+Math.cos(a)*p.r,p.y,cz+Math.sin(a)*p.r);}});
 });
 for(let row=0;row<profiles.length-1;row++)for(let j=0;j<ringCount;j++){const a=row*ringCount+j,b=row*ringCount+(j+1)%ringCount,c=b+ringCount,d=a+ringCount;indices.push(a,b,d,b,c,d);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

function DrainGrate(){
 const shape=useMemo(()=>{const s=new THREE.Shape();s.absarc(0,0,.02,0,Math.PI*2,false);
  for(let i=0;i<7;i++){const a=i/6*Math.PI*2,r=i===6?0:.011,h=new THREE.Path();h.absarc(Math.sin(a)*r,Math.cos(a)*r,.0024,0,Math.PI*2,true);s.holes.push(h);}return s;
 },[]);
 return <group name="basin-drain-grate"><Ring radius={.024} at={[0,.012,0]} tube={.0025}/><mesh position={[0,.002,0]} rotation={[-Math.PI/2,0,0]}><extrudeGeometry args={[shape,{depth:.002,bevelEnabled:false,curveSegments:12}]}/><meshStandardMaterial color="#8fa5b0" metalness={.6} roughness={.3}/></mesh></group>;
}

export function SinkBasinAsset(){
 const shell=useMemo(basinGeometry,[]),floor=useMemo(()=>{const s=roundedOpening(0,0,.55,.28,.055),hole=new THREE.Path();hole.absarc(0,0,.022,0,Math.PI*2,true);s.holes.push(hole);return s;},[]);
 useEffect(()=>()=>shell.dispose(),[shell]);
 return <group name="asset-sink-basin" userData={{assetId:'sink-basin'}}>
  <mesh name="basin-hollow-shell" geometry={shell} castShadow receiveShadow><meshStandardMaterial color="#b1c3ca" metalness={.55} roughness={.33} side={THREE.DoubleSide}/></mesh>
  <mesh name="basin-floor-with-drain" rotation={[-Math.PI/2,0,0]}><extrudeGeometry args={[floor,{depth:.012,bevelEnabled:false,curveSegments:16}]}/><meshStandardMaterial color="#9eb4bf" metalness={.5} roughness={.4}/></mesh>
  <DrainGrate/>
 </group>;
}

function WaterFlow(){
 const drops=useRef<THREE.InstancedMesh>(null),elapsed=useRef(0),matrix=useMemo(()=>new THREE.Matrix4(),[]),reduced=useReducedLabMotion();
 useFrame((_,dt)=>{if(!drops.current)return;if(!reduced&&!document.hidden)elapsed.current+=Math.min(dt,.05);
  for(let i=0;i<12;i++){const y=.19-((i/12+elapsed.current*.7)%1)*.37;matrix.makeTranslation(Math.sin(i*2.4)*.003,y,.16);drops.current.setMatrixAt(i,matrix);}drops.current.instanceMatrix.needsUpdate=true;
 });
 return <group name="faucet-water-flow"><mesh position={[0,.005,.16]}><cylinderGeometry args={[.003,.006,.37,12]}/><meshStandardMaterial color="#95ccde" transparent opacity={.38} depthWrite={false}/></mesh><instancedMesh ref={drops} args={[undefined,undefined,12]} frustumCulled={false}><sphereGeometry args={[.003,8,6]}/><meshStandardMaterial color="#bfe5ef" transparent opacity={.65} depthWrite={false}/></instancedMesh></group>;
}

export function FaucetAsset({running=false}:{running?:boolean}){
 return <group name="asset-faucet" userData={{assetId:'faucet',running}}>
  <mesh position={[0,.009,0]}><cylinderGeometry args={[.025,.029,.018,28]}/><meshStandardMaterial color="#a5bbc5" metalness={.6} roughness={.28}/></mesh>
  <Pipe points={[[0,.015,0],[0,.25,0],[0,.30,.035],[0,.29,.12],[0,.21,.16]]} radius={.012}/>
  <mesh position={[0,.205,.16]}><cylinderGeometry args={[.014,.014,.02,24,1,true]}/><meshStandardMaterial color="#b9cbd2" side={THREE.DoubleSide} metalness={.6} roughness={.24}/></mesh>
  <Ring radius={.0135} tube={.0018} at={[0,.195,.16]} color="#90a9b4"/>
  <Solid size={[.012,.014,.003]} at={[0,.105,.013]} color="#536e7e" rounded/>
  {running&&<WaterFlow/>}
 </group>;
}

export function SoapDispenserAsset(){
 return <group name="asset-soap-dispenser" userData={{assetId:'soap-dispenser'}}>
  <Solid size={[.13,.22,.09]} at={[0,.11,0]} color="#b8ccd0" roughness={.6} rounded/>
  <Solid size={[.14,.018,.10]} at={[0,.219,0]} color="#a0b9c4" rounded/>
  <Solid size={[.052,.09,.003]} at={[0,.13,.046]} color="#82b5c0" roughness={.3} rounded/>
  <Solid size={[.105,.04,.025]} at={[0,.032,.052]} color="#719ba9" rounded/>
  <AssetLabel lines={['XÀ PHÒNG']} size={[.1,.022]} at={[0,.191,.047]} paper={null}/>
  {[-.08,.08].map(y=><mesh key={y} position={[0,.11+y,-.049]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.004,.004,.006,12]}/><meshStandardMaterial color="#7e98a3"/></mesh>)}
 </group>;
}

export function PaperDispenserAsset(){
 const paper=useMemo(()=>{const g=new THREE.PlaneGeometry(.115,.13,12,8),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,.003*Math.cos(p.getX(i)*80)+.006*Math.sin((p.getY(i)+.065)*16));g.computeVertexNormals();return g;},[]);
 useEffect(()=>()=>paper.dispose(),[paper]);
 return <group name="asset-paper-dispenser" userData={{assetId:'paper-dispenser'}}>
  <Solid size={[.29,.30,.012]} at={[0,.23,-.06]} color="#c9d7d7" rounded/>
  {[-1,1].map(side=><Solid key={side} size={[.014,.30,.13]} at={[side*.138,.23,0]} color="#c2d1d4" rounded/>)}
  <Solid size={[.29,.014,.13]} at={[0,.373,0]} color="#c1d4d6" rounded/>
  <Solid size={[.276,.23,.014]} at={[0,.265,.07]} color="#dde4df" rounded/>
  <Solid size={[.276,.022,.016]} at={[0,.101,.07]} color="#aabfc6" rounded/>
  <mesh geometry={paper} position={[0,.065,.08]}><meshStandardMaterial color="#eeeede" roughness={.95} side={THREE.DoubleSide}/></mesh>
  <AssetLabel lines={['GIẤY LAU TAY']} size={[.22,.047]} at={[0,.29,.078]} paper={null}/>
  <Solid size={[.08,.018,.002]} at={[0,.21,.078]} color="#8ba8af" rounded/>
 </group>;
}

export function HandwashStationAsset({running=false}:{running?:boolean}){
 return <group name="asset-handwash-station" userData={{assetId:'handwash-station'}}>
  {[-.85,.85].flatMap(x=>[-.22,.22].map(z=><Solid key={`${x}/${z}`} size={[.065,.06,.065]} at={[x,.03,z]} color="#718b97"/>))}
  <Solid size={[1.96,.025,.57]} at={[0,.073,0]} color="#a5bbc4"/>
  <Solid size={[1.96,.78,.025]} at={[0,.47,-.282]} color="#b8c9ce"/>
  <Solid size={[1.96,.075,.024]} at={[0,.8375,.282]} color="#b8c9ce"/>
  {[-.98,.98].map(x=><Solid key={x} size={[.04,.78,.58]} at={[x,.47,0]} color="#bcccd0"/>)}
  <group position={[0,.875,0]}><CountertopAsset width={2} depth={.6} holes={[-.45,.45].map(x=>({x,z:0,width:.665,depth:.405,radius:.04}))}/></group>
  {[-.45,.45].map((x,i)=><group key={x}>
   <group position={[x,.694,0]} userData={i?undefined:{labItem:{title:'Bồn rửa tay trái',kind:'wash'}}}><SinkBasinAsset/></group>
   <group position={[x,.901,-.22]} userData={i?undefined:{labItem:{title:'Vòi nước cảm ứng',kind:'wash'}}}><FaucetAsset running={running}/></group>
   <Pipe points={[[x,.696,0],[x,.54,0],[x,.48,-.10],[x,.54,-.18],[x,.58,-.24]]} radius={.018} color="#8fa8b5"/>
   <Solid size={[.93,.68,.024]} at={[x,.45,.28]} color="#c7d4d7" rounded/>
   <Solid size={[.2,.02,.028]} at={[x,.68,.302]} color="#819eac" rounded/>
  </group>)}
  {[-.84,.84].map((x,i)=><group key={x} position={[x,1.2,-.23]} userData={i?undefined:{labItem:{title:'Bình xà phòng',kind:'wash'}}}><SoapDispenserAsset/></group>)}
  <group position={[0,1.35,-.22]} userData={{labItem:{title:'Hộp giấy lau tay',kind:'wash'}}}><PaperDispenserAsset/></group>
 </group>;
}

export function BenchSinkAsset(){return <group name="asset-bench-sink" userData={{assetId:'bench-sink'}}><group scale={[.5,.68,.75]}><SinkBasinAsset/></group><group position={[0,.141,-.11]} scale={.85}><FaucetAsset/></group></group>;}

export function HoodShellAsset(){
 return <group name="asset-hood-shell" userData={{assetId:'hood-shell'}}>
  <Solid size={[2.24,.12,.96]} at={[0,.06,0]} color="#748e9b"/>
  {[-1.16,1.16].map(x=><Solid key={x} size={[.08,2.48,1.1]} at={[x,1.36,0]} color="#bdccd0"/>)}
  <Solid size={[2.24,2.43,.055]} at={[0,1.335,-.5225]} color="#b5c9d0"/>
  <Solid size={[2.24,.045,.99]} at={[0,.825,0]} color="#a6bec7"/>
  <Solid size={[2.22,.025,.97]} at={[0,.8575,.015]} color="#4d646d" rounded/>
  {[-.56,.56].map(x=><group key={x}><Solid size={[1.075,.65,.025]} at={[x,.46,.525]} color="#c8d5d7" rounded/><Solid size={[.24,.028,.03]} at={[x,.64,.55]} color="#809eac" rounded/></group>)}
  <Solid size={[2.4,.31,1.1]} at={[0,2.445,0]} color="#c4d3d5"/>
  <Solid size={[2.13,.018,.05]} at={[0,.898,.52]} color="#78949f" rounded/>
  <AssetLabel lines={['CHEMDEX · FUME HOOD']} size={[1.05,.12]} at={[-.32,2.44,.553]} paper={null}/>
  <group name="hood-baffles">
   {[1.05,1.48,1.91].map(y=><Solid key={y} size={[2.1,.36,.018]} at={[0,y,-.442]} color="#9fb8c2"/>)}
   <InstancedBoxes color="#4c707e" parts={[1.265,1.695,2.125].map(y=>({at:[0,y,-.43],size:[2.04,.055,.006]}))}/>
  </group>
  {[-1.085,1.085].map(x=><group key={x}><Solid size={[.018,1.37,.045]} at={[x,1.585,.54]} color="#7996a2"/><Solid size={[.026,.012,.014]} at={[x,1.28,.571]} color="#b97660"/></group>)}
  <Solid size={[1.4,.025,.12]} at={[0,2.265,-.18]} color="#e6ede7" rounded/>
  <mesh position={[0,2.68,-.15]}><cylinderGeometry args={[.18,.18,.16,40,1,true]}/><meshStandardMaterial color="#9db4c0" side={THREE.DoubleSide} metalness={.5} roughness={.4}/></mesh>
  <Ring radius={.2} at={[0,2.603,-.15]} tube={.013}/><Ring radius={.18} at={[0,2.76,-.15]} tube={.006}/>
 </group>;
}

export function HoodSashAsset({height=.25,animate=false}:{height?:number;animate?:boolean}){
 const root=useRef<THREE.Group>(null),reduced=useReducedLabMotion(),target=1.35+THREE.MathUtils.clamp(height,0,1)*.5;
 const initialY=useRef(target);
 useFrame((_,dt)=>{if(root.current)root.current.position.y=animate&&!reduced?THREE.MathUtils.damp(root.current.position.y,target,8,Math.min(dt,.1)):target;});
 return <group ref={root} name="asset-hood-sash" position={[0,initialY.current,.55]} userData={{assetId:'hood-sash'}}>
  <mesh><boxGeometry args={[2.13,.72,.006]}/><GlassSurface opacity={.18}/></mesh>
  {[-1.075,1.075].map(x=><Solid key={x} size={[.018,.75,.025]} at={[x,0,0]} color="#849fab"/>)}
  {[-.368,.368].map(y=><Solid key={y} size={[2.16,.024,.025]} at={[0,y,0]} color="#9cb3bd" rounded/>)}
  <Solid size={[.48,.025,.045]} at={[0,-.34,.035]} color="#7897a5" rounded/>
  <AssetLabel lines={['SASH · MÔ PHỎNG']} size={[.35,.05]} at={[.75,.29,.006]} paper={null}/>
 </group>;
}

export function HoodMonitorAsset({alarm=false}:{alarm?:boolean}){
 return <group name="hood-airflow-monitor" position={[.77,2.44,.568]}>
  <Solid size={[.39,.215,.028]} color="#587783" rounded/>
  <AssetLabel lines={[alarm?'SIM · 42':'SIM · 100','AIRFLOW']} size={[.28,.11]} at={[0,.025,.016]} ink={alarm?'#e5bf9c':'#bad7c4'} paper="#36545a"/>
  {[-.075,0,.075].map((x,i)=><mesh key={x} position={[x,-.075,.019]}><sphereGeometry args={[.009,14,10]}/><meshStandardMaterial color={i===0?(alarm?'#bc7d64':'#8ab5a5'):'#92aeb7'}/></mesh>)}
 </group>;
}

export function FumeHoodAsset({height=.25}:{height?:number}){return <group name="asset-fume-hood" userData={{assetId:'fume-hood'}}><HoodShellAsset/><HoodSashAsset height={height}/><HoodMonitorAsset alarm={height>.55}/><group position={[0,.871,.02]}><BeakerAsset color="#c3af86" fill={.35}/></group></group>;}
