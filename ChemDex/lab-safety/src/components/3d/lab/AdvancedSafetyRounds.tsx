import { AlcoholStationAsset } from '../assets/CombustionAssets';
import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../../store/useStore';
import { SAFETY_ROUNDS } from '../../../data/safetyRounds';
import { InteractableItem } from '../InteractableItem';
import { SceneHtml } from '../SceneHtml';
import { PracticalSimulation } from '../../ui/PracticalSimulation';
import { getPostPhaseWork } from '../../../data/postPhaseWork';

function SafetyRoundMarker({ color, active, kind }: { color: string; active: boolean; kind: string }) {
 const root = useRef<THREE.Group>(null);
 useFrame(({ clock }) => {
  if (!root.current) return;
  const pulse = active ? 1 + Math.sin(clock.elapsedTime * 5) * .06 : 1;
  root.current.scale.setScalar(pulse);
  root.current.position.y = Math.sin(clock.elapsedTime * 2.5) * (active ? .035 : .015);
 });
 const isHood = kind === 'task_fume_safety';
 const isEvacuation = kind === 'task_evacuation';
 return <group ref={root} name={`safety-round-marker-${kind}`} userData={{focusOverlay:true}}>
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .012, 0]}>
   <ringGeometry args={[.22, .29, 32]} />
   <meshBasicMaterial color={color} transparent opacity={active ? .9 : .36} depthWrite={false} />
  </mesh>
  <mesh position={[0, .27, 0]} rotation={[0, 0, isEvacuation ? Math.PI / 4 : 0]}>
   {isHood ? <boxGeometry args={[.24, .24, .06]} /> : isEvacuation ? <coneGeometry args={[.17, .34, 4]} /> : <octahedronGeometry args={[.2, 0]} />}
   <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? .55 : .12} metalness={.2} roughness={.35} />
  </mesh>
  <mesh position={[0, .27, .035]}>
   {isHood ? <boxGeometry args={[.11, .07, .012]} /> : isEvacuation ? <boxGeometry args={[.055, .19, .018]} /> : <sphereGeometry args={[.045, 12, 8]} />}
   <meshBasicMaterial color="#f8fafc" transparent opacity={active ? .9 : .55} />
  </mesh>
 </group>;
}

export function AdvancedSafetyRounds() {
 const phase=useStore(s=>s.currentPhase),tasks=useStore(s=>s.tasks),cinematic=useStore(s=>s.cinematic),startTime=useStore(s=>s.startTime);
 const [pending,setPending]=useState<string|null>(null);
 useEffect(()=>setPending(null),[startTime]);
 const active=SAFETY_ROUNDS.find(r=>!tasks.find(t=>t.id===r.id)?.completed);
 const round=SAFETY_ROUNDS.find(r=>r.id===pending);
 if(phase!==4)return null;
 return <group name="advanced-safety-rounds">
 {SAFETY_ROUNDS.map(r=>{
  const completed=!!tasks.find(t=>t.id===r.id)?.completed;
  const isActive=active?.id===r.id;
  return <InteractableItem key={r.id} id={r.id} position={r.position} type="learn" taskId={r.id} label={r.title} disabled={!isActive} isGlowing={isActive} dialogCallback={()=>{setPending(r.id);if(r.id!=='task_alcohol_cap')useStore.getState().startCinematic(r.cinematic);}}>
   {r.id==='task_alcohol_cap'
    ? <group name="alcohol-burner-model" position={[0,-.029,0]}><AlcoholStationAsset lit={!completed} covered={completed}/></group>
    : <SafetyRoundMarker color={r.color} active={isActive} kind={r.id}/>}
  </InteractableItem>;
 })}
 {round&&!cinematic&&<SceneHtml zIndexRange={[1500,0]}><PracticalSimulation key={round.id} work={getPostPhaseWork(round.id==='task_alcohol_cap'?'alcohol-cap':round.cinematic)} onClose={()=>setPending(null)} onComplete={()=>{useStore.getState().completeTask(round.id);useStore.getState().saveGame();setPending(null);}}/></SceneHtml>}
 </group>;
}
