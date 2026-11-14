import React from 'react';
import {
  Compass,
  BookOpen,
  PlayCircle,
  Presentation,
  Undo2,
  Redo2,
  Pause,
  Play,
  RotateCcw,
  Globe,
  Sun,
  Moon,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Package,
  Sliders,
  Loader2,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useLabStore, SimTimeScale } from '../../store/useLabStore';
import { useLabEnvironment } from '../../store/useLabEnvironment';
import { LabEnvironmentControls } from '../workspace/LabEnvironmentControls';

export interface CatalogLoadingBadgeProps {
  loading: boolean;
  language: 'vi' | 'en';
}

export const CatalogLoadingBadge: React.FC<CatalogLoadingBadgeProps> = ({ loading, language }) => {
  if (!loading) return null;
  const vi = language === 'vi';
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium whitespace-nowrap"
    >
      <Loader2 size={12} className="animate-spin shrink-0" aria-hidden="true" />
      <span>
        {vi ? 'Đang tải thư viện 1 300 phản ứng…' : 'Loading 1,300-reaction library…'}
      </span>
    </span>
  );
};

export const WorkbenchToolbar: React.FC = () => {
  const {
    language,
    setLanguage,
    activeMode,
    setActiveMode,
    isPresentationMode,
    setPresentationMode,
    isShowcaseActive,
    setShowcaseActive,
    simulationPaused,
    setSimulationPaused,
    simTimeScale,
    setSimTimeScale,
    workbenchZoom,
    setWorkbenchZoom,
    requestFitWorkbench,
    undo,
    redo,
    undoStack,
    redoStack,
    resetWorkbench,
    mobilePanel,
    setMobilePanel,
    catalogReady,
  } = useLabStore(
    useShallow((s) => ({
      language: s.language,
      setLanguage: s.setLanguage,
      activeMode: s.activeMode,
      setActiveMode: s.setActiveMode,
      isPresentationMode: s.isPresentationMode,
      setPresentationMode: s.setPresentationMode,
      isShowcaseActive: s.isShowcaseActive,
      setShowcaseActive: s.setShowcaseActive,
      simulationPaused: s.simulationPaused,
      setSimulationPaused: s.setSimulationPaused,
      simTimeScale: s.simTimeScale,
      setSimTimeScale: s.setSimTimeScale,
      workbenchZoom: s.workbenchZoom,
      setWorkbenchZoom: s.setWorkbenchZoom,
      requestFitWorkbench: s.requestFitWorkbench,
      undo: s.undo,
      redo: s.redo,
      undoStack: s.undoStack,
      redoStack: s.redoStack,
      resetWorkbench: s.resetWorkbench,
      mobilePanel: s.mobilePanel,
      setMobilePanel: s.setMobilePanel,
      catalogReady: s.catalogReady,
    }))
  );

  const { labTheme, toggleLabTheme } = useLabEnvironment();
  const vi = language === 'vi';
  const t = (en: string, v: string) => (vi ? v : en);

  const handleThemeToggle = () => {
    toggleLabTheme();
    const nextTheme = labTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    try {
      localStorage.setItem('chemdex:theme', JSON.stringify(nextTheme));
    } catch {
      // Storage disabled
    }
  };

  const speeds: SimTimeScale[] = [0.5, 1, 2, 5];

  return (
    <div className="flex items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-1.5 sm:py-2 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs z-30 shrink-0 overflow-x-auto no-scrollbar">
      {/* Left: Mobile Drawer Toggles + Lab Mode Switcher */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Mobile Only: Inventory / Inspector drawer buttons */}
        <div className="flex lg:hidden items-center gap-1">
          <button
            type="button"
            onClick={() => setMobilePanel(mobilePanel === 'inventory' ? null : 'inventory')}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              mobilePanel === 'inventory'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
            aria-label={t('Toggle Inventory Drawer', 'Mở Kho hóa chất & dụng cụ')}
          >
            <Package size={14} />
            <span>{t('Shelf', 'Kho')}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel(mobilePanel === 'inspector' ? null : 'inspector')}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              mobilePanel === 'inspector'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
            aria-label={t('Toggle Inspector Drawer', 'Mở Thông số')}
          >
            <Sliders size={14} />
            <span>{t('Info', 'Xem')}</span>
          </button>
        </div>

        {/* Mode Tabs: Free | Guided | Showcase | Present */}
        <div className="flex items-center gap-0.5 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/70">
          <button
            type="button"
            onClick={() => {
              setActiveMode('free');
              setShowcaseActive(false);
              setPresentationMode(false);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeMode === 'free' && !isShowcaseActive && !isPresentationMode
                ? 'bg-white text-blue-600 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title={t('Free Lab Mode', 'Chế độ Tự do')}
          >
            <Compass size={14} className="shrink-0" />
            <span className="hidden sm:inline">{t('Free', 'Tự do')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('guided');
              setShowcaseActive(false);
              setPresentationMode(false);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeMode === 'guided' && !isShowcaseActive && !isPresentationMode
                ? 'bg-white text-blue-600 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title={t('Guided Curriculum Mode', 'Chế độ Bài mẫu SGK')}
          >
            <BookOpen size={14} className="shrink-0" />
            <span className="hidden sm:inline">{t('Guided', 'Bài mẫu')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowcaseActive(!isShowcaseActive);
              setPresentationMode(false);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              isShowcaseActive
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title={t('Auto Showcase Lab Demonstrations', 'Trình diễn thí nghiệm tự động')}
          >
            <PlayCircle size={14} className="shrink-0" />
            <span className="hidden md:inline">{t('Showcase', 'Trình diễn')}</span>
          </button>

          <button
            type="button"
            onClick={() => setPresentationMode()}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              isPresentationMode
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title={t('Full-Canvas Presentation Mode', 'Chế độ Toàn màn hình')}
          >
            <Presentation size={14} className="shrink-0" />
            <span className="hidden xl:inline">{t('Present', 'Chiếu')}</span>
          </button>
        </div>
      </div>

      {/* Center: Undo/Redo, Sim Speed & Canvas Zoom */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center bg-slate-100/90 rounded-lg p-0.5 border border-slate-200/70">
          <button
            type="button"
            onClick={undo}
            disabled={undoStack.length === 0}
            className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded transition-colors cursor-pointer"
            title={t('Undo (Ctrl+Z)', 'Hoàn tác (Ctrl+Z)')}
            aria-label="Undo"
          >
            <Undo2 size={14} />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={redoStack.length === 0}
            className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded transition-colors cursor-pointer"
            title={t('Redo (Ctrl+Y)', 'Làm lại (Ctrl+Y)')}
            aria-label="Redo"
          >
            <Redo2 size={14} />
          </button>
        </div>

        {/* Play/Pause + Speed */}
        <div className="flex items-center gap-1 bg-slate-100/90 rounded-lg p-0.5 border border-slate-200/70">
          <button
            type="button"
            onClick={() => setSimulationPaused(!simulationPaused)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              simulationPaused
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white'
            }`}
            title={simulationPaused ? t('Resume Simulation', 'Tiếp tục mô phỏng') : t('Pause Simulation', 'Tạm dừng mô phỏng')}
            aria-label={simulationPaused ? 'Resume' : 'Pause'}
          >
            {simulationPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button
            type="button"
            onClick={() => {
              const idx = speeds.indexOf(simTimeScale);
              setSimTimeScale(speeds[(idx + 1) % speeds.length]);
            }}
            className="sm:hidden px-2 py-1 text-[11px] font-bold font-mono rounded bg-white text-blue-600 shadow-xs cursor-pointer"
            title={t('Cycle Simulation Speed', 'Đổi tốc độ mô phỏng')}
            aria-label="Cycle simulation speed"
          >
            {simTimeScale}x
          </button>
          {speeds.map((sp) => (
            <button
              key={sp}
              type="button"
              onClick={() => setSimTimeScale(sp)}
              className={`hidden sm:inline-flex px-2 py-1 text-[11px] font-bold font-mono rounded transition-colors cursor-pointer ${
                simTimeScale === sp ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title={`${sp}x`}
            >
              {sp}x
            </button>
          ))}
        </div>

        {/* Zoom / Fit Workbench */}
        <div className="flex items-center gap-0.5 bg-slate-100/90 rounded-lg p-0.5 border border-slate-200/70">
          <button
            type="button"
            onClick={() => setWorkbenchZoom(workbenchZoom - 0.15)}
            className="hidden sm:inline-flex p-1.5 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
            title={t('Zoom Out', 'Thu nhỏ')}
            aria-label="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="hidden sm:inline-block px-1.5 text-[11px] font-mono font-bold text-slate-600 min-w-[42px] text-center">
            {Math.round(workbenchZoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setWorkbenchZoom(workbenchZoom + 0.15)}
            className="hidden sm:inline-flex p-1.5 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
            title={t('Zoom In', 'Phóng to')}
            aria-label="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={requestFitWorkbench}
            className="p-1.5 text-slate-600 hover:text-blue-600 rounded cursor-pointer"
            title={t('Fit Bench to Screen', 'Căn vừa màn hình')}
            aria-label="Fit workbench"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Right: Catalog Status, Atmosphere Controls, Theme, Language & Reset */}
      <div className="flex items-center gap-1.5 shrink-0">
        <CatalogLoadingBadge loading={!catalogReady} language={language} />
        <LabEnvironmentControls />

        <button
          type="button"
          onClick={handleThemeToggle}
          className="p-1.5 rounded-lg border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          title={labTheme === 'dark' ? t('Switch to Daylight Lab', 'Chế độ Phòng sáng') : t('Switch to Night Lab', 'Chế độ Phòng tối')}
          aria-label="Toggle lab lighting theme"
        >
          {labTheme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
        </button>

        <button
          type="button"
          onClick={() => setLanguage(vi ? 'en' : 'vi')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
          title={t('Switch Language', 'Đổi ngôn ngữ')}
        >
          <Globe size={13} />
          <span>{vi ? 'VI' : 'EN'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            resetWorkbench();
          }}
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
          title={t('Reset Workbench', 'Làm mới bàn thí nghiệm')}
          aria-label="Reset workbench"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};
