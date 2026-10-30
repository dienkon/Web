import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ASSET_COLORS as C, AssetLabel, GlassSurface, Graduations, InstancedBoxes, LathedGlass, Liquid, Pipe, Ring, Solid } from './AssetPrimitives';

export function BeakerAsset({color='#84b7c3',fill=.42,cracked=false}:{color?:string;fill?:number;cracked?:boolean}) {
 const fracture=useMemo(()=>new THREE.CatmullRomCurve3([[-.023,.012,.077],[.005,.047,.078],[-.014,.075,.079],[.017,.102,.08],[.008,.132,.08]].map(p=>new THREE.Vector3(...p))),[]);
 return <group name="asset-beaker" userData={{assetId:'beaker'}}>
  <LathedGlass height={.22} spout profile={[[0,0],[.071,0],[.077,.006],[.079,.02],[.083,.215],[.084,.22],[.079,.22],[.076,.018],[.07,.005],[0,.005]]}/>
  <Liquid radius={.075} bottomRadius={.073} height={Math.max(0,Math.min(.8,fill))*.2} color={color}/>
  <Graduations radius={.082} height={.15} capacity={250}/>
  <AssetLabel lines={['250 mL','BORO · APPROX.']} size={[.075,.026]} at={[0,.195,0]} curveRadius={.0833} curveSlope={.02} paper={null}/>
  {cracked&&<mesh><tubeGeometry args={[fracture,18,.0011,5,false]}/><meshStandardMaterial color="#a76b5e" roughness={.65}/></mesh>}
 </group>;
}

export function CylinderAsset({fill=.5,color='#87bdca'}:{fill?:number;color?:string}) {
 return <group name="asset-cylinder" userData={{assetId:'cylinder'}}>
  <mesh position={[0,.008,0]}><cylinderGeometry args={[.066,.071,.016,6]}/><meshStandardMaterial color="#b8cbd4" roughness={.45}/></mesh>
  <LathedGlass height={.38} spout profile={[[0,.016],[.031,.016],[.035,.024],[.036,.37],[.039,.38],[.034,.38],[.032,.03],[0,.024]]}/>
  <Liquid radius={.031} height={Math.min(.9,Math.max(0,fill))*.32} at={.025} color={color}/>
  <Graduations radius={.036} height={.29} capacity={100} steps={5} base={.05}/>
  <AssetLabel lines={['100 mL','20 °C']} size={[.045,.022]} at={[0,.356,0]} curveRadius={.037} paper={null}/>
 </group>;
}

export function FlaskAsset({vacuum=false,color='#93bac2',fill=.35}:{vacuum?:boolean;color?:string;fill?:number}) {
 const h=.26,liquidH=.13*Math.max(0,Math.min(.95,fill)),top=.015+liquidH;
 const r=(top<=.04?THREE.MathUtils.lerp(.084,.08,(top-.015)/.025):THREE.MathUtils.lerp(.08,.027,(top-.04)/.15))-.0005;
 const liquidProfile:[number,number][]=[[0,.015],[.0835,.015],...(top>.04?[[.0795,.04] as [number,number]]:[]),[r,top],[0,top]];
 return <group name={vacuum?'asset-vacuum-flask':'asset-flask'} userData={{assetId:vacuum?'vacuum-flask':'flask'}}>
  <LathedGlass profile={[[0,0],[.075,0],[.089,.006],[.09,.02],[.085,.045],[.032,.188],[.027,.205],[.027,.252],[.031,h],[.022,h],[.022,.205],[.027,.19],[.08,.04],[.084,.015],[.074,.006],[0,.006]]}/>
  <Liquid radius={r} bottomRadius={.0835} height={liquidH} at={.015} color={color} profile={liquidProfile}/>
  <AssetLabel lines={['250 mL','BORO']} size={[.068,.03]} at={[0,.078,0]} curveRadius={.0735} curveSlope={-.37} paper={null}/>
  <Ring radius={.027} at={[0,.256,0]} tube={.002} color="#b8d4da"/>
  {vacuum&&<group position={[.029,.176,0]} rotation={[0,0,-Math.PI/2]}>
   <LathedGlass profile={[[.01,0],[.011,.055],[.013,.06],[.008,.06],[.007,0]]}/>
   {[.039,.049].map(y=><Ring key={y} radius={.011} at={[0,y,0]} tube={.0017}/>)}
  </group>}
 </group>;
}

export function ReagentBottleAsset({amber=false,color='#b9bf91',unlabelled=false,cap=true}:{amber?:boolean;color?:string;unlabelled?:boolean;cap?:boolean}) {
 return <group name={amber?'asset-amber-bottle':'asset-reagent-bottle'} userData={{assetId:amber?'amber-bottle':'reagent-bottle'}}>
  <LathedGlass profile={[[0,0],[.055,0],[.065,.006],[.068,.02],[.068,.205],[.065,.225],[.045,.25],[.028,.265],[.028,.295],[.022,.295],[.022,.267],[.04,.25],[.061,.224],[.063,.02],[.055,.006],[0,.006]]}/>
  {amber&&<mesh position={[0,.116,0]} renderOrder={2}><cylinderGeometry args={[.066,.066,.21,40,1,true]}/><meshStandardMaterial color="#aa7749" transparent opacity={.48} roughness={.28} depthWrite={false}/></mesh>}
  <Liquid radius={.062} height={.11} at={.008} color={color}/>
  <Ring radius={.028} at={[0,.275,0]} tube={.0025}/><Ring radius={.028} at={[0,.285,0]} tube={.0025}/>
  {cap&&<group name="bottle-cap" position={[0,.292,0]}>
   <mesh position={[0,.014,0]}><cylinderGeometry args={[.032,.032,.028,24]}/><meshStandardMaterial color="#536a70" roughness={.7}/></mesh>
   <InstancedBoxes color="#829593" parts={Array.from({length:16},(_,i)=>{const a=i/16*Math.PI*2;return {at:[Math.sin(a)*.032,.014,Math.cos(a)*.032],size:[.002,.02,.002]};})}/>
  </group>}
  {!unlabelled&&<AssetLabel lines={['MẪU LAB','MẪU HUẤN LUYỆN','LÔ · 01']} size={[.084,.092]} at={[0,.135,0]} curveRadius={.0688} hazard/>}
 </group>;
}

export function TestTubeAsset({color='#8bbfbd',cap=true}:{color?:string;cap?:boolean}) {
 const profile:[number,number][]=[[0,0],[.009,.002],[.016,.008],[.02,.02],[.021,.035],[.021,.235],[.023,.24],[.018,.24],[.017,.036],[.014,.019],[.008,.011],[0,.009]];
 return <group name="asset-test-tube" userData={{assetId:'test-tube'}}>
  <LathedGlass profile={profile}/><Liquid radius={.016} bottomRadius={.01} height={.08} at={.015} color={color}/>
  {cap&&<mesh position={[0,.248,0]}><cylinderGeometry args={[.026,.025,.024,24]}/><meshStandardMaterial color="#887998" roughness={.7}/></mesh>}
  <AssetLabel lines={['A · 01']} size={[.026,.04]} at={[0,.155,0]} curveRadius={.0217}/>
  <Ring radius={.021} at={[0,.231,0]} tube={.0015} color="#e3f1ef"/>
 </group>;
}

export function PipetteBulbAsset(){
 return <group name="asset-pipette-bulb" userData={{assetId:'pipette-bulb'}}>
  <mesh position={[0,.06,0]} scale={[1,1.35,1]}><sphereGeometry args={[.031,24,16]}/><meshStandardMaterial color="#b96863" roughness={.85}/></mesh>
  <mesh position={[0,.012,0]}><cylinderGeometry args={[.012,.012,.024,16]}/><meshStandardMaterial color="#a65c57" roughness={.8}/></mesh>
  <Ring radius={.012} tube={.002} at={[0,.004,0]} color="#d88a7e"/>
  {[[0,.105,0],[.037,.06,0],[0,.06,.036]].map((p,i)=><group key={i} position={p as [number,number,number]}>
   <mesh><sphereGeometry args={[.009,12,10]}/><meshStandardMaterial color="#8e5554" roughness={.7}/></mesh>
   <AssetLabel lines={[[ 'A','S','E'][i]]} size={[.009,.009]} at={[0,0,.0095]} ink="#ffe6d6" paper={null}/>
  </group>)}
 </group>;
}

export function PipetteAsset({bulb=false}:{bulb?:boolean}) {
 return <group name="asset-pipette" userData={{assetId:'pipette'}}>
  <LathedGlass profile={[[.001,0],[.002,.017],[.005,.043],[.005,.315],[.006,.32],[.003,.32],[.003,.044],[.001,.015]]}/>
  <InstancedBoxes color="#4c7f8d" parts={[.07,.09,.11,.13,.15,.17,.19,.21,.23,.25,.27,.29].map((y,i)=>({at:[0,y,.0055],size:[i%5===0?.007:.004,.001,.001]}))}/>
  {bulb&&<group position={[0,.313,0]}><PipetteBulbAsset/></group>}
 </group>;
}

/** Actual holes cut out of the upper plate, rather than tubes crossing a solid box. */
export function TubeRackAsset(){
 const shape=useMemo(()=>{
  const s=new THREE.Shape();s.moveTo(-.24,-.08);s.lineTo(.24,-.08);s.lineTo(.24,.08);s.lineTo(-.24,.08);s.closePath();
  [-.17,-.056,.056,.17].forEach(x=>{const hole=new THREE.Path();hole.absarc(x,0,.026,0,Math.PI*2,true);s.holes.push(hole);});return s;
 },[]);
 return <group name="asset-tube-rack" userData={{assetId:'tube-rack'}}>
  <Solid size={[.5,.024,.18]} at={[0,.012,0]} rounded/>
  {[-.225,.225].map(x=><Solid key={x} size={[.024,.18,.16]} at={[x,.102,0]} color="#a0b5bf" rounded/>)}
  <mesh name="rack-perforated-plate" position={[0,.184,0]} rotation={[-Math.PI/2,0,0]}><extrudeGeometry args={[shape,{depth:.014,bevelEnabled:true,bevelSize:.001,bevelThickness:.001,bevelSegments:1,steps:1,curveSegments:24}]}/><meshStandardMaterial color="#c8d8de" metalness={.35} roughness={.4}/></mesh>
  {[-.17,-.056,.056,.17].map((x,i)=><group key={x} position={[x,.024,0]}>
   <Ring radius={.023} at={[0,.003,0]} tube={.0025} color="#829da3"/>
   <TestTubeAsset color={['#87bcc6','#c3ad75','#af9cbb','#8fbaa7'][i]}/>
  </group>)}
  <AssetLabel lines={['A · 1 — 4']} size={[.055,.016]} at={[-.18,.012,.091]}/>
 </group>;
}

export function TongsAsset(){
 return <group name="asset-tongs" userData={{assetId:'tongs'}}>
  {[-1,1].map(side=><group key={side} rotation={[0,side*.09,0]}>
   <Pipe points={[[side*.013,.008,-.12],[side*.018,.008,-.04],[side*.043,.008,.07],[side*.042,.008,.115]]} radius={.0035}/>
   <Pipe points={[[side*.042,.008,.115],[side*.03,.008,.125],[side*.018,.008,.115]]} radius={.006} color="#6d8c91" metal={.05}/>
   <mesh position={[side*.025,.008,-.118]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.018,.003,6,24]}/><meshStandardMaterial color={C.steel} metalness={.65} roughness={.3}/></mesh>
  </group>)}
  <mesh position={[0,.008,-.055]}><cylinderGeometry args={[.007,.007,.012,16]}/><meshStandardMaterial color="#b7c5c9" metalness={.65}/></mesh>
 </group>;
}

export function WashBottleAsset(){
 return <group name="asset-wash-bottle" userData={{assetId:'wash-bottle'}}>
  <LathedGlass profile={[[0,0],[.05,0],[.06,.008],[.061,.15],[.054,.18],[.032,.194],[.03,.22],[.024,.22],[.026,.196],[.048,.179],[.055,.15],[.054,.01],[0,.006]]}/>
  <Liquid radius={.053} height={.09} color="#b9d4dd"/>
  <mesh position={[0,.224,0]}><cylinderGeometry args={[.034,.034,.022,24]}/><meshStandardMaterial color="#71a6b7" roughness={.65}/></mesh>
  <Pipe points={[[0,.018,0],[0,.22,0],[0,.285,0],[.025,.31,0],[.095,.3,0],[.117,.267,0]]} radius={.006} color="#cbdce0" metal={0}/>
  <AssetLabel lines={['NƯỚC RỬA','MẪU HUẤN LUYỆN']} size={[.08,.075]} at={[0,.115,0]} curveRadius={.0615}/>
 </group>;
}

export function PipetteTrayAsset(){
 return <group name="asset-pipette-tray" userData={{assetId:'pipette-tray'}}>
  <Solid size={[.44,.008,.19]} at={[0,.004,0]} color="#c3d4d8" rounded/>
  {[-1,1].map(side=><React.Fragment key={side}><Solid size={[.44,.014,.008]} at={[0,.014,side*.091]} color="#9eb7c0"/><Solid size={[.008,.014,.18]} at={[side*.216,.014,0]} color="#9eb7c0"/></React.Fragment>)}
  {[-.13,.13].map(x=><Solid key={x} size={[.018,.018,.16]} at={[x,.017,0]} color="#8ca9b4"/>)}
  {[-.05,0,.05].map(z=><group key={z} position={[-.16,.032,z]} rotation={[0,0,-Math.PI/2]}><PipetteAsset/></group>)}
 </group>;
}
