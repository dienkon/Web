import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  Undo2, Redo2, Move, Pause, Play, 
  RotateCcw, Globe, Presentation, BookOpen, Compass, Volume2, VolumeX,
  Lock, Unlock, FileText
} from 'lucide-react';

export function WorkbenchToolbar() {
  const { 
    language, 
    setLanguage, 
    labMode, 
    setLabMode, 
    isPresentationMode, 
    setPresentationMode,
    setLabReportOpen,
    isSimulationPaused, 
    setSimulationPaused,
    cameraPreset, 
    setCameraPreset, 
    isScreenLocked,
    toggleScreenLock,
    moveMode, 
    setMoveMode,
    canUndo, 
    canRedo, 
    undo, 
    redo,
    timeScale, 
    setTimeScale,
    soundEnabled,
    toggleSound,
    resetWorkbench
  } = useAppStore();

  const t = (en: string, vi: string) => language === 'en' ? en : vi;

  return (
    <div className="flex items-center justify-between px-3.5 py-1.5 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs z-20 shrink-0 gap-2">
      {/* Left: Mode Selection (Icon-prioritized with subtle text) */}
      <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/60">
        <button
          onClick={() => { setLabMode('free'); setPresentationMode(false); }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            labMode === 'free' && !isPresentationMode 
              ? 'bg-white text-blue-600 shadow-xs font-bold' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title={t('Free Lab Mode: Freely mix reagents & build experiments', 'Chế độ Tự do: Thao tác tự do không giới hạn')}
        >
          <Compass size={14} className="shrink-0" />
          <span className="hidden sm:inline text-[11px]">{t('Free', 'Tự do')}</span>
        </button>

        <button
          onClick={() => { setLabMode('guided'); setPresentationMode(false); }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            labMode === 'guided' && !isPresentationMode 
              ? 'bg-white text-blue-600 shadow-xs font-bold' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title={t('Standard Curriculum: Follow guided curriculum experiments', 'Chế độ Bài mẫu: Làm theo thí nghiệm chuẩn SGK')}
        >
          <BookOpen size={14} className="shrink-0" />
          <span className="hidden sm:inline text-[11px]">{t('Guided', 'Bài mẫu')}</span>
        </button>

        <button
          onClick={() => setPresentationMode(!isPresentationMode)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            isPresentationMode 
              ? 'bg-indigo-600 text-white shadow-xs font-bold' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title={t('Presentation Mode (Full-canvas view)', 'Chế độ Trình chiếu')}
        >
          <Presentation size={14} className="shrink-0" />
          <span className="hidden md:inline text-[11px]">{t('Present', 'Trình chiếu')}</span>
        </button>

        <button
          onClick={() => setLabReportOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all"
          title={t('Student Lab Report & AI Assessment', 'Phiếu Báo Cáo Thực Hành & Chấm Điểm AI')}
        >
          <FileText size={13} className="shrink-0" />
          <span className="hidden md:inline text-[11px]">{t('Report', 'Báo Cáo')}</span>
        </button>
      </div>

      {/* Center: Interactive Workbench Controls (Icon-prioritized, VIP Design) */}
      <div className="flex items-center gap-1.5">
        {/* History: Undo / Redo */}
        <div className="flex items-center bg-slate-100/90 rounded-lg p-0.5 border border-slate-200/60">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-600 rounded transition-colors"
            title={t('Undo (Ctrl+Z)', 'Hoàn tác (Ctrl+Z)')}
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-600 rounded transition-colors"
            title={t('Redo (Ctrl+Y)', 'Làm lại (Ctrl+Y)')}
          >
            <Redo2 size={14} />
          </button>
        </div>

        {/* Lock Screen Toggle (Thay thế hoàn toàn phần di chuyển màn hình) */}
        <button
          onClick={toggleScreenLock}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            isScreenLocked 
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs font-bold ring-2 ring-amber-300/50' 
              : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
          }`}
          title={
            isScreenLocked
              ? t('Screen Locked: Camera fixed (no rotate, pan, or zoom). Click to unlock', 'Màn hình ĐÃ KHÓA: Giữ cố định góc nhìn (không xoay, không zoom, không di chuyển). Nhấp để mở khóa')
              : t('Lock Screen: Click to freeze camera perspective and prevent accidental rotation', 'Khóa màn hình: Giữ cố định góc nhìn, chống xoay hay di chuyển màn hình ngoài ý muốn')
          }
        >
          {isScreenLocked ? <Lock size={14} className="shrink-0" /> : <Unlock size={14} className="shrink-0" />}
          <span className="text-[11px]">{isScreenLocked ? t('Locked', 'Đã khóa') : t('Lock Screen', 'Khóa màn hình')}</span>
        </button>

        {/* Move Items Mode (Kéo thả bình và đèn cồn) */}
        <button
          onClick={() => setMoveMode(!moveMode)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            moveMode 
              ? 'bg-blue-600 text-white border-blue-700 shadow-xs font-bold' 
              : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
          }`}
          title={t('Move Items: Drag vessels and alcohol burners across the workbench', 'Di chuyển dụng cụ: Kéo thả bình thí nghiệm, đèn cồn trên bàn')}
        >
          <Move size={14} className="shrink-0" />
          <span className="text-[11px] hidden sm:inline">{t('Move Items', 'Di chuyển dụng cụ')}</span>
        </button>

        {/* Camera Angles Selector */}
        <div className="flex items-center bg-slate-100/90 rounded-lg p-0.5 border border-slate-200/60 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setCameraPreset('perspective')}
            className={`px-2 py-1 rounded text-[11px] transition-colors ${cameraPreset === 'perspective' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'hover:text-slate-900'}`}
            title={t('3D Perspective View', 'Góc nhìn 3D')}
          >
            3D
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            className={`px-2 py-1 rounded text-[11px] transition-colors ${cameraPreset === 'top' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'hover:text-slate-900'}`}
            title={t('Top-Down View', 'Nhìn trên')}
          >
            {t('Top', 'Trên')}
          </button>
          <button
            onClick={() => setCameraPreset('front')}
            className={`px-2 py-1 rounded text-[11px] transition-colors ${cameraPreset === 'front' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'hover:text-slate-900'}`}
            title={t('Front Eye-Level View', 'Mặt trước')}
          >
            {t('Front', 'Trước')}
          </button>
          <button
            onClick={() => setCameraPreset('side')}
            className={`px-2 py-1 rounded text-[11px] transition-colors ${cameraPreset === 'side' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'hover:text-slate-900'}`}
            title={t('Side Profile View', 'Bên hông')}
          >
            {t('Side', 'Hông')}
          </button>
        </div>
      </div>

      {/* Right: Simulation Speed & Controls (Ultra-clean Icons) */}
      <div className="flex items-center gap-1.5">
        {/* Pause / Resume */}
        <button
          onClick={() => setSimulationPaused(!isSimulationPaused)}
          className={`p-1.5 rounded-lg border transition-colors ${
            isSimulationPaused 
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
          }`}
          title={isSimulationPaused ? t('Resume simulation', 'Tiếp tục phản ứng') : t('Pause simulation', 'Tạm dừng phản ứng')}
        >
          {isSimulationPaused ? <Play size={13} /> : <Pause size={13} />}
        </button>

        {/* Time Scale Multipliers */}
        <div className="flex items-center bg-slate-100/90 rounded-lg p-0.5 border border-slate-200/60">
          {[1, 2, 5].map(speed => (
            <button
              key={speed}
              onClick={() => setTimeScale(speed)}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors ${
                timeScale === speed ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
              title={`${speed}x Speed`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Sound Toggle */}
        <button
          onClick={toggleSound}
          className={`p-1.5 rounded-lg border transition-colors ${
            soundEnabled 
              ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' 
              : 'bg-slate-100 text-slate-400 border-slate-200/80 hover:bg-slate-200'
          }`}
          title={soundEnabled ? t('Mute Sound Effects', 'Tắt âm thanh') : t('Enable Sound Effects', 'Bật âm thanh')}
        >
          {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
        </button>

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
          className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200/80 transition-colors"
          title={t('Switch Language', 'Đổi ngôn ngữ')}
        >
          <Globe size={12} />
          <span>{language === 'en' ? 'VI' : 'EN'}</span>
        </button>

        {/* Reset Workbench */}
        <button
          onClick={() => {
            if (confirm(t('Reset all vessels and lab equipment to default?', 'Đặt lại toàn bộ bàn thí nghiệm về mặc định?'))) {
              resetWorkbench();
            }
          }}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
          title={t('Reset Workbench', 'Đặt lại bàn thí nghiệm')}
        >
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
  );
}
