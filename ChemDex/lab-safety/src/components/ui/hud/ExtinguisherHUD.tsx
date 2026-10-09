import React from 'react';
import { useStore } from '../../../store/useStore';
import { fireSimulation } from '../../../core/fire/FireSim';

export const ExtinguisherHUD: React.FC = () => {
  const view = useStore((s) => s.view);
  const player = useStore((s) => s.player);
  const ext = fireSimulation.currentExtinguisher;

  if (view !== 'game' || !player.inventory.hasFireExtinguisher || !ext) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">
      {/* PASS Steps Tracker Card */}
      <div className="bg-slate-900/85 backdrop-blur-md p-4 rounded-2xl border border-slate-700/60 shadow-xl flex flex-col gap-2.5 w-64">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Quy trình P.A.S.S</span>
          <span className="text-[10px] text-amber-400 font-mono">BÌNH {ext.agent.toUpperCase()}</span>
        </div>

        {/* P - Pull Pin */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-lg flex items-center justify-center font-black ${
                ext.pinPulled ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500/30 text-rose-300'
              }`}
            >
              P
            </span>
            <span className={ext.pinPulled ? 'text-emerald-300 line-through' : 'text-white'}>
              Pull (Rút chốt chì)
            </span>
          </div>
          {!ext.pinPulled && <span className="text-[10px] text-amber-300 font-mono">[Giữ E]</span>}
        </div>

        {/* A - Aim at base */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-sky-500/30 text-sky-300 flex items-center justify-center font-black">
              A
            </span>
            <span className="text-white">Aim (Ngắm GỐC lửa)</span>
          </div>
          <span className="text-[10px] text-slate-400">Tâm ngắm</span>
        </div>

        {/* S - Squeeze trigger */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-lg flex items-center justify-center font-black ${
                ext.isDischarging ? 'bg-amber-400 text-slate-950 animate-pulse' : 'bg-slate-700 text-slate-300'
              }`}
            >
              S
            </span>
            <span className="text-white">Squeeze (Bóp cò)</span>
          </div>
          <span className="text-[10px] text-amber-300 font-mono">[Chuột Trái]</span>
        </div>

        {/* S - Sweep side to side */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-black">
              S
            </span>
            <span className="text-white">Sweep (Quét qua lại)</span>
          </div>
          <span className="text-[10px] text-slate-400">Lắc chuột</span>
        </div>

        {/* Pressure Manometer Needle Indicator */}
        <div className="mt-2 pt-2 border-t border-slate-700/60 flex flex-col gap-1">
          <div className="flex justify-between text-[11px] font-semibold text-slate-300">
            <span>Áp suất bình</span>
            <span className="font-mono text-emerald-400">{(ext.pressure * 100).toFixed(0)}% (Vùng Xanh)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, ext.pressure * 100))}%` }}
            />
          </div>
        </div>

        {/* Remaining Agent Gauge */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] font-semibold text-slate-300">
            <span>Lượng khí còn lại</span>
            <span className="font-mono text-sky-400">{(ext.agentLeft * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
            <div
              className="bg-sky-500 h-full transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, ext.agentLeft * 100))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
