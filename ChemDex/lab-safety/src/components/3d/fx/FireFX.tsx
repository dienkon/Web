import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { fireSimulation } from '../../../core/fire/FireSim';
import { SimulationClock } from '../../../core/simulation/SimulationClock';
import { feedbackBus } from '../../../core/simulation/FeedbackBus';
import { useStore } from '../../../store/useStore';

export const FireFX: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const wasActive = useRef(false);
  const wasEscalated = useRef(false);
  const runState = useStore(s => s.runState);
  const settings = useStore(s => s.settings);

  useFrame((_, delta) => {
    SimulationClock.tick(delta, runState === 'PAUSED', dt => fireSimulation.update(dt));
    if (!groupRef.current) return;
    const active = fireSimulation.sources.some(source => source.cells.some(cell => cell.intensity > 0.05));
    const escalated = fireSimulation.sources.some(source => source.isEscalated);
    if (active !== wasActive.current) {
      feedbackBus.emit({ type: 'fire', active, escalated });
      wasActive.current = active;
    }
    if (escalated !== wasEscalated.current) {
      feedbackBus.emit({ type: 'alarm', active: escalated });
      wasEscalated.current = escalated;
    }
    if (settings.safeEffects || settings.reduceMotion) return;
    const time = performance.now() * 0.008;
    groupRef.current.children.forEach((child, idx) => {
      const scaleFlicker = 1 + Math.sin(time + idx * 2) * 0.15;
      child.scale.set(scaleFlicker, scaleFlicker * 1.1, scaleFlicker);
    });
  });

  return (
    <group ref={groupRef}>
      {fireSimulation.sources.flatMap(source => source.cells.map(cell => {
        if (cell.intensity <= 0.05) return null;
        return (
          <group key={cell.id} position={[cell.x, cell.y, cell.z]}>
            <mesh position={[0, 0.15 * cell.intensity, 0]}>
              <coneGeometry args={[0.12 * cell.intensity, 0.35 * cell.intensity, 12]} />
              <meshStandardMaterial color="#EA580C" emissive="#EA580C" emissiveIntensity={2} transparent opacity={0.85} />
            </mesh>
            <mesh position={[0, 0.08 * cell.intensity, 0]}>
              <coneGeometry args={[0.06 * cell.intensity, 0.2 * cell.intensity, 12]} />
              <meshStandardMaterial color="#FACC15" emissive="#FDE047" emissiveIntensity={3} transparent opacity={0.9} />
            </mesh>
            <pointLight color="#F97316" intensity={1.2 * cell.intensity} distance={3.5} decay={2} />
          </group>
        );
      }))}
    </group>
  );
};
