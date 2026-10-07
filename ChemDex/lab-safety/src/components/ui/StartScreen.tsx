import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { Button } from '../../ui/Button';
import { Keycap, Chip } from '../../ui/Controls';
import { vi } from '../../i18n/vi';
import {
  FlaskConical,
  Play,
  RotateCcw,
  BookOpen,
  Settings,
  User,
  ExternalLink,
  Gamepad2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export const StartScreen: React.FC = () => {
  const startGame = useStore((s) => s.startGame);
  const gameMode = useStore((s) => s.gameMode);
  const setGameMode = useStore((s) => s.setGameMode);
  const setShowRulesList = useStore((s) => s.setShowRulesList);
  const setShowCharacterCreator = useStore((s) => s.setShowCharacterCreator);
  const setShowSettings = useStore((s) => s.setShowSettings);

  const [hasSave, setHasSave] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hasCompletedSafetyTraining');
      if (saved) setHasSave(true);
    } catch {}
  }, []);

  const modes = [
    { id: 'learn', label: vi.menu.modeLearn, desc: 'Hướng dẫn đầy đủ, không phạt điểm' },
    { id: 'challenge', label: vi.menu.modeChallenge, desc: 'Có sự cố phát sinh, giới hạn lỗi' },
    { id: 'exam', label: vi.menu.modeExam, desc: 'Thi thực hành chấm điểm cấp chứng chỉ' },
  ] as const;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 sm:p-8 md:p-12 overflow-hidden select-none">
      
      {/* Background Soft White Gradient Overlay: Left 45% on desktop, Bottom 55% on mobile */}
      <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-white/95 via-white/80 to-transparent pointer-events-none md:w-[50%]" />

      {/* Main Left Menu Column */}
      <div className="relative z-10 max-w-md my-auto pointer-events-auto flex flex-col">
        
        {/* Logo Tile & Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-3.5 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-lg border border-[var(--line)] flex items-center justify-center text-[var(--primary)] shrink-0">
              <FlaskConical className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-50)] text-[var(--primary-600)] text-xs font-bold border border-cyan-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{vi.app.badge}</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--ink)] tracking-tight leading-[1.1] mb-2 font-sans">
            {vi.app.title}
          </h1>
          <p className="text-sm sm:text-base text-[var(--ink-2)] font-medium leading-relaxed">
            {vi.app.subtitle}
          </p>
        </motion.div>

        {/* Stacked Action Buttons (56px) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3 w-full"
        >
          {/* Primary Start Button */}
          <Button
            variant="primary"
            size="lg"
            className="w-full text-base shadow-lg shadow-cyan-500/25 justify-center"
            icon={<Play className="w-5 h-5 fill-current" />}
            onClick={() => startGame()}
          >
            {vi.menu.start}
          </Button>

          {/* Continue (if save exists) */}
          {hasSave && (
            <Button
              variant="secondary"
              size="lg"
              className="w-full justify-center"
              icon={<RotateCcw className="w-5 h-5 text-emerald-600" />}
              onClick={() => startGame()}
            >
              {vi.menu.continue}
            </Button>
          )}

          {/* Handbook Button */}
          <Button
            variant="secondary"
            size="lg"
            className="w-full justify-center"
            icon={<BookOpen className="w-5 h-5 text-[var(--primary)]" />}
            onClick={() => setShowRulesList(true)}
          >
            {vi.menu.handbook}
          </Button>

          {/* Game Mode Selector */}
          <div className="relative">
            <Button
              variant="secondary"
              size="lg"
              className="w-full justify-between"
              icon={<Gamepad2 className="w-5 h-5 text-indigo-500" />}
              onClick={() => setShowModeSelect(!showModeSelect)}
            >
              <span>{vi.menu.gameModes}: <strong className="text-[var(--primary)]">{modes.find(m => m.id === gameMode)?.label}</strong></span>
            </Button>

            {showModeSelect && (
              <div className="absolute top-full left-0 right-0 mt-2 p-2 white-glass rounded-2xl border border-[var(--line)] shadow-xl space-y-1.5 z-20">
                {modes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setGameMode(m.id);
                      setShowModeSelect(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer ${
                      gameMode === m.id
                        ? 'bg-[var(--primary-50)] border border-[var(--primary)]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold text-[var(--ink)]">{m.label}</div>
                    <div className="text-[11px] text-[var(--ink-2)] mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings & Character Profile Row */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              variant="secondary"
              size="md"
              icon={<User className="w-4 h-4 text-[var(--primary)]" />}
              onClick={() => setShowCharacterCreator(true)}
            >
              {vi.menu.character}
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={<Settings className="w-4 h-4 text-slate-500" />}
              onClick={() => setShowSettings(true)}
            >
              {vi.menu.settings}
            </Button>
          </div>

        </motion.div>

        {/* External links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500"
        >
          <a
            href="/"
            className="hover:text-[var(--primary)] transition-colors inline-flex items-center gap-1 hover:underline"
          >
            <span>{vi.menu.periodicTable}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-slate-300">·</span>
          <a
            href="/lab-3d/"
            className="hover:text-[var(--primary)] transition-colors inline-flex items-center gap-1 hover:underline"
          >
            <span>{vi.menu.chemLab}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </motion.div>

        {/* Device Controls Chips */}
        <div className="mt-8 pt-4 border-t border-[var(--line)]/60 flex flex-wrap gap-2 text-xs text-[var(--ink-2)]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-[var(--line)] shadow-xs font-semibold">
            <Keycap label="W/A/S/D" className="h-5 text-[10px]" />
            <span>Di chuyển</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-[var(--line)] shadow-xs font-semibold">
            <Keycap label="Chuột" className="h-5 text-[10px]" />
            <span>Xoay góc nhìn</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-[var(--line)] shadow-xs font-semibold">
            <Keycap label="E" className="h-5 text-[10px]" />
            <span>Tương tác</span>
          </span>
        </div>

      </div>

    </div>
  );
};
