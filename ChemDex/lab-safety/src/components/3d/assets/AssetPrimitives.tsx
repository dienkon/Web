import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';

export type V3=[number,number,number];
export const ASSET_COLORS={steel:'#9eafb7',dark:'#344955',glass:'#cce7eb',rubber:'#3a4c56',ceramic:'#e5e7df',red:'#b65b51',teal:'#568f89'};

export function InstancedBoxes({parts,color,roughness=.7}:{parts:{at:V3;size:V3;rotation?:V3}[];color:string;roughness?:number}) {
 const mesh=useRef<THREE.InstancedMesh>(null),key=JSON.stringify(parts);
 useLayoutEffect(()=>{if(!mesh.current)return;const matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
  parts.forEach((part,i)=>{q.setFromEuler(new THREE.Euler(...(part.rotation??[0,0,0])));matrix.compose(new THREE.Vector3(...part.at),q,new THREE.Vector3(...part.size));mesh.current!.setMatrixAt(i,matrix);});
  mesh.current.instanceMatrix.needsUpdate=true;mesh.current.computeBoundingBox();mesh.current.computeBoundingSphere();
 },[key]);
 return <instancedMesh ref={mesh} args={[undefined,undefined,parts.length]}><boxGeometry args={[1,1,1]}/><meshStandardMaterial color={color} roughness={roughness}/></instancedMesh>;
}

export function Solid({size,at=[0,0,0],color='#c6d2d7',metal=.15,roughness=.5,rounded=false}:{size:V3;at?:V3;color?:string;metal?:number;roughness?:number;rounded?:boolean}) {
 const material=<meshStandardMaterial color={color} metalness={metal} roughness={roughness}/>;
 return rounded?<RoundedBox args={size} position={at} radius={Math.min(...size)*.18} smoothness={2} castShadow receiveShadow>{material}</RoundedBox>:<mesh position={at} castShadow receiveShadow><boxGeometry args={size}/>{material}</mesh>;
}

export function Pipe({points,radius=.006,color=ASSET_COLORS.steel,metal=.5}:{points:V3[];radius?:number;color?:string;metal?:number}) {
 const key=JSON.stringify(points);
 const curve=useMemo(()=>new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),[key]);
 return <mesh castShadow><tubeGeometry args={[curve,32,radius,8,false]}/><meshStandardMaterial color={color} roughness={metal>.3?.3:.75} metalness={metal}/></mesh>;
}

export function Ring({radius,tube=.002,at=[0,0,0],color=ASSET_COLORS.steel}:{radius:number;tube?:number;at?:V3;color?:string}) {
 return <mesh position={at} rotation={[Math.PI/2,0,0]}><torusGeometry args={[radius,tube,6,32]}/><meshStandardMaterial color={color} roughness={.3} metalness={.35}/></mesh>;
}

/** Reusable painted/printed plate. Textures are released when the asset unmounts. */
export function AssetLabel({lines,size,at=[0,0,0],ink='#34505c',paper='#f3f1e5',rotation=[0,0,0],hazard=false,curveRadius,curveSlope=0}:{lines:string[];size:[number,number];at?:V3;ink?:string;paper?:string|null;rotation?:V3;hazard?:boolean;curveRadius?:number;curveSlope?:number}) {
 const key=JSON.stringify([lines,ink,paper,hazard,size]);
 const texture=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=THREE.MathUtils.clamp(Math.round(512*size[1]/size[0]),24,1024);
  const c=canvas.getContext('2d')!;
  const h=canvas.height;
  if(paper){c.fillStyle=paper;c.fillRect(0,0,512,h);c.strokeStyle='#c4cbc4';c.lineWidth=2;c.strokeRect(2,2,508,h-4);}
  if(hazard){const r=Math.min(45,h*.13),y=h*.16;c.strokeStyle='#b7584c';c.lineWidth=Math.max(2,r*.12);c.beginPath();c.moveTo(256,y-r);c.lineTo(256+r,y);c.lineTo(256,y+r);c.lineTo(256-r,y);c.closePath();c.stroke();c.fillStyle=ink;c.font=`bold ${r*1.2}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText('!',256,y+1);}
  c.fillStyle=ink;c.textAlign='center';c.textBaseline='middle';
  const start=hazard?h*.34:h*.06,row=(h*.94-start)/Math.max(1,lines.length);
  lines.forEach((line,i)=>{let fontSize=Math.floor(row*(i===0?.68:.60));do{c.font=`${i===0?'600':'400'} ${fontSize--}px sans-serif`;}while(c.measureText(line).width>470&&fontSize>6);c.fillText(line,256,start+(i+.5)*row);});
  const value=new THREE.CanvasTexture(canvas);value.colorSpace=THREE.SRGBColorSpace;value.anisotropy=2;return value;
 },[key]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh position={at} rotation={rotation} renderOrder={3}>{curveRadius?<cylinderGeometry args={[curveRadius+curveSlope*size[1]/2,curveRadius-curveSlope*size[1]/2,size[1],32,1,true,-size[0]/curveRadius/2,size[0]/curveRadius]}/>:<planeGeometry args={size}/>}<meshStandardMaterial map={texture} transparent={!paper} depthWrite={!!paper} roughness={.8} side={THREE.DoubleSide}/></mesh>;
}

export function GlassSurface({opacity=.28}:{opacity?:number}) {
 return <meshPhysicalMaterial color={ASSET_COLORS.glass} transparent opacity={opacity} roughness={.16} clearcoat={.65} clearcoatRoughness={.14} metalness={0} side={THREE.DoubleSide} depthWrite={false}/>;
}

/** Closed cross-section runs around outer wall, lip, inner wall, then interior floor. */
export function LathedGlass({profile,spout=false,height=1}:{profile:[number,number][];spout?:boolean;height?:number}) {
 const key=JSON.stringify(profile);
 const geometry=useMemo(()=>{
  const g=new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),48);
  if(spout){const attr=g.attributes.position;for(let i=0;i<attr.count;i++){
   const x=attr.getX(i),y=attr.getY(i),z=attr.getZ(i),r=Math.hypot(x,z);
   const weight=Math.pow(Math.max(0,x/Math.max(r,.001)),18)*THREE.MathUtils.smoothstep(y,height-.025,height);
   attr.setXYZ(i,x+weight*.014,y+weight*.005,z);
  }g.computeVertexNormals();}
  return g;
 },[key,spout,height]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} renderOrder={2} castShadow><GlassSurface/></mesh>;
}

export function Graduations({radius,height,capacity,steps=5,base=.025}:{radius:number;height:number;capacity:number;steps?:number;base?:number}) {
 const texture=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;
  const c=canvas.getContext('2d')!;c.fillStyle='#335c6d';c.strokeStyle='#335c6d';c.lineWidth=3;c.font='30px monospace';
  for(let i=1;i<=steps*2;i++){const y=486-i*450/(steps*2+1);c.fillRect(i%2?145:115,y,i%2?78:108,3);if(i%2===0)c.fillText(String(Math.round(capacity*i/(steps*2))),10,y+8);}
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
 },[capacity,steps]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh position={[0,base+height/2,0]} renderOrder={4}><cylinderGeometry args={[radius+.001,radius+.001,height,24,1,true,-.65,1.3]}/><meshStandardMaterial map={texture} transparent depthWrite={false} side={THREE.DoubleSide} roughness={.8}/></mesh>;
}

export function Liquid({radius,height,at=.005,color='#88bac5',bottomRadius=radius,profile}:{radius:number;height:number;at?:number;color?:string;bottomRadius?:number;profile?:[number,number][]}) {
 if(height<=0)return null;
 return <group>
  <mesh position={profile?[0,0,0]:[0,at+height/2,0]} renderOrder={1}>{profile?<latheGeometry args={[profile.map(p=>new THREE.Vector2(...p)),40]}/>:<cylinderGeometry args={[radius,bottomRadius,height,40]}/>}<meshStandardMaterial color={color} transparent opacity={.68} roughness={.23} depthWrite={false}/></mesh>
  <mesh position={[0,at+height+.0004,0]} rotation={[-Math.PI/2,0,0]} renderOrder={1}><circleGeometry args={[radius,40]}/><meshStandardMaterial color={color} roughness={.18} transparent opacity={.75} depthWrite={false}/></mesh>
  <Ring radius={radius-.0015} tube={.0012} at={[0,at+height+.001,0]} color="#cee6e8"/>
 </group>;
}
