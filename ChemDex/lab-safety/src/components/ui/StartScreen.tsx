import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { vi } from '../../i18n/vi';
import {
  ArrowRight, Atom, BookOpen, Check, ChevronDown, ExternalLink, FlaskConical, Maximize2,
  Gamepad2, GraduationCap, Play, RotateCcw, Settings, ShieldCheck, Sparkles,
  User, Zap,
} from 'lucide-react';
import { requestLandscapeFullscreen } from '../../systems/device/useOrientationGate';

const MODES = [
  { id: 'learn', label: vi.menu.modeLearn, eyebrow: 'Làm quen', desc: 'Chỉ dẫn từng bước, tự do luyện tập', icon: GraduationCap },
  { id: 'challenge', label: vi.menu.modeChallenge, eyebrow: 'Tình huống', desc: 'Sự cố phát sinh và giới hạn lỗi', icon: Zap },
  { id: 'exam', label: vi.menu.modeExam, eyebrow: 'Đánh giá', desc: 'Chấm điểm và cấp chứng nhận', icon: ShieldCheck },
] as const;

export const StartScreen: React.FC = () => {
  const startGame = useStore((s) => s.startGame);
  const resumeGame = useStore((s) => s.resumeGame);
  const gameMode = useStore((s) => s.gameMode);
  const setGameMode = useStore((s) => s.setGameMode);
  const setShowRulesList = useStore((s) => s.setShowRulesList);
  const setShowCharacterCreator = useStore((s) => s.setShowCharacterCreator);
  const setShowSettings = useStore((s) => s.setShowSettings);
  const character = useStore((s) => s.character);
  const reduceMotion = useStore((s) => s.settings.reduceMotion);
  const [hasSave, setHasSave] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(false);
  const selectedMode = MODES.find((mode) => mode.id === gameMode) ?? MODES[0];
  const SelectedModeIcon = selectedMode.icon;

  useEffect(() => {
    try { setHasSave(Boolean(localStorage.getItem('labSafetySave'))); }
    catch { setHasSave(false); }
  }, []);

  const handleStart = () => {
    if (!hasSave || window.confirm('Bắt đầu lượt mới sẽ thay thế tiến trình đang lưu. Bạn muốn tiếp tục?')) startGame();
  };

  return (
    <div className="start-shell absolute inset-0 z-20 overflow-y-auto select-none pointer-events-auto" data-ui>
      <div className="start-grid absolute inset-0" aria-hidden="true" />
      <div className="start-vignette absolute inset-0" aria-hidden="true" />

      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 min-h-full p-4 sm:p-6 lg:p-8 flex flex-col"
      >
        <header className="flex items-center justify-between pointer-events-auto">
          <a href="/" className="group inline-flex items-center gap-3" aria-label="Về trang chủ ChemDex">
            <span className="relative grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white/95 text-cyan-600 shadow-sm backdrop-blur-none">
              <FlaskConical className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
            </span>
            <span>
              <strong className="block text-sm font-black tracking-[0.16em] text-slate-800">CHEMDEX</strong>
              <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-700">Simulation Lab</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowCharacterCreator(true)} className="start-icon-button group w-auto gap-2 px-3" aria-label="Tùy chỉnh nhân vật">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-cyan-300/15 text-cyan-700"><User className="h-3.5 w-3.5" /></span>
              <span className="hidden max-w-28 truncate text-xs font-bold text-slate-800 sm:block">{character.name}</span>
            </button>
            <button type="button" onClick={() => setShowSettings(true)} className="start-icon-button" aria-label="Cài đặt"><Settings className="h-4 w-4" /></button>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 items-center py-5 sm:py-8">
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto w-full max-w-[560px]"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-800 backdrop-blur-none">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" /></span>
              Phòng mô phỏng sẵn sàng
            </div>

            <div className="mb-5">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan-700"><Atom className="h-4 w-4" />Huấn luyện an toàn tương tác</p>
              <h1 className="max-w-[520px] text-[clamp(2.35rem,6vw,4.85rem)] font-black leading-[0.94] tracking-[-0.055em] text-slate-800">LAB SAFETY<span className="text-cyan-600">.</span></h1>
              <p className="mt-4 max-w-[470px] text-sm font-medium leading-6 text-slate-600 sm:text-base">Bước vào phòng thí nghiệm 3D, nhận diện nguy cơ và xử lý sự cố bằng chính thao tác của bạn.</p>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-2.5">
              {([['05', 'Chặng huấn luyện'], ['34', 'Nhiệm vụ thực hành'], ['100', 'Điểm an toàn']] as const).map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 backdrop-blur-none">
                  <strong className="block font-mono text-lg font-black text-slate-800 sm:text-xl">{value}</strong>
                  <span className="mt-0.5 block text-[9px] font-bold uppercase leading-4 tracking-[0.08em] text-slate-600 sm:text-[10px]">{label}</span>
                </div>
              ))}
            </div>

            <div className="relative mb-3">
              <button type="button" onClick={() => setShowModeSelect((value) => !value)} aria-expanded={showModeSelect} className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 text-left shadow-sm backdrop-blur-none transition hover:border-cyan-300/35">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-700"><SelectedModeIcon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-700">Chế độ · {selectedMode.eyebrow}</span>
                  <strong className="block truncate text-sm font-extrabold text-slate-800">{selectedMode.label}</strong>
                  <span className="block truncate text-[10px] font-medium text-slate-600">{selectedMode.desc}</span>
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-600 transition-transform ${showModeSelect ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showModeSelect && (
                  <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-30 grid gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur-none sm:grid-cols-3">
                    {MODES.map((mode) => {
                      const Icon = mode.icon;
                      const selected = mode.id === gameMode;
                      return (
                        <button key={mode.id} type="button" onClick={() => { setGameMode(mode.id); setShowModeSelect(false); }} className={`rounded-xl border p-3 text-left transition ${selected ? 'border-cyan-300/45 bg-cyan-300/12' : 'border-white/5 bg-white/[0.025] hover:border-slate-200 hover:bg-white/[0.06]'}`}>
                          <div className="mb-2 flex items-center justify-between"><Icon className={`h-4 w-4 ${selected ? 'text-cyan-700' : 'text-slate-600'}`} />{selected && <Check className="h-3.5 w-3.5 text-emerald-700" />}</div>
                          <strong className="block text-xs font-extrabold text-slate-800">{mode.label}</strong>
                          <span className="mt-1 block text-[9px] leading-4 text-slate-600">{mode.desc}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button type="button" onClick={handleStart} className="start-primary group flex min-h-14 flex-1 items-center justify-between rounded-2xl px-5 text-left">
                <span><span className="block text-[9px] font-black uppercase tracking-[0.17em] text-cyan-950/65">Bắt đầu phiên</span><strong className="text-sm font-black text-cyan-950">{hasSave ? 'Lượt chơi mới' : vi.menu.start}</strong></span>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-cyan-100 text-slate-800 transition-transform group-hover:translate-x-1"><Play className="h-4 w-4 fill-current" /></span>
              </button>
              {hasSave && <button type="button" onClick={resumeGame} className="start-secondary flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-extrabold text-slate-800"><RotateCcw className="h-4 w-4 text-emerald-700" />{vi.menu.continue}</button>}
            </div>

            <button
              type="button"
              onClick={() => void requestLandscapeFullscreen()}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 text-xs font-extrabold text-slate-700 transition hover:border-cyan-300/35 hover:text-cyan-800 active:scale-[0.98]"
            >
              <Maximize2 className="h-4 w-4 text-cyan-600" aria-hidden="true" />
              {vi.device.fullscreenLandscape}
            </button>

            <button type="button" onClick={() => setShowRulesList(true)} className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-600 transition hover:text-cyan-700"><BookOpen className="h-4 w-4" />Mở sổ tay an toàn trước khi vào lab<ArrowRight className="h-3.5 w-3.5" /></button>
          </motion.section>
        </main>

        <footer className="pointer-events-auto flex items-end justify-between gap-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
          <div className="hidden items-center gap-2 sm:flex"><Gamepad2 className="h-3.5 w-3.5 text-cyan-600" />WASD di chuyển · Chuột quan sát · E tương tác</div>
          <div className="ml-auto flex items-center gap-3">
            <a href="/" className="inline-flex items-center gap-1.5 transition hover:text-slate-800">Bảng tuần hoàn <ExternalLink className="h-3 w-3" /></a>
            <span className="h-3 w-px bg-white/15" />
            <a href="/lab-3d/" className="inline-flex items-center gap-1.5 transition hover:text-slate-800">Lab hóa học <Sparkles className="h-3 w-3" /></a>
          </div>
        </footer>
      </motion.div>
    </div>
  );
};
