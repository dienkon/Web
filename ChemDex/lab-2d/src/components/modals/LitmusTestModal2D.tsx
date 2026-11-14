import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { EquipmentState } from '../../types/equipment';
import { soundEngine } from '../../services/soundEngine';

interface LitmusTestModal2DProps {
  vessel: EquipmentState | null;
  language: 'vi' | 'en';
  onClose: () => void;
}

function getLitmusResult(ph: number, vi: boolean): { color: string; label: string } {
  if (ph < 6.0) {
    return {
      color: '#ef4444',
      label: vi ? 'Axit — Quỳ tím hóa Đỏ' : 'Acidic — Litmus turns Red',
    };
  }
  if (ph <= 7.5) {
    return {
      color: '#a855f7',
      label: vi ? 'Trung tính — Không đổi màu' : 'Neutral — Remains Purple',
    };
  }
  return {
    color: '#3b82f6',
    label: vi ? 'Bazơ / Kiềm — Quỳ tím hóa Xanh' : 'Basic — Litmus turns Blue',
  };
}

/**
 * Interactive animated litmus dip-strip modal ported directly from lab-3d LitmusTestModal.
 */
export const LitmusTestModal2D: React.FC<LitmusTestModal2DProps> = ({ vessel, language, onClose }) => {
  const [dipping, setDipping] = useState(false);
  const [dipped, setDipped] = useState(false);
  const vi = language === 'vi';

  useEffect(() => {
    setDipping(false);
    setDipped(false);
  }, [vessel?.id]);

  useEffect(() => {
    if (!vessel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [vessel, onClose]);

  if (!vessel) return null;

  const ph = vessel.ph ?? 7.0;
  const result = getLitmusResult(ph, vi);
  const paperBottomColor = dipped ? result.color : '#fbbf24';
  const vesselName = vi ? vessel.name_vi : vessel.name;
  const hasFluid = vessel.volume_ml > 0.2;

  const handleDip = () => {
    if (dipping || !hasFluid) return;
    setDipping(true);
    soundEngine.drip();
    window.setTimeout(() => {
      setDipped(true);
      setDipping(false);
      soundEngine.success();
    }, 520);
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 text-slate-100 shadow-2xl p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🧪</span>
              <span>{vi ? 'Thử giấy quỳ tím' : 'Litmus Paper Test'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {vi
                ? `Nhúng giấy quỳ vào ${vesselName} (${vessel.volume_ml.toFixed(1)} mL)`
                : `Dip indicator strip into ${vesselName} (${vessel.volume_ml.toFixed(1)} mL)`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Animation Stage */}
        <div className="relative h-56 rounded-xl bg-slate-950/90 border border-slate-800 flex items-end justify-center pb-5 overflow-hidden">
          {/* Paper Strip moving down on dip */}
          <div
            className="relative w-7 h-32 rounded-sm shadow-lg transition-transform duration-500 ease-in-out z-10 overflow-hidden border border-white/25"
            style={{
              transform: dipping || dipped ? 'translateY(34px)' : 'translateY(-36px)',
              backgroundColor: '#fbbf24',
            }}
          >
            <div
              className="absolute bottom-0 inset-x-0 h-1/2 transition-colors duration-300"
              style={{ backgroundColor: paperBottomColor }}
            />
          </div>

          {/* Target Beaker Preview */}
          <div
            className="absolute bottom-4 w-36 h-24 rounded-b-xl border-2 border-t-0 border-white/25 overflow-hidden"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
          >
            {hasFluid && (
              <div
                className="w-full h-16 mt-8 transition-colors duration-300"
                style={{
                  backgroundColor: vessel.liquidColorHex || '#38bdf8',
                  opacity: Math.max(0.35, vessel.liquidOpacity ?? 0.55),
                }}
              />
            )}
          </div>
        </div>

        {/* Action & Result Area */}
        <div className="min-h-[60px] flex flex-col items-center justify-center gap-2">
          {!hasFluid ? (
            <p className="text-xs text-amber-300 text-center">
              {vi ? 'Bình chưa có dung dịch để thử pH.' : 'Vessel has no liquid to test.'}
            </p>
          ) : !dipped ? (
            <button
              type="button"
              onClick={handleDip}
              disabled={dipping}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-sm transition-colors shadow-md"
            >
              {dipping
                ? vi ? 'Đang nhúng...' : 'Dipping...'
                : vi ? 'Nhúng giấy quỳ vào bình' : 'Dip Paper into Solution'}
            </button>
          ) : (
            <div className="w-full text-center space-y-2">
              <div
                className="text-sm font-bold flex items-center justify-center gap-2"
                style={{ color: result.color }}
              >
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: result.color }} />
                <span>{result.label}</span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                pH = {ph.toFixed(2)} •{' '}
                <button
                  type="button"
                  onClick={() => {
                    setDipped(false);
                    setDipping(false);
                  }}
                  className="text-sky-400 hover:underline font-sans font-semibold"
                >
                  {vi ? 'Thử lại' : 'Test again'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Color Scale Legend */}
        <div className="pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-[11px] text-slate-300 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#ef4444]" />
            <span>&lt; 6 {vi ? 'Axit' : 'Acid'}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#a855f7]" />
            <span>7 {vi ? 'Trung tính' : 'Neutral'}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#3b82f6]" />
            <span>&gt; 7.5 {vi ? 'Bazơ' : 'Base'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
