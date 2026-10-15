import React, { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { PlayerModel } from '../PlayerModel';
import { useStore } from '../../../store/useStore';
import type { CharacterProfile, PlayerState } from '../../../types';
interface Props { position?: [number,number,number]; rotationY?: number; scale?: number; }
const PROFILE: CharacterProfile = {name:'Thầy giáo',gender:'male',skinTone:'#e0ac83',hairStyle:'short',hairColor:'#475569',shirtColor:'#3b82a0'};
const PLAYER: PlayerState = {equipment:{hasGoggles:false,hasLabCoat:true,hasGloves:false,hasMask:false,hairTied:true,hasClosedShoes:true},inventory:{},flags:{}};
function DetailedTeacher({scale=0.88}: Props) {
  const {scene}=useGLTF('/teacher.glb');
  const clone=useMemo(()=>{const c=scene.clone(true);c.traverse(child=>{if((child as THREE.Mesh).isMesh){child.castShadow=true;child.receiveShadow=true;}});return c;},[scene]);
  return <primitive object={clone} position={[0,scale,0]} scale={scale} />;
}
export const TeacherNPC: React.FC<Props> = ({position=[0,0,-4.5],rotationY=0,scale=.88}) => {
  const quality=useStore(s=>s.settings.graphicsQuality);
  const lightweight=<PlayerModel position={[0,0,0]} rotationY={0} isMoving={false} player={PLAYER} character={PROFILE}/>;
  return <group position={position} rotation={[0,rotationY,0]}>
    {quality==='ultra'?<Suspense fallback={lightweight}><DetailedTeacher scale={scale}/></Suspense>:lightweight}
  </group>;
};
