import React, { useEffect, useState } from 'react';
import { useStore } from '../../../store/useStore';
import { SAFETY_ROUNDS } from '../../../data/safetyRounds';
import { InteractableItem } from '../InteractableItem';
import { SceneHtml } from '../SceneHtml';
import { PracticalSimulation } from '../../ui/PracticalSimulation';
import { getPostPhaseWork } from '../../../data/postPhaseWork';
export function AdvancedSafetyRounds() {
 const phase=useStore(s=>s.currentPhase),tasks=useStore(s=>s.tasks),cinematic=useStore(s=>s.cinematic),startTime=useStore(s=>s.startTime);
 const [pending,setPending]=useState<string|null>(null);
 useEffect(()=>setPending(null),[startTime]);
 const active=SAFETY_ROUNDS.find(r=>!tasks.find(t=>t.id===r.id)?.completed);
 const round=SAFETY_ROUNDS.find(r=>r.id===pending);
 if(phase!==4)return null;
 return <group name="advanced-safety-rounds">
 {SAFETY_ROUNDS.map(r=><InteractableItem key={r.id} id={r.id} position={r.position} type="learn" taskId={r.id} label={r.title} disabled={active?.id!==r.id} dialogCallback={()=>{setPending(r.id);if(r.id!=='task_alcohol_cap')useStore.getState().startCinematic(r.cinematic);}}>
  {r.id==='task_alcohol_cap'?<group name="alcohol-burner-model">
   <mesh position={[0,.07,0]}><sphereGeometry args={[.09,20,12]}/><meshPhysicalMaterial color="#b8d8e3" transparent opacity={.75} roughness={.15}/></mesh>
   <mesh position={[0,.06,0]}><cylinderGeometry args={[.065,.075,.07,20]}/><meshStandardMaterial color="#72b8d0" transparent opacity={.65}/></mesh>
   <mesh position={[0,.155,0]}><cylinderGeometry args={[.025,.025,.035,16]}/><meshStandardMaterial color="#b5a68d" metalness={.7}/></mesh>
   <mesh position={[0,.19,0]}><cylinderGeometry args={[.007,.007,.04,10]}/><meshStandardMaterial color="#bfae84"/></mesh>
   {!tasks.find(t=>t.id===r.id)?.completed&&<mesh position={[0,.255,0]}><coneGeometry args={[.018,.1,16]}/><meshBasicMaterial color="#fbbf24" transparent opacity={.8}/></mesh>}
   <group position={[.23,.04,0]}><mesh><cylinderGeometry args={[.035,.042,.07,16]}/><meshStandardMaterial color="#b7c7d1" metalness={.8}/></mesh><mesh position={[0,.04,0]}><torusGeometry args={[.016,.004,6,12]}/><meshStandardMaterial color="#94a3b8" metalness={.8}/></mesh></group>
   <mesh position={[0,-.005,0]}><boxGeometry args={[.5,.02,.35]}/><meshStandardMaterial color="#556575"/></mesh>
  </group>:<mesh position={[0,.3,0]} rotation={[0,0,Math.PI/4]}><boxGeometry args={[.22,.22,.035]}/><meshStandardMaterial color={r.color} emissive={r.color} emissiveIntensity={.18}/></mesh>}
 </InteractableItem>)}
 {round&&!cinematic&&<SceneHtml zIndexRange={[1500,0]}><PracticalSimulation key={round.id} work={getPostPhaseWork(round.id==='task_alcohol_cap'?'alcohol-cap':round.cinematic)} onClose={()=>setPending(null)} onComplete={()=>{useStore.getState().completeTask(round.id);useStore.getState().saveGame();setPending(null);}}/></SceneHtml>}
 </group>;
}
