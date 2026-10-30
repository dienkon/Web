import React from 'react';
import { useStore } from '../../store/useStore';
import { PracticalSimulation } from './PracticalSimulation';
import { ACID_WORK } from '../../data/acidWork';
export { ACID_WORK } from '../../data/acidWork';
export function AcidPourGame({onClose,onComplete}:{onClose:()=>void;onComplete:()=>void}){
 const equipment=useStore(s=>s.player.equipment);
 const ready=equipment.hasGoggles&&equipment.hasGloves&&equipment.hasLabCoat;
 return <PracticalSimulation work={ACID_WORK} onClose={onClose} onComplete={onComplete} blockedReason={ready?undefined:'Hãy đóng bàn thực hành và mang kính, găng tay, áo blouse trước khi thao tác.'}/>;
}
