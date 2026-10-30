import React from 'react';
import { useStore } from '../../store/useStore';
import { PracticalSimulation } from './PracticalSimulation';
import { HAZARD_LABEL_WORK } from '../../data/hazardLabelWork';
export function ChemicalSymbolsQuiz() {
 const open=useStore(s=>s.showChemicalSymbolsQuiz);
 if(!open)return null;
 return <PracticalSimulation work={HAZARD_LABEL_WORK} onClose={()=>useStore.getState().setShowChemicalSymbolsQuiz(false)} onComplete={()=>{useStore.getState().completeTask('task_chemical_symbols');useStore.getState().setShowChemicalSymbolsQuiz(false);useStore.getState().saveGame();}}/>;
}
