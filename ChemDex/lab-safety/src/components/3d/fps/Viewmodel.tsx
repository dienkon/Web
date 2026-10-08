import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../../store/useStore';

export type HeldItemSlot =
  | 'none'
  | 'goggles'
  | 'glove'
  | 'beaker'
  | 'flask'
  | 'dropper'
  | 'extinguisher'
  | 'fireBlanket'
  | 'sweeper'
  | 'spillScoop'
  | 'bandage'
  | 'clipboard'
  | 'wasteItem';

export const Viewmodel: React.FC = () => {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  const view = useStore((s) => s.view);
  const player = useStore((s) => s.player);
  const character = useStore((s) => s.character);
  const runState = useStore((s) => s.runState);

  // Dynamic arms materials based on equipped PPE
  // Skin tone: from characterProfile
  // Coat: white sleeve if hasLabCoat
  // Gloves: nitrile teal/purple if hasGloves
  const armColor = player.equipment.hasLabCoat ? '#F8FAFC' : character.shirtColor || '#0EA5B7';
  const handColor = player.equipment.hasGloves ? '#38BDF8' : character.skinTone || '#F7D3BA';

  // Smooth viewmodel sway
  const swayOffset = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    if (view !== 'game' || runState === 'PAUSED' || !groupRef.current) return;

    // Position viewmodel relative to camera
    groupRef.current.position.copy(camera.position);
    groupRef.current.quaternion.copy(camera.quaternion);

    // Subtle breathing / idle sway
    const time = performance.now() * 0.002;
    const targetSwayX = Math.sin(time) * 0.003;
    const targetSwayY = Math.cos(time * 2) * 0.002;
    swayOffset.current.lerp(new THREE.Vector3(targetSwayX, targetSwayY, 0), delta * 8);
  });

  if (view !== 'game') return null;

  return (
    <group ref={groupRef}>
      <group position={[0, -0.28, -0.45]}>
        {/* Right Arm: Forearm & Hand */}
        <group position={[0.22, 0.05, 0.05]} rotation={[-0.3, 0.2, -0.1]}>
          {/* Forearm (Sleeve or bare arm) */}
          <mesh position={[0, -0.12, 0.1]}>
            <cylinderGeometry args={[0.04, 0.045, 0.28, 16]} />
            <meshStandardMaterial color={armColor} roughness={0.7} />
          </mesh>

          {/* Hand (Glove or bare skin) */}
          <mesh position={[0, 0.04, 0.2]}>
            <boxGeometry args={[0.07, 0.05, 0.1]} />
            <meshStandardMaterial
              color={handColor}
              roughness={player.equipment.hasGloves ? 0.3 : 0.8}
            />
          </mesh>

          {/* Held item: Fire Extinguisher */}
          {player.inventory.hasFireExtinguisher && (
            <group position={[0, 0.08, 0.22]} rotation={[0.4, 0, 0]}>
              <mesh>
                <cylinderGeometry args={[0.065, 0.065, 0.38, 16]} />
                <meshStandardMaterial color="#DC2626" roughness={0.3} />
              </mesh>
              {/* Nozzle hose */}
              <mesh position={[0.05, 0.18, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.15]} />
                <meshStandardMaterial color="#0F172A" roughness={0.6} />
              </mesh>
            </group>
          )}

          {/* Held item: Trash item */}
          {player.inventory.isHoldingTrash && (
            <group position={[0, 0.08, 0.22]}>
              <mesh>
                <boxGeometry args={[0.08, 0.08, 0.08]} />
                <meshStandardMaterial color="#F59E0B" roughness={0.5} />
              </mesh>
            </group>
          )}
        </group>

        {/* Left Arm: Forearm & Hand */}
        <group position={[-0.22, 0.05, 0.05]} rotation={[-0.3, -0.2, 0.1]}>
          <mesh position={[0, -0.12, 0.1]}>
            <cylinderGeometry args={[0.04, 0.045, 0.28, 16]} />
            <meshStandardMaterial color={armColor} roughness={0.7} />
          </mesh>

          <mesh position={[0, 0.04, 0.2]}>
            <boxGeometry args={[0.07, 0.05, 0.1]} />
            <meshStandardMaterial
              color={handColor}
              roughness={player.equipment.hasGloves ? 0.3 : 0.8}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
};
