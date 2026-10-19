import React from 'react';
import { LabItem, useLabEquipment } from '../../store/useLabEquipment';
import { useStore } from '../../store/useStore';
import { instrumentWork } from '../../data/instrumentWork';
import { PracticalSimulation } from './PracticalSimulation';
export function LabInstrumentGame({item,onClose}:{item:LabItem;onClose:()=>void}) {
 const equipment=useStore(s=>s.player.equipment);
 const ready=equipment.hasGoggles&&equipment.hasGloves&&equipment.hasLabCoat;
 const needsPPE=['heat','volume','titration','glass','ph','storage','washBottle','hood'].includes(item.kind);
 const finish=()=>{
  useLabEquipment.getState().record(item.id,['seat','door'].includes(item.kind));
  const s=useStore.getState();
  if(item.kind==='ppe'&&item.equipKey){s.equipItem(item.equipKey as any);}
  if(item.kind==='spillKit'){s.equipItem('hasSweeper');s.completeTask('task_spill_kit');}
  if(item.kind==='mirror'){s.equipItem('hairTied');s.completeTask('task_hair');}
  if(item.kind==='extinguisher'){
   useStore.setState(s=>({player:{...s.player,flags:{...s.player.flags,passTrained:true}}}));
   s.equipItem('hasFireExtinguisher');
  }
  if(item.kind==='firstAid')s.completeTask('task_bandage');
  s.saveGame();onClose();
 };
 return <PracticalSimulation key={item.id} work={instrumentWork(item)} onClose={onClose} onComplete={finish} blockedReason={needsPPE&&!ready?'Đóng bàn thực hành và mang đủ kính, găng tay, áo blouse trước khi sử dụng.':undefined}/>;
}
