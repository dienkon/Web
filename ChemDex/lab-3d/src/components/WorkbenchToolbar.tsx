import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PhysicsPanel } from '../physical/PhysicsPanel';
import { useAppStore } from '../store/useAppStore';
import { MAX_SAMPLE_MARKERS, useSampleRecorder } from '../handling/sampleRecorder';
import { useShallow } from 'zustand/react/shallow';
import { LabEnvironmentControls } from './LabEnvironmentControls';
import {
  Undo2, Redo2, Move, Pause, Play,
  RotateCcw, Globe, Presentation, BookOpen, Compass, Volume2, VolumeX,
  Lock, Unlock, FileText, Wrench, SlidersHorizontal, X, Flag
} from 'lucide-react';

const InstrumentPanel = lazy(() => import('./InstrumentPanel'));

export function WorkbenchToolbar() {
  const [instrumentsOpen, setInstrumentsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const markerCount = useSampleRecorder(state => state.recording?.status === 'recording' ? state.recording.markers.length : null);
  const settingsRoot = useRef<HTMLDivElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!settingsOpen) return;
    const outside = (event: PointerEvent) => {
      // Physics opens a portal dialog; interacting with it must keep its owner mounted.
      if (event.target instanceof Element && event.target.closest('[aria-modal="true"]')) return;
      if (!settingsRoot.current?.contains(event.target as Node)) setSettingsOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSettingsOpen(false); settingsButton.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [settingsOpen]);
  const closeInstruments = useCallback(() => setInstrumentsOpen(false), []);
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
    selectedVesselId,
    selectedVessel,
    toggleLockVessel,
    moveMode,
    setMoveMode,
    canUndo,
    canRedo,
    doseBusy,
    undo,
    redo,
    timeScale,
    setTimeScale,
    soundEnabled,
    toggleSound,
    resetWorkbench
  } = useAppStore(useShallow(state => ({
    language: state.language, setLanguage: state.setLanguage,
    labMode: state.labMode, setLabMode: state.setLabMode,
    isPresentationMode: state.isPresentationMode, setPresentationMode: state.setPresentationMode,
    setLabReportOpen: state.setLabReportOpen,
    isSimulationPaused: state.isSimulationPaused, setSimulationPaused: state.setSimulationPaused,
    cameraPreset: state.cameraPreset, setCameraPreset: state.setCameraPreset,
    isScreenLocked: state.isScreenLocked, toggleScreenLock: state.toggleScreenLock,
    selectedVesselId: state.selectedVesselId,
    selectedVessel: state.selectedVesselId ? state.vessels[state.selectedVesselId] : null,
    toggleLockVessel: state.toggleLockVessel,
    moveMode: state.moveMode, setMoveMode: state.setMoveMode,
    canUndo: state.canUndo, canRedo: state.canRedo, undo: state.undo, redo: state.redo,
    doseBusy: !!state.pouringChemical || state.stockDosePending,
    timeScale: state.timeScale, setTimeScale: state.setTimeScale,
    soundEnabled: state.soundEnabled, toggleSound: state.toggleSound,
    resetWorkbench: state.resetWorkbench,
  })));

  const t = (en: string, vi: string) => language === 'en' ? en : vi;

  const button = 'lab-toolbar-button';
  return <div className="lab-workbench-toolbar" aria-label={t('Workbench controls', 'Điều khiển bàn thí nghiệm')}>
    <button onClick={() => { setInstrumentsOpen(open => !open); setSettingsOpen(false); }}
      aria-label="Điều khiển dụng cụ" aria-expanded={instrumentsOpen} className={button} title="Điều khiển dụng cụ bằng nút và tọa độ">
      <Wrench size={16} /><span className="hidden sm:inline">{t('Instruments', 'Dụng cụ')}</span>
    </button>
    {instrumentsOpen && createPortal(<Suspense fallback={null}><InstrumentPanel onClose={closeInstruments} /></Suspense>, document.body)}
    <div className="flex gap-0.5 border-r border-slate-200 pr-1">
      <button onClick={undo} disabled={!canUndo || doseBusy} className={button} aria-label={t('Undo', 'Hoàn tác')} title={doseBusy ? t('Wait for the reagent transfer to finish', 'Chờ lần cấp hóa chất kết thúc') : t('Undo (Ctrl+Z)', 'Hoàn tác (Ctrl+Z)')}><Undo2 size={15} /></button>
      <button onClick={redo} disabled={!canRedo || doseBusy} className={button} aria-label={t('Redo', 'Làm lại')} title={doseBusy ? t('Wait for the reagent transfer to finish', 'Chờ lần cấp hóa chất kết thúc') : t('Redo (Ctrl+Y)', 'Làm lại (Ctrl+Y)')}><Redo2 size={15} /></button>
    </div>
    <button onClick={() => setMoveMode(!moveMode)} aria-pressed={moveMode} className={`${button} ${moveMode ? 'lab-control-active' : ''}`}
      aria-label={t('Move equipment', 'Di chuyển dụng cụ')} title={t('Move equipment', 'Di chuyển dụng cụ')}><Move size={15} /><span className="hidden md:inline">{t('Move', 'Di chuyển')}</span></button>
    <button onClick={() => selectedVesselId && toggleLockVessel(selectedVesselId)} disabled={!selectedVessel}
      data-tour="vessel-lock"
      aria-pressed={!!selectedVessel?.isLocked}
      aria-label={selectedVessel?.isLocked ? t('Unlock selected vessel', 'Mở khóa bình đang chọn') : t('Lock selected vessel', 'Khóa bình đang chọn')}
      title={!selectedVessel ? t('Select a vessel to lock its position', 'Chọn bình để khóa vị trí')
        : selectedVessel.isLocked ? t('Unlock selected vessel', 'Mở khóa bình đang chọn') : t('Lock selected vessel', 'Khóa bình đang chọn')}
      className={`${button} ${selectedVessel?.isLocked ? 'bg-amber-100 text-amber-800' : ''} disabled:cursor-not-allowed disabled:opacity-45`}>
      {selectedVessel?.isLocked ? <Lock size={15} /> : <Unlock size={15} />}
      <span className="hidden md:inline">{selectedVessel?.isLocked ? t('Unlock', 'Mở khóa') : t('Lock', 'Khóa')}</span>
    </button>
    <div className="ml-auto flex shrink-0 items-center gap-1">
      <button onClick={() => setSimulationPaused(!isSimulationPaused)} className={`${button} ${isSimulationPaused ? 'bg-amber-100 text-amber-800' : ''}`}
        data-tour="simulation-pause"
        aria-label={isSimulationPaused ? t('Resume simulation', 'Tiếp tục phản ứng') : t('Pause simulation', 'Tạm dừng phản ứng')}
        title={isSimulationPaused ? t('Resume simulation', 'Tiếp tục phản ứng') : t('Pause simulation', 'Tạm dừng phản ứng')}>
        {isSimulationPaused ? <Play size={15} /> : <Pause size={15} />}
      </button>
      {markerCount !== null && <button type="button" className={button} disabled={markerCount >= MAX_SAMPLE_MARKERS}
        aria-label={t('Mark a sample event', 'Đánh dấu mốc số đo')}
        title={t('Mark a sample event', 'Đánh dấu mốc số đo') + ' (' + markerCount + '/' + MAX_SAMPLE_MARKERS + ')'}
        onClick={() => useSampleRecorder.getState().mark(useAppStore.getState())}>
        <Flag size={15} />
      </button>}
      <select aria-label={t('Simulation speed', 'Tốc độ mô phỏng')} value={timeScale} onChange={event => setTimeScale(Number(event.target.value))}
        className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-1 text-xs font-semibold text-slate-600">
        {Array.from(new Set([1, 2, 5, timeScale])).sort((a,b) => a-b).map(speed => <option key={speed} value={speed}>{speed}×</option>)}
      </select>
      <div ref={settingsRoot} className="relative">
        <button ref={settingsButton} className={`${button} ${settingsOpen ? 'lab-control-active' : ''}`} onClick={() => setSettingsOpen(value => !value)}
          aria-expanded={settingsOpen} aria-controls="lab-workbench-settings" aria-label={t('Workbench settings', 'Thiết lập bàn thí nghiệm')}>
          <SlidersHorizontal size={15} /><span className="hidden sm:inline">{t('Settings', 'Thiết lập')}</span>
        </button>
        {settingsOpen && <section id="lab-workbench-settings" className="lab-settings-panel" aria-label={t('Workbench settings', 'Thiết lập bàn thí nghiệm')}>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">{t('Workbench settings', 'Thiết lập bàn thí nghiệm')}</h2>
            <button onClick={() => setSettingsOpen(false)} className={button} aria-label={t('Close settings', 'Đóng thiết lập')}><X size={16} /></button></div>
          <p className="lab-setting-label">{t('Mode', 'Chế độ')}</p>
          <div className="flex flex-wrap gap-1">
            <button onClick={() => { setLabMode('free'); setPresentationMode(false); }} className={`${button} ${labMode === 'free' && !isPresentationMode ? 'lab-control-active' : ''}`}><Compass size={14} />{t('Free', 'Tự do')}</button>
            <button onClick={() => { setLabMode('guided'); setPresentationMode(false); }} className={`${button} ${labMode === 'guided' && !isPresentationMode ? 'lab-control-active' : ''}`}><BookOpen size={14} />{t('Guided', 'Bài mẫu')}</button>
            <button onClick={() => { setPresentationMode(!isPresentationMode); setSettingsOpen(false); }} className={`${button} ${isPresentationMode ? 'lab-control-active' : ''}`}><Presentation size={14} />{isPresentationMode ? t('Exit presentation', 'Thoát trình chiếu') : t('Presentation', 'Trình chiếu')}</button>
          </div>
          <p className="lab-setting-label">{t('View', 'Góc nhìn')}</p>
          <div className="flex flex-wrap gap-1">
            {(['perspective', 'top', 'front', 'side'] as const).map((preset, index) => <button key={preset} onClick={() => setCameraPreset(preset)}
              aria-pressed={cameraPreset === preset} className={`${button} ${cameraPreset === preset ? 'lab-control-active' : ''}`}>
              {[t('3D', '3D'), t('Top', 'Trên'), t('Front', 'Trước'), t('Side', 'Hông')][index]}</button>)}
            <button onClick={toggleScreenLock} className={`${button} ${isScreenLocked ? 'lab-control-active' : ''}`} aria-pressed={isScreenLocked}>
              {isScreenLocked ? <Lock size={14} /> : <Unlock size={14} />}{isScreenLocked ? t('Unlock view', 'Mở khóa góc nhìn') : t('Lock view', 'Khóa góc nhìn')}</button>
          </div>
          <p className="lab-setting-label">{t('Environment & sound', 'Môi trường & âm thanh')}</p>
          <LabEnvironmentControls />
          <div className="mt-2 flex flex-wrap gap-1">
            <button onClick={toggleSound} className={button} aria-pressed={soundEnabled}>{soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}{soundEnabled ? t('Sound on', 'Bật âm thanh') : t('Sound off', 'Tắt âm thanh')}</button>
            <button onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')} className={button}><Globe size={14} />{language === 'en' ? 'Tiếng Việt' : 'English'}</button>
          </div>
          <p className="lab-setting-label">{t('Learning tools', 'Công cụ học tập')}</p>
          <div className="flex flex-wrap items-center gap-1"><PhysicsPanel />
            <button onClick={() => { setLabReportOpen(true); setSettingsOpen(false); }} className={button}><FileText size={14} />{t('Lab report', 'Báo cáo thực hành')}</button>
          </div>
          <button className={`${button} mt-3 text-rose-700`} onClick={() => {
            if (confirm(t('Reset all vessels and lab equipment to default?', 'Đặt lại toàn bộ bàn thí nghiệm về mặc định?'))) { resetWorkbench(); setSettingsOpen(false); }
          }}><RotateCcw size={14} />{t('Reset workbench', 'Đặt lại bàn thí nghiệm')}</button>
        </section>}
      </div>
    </div>
  </div>;
}
