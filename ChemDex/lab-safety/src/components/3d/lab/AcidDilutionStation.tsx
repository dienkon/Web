import { isSceneInputBlocked } from '../../../systems/input/sceneInput';
import { useTaskProximity } from './useTaskProximity';
import React, { useState, useEffect } from 'react';
import { SceneHtml as Html } from '../SceneHtml';
import { AcidPourGame } from '../../ui/AcidPourGame';
import { useStore } from '../../../store/useStore';
import { soundManager } from '../../../audio/soundManager';

const BENCH_POS: [number, number, number] = [4.2, 0.95, 2.2];

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
      {/* 1. Beaker A: Sulfuric Acid H2SO4 98% */}
      <group position={[-0.22, 0.12, 0]}>
        {/* Glass Cylinder */}
        <mesh>
          <cylinderGeometry args={[0.075, 0.075, 0.22, 24]} />
          <meshPhysicalMaterial
            transparent
            opacity={0.3}
            roughness={0.1}
            metalness={0.1}
            ior={1.5}
            color="#FFFFFF"
          />
        </mesh>
        {/* Liquid: Acid H2SO4 */}
        <mesh position={[0, -0.04, 0]}>
          <cylinderGeometry args={[0.072, 0.072, 0.12, 24]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.1} transparent opacity={0.85} />
        </mesh>
        {/* Label */}
        <mesh position={[0, 0.02, 0.076]}>
          <planeGeometry args={[0.08, 0.04]} />
          <meshBasicMaterial color="#FEF08A" />
        </mesh>
      </group>

      {/* 2. Beaker B: Distilled Water H2O */}
      <group position={[0.22, 0.12, 0]}>
        {/* Glass Cylinder */}
        <mesh>
          <cylinderGeometry args={[0.085, 0.085, 0.24, 24]} />
          <meshPhysicalMaterial
            transparent
            opacity={0.3}
            roughness={0.1}
            metalness={0.1}
            ior={1.5}
            color="#FFFFFF"
          />
        </mesh>
        {/* Liquid: Distilled Water */}
        <mesh position={[0, -0.03, 0]}>
          <cylinderGeometry args={[0.082, 0.082, 0.16, 24]} />
          <meshStandardMaterial color="#38BDF8" roughness={0.1} transparent opacity={0.65} />
        </mesh>
        {/* Label */}
        <mesh position={[0, 0.03, 0.086]}>
          <planeGeometry args={[0.08, 0.04]} />
          <meshBasicMaterial color="#BAE6FD" />
        </mesh>
      </group>

      {/* 3. Glass Stirring Rod */}
      <mesh position={[0, 0.14, 0]} rotation={[0.2, 0, 0.3]}>
        <cylinderGeometry args={[0.005, 0.005, 0.32, 12]} />
        <meshPhysicalMaterial transparent opacity={0.5} roughness={0.1} color="#FFFFFF" />
      </mesh>

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
