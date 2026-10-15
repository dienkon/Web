import { useTaskProximity } from './useTaskProximity';
import React, { useState } from 'react';
import { SceneHtml as Html } from '../SceneHtml';
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
    textColor: 'text-red-700',
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
    textColor: 'text-purple-700',
    description: 'Môi trường trung tính hoàn hảo. Giấy quỳ tím giữ nguyên màu Tím ban đầu.',
  },
  {
    id: 'sample_caoh2',
    name: 'Nước vôi trong',
    formula: 'Ca(OH)₂',
    pH: 12.0,
    type: 'base',
    paperColor: '#2563EB', // Deep Royal Blue
    textColor: 'text-blue-700',
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
  const isNear = useTaskProximity(BENCH_POS, 2.2, []);

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
    <group userData={{labItem:{title:'Bộ thử chỉ thị pH',kind:'ph'}}} position={BENCH_POS}>
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
            className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-slate-100/80 backdrop-blur-none border border-purple-400/50 shadow-sm text-slate-800 text-xs font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>Thí nghiệm Thử độ pH Bằng Quỳ Tím</span>
            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-slate-800 font-mono text-[10px] font-extrabold">
              Click
            </span>
          </button>
        </Html>
      )}

      {/* Interactive Modal */}
      {isOpen && (
        <Html center zIndexRange={[1000, 0]}>
          <div className="fixed inset-0 flex items-center justify-center bg-slate-100/80 backdrop-blur-none p-4 pointer-events-auto select-none font-sans">
            <div className="bg-white border border-slate-200/80 rounded-2xl max-w-xl w-full p-6 shadow-sm flex flex-col gap-5 text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📄</span>
                  <h3 className="text-base font-black uppercase text-purple-700">
                    Bàn Thử Độ pH & Chỉ Thị Màu Quỳ Tím
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-50 text-slate-600 hover:text-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-600">
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
                          ? 'bg-purple-100/50 border-purple-400 shadow-md'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-500'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800">{s.name}</div>
                        <div className="text-[11px] font-mono text-slate-600">{s.formula}</div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                          isTested ? 'bg-emerald-100/20 text-emerald-700' : 'bg-slate-50 text-slate-600'
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
                <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Kết quả nhúng Giấy quỳ tím:</span>
                    <span className={`text-sm font-black font-mono ${activeSample.textColor}`}>
                      pH = {activeSample.pH}
                    </span>
                  </div>

                  {/* Animated Litmus Strip */}
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-7 rounded border border-slate-200 bg-purple-100/40 flex items-center justify-center text-[10px] font-mono text-purple-700">
                      Gốc quỳ
                    </div>
                    <div className="text-slate-500 font-bold">➔</div>
                    <div
                      className="flex-1 h-7 rounded border border-white/20 shadow-inner flex items-center justify-center text-xs font-extrabold text-slate-800 transition-colors duration-500"
                      style={{ backgroundColor: activeSample.paperColor }}
                    >
                      Đổi sang màu {activeSample.paperColor === '#EF4444' ? 'Đỏ tươi' : activeSample.paperColor === '#2563EB' ? 'Xanh thẫm' : activeSample.paperColor === '#F97316' ? 'Cam đỏ' : 'Tím'}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-100/80 p-2.5 rounded-lg border border-slate-200">
                    {activeSample.description}
                  </p>
                </div>
              )}

              {/* Progress Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs text-slate-600">
                <span>
                  Tiến độ: <strong className="text-slate-800">{testedIds.length}/{SAMPLES.length}</strong> mẫu
                </span>
                {testedIds.length === SAMPLES.length && (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
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
