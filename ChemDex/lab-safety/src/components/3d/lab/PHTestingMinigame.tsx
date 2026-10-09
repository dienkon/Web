import React, { useState } from 'react';
import { Html } from '@react-three/drei';
import { useStore, playerCoords } from '../../../store/useStore';
import { soundManager } from '../../../audio/soundManager';

const BENCH_POS: [number, number, number] = [-4.2, 0.95, 2.2];

interface ChemicalSample {
  id: string;
  name: string;
  formula: string;
  pH: number;
  type: 'acid' | 'neutral' | 'base';
  paperColor: string;
  textColor: string;
  description: string;
}

const SAMPLES: ChemicalSample[] = [
  {
    id: 'sample_hcl',
    name: 'Axit Clohidric',
    formula: 'HCl (0.1M)',
    pH: 1,
    type: 'acid',
    paperColor: '#EF4444', // Bright Red
    textColor: 'text-red-400',
    description: 'Axit vô cơ mạnh. Giấy quỳ tím chuyển sang màu Đỏ rực tức thì. Có tính ăn mòn kim loại và gây bỏng da.',
  },
  {
    id: 'sample_acetic',
    name: 'Axit Axetic (Giấm ăn)',
    formula: 'CH₃COOH (5%)',
    pH: 3.5,
    type: 'acid',
    paperColor: '#F97316', // Orange Red
    textColor: 'text-orange-400',
    description: 'Axit hữu cơ yếu. Giấy quỳ tím chuyển sang màu Đỏ cam / Hồng nhạt. Mùi giấm chua đặc trưng.',
  },
  {
    id: 'sample_water',
    name: 'Nước cất tinh khiết',
    formula: 'H₂O',
    pH: 7.0,
    type: 'neutral',
    paperColor: '#A855F7', // Original Litmus Purple
    textColor: 'text-purple-400',
    description: 'Môi trường trung tính hoàn hảo. Giấy quỳ tím giữ nguyên màu Tím ban đầu.',
  },
  {
    id: 'sample_caoh2',
    name: 'Nước vôi trong',
    formula: 'Ca(OH)₂',
    pH: 12.0,
    type: 'base',
    paperColor: '#2563EB', // Deep Royal Blue
    textColor: 'text-blue-400',
    description: 'Dung dịch Bazơ (Kiềm). Giấy quỳ tím chuyển sang màu Xanh thẫm. Gây nhờn tay và ăn mòn mô hữu cơ.',
  },
];

export const PHTestingMinigame: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSample, setActiveSample] = useState<ChemicalSample | null>(null);
  const [testedIds, setTestedIds] = useState<string[]>([]);

  // Check distance to station
  const dx = BENCH_POS[0] - playerCoords.position[0];
  const dz = BENCH_POS[2] - playerCoords.position[2];
  const isNear = Math.hypot(dx, dz) < 2.2;

  const handleTestSample = (sample: ChemicalSample) => {
    setActiveSample(sample);
    soundManager.play('pop');
    if (!testedIds.includes(sample.id)) {
      const next = [...testedIds, sample.id];
      setTestedIds(next);
      if (next.length === SAMPLES.length) {
        soundManager.play('success');
      }
    }
  };

  return (
    <group position={BENCH_POS}>
      {/* 4 Test Tube / Beaker Displays on Table */}
      {SAMPLES.map((s, idx) => {
        const offset = (idx - 1.5) * 0.22;
        return (
          <group key={s.id} position={[offset, 0.1, 0]}>
            {/* Glass Beaker */}
            <mesh>
              <cylinderGeometry args={[0.065, 0.065, 0.18, 16]} />
              <meshPhysicalMaterial
                transparent
                opacity={0.3}
                roughness={0.1}
                color="#FFFFFF"
                transmission={0.85}
              />
            </mesh>
            {/* Liquid */}
            <mesh position={[0, -0.02, 0]}>
              <cylinderGeometry args={[0.062, 0.062, 0.12, 16]} />
              <meshStandardMaterial
                color={s.type === 'base' ? '#BFDBFE' : s.type === 'neutral' ? '#E0F2FE' : '#FEF08A'}
                transparent
                opacity={0.65}
              />
            </mesh>
          </group>
        );
      })}

      {/* Litmus Paper Tray */}
      <mesh position={[0, 0.02, 0.18]}>
        <boxGeometry args={[0.4, 0.02, 0.12]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>

      {/* 3D Prompt Badge */}
      {isNear && !isOpen && (
        <Html position={[0, 0.45, 0]} center distanceFactor={8}>
          <button
            onClick={() => setIsOpen(true)}
            className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-purple-400/50 shadow-xl text-white text-xs font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>Thí nghiệm Thử độ pH Bằng Quỳ Tím</span>
            <span className="px-1.5 py-0.5 rounded bg-purple-500 text-white font-mono text-[10px] font-extrabold">
              Click
            </span>
          </button>
        </Html>
      )}

      {/* Interactive Modal */}
      {isOpen && (
        <Html center zIndexRange={[1000, 0]}>
          <div className="fixed inset-0 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 pointer-events-auto select-none font-sans">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col gap-5 text-white">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📄</span>
                  <h3 className="text-base font-black uppercase text-purple-400">
                    Bàn Thử Độ pH & Chỉ Thị Màu Quỳ Tím
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-300">
                Nhấp vào từng mẫu hóa chất bên dưới để nhúng giấy quỳ tím và quan sát phản ứng đổi màu chỉ thị pH:
              </p>

              {/* Sample Selector Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {SAMPLES.map((s) => {
                  const isTested = testedIds.includes(s.id);
                  const isSelected = activeSample?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleTestSample(s)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-purple-950/50 border-purple-400 shadow-md'
                          : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{s.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{s.formula}</div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                          isTested ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {isTested ? 'Đã thử' : 'Chưa thử'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Test Visualizer */}
              {activeSample && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-700 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Kết quả nhúng Giấy quỳ tím:</span>
                    <span className={`text-sm font-black font-mono ${activeSample.textColor}`}>
                      pH = {activeSample.pH}
                    </span>
                  </div>

                  {/* Animated Litmus Strip */}
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-7 rounded border border-slate-600 bg-purple-500/40 flex items-center justify-center text-[10px] font-mono text-purple-200">
                      Gốc quỳ
                    </div>
                    <div className="text-slate-500 font-bold">➔</div>
                    <div
                      className="flex-1 h-7 rounded border border-white/20 shadow-inner flex items-center justify-center text-xs font-extrabold text-white transition-colors duration-500"
                      style={{ backgroundColor: activeSample.paperColor }}
                    >
                      Đổi sang màu {activeSample.paperColor === '#EF4444' ? 'Đỏ tươi' : activeSample.paperColor === '#2563EB' ? 'Xanh thẫm' : activeSample.paperColor === '#F97316' ? 'Cam đỏ' : 'Tím'}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    {activeSample.description}
                  </p>
                </div>
              )}

              {/* Progress Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
                <span>
                  Tiến độ: <strong className="text-white">{testedIds.length}/{SAMPLES.length}</strong> mẫu
                </span>
                {testedIds.length === SAMPLES.length && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    ✓ Đã hoàn thành bộ thử nghiệm pH! (+15 điểm)
                  </span>
                )}
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};
