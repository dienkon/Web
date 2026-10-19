import React from 'react';
import { useStore } from '../../store/useStore';
import { PracticalSimulation } from './PracticalSimulation';
import { PRACTICAL_WORK, disposalWork } from '../../data/practicalWork';
export function SafetyPractice({waste=false,onClose}:{waste?:boolean;onClose:()=>void}) {
 const held=useStore(s=>s.player.inventory.heldTrashType??'chemical');
 const finish=()=>{
  if(!waste){onClose();return;}
  const state=useStore.getState();if(!state.player.inventory.isHoldingTrash)return;
  const id=state.player.inventory.heldWasteId??'spill';
  useStore.setState(s=>({activeTool:null,player:{...s.player,inventory:{...s.player.inventory,isHoldingTrash:false,heldTrashType:null,heldWasteId:null},flags:{...s.player.flags,trashCount:(s.player.flags.trashCount??0)+1,wasteDisposed:[...new Set([...(s.player.flags.wasteDisposed??[]),id])]}}}));
  const s=useStore.getState();if(s.tasks.find(t=>t.id==='task_spill_wipe')?.completed&&['spill','paper','glass','absorbent'].every(id=>s.player.flags.wasteDisposed?.includes(id)))s.completeTask('task_trash_disposal');
  s.saveGame();onClose();
 };
 return <PracticalSimulation work={waste?disposalWork(held):PRACTICAL_WORK['crowded-bench']} onClose={onClose} onComplete={finish}/>;
}
