import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useQualityStore } from '../../vfx/quality';
import { Activity } from 'lucide-react';
import { useFrameStats } from '../../render/FrameTelemetry';

export const PerformanceHUD = React.memo(function PerformanceHUD() {
  const stats = useFrameStats();
  const [isActive, setIsActive] = useState(false);
  const lastActiveTimestamp = useRef(Date.now());

  const draggingVesselId = useAppStore(state => state.draggingVesselId);
  const isDraggingChemical = useAppStore(state => !!state.isDraggingChemical);
  const pouringChemical = useAppStore(state => !!state.pouringChemical);
  const moveMode = useAppStore(state => state.moveMode);
  const buretteDispensing = useAppStore(state => state.burette.isDispensing);
  const vesselCount = useAppStore(state => state.vesselIds.length);


  // Trigger activity on any lab interaction
  const triggerActive = () => {
    lastActiveTimestamp.current = Date.now();
    setIsActive(true);
  };

  useEffect(() => {
    if (draggingVesselId || isDraggingChemical || pouringChemical || buretteDispensing || moveMode) {
      triggerActive();
    }
  }, [draggingVesselId, isDraggingChemical, pouringChemical, buretteDispensing, moveMode]);

  // Handle pointer and keyboard interaction over window/canvas
  useEffect(() => {
    const onInteract = () => {
      lastActiveTimestamp.current = Date.now();
      if (!isActive) setIsActive(true);
    };

    window.addEventListener('pointermove', onInteract, { passive: true });
    window.addEventListener('pointerdown', onInteract, { passive: true });
    window.addEventListener('keydown', onInteract, { passive: true });

    // Check every second to auto-dim when idle > 3.5s
    const interval = setInterval(() => {
      if (Date.now() - lastActiveTimestamp.current > 3500 && !draggingVesselId && !pouringChemical && !buretteDispensing) {
        setIsActive(false);
      }
    }, 800);

    return () => {
      window.removeEventListener('pointermove', onInteract);
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
      clearInterval(interval);
    };
  }, [isActive, draggingVesselId, pouringChemical, buretteDispensing]);

  const preference = useQualityStore(state => state.preference);
  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const setPreference = useQualityStore(state => state.setPreference);

  // Quality has a single owner: the renderer's PerformanceMonitor. A second
  // window RAF feedback loop used to fight it and oscillate between tiers.


  return (
    <div
      className={`absolute top-4 right-4 z-20 pointer-events-auto transition-all duration-300 transform ${
        isActive 
          ? 'opacity-90 translate-y-0 scale-100' 
          : 'opacity-40 -translate-y-1 scale-95 hover:opacity-100'
      }`}
    >
      <div className="bg-slate-950/80 backdrop-blur-md border border-slate-700/60 rounded-full px-3 py-1 shadow-lg flex items-center gap-2.5 text-white">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full animate-pulse ${stats.fps >= 50 ? 'bg-emerald-400 shadow-emerald-400/50' : stats.fps >= 30 ? 'bg-amber-400' : 'bg-red-400'} shadow-sm`} />
          <span className="text-[11px] font-mono font-bold tracking-tight">
            {stats.samples ? stats.fps : '…'} <span className="text-[9px] font-normal text-slate-400">FPS</span>
          </span>
        </div>
        
        <span className="w-px h-3 bg-slate-700/80" />

        <span className="text-[10px] font-mono text-slate-300" title={`P95: ${stats.p95_ms} ms · ${stats.drawCalls} draw calls · ${stats.triangles} triangles`}>
          {stats.ms} <span className="text-[8px] text-slate-400">ms</span>
        </span>

        <span className="w-px h-3 bg-slate-700/80" />

        <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
          <Activity size={10} className="text-blue-400" />
          {vesselCount} {vesselCount === 1 ? 'vessel' : 'vessels'}
        </span>

        <span className="w-px h-3 bg-slate-700/80" />

        <select
          aria-label="Chất lượng đồ họa"
          value={preference}
          onChange={event=>setPreference(event.target.value as typeof preference)}
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-600 cursor-pointer"
        >
          <option value="auto">Tự động ({effectiveTier})</option>
          <option value="potato">Tiết kiệm</option><option value="low">Nhẹ</option>
          <option value="medium">Cân bằng</option><option value="high">Đẹp</option><option value="ultra">Rất đẹp</option>
        </select>
      </div>
    </div>
  );
});

