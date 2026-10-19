import React from 'react';
import { useStore } from '../../store/useStore';
import { PracticalSimulation } from './PracticalSimulation';
import { PRACTICAL_WORK } from '../../data/practicalWork';
export function FireExtinguisherQuiz() {
 const open=useStore(s=>s.showFireExtinguisherQuiz);
 if(!open)return null;
 return <PracticalSimulation work={PRACTICAL_WORK.pass} onClose={()=>useStore.getState().setShowFireExtinguisherQuiz(false)} onComplete={()=>{
  useStore.setState(s=>({player:{...s.player,flags:{...s.player.flags,passTrained:true}}}));
  const s=useStore.getState();s.equipItem('hasFireExtinguisher');s.selectTool('extinguisher');s.setShowFireExtinguisherQuiz(false);s.saveGame();
  if(s.currentPhase===2&&!s.player.flags.fireIntroSeen)s.startCinematic('fire');
 }}/>;
}
