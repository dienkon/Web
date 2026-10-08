import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { playerCoords, useStore } from '../../../store/useStore';
import { soundManager } from '../../../audio/soundManager';

const FUME_HOOD_POS: [number, number, number] = [8.8, 0, -3.5];

export const InteractiveFumeHood: React.FC = () => {
  // Sash height: 0 (safe working height 30cm) to 1.0 (fully open 80cm)
  const [sashHeight, setSashHeight] = useState(0.25);
  const [isChemicalReactionActive, setIsChemicalReactionActive] = useState(true);
  const addError = useStore((s) => s.addError);
  const sashRef = useRef<THREE.Group>(null);
  const vaporPointsRef = useRef<THREE.Points>(null);

  // Check distance
  const dx = FUME_HOOD_POS[0] - playerCoords.position[0];
  const dz = FUME_HOOD_POS[2] - playerCoords.position[2];
  const isNear = Math.hypot(dx, dz) < 2.5;

  const isAlarm = sashHeight > 0.55;
  const faceVelocity = isAlarm ? 42 : 100;

  useFrame((_, delta) => {
    // Smoothly animate sash glass panel
    if (sashRef.current) {
      const targetY = 1.35 + sashHeight * 0.5;
      sashRef.current.position.y = THREE.MathUtils.lerp(
        sashRef.current.position.y,
        targetY,
        delta * 8
      );
    }

    // Swirling vapor particles inside chamber
    if (vaporPointsRef.current && isChemicalReactionActive) {
      const posAttr = vaporPointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      for (let i = 0; i < 40; i++) {
        // Move upward into exhaust duct
        arr[i * 3 + 1] += delta * 0.8;
        // Vortex swirl
        const angle = performance.now() * 0.003 + i;
        arr[i * 3] += Math.sin(angle) * delta * 0.2;
        arr[i * 3 + 2] += Math.cos(angle) * delta * 0.2;

        if (arr[i * 3 + 1] > 2.2) {
          // Reset at beaker base
          arr[i * 3] = (Math.random() - 0.5) * 0.3;
          arr[i * 3 + 1] = 0.95;
          arr[i * 3 + 2] = 0.05 + (Math.random() - 0.5) * 0.3;
        }
      }
      posAttr.needsUpdate = true;
    }
  });

  const toggleSash = () => {
    const next = sashHeight > 0.4 ? 0.2 : 0.8;
    setSashHeight(next);
    soundManager.play('snap');

    if (next > 0.55) {
      soundManager.play('error');
      addError('general_error', {
        penalty: 5,
        title: 'Cửa kính Fume Hood mở quá cao!',
        consequence: 'Vận tốc hút gió giảm xuống dưới 100 FPM, hơi độc tràn ra ngoài!',
      });
    }
  };

  return (
    <group position={FUME_HOOD_POS}>
      {/* 1. Safety Glass Sash (Vertical Sliding Panel) */}
      <group ref={sashRef} position={[0, 1.45, 0.52]}>
        {/* Laminated Glass Pane */}
        <mesh>
          <boxGeometry args={[2.18, 0.72, 0.02]} />
          <meshPhysicalMaterial
            transparent
            opacity={0.3}
            roughness={0.05}
            color="#BAE6FD"
            metalness={0.1}
          />
        </mesh>
        {/* Aluminum Sash Handle */}
        <mesh position={[0, -0.34, 0.015]}>
          <boxGeometry args={[2.15, 0.04, 0.02]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* 2. Toxic Vapor Swirling Particles (Inside Chamber) */}
      {isChemicalReactionActive && (
        <points ref={vaporPointsRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={40}
              array={new Float32Array(120).map((_, idx) => (idx % 3 === 1 ? 1.0 : (Math.random() - 0.5) * 0.4))}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.14}
            color={isAlarm ? '#EA580C' : '#94A3B8'}
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        </points>
      )}

      {/* 3. Beaker generating reaction vapors on black worktop */}
      <group position={[0, 0.92, 0.05]}>
        <mesh>
          <cylinderGeometry args={[0.07, 0.07, 0.16, 16]} />
          <meshPhysicalMaterial transparent opacity={0.3} color="#FFFFFF" />
        </mesh>
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.066, 0.066, 0.1, 16]} />
          <meshStandardMaterial color="#CA8A04" roughness={0.2} transparent opacity={0.8} />
        </mesh>
      </group>

      {/* 4. Digital Face Velocity Monitor */}
      <group position={[1.0, 2.1, 0.56]}>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[0.2, 0.08]} />
          <meshBasicMaterial color={isAlarm ? '#DC2626' : '#16A34A'} />
        </mesh>
      </group>

      {/* 5. Proximity Interactive Control */}
      {isNear && (
        <Html position={[0, 1.85, 0.6]} center distanceFactor={8}>
          <div className="flex flex-col items-center gap-1.5 pointer-events-auto select-none font-sans whitespace-nowrap">
            <div className="px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700 shadow-xl flex items-center gap-2 text-xs font-bold text-white">
              <span className={`w-2 h-2 rounded-full ${isAlarm ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
              <span>Vận tốc hút gió: </span>
              <span className={`font-mono ${isAlarm ? 'text-rose-400' : 'text-emerald-400'}`}>
                {faceVelocity} FPM
              </span>
              <span className="text-[10px] text-slate-400">
                {isAlarm ? '(NGUY HIỂM: DƯỚI 100 FPM)' : '(ĐẠT CHUẨN)'}
              </span>
            </div>

            <button
              onClick={toggleSash}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-xl flex items-center gap-2 backdrop-blur-md cursor-pointer transition-all active:scale-95 ${
                isAlarm
                  ? 'bg-rose-950/90 border-rose-400 text-rose-200 animate-pulse'
                  : 'bg-slate-900/90 border-cyan-400 text-cyan-200 hover:scale-105'
              }`}
            >
              <span>🚪</span>
              <span>{isAlarm ? 'Hạ cửa kính Sash về vạch an toàn (< 45cm)' : 'Mở rộng cửa kính Sash (> 50cm)'}</span>
              <span className="text-[10px] font-mono opacity-80">[Click]</span>
            </button>
          </div>
        </Html>
      )}
    </group>
  );
};
