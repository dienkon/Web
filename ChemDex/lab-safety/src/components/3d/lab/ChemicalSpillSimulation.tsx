import React, { useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { playerCoords, useStore } from '../../../store/useStore';
import { soundManager } from '../../../audio/soundManager';

const SPILL_POS: [number, number, number] = [2.5, 0.015, 1.0];

type SpillState = 'hazard' | 'cones_placed' | 'neutralized' | 'cleaned';

export const ChemicalSpillSimulation: React.FC = () => {
  const [spillState, setSpillState] = useState<SpillState>('hazard');
  const [neutralizeProgress, setNeutralizeProgress] = useState(0); // 0 to 100%

  const vaporPointsRef = useRef<THREE.Points>(null);
  const foamRef = useRef<THREE.Group>(null);

  const currentPhase = useStore((s) => s.currentPhase);
  const tasks = useStore((s) => s.tasks);
  const completeTask = useStore((s) => s.completeTask);
  const startDialog = useStore((s) => s.startDialog);
  const player = useStore((s) => s.player);
  const addError = useStore((s) => s.addError);

  // Check distance to puddle
  const dx = SPILL_POS[0] - playerCoords.position[0];
  const dz = SPILL_POS[2] - playerCoords.position[2];
  const distance = Math.hypot(dx, dz);
  const isNear = distance < 2.4;

  // Acid vapor particles
  const vaporCount = 35;
  const vaporPositions = useMemo(() => {
    const pos = new Float32Array(vaporCount * 3);
    for (let i = 0; i < vaporCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.9;
      pos[i * 3 + 1] = Math.random() * 0.4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.9;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    // Animate rising toxic vapors if still active hazard
    if (vaporPointsRef.current && (spillState === 'hazard' || spillState === 'cones_placed')) {
      const posAttr = vaporPointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      for (let i = 0; i < vaporCount; i++) {
        arr[i * 3 + 1] += delta * 0.45;
        arr[i * 3] += (Math.random() - 0.5) * delta * 0.1;
        arr[i * 3 + 2] += (Math.random() - 0.5) * delta * 0.1;

        if (arr[i * 3 + 1] > 0.8) {
          arr[i * 3] = (Math.random() - 0.5) * 0.9;
          arr[i * 3 + 1] = 0.05;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 0.9;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Animate bubbling foam when neutralizing
    if (foamRef.current && spillState === 'cones_placed' && neutralizeProgress > 0) {
      foamRef.current.scale.setScalar(
        0.5 + Math.sin(performance.now() * 0.008) * 0.05 + (neutralizeProgress / 100) * 0.5
      );
    }
  });

  // Action 1: Place Safety Warning Cones
  const handlePlaceCones = () => {
    setSpillState('cones_placed');
    soundManager.play('snap');
    startDialog([
      'BƯỚC 1: CÔ LẬP HIỆN TRƯỜNG SỰ CỐ!',
      'Đã đặt 3 cọc tiêu an toàn màu vàng xung quanh vũng hóa chất.',
      'Cảnh báo các bạn học sinh xung quanh không bước vào khu vực nguy hiểm trơn trượt và ăn mòn.',
    ]);
  };

  // Action 2: Sprinkle Neutralizing Powder (NaHCO3)
  const handleSprinklePowder = () => {
    if (!player.equipment.hasGloves) {
      addError('ppe_missing', {
        penalty: 10,
        title: 'Chưa đeo găng tay khi xử lý hóa chất tràn!',
        consequence: 'Bột hóa chất và dung dịch axit bắn dính làm bỏng da tay!',
      });
      return;
    }

    soundManager.play('fizz');
    const nextProg = Math.min(100, neutralizeProgress + 35);
    setNeutralizeProgress(nextProg);

    if (nextProg >= 100) {
      setSpillState('neutralized');
      completeTask('task_spill_neutralize');
      soundManager.play('success');
      startDialog([
        'BƯỚC 2: TRUNG HÒA HÓA CHẤT AN TOÀN!',
        'Đã rải bột Sodium Bicarbonate (NaHCO3) từ rìa ngoài vào tâm vũng axit.',
        'Phản ứng trung hòa tạo muối, nước và sủi bọt khí CO2 không độc. Môi trường đã chuyển sang trung tính an toàn (pH ~ 7.0)!',
      ]);
    }
  };

  // Action 3: Wipe & Scoop up into Hazmat Bag
  const handleWipeAndCollect = () => {
    setSpillState('cleaned');
    soundManager.play('complete');
    completeTask('task_spill_wipe');
    startDialog([
      'BƯỚC 3: THU GOM & VỆ SINH MẶT SÀN!',
      'Dùng xẻng gạt nhựa và giấy thấm gom toàn bộ bã muối trung hòa vào túi chất thải nguy hại màu vàng.',
      'Lau sạch sàn bằng nước sạch. Hãy mang túi rác nguy hại đến thùng rác phân loại ở góc Đông Nam!',
    ]);
  };

  // Only active in Phase 3 or when relevant
  if (currentPhase < 3 && spillState === 'cleaned') return null;

  return (
    <group position={SPILL_POS}>
      {/* 1. Chemical Spill Puddle on Floor */}
      {spillState !== 'cleaned' && (
        <group>
          {/* Main liquid puddle mesh */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.005, 0]}>
            <circleGeometry args={[0.7, 32]} />
            <meshStandardMaterial
              color={spillState === 'neutralized' ? '#94A3B8' : '#D97706'}
              roughness={0.08}
              metalness={0.1}
              transparent
              opacity={spillState === 'neutralized' ? 0.85 : 0.75}
            />
          </mesh>

          {/* Secondary fluid splash lobes */}
          <mesh rotation={[-Math.PI / 2, 0, 0.5]} position={[0.25, 0.006, 0.2]}>
            <circleGeometry args={[0.35, 20]} />
            <meshStandardMaterial
              color={spillState === 'neutralized' ? '#94A3B8' : '#EA580C'}
              roughness={0.08}
              transparent
              opacity={0.7}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, -0.8]} position={[-0.3, 0.006, -0.15]}>
            <circleGeometry args={[0.4, 20]} />
            <meshStandardMaterial
              color={spillState === 'neutralized' ? '#94A3B8' : '#B45309'}
              roughness={0.08}
              transparent
              opacity={0.7}
            />
          </mesh>

          {/* Neutralizing White Foam Ring (NaHCO3 bubbling) */}
          {neutralizeProgress > 0 && (
            <group ref={foamRef} position={[0, 0.015, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.2, 0.65, 32]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.9} transparent opacity={0.8} />
              </mesh>
              {/* Foam Bubbles */}
              <mesh position={[0.1, 0.02, 0.1]}>
                <sphereGeometry args={[0.04, 12, 12]} />
                <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
              </mesh>
              <mesh position={[-0.15, 0.02, -0.1]}>
                <sphereGeometry args={[0.05, 12, 12]} />
                <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
              </mesh>
            </group>
          )}

          {/* Rising Toxic Fume Particles */}
          {(spillState === 'hazard' || spillState === 'cones_placed') && (
            <points ref={vaporPointsRef}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={vaporCount}
                  array={vaporPositions}
                  itemSize={3}
                />
              </bufferGeometry>
              <pointsMaterial
                size={0.08}
                color="#FBBF24"
                transparent
                opacity={0.45}
                depthWrite={false}
              />
            </points>
          )}
        </group>
      )}

      {/* 2. Perimeter Warning Cones (Visible once placed) */}
      {spillState !== 'hazard' && (
        <group>
          {/* Cone 1 */}
          <group position={[-0.9, 0, -0.6]}>
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[0.22, 0.04, 0.22]} />
              <meshStandardMaterial color="#F59E0B" />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
              <coneGeometry args={[0.09, 0.36, 16]} />
              <meshStandardMaterial color="#F59E0B" roughness={0.3} />
            </mesh>
            {/* Reflective White Stripe */}
            <mesh position={[0, 0.18, 0]}>
              <cylinderGeometry args={[0.065, 0.075, 0.08, 16]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
          </group>

          {/* Cone 2 */}
          <group position={[0.95, 0, -0.4]}>
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[0.22, 0.04, 0.22]} />
              <meshStandardMaterial color="#F59E0B" />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
              <coneGeometry args={[0.09, 0.36, 16]} />
              <meshStandardMaterial color="#F59E0B" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.18, 0]}>
              <cylinderGeometry args={[0.065, 0.075, 0.08, 16]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
          </group>

          {/* Cone 3 */}
          <group position={[0, 0, 0.95]}>
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[0.22, 0.04, 0.22]} />
              <meshStandardMaterial color="#F59E0B" />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
              <coneGeometry args={[0.09, 0.36, 16]} />
              <meshStandardMaterial color="#F59E0B" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.18, 0]}>
              <cylinderGeometry args={[0.065, 0.075, 0.08, 16]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
          </group>
        </group>
      )}

      {/* 3. Proximity Interactive HUD Overlay */}
      {isNear && spillState !== 'cleaned' && (
        <Html position={[0, 0.6, 0]} center distanceFactor={7}>
          <div className="flex flex-col items-center gap-2 pointer-events-auto select-none font-sans whitespace-nowrap">
            {spillState === 'hazard' && (
              <button
                onClick={handlePlaceCones}
                className="px-4 py-2 rounded-full text-xs font-bold border border-amber-400 bg-amber-950/90 text-amber-200 shadow-2xl flex items-center gap-2 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 transition-all animate-pulse"
              >
                <span>⚠️</span>
                <span>Đặt cọc tiêu cảnh báo cô lập vũng tràn</span>
                <span className="text-[10px] font-mono text-amber-400">[Click]</span>
              </button>
            )}

            {spillState === 'cones_placed' && (
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={handleSprinklePowder}
                  className="px-4 py-2 rounded-full text-xs font-bold border border-cyan-400 bg-slate-950/90 text-cyan-200 shadow-2xl flex items-center gap-2 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 transition-all"
                >
                  <span>🧪</span>
                  <span>Rải bột trung hòa NaHCO3 ({neutralizeProgress}%)</span>
                  <span className="text-[10px] font-mono text-cyan-400">[Click liên tục]</span>
                </button>
                <div className="w-48 h-1.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                    style={{ width: `${neutralizeProgress}%` }}
                  />
                </div>
              </div>
            )}

            {spillState === 'neutralized' && (
              <button
                onClick={handleWipeAndCollect}
                className="px-4 py-2 rounded-full text-xs font-bold border border-emerald-400 bg-emerald-950/90 text-emerald-200 shadow-2xl flex items-center gap-2 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 transition-all animate-bounce"
              >
                <span>🧹</span>
                <span>Lau dọn & Thu gom vào túi rác nguy hại</span>
                <span className="text-[10px] font-mono text-emerald-400">[Click]</span>
              </button>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
