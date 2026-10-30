import { WASTE_CONTAINERS } from '../../../data/scene/fixtureLayout';
import { GlassWasteAsset, LiquidWasteAsset, PedalBinAsset, SharpsBoxAsset } from '../assets/WasteAssets';
import React, { useEffect, useState } from 'react';
import { SceneHtml } from '../SceneHtml';
import { SafetyPractice } from '../../ui/SafetyPractice';
import { useStore } from '../../../store/useStore';
import { isSceneInputBlocked } from '../../../systems/input/sceneInput';

export const WasteStation: React.FC = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => { if (!isSceneInputBlocked() && useStore.getState().player.inventory.isHoldingTrash) setOpen(true); };
    window.addEventListener('lab-open-waste', show);
    return () => window.removeEventListener('lab-open-waste', show);
  }, []);
  return (
    <group name="waste-station" position={[8.8, 0, 5.0]}>
      {open && <SceneHtml zIndexRange={[1000, 0]}><SafetyPractice waste onClose={() => setOpen(false)} /></SceneHtml>}
      {WASTE_CONTAINERS.map(bin=><group key={bin.id} name={bin.id} position={[bin.position[0]-8.8,0,bin.position[2]-5]} rotation={[0,-Math.PI/2,0]} userData={{labItem:{id:bin.id,title:bin.title,kind:'waste'}}}>
       {bin.kind==='glass'?<GlassWasteAsset/>:bin.kind==='liquid'?<LiquidWasteAsset/>:bin.kind==='sharps'?<SharpsBoxAsset/>:<PedalBinAsset domestic={bin.kind==='domestic'}/>}
      </group>)}
    </group>
  );
};
