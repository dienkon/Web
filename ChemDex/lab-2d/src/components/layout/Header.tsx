import React from 'react';
import { useLabStore } from '../../store/useLabStore';
import { RotateCcw, Undo2, Redo2, BookOpen, Globe, Beaker, Sparkles, Volume2, VolumeX } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    language,
    setLanguage,
    undo,
    redo,
    undoStack,
    redoStack,
    resetWorkbench,
    toggleNotebook,
    toggleAIAssistant,
    isMuted,
    toggleMute,
    activeMode,
    activeExperiment,
  } = useLabStore();

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between select-none z-20 shadow-2xs">
      {/* Brand & Mode */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Beaker className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>ChemDex</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-md">2D</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              {language === 'vi' ? 'Phòng Thí Nghiệm Hóa Học Ảo' : 'Virtual Chemistry Lab'}
            </p>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-200 ml-2" />

        {/* Mode Tag */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>
            {activeMode === 'guided' && activeExperiment
              ? (language === 'vi' ? activeExperiment.title_vi : activeExperiment.title_en)
              : (language === 'vi' ? 'Thí nghiệm tự do' : 'Free Lab Mode')}
          </span>
        </div>
      </div>

      {/* Top Workbench Controls */}
      <div className="flex items-center gap-1.5">
        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-colors"
          title={language === 'vi' ? 'Hoàn tác (Undo)' : 'Undo'}
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-colors"
          title={language === 'vi' ? 'Làm lại (Redo)' : 'Redo'}
        >
          <Redo2 className="w-4 h-4" />
        </button>

        {/* Reset Workbench */}
        <button
          onClick={resetWorkbench}
          className="p-2 rounded-xl text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
          title={language === 'vi' ? 'Dọn sạch bàn thí nghiệm' : 'Reset Workbench'}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* Gemini AI Assistant Button */}
        <button
          onClick={() => toggleAIAssistant(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-indigo-700 text-xs font-semibold transition-all shadow-2xs group"
          title={language === 'vi' ? 'Mở Trợ lý Hóa học AI Gemini 3.5' : 'Open Gemini 3.5 AI Assistant'}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline">
            {language === 'vi' ? 'Trợ lý AI' : 'AI Tutor'}
          </span>
          <span className="text-[10px] bg-indigo-600 text-white font-mono px-1 rounded-sm">3.5</span>
        </button>

        {/* Audio Mute / Unmute */}
        <button
          onClick={toggleMute}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title={isMuted ? (language === 'vi' ? 'Bật âm thanh' : 'Unmute Sound') : (language === 'vi' ? 'Tắt âm thanh' : 'Mute Sound')}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Lab Notebook / Data Sheet */}
        <button
          onClick={() => toggleNotebook(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden md:inline">
            {language === 'vi' ? 'Sổ tay' : 'Data Sheet'}
          </span>
        </button>

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors"
          title={language === 'vi' ? 'Chuyển sang tiếng Anh' : 'Switch to Vietnamese'}
        >
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>{language === 'vi' ? 'VI' : 'EN'}</span>
        </button>
      </div>
    </header>
  );
};
