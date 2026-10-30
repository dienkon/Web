import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { AssetLabel, InstancedBoxes, Pipe, Ring, Solid } from './AssetPrimitives';
import { CountertopAsset, roundedOpening } from './StationAssets';

function Turned({profile,color}:{profile:[number,number][];color:string}){
 const key=JSON.stringify(profile),points=useMemo(()=>[...profile,profile[0]].map(p=>new THREE.Vector2(...p)),[key]);
 return <mesh castShadow receiveShadow><latheGeometry args={[points,40]}/><meshStandardMaterial color={color} roughness={.65} side={THREE.DoubleSide}/></mesh>;
}

export function PedalBinAsset({open=false,domestic=false}:{open?:boolean;domestic?:boolean}){
 const color=domestic?'#78a598':'#c4ab70';
 return <group name={domestic?'asset-domestic-bin':'asset-chemical-bin'} userData={{assetId:domestic?'domestic-bin':'chemical-bin'}}>
  <Turned color="#758c91" profile={[[0,0],[.204,0],[.216,.015],[.216,.04],[0,.04]]}/>
  <Turned color={color} profile={[[0,.035],[.205,.035],[.23,.58],[.234,.63],[.227,.642],[.218,.635],[.215,.58],[.19,.055],[0,.055]]}/>
  <group position={[0,.647,-.224]} rotation={[open?-1.1:0,0,0]} name="waste-lid-hinge">
   <group position={[0,0,.224]}><Turned color={color} profile={[[0,0],[.235,0],[.24,.008],[.237,.021],[.215,.03],[0,.03]]}/><Solid size={[.095,.017,.025]} at={[0,.037,0]} color="#728d95" rounded/></group>
  </group>
  <Pipe points={[[.13,.07,-.224],[.13,.61,-.224],[.09,.65,-.224]]} radius={.005} color="#93aab4"/>
  <Solid size={[.12,.016,.10]} at={[0,open?.024:.04,.245]} color="#5c7886" rounded/>
  <AssetLabel lines={[domestic?'GIẤY SẠCH':'RẮN NHIỄM HÓA CHẤT','MẪU HUẤN LUYỆN','ĐỌC NHÃN TRƯỚC KHI BỎ']} size={[.30,.22]} at={[0,.37,0]} curveRadius={.2215} curveSlope={.046} paper="#e5e3d5"/>
 </group>;
}

export function LiquidWasteAsset({open=false}:{open?:boolean}){
 const handle=useMemo(()=>{const s=roundedOpening(0,0,.13,.14,.025);s.holes.push(roundedOpening(0,0,.082,.093,.013));return s;},[]);
 return <group name="asset-liquid-waste" userData={{assetId:'liquid-waste'}}>
  <Turned color="#7b9eaf" profile={[[0,0],[.18,0],[.206,.025],[.206,.42],[.19,.49],[.085,.56],[.06,.58],[.06,.62],[.048,.62],[.048,.578],[.077,.55],[.177,.482],[.192,.42],[.192,.03],[.178,.015],[0,.015]]}/>
  {[.045,.395].map(y=><Ring key={y} radius={.206} tube={.006} at={[0,y,0]} color="#668996"/>)}
  <mesh position={[.17,.5,-.018]} rotation={[0,0,-.3]}><extrudeGeometry args={[handle,{depth:.036,bevelEnabled:false,curveSegments:12}]}/><meshStandardMaterial color="#7b9eaf" roughness={.65}/></mesh>
  <Turned color="#b9a772" profile={[[.045,.61],[.052,.62],[.052,.65],[.11,.747],[.115,.76],[.107,.76],[.101,.745],[.035,.65],[.035,.61]]}/>
  <group position={[0,.764,-.11]} rotation={[open?-1.3:0,0,0]}><group position={[0,0,.11]}><mesh position={[0,.006,0]}><cylinderGeometry args={[.118,.118,.012,40]}/><meshStandardMaterial color="#bda974" roughness={.6}/></mesh><Solid size={[.06,.013,.018]} at={[0,.016,0]} color="#748f98" rounded/></group></group>
  <AssetLabel lines={['CHẤT THẢI LỎNG','MẪU HUẤN LUYỆN','NHÓM: ______','NGÀY: ______']} size={[.28,.26]} at={[0,.25,0]} curveRadius={.207} paper="#e5e5d5"/>
 </group>;
}

export function GlassWasteAsset(){
 return <group name="asset-glass-waste" userData={{assetId:'glass-waste'}}>
  <Solid size={[.42,.018,.42]} at={[0,.009,0]} color="#6f9488"/>
  {[-.201,.201].map(x=><Solid key={x} size={[.018,.63,.42]} at={[x,.333,0]} color="#81a596"/>)}
  {[-.201,.201].map(z=><Solid key={z} size={[.384,.63,.018]} at={[0,.333,z]} color="#80a494"/>)}
  <group position={[0,.648,0]}><CountertopAsset width={.44} depth={.44} thickness={.025} holes={[{x:0,z:0,width:.23,depth:.14,radius:.015}]} color="#74968b"/></group>
  <Solid size={[.25,.045,.008]} at={[0,.695,-.08]} color="#60897e"/>
  <AssetLabel lines={['THỦY TINH VỠ','VẬT CHỨA CỨNG','MẪU HUẤN LUYỆN']} size={[.32,.25]} at={[0,.37,.211]} paper="#e3e6d4"/>
  <InstancedBoxes color="#587c72" parts={[-.15,.15].flatMap(x=>[-.15,.15].map(z=>({at:[x,.005,z],size:[.05,.01,.05]})))}/>
 </group>;
}

export function SharpsBoxAsset({closed=false,name='asset-sharps-box'}:{closed?:boolean;name?:string}){
 return <group name={name} userData={{assetId:'sharps-box'}}>
  <Solid size={[.32,.015,.28]} at={[0,.0075,0]} color="#a97769"/>
  {[-.1525,.1525].map(x=><Solid key={x} size={[.015,.48,.28]} at={[x,.255,0]} color="#ba8370"/>)}
  {[-.1325,.1325].map(z=><Solid key={z} size={[.29,.48,.015]} at={[0,.255,z]} color="#bc8370"/>)}
  <group position={[0,.495,0]}><CountertopAsset width={.34} depth={.30} thickness={.024} holes={[{x:0,z:0,width:.16,depth:.055,radius:.008}]} color="#c09776"/></group>
  <Solid size={[.176,.012,.070]} at={[0,.526,closed?0:-.095]} color="#a57c60" rounded/>
  <AssetLabel lines={['VẬT SẮC NHỌN','MẪU HUẤN LUYỆN','KHÔNG VƯỢT VẠCH']} size={[.25,.22]} at={[0,.26,.141]} paper="#e9dfc8"/>
  <Solid size={[.27,.004,.002]} at={[0,.423,.141]} color="#715c54"/>
  <Pipe points={[[-.09,.47,-.146],[-.09,.56,-.146],[.09,.56,-.146],[.09,.47,-.146]]} radius={.006} color="#a67661"/>
 </group>;
}

export function GlassShardsAsset(){
 const geometry=useMemo(()=>{
  const s=new THREE.Shape();s.moveTo(-.05,-.035);s.lineTo(.045,-.027);s.lineTo(.018,.055);s.lineTo(-.009,.025);s.closePath();
  return new THREE.ExtrudeGeometry(s,{depth:.002,bevelEnabled:false});
 },[]);useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <group name="asset-glass-shards" userData={{assetId:'glass-shards'}}>
  {[-1,0,1].map((x,i)=><mesh key={x} geometry={geometry} position={[x*.10,0,i%2*.05]} rotation={[-Math.PI/2,0,i*.8]}><meshPhysicalMaterial color="#96c3cf" transparent opacity={.6} roughness={.2} side={THREE.DoubleSide} depthWrite={false}/></mesh>)}
 </group>;
}

export function CrumpledPaperAsset({contaminated=false}:{contaminated?:boolean}){
 const geometry=useMemo(()=>{const g=new THREE.PlaneGeometry(.20,.16,10,8),p=g.attributes.position,colors:number[]=[];for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setXYZ(i,x,.007+Math.abs(Math.sin(x*75+y*53)*Math.cos(y*61))*.03,y);const color=new THREE.Color('#dce0d2');if(contaminated)color.lerp(new THREE.Color('#a28a58'),Math.exp(-(x*x+y*y)*550));colors.push(color.r,color.g,color.b);}g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;},[contaminated]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <group name={contaminated?'asset-contaminated-paper':'asset-crumpled-paper'} userData={{assetId:contaminated?'contaminated-paper':'crumpled-paper'}} position={[0,-.007,0]}>
  <mesh geometry={geometry} castShadow><meshStandardMaterial vertexColors roughness={.98} side={THREE.DoubleSide}/></mesh>
 </group>;
}
