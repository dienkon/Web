import React from 'react';
import * as THREE from 'three';
import {WARDROBE as W} from './wardrobe';
import {useBakedGeometry,spherePart,capsulePart,tubePart,type BakedPart} from './BakedParts';

/** Local +Y is the wrist, -Y the fingers and +Z the back of the hand.
 * Mirror the anatomy in the geometry, never with a negative object scale. */
export function GripHandAsset({color=W.glove,left=false,centered=false,gloved=true,pose='grip'}:{color?:string;left?:boolean;centered?:boolean;gloved?:boolean;pose?:'grip'|'relaxed'}){
 const side=left?-1:1;
 const geometry=useBakedGeometry(()=>{
  const parts:BakedPart[]=[
   spherePart([0,0,0],[.032,.035,.021],color,20),
   spherePart([0,.029,0],[.022,.023,.018],color,16),
  ];
  // Index to little finger: keep the shorter little finger opposite the thumb.
  [.003,0,.002,.01].forEach((shortened,i)=>{
   const x=side*(.022-i*.0145);
   if(pose==='grip'){
    parts.push(capsulePart([x,-.029+shortened,-.009],.0075,.02,color,[.75,0,0]));
    parts.push(capsulePart([x,-.039+shortened,-.026],.007,.015,color,[1.65,0,0]));
    parts.push(capsulePart([x,-.031+shortened,-.041],.0065,.012,color,[2.6,0,0]));
   }else{
    parts.push(capsulePart([x,-.034+shortened,-.002],.0075,.027,color,[.1,0,side*(i-1.5)*.025]));
    parts.push(capsulePart([x,-.060+shortened,-.005],.007,.019,color,[.05,0,side*(i-1.5)*.035]));
    if(!gloved)parts.push(spherePart([x,-.062+shortened,.0005],[.0046,.008,.0018],'#d9b9a4',8));
   }
  });
  parts.push(spherePart([side*.025,.005,-.006],[.013,.022,.015],color,12));
  parts.push(capsulePart([side*(pose==='grip'?.028:.036),-.01,pose==='grip'?-.027:-.004],.009,.026,color,[pose==='grip'?.7:.1,0,side*(pose==='grip'?-.7:.5)]));
  if(gloved){
   parts.push(tubePart([[-.022,.023,.012],[0,.028,.021],[.022,.023,.012]],.0008,W.gloveFold));
   parts.push(tubePart([[-.02,.017,.016],[0,.022,.023],[.02,.017,.016]],.0006,W.gloveFold));
  }else parts.push(tubePart([[-.021,-.004,-.019],[0,-.009,-.022],[.021,-.004,-.019]],.0006,'#bb8f79'));
  return parts;
 },[color,side,pose,gloved]);
 return <group name="asset-grip-hand" userData={{assetId:'grip-hand',wardrobe:{gloved,color,pose,left}}} position={[0,centered?0:.042,0]}>
  <mesh geometry={geometry}><meshStandardMaterial vertexColors roughness={gloved?.76:.84}/></mesh>
  <object3D name="hand-wrist" position={[0,.035,0]}/>
  <object3D name="hand-thumb" position={[side*(pose==='grip'?.028:.036),-.01,pose==='grip'?-.027:-.004]}/>
  <object3D name="hand-fingers" position={[side*.0075,pose==='grip'?-.039:-.069,pose==='grip'?-.026:-.005]}/>
 </group>;
}

function coatRadius(y:number){return y<.8?.207:y<1.17?.202:y<1.3?THREE.MathUtils.lerp(.202,.189,(y-1.17)/.13):THREE.MathUtils.lerp(.189,.065,Math.min(1,(y-1.3)/.08));}
function surfaceZ(x:number,y:number){const r=coatRadius(y);return Math.sqrt(Math.max(.0001,r*r-x*x))*.66+.004;}
function coatShell(){
 const rows=[.7,.715,.78,.88,.98,1.08,1.16,1.22,1.28,1.33,1.37],columns=48,n=(columns+1)*rows.length;
 const positions:number[]=[],indices:number[]=[],boundary=new Map<string,[number,number]>();
 for(let layer=0;layer<2;layer++)for(const row of rows)for(let j=0;j<=columns;j++){
  const opening=.005+.065*THREE.MathUtils.smoothstep(row,1.14,1.28),theta=opening+j/columns*(Math.PI*2-opening*2),front=Math.max(0,Math.cos(theta));
  const top=1.35-.145*Math.pow(front,4),y=row<=1.16?row:1.16+(row-1.16)/.21*(top-1.16),r=coatRadius(y);
  positions.push(Math.sin(theta)*(r-layer*.003),y,Math.cos(theta)*(r*.66-layer*.003));
 }
 const edge=(a:number,b:number)=>{const key=a<b?`${a}/${b}`:`${b}/${a}`;if(boundary.has(key))boundary.delete(key);else boundary.set(key,[a,b]);};
 for(let i=0;i<rows.length-1;i++)for(let j=0;j<columns;j++){
  const theta=.07+(j+.5)/columns*(Math.PI*2-.14);
  if(rows[i]>1.16&&Math.abs(Math.sin(theta))>.945)continue;
  const a=i*(columns+1)+j,b=a+columns+1,c=b+1,d=a+1;
  indices.push(a,d,b,d,c,b,a+n,b+n,d+n,d+n,b+n,c+n);edge(a,d);edge(d,c);edge(c,b);edge(b,a);
 }
 for(const [a,b]of boundary.values())indices.push(a,a+n,b,b,a+n,b+n);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function curvedPatch(x:number,y:number,width:number,height:number){
 const g=new THREE.PlaneGeometry(width,height,8,4),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const px=p.getX(i)+x,py=p.getY(i)+y;p.setXYZ(i,px,py,surfaceZ(px,py)+.001);}g.computeVertexNormals();return g;
}
export function WornCoatAsset({color=W.coat,shirt='#87adb0'}:{color?:string;shirt?:string}){
 const geometry=useBakedGeometry(()=>{
  const parts:BakedPart[]=[{geometry:coatShell(),color},spherePart([0,1.15,0],[.168,.24,.095],shirt,24),spherePart([0,.83,0],[.171,.09,.106],W.trousers,20)];
  for(const side of [-1,1]){
   const lapel=new THREE.Shape();lapel.moveTo(side*.035,1.37);lapel.lineTo(side*.145,1.275);lapel.lineTo(side*.09,1.14);lapel.lineTo(side*.025,1.23);lapel.closePath();
   const g=new THREE.ShapeGeometry(lapel,16),p=g.attributes.position;
   for(let i=0;i<p.count;i++)p.setZ(i,surfaceZ(p.getX(i),p.getY(i))+.005);g.computeVertexNormals();parts.push({geometry:g,color:W.lapel});
   parts.push({geometry:curvedPatch(side*.115,.89,.082,.09),color:W.pocket});
   parts.push(tubePart([[side*.075,.935,surfaceZ(.075,.935)+.003],[side*.115,.935,surfaceZ(.115,.935)+.003],[side*.155,.935,surfaceZ(.155,.935)+.003]],.001,W.seam));
   parts.push(tubePart([[side*.15,1.27,surfaceZ(.15,1.27)+.004],[side*.093,1.15,surfaceZ(.093,1.15)+.006]],.001,W.seam));
  }
  parts.push({geometry:curvedPatch(.105,1.16,.06,.06),color:W.pocket});
  parts.push({geometry:curvedPatch(.008,.975,.030,.43),color});
  parts.push(tubePart([[-.008,.76,surfaceZ(-.008,.76)+.002],[-.008,.98,surfaceZ(-.008,.98)+.002],[-.008,1.18,surfaceZ(-.008,1.18)+.002]],.0008,W.seam));
  parts.push(tubePart([[.075,1.19,surfaceZ(.075,1.19)+.003],[.105,1.19,surfaceZ(.105,1.19)+.003],[.135,1.19,surfaceZ(.135,1.19)+.003]],.001,W.seam));
  for(const y of [.78,.86,.94,1.02,1.10,1.18])parts.push(spherePart([.022,y,surfaceZ(.022,y)+.003],[.0045,.0045,.002],W.button,10));
  parts.push(tubePart([[0,.715,-.139],[0,1.07,-.138],[0,1.31,-.114]],.001,W.seam));
  const hem=Array.from({length:49},(_,i)=>{const a=.09+i/48*(Math.PI*2-.18);return [Math.sin(a)*.208,.712,Math.cos(a)*.138] as [number,number,number];});parts.push(tubePart(hem,.0009,W.seam));
  return parts;
 },[color,shirt]);
 return <group name="asset-worn-coat" userData={{assetId:'worn-coat',wardrobe:{fabric:color,buttons:6,pockets:3,fastened:true}}}><mesh geometry={geometry} castShadow><meshStandardMaterial vertexColors roughness={.94} side={THREE.DoubleSide}/></mesh></group>;
}
