import React, { useLayoutEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ASSET_CATALOG } from './assetCatalog';
import { CharacterStudy } from './CharacterStudy';
import type { PlayerState } from '../../../types';

interface Snapshot {id:string;min:number[];max:number[];size:number[];meshes:number;triangles:number;calls:number;invalidVertices:number;parts:string[];textures:number;palette:string[];wardrobe:Record<string,unknown>[];anchors:{name:string;at:number[]}[]}
declare global{interface Window{__ASSET_REVIEW__?:Snapshot}}

function ReviewModel({id,angle,onReady}:{id:string;angle:string;onReady:(value:Snapshot)=>void}) {
 const asset=ASSET_CATALOG.find(a=>a.id===id)??ASSET_CATALOG[0];
 const root=useRef<THREE.Group>(null),elapsed=useRef(0),done=useRef(false);
 const {camera,size,gl}=useThree();
 const controls=useRef<any>(null);
 useLayoutEffect(()=>{
  if(!root.current)return;
  const box=new THREE.Box3().setFromObject(root.current);
  const detail=new URLSearchParams(location.search).get('detail');
  if(id.endsWith('-character')){
   const frames:Record<string,[number[],number[]]>={head:[[-.24,1.34,-.34],[.24,1.85,.25]],torso:[[-.37,.66,-.23],[.37,1.44,.24]],hands:[[-.37,.76,-.16],[.37,1.05,.2]],feet:[[-.24,0,-.13],[.24,.3,.23]]};
   if(detail&&frames[detail]){box.min.fromArray(frames[detail][0]);box.max.fromArray(frames[detail][1]);}
  }
  const center=box.getCenter(new THREE.Vector3()),span=box.getSize(new THREE.Vector3());
  const distance=span.length()/(2*Math.sin(THREE.MathUtils.degToRad(38)/2))*1.35;
  const direction=angle==='front'?new THREE.Vector3(0,.2,1):angle==='left'?new THREE.Vector3(-1,.1,.05):angle==='right'?new THREE.Vector3(1,.1,.05):angle==='back'?new THREE.Vector3(-.65,.35,-1):angle==='top'?new THREE.Vector3(.15,1,.15):new THREE.Vector3(1,.65,1.35);
  camera.position.copy(center).addScaledVector(direction.normalize(),distance*Math.max(1,size.height/size.width));camera.lookAt(center);
  if(camera instanceof THREE.PerspectiveCamera){camera.near=distance/100;camera.far=distance*100;camera.updateProjectionMatrix();}
  controls.current?.target.copy(center);controls.current?.update();elapsed.current=0;done.current=false;
 },[id,angle,camera,size]);
 useFrame((_,delta)=>{
  elapsed.current+=delta;if(done.current||elapsed.current<.6||!root.current)return;
  const box=new THREE.Box3().setFromObject(root.current);let meshes=0,triangles=0,invalidVertices=0;const parts:string[]=[],palette=new Set<string>(),wardrobe:Record<string,unknown>[]=[],anchors:{name:string;at:number[]}[]=[];
  root.current.traverse(o=>{
   if(o.name)parts.push(o.name);
   if(o.userData.wardrobe)wardrobe.push({name:o.name,...o.userData.wardrobe});
   if(o.name.startsWith('wardrobe-'))anchors.push({name:o.name,at:o.getWorldPosition(new THREE.Vector3()).toArray()});
   if(!(o instanceof THREE.Mesh))return;
   let visible=true;for(let node:THREE.Object3D|null=o;node;node=node.parent)visible=visible&&node.visible;
   if(!visible)return;meshes++;
   const p=o.geometry.attributes.position;triangles+=(o.geometry.index?.count??p?.count??0)/3*(o instanceof THREE.InstancedMesh?o.count:1);
   const colors=o.geometry.getAttribute('color'),c=new THREE.Color();
   if(colors)for(let i=0;i<colors.count;i++){c.setRGB(colors.getX(i),colors.getY(i),colors.getZ(i));palette.add('#'+c.getHexString());}
   else for(const material of Array.isArray(o.material)?o.material:[o.material])if('color' in material&&material.color instanceof THREE.Color)palette.add('#'+material.color.getHexString());
   if(p)for(let i=0;i<p.count;i++)if(!Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)))invalidVertices++;
  });
  const snapshot={id:asset.id,min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new THREE.Vector3()).toArray(),meshes,triangles:Math.round(triangles),calls:gl.info.render.calls,invalidVertices,parts,textures:gl.info.memory.textures,palette:[...palette],wardrobe,anchors};
  window.__ASSET_REVIEW__=snapshot;onReady(snapshot);done.current=true;
 });
 const wear=new URLSearchParams(location.search).get('wear');
 const states:Record<string,Partial<PlayerState['equipment']>>={none:{},goggles:{hasGoggles:true},mask:{hasMask:true},coat:{hasLabCoat:true},gloves:{hasGloves:true},shoes:{hasClosedShoes:true},full:{hasGoggles:true,hasMask:true,hasLabCoat:true,hasGloves:true,hasClosedShoes:true,hairTied:true}};
 return <><group ref={root}>{id.endsWith('-character')&&wear&&wear in states?<CharacterStudy prepared={false} hair={id==='bun-character'?'bun':id==='braided-character'?'braided':id==='long-hair-character'?'long':'ponytail'} equipment={{hasClosedShoes:false,...states[wear]}}/>:asset.render()}</group><OrbitControls ref={controls} enablePan={false} makeDefault minPolarAngle={.02} maxPolarAngle={Math.PI*.8}/></>;
}

export default function AssetReview(){
 const query=new URLSearchParams(location.search),id=query.get('asset-review')??'beaker',angle=query.get('angle')??'three-quarter';
 const asset=ASSET_CATALOG.find(a=>a.id===id)??ASSET_CATALOG[0];
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 return <main style={{height:'100dvh',display:'grid',gridTemplateColumns:'minmax(0,1fr) 280px',background:'#edf2f2',color:'#294751',fontFamily:'sans-serif'}} data-asset-review={asset.id}>
  <section style={{minWidth:0,position:'relative'}}><Canvas camera={{fov:38}} gl={{antialias:true,alpha:false}} dpr={1}>
   <color attach="background" args={['#e5edef']}/><hemisphereLight args={['#f5fcff','#b7b0a0',1.1]}/>
   <directionalLight position={[2,4,3]} intensity={1.5} color="#fff5df"/><directionalLight position={[-3,2,-2]} intensity={.8} color="#d0e6f0"/>
   <Environment resolution={128} frames={1}><Lightformer intensity={2} position={[0,2,3]} scale={[3,2,1]}/><Lightformer intensity={1} position={[-2,1,-2]} rotation={[0,Math.PI/2,0]} scale={[2,2,1]}/></Environment>
   <ReviewModel id={asset.id} angle={angle} onReady={setSnapshot}/>
  </Canvas><span style={{position:'absolute',left:24,top:24,fontSize:11,letterSpacing:2}}>CHEMDEX / ASSET STUDY</span></section>
  <aside style={{padding:22,overflow:'auto',background:'#f8fbfa',borderLeft:'1px solid #d2dfe1'}}>
   <p style={{fontSize:11,color:'#568b87'}}>{asset.group}</p><h1 style={{fontSize:23,margin:'10px 0 24px'}}>{asset.title}</h1>
   <ul style={{paddingLeft:18,fontSize:13,lineHeight:1.8}}>{asset.details.map(t=><li key={t}>{t}</li>)}</ul>
   <nav style={{display:'flex',gap:10,flexWrap:'wrap',margin:'24px 0'}}>{['front','three-quarter','back','top'].map(a=><a key={a} href={`?asset-review=${asset.id}&angle=${a}`} style={{fontSize:12,color:a===angle?'#116d68':'#627e89'}}>{a}</a>)}</nav>
   <select aria-label="Chọn asset" value={asset.id} onChange={e=>location.assign(`?asset-review=${e.target.value}&angle=${angle}`)} style={{width:'100%',padding:9,border:'1px solid #b6cdd2',borderRadius:8}}>{ASSET_CATALOG.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select>
   <pre style={{fontSize:10,lineHeight:1.7,whiteSpace:'pre-wrap',marginTop:24}}>{snapshot?JSON.stringify({size:snapshot.size.map(n=>+n.toFixed(3)),meshes:snapshot.meshes,triangles:snapshot.triangles,calls:snapshot.calls,invalid:snapshot.invalidVertices},null,2):'Đang dựng asset…'}</pre>
   <a href="/" style={{fontSize:12,color:'#537988'}}>Trở lại phòng thí nghiệm</a>
  </aside>
 </main>;
}
