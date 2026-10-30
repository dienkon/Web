import {useEffect,useMemo,type DependencyList} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type {V3} from './AssetPrimitives';

export interface BakedPart {geometry:THREE.BufferGeometry;color:string;at?:V3;scale?:V3;rotation?:V3}
/** Bake only static pieces of a single moving body part. Each input geometry is
 * owned by this builder; one vertex-colored buffer replaces many small meshes. */
export function bakeParts(parts:BakedPart[]){
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),color=new THREE.Color();
 const geometries=parts.map(part=>{
  let g=part.geometry;
  if(g.index){const expanded=g.toNonIndexed();g.dispose();g=expanded;}
  for(const attribute of Object.keys(g.attributes))if(!['position','normal'].includes(attribute))g.deleteAttribute(attribute);
  q.setFromEuler(new THREE.Euler(...(part.rotation??[0,0,0])));
  matrix.compose(new THREE.Vector3(...(part.at??[0,0,0])),q,new THREE.Vector3(...(part.scale??[1,1,1])));g.applyMatrix4(matrix);
  color.set(part.color);const rgb=new Float32Array(g.getAttribute('position').count*3);
  for(let i=0;i<rgb.length;i+=3){rgb[i]=color.r;rgb[i+1]=color.g;rgb[i+2]=color.b;}
  g.setAttribute('color',new THREE.BufferAttribute(rgb,3));return g;
 });
 const merged=mergeGeometries(geometries);for(const g of geometries)g.dispose();
 if(!merged)throw Error('Unable to merge wardrobe geometry');merged.computeBoundingBox();merged.computeBoundingSphere();return merged;
}
export function useBakedGeometry(build:()=>BakedPart[],deps:DependencyList){
 const geometry=useMemo(()=>bakeParts(build()),deps);
 useEffect(()=>()=>geometry.dispose(),[geometry]);return geometry;
}
export const spherePart=(at:V3,scale:V3,color:string,segments=16):BakedPart=>({at,scale,color,geometry:new THREE.SphereGeometry(1,segments,12)});
export const capsulePart=(at:V3,radius:number,length:number,color:string,rotation?:V3):BakedPart=>({at,color,rotation,geometry:new THREE.CapsuleGeometry(radius,length,4,12)});
export const boxPart=(at:V3,size:V3,color:string):BakedPart=>({at,color,geometry:new THREE.BoxGeometry(...size)});
export const tubePart=(points:V3[],radius:number,color:string):BakedPart=>({color,geometry:new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,radius,6,false)});
