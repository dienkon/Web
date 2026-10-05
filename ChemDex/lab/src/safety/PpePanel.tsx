import React, { useState, useEffect } from 'react';
import { ppeService, PPEState, PPEItem } from './Ppe';
import { useAppStore } from '../store/useAppStore';
import { ShieldCheck, ShieldAlert, Eye, Droplet, Sparkles, RefreshCw } from 'lucide-react';

export const PpePanel: React.FC = () => {
  const [ppe, setPpe] = useState<PPEState>(ppeService.getState());
  const lang = useAppStore(state => state.language);

  useEffect(() => {
    return ppeService.subscribe(s => setPpe(s));
  }, []);

  const items: Array<{ key: PPEItem; label_vi: string; label_en: string }> = [
    { key: 'goggles', label_vi: 'Kính bảo hộ', label_en: 'Safety Goggles' },
    { key: 'gloves', label_vi: 'Găng tay', label_en: 'Nitrile Gloves' },
    { key: 'labCoat', label_vi: 'Áo blu', label_en: 'Lab Coat' },
  ];

  return (
    <>
      {/* Eye Irritation Screen Overlay (Safe Capped Blur/Tear Vignette) */}
      {ppe.eyeIrritation && (
        <div 
          className="fixed inset-0 pointer-events-none z-40 transition-opacity duration-300"
          style={{
            background: 'radial-gradient(circle at center, transparent 40%, rgba(225, 29, 72, 0.25) 100%)',
            backdropFilter: `blur(${Math.round(ppe.eyeIrritationIntensity * 4)}px)`
          }}
        >
          <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-auto bg-rose-950/90 border border-rose-500/80 text-rose-200 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-bounce">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <div className="text-xs">
              <p className="font-bold">
                {lang === 'vi' ? 'Hóa chất bắn vào mắt! (Chưa đeo kính)' : 'Chemical Eye Splash! (No goggles)'}
              </p>
              <p className="text-[11px] text-rose-300">
                {lang === 'vi' ? 'Hãy dùng bồn rửa mắt cấp cứu ngay.' : 'Rinse immediately at emergency eye-wash.'}
              </p>
            </div>
            <button
              onClick={() => ppeService.rinseAtEyeWash()}
              className="ml-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs shadow-md transition-colors"
            >
              {lang === 'vi' ? 'Rửa mắt (Eye Wash)' : 'Rinse Eyes'}
            </button>
          </div>
        </div>
      )}

      {/* Skin exposure notification */}
      {ppe.skinExposure && (
        <div className="fixed bottom-24 left-6 z-40 bg-amber-950/90 border border-amber-500/80 text-amber-200 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 backdrop-blur-md">
          <Droplet className="w-4 h-4 text-amber-400 animate-pulse" />
          <div className="text-xs">
            <span className="font-bold">
              {lang === 'vi' ? 'Dính hóa chất lên tay!' : 'Skin Contact Alert!'}
            </span>
            <span className="text-[11px] text-amber-300 ml-1.5">
              ({ppe.exposedChemical || 'Chemical'})
            </span>
          </div>
          <button
            onClick={() => ppeService.washHands()}
            className="ml-2 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold rounded-lg text-[11px] transition-colors"
          >
            {lang === 'vi' ? 'Rửa tay' : 'Wash Hands'}
          </button>
        </div>
      )}

      {/* PPE Status & Toggle Dock */}
      <div className="fixed top-3 left-44 z-30 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/70 p-1.5 rounded-2xl shadow-xl">
        <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">PPE</span>
        </div>

        {items.map(({ key, label_vi, label_en }) => {
          const equipped = ppe[key];
          return (
            <button
              key={key}
              onClick={() => ppeService.toggleItem(key)}
              title={lang === 'vi' ? label_vi : label_en}
              className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                equipped
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/40'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${equipped ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
              <span>{lang === 'vi' ? label_vi : label_en}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
