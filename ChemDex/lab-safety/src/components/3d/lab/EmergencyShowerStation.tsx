import { useTaskProximity } from './useTaskProximity';
import React, { useEffect, useRef, useState } from 'react';
import { SceneHtml as Html } from '../SceneHtml';
import { useStore } from '../../../store/useStore';
import { soundManager } from '../../../audio/soundManager';

import { EmergencyShowerAsset } from '../assets/EmergencyAssets';
import { InstancedBoxes } from '../assets/AssetPrimitives';
import { EMERGENCY_SHOWER_LAYOUT as L } from '../../../data/scene/fixtureLayout';
const SHOWER_POS=L.position;

export const EmergencyShowerStation: React.FC = () => {
  const [isShowerActive, setIsShowerActive] = useState(false);
  const [isEyewashActive, setIsEyewashActive] = useState(false);
  const startDialog = useStore((s) => s.startDialog);
  const setWaterEffect = useStore((s) => s.setWaterEffect);
  const guideTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(guideTimer.current)clearTimeout(guideTimer.current);},[]);

  const isNear=useTaskProximity(SHOWER_POS,2.2,[]);

  const toggleShower = () => {
    if(guideTimer.current)clearTimeout(guideTimer.current);
    const next = !isShowerActive;
    setIsShowerActive(next);
    setIsEyewashActive(false);
    setWaterEffect({ active: next, type: 'shower' });
    soundManager.play('water');
    if (next) {
      guideTimer.current=setTimeout(() => {
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
    if(guideTimer.current)clearTimeout(guideTimer.current);
    const next = !isEyewashActive;
    setIsEyewashActive(next);
    setIsShowerActive(false);
    setWaterEffect({ active: next, type: 'eyewash' });
    soundManager.play('water');
    if (next) {
      guideTimer.current=setTimeout(() => {
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
    <group userData={{labItem:{title:'Vòi tắm và rửa mắt khẩn cấp',kind:'shower'}}} position={SHOWER_POS} rotation={[0,L.rotationY,0]}>
      <EmergencyShowerAsset shower={isShowerActive} eyewash={isEyewashActive}/>
      <group name="shower-floor-area" position={[0,.002,.8]}>
       <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.44,.46,48]}/><meshStandardMaterial color="#c6b776" roughness={.8}/></mesh>
       <InstancedBoxes color="#8ba0a7" parts={Array.from({length:9},(_,i)=>({at:[-.08+i*.02,.002,0],size:[.008,.004,.16]}))}/>
      </group>

        {/* Proximity HTML Interactive Controls */}
        {isNear && (
          <Html position={[0, 1.8, 0.4]} center distanceFactor={8}>
            <div className="flex flex-col items-center gap-2 pointer-events-auto select-none font-sans whitespace-nowrap">
              <button
                onClick={toggleShower}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-sm flex items-center gap-2 backdrop-blur-none cursor-pointer transition-all active:scale-95 ${
                  isShowerActive
                    ? 'bg-rose-100/80 border-rose-400 text-rose-700'
                    : 'bg-emerald-100/80 border-emerald-400 text-emerald-700 hover:scale-105'
                }`}
              >
                <span>🚿</span>
                <span>{isShowerActive ? 'Đóng vòi Tắm Khẩn Cấp' : 'Kéo cần Tắm Khẩn Cấp'}</span>
                <span className="text-[10px] font-mono opacity-80">[Click]</span>
              </button>

              <button
                onClick={toggleEyewash}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-sm flex items-center gap-2 backdrop-blur-none cursor-pointer transition-all active:scale-95 ${
                  isEyewashActive
                    ? 'bg-rose-100/80 border-rose-400 text-rose-700'
                    : 'bg-cyan-100/80 border-cyan-400 text-cyan-700 hover:scale-105'
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
