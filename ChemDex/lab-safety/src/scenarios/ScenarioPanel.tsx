import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { SCENARIO_BY_ID } from './catalog';
import { useScenarioSession } from './store';
import { getPostPhaseWork } from '../data/postPhaseWork';
import { PracticalSimulation } from '../components/ui/PracticalSimulation';

export function ScenarioPanel() {
 const openId=useScenarioSession(s=>s.openId);
 const waiting=useScenarioSession(s=>s.waitingForFilm);
 const attempt=useScenarioSession(s=>openId?s.runs[openId]:undefined);
 const cinematic=useStore(s=>s.cinematic);
 useEffect(()=>{if(openId&&waiting&&!cinematic)useScenarioSession.getState().reveal();},[openId,waiting,cinematic]);
 if(!openId||waiting||cinematic||!attempt)return null;
 const scenario=SCENARIO_BY_ID.get(openId),work=getPostPhaseWork(openId);
 if(!scenario||!work)return null;
 return <PracticalSimulation key={openId} work={work} initialStep={attempt.physicalStep??0}
  onClose={()=>{useScenarioSession.getState().close();useStore.getState().saveGame();}}
  onStep={index=>{useScenarioSession.getState().dispatch({type:'physical-step',index});useStore.getState().saveGame();}}
  onComplete={()=>{const result=useScenarioSession.getState().dispatch({type:'finish'});if(result.completed){useStore.getState().completeTask(scenario.taskId);useScenarioSession.getState().close();useStore.getState().saveGame();}}}/>;
}
