import type { LabItem } from '../../store/useLabEquipment';
import { useStore } from '../../store/useStore';
import { LAB_SCENARIOS } from '../../scenarios/catalog';
import { SAFETY_ROUNDS } from '../../data/safetyRounds';

/** A quest owns its props until completion; generic inspection must not steal focus. */
export function questOwnsEquipment(item: LabItem, state = useStore.getState()) {
 const pending=(id:string)=>!state.tasks.find(t=>t.id===id)?.completed;
 const owned: Partial<Record<LabItem['kind'],string>> = state.currentPhase===1
  ? {ppe:'task_mask',mirror:'task_hair',board:'task_rules'}
  : state.currentPhase===2 ? {extinguisher:'task_fire_extinguisher',board:'task_chemical_symbols',acid:'task_inspect_acid',firstAid:'task_bandage'}
  : state.currentPhase===3 ? {spillKit:'task_spill_kit',waste:'task_trash_disposal'} : {};
 if(owned[item.kind]&&pending(owned[item.kind]!))return true;
 if(state.currentPhase===5){
  const scenario=LAB_SCENARIOS.find(s=>pending(s.taskId));
  if(scenario&&Math.hypot(item.position[0]-scenario.position[0],item.position[2]-scenario.position[2])<1.8)return true;
 }
 if(state.currentPhase===4){
  const round=SAFETY_ROUNDS.find(r=>pending(r.id));
  if(round&&Math.hypot(item.position[0]-round.position[0],item.position[2]-round.position[2])<1.8)return true;
 }
 return false;
}
