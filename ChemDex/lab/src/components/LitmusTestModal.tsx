import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { labSound } from '../utils/audio';
import { X, Check, Droplets, Info } from 'lucide-react';
import { formatPH } from '../utils/units';

function LitmusTestDialog({ vesselId }: { vesselId: string }) {
  const setActiveLitmusVesselId = useAppStore(state => state.setActiveLitmusVesselId);
  const vessels = useAppStore(state => state.vessels);
  const language = useAppStore(state => state.language);

  const [isDipped, setIsDipped] = useState(false);
  const vessel = vessels[vesselId];

  useEffect(() => {
    setIsDipped(false);
    const timer = setTimeout(() => {
      setIsDipped(true);
      labSound.playGlassClink();
    }, 500);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveLitmusVesselId(null);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [vesselId, setActiveLitmusVesselId]);

  if (!vessel) {
    setActiveLitmusVesselId(null);
    return null;
  }

  const t = (en: string, vi: string) => language === 'en' ? en : vi;
  const ph = vessel.ph ?? 7.0;

  // Determine litmus color based on pH
  // Acidic: red / pink; Neutral: purple / pale yellow; Basic: blue / dark violet
  const getLitmusColor = (val: number) => {
    if (val < 3) return '#ef4444'; // strong red
    if (val < 6) return '#f87171'; // light red/orange
    if (val <= 7.5) return '#a855f7'; // purple neutral
    if (val <= 10) return '#60a5fa'; // light blue
    return '#1d4ed8'; // deep blue
  };

  const litmusColor = isDipped ? getLitmusColor(ph) : '#fbbf24'; // starts as pale yellow/tan paper

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={() => setActiveLitmusVesselId(null)}
    >
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets size={16} className="text-purple-400" />
            <h3 className="text-sm font-bold tracking-wide">
              {t('pH Litmus Paper Test Strip', 'Thử Độ pH Bằng Giấy Quỳ Tím')}
            </h3>
          </div>
          <button 
            onClick={() => setActiveLitmusVesselId(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Target Solution */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">
              {t('Testing Solution in:', 'Dung dịch cần kiểm tra:')}
            </span>
            <span className="font-bold text-slate-800">{vessel.name}</span>
          </div>

          {/* Animated Dipping Test Paper Strip */}
          <div className="relative h-44 bg-slate-100/70 rounded-xl border border-slate-200 flex flex-col items-center justify-end overflow-hidden p-3">
            {/* Beaker Representation */}
            <div className="absolute bottom-0 w-36 h-24 border-2 border-slate-400 border-t-0 rounded-b-xl bg-blue-100/40 backdrop-blur-xs flex flex-col justify-end overflow-hidden">
              <div 
                className="w-full h-16 transition-colors duration-500"
                style={{ backgroundColor: vessel.liquidColor || '#38bdf8', opacity: 0.7 }}
              />
            </div>

            {/* Litmus Paper Strip */}
            <div 
              className={`absolute top-0 w-7 h-32 rounded-b-sm border border-amber-300 shadow-md transition-all duration-700 ${
                isDipped ? 'translate-y-12' : 'translate-y-2'
              }`}
              style={{ backgroundColor: '#fef3c7' }}
            >
              {/* Paper Top Grip */}
              <div className="w-full h-8 bg-amber-200/90 border-b border-amber-300 flex items-center justify-center">
                <span className="text-[8px] font-mono font-bold text-amber-800">pH</span>
              </div>
              {/* Dipped chemical reaction tip */}
              <div 
                className="absolute bottom-0 w-full h-14 rounded-b-sm transition-colors duration-1000 border-t border-black/10"
                style={{ backgroundColor: litmusColor }}
              />
            </div>

            <div className="z-10 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full text-[11px] font-bold text-slate-700 shadow-xs">
              {isDipped ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: litmusColor }} />
                  {ph < 6 ? t('Acidic (Turned Red)', 'Axit (Hóa Đỏ)') : (ph > 8 ? t('Basic (Turned Blue)', 'Bazơ / Kiềm (Hóa Xanh)') : t('Neutral (Purple)', 'Trung Tính (Tím)'))}
                  {' '}(pH ≈ {formatPH(ph)})
                </span>
              ) : (
                <span>{t('Dipping strip into solution...', 'Đang nhúng giấy quỳ vào dung dịch...')}</span>
              )}
            </div>
          </div>

          {/* Standard pH 0 - 14 Color Scale Comparator */}
          <div>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              <span>{t('Acidic (0-6)', 'Axit (0 - 6)')}</span>
              <span>{t('Neutral (7)', 'Trung tính (7)')}</span>
              <span>{t('Basic (8-14)', 'Kiềm (8 - 14)')}</span>
            </div>
            <div className="grid grid-cols-15 gap-0.5 h-6 rounded-lg overflow-hidden border border-slate-200">
              {[
                { ph: 0, col: '#dc2626' },
                { ph: 1, col: '#ef4444' },
                { ph: 2, col: '#f87171' },
                { ph: 3, col: '#fb923c' },
                { ph: 4, col: '#facc15' },
                { ph: 5, col: '#eab308' },
                { ph: 6, col: '#ca8a04' },
                { ph: 7, col: '#a855f7' },
                { ph: 8, col: '#818cf8' },
                { ph: 9, col: '#60a5fa' },
                { ph: 10, col: '#3b82f6' },
                { ph: 11, col: '#2563eb' },
                { ph: 12, col: '#1d4ed8' },
                { ph: 13, col: '#1e40af' },
                { ph: 14, col: '#172554' }
              ].map(item => (
                <div 
                  key={item.ph}
                  className={`flex flex-col items-center justify-center text-[9px] font-bold text-white transition-all ${
                    Math.round(ph) === item.ph ? 'ring-2 ring-black ring-offset-1 z-10 scale-110 shadow-sm' : 'opacity-80'
                  }`}
                  style={{ backgroundColor: item.col }}
                  title={`pH ${item.ph}`}
                >
                  {item.ph}
                </div>
              ))}
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => setActiveLitmusVesselId(null)}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            {t('Done', 'Đóng')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LitmusTestModal() {
  const activeLitmusVesselId = useAppStore(state => state.activeLitmusVesselId);
  
  if (!activeLitmusVesselId) return null;

  return <LitmusTestDialog vesselId={activeLitmusVesselId} />;
}

