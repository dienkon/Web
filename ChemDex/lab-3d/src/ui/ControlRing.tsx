import React, { useEffect, useState } from 'react';
import { wheelRouter, WheelStateUpdate } from '../input/WheelRouter';
import { useAppStore } from '../store/useAppStore';

export const ControlRing: React.FC = () => {
  const [wheelState, setWheelState] = useState<WheelStateUpdate | null>(null);
  const lang = useAppStore(state => state.language);

  useEffect(() => {
    return wheelRouter.subscribe(s => setWheelState(s));
  }, []);

  if (!wheelState || !wheelState.active) return null;

  const colorClasses = {
    safe: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/80 shadow-emerald-500/20',
    warning: 'text-amber-400 border-amber-500/50 bg-amber-950/80 shadow-amber-500/20',
    danger: 'text-rose-400 border-rose-500/50 bg-rose-950/80 shadow-rose-500/20'
  }[wheelState.warningLevel];

  const paramName = lang === 'vi' ? wheelState.paramName_vi : wheelState.paramName_en;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95">
      <div className={`px-4 py-2.5 rounded-2xl border backdrop-blur-md shadow-2xl flex items-center gap-3 ${colorClasses}`}>
        {/* Radial gauge pill */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-700/60"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              strokeWidth="3.5"
              strokeDasharray={`${Math.round(wheelState.normalizedValue * 100)}, 100`}
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-medium tracking-wide uppercase opacity-80">
            {paramName}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tracking-tight text-white">
              {wheelState.valueDisplay}
            </span>
            <span className="text-xs font-semibold text-slate-300">
              {wheelState.unit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
