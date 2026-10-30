import React,{useLayoutEffect,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Batch immutable, untextured room pieces. Original meshes remain as named
 * bounds/picking proxies; moving drawers, doors, seats and actors stay separate. */
export function StaticRoomBatch({children,id}:{children:React.ReactNode;id:string}){
 const root=useRef<THREE.Group>(null),ready=useRef(false),cleanup=useRef<()=>void>(()=>{});
 useLayoutEffect(()=>()=>cleanup.current(),[]);
 useFrame(()=>{
  if(ready.current||!root.current?.children.length)return;
  ready.current=true;const start=performance.now(),parent=root.current;parent.updateWorldMatrix(true,true);
  const inverse=parent.matrixWorld.clone().invert(),groups=new Map<string,{material:THREE.MeshStandardMaterial;meshes:THREE.Mesh[];cast:boolean;receive:boolean;order:number}>();
  const visit=(node:THREE.Object3D)=>{
   if(!node.visible||/^(asset-character|asset-imported-teacher|asset-wall-clock|drawer-slide-|door-leaf-)/.test(node.name)||['seat','drawer'].includes(node.userData.labItem?.kind))return;
   if(node instanceof THREE.Mesh){
    const material=node.material;
    if(material instanceof THREE.MeshStandardMaterial&&!material.transparent&&!material.vertexColors&&!Object.values(material).some(value=>value instanceof THREE.Texture)&&node.matrixWorld.determinant()>0){
     const signature=JSON.stringify([material.type,material.color.getHex(),material.roughness,material.metalness,material.emissive.getHex(),material.emissiveIntensity,material.side,material.depthWrite,material.depthTest,material.flatShading,node.castShadow,node.receiveShadow,node.renderOrder,material.customProgramCacheKey()]);
     const group=groups.get(signature)??{material,meshes:[],cast:node.castShadow,receive:node.receiveShadow,order:node.renderOrder};group.meshes.push(node);groups.set(signature,group);
    }
   }
   for(const child of node.children)visit(child);
  };
  for(const child of parent.children)visit(child);
  const batches:THREE.Mesh[]=[],originals:THREE.Mesh[]=[];
  for(const group of groups.values()){
   if(group.meshes.length<2)continue;
   const geometries:THREE.BufferGeometry[]=[];
   for(const source of group.meshes){
    const local=new THREE.Matrix4().multiplyMatrices(inverse,source.matrixWorld),matrix=new THREE.Matrix4(),count=source instanceof THREE.InstancedMesh?source.count:1;
    for(let i=0;i<count;i++){
     if(source instanceof THREE.InstancedMesh){source.getMatrixAt(i,matrix);matrix.premultiply(local);}else matrix.copy(local);
     const geometry=source.geometry.index?source.geometry.toNonIndexed():source.geometry.clone();
     for(const attribute of Object.keys(geometry.attributes))if(!['position','normal'].includes(attribute))geometry.deleteAttribute(attribute);
     geometry.applyMatrix4(matrix);geometries.push(geometry);
    }
   }
   const geometry=mergeGeometries(geometries);for(const source of geometries)source.dispose();
   if(!geometry)continue;geometry.computeBoundingBox();geometry.computeBoundingSphere();
   const batch=new THREE.Mesh(geometry,group.material);batch.name='room-static-render-batch';batch.castShadow=group.cast;batch.receiveShadow=group.receive;batch.renderOrder=group.order;batch.raycast=()=>{};parent.add(batch);batches.push(batch);
   for(const source of group.meshes){source.userData.staticRenderProxy=true;source.visible=false;originals.push(source);}
  }
  parent.userData.renderBatch={id,sourceMeshes:originals.length,drawBatches:batches.length,buildMs:performance.now()-start};
  cleanup.current=()=>{for(const source of originals){source.visible=true;delete source.userData.staticRenderProxy;}for(const batch of batches){parent.remove(batch);batch.geometry.dispose();}};
 });
 return <group ref={root} name={`lab-static-${id}`}>{children}</group>;
}
