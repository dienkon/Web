import { BunsenAssemblyAsset } from '../assets/CombustionAssets';
import { useTaskProximity } from './useTaskProximity';
import React, { useState } from 'react';
import { SceneHtml as Html } from '../SceneHtml';
import { playerCoords, useStore } from '../../../store/useStore';
import { soundManager } from '../../../audio/soundManager';
import { BUNSEN_LAYOUT } from '../../../data/scene/fixtureLayout';

const BURNER_POS = BUNSEN_LAYOUT.position;

export const BunsenBurnerStation: React.FC = () => {
  const [isGasValveOpen, setIsGasValveOpen] = useState(false);
  const [isLit, setIsLit] = useState(false);
  const [airCollarOpen, setAirCollarOpen] = useState(false); // false = Safety yellow flame, true = Roaring blue flame
  const [isStrikeBack, setIsStrikeBack] = useState(false);

  const startDialog = useStore((s) => s.startDialog);
  const addError = useStore((s) => s.addError);
  const player = useStore((s) => s.player);

  // Check distance
  const dx = BURNER_POS[0] - playerCoords.position[0];
  const dz = BURNER_POS[2] - playerCoords.position[2];
  const isNear = useTaskProximity(BURNER_POS, 2.2, []);

  // Action: Toggle Gas Valve
  const toggleGas = () => {
    const next = !isGasValveOpen;
    setIsGasValveOpen(next);
    soundManager.play('fizz');

    if (!next) {
      // Turned off
      setIsLit(false);
      if (isStrikeBack) {
        setIsStrikeBack(false);
        soundManager.play('success');
        startDialog([
          'XỬ LÝ CHÍNH XÁC KHI BỊ CHÁY NGƯỢC (STRIKE-BACK):',
          'Bạn đã lập tức khóa van khí gas chính trên bàn!',
          'Ống đèn Bunsen sẽ nguội dần. Cần kiểm tra lại lỗ gió và áp suất khí trước khi bật lại.',
        ]);
      }
    }
  };

  // Action: Strike Spark Lighter
  const handleStrike = () => {
    if (!isGasValveOpen) {
      soundManager.play('snap');
      startDialog([
        'Chưa mở van khí gas trên bàn!',
        'Hãy mở van gas trước khi đánh lửa để có nhiên liệu duy trì ngọn lửa.',
      ]);
      return;
    }

    if (!player.equipment.hasGoggles) {
      soundManager.play('error');
      addError('ppe_missing', {
        penalty: 10,
        title: 'Chưa đeo kính bảo hộ khi châm lửa đèn Bunsen!',
        consequence: 'Nguy cơ tia lửa và luồng khí nóng tạt thẳng vào mắt!',
      });
      return;
    }

    soundManager.play('shatter');
    setIsLit(true);
    setIsStrikeBack(false);
    soundManager.play('success');

    if (airCollarOpen) {
      startDialog([
        'LƯU Ý AN TOÀN KHI MỒI LỬA ĐÈN BUNSEN:',
        'Quy chuẩn: Luôn ĐÓNG lỗ gió khi châm lửa để tạo ngọn lửa an toàn màu vàng!',
        'Châm lửa khi lỗ gió đang mở to dễ gây nổ phụt hoặc hiện tượng cháy ngược vào thân đèn.',
      ]);
    }
  };

  // Action: Rotate Air Collar
  const toggleAirCollar = () => {
    if (!isLit) {
      setAirCollarOpen(!airCollarOpen);
      soundManager.play('click');
      return;
    }

    const next = !airCollarOpen;
    setAirCollarOpen(next);
    soundManager.play('fizz');

    if (next) {
      startDialog([
        'CHẾ ĐỘ LỬA LÀM VIỆC (ROARING BLUE FLAME):',
        'Lỗ gió mở hoàn toàn cung cấp dồi dào oxy cho phản ứng cháy hoàn toàn.',
        'Ngọn lửa màu xanh lam 2 nón không có muội than, nhiệt độ đỉnh nón trong đạt tới 1200°C!',
      ]);
    } else {
      startDialog([
        'CHẾ ĐỘ LỬA AN TOÀN (SAFETY FLAME):',
        'Lỗ gió đóng kín, phản ứng cháy không hoàn toàn tạo ngọn lửa màu vàng sáng chập chờn.',
        'Dễ quan sát thấy để tránh sơ ý chạm vào, nhiệt độ thấp hơn (~300°C) và tạo muội than.',
      ]);
    }
  };

  // Action: Trigger Strike-back emergency scenario for learning
  const triggerStrikeBack = () => {
    if (!isLit) return;
    setIsStrikeBack(true);
    soundManager.play('error');
    soundManager.play('fizz');
    addError('general_error', {
      penalty: 5,
      title: 'Sự cố Cháy Ngược (Strike-back) tại đèn Bunsen!',
      consequence: 'Lửa cháy lùi vào trong ống, thân đèn nóng đỏ rực có nguy cơ làm chảy nổ ống dẫn gas!',
    });
  };

  return (
    <group userData={{labItem:{title:'Bộ đèn Bunsen thực hành',kind:'heat'}}} position={BURNER_POS}>
      <BunsenAssemblyAsset gasOpen={isGasValveOpen} flame={isLit?(airCollarOpen?'blue':'yellow'):'off'} airOpen={airCollarOpen} strikeBack={isStrikeBack}/>

      {/* 3. Proximity Interactive HUD Menu */}
      {isNear && (
        <Html position={[0, 0.45, 0]} center distanceFactor={7}>
          <div className="flex flex-col items-center gap-1.5 pointer-events-auto select-none font-sans whitespace-nowrap bg-slate-100/80 p-2.5 rounded-2xl border border-amber-500/40 shadow-sm backdrop-blur-none">
            <div className="text-[11px] font-bold text-slate-800 flex items-center gap-2 mb-1">
              <span>🔥 Đèn Khí Bunsen & Van An Toàn</span>
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full font-mono ${
                  !isGasValveOpen
                    ? 'bg-slate-50 text-slate-600'
                    : isStrikeBack
                    ? 'bg-rose-100 text-rose-700 animate-ping'
                    : isLit
                    ? airCollarOpen
                    ? 'bg-cyan-100 text-cyan-700'
                    : 'bg-amber-900 text-amber-700'
                    : 'bg-amber-950 text-amber-700'
                }`}
              >
                {!isGasValveOpen
                  ? 'KHÓA GAS'
                  : isStrikeBack
                  ? 'CHÁY NGƯỢC NGUY HIỂM!'
                  : isLit
                  ? airCollarOpen
                  ? 'LỬA XANH 1200°C'
                  : 'LỬA VÀNG AN TOÀN'
                  : 'ĐANG XẢ GAS'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleGas}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  isGasValveOpen
                    ? 'bg-rose-100/80 border-rose-400 text-rose-700'
                    : 'bg-emerald-100/80 border-emerald-400 text-emerald-700'
                }`}
              >
                {isGasValveOpen ? 'Khóa Van Gas' : 'Mở Van Gas'}
              </button>

              <button
                onClick={handleStrike}
                disabled={!isGasValveOpen}
                className="px-3 py-1 rounded-lg text-xs font-bold border border-amber-400 bg-amber-950/80 text-amber-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:scale-105 active:scale-95 transition-all"
              >
                ⚡ Đánh Lửa Mồi
              </button>

              <button
                onClick={toggleAirCollar}
                disabled={!isLit}
                className="px-3 py-1 rounded-lg text-xs font-bold border border-cyan-400 bg-white text-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:scale-105 active:scale-95 transition-all"
              >
                🌀 {airCollarOpen ? 'Đóng Lỗ Gió (Lửa Vàng)' : 'Mở Lỗ Gió (Lửa Xanh)'}
              </button>

              {isLit && !isStrikeBack && (
                <button
                  onClick={triggerStrikeBack}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold border border-rose-500/50 bg-rose-100/60 text-rose-700 cursor-pointer hover:bg-rose-100"
                  title="Thực nghiệm tình huống cháy ngược vào ống"
                >
                  ⚠️ Mô phỏng Cháy Ngược
                </button>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};
