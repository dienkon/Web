import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { roundedOpening } from './StationAssets';
export const NORTH_WINDOWS=[-6.5,-2.2,2.2,6.5];
export function NorthWallAsset(){
 const geometry=useMemo(()=>{const s=roundedOpening(0,1.9,20,3.8,0);NORTH_WINDOWS.forEach(x=>s.holes.push(roundedOpening(x,3.35,2.74,.49,.006)));return new THREE.ExtrudeGeometry(s,{depth:.2,bevelEnabled:false,curveSegments:6});},[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh name="north-wall-with-window-openings" geometry={geometry} position={[0,0,-7.6]} receiveShadow><meshStandardMaterial color="#e1e8e5" roughness={.85}/></mesh>;
}
