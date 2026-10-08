import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore, playerCoords } from '../../store/useStore';
import { ProgressRing } from '../../ui/ProgressRing';
import { Keycap } from '../../ui/Controls';
import { Sheet } from '../../ui/Sheet';
import { vi } from '../../i18n/vi';
import {
  Trophy,
  Pause,
  HelpCircle,
  AlertOctagon,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Hand,
  Navigation
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { getActiveObjective } from '../3d/lab/ObjectiveMarker';
import { WaterDropletsOverlay } from './hud/WaterDropletsOverlay';
import { LabMinimapHUD } from './hud/LabMinimapHUD';

export const HUD: React.FC = () => {
  const currentPhase = useStore((s) => s.currentPhase);
  const score = useStore((s) => s.score);
  const tasks = useStore((s) => s.tasks);
  const completeTask = useStore((s) => s.completeTask);
  const activeErrorBanner = useStore((s) => s.activeErrorBanner);
  const dismissErrorBanner = useStore((s) => s.dismissErrorBanner);
  const activeInteraction = useStore((s) => s.activeInteraction);
  const setShowSettings = useStore((s) => s.setShowSettings);
  const setShowRulesList = useStore((s) => s.setShowRulesList);
  const setActiveRuleDialog = useStore((s) => s.setActiveRuleDialog);
  const waterEffect = useStore((s) => s.waterEffect);

  const [showTaskListSheet, setShowTaskListSheet] = useState(false);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const prevScoreRef = useRef(score);

  // Real-time navigation compass & distance to active 3D objective
  const [navInfo, setNavInfo] = useState<{
    title: string;
    distance: number;
    angleDeg: number;
  } | null>(null);

  useEffect(() => {
    const updateNav = () => {
      const state = useStore.getState();
      if (state.view !== 'game') {
        setNavInfo(null);
        return;
      }
      const activeObj = getActiveObjective(
        state.currentPhase,
        state.tasks,
        state.player.flags
      );
      if (!activeObj) {
        setNavInfo(null);
        return;
      }

      const dx = activeObj.position[0] - playerCoords.position[0];
      const dz = activeObj.position[2] - playerCoords.position[2];
      const dist = Math.hypot(dx, dz);

      const targetAngle = Math.atan2(dx, dz);
      let diff = targetAngle - playerCoords.rotationY;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const angleDeg = (-diff * 180) / Math.PI;

      setNavInfo({
        title: activeObj.title,
        distance: parseFloat(dist.toFixed(1)),
        angleDeg: Math.round(angleDeg),
      });
    };

    const timer = setInterval(updateNav, 80);
    return () => clearInterval(timer);
  }, []);

  // Auto-dismiss error banner after 4 seconds
  useEffect(() => {
    if (!activeErrorBanner) return;
    const timer = setTimeout(() => {
      dismissErrorBanner();
    }, 4000);
    return () => clearTimeout(timer);
  }, [activeErrorBanner, dismissErrorBanner]);

  // Floating score delta (+5, -8) animation
  useEffect(() => {
    const diff = score - prevScoreRef.current;
    if (diff !== 0) {
      setScoreDelta(diff);
      const timer = setTimeout(() => setScoreDelta(null), 1400);
      prevScoreRef.current = score;
      return () => clearTimeout(timer);
    }
  }, [score]);

  // Active phase title
  const phaseTitle = currentPhase === 1
    ? vi.hud.phase1
    : currentPhase === 2
    ? vi.hud.phase2
    : vi.hud.phase3;

  // Current incomplete task
  const currentTask = useMemo(() => {
    return tasks.find((t) => !t.completed);
  }, [tasks]);

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  // Filter tasks belonging to current active phase
  const visiblePhaseTasks = useMemo(() => {
    if (currentPhase === 1) {
      return tasks.filter((t) => [
        'task_talk', 'task_rules', 'task_goggles', 'task_coat', 'task_gloves', 'task_mask', 'task_hair', 'task_shoes'
      ].includes(t.id));
    } else if (currentPhase === 2) {
      return tasks.filter((t) => [
        'task_fire_extinguisher', 'task_chemical_symbols', 'task_inspect_acid', 'task_bandage'
      ].includes(t.id));
    } else {
      return tasks.filter((t) => [
        'task_spill_kit', 'task_spill_neutralize', 'task_spill_wipe', 'task_trash_disposal'
      ].includes(t.id));
    }
  }, [tasks, currentPhase]);

  // Mobile virtual joystick states
  const setJoystickVec = useStore((s) => s.setJoystickVec);

  const handleDevSkip = () => {
    if (currentTask) {
      completeTask(currentTask.id);
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-30 select-none overflow-hidden p-3 sm:p-5 flex flex-col justify-between font-sans">
      
      {/* ================= TOP SECTION ================= */}
      <div className="w-full flex items-start justify-between gap-3 relative">
        
        {/* Top-Left: Objective Card (Desktop) / Progress Ring & Objective (Mobile) */}
        <div className="pointer-events-auto">
          {/* Desktop Objective Card */}
          <div
            onClick={() => setShowTaskListSheet(true)}
            className="hidden lg:flex items-center gap-3.5 px-4 py-3 white-glass rounded-2xl cursor-pointer hover:border-[var(--primary)] transition-all shadow-sm active:scale-[0.98]"
          >
            <ProgressRing progress={progressPercent} size={42} strokeWidth={4}>
              <span className="text-[11px] font-bold text-[var(--primary-600)]">
                {completedCount}/{tasks.length}
              </span>
            </ProgressRing>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--primary-600)]">
                {vi.hud.objective}
              </span>
              <h4 className="text-sm font-bold text-[var(--ink)] leading-snug line-clamp-1 max-w-[220px]">
                {currentTask ? currentTask.title : 'Đã hoàn thành xuất sắc!'}
              </h4>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 ml-1" />
          </div>

          {/* Mobile Compact Objective Pill */}
          <div
            onClick={() => setShowTaskListSheet(true)}
            className="lg:hidden flex items-center gap-2.5 px-3 py-2 white-glass rounded-full cursor-pointer shadow-sm active:scale-95 border border-[var(--line)]"
          >
            <ProgressRing progress={progressPercent} size={30} strokeWidth={3}>
              <span className="text-[9px] font-bold text-[var(--primary-600)]">{completedCount}</span>
            </ProgressRing>
            <span className="text-xs font-bold text-[var(--ink)] max-w-[150px] sm:max-w-[220px] truncate">
              {currentTask ? currentTask.title : 'Hoàn thành!'}
            </span>
          </div>
        </div>

        {/* Top-Center: Phase Pill & Waypoint Compass Guidance */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-auto flex flex-col items-center gap-1.5">
          <div className="px-4 py-1.5 white-glass rounded-full text-xs font-extrabold text-[var(--primary-600)] border border-cyan-100/80 shadow-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
            <span>{phaseTitle}</span>
          </div>

          {navInfo && (
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-950/85 backdrop-blur-md rounded-full text-[11px] font-bold text-white border border-cyan-400/40 shadow-lg">
              <div
                className="w-4 h-4 flex items-center justify-center transition-transform duration-100"
                style={{ transform: `rotate(${navInfo.angleDeg}deg)` }}
              >
                <Navigation className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
              </div>
              <span className="text-slate-200 max-w-[170px] sm:max-w-[260px] truncate">
                {navInfo.title}
              </span>
              <span className="font-mono text-[10px] text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
                {navInfo.distance}m
              </span>
            </div>
          )}
        </div>

        {/* Top-Right: Score chip, Dev Skip (only in dev), Pause button */}
        <div className="flex items-center gap-2 pointer-events-auto relative">
          
          {/* Score Chip */}
          <div className="relative">
            <div className="flex items-center gap-1.5 px-3.5 py-2 white-glass rounded-full text-xs font-bold text-[var(--ink)] shadow-xs border border-[var(--line)]">
              <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="font-mono text-sm font-extrabold text-amber-700">{score}</span>
            </div>

            {/* Rising Animated Score Delta (+5 or -8) */}
            <AnimatePresence>
              {scoreDelta !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 0, scale: 0.8 }}
                  animate={{ opacity: 1, y: -24, scale: 1.15 }}
                  exit={{ opacity: 0, y: -36 }}
                  className={`absolute right-2 -top-1 font-mono text-sm font-black pointer-events-none drop-shadow-md ${
                    scoreDelta > 0 ? 'text-emerald-500' : 'text-rose-600'
                  }`}
                >
                  {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dev Skip Button: Strictly gated by import.meta.env.DEV */}
          {Boolean((import.meta as any).env?.DEV) && (
            <button
              onClick={handleDevSkip}
              className="px-2.5 py-1.5 bg-rose-50 border border-rose-300 text-rose-600 hover:bg-rose-100 rounded-full text-[10px] font-mono font-bold uppercase transition-all active:scale-95"
              title="Dev Skip Task"
            >
              DEV: SKIP
            </button>
          )}

          {/* Settings / Pause Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 white-glass hover:bg-white rounded-full flex items-center justify-center text-[var(--ink-2)] hover:text-[var(--ink)] shadow-xs border border-[var(--line)] active:scale-95 transition-all"
            aria-label="Cài đặt & Tạm dừng"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================= ERROR BANNER (Slides from top) ================= */}
      <AnimatePresence>
        {activeErrorBanner && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="fixed top-18 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] z-50 pointer-events-auto"
          >
            <div className="bg-white rounded-2xl p-4 shadow-xl border border-red-200 border-l-6 border-l-[var(--danger)] flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 text-[var(--danger)] flex items-center justify-center shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--danger)]">
                    {activeErrorBanner.title}
                  </h4>
                  <button
                    onClick={() => {
                      dismissErrorBanner();
                      const rule = useStore.getState().tasks; // trigger handbook
                      setShowRulesList(true);
                    }}
                    className="text-[11px] font-bold text-[var(--primary)] hover:underline ml-2"
                  >
                    {vi.hud.viewRules}
                  </button>
                </div>
                <p className="text-xs text-slate-700 mt-0.5 font-medium leading-relaxed">
                  {activeErrorBanner.consequence}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= BOTTOM SECTION ================= */}
      <div className="w-full flex items-end justify-between relative pb-2 sm:pb-3 pointer-events-none">
        
        {/* Bottom-Left: Floating Mobile Joystick (on touch) */}
        <div className="pointer-events-auto">
          <VirtualJoystick onMove={(vec) => setJoystickVec(vec)} />
        </div>

        {/* Bottom-Center: Desktop Interaction Prompt & Key Shortcuts */}
        <div className="hidden lg:flex flex-col items-center pointer-events-auto gap-2">
          {activeInteraction && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="px-5 py-2.5 white-glass rounded-2xl border border-[var(--primary)] shadow-md flex items-center gap-3"
            >
              <div className="flex gap-1.5">
                <Keycap label="E" />
                <Keycap label="Space" />
              </div>
              <span className="text-sm font-bold text-[var(--ink)]">
                {activeInteraction}
              </span>
            </motion.div>
          )}

          {/* Persistent subtle Hotkey Ribbon */}
          <div className="px-3.5 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md text-white/90 text-[11px] font-semibold flex items-center gap-3 border border-white/10 shadow-lg">
            <span className="flex items-center gap-1"><span className="text-cyan-400 font-mono font-bold">WASD</span> Di chuyển</span>
            <span className="text-white/30">|</span>
            <span className="flex items-center gap-1"><span className="text-cyan-400 font-mono font-bold">Shift</span> Chạy</span>
            <span className="text-white/30">|</span>
            <span className="flex items-center gap-1"><span className="text-amber-400 font-mono font-bold">E / Space</span> Tương tác</span>
            <span className="text-white/30">|</span>
            <span className="flex items-center gap-1"><span className="text-rose-400 font-mono font-bold">Backspace / Q</span> Cất / Đóng</span>
            <span className="text-white/30">|</span>
            <span className="flex items-center gap-1"><span className="text-cyan-400 font-mono font-bold">Tab</span> Sổ tay</span>
            <span className="text-white/30">|</span>
            <span className="flex items-center gap-1"><span className="text-cyan-400 font-mono font-bold">1-6</span> Dụng cụ</span>
          </div>
        </div>

        {/* Bottom-Right: Mobile Big 64px Interact Button */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          {/* Quick Rules Handbook Button */}
          <button
            onClick={() => setShowRulesList(true)}
            className="w-11 h-11 white-glass rounded-full flex items-center justify-center text-[var(--primary)] border border-[var(--line)] shadow-sm active:scale-95 transition-all"
            title="Sổ tay an toàn"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Big Touch Interact Button */}
          <button
            onClick={() => {
              // Trigger interaction via synthetic keydown 'KeyE'
              window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e' }));
            }}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-xl select-none ${
              activeInteraction
                ? 'btn-primary-glow text-white ring-4 ring-cyan-400/40 animate-pulse'
                : 'bg-white/90 text-slate-400 border-2 border-slate-200'
            }`}
          >
            <Hand className="w-6 h-6 mb-0.5" />
            <span className="text-[10px] font-extrabold uppercase tracking-tight text-center px-1 leading-none line-clamp-1">
              {activeInteraction || 'Tương tác'}
            </span>
          </button>
        </div>

      </div>

      {/* ================= TASK LIST SHEET MODAL ================= */}
      <Sheet
        isOpen={showTaskListSheet}
        onClose={() => setShowTaskListSheet(false)}
        title={vi.hud.tasks}
        subtitle={`${phaseTitle} (${completedCount}/${tasks.length} hoàn thành)`}
        maxWidth="max-w-md"
      >
        <div className="space-y-2.5 py-1">
          {visiblePhaseTasks.map((t) => (
            <div
              key={t.id}
              className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                t.completed
                  ? 'bg-slate-50/80 border-slate-200 text-slate-400'
                  : 'bg-white border-[var(--line)] text-[var(--ink)] shadow-xs'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  t.completed ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300'
                }`}
              >
                {t.completed && <CheckCircle2 className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-bold ${t.completed ? 'line-through opacity-70' : ''}`}>
                {t.title}
              </span>
            </div>
          ))}
        </div>
      </Sheet>

      {/* 2D Architectural Minimap Radar */}
      <LabMinimapHUD />

      {/* Screen Water / Chemical Splatter Overlay */}
      <WaterDropletsOverlay active={waterEffect.active} type={waterEffect.type} />

    </div>
  );
};

// ================= Virtual Joystick Component =================
const VirtualJoystick: React.FC<{ onMove: (vec: { x: number; y: number }) => void }> = ({ onMove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const maxRadius = 45;

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let limitedX = dx;
    let limitedY = dy;
    if (dist > maxRadius) {
      limitedX = (dx / dist) * maxRadius;
      limitedY = (dy / dist) * maxRadius;
    }

    setKnobPos({ x: limitedX, y: limitedY });
    onMove({ x: limitedX / maxRadius, y: -limitedY / maxRadius });
  };

  const handlePointerEnd = () => {
    setIsDragging(false);
    setKnobPos({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!isDragging) return;

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => handlePointerEnd();
    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onMouseUp = () => handlePointerEnd();

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => {
        setIsDragging(true);
        handlePointerMove(e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        if (e.touches.length > 0) {
          setIsDragging(true);
          handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full white-glass border-2 border-[var(--line)] shadow-lg flex items-center justify-center relative touch-none select-none"
    >
      <div className="absolute w-full h-[1px] bg-slate-200" />
      <div className="absolute h-full w-[1px] bg-slate-200" />
      <div
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[var(--primary)] to-cyan-400 shadow-md border-2 border-white flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform duration-75"
        style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
      >
        <div className="w-3 h-3 rounded-full bg-white/60" />
      </div>
    </div>
  );
};
