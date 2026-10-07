import React, { useState, useEffect } from 'react';
import { PourController } from '../controller/PourController';
import { PourSessionState } from '../controller/modes';
import { useAppStore } from '../../store/useAppStore';

export const PourHUD = React.memo(function PourHUD() {
  const [session, setSession] = useState<PourSessionState | null>(null);
  const lang = useAppStore(state => state.language);

  useEffect(() => {
    return PourController.subscribe(s => setSession(s));
  }, []);

  if (!session || (session.phase === 'idle' && session.flow_ml_s <= 0)) {
    return null;
  }

  const deg = Math.round((session.tilt * 180) / Math.PI);
  const transferred = Math.round(session.transferred_ml * 10) / 10;
  const flow = Math.round(session.flow_ml_s * 10) / 10;

  const targetVessel = session.targetId ? useAppStore.getState().vessels[session.targetId] : null;
  const targetName = targetVessel?.name || (lang === 'vi' ? 'Bình nhận' : 'Target Vessel');

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none">
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl px-6 py-3 shadow-2xl flex items-center gap-6 text-white text-xs sm:text-sm">
        {/* Vessel Target & Aim Indicator */}
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full animate-pulse ${
            session.aim.kind === 'inside' ? 'bg-emerald-400' :
            session.aim.kind === 'rim' ? 'bg-amber-400' : 'bg-rose-500'
          }`} />
          <span className="font-medium text-slate-200">
            {targetName}
          </span>
        </div>

        {/* Volume Transferred */}
        <div className="flex flex-col items-center border-l border-slate-800 pl-4">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">
            {lang === 'vi' ? 'Đã rót' : 'Poured'}
          </span>
          <span className="text-base font-bold font-mono text-cyan-400">
            {transferred} <span className="text-xs font-normal text-slate-400">mL</span>
          </span>
        </div>

        {/* Flow Rate */}
        <div className="flex flex-col items-center border-l border-slate-800 pl-4">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">
            {lang === 'vi' ? 'Lưu lượng' : 'Flow Rate'}
          </span>
          <span className="text-base font-bold font-mono text-emerald-400">
            {flow} <span className="text-xs font-normal text-slate-400">mL/s</span>
          </span>
        </div>

        {/* Tilt Angle */}
        <div className="flex flex-col items-center border-l border-slate-800 pl-4">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">
            {lang === 'vi' ? 'Góc nghiêng' : 'Tilt'}
          </span>
          <span className="text-base font-bold font-mono text-amber-400">
            {deg}°
          </span>
        </div>
      </div>
    </div>
  );
});
