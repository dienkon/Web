import { useEffect, useLayoutEffect } from 'react';
import { useStore } from '../store/useStore';
import { audioGraph } from './AudioGraph';
import { spatialSound } from './SpatialSoundEngine';
import { isSceneInputBlocked } from '../systems/input/sceneInput';
export function AudioLifecycle(){
  const blocked=useStore(isSceneInputBlocked),settings=useStore(s=>s.settings),view=useStore(s=>s.view);
  useLayoutEffect(()=>{audioGraph.setVolumes(settings.sfxVolume,settings.musicVolume);audioGraph.setSafeEffects(settings.safeEffects);},[settings.sfxVolume,settings.musicVolume,settings.safeEffects]);
  useLayoutEffect(()=>{audioGraph.setWorldBlocked(blocked);if(blocked)spatialSound.resetSteps();if(view!=='game')audioGraph.stopAll();},[blocked,view]);
  useEffect(()=>{
    const unlock=()=>audioGraph.unlock();
    const blur=()=>{audioGraph.setInactive(true);spatialSound.resetSteps();};
    const focus=()=>{audioGraph.setInactive(false);};
    const visibility=()=>{audioGraph.setInactive(document.hidden);if(document.hidden)spatialSound.resetSteps();};
    window.addEventListener('pointerdown',unlock,{capture:true});window.addEventListener('keydown',unlock,{capture:true});
    window.addEventListener('blur',blur);window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visibility);
    visibility();return()=>{window.removeEventListener('pointerdown',unlock,{capture:true});window.removeEventListener('keydown',unlock,{capture:true});window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visibility);audioGraph.stopAll();};
  },[]);
  return null;
}
