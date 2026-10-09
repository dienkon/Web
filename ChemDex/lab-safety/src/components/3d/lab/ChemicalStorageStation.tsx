import React, { useState } from 'react';
import { Html } from '@react-three/drei';
import { playerCoords, useStore } from '../../../store/useStore';
import { soundManager } from '../../../audio/soundManager';

const CABINET_POS: [number, number, number] = [9.5, 1.2, 0];

type CompartmentId = 'acids' | 'bases' | 'flammables' | 'oxidizers';

interface ChemicalItem {
  id: string;
  name: string;
  formula: string;
  ghsSymbol: string;
  correctCompartment: CompartmentId;
  hazardNote: string;
}

const CHEMICALS_TO_SORT: ChemicalItem[] = [
  {
    id: 'chem_h2so4',
    name: 'Axit Sunfuric đặc',
    formula: 'H2SO4 98%',
    ghsSymbol: 'Corrosive (Ăn mòn)',
    correctCompartment: 'acids',
    hazardNote: 'Axit vô cơ mạnh, háo nước và ăn mòn mô sinh học cực mạnh.',
  },
  {
    id: 'chem_naoh',
    name: 'Natri Hydroxit (Xút ăn da)',
    formula: 'NaOH tinh thể',
    ghsSymbol: 'Corrosive (Ăn mòn kiềm)',
    correctCompartment: 'bases',
    hazardNote: 'Kiềm mạnh, xà phòng hóa chất béo và làm tổn thương mắt không hồi phục.',
  },
  {
    id: 'chem_ethanol',
    name: 'Cồn Ethanol 96°',
    formula: 'C2H5OH',
    ghsSymbol: 'Flammable (Dễ cháy)',
    correctCompartment: 'flammables',
    hazardNote: 'Dung môi hữu cơ dễ bay hơi, điểm chớp cháy thấp (< 13°C).',
  },
  {
    id: 'chem_kmno4',
    name: 'Kali Pemanganat (Thuốc tím)',
    formula: 'KMnO4 tinh thể',
    ghsSymbol: 'Oxidizer (Oxy hóa mạnh)',
    correctCompartment: 'oxidizers',
    hazardNote: 'Chất oxy hóa cực mạnh, tiếp xúc với dung môi hữu cơ dễ gây tự bốc cháy!',
  },
  {
    id: 'chem_acetone',
    name: 'Dung môi Axeton',
    formula: 'CH3COCH3',
    ghsSymbol: 'Flammable (Dễ cháy)',
    correctCompartment: 'flammables',
    hazardNote: 'Hơi axeton nặng hơn không khí, dễ tích tụ tạo hỗn hợp nổ.',
  },
  {
    id: 'chem_hcl',
    name: 'Axit Clohydric',
    formula: 'HCl 37%',
    ghsSymbol: 'Corrosive (Bốc khói)',
    correctCompartment: 'acids',
    hazardNote: 'Axit bốc khói kích ứng đường hô hấp, ăn mòn kim loại.',
  },
];

const COMPARTMENTS: { id: CompartmentId; name: string; color: string; icon: string }[] = [
  { id: 'acids', name: 'Ngăn Axit', color: 'border-amber-500 bg-amber-950/40 text-amber-300', icon: '🧪' },
  { id: 'bases', name: 'Ngăn Kiềm / Bazơ', color: 'border-blue-500 bg-blue-950/40 text-blue-300', icon: '🧴' },
  { id: 'flammables', name: 'Ngăn Dung Môi Dễ Cháy', color: 'border-rose-500 bg-rose-950/40 text-rose-300', icon: '🔥' },
  { id: 'oxidizers', name: 'Ngăn Chất Oxy Hóa Mạnh', color: 'border-yellow-400 bg-yellow-950/40 text-yellow-300', icon: '💥' },
];

export const ChemicalStorageStation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [placedItems, setPlacedItems] = useState<Record<string, CompartmentId>>({});
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const addError = useStore((s) => s.addError);

  // Distance check
  const dx = CABINET_POS[0] - playerCoords.position[0];
  const dz = CABINET_POS[2] - playerCoords.position[2];
  const isNear = Math.hypot(dx, dz) < 2.5;

  // Unplaced items
  const unplacedList = CHEMICALS_TO_SORT.filter((c) => !placedItems[c.id]);
  const isAllSorted = unplacedList.length === 0;

  const handlePlace = (chem: ChemicalItem, targetComp: CompartmentId) => {
    if (targetComp === chem.correctCompartment) {
      soundManager.play('snap');
      setPlacedItems((prev) => ({ ...prev, [chem.id]: targetComp }));
      setFeedback({
        text: `Đúng! ${chem.name} đã được lưu trữ an toàn vào ${
          COMPARTMENTS.find((c) => c.id === targetComp)?.name
        }.`,
        isError: false,
      });

      if (Object.keys(placedItems).length + 1 === CHEMICALS_TO_SORT.length) {
        soundManager.play('complete');
      }
    } else {
      // Incompatible Storage Danger!
      soundManager.play('error');
      let penaltyReason = `Không thể cất ${chem.name} vào ${
        COMPARTMENTS.find((c) => c.id === targetComp)?.name
      }!`;

      if (
        (chem.correctCompartment === 'oxidizers' && targetComp === 'flammables') ||
        (chem.correctCompartment === 'flammables' && targetComp === 'oxidizers')
      ) {
        penaltyReason =
          'NGUY HIỂM CHẾT NGƯỜI: Tuyệt đối KHÔNG cất Chất Oxy Hóa chung với Dung Môi Dễ Cháy! Nguy cơ tự bốc cháy phát nổ dữ dội!';
      } else if (
        (chem.correctCompartment === 'acids' && targetComp === 'bases') ||
        (chem.correctCompartment === 'bases' && targetComp === 'acids')
      ) {
        penaltyReason =
          'SAI LẦM NGUY HIỂM: Tuyệt đối KHÔNG cất Axit chung với Kiềm! Rò rỉ tạo phản ứng tỏa nhiệt cực mạnh làm vỡ chai lọ!';
      }

      setFeedback({ text: penaltyReason, isError: true });
      addError('general_error', {
        penalty: 5,
        title: 'Phân loại hóa chất không tương thích!',
        consequence: penaltyReason,
      });
    }
  };

  const handleReset = () => {
    setPlacedItems({});
    setFeedback(null);
  };

  return (
    <group position={CABINET_POS}>
      {/* 1. Proximity Floating Prompt */}
      {isNear && (
        <Html position={[0, 0.4, 0]} center distanceFactor={7}>
          <div className="flex flex-col items-center gap-2 pointer-events-auto select-none font-sans whitespace-nowrap">
            <button
              onClick={() => {
                setIsOpen(!isOpen);
                soundManager.play('click');
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-yellow-400 bg-slate-950/90 text-yellow-300 shadow-xl flex items-center gap-2 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 transition-all"
            >
              <span>🗄️</span>
              <span>{isOpen ? 'Đóng Tủ Hóa Chất' : 'Kiểm Tra Phân Loại Hóa Chất Tương Thích (GHS)'}</span>
              <span className="text-[10px] font-mono text-slate-400">[Click]</span>
            </button>
          </div>
        </Html>
      )}

      {/* 2. Interactive Chemical Storage Sorter Modal */}
      {isOpen && (
        <Html position={[-0.5, 0, 0]} center distanceFactor={6}>
          <div className="w-[420px] p-4 rounded-2xl bg-slate-950/95 border border-yellow-500/50 shadow-2xl backdrop-blur-xl text-white font-sans pointer-events-auto select-none">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🗄️</span>
                <div>
                  <h3 className="text-sm font-bold text-yellow-400">Tủ Lưu Trữ Hóa Chất Cách Ly An Toàn</h3>
                  <p className="text-[10px] text-slate-400">Quy tắc tương thích hóa chất quốc tế (GHS & OSHA)</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  soundManager.play('click');
                }}
                className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs text-slate-300 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 4 Storage Compartments */}
            <div className="grid grid-cols-2 gap-2 my-3">
              {COMPARTMENTS.map((comp) => {
                const storedInThis = CHEMICALS_TO_SORT.filter((c) => placedItems[c.id] === comp.id);
                return (
                  <div
                    key={comp.id}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between min-h-[90px] ${comp.color}`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>{comp.icon}</span>
                      <span>{comp.name}</span>
                    </div>

                    <div className="my-1.5 flex flex-wrap gap-1">
                      {storedInThis.length === 0 ? (
                        <span className="text-[10px] opacity-40 italic">Ngăn đang trống</span>
                      ) : (
                        storedInThis.map((item) => (
                          <span
                            key={item.id}
                            className="px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-[9px] font-mono"
                          >
                            ✓ {item.formula}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Current Item to Sort */}
            {!isAllSorted ? (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[11px] text-slate-400 mb-1">
                  Chọn ngăn tủ phù hợp cho hóa chất sau: ({6 - unplacedList.length}/6 đã phân loại)
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>🧪</span>
                      <span>{unplacedList[0].name}</span>
                      <span className="text-[10px] font-mono text-cyan-300">({unplacedList[0].formula})</span>
                    </div>
                    <div className="text-[10px] text-amber-300/80 mt-0.5">
                      ⚠️ Đặc tính GHS: {unplacedList[0].ghsSymbol}
                    </div>
                  </div>
                </div>

                {/* Target buttons */}
                <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                  {COMPARTMENTS.map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() => handlePlace(unplacedList[0], comp.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-bold text-slate-200 cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <span>{comp.icon}</span>
                      <span>Cất vào {comp.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-3 flex flex-col items-center gap-1.5">
                <div className="text-2xl animate-bounce">🏆</div>
                <div className="text-sm font-bold text-emerald-400">Toàn Bộ Hóa Chất Đã Được Cách Ly An Toàn!</div>
                <p className="text-[11px] text-slate-300">
                  Bạn đã nắm vững quy tắc bất di bất dịch: <strong>Không để Oxy hóa gần Dễ cháy</strong> và{' '}
                  <strong>Không để Axit chung với Kiềm</strong>.
                </p>
                <button
                  onClick={handleReset}
                  className="mt-1 px-3 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Sắp xếp lại từ đầu
                </button>
              </div>
            )}

            {/* Feedback Message */}
            {feedback && (
              <div
                className={`mt-2.5 p-2 rounded-xl text-[10px] font-medium border leading-tight ${
                  feedback.isError
                    ? 'bg-rose-950/80 border-rose-500/80 text-rose-300'
                    : 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                }`}
              >
                {feedback.text}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
