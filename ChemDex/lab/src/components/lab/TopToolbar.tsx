import React from 'react';
import {
  FlaskConical,
  RotateCcw,
  Undo2,
  Redo2,
  Flame,
  Waves,
  Eye,
  Terminal,
  Volume2,
  VolumeX,
  Trash2,
  Move,
  Lock,
  Unlock
} from 'lucide-react';
import { useSimulationStore } from '../../store/simulationStore';
import { useUiStore } from '../../store/uiStore';

export const TopToolbar: React.FC = () => {
  const {
    vessels,
    selectedVesselId,
    history,
    future,
    undo,
    redo,
    resetAll,
    clearVessel,
    toggleHeating,
    toggleStirring,
    resolutionState,
    latestReaction
  } = useSimulationStore();

  const {
    isPresentationMode,
    togglePresentationMode,
    isDevMode,
    toggleDevMode,
    isMuted,
    toggleMute,
    isMoveVesselMode,
    toggleMoveVesselMode,
    isCameraLocked,
    toggleCameraLock
  } = useUiStore();

  const selectedVessel = vessels.find(v => v.id === selectedVesselId);

  return (
    <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 flex items-center justify-between shadow-sm z-30 select-none">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-sm shadow-sky-600/30">
          <FlaskConical className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-800 tracking-tight leading-tight">
              ChemDex <span className="text-sky-600 font-semibold text-xs px-1.5 py-0.5 bg-sky-50 border border-sky-200 rounded">3D LAB</span>
            </h1>
            {resolutionState === 'CACHE_LOOKUP' && (
              <span className="text-[11px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                Đang tra cứu tri thức...
              </span>
            )}
            {resolutionState === 'COMPLETED' && latestReaction && (
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Phản ứng xảy ra
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">Phòng Thí Nghiệm Hóa Học Ảo</p>
        </div>
      </div>

      {/* Center Action Toolbar */}
      <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/80">
        <button
          onClick={undo}
          disabled={history.length === 0}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
          title="Hoàn tác (Undo)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={future.length === 0}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
          title="Làm lại (Redo)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-200 mx-1" />

        {/* Move Vessel Mode Toggle */}
        <button
          onClick={toggleMoveVesselMode}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
            isMoveVesselMode
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-white'
          }`}
          title="Bật/Tắt chế độ kéo di chuyển bình trên bàn lab. Kéo lại gần bình khác để rót dung dịch."
        >
          <Move className="w-3.5 h-3.5" />
          <span>{isMoveVesselMode ? 'Đang di chuyển bình' : 'Di chuyển bình'}</span>
        </button>

        <div className="w-[1px] h-5 bg-slate-200 mx-1" />

        {/* Heating toggle for selected vessel */}
        <button
          onClick={() => selectedVesselId && toggleHeating(selectedVesselId)}
          disabled={!selectedVessel}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            selectedVessel?.isHeating
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-700 hover:bg-white'
          } disabled:opacity-40`}
          title="Đun nóng ngọn lửa đèn cồn"
        >
          <Flame className="w-3.5 h-3.5" />
          <span>{selectedVessel?.isHeating ? 'Tắt đèn cồn' : 'Đun nóng'}</span>
        </button>

        {/* Stirring toggle */}
        <button
          onClick={() => selectedVesselId && toggleStirring(selectedVesselId)}
          disabled={!selectedVessel}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            selectedVessel?.isStirring
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-700 hover:bg-white'
          } disabled:opacity-40`}
          title="Khuấy đều dung dịch"
        >
          <Waves className="w-3.5 h-3.5" />
          <span>Khuấy</span>
        </button>

        {/* Clear current vessel */}
        <button
          onClick={() => selectedVesselId && clearVessel(selectedVesselId)}
          disabled={!selectedVessel || selectedVessel.contents.length === 0}
          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-white rounded disabled:opacity-35 transition-colors"
          title="Làm sạch bình đang chọn"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-200 mx-1" />

        {/* Reset All */}
        <button
          onClick={resetAll}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-rose-600 hover:bg-white rounded transition-colors"
          title="Tạo mới phòng thí nghiệm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Lock Viewport toggle */}
        <button
          onClick={toggleCameraLock}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            isCameraLocked
              ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-xs'
              : 'text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
          title={isCameraLocked ? 'Đang cố định khung hình (đã khóa cả xoay và di chuyển)' : 'Cố định khung hình (khóa xoay và di chuyển camera)'}
        >
          {isCameraLocked ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <Unlock className="w-3.5 h-3.5 text-slate-500" />}
          <span>{isCameraLocked ? 'Cố định khung hình' : 'Khóa khung hình'}</span>
        </button>

        {/* Presentation mode toggle */}
        <button
          onClick={togglePresentationMode}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            isPresentationMode
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
          title="Chế độ trình chiếu bài giảng cho giáo viên"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Trình chiếu</span>
        </button>

        {/* Dev / Observability inspector */}
        <button
          onClick={toggleDevMode}
          className={`p-1.5 text-xs font-medium rounded-lg border transition-colors ${
            isDevMode
              ? 'bg-slate-900 text-white border-slate-900'
              : 'text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
          title="Bảng kiểm định kỹ thuật (Dev Mode)"
        >
          <Terminal className="w-4 h-4" />
        </button>

        {/* Audio Mute toggle */}
        <button
          onClick={toggleMute}
          className="p-1.5 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
