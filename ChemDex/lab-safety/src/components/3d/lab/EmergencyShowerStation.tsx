import React, { useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { playerCoords, useStore } from '../../../store/useStore';
import { soundManager } from '../../../audio/soundManager';

const SHOWER_POS: [number, number, number] = [-9.2, 0, -4.0];
const WATER_PARTICLES = 160;

export const EmergencyShowerStation: React.FC = () => {
  const [isShowerActive, setIsShowerActive] = useState(false);
  const [isEyewashActive, setIsEyewashActive] = useState(false);
  const startDialog = useStore((s) => s.startDialog);
  const setWaterEffect = useStore((s) => s.setWaterEffect);

  const showerPointsRef = useRef<THREE.Points>(null);
  const eyewashPointsRef = useRef<THREE.Points>(null);
  const pullRodRef = useRef<THREE.Group>(null);

  // Check distance to station
  const dx = SHOWER_POS[0] - playerCoords.position[0];
  const dz = SHOWER_POS[2] - playerCoords.position[2];
  const isNear = Math.hypot(dx, dz) < 2.2;

  // Particle buffers for overhead shower
  const showerParticles = useMemo(() => {
    const pos = new Float32Array(WATER_PARTICLES * 3);
    const vel = new Float32Array(WATER_PARTICLES);
    for (let i = 0; i < WATER_PARTICLES; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.4;
      pos[i * 3 + 1] = Math.random() * 2.4;
      pos[i * 3 + 2] = 0.4 + (Math.random() - 0.5) * 0.4;
      vel[i] = 4.0 + Math.random() * 2.5;
    }
    return { pos, vel };
  }, []);

  // Frame update for falling shower water & eyewash jets
  useFrame((_, delta) => {
    // Overhead Shower Stream
    if (isShowerActive && showerPointsRef.current) {
      const posAttr = showerPointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      for (let i = 0; i < WATER_PARTICLES; i++) {
        arr[i * 3 + 1] -= showerParticles.vel[i] * delta;
        // Cone expansion as water falls
        const fallRatio = Math.max(0, 1 - arr[i * 3 + 1] / 2.4);
        const radius = 0.08 + fallRatio * 0.45;

        if (arr[i * 3 + 1] <= 0.02) {
          // Reset to shower head top
          arr[i * 3 + 1] = 2.4;
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * 0.1;
          arr[i * 3] = Math.cos(angle) * r;
          arr[i * 3 + 2] = 0.4 + Math.sin(angle) * r;
        } else {
          // Spread outward
          arr[i * 3] += (Math.random() - 0.5) * 0.02 * fallRatio;
          arr[i * 3 + 2] += (Math.random() - 0.5) * 0.02 * fallRatio;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Pull rod handle animation
    if (pullRodRef.current) {
      const targetY = isShowerActive ? -0.15 : 0;
      pullRodRef.current.position.y = THREE.MathUtils.lerp(
        pullRodRef.current.position.y,
        targetY,
        delta * 12
      );
    }
  });

  const toggleShower = () => {
    const next = !isShowerActive;
    setIsShowerActive(next);
    setIsEyewashActive(false);
    setWaterEffect({ active: next, type: 'shower' });
    soundManager.play('water');
    if (next) {
      setTimeout(() => {
        startDialog([
          'QUY TRÌNH TẮM KHẨN CẤP ĐẠT CHUẨN:',
          '1. Lập tức cởi bỏ quần áo nhiễm hóa chất.',
          '2. Xả nước liên tục tối thiểu 15 PHÚT.',
          '3. Không thoa bất kỳ loại mỡ hoặc hóa chất trung hòa nào lên vết bỏng khi chưa có chỉ định y tế.',
        ]);
      }, 1500);
    }
  };

  const toggleEyewash = () => {
    const next = !isEyewashActive;
    setIsEyewashActive(next);
    setIsShowerActive(false);
    setWaterEffect({ active: next, type: 'eyewash' });
    soundManager.play('water');
    if (next) {
      setTimeout(() => {
        startDialog([
          'QUY TRÌNH RỬA MẮT KHẨN CẤP ĐẠT CHUẨN:',
          '1. Dùng ngón tay giữ mí mắt luôn mở to.',
          '2. Đưa mắt sát tia nước sục khí vô trùng.',
          '3. Đảo nhãn cầu liên tục để nước rửa sạch mọi ngóc ngách trong 15 PHÚT.',
        ]);
      }, 1500);
    }
  };

  return (
    <group position={SHOWER_POS}>
      {/* Overhead Animated Shower Stream */}
      {isShowerActive && (
          <group>
            <points ref={showerPointsRef}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={WATER_PARTICLES}
                  array={showerParticles.pos}
                  itemSize={3}
                />
              </bufferGeometry>
              <pointsMaterial
                size={0.06}
                color="#BAE6FD"
                transparent
                opacity={0.65}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </points>
            {/* Splash Ring on floor grate */}
            <mesh position={[0, 0.02, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.2, 0.65, 32]} />
              <meshBasicMaterial color="#38BDF8" transparent opacity={0.4} />
            </mesh>
          </group>
        )}

        {/* Dual Eyewash Parabolic Spray Jets */}
        {isEyewashActive && (
          <group position={[0, 1.15, 0.35]}>
            <mesh position={[-0.05, 0.08, 0]}>
              <cylinderGeometry args={[0.02, 0.01, 0.16, 12]} />
              <meshStandardMaterial color="#38BDF8" transparent opacity={0.7} />
            </mesh>
            <mesh position={[0.05, 0.08, 0]}>
              <cylinderGeometry args={[0.02, 0.01, 0.16, 12]} />
              <meshStandardMaterial color="#38BDF8" transparent opacity={0.7} />
            </mesh>
          </group>
        )}

        {/* Pull Rod Animation Node */}
        <group ref={pullRodRef} position={[0.4, 2.4 - 0.65, 0.4]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 1.1]} />
            <meshStandardMaterial color="#EAB308" metalness={0.8} />
          </mesh>
        </group>

        {/* Proximity HTML Interactive Controls */}
        {isNear && (
          <Html position={[0, 1.8, 0.4]} center distanceFactor={8}>
            <div className="flex flex-col items-center gap-2 pointer-events-auto select-none font-sans whitespace-nowrap">
              <button
                onClick={toggleShower}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-xl flex items-center gap-2 backdrop-blur-md cursor-pointer transition-all active:scale-95 ${
                  isShowerActive
                    ? 'bg-rose-950/80 border-rose-400 text-rose-200'
                    : 'bg-emerald-950/80 border-emerald-400 text-emerald-200 hover:scale-105'
                }`}
              >
                <span>🚿</span>
                <span>{isShowerActive ? 'Đóng vòi Tắm Khẩn Cấp' : 'Kéo cần Tắm Khẩn Cấp'}</span>
                <span className="text-[10px] font-mono opacity-80">[Click]</span>
              </button>

              <button
                onClick={toggleEyewash}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-xl flex items-center gap-2 backdrop-blur-md cursor-pointer transition-all active:scale-95 ${
                  isEyewashActive
                    ? 'bg-rose-950/80 border-rose-400 text-rose-200'
                    : 'bg-cyan-950/80 border-cyan-400 text-cyan-200 hover:scale-105'
                }`}
              >
                <span>👁</span>
                <span>{isEyewashActive ? 'Tắt vòi Rửa Mắt' : 'Kích hoạt Bồn Rửa Mắt'}</span>
                <span className="text-[10px] font-mono opacity-80">[Click]</span>
              </button>
            </div>
          </Html>
        )}
      </group>
  );
};
