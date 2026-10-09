import React, { useState } from 'react';
import { Html } from '@react-three/drei';
import { useStore, playerCoords } from '../../../store/useStore';
import { soundManager } from '../../../audio/soundManager';

export interface HazardDefinition {
  id: string;
  title: string;
  position: [number, number, number];
  question: string;
  options: { text: string; correct: boolean; explanation: string }[];
  flagColor: string;
}

const HAZARDS: HazardDefinition[] = [
  {
    id: 'hazard_unlabeled_chemical',
    title: 'Lọ hóa chất không dán nhãn',
    position: [-3.5, 0.95, -2.0],
    question: 'Lọ thủy tinh chứa dung dịch không màu để trên bàn nhưng không có nhãn mác. Vi phạm quy tắc an toàn nào?',
    options: [
      {
        text: 'Mọi hóa chất bắt buộc phải có nhãn tên, nồng độ và biểu tượng cảnh báo GHS.',
        correct: true,
        explanation: 'Chính xác! Dùng nhầm hóa chất không nhãn có thể gây nổ hoặc ngộ độc chết người.',
      },
      {
        text: 'Có thể dùng mũi ngửi trực tiếp để nhận biết dung dịch bên trong.',
        correct: false,
        explanation: 'Sai lầm! Tuyệt đối không được ngửi hoặc nếm hóa chất lạ.',
      },
      {
        text: 'Không sao nếu người dùng tự nhớ được hóa chất bên trong.',
        correct: false,
        explanation: 'Sai lầm! Trí nhớ cá nhân không thể đảm bảo an toàn cho toàn bộ phòng lab.',
      },
    ],
    flagColor: '#F59E0B',
  },
  {
    id: 'hazard_pointing_test_tube',
    title: 'Miệng ống nghiệm đun hướng về phía người',
    position: [3.5, 0.95, -2.0],
    question: 'Khi đun ống nghiệm chứa chất lỏng trên ngọn lửa, hướng miệng ống nghiệm như thế nào là đúng?',
    options: [
      {
        text: 'Hướng miệng ống nghiệm vào mặt mình để quan sát rõ phản ứng.',
        correct: false,
        explanation: 'Sai! Khi sôi trào dung dịch sẽ bắn thẳng vào mặt gây bỏng hóa chất nặng.',
      },
      {
        text: 'Hướng miệng ống nghiệm về phía tường hoặc khu vực không có người.',
        correct: true,
        explanation: 'Chính xác! Luôn hướng miệng ống nghiệm về phía an toàn không có người.',
      },
      {
        text: 'Đậy chặt nắp nút cao su rồi đun sôi trên lửa.',
        correct: false,
        explanation: 'Sai! Áp suất hơi tăng cao sẽ làm nổ vỡ ống nghiệm thành mảnh sắc nhọn.',
      },
    ],
    flagColor: '#EF4444',
  },
  {
    id: 'hazard_broken_glass',
    title: 'Mảnh thủy tinh vỡ trong sọt rác giấy',
    position: [-6.5, 0.15, 5.5],
    question: 'Ống đong thủy tinh bị vỡ nứt, cần thu gom và xử lý như thế nào?',
    options: [
      {
        text: 'Vứt chung vào thùng rác sinh hoạt thông thường cho tiện.',
        correct: false,
        explanation: 'Sai! Mảnh thủy tinh sắc nhọn sẽ cắt rách túi và gây thương tích cho lao công.',
      },
      {
        text: 'Dùng tay nhặt từng mảnh vụn rồi bỏ vào túi nilon mỏng.',
        correct: false,
        explanation: 'Sai! Phải dùng chổi và xẻng hót, tuyệt đối không dùng tay trần nhặt vụn kính.',
      },
      {
        text: 'Dùng chổi quét gom vào thùng rác kim loại/hộp cứng chuyên dụng đựng vật sắc nhọn.',
        correct: true,
        explanation: 'Chính xác! Thủy tinh vỡ phải vào thùng cứng chuyên dụng (Sharps Bin).',
      },
    ],
    flagColor: '#3B82F6',
  },
  {
    id: 'hazard_alcohol_near_fire',
    title: 'Chai cồn 96° để sát ngọn lửa',
    position: [-3.5, 0.95, 2.0],
    question: 'Chai cồn Ethanol 96° dễ cháy được đặt ngay cạnh đèn cồn đang cháy. Nguy cơ nào xảy ra?',
    options: [
      {
        text: 'Hơi cồn bắt lửa bốc cháy và phát nổ chai dung môi.',
        correct: true,
        explanation: 'Chính xác! Dung môi hữu cơ dễ bay hơi phải cách xa nguồn lửa tối thiểu 1.5m.',
      },
      {
        text: 'Cồn sẽ bay hơi làm mát đèn cồn, rất an toàn.',
        correct: false,
        explanation: 'Sai! Ethanol là chất cực kỳ dễ cháy nổ.',
      },
      {
        text: 'Không có nguy cơ gì nếu chai được đậy nắp.',
        correct: false,
        explanation: 'Sai! Nắp nhựa có thể bị nhiệt lượng làm biến dạng rò rỉ hơi cồn.',
      },
    ],
    flagColor: '#F97316',
  },
  {
    id: 'hazard_frayed_wire',
    title: 'Dây cắm bếp gia nhiệt bị hở vỏ',
    position: [3.5, 0.95, 2.0],
    question: 'Phát hiện dây cắm nguồn của bếp điện từ bị tróc vỏ cách điện lòi lõi đồng. Cần làm gì?',
    options: [
      {
        text: 'Vẫn cắm điện dùng bình thường nếu không chạm vào dây.',
        correct: false,
        explanation: 'Sai! Nguy cơ phóng điện gây giật chết người và đánh lửa cháy phòng lab.',
      },
      {
        text: 'Ngắt nguồn điện, treo biển cảnh báo hỏng và báo ngay cho giáo viên/kỹ thuật viên.',
        correct: true,
        explanation: 'Chính xác! Ngắt điện lập tức và gắn cảnh báo không được sử dụng.',
      },
      {
        text: 'Dùng giấy ăn hoặc khăn ướt quấn quanh chỗ hở.',
        correct: false,
        explanation: 'Sai! Khăn ướt dẫn điện càng nguy hiểm hơn.',
      },
    ],
    flagColor: '#EAB308',
  },
];

export const HazardHuntManager: React.FC = () => {
  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const [activeHazard, setActiveHazard] = useState<HazardDefinition | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleOpenHazard = (h: HazardDefinition) => {
    setActiveHazard(h);
    setFeedback(null);
  };

  const handleSelectOption = (correct: boolean, explanation: string) => {
    if (correct) {
      soundManager.play('success');
      setFeedback(`ĐÚNG! ${explanation}`);
      if (activeHazard && !solvedIds.includes(activeHazard.id)) {
        setSolvedIds([...solvedIds, activeHazard.id]);
        useStore.setState((s) => ({ score: s.score + 20 }));
      }
    } else {
      soundManager.play('error');
      setFeedback(`SAI RỒI! ${explanation}`);
    }
  };

  return (
    <group>
      {/* 5 Hazard Interactive Objects in Lab */}
      {HAZARDS.map((h) => {
        const isSolved = solvedIds.includes(h.id);
        const [hx, hy, hz] = h.position;

        // Player distance check
        const dx = hx - playerCoords.position[0];
        const dz = hz - playerCoords.position[2];
        const isNear = Math.hypot(dx, dz) < 2.0;

        return (
          <group key={h.id} position={h.position}>
            {/* Visual Prop: Hazard Warning Beacon or Flag */}
            {isSolved ? (
              /* Green/Solved Flag */
              <group position={[0, 0.2, 0]}>
                <mesh position={[0, 0.15, 0]}>
                  <cylinderGeometry args={[0.006, 0.006, 0.3, 12]} />
                  <meshStandardMaterial color="#64748B" />
                </mesh>
                <mesh position={[0.06, 0.25, 0]}>
                  <boxGeometry args={[0.12, 0.08, 0.01]} />
                  <meshStandardMaterial color="#10B981" emissive="#10B981" emissiveIntensity={0.5} />
                </mesh>
              </group>
            ) : (
              /* Pulsing Warning Marker */
              <group position={[0, 0.15, 0]}>
                <mesh>
                  <octahedronGeometry args={[0.08, 0]} />
                  <meshStandardMaterial
                    color={h.flagColor}
                    emissive={h.flagColor}
                    emissiveIntensity={1.8}
                  />
                </mesh>
                <pointLight color={h.flagColor} intensity={0.8} distance={2.5} />
              </group>
            )}

            {/* Proximity HTML Button */}
            {isNear && !activeHazard && (
              <Html position={[0, 0.45, 0]} center distanceFactor={8}>
                <button
                  onClick={() => handleOpenHazard(h)}
                  className={`pointer-events-auto px-3 py-1.5 rounded-full text-xs font-bold border shadow-xl flex items-center gap-1.5 backdrop-blur-md whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95 transition-all ${
                    isSolved
                      ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                      : 'bg-rose-950/85 border-rose-400 text-rose-200 animate-pulse'
                  }`}
                >
                  <span>{isSolved ? '✓ Đã xử lý' : '⚠ Rà soát vi phạm'}</span>
                  <span className="text-[10px] font-mono opacity-80">[Click]</span>
                </button>
              </Html>
            )}
          </group>
        );
      })}

      {/* Floating HUD Tracker (Top Right) */}
      <Html fullscreen>
        <div className="fixed top-18 right-4 z-20 pointer-events-none">
          <div className="px-3.5 py-1.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 shadow-lg flex items-center gap-2.5 text-xs text-white">
            <span className="text-amber-400 font-bold">🔍 Rà soát mối nguy:</span>
            <span className="font-mono font-black text-amber-300">
              {solvedIds.length}/{HAZARDS.length}
            </span>
          </div>
        </div>
      </Html>

      {/* Hazard Question Modal */}
      {activeHazard && (
        <Html center zIndexRange={[1000, 0]}>
          <div className="fixed inset-0 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 pointer-events-auto select-none font-sans">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  <h3 className="text-sm font-black uppercase text-amber-400">
                    {activeHazard.title}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveHazard(null)}
                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {activeHazard.question}
              </p>

              {/* Options */}
              <div className="flex flex-col gap-2 pt-1">
                {activeHazard.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(opt.correct, opt.explanation)}
                    className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-cyan-400 hover:bg-slate-750 text-left text-xs text-slate-200 transition-all cursor-pointer"
                  >
                    {opt.text}
                  </button>
                ))}
              </div>

              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold leading-relaxed border ${
                    feedback.startsWith('ĐÚNG')
                      ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/70 border-rose-500/50 text-rose-300'
                  }`}
                >
                  {feedback}
                </div>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};
