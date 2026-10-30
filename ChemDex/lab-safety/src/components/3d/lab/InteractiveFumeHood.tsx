import { useTaskProximity } from './useTaskProximity';
import React, { useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { SceneHtml as Html } from '../SceneHtml';
import * as THREE from 'three';
import { useStore } from '../../../store/useStore';
import { soundManager } from '../../../audio/soundManager';

import { FUME_HOOD_LAYOUT as L } from '../../../data/scene/fixtureLayout';
import { HoodSashAsset, HoodMonitorAsset } from '../assets/StationAssets';
import { BeakerAsset } from '../assets/LabwareAssets';
import { useReducedLabMotion } from '../../../systems/device/useReducedLabMotion';

export const InteractiveFumeHood: React.FC = () => {
  // Sash height: 0 (safe working height 30cm) to 1.0 (fully open 80cm)
  const [sashHeight, setSashHeight] = useState(0.25);
  const [isChemicalReactionActive, setIsChemicalReactionActive] = useState(true);
  const addError = useStore((s) => s.addError);
  const reduced = useReducedLabMotion();
  const elapsed = useRef(0);
  const particles = useMemo(()=>new Float32Array(Array.from({length:120},(_,i)=>i%3===1?1.04+(Math.floor(i/3)/40)*1.15:0)),[]);
  const vaporPointsRef = useRef<THREE.Points>(null);

  const isNear = useTaskProximity(L.position, 2.5, []);

  const isAlarm = sashHeight > 0.55;
  const faceVelocity = isAlarm ? 42 : 100;

  useFrame((_, delta) => {
    if (!vaporPointsRef.current || !isChemicalReactionActive || reduced || document.hidden) return;
    elapsed.current += Math.min(delta,.05);
    const pos = vaporPointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    for(let i=0;i<40;i++){
      const t=(elapsed.current*.32+i/40)%1;
      // Each path starts inside the beaker, then bends toward the rear baffles.
      pos.setXYZ(i,Math.sin(i*2.4+t*8)*(.018+t*.045),1.04+t*1.15,.02-t*.37+Math.cos(i*1.7+t*5)*.018);
    }
    pos.needsUpdate=true;
  });

  const toggleSash = () => {
    const next = sashHeight > 0.4 ? 0.2 : 0.8;
    setSashHeight(next);
    soundManager.play('snap');

    if (next > 0.55) {
      soundManager.play('error');
      addError('general_error', {
        penalty: 5,
        title: 'Cửa kính Fume Hood mở quá cao!',
        consequence: 'Vận tốc hút gió giảm xuống dưới 100 FPM, hơi độc tràn ra ngoài!',
      });
    }
  };

  return (
    <group userData={{labItem:{title:'Cửa kính và buồng tủ hút',kind:'hood'}}} position={L.position} rotation={[0,L.rotationY,0]}>
      <HoodSashAsset height={sashHeight} animate/>
      <HoodMonitorAsset alarm={isAlarm}/>
      <group position={[0,.871,.02]}><BeakerAsset color="#c3af86" fill={.35}/></group>
      {isChemicalReactionActive && <points ref={vaporPointsRef} name="hood-extraction-vapor">
        <bufferGeometry><bufferAttribute attach="attributes-position" count={40} array={particles} itemSize={3}/></bufferGeometry>
        <pointsMaterial size={.045} color={isAlarm?'#bc9576':'#a4bec6'} transparent opacity={.36} depthWrite={false}/>
      </points>}

      {/* 5. Proximity Interactive Control */}
      {isNear && (
        <Html position={[0, 1.85, 0.6]} center distanceFactor={8}>
          <div className="flex flex-col items-center gap-1.5 pointer-events-auto select-none font-sans whitespace-nowrap">
            <div className="px-3 py-1 rounded-full bg-slate-100/80 backdrop-blur-none border border-slate-200 shadow-sm flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className={`w-2 h-2 rounded-full ${isAlarm ? 'bg-rose-100 animate-ping' : 'bg-emerald-400'}`} />
              <span>Vận tốc hút gió: </span>
              <span className={`font-mono ${isAlarm ? 'text-rose-700' : 'text-emerald-700'}`}>
                {faceVelocity} FPM
              </span>
              <span className="text-[10px] text-slate-600">
                {isAlarm ? '(NGUY HIỂM: DƯỚI 100 FPM)' : '(ĐẠT CHUẨN)'}
              </span>
            </div>

            <button
              onClick={toggleSash}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-sm flex items-center gap-2 backdrop-blur-none cursor-pointer transition-all active:scale-95 ${
                isAlarm
                  ? 'bg-rose-100/90 border-rose-400 text-rose-700 animate-pulse'
                  : 'bg-slate-100/80 border-cyan-400 text-cyan-700 hover:scale-105'
              }`}
            >
              <span>🚪</span>
              <span>{isAlarm ? 'Hạ cửa kính Sash về vạch an toàn (< 45cm)' : 'Mở rộng cửa kính Sash (> 50cm)'}</span>
              <span className="text-[10px] font-mono opacity-80">[Click]</span>
            </button>
          </div>
        </Html>
      )}
    </group>
  );
};
