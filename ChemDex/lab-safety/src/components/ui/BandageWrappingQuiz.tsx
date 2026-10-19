import React from 'react';
import { useStore } from '../../store/useStore';
import { PracticalSimulation } from './PracticalSimulation';
import { PRACTICAL_WORK } from '../../data/practicalWork';
export function BandageWrappingQuiz() {
 const open=useStore(s=>s.showBandageQuiz);
 if(!open)return null;
 return <PracticalSimulation work={PRACTICAL_WORK.bandage} onClose={()=>useStore.getState().setShowBandageQuiz(false)} onComplete={()=>{useStore.getState().completeTask('task_bandage');useStore.getState().setShowBandageQuiz(false);useStore.getState().saveGame();}}/>;
}
