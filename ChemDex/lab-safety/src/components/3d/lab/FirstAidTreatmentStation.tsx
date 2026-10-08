import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { playerCoords, useStore } from '../../../store/useStore';
import { soundManager } from '../../../audio/soundManager';

const FIRST_AID_POS: [number, number, number] = [-9.85, 1.4, 1.0];

interface TreatmentStep {
  id: string;
  name: string;
  desc: string;
  icon: string;
  isCorrect: boolean;
  explanation: string;
}

const STEP_OPTIONS: TreatmentStep[][] = [
  // Step 1 Options
  [
    {
      id: 'step1_water',
      name: 'Rửa trôi bằng nước sạch / Saline 15 phút',
      desc: 'Dội nước sạch liên tục để pha loãng và rửa trôi hoàn toàn hóa chất dính trên da.',
      icon: '💧',
      isCorrect: true,
      explanation: 'Chính xác! Rửa nước tối thiểu 15 phút là bước quan trọng nhất để ngăn hóa chất thấm sâu!',
    },
    {
      id: 'step1_ointment',
      name: 'Bôi kem đánh răng / Mỡ trăn lên vết thương',
      desc: 'Quan niệm dân gian thoa mỡ hoặc kem đánh răng để làm mát vết bỏng.',
      icon: '🧴',
      isCorrect: false,
      explanation: 'NGUY HIỂM: Thoa mỡ/kem đánh răng giữ nhiệt, gây bẫy hóa chất và làm tăng nguy cơ hoại tử, nhiễm trùng!',
    },
  ],
  // Step 2 Options
  [
    {
      id: 'step2_povidone',
      name: 'Sát trùng nhẹ rìa vết thương với Povidone',
      desc: 'Dùng dung dịch Povidone-Iodine loãng sát khuẩn nhẹ nhàng vùng da xung quanh.',
      icon: '🧪',
      isCorrect: true,
      explanation: 'Chính xác! Sát trùng vùng quanh vết thương giúp ngăn ngừa vi khuẩn xâm nhập vào mô hở.',
    },
    {
      id: 'step2_alcohol90',
      name: 'Dội cồn 90 độ nguyên chất trực tiếp vào vết bỏng',
      desc: 'Dùng cồn nồng độ cao đổ trực tiếp vào vùng da đang tổn thương do hóa chất.',
      icon: '🔥',
      isCorrect: false,
      explanation: 'SAI LẦM NGUY HIỂM: Cồn 90° gây đau rát cực độ, làm đông vón protein và phá hủy mô tế bào non!',
    },
  ],
  // Step 3 Options
  [
    {
      id: 'step3_sterile_gauze',
      name: 'Đặt gạc tiệt trùng không dính lên vết bỏng',
      desc: 'Phủ nhẹ lớp gạc vô trùng khô và thoáng khí để bảo vệ bề mặt da tổn thương.',
      icon: '🩹',
      isCorrect: true,
      explanation: 'Rất tốt! Gạc tiệt trùng bảo vệ vết thương khỏi bụi bẩn trong không khí mà không làm dính rách da.',
    },
    {
      id: 'step3_cotton_wool',
      name: 'Dùng bông gòn sợi vụn đắp trực tiếp',
      desc: 'Đắp nhiều sợi bông gòn thô lên vết bỏng còn ướt dịch.',
      icon: '☁',
      isCorrect: false,
      explanation: 'SAI: Sợi bông gòn sẽ dính chặt vào dịch tiết vết bỏng, gây đau đớn dữ dội và xé rách mô khi gỡ bỏ!',
    },
  ],
  // Step 4 Options
  [
    {
      id: 'step4_bandage',
      name: 'Quấn băng thun số 8 cố định vừa vặn',
      desc: 'Băng nhẹ nhàng theo hình số 8 giữ gạc, đảm bảo không quá chặt làm nghẽn mạch máu.',
      icon: '🎗',
      isCorrect: true,
      explanation: 'Xuất sắc! Băng số 8 giữ gạc ổn định, duy trì lưu thông máu bình thường và bảo vệ cơ học hoàn hảo.',
    },
    {
      id: 'step4_tight_tape',
      name: 'Quấn băng dính thật chặt garo nghẽn mạch',
      desc: 'Siết băng thật chặt đến mức tím tái để ngăn máu chảy.',
      icon: '🛑',
      isCorrect: false,
      explanation: 'NGUY HIỂM: Siết quá chặt gây cản trở tuần hoàn máu động mạch/tĩnh mạch, có thể dẫn đến hoại tử chi!',
    },
  ],
];

export const FirstAidTreatmentStation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const doorRef = useRef<THREE.Group>(null);
  const addError = useStore((s) => s.addError);
  const completeTask = useStore((s) => s.completeTask);

  // Distance check
  const dx = FIRST_AID_POS[0] - playerCoords.position[0];
  const dz = FIRST_AID_POS[2] - playerCoords.position[2];
  const isNear = Math.hypot(dx, dz) < 2.4;

  // Door swing animation
  useFrame((_, delta) => {
    if (doorRef.current) {
      const targetAngle = isOpen ? -Math.PI * 0.55 : 0;
      doorRef.current.rotation.y = THREE.MathUtils.lerp(
        doorRef.current.rotation.y,
        targetAngle,
        delta * 6
      );
    }
  });

  const handleSelectOption = (option: TreatmentStep) => {
    if (isCompleted) return;

    if (option.isCorrect) {
      soundManager.play('snap');
      setFeedback({ text: option.explanation, isError: false });

      if (currentStepIndex + 1 < STEP_OPTIONS.length) {
        setTimeout(() => {
          setCurrentStepIndex((prev) => prev + 1);
          setFeedback(null);
        }, 1200);
      } else {
        // Complete the 4-step first aid procedure!
        setIsCompleted(true);
        soundManager.play('complete');
        completeTask('task_bandage');
      }
    } else {
      soundManager.play('error');
      setFeedback({ text: option.explanation, isError: true });
      addError('general_error', {
        penalty: 5,
        title: 'Thao tác sơ cứu sai kỹ thuật!',
        consequence: option.explanation,
      });
    }
  };

  const resetMinigame = () => {
    setCurrentStepIndex(0);
    setIsCompleted(false);
    setFeedback(null);
  };

  return (
    <group position={FIRST_AID_POS}>
      {/* 1. Cabinet Base Shell */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.16, 0.55, 0.45]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Internal Cabinet Cavity */}
      <mesh position={[0.02, 0, 0]}>
        <boxGeometry args={[0.14, 0.5, 0.41]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.5} />
      </mesh>

      {/* Internal Shelves */}
      <mesh position={[0.02, 0, 0]}>
        <boxGeometry args={[0.12, 0.02, 0.4]} />
        <meshStandardMaterial color="#94A3B8" />
      </mesh>

      {/* Interior First Aid Items: Bottles, Gauze packs, Bandages */}
      <group position={[0.02, 0.08, -0.1]}>
        {/* Antiseptic Bottle */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.12, 12]} />
          <meshStandardMaterial color="#78350F" />
        </mesh>
        {/* Saline Bottle */}
        <mesh position={[0, 0, 0.07]}>
          <cylinderGeometry args={[0.025, 0.025, 0.14, 12]} />
          <meshStandardMaterial color="#38BDF8" transparent opacity={0.8} />
        </mesh>
        {/* Sterile Gauze Box */}
        <mesh position={[0, -0.16, 0.05]}>
          <boxGeometry args={[0.08, 0.08, 0.14]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        {/* Elastic Bandage Roll */}
        <mesh position={[0, -0.16, -0.08]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 0.07, 16]} />
          <meshStandardMaterial color="#FED7AA" />
        </mesh>
      </group>

      {/* 2. Animated Cabinet Door with Green Medical Cross */}
      <group ref={doorRef} position={[0.08, 0, -0.22]}>
        {/* Door Pane */}
        <mesh position={[0, 0, 0.22]} castShadow>
          <boxGeometry args={[0.02, 0.54, 0.44]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.1} />
        </mesh>

        {/* Green Medical Cross Symbol */}
        <mesh position={[0.012, 0, 0.22]}>
          <boxGeometry args={[0.005, 0.2, 0.06]} />
          <meshBasicMaterial color="#16A34A" />
        </mesh>
        <mesh position={[0.012, 0, 0.22]}>
          <boxGeometry args={[0.005, 0.06, 0.2]} />
          <meshBasicMaterial color="#16A34A" />
        </mesh>

        {/* Door Handle */}
        <mesh position={[0.02, 0, 0.38]}>
          <boxGeometry args={[0.015, 0.08, 0.015]} />
          <meshStandardMaterial color="#64748B" metalness={0.9} />
        </mesh>
      </group>

      {/* 3. Proximity Interactive HUD Prompt */}
      {isNear && (
        <Html position={[0.1, 0.4, 0]} center distanceFactor={7}>
          <div className="flex flex-col items-center gap-2 pointer-events-auto select-none font-sans whitespace-nowrap">
            <button
              onClick={() => {
                setIsOpen(!isOpen);
                soundManager.play('click');
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-emerald-400 bg-slate-950/90 text-emerald-300 shadow-xl flex items-center gap-2 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 transition-all"
            >
              <span>🏥</span>
              <span>{isOpen ? 'Đóng tủ Sơ Cứu' : 'Mở tủ Sơ Cứu Y Tế Khẩn Cấp'}</span>
              <span className="text-[10px] font-mono text-slate-400">[Click]</span>
            </button>
          </div>
        </Html>
      )}

      {/* 4. Interactive 4-Step First Aid Minigame Modal */}
      {isOpen && (
        <Html position={[0.4, 0, 0]} center distanceFactor={6}>
          <div className="w-96 p-4 rounded-2xl bg-slate-950/95 border border-emerald-500/50 shadow-2xl backdrop-blur-xl text-white font-sans pointer-events-auto select-none">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🩺</span>
                <div>
                  <h3 className="text-sm font-bold text-emerald-400">Quy Trình Sơ Cứu Bỏng Hóa Chất</h3>
                  <p className="text-[10px] text-slate-400">Tiêu chuẩn quốc tế OSHA / Hội Chữ Thập Đỏ</p>
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

            {/* Wound Status Indicator */}
            <div className="my-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {isCompleted ? '✨' : currentStepIndex === 0 ? '🔴' : currentStepIndex === 1 ? '🟠' : currentStepIndex === 2 ? '🟡' : '🟢'}
                </span>
                <div>
                  <div className="text-[11px] font-semibold text-slate-300">Tình trạng vết thương trên da:</div>
                  <div className="text-[10px] text-slate-400">
                    {isCompleted
                      ? 'Đã xử lý đúng 4 bước! Băng gạc vô trùng che chắn an toàn.'
                      : currentStepIndex === 0
                      ? 'Dính hóa chất đang ăn mòn, biểu bì sưng đỏ rát!'
                      : currentStepIndex === 1
                      ? 'Đã rửa sạch hóa chất, bề mặt cần sát khuẩn phòng ngừa.'
                      : currentStepIndex === 2
                      ? 'Đã sát trùng rìa vết thương, cần che chắn vô trùng.'
                      : 'Đang đặt gạc bảo vệ, cần cố định bằng băng cuộn.'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {isCompleted ? '4/4' : `${currentStepIndex}/4`}
                </span>
                <span className="text-[9px] block text-slate-500">Bước</span>
              </div>
            </div>

            {/* Step Content */}
            {!isCompleted ? (
              <div>
                <div className="text-xs font-bold text-cyan-300 mb-2">
                  Bước {currentStepIndex + 1}: Bạn sẽ làm gì tiếp theo?
                </div>

                <div className="flex flex-col gap-2">
                  {STEP_OPTIONS[currentStepIndex].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleSelectOption(option)}
                      className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/80 hover:border-emerald-400 text-left transition-all cursor-pointer flex items-start gap-2.5 active:scale-[0.98]"
                    >
                      <span className="text-lg p-1 rounded-lg bg-slate-800/80">{option.icon}</span>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-white">{option.name}</div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{option.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Feedback Toast */}
                {feedback && (
                  <div
                    className={`mt-3 p-2 rounded-xl text-[11px] font-medium border ${
                      feedback.isError
                        ? 'bg-rose-950/80 border-rose-500/80 text-rose-300'
                        : 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                    }`}
                  >
                    {feedback.text}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-2xl animate-bounce">
                  🎉
                </div>
                <div className="text-sm font-bold text-emerald-400">Sơ Cứu Hoàn Tất Xuất Sắc!</div>
                <p className="text-[11px] text-slate-300 leading-relaxed px-2">
                  Bạn đã thực hiện chuẩn chỉ 4 bước: <strong>Xả nước 15p → Sát trùng Povidone → Đặt gạc vô trùng → Băng cuộn số 8</strong>.
                </p>
                <div className="text-[10px] text-amber-300/90 bg-amber-950/40 p-2 rounded-lg border border-amber-600/30">
                  ⚠ <strong>Lưu ý:</strong> Luôn báo ngay cho giáo viên quản nhiệm và đưa nạn nhân tới cơ sở y tế gần nhất để bác sĩ chuyên khoa kiểm tra sâu!
                </div>
                <button
                  onClick={resetMinigame}
                  className="mt-2 px-3 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Luyện tập lại
                </button>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
