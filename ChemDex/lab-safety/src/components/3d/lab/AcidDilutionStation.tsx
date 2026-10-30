import { isSceneInputBlocked } from '../../../systems/input/sceneInput';
import { useTaskProximity } from './useTaskProximity';
import React, { useState, useEffect } from 'react';
import { SceneHtml as Html } from '../SceneHtml';
import { AcidPourGame } from '../../ui/AcidPourGame';
import { useStore } from '../../../store/useStore';
import { soundManager } from '../../../audio/soundManager';

import { BeakerAsset } from '../assets/LabwareAssets';
import { StirringRodAsset } from '../assets/FurnitureAssets';
import { AssetLabel } from '../assets/AssetPrimitives';
const BENCH_POS: [number, number, number] = [4.2,.901,2.62];

export const AcidDilutionStation: React.FC = () => {
  const completeTask = useStore((s) => s.completeTask);

  const [isOpen, setIsOpen] = useState(false);
  const [reactionState, setReactionState] = useState<'idle' | 'safe' | 'exploded'>('idle');

  const isNear = useTaskProximity(BENCH_POS, 2.2, ['task_inspect_acid']);

  useEffect(() => {
    const open = () => { if (isNear && !isSceneInputBlocked()) setIsOpen(true); };
    window.addEventListener('lab-open-acid', open);
    return () => window.removeEventListener('lab-open-acid', open);
  }, [isNear]);


  return (
    <group userData={{labItem:{title:'Bàn pha loãng axit',kind:'acid'}}} position={BENCH_POS}>
      <group position={[-.22,0,0]}><BeakerAsset color="#cfdbde"/><AssetLabel lines={['H₂SO₄']} size={[.065,.028]} at={[0,.075,0]} curveRadius={.081}/></group>
      <group position={[.22,0,0]}><BeakerAsset color="#99c8d2"/><AssetLabel lines={['H₂O']} size={[.065,.028]} at={[0,.075,0]} curveRadius={.081}/></group>
      <group position={[0,0,0]}><StirringRodAsset/></group>

      {/* 4. Reaction Visual FX (Boiling or Steam) */}
      {reactionState === 'exploded' && (
        <group position={[0.22, 0.35, 0]}>
          <mesh>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color="#FEF08A" emissive="#F97316" emissiveIntensity={2} transparent opacity={0.7} />
          </mesh>
          <pointLight color="#F97316" intensity={2} distance={3} />
        </group>
      )}

      {reactionState === 'safe' && (
        <group position={[0.22, 0.3, 0]}>
          <mesh>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color="#E0F2FE" transparent opacity={0.5} />
          </mesh>
        </group>
      )}

      {isOpen && <Html center zIndexRange={[1000, 0]}>
        <AcidPourGame onClose={() => setIsOpen(false)} onComplete={() => {
          completeTask('task_inspect_acid'); setReactionState('safe'); setIsOpen(false);
          soundManager.play('complete');
        }} />
      </Html>}
    </group>
  );
};
