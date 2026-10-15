import React, { useRef } from 'react';
import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../../store/useStore';

export const LabAtmosphere: React.FC = () => {
  const quality = useStore((state) => state.settings.graphicsQuality);
  const reduceMotion = useStore((state) => state.settings.reduceMotion);
  const view = useStore((state) => state.view);
  const haloRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!haloRef.current || reduceMotion) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.35) * 0.045;
    haloRef.current.scale.setScalar(pulse);
    haloRef.current.rotation.z = state.clock.elapsedTime * 0.08;
  });

  if (quality !== 'high' && quality !== 'ultra') return null;

  return (
    <group>
      <Sparkles
        count={quality === 'high' ? 70 : 36}
        scale={[18, 3.2, 13]}
        position={[0, 1.7, 0]}
        size={quality === 'high' ? 1.35 : 1}
        speed={reduceMotion ? 0 : 0.16}
        opacity={0.2}
        color="#b6f3ff"
        noise={[1, 0.35, 1]}
      />

      {view === 'start' && (
        <group position={[1.2, 0.016, 0]}>
          <group ref={haloRef} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh>
              <ringGeometry args={[0.68, 0.72, 64]} />
              <meshBasicMaterial color="#67e8f9" transparent opacity={0.72} toneMapped={false} />
            </mesh>
            <mesh>
              <ringGeometry args={[0.88, 0.895, 64]} />
              <meshBasicMaterial color="#a5f3fc" transparent opacity={0.25} toneMapped={false} />
            </mesh>
          </group>
          <pointLight position={[0, 1.2, 0.8]} intensity={1.1} distance={4.5} color="#67e8f9" />
        </group>
      )}
    </group>
  );
};
