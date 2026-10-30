import React,{useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {GlassSurface,Pipe} from './AssetPrimitives';
import {WARDROBE as W} from './wardrobe';
import {useBakedGeometry,boxPart,tubePart,type BakedPart} from './BakedParts';

function roundRect(x:number,y:number,w:number,h:number,r:number){
 const p=new THREE.Shape();p.moveTo(x+r,y);p.lineTo(x+w-r,y);p.quadraticCurveTo(x+w,y,x+w,y+r);p.lineTo(x+w,y+h-r);p.quadraticCurveTo(x+w,y+h,x+w-r,y+h);p.lineTo(x+r,y+h);p.quadraticCurveTo(x,y+h,x,y+h-r);p.lineTo(x,y+r);p.quadraticCurveTo(x,y,x+r,y);return p;
}
function bendLens(g:THREE.BufferGeometry,wrap:number){const p=g.attributes.position;for(let i=0;i<p.count;i++){const n=p.getX(i)/.12;p.setZ(i,p.getZ(i)+.015*(1-n*n)-wrap*n*n);}g.computeVertexNormals();return g;}

export function GogglesAsset({strapDepth=.13,name='asset-goggles',wrapDepth=0}:{strapDepth?:number;name?:string;wrapDepth?:number}){
 const geometries=useMemo(()=>{
  const frame=new THREE.Shape();frame.moveTo(-.112,0);frame.lineTo(-.02,0);frame.quadraticCurveTo(-.015,.012,-.007,.02);frame.lineTo(.007,.02);frame.quadraticCurveTo(.015,.012,.02,0);frame.lineTo(.112,0);frame.quadraticCurveTo(.12,0,.12,.01);frame.lineTo(.12,.057);frame.quadraticCurveTo(.12,.077,.095,.084);frame.quadraticCurveTo(0,.1,-.095,.084);frame.quadraticCurveTo(-.12,.077,-.12,.057);frame.lineTo(-.12,.01);frame.quadraticCurveTo(-.12,0,-.112,0);
  const left=roundRect(-.104,.016,.09,.056,.009),right=roundRect(.014,.016,.09,.056,.009);frame.holes.push(left,right);
  return {frame:bendLens(new THREE.ExtrudeGeometry(frame,{depth:.013,bevelEnabled:true,bevelSize:.001,bevelThickness:.001,bevelSegments:2,curveSegments:16}),wrapDepth),gasket:bendLens(new THREE.ExtrudeGeometry(frame,{depth:.006,bevelEnabled:false,curveSegments:16}),wrapDepth),lenses:bendLens(new THREE.ShapeGeometry([left,right],24),wrapDepth)};
 },[wrapDepth]);
 useEffect(()=>()=>{geometries.frame.dispose();geometries.gasket.dispose();geometries.lenses.dispose();},[geometries]);
 const wrap=wrapDepth*Math.pow(.116/.12,2),worn=wrapDepth>.04;
 const details=useBakedGeometry(()=>{
  const parts:BakedPart[]=[];
  for(const side of [-1,1]){
   parts.push(boxPart([side*.116,.045,-.006-wrap],[.016,.022,.018],'#5d8791'));
   for(const y of [.035,.043,.051])parts.push(boxPart([side*.118,y,.004-wrap],[.009,.0015,.002],'#3b6571'));
  }
  parts.push(boxPart([0,worn?.075:.045,-strapDepth-.002],[.028,.016,.009],'#728c96'));return parts;
 },[wrap,worn,strapDepth]);
 return <group name={name} userData={{assetId:'goggles',wardrobe:{frame:W.goggles,gasket:W.gasket,wrapDepth}}}>
  <mesh geometry={geometries.frame} castShadow><meshStandardMaterial color={W.goggles} roughness={.5}/></mesh>
  <mesh geometry={geometries.gasket} position={[0,0,-.01]}><meshStandardMaterial color={W.gasket} roughness={.9}/></mesh>
  <mesh geometry={geometries.lenses} position={[0,0,.006]} renderOrder={2}><GlassSurface opacity={.2}/></mesh>
  <mesh geometry={details}><meshStandardMaterial vertexColors roughness={.72}/></mesh>
  {[-.003,.003].map(dy=><Pipe key={dy} points={[[-.116,.045+dy,-.01-wrap],[-(worn?.155:.13),(worn?.075:.045)+dy,-strapDepth*.50],[0,(worn?.075:.045)+dy,-strapDepth],[(worn?.155:.13),(worn?.075:.045)+dy,-strapDepth*.50],[.116,.045+dy,-.01-wrap]]} radius={.0035} color={W.strap} metal={0}/>)}
  {[-1,1].map(side=><object3D key={side} name={`wardrobe-goggle-temple-${side}`} position={[side*.116,.045,-.01-wrap]}/>)}
 </group>;
}

export function MaskAsset({earDepth=.024,name='asset-mask',wrapDepth=0,earLift=.02}:{earDepth?:number;name?:string;wrapDepth?:number;earLift?:number}){
 const z=(x:number,base:number)=>base-wrapDepth*Math.pow(x/.085,2);
 const geometry=useMemo(()=>{
  const g=new THREE.PlaneGeometry(.17,.086,32,12),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,.013*Math.cos(x/.085*Math.PI/2)+.0016*Math.sin(y/.086*Math.PI*6)-wrapDepth*Math.pow(x/.085,2));}g.computeVertexNormals();return g;
 },[wrapDepth]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const trim=useBakedGeometry(()=>{
  const parts:BakedPart[]=[];
  for(const y of [-.028,0,.028])parts.push(tubePart([[-.083,y,z(-.083,.002)],[0,y,.0168],[.083,y,z(.083,.002)]],.0012,W.maskEdge));
  for(const side of [-1,1]){
   parts.push(tubePart([[side*.084,-.042,z(.084,.002)],[side*.084,0,z(.084,.002)],[side*.084,.042,z(.084,.002)]],.0018,W.maskEdge));
   parts.push(tubePart([[side*.085,.031,-wrapDepth],[side*.12,earLift,-earDepth*.90],[side*.125,earLift-.028,-earDepth],[side*.085,-.032,-wrapDepth]],.0018,'#d4e3de'));
  }
  for(const y of [-.042,.042])parts.push(tubePart([[-.081,y,z(-.081,.003)],[0,y,.016],[.081,y,z(.081,.003)]],.0015,W.maskEdge));
  parts.push(tubePart([[-.031,.036,z(-.031,.015)],[0,.038,.018],[.031,.036,z(.031,.015)]],.0013,'#77979d'));
  return parts;
 },[wrapDepth,earDepth,earLift]);
 return <group name={name} userData={{assetId:'mask',wardrobe:{fabric:W.mask,wrapDepth,earDepth,earLift}}} position={[0,.045,0]}>
  <mesh geometry={geometry}><meshStandardMaterial color={W.mask} roughness={.95} side={THREE.DoubleSide}/></mesh>
  <mesh geometry={trim}><meshStandardMaterial vertexColors roughness={.95}/></mesh>
  {[-1,1].map(side=><React.Fragment key={side}>
   <object3D name={`wardrobe-mask-cheek-${side}`} position={[side*.085,0,-wrapDepth]}/>
   <object3D name={`wardrobe-mask-ear-${side}`} position={[side*.1225,earLift-.014,-earDepth*.95]}/>
  </React.Fragment>)}
 </group>;
}
