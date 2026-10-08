import React, { useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, playerCoords } from '../../../store/useStore';
import { soundManager } from '../../../audio/soundManager';

const BENCH_POS: [number, number, number] = [4.2, 0.95, 2.2];

export const AcidDilutionStation: React.FC = () => {
  const tasks = useStore((s) => s.tasks);
  const completeTask = useStore((s) => s.completeTask);
  const startDialog = useStore((s) => s.startDialog);
  const player = useStore((s) => s.player);
  const addError = useStore((s) => s.addError);
  const setWaterEffect = useStore((s) => s.setWaterEffect);

  const [isOpen, setIsOpen] = useState(false);
  const [reactionState, setReactionState] = useState<'idle' | 'safe' | 'exploded'>('idle');

  const isAcidTaskDone = !!tasks.find((t) => t.id === 'task_inspect_acid')?.completed;

  // Check distance to station
  const dx = BENCH_POS[0] - playerCoords.position[0];
  const dz = BENCH_POS[2] - playerCoords.position[2];
  const isNear = Math.hypot(dx, dz) < 2.2;

  const handleCorrectChoice = () => {
    setReactionState('safe');
    soundManager.play('water');
    completeTask('task_inspect_acid');
    setTimeout(() => {
      setIsOpen(false);
      startDialog([
        'XUẤT SẮC! QUY TẮC VÀNG ĐÃ ĐƯỢC THỰC HIỆN ĐÚNG:',
        'Luôn luôn rót từ từ Axit vào Nước theo đũa thủy tinh và khuấy đều.',
        'Nhiệt lượng tỏa ra được lượng nước lớn hấp thụ và tản nhiệt an toàn.',
      ]);
    }, 1200);
  };

  const handleWrongChoice = () => {
    setReactionState('exploded');
    soundManager.play('fizz');
    soundManager.play('shatter');

    // Trigger visual acid splatter droplets on player goggles/screen
    setWaterEffect({ active: true, type: 'acid_splash' });
    setTimeout(() => {
      setWaterEffect({ active: false, type: 'acid_splash' });
    }, 4500);

    if (!player.equipment.hasGoggles) {
      addError('ppe_missing', { penalty: 15 });
    } else {
      addError('general_error', { penalty: 10 });
    }

    setTimeout(() => {
      setIsOpen(false);
      startDialog([
        'CẢNH BÁO NGUY HIỂM: BỎNG HÓA CHẤT CẤP ĐỘ 3!',
        'Tuyệt đối KHÔNG ĐƯỢC rót Nước vào Axit đặc!',
        'Khối lượng riêng của Axit H2SO4 nặng hơn nước, khi nước rót vào sẽ nổi lên trên và bị đun sôi tức thì đến >100°C, bắn axit đậm đặc tung tóe gây bỏng loét cực kỳ nghiêm trọng!',
      ]);
    }, 1400);
  };

  return (
    <group position={BENCH_POS}>
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
            transmission={0.8}
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
            transmission={0.8}
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

      {/* 5. 3D Interaction Prompt Badge */}
      {isNear && !isOpen && (
        <Html position={[0, 0.45, 0]} center distanceFactor={8}>
          <button
            onClick={() => setIsOpen(true)}
            className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-cyan-400/50 shadow-xl text-white text-xs font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Thực hành Pha loãng Axit H₂SO₄</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-[10px] font-extrabold">
              Phím E / Click
            </span>
          </button>
        </Html>
      )}

      {/* 6. Interactive Modal Interface */}
      {isOpen && (
        <Html center zIndexRange={[1000, 0]}>
          <div className="fixed inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 pointer-events-auto select-none font-sans">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 text-white">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🧪</span>
                  <h3 className="text-base font-black uppercase text-cyan-400">
                    Quy Trình Pha Loãng Axit Sunfuric (H₂SO₄)
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Trên bàn có 1 cốc đong Axit $H_2SO_4$ 98% đậm đặc và 1 cốc Nước cất tinh khiết. Em hãy chọn thao tác chuẩn xác để tiến hành pha loãng dung dịch an toàn:
              </p>

              <div className="grid grid-cols-1 gap-3 pt-2">
                <button
                  onClick={handleCorrectChoice}
                  className="p-4 rounded-xl bg-slate-800/90 border border-emerald-500/50 hover:bg-emerald-950/40 hover:border-emerald-400 text-left transition-all flex flex-col gap-1.5 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-400 group-hover:text-emerald-300">
                      Phương án A (Quy tắc Vàng)
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                      Khuyến nghị
                    </span>
                  </div>
                  <span className="text-xs text-slate-300">
                    Rót TỪ TỪ Axit vào Nước theo đũa thủy tinh và khuấy đều liên tục.
                  </span>
                </button>

                <button
                  onClick={handleWrongChoice}
                  className="p-4 rounded-xl bg-slate-800/90 border border-rose-500/30 hover:bg-rose-950/40 hover:border-rose-400 text-left transition-all flex flex-col gap-1.5 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-rose-400 group-hover:text-rose-300">
                      Phương án B
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                      Cực kỳ nguy hiểm
                    </span>
                  </div>
                  <span className="text-xs text-slate-300">
                    Rót trực tiếp Nước vào cốc Axit đặc cho nhanh nguội.
                  </span>
                </button>
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};
