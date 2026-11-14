import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Beaker,
  Sparkles,
  Atom,
  Activity,
  BookOpen,
  Volume2,
  VolumeX,
  Key,
  Save,
} from 'lucide-react';
import { useLabStore } from '../../store/useLabStore';

export const Header: React.FC = () => {
  const {
    language,
    toggleNotebook,
    toggleAIAssistant,
    toggleApiKeyModal,
    togglePeriodicTable,
    toggleReactionLibrary,
    toggleTitrationCurve,
    isMuted,
    toggleMute,
    activeMode,
    isShowcaseActive,
    activeExperiment,
    history,
  } = useLabStore(
    useShallow((s) => ({
      language: s.language,
      toggleNotebook: s.toggleNotebook,
      toggleAIAssistant: s.toggleAIAssistant,
      toggleApiKeyModal: s.toggleApiKeyModal,
      togglePeriodicTable: s.togglePeriodicTable,
      toggleReactionLibrary: s.toggleReactionLibrary,
      toggleTitrationCurve: s.toggleTitrationCurve,
      isMuted: s.isMuted,
      toggleMute: s.toggleMute,
      activeMode: s.activeMode,
      isShowcaseActive: s.isShowcaseActive,
      activeExperiment: s.activeExperiment,
      history: s.history,
    }))
  );

  const vi = language === 'vi';

  const modeLabel = isShowcaseActive
    ? vi ? 'Trình diễn tự động' : 'Auto Showcase'
    : activeMode === 'guided' && activeExperiment
    ? (vi ? activeExperiment.title_vi : activeExperiment.title_en)
    : (vi ? 'Thí nghiệm tự do' : 'Free Lab');

  return (
    <header className="h-12 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between gap-2 select-none z-30 shrink-0">
      {/* Brand + Subtle ChemDex Portal Links */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white shadow-xs">
            <Beaker className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1">
              <span>ChemDex</span>
              <span className="text-[10.5px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded">
                2D
              </span>
            </h1>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-2.5 pl-2 ml-1 border-l border-slate-200 text-[11px] font-semibold text-teal-700">
          <a href="/" className="hover:underline whitespace-nowrap">
            {vi ? '← Bảng tuần hoàn' : '← Periodic'}
          </a>
          <a href="/tien-ich/cau-truc-3d/" className="hover:underline whitespace-nowrap">
            {vi ? 'Cấu trúc 3D' : '3D Structures'}
          </a>
          <a href="/on-tap/" className="hover:underline whitespace-nowrap">
            {vi ? 'Ôn tập' : 'Practice'}
          </a>
        </nav>

        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold max-w-[230px] truncate">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isShowcaseActive ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
          <span className="truncate">{modeLabel}</span>
        </div>
      </div>

      {/* Scientific Reference Tools & Utilities */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => toggleReactionLibrary(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-200/80 bg-white hover:bg-emerald-50 text-emerald-700 text-[11px] font-semibold transition-colors cursor-pointer"
          title={vi ? 'Kho Phương trình & 131 Thí nghiệm SGK' : 'Reaction Library & 131+ Experiments'}
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">{vi ? 'Kho PƯ' : 'Reactions'}</span>
          <span className="sm:hidden text-[10px]">PƯ</span>
        </button>

        <button
          type="button"
          onClick={() => togglePeriodicTable(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-indigo-200/80 bg-white hover:bg-indigo-50 text-indigo-700 text-[11px] font-semibold transition-colors"
          title={vi ? 'Bảng tuần hoàn nguyên tố' : 'Periodic Table'}
        >
          <Atom className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden xl:inline">{vi ? 'Bảng TH' : 'Elements'}</span>
        </button>

        <button
          type="button"
          onClick={() => toggleTitrationCurve(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-200/80 bg-white hover:bg-emerald-50 text-emerald-700 text-[11px] font-semibold transition-colors"
          title={vi ? 'Đồ thị chuẩn độ pH' : 'Titration Curve'}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden xl:inline">{vi ? 'Đồ thị pH' : 'Titration'}</span>
        </button>

        <button
          type="button"
          onClick={() => toggleAIAssistant(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-indigo-200 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-indigo-700 text-[11px] font-semibold transition-colors"
          title={vi ? 'Trợ lý Hóa học AI Gemini 3.5' : 'Gemini 3.5 AI Tutor'}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">{vi ? 'Trợ lý AI' : 'AI Tutor'}</span>
        </button>

        <button
          type="button"
          onClick={() => toggleApiKeyModal(true)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
          title={vi ? 'Cấu hình API Key' : 'API Key Settings'}
          aria-label="API Key"
        >
          <Key className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('chemdex:sessions'))}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition-colors"
          title={vi ? 'Lưu & khôi phục phiên thực hành' : 'Save & Restore Sessions'}
        >
          <Save className="w-3.5 h-3.5 text-teal-600" />
          <span className="hidden md:inline">{vi ? 'Phiên' : 'Sessions'}</span>
        </button>

        <button
          type="button"
          onClick={() => toggleNotebook(true)}
          className="relative flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition-colors"
          title={vi ? 'Sổ tay & Nhật ký phản ứng' : 'Lab Data Sheet'}
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden md:inline">{vi ? 'Sổ tay' : 'Notebook'}</span>
          {history.length > 0 && (
            <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10.5px] font-bold font-mono">
              {history.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={toggleMute}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title={isMuted ? (vi ? 'Bật âm thanh' : 'Unmute') : (vi ? 'Tắt âm thanh' : 'Mute')}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
