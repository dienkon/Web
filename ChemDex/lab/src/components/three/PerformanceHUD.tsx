import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useQualityStore } from '../../vfx/quality';
import { Activity } from 'lucide-react';

export const PerformanceHUD = React.memo(function PerformanceHUD() {
  const [stats, setStats] = useState({ fps: 60, ms: 16.6 });
  const [isActive, setIsActive] = useState(false);
  const lastActiveTimestamp = useRef(Date.now());

  const draggingVesselId = useAppStore(state => state.draggingVesselId);
  const isDraggingChemical = useAppStore(state => !!state.isDraggingChemical);
  const pouringChemical = useAppStore(state => !!state.pouringChemical);
  const moveMode = useAppStore(state => state.moveMode);
  const buretteDispensing = useAppStore(state => state.burette.isDispensing);
  const vesselCount = useAppStore(state => state.vesselIds.length);

  // Smooth RAF loop to measure real UI and WebGL frame performance
  useEffect(() => {
    let animId: number;
    let frames = 0;
    let lastTime = performance.now();

    const updateLoop = (now: number) => {
      frames++;
      const elapsed = now - lastTime;
      if (elapsed >= 500) {
        const measuredFps = Math.min(60, Math.max(1, Math.round((frames * 1000) / elapsed)));
        const frameTimeMs = Number((elapsed / frames).toFixed(1));
        setStats({ fps: measuredFps, ms: frameTimeMs });
        frames = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(updateLoop);
    };

    animId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

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

  const cycleQuality = () => {
    if (preference === 'auto') setPreference('high');
    else if (preference === 'high') setPreference('medium');
    else if (preference === 'medium') setPreference('low');
    else setPreference('auto');
  };

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
            {stats.fps} <span className="text-[9px] font-normal text-slate-400">FPS</span>
          </span>
        </div>
        
        <span className="w-px h-3 bg-slate-700/80" />

        <span className="text-[10px] font-mono text-slate-300">
          {stats.ms} <span className="text-[8px] text-slate-400">ms</span>
        </span>

        <span className="w-px h-3 bg-slate-700/80" />

        <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
          <Activity size={10} className="text-blue-400" />
          {vesselCount} {vesselCount === 1 ? 'vessel' : 'vessels'}
        </span>

        <span className="w-px h-3 bg-slate-700/80" />

        <button
          onClick={cycleQuality}
          title="Click to toggle VFX graphics quality (Auto / High / Medium / Low)"
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700/80 transition-colors cursor-pointer"
        >
          {preference === 'auto' ? `Auto (${effectiveTier[0].toUpperCase()})` : preference.toUpperCase()}
        </button>
      </div>
    </div>
  );
});

