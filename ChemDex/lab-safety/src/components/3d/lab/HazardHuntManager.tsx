import React from 'react';
import { useStore } from '../../../store/useStore';
import { InteractableItem } from '../InteractableItem';
import { useAdvancedPractice } from '../../../store/useAdvancedPractice';
import { PRACTICAL_WORK } from '../../../data/practicalWork';
const HAZARDS=[
 {id:'unknown-bottle',position:[-3.5,.93,-1.8] as [number,number,number]},
 {id:'hot-glass',position:[3.5,.93,-1.8] as [number,number,number]},
 {id:'crowded-bench',position:[-4.2,.93,2.6] as [number,number,number]},
 {id:'incompatible-storage',position:[8.8,1.1,0] as [number,number,number]},
 {id:'blocked-exit',position:[-6,.1,5.5] as [number,number,number]},
];
export function HazardHuntManager(){
 const finished=useStore(s=>s.view==='game'&&s.tasks.every(t=>t.completed));
 const records=useAdvancedPractice(s=>s.records);
 if(!finished)return null;
 return <group name="post-course-practice">
 {HAZARDS.map(h=><InteractableItem key={h.id} id={'practice:'+h.id} position={h.position} type="learn" label={(records[h.id]?.best?'Ôn lại: ':'Luyện nâng cao: ')+PRACTICAL_WORK[h.id].title} dialogCallback={()=>useAdvancedPractice.getState().select(h.id,'guided')}>
 <mesh position={[0,.2,0]}><octahedronGeometry args={[.12]}/><meshStandardMaterial color={records[h.id]?.best?"#34d399":"#fbbf24"}/></mesh>
 </InteractableItem>)}

 </group>;
}
