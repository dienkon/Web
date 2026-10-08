import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { playerCoords, useStore } from '../../../store/useStore';
import { soundManager } from '../../../audio/soundManager';

const BURNER_POS: [number, number, number] = [3.5, 0.95, -2.5];

export const BunsenBurnerStation: React.FC = () => {
  const [isGasValveOpen, setIsGasValveOpen] = useState(false);
  const [isLit, setIsLit] = useState(false);
  const [airCollarOpen, setAirCollarOpen] = useState(false); // false = Safety yellow flame, true = Roaring blue flame
  const [isStrikeBack, setIsStrikeBack] = useState(false);

  const flameRef = useRef<THREE.Group>(null);
  const innerConeRef = useRef<THREE.Mesh>(null);
  const tubeRef = useRef<THREE.Mesh>(null);

  const startDialog = useStore((s) => s.startDialog);
  const addError = useStore((s) => s.addError);
  const player = useStore((s) => s.player);

  // Check distance
  const dx = BURNER_POS[0] - playerCoords.position[0];
  const dz = BURNER_POS[2] - playerCoords.position[2];
  const isNear = Math.hypot(dx, dz) < 2.2;

  useFrame((_, delta) => {
    // Flickering flame animation
    if (flameRef.current && isLit && !isStrikeBack) {
      const flicker = Math.sin(performance.now() * 0.02) * 0.08 + Math.cos(performance.now() * 0.035) * 0.05;
      flameRef.current.scale.y = (airCollarOpen ? 1.0 : 1.3) + flicker;
      flameRef.current.scale.x = 1.0 + flicker * 0.3;
      flameRef.current.scale.z = 1.0 + flicker * 0.3;
    }

    // Glowing red chimney barrel on strike back
    if (tubeRef.current) {
      const mat = tubeRef.current.material as THREE.MeshStandardMaterial;
      if (isStrikeBack) {
        mat.emissive.set('#DC2626');
        mat.emissiveIntensity = 0.8 + Math.sin(performance.now() * 0.01) * 0.3;
      } else {
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
      }
    }
  });

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
    <group position={BURNER_POS}>
      {/* 1. Bunsen Burner Hardware Assembly */}
      {/* Heavy Cast Iron Round Base */}
      <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.075, 0.085, 0.03, 24]} />
        <meshStandardMaterial color="#1E293B" roughness={0.7} metalness={0.6} />
      </mesh>

      {/* Brass Chimney Tube */}
      <mesh ref={tubeRef} position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.18, 16]} />
        <meshStandardMaterial color="#EAB308" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Rotating Air Collar Ring with air hole */}
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.03, 16]} />
        <meshStandardMaterial color="#CA8A04" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Gas Inlet Side Nipple */}
      <mesh position={[0.03, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.007, 0.007, 0.04, 12]} />
        <meshStandardMaterial color="#CA8A04" metalness={0.8} />
      </mesh>

      {/* Flexible Black Rubber Gas Hose connecting to bench turret */}
      <mesh position={[0.15, 0.02, 0.1]} rotation={[0, 0.6, 0]}>
        <boxGeometry args={[0.22, 0.012, 0.012]} />
        <meshStandardMaterial color="#0F172A" roughness={0.8} />
      </mesh>

      {/* Bench Gas Valve Turret */}
      <group position={[0.3, 0.06, 0.2]}>
        <mesh>
          <cylinderGeometry args={[0.02, 0.02, 0.12, 12]} />
          <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>
        {/* Red Quarter-Turn Lever Handle */}
        <mesh
          position={[0, 0.06, 0]}
          rotation={[0, isGasValveOpen ? Math.PI / 2 : 0, 0]}
        >
          <boxGeometry args={[0.08, 0.015, 0.02]} />
          <meshStandardMaterial color="#DC2626" roughness={0.3} />
        </mesh>
      </group>

      {/* Tripod Stand with Ceramic Wire Gauze above Burner */}
      <group position={[0, 0.22, 0]}>
        {/* Ceramic Wire Gauze */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.18, 0.005, 0.18]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.9} />
        </mesh>
        {/* Ceramic White Heat Center Circle */}
        <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.05, 16]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
        </mesh>
      </group>

      {/* 2. Realistic Animated Flame */}
      {isLit && !isStrikeBack && (
        <group ref={flameRef} position={[0, 0.21, 0]}>
          {/* Main Outer Flame */}
          <mesh position={[0, airCollarOpen ? 0.06 : 0.09, 0]}>
            <coneGeometry args={[airCollarOpen ? 0.025 : 0.035, airCollarOpen ? 0.12 : 0.18, 16]} />
            <meshBasicMaterial
              color={airCollarOpen ? '#38BDF8' : '#F59E0B'}
              transparent
              opacity={airCollarOpen ? 0.75 : 0.88}
            />
          </mesh>

          {/* Inner Sharp Intense Cone (When Air Collar is Open) */}
          {airCollarOpen && (
            <mesh ref={innerConeRef} position={[0, 0.035, 0]}>
              <coneGeometry args={[0.015, 0.07, 16]} />
              <meshBasicMaterial color="#06B6D4" transparent opacity={0.95} />
            </mesh>
          )}

          {/* Dynamic Flame Point Light */}
          <pointLight
            position={[0, 0.1, 0]}
            color={airCollarOpen ? '#38BDF8' : '#F59E0B'}
            intensity={airCollarOpen ? 0.8 : 1.4}
            distance={3.0}
          />
        </group>
      )}

      {/* 3. Proximity Interactive HUD Menu */}
      {isNear && (
        <Html position={[0, 0.45, 0]} center distanceFactor={7}>
          <div className="flex flex-col items-center gap-1.5 pointer-events-auto select-none font-sans whitespace-nowrap bg-slate-950/90 p-2.5 rounded-2xl border border-amber-500/40 shadow-2xl backdrop-blur-md">
            <div className="text-[11px] font-bold text-white flex items-center gap-2 mb-1">
              <span>🔥 Đèn Khí Bunsen & Van An Toàn</span>
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full font-mono ${
                  !isGasValveOpen
                    ? 'bg-slate-800 text-slate-400'
                    : isStrikeBack
                    ? 'bg-rose-900 text-rose-300 animate-ping'
                    : isLit
                    ? airCollarOpen
                    ? 'bg-cyan-900 text-cyan-300'
                    : 'bg-amber-900 text-amber-300'
                    : 'bg-amber-950 text-amber-400'
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
                    ? 'bg-rose-950/80 border-rose-400 text-rose-200'
                    : 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                }`}
              >
                {isGasValveOpen ? 'Khóa Van Gas' : 'Mở Van Gas'}
              </button>

              <button
                onClick={handleStrike}
                disabled={!isGasValveOpen}
                className="px-3 py-1 rounded-lg text-xs font-bold border border-amber-400 bg-amber-950/80 text-amber-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:scale-105 active:scale-95 transition-all"
              >
                ⚡ Đánh Lửa Mồi
              </button>

              <button
                onClick={toggleAirCollar}
                disabled={!isLit}
                className="px-3 py-1 rounded-lg text-xs font-bold border border-cyan-400 bg-slate-900 text-cyan-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:scale-105 active:scale-95 transition-all"
              >
                🌀 {airCollarOpen ? 'Đóng Lỗ Gió (Lửa Vàng)' : 'Mở Lỗ Gió (Lửa Xanh)'}
              </button>

              {isLit && !isStrikeBack && (
                <button
                  onClick={triggerStrikeBack}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold border border-rose-500/50 bg-rose-950/60 text-rose-300 cursor-pointer hover:bg-rose-900"
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
