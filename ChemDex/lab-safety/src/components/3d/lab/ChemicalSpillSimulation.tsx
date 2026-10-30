import { WarningConeAsset } from '../assets/ScenePropAssets';
import { useReducedLabMotion } from '../../../systems/device/useReducedLabMotion';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneHtml } from '../SceneHtml';
import { PracticalSimulation } from '../../ui/PracticalSimulation';
import { PRACTICAL_WORK } from '../../../data/practicalWork';
import { useStore } from '../../../store/useStore';
import { useTaskProximity } from './useTaskProximity';
import { isSceneInputBlocked } from '../../../systems/input/sceneInput';
import { useInteractionStore } from '../../../core/InteractionSystem';
import { interactionBus, INTERACTION_PRIORITY } from '../../../systems/input/InteractionBus';
const SPILL_POS: [number,number,number]=[2.5,.001,1];
export function ChemicalSpillSimulation(){
 const phase=useStore(s=>s.currentPhase),player=useStore(s=>s.player),tool=useStore(s=>s.activeTool),startTime=useStore(s=>s.startTime);
 const spillState=player.flags.spillStage??'hazard',neutralizeProgress=player.flags.spillProgress??0;
 const [open,setOpen]=useState<'spill-neutralize'|'spill-collect'|null>(null);
 const vaporPointsRef=useRef<THREE.Points>(null),foamRef=useRef<THREE.Group>(null);
 const isNear=useTaskProximity(SPILL_POS,2.4,['task_spill_neutralize','task_spill_wipe'],false);
 const active=phase===3&&isNear&&tool==='spillKit'&&spillState!=='cleaned';
 const vaporCount=35,reduced=useReducedLabMotion();
 const vaporPositions=useMemo(()=>Float32Array.from({length:vaporCount*3},(_,i)=>i%3===1?Math.random()*.4:(Math.random()-.5)*.9),[]);
 useEffect(()=>setOpen(null),[startTime]);
 useFrame((_,delta)=>{
  if(phase!==3||isSceneInputBlocked()||document.hidden)return;
  delta=Math.min(delta,.05);
  if(!reduced&&vaporPointsRef.current&&(spillState==='hazard'||spillState==='cones_placed')){
   const attr=vaporPointsRef.current.geometry.attributes.position;for(let i=0;i<vaporCount;i++){attr.array[i*3+1]+=delta*.35;if(attr.array[i*3+1]>.8)attr.array[i*3+1]=.02;}attr.needsUpdate=true;
  }
  if(foamRef.current)foamRef.current.scale.setScalar(.5+neutralizeProgress/200);
 });
 const begin=()=>{
  const s=useStore.getState();if(!active||isSceneInputBlocked())return;
  if(!s.player.inventory.hasSweeper||!s.player.equipment.hasGloves||!s.player.equipment.hasGoggles||!s.player.equipment.hasLabCoat){s.startDialog(['Mang đủ bảo hộ và lấy bộ xử lý tràn trước khi luyện với mẫu huấn luyện.']);return;}
  if(s.player.inventory.isHoldingTrash){s.startDialog(['Hãy phân loại mẫu đang cầm trước khi thu gom thêm.']);return;}
  setOpen(spillState==='neutralized'?'spill-collect':'spill-neutralize');
 };
 useEffect(()=>{
  useInteractionStore.getState().register({id:'spill_simulation',position:SPILL_POS,label:spillState==='neutralized'?'Thấm và hốt bã mẫu':'Thực hành xử lý mẫu tràn',isActive:active});
  return()=>useInteractionStore.getState().unregister('spill_simulation');
 },[active,spillState]);
 useEffect(()=>interactionBus.subscribe({priority:INTERACTION_PRIORITY.TARGET,isActive:()=>active&&!isSceneInputBlocked()&&useInteractionStore.getState().nearestId==='spill_simulation',onInteract:begin}),[active,spillState]);
 const finish=()=>{
  if(open==='spill-neutralize'){
   useStore.setState(s=>({player:{...s.player,flags:{...s.player.flags,spillStage:'neutralized',spillProgress:100}}}));useStore.getState().completeTask('task_spill_neutralize');
  }else if(open==='spill-collect'){
   useStore.setState(s=>({activeTool:'waste',player:{...s.player,inventory:{...s.player.inventory,isHoldingTrash:true,heldTrashType:'chemical',heldWasteId:'spill'},flags:{...s.player.flags,spillStage:'cleaned'}}}));useStore.getState().completeTask('task_spill_wipe');
  }
  setOpen(null);useStore.getState().saveGame();
 };
 if(phase!==3)return null;
 return <group position={SPILL_POS}>
      {/* 1. Chemical Spill Puddle on Floor */}
      {spillState !== 'cleaned' && (
        <group>
          {/* Main liquid puddle mesh */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.005, 0]}>
            <circleGeometry args={[0.7, 32]} />
            <meshStandardMaterial
              color={spillState === 'neutralized' ? '#94A3B8' : '#D97706'}
              roughness={0.08}
              metalness={0.1}
              transparent
              opacity={spillState === 'neutralized' ? 0.85 : 0.75}
            />
          </mesh>

          {/* Secondary fluid splash lobes */}
          <mesh rotation={[-Math.PI / 2, 0, 0.5]} position={[0.25, 0.006, 0.2]}>
            <circleGeometry args={[0.35, 20]} />
            <meshStandardMaterial
              color={spillState === 'neutralized' ? '#94A3B8' : '#EA580C'}
              roughness={0.08}
              transparent
              opacity={0.7}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, -0.8]} position={[-0.3, 0.006, -0.15]}>
            <circleGeometry args={[0.4, 20]} />
            <meshStandardMaterial
              color={spillState === 'neutralized' ? '#94A3B8' : '#B45309'}
              roughness={0.08}
              transparent
              opacity={0.7}
            />
          </mesh>

          {/* Neutralizing White Foam Ring (NaHCO3 bubbling) */}
          {neutralizeProgress > 0 && (
            <group ref={foamRef} position={[0, 0.015, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.2, 0.65, 32]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.9} transparent opacity={0.8} />
              </mesh>
              {/* Foam Bubbles */}
              <mesh position={[0.1, 0.02, 0.1]}>
                <sphereGeometry args={[0.04, 12, 12]} />
                <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
              </mesh>
              <mesh position={[-0.15, 0.02, -0.1]}>
                <sphereGeometry args={[0.05, 12, 12]} />
                <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
              </mesh>
            </group>
          )}

          {/* Rising Toxic Fume Particles */}
          {(spillState === 'hazard' || spillState === 'cones_placed') && (
            <points ref={vaporPointsRef}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={vaporCount}
                  array={vaporPositions}
                  itemSize={3}
                />
              </bufferGeometry>
              <pointsMaterial
                size={0.08}
                color="#FBBF24"
                transparent
                opacity={0.45}
                depthWrite={false}
              />
            </points>
          )}
        </group>
      )}

      {spillState!=='hazard'&&[[-.9,0,-.6],[.95,0,-.4],[0,0,.95]].map(([x,y,z],i)=><group key={i} position={[x,y,z]}><WarningConeAsset/></group>)}

 {open&&<SceneHtml zIndexRange={[1500,0]}><PracticalSimulation key={open} work={PRACTICAL_WORK[open]} initialStep={Math.max(0,Math.min(PRACTICAL_WORK[open].steps.length,Number(open==='spill-neutralize'?player.flags.spillNeutralizeStep:player.flags.spillCollectStep)||0))} onClose={()=>setOpen(null)} onStep={step=>{
  useStore.setState(s=>({player:{...s.player,flags:{...s.player.flags,...(open==='spill-neutralize'?{spillNeutralizeStep:step,spillStage:step>=4?'cones_placed' as const:'hazard' as const,spillProgress:Math.max(0,(step-4)/5*100)}:{spillCollectStep:step})}}}));useStore.getState().saveGame();
 }} onComplete={finish}/></SceneHtml>}
 </group>;
}
