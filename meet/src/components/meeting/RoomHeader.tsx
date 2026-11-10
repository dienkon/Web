import React, { useEffect, useState } from 'react';
import { Copy, Check, GraduationCap, Radio, Clock3, Settings2, Lock, Wifi } from 'lucide-react';
import { useMeetingStore } from '../../store/meetingStore';

export const RoomHeader: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const { timerEndsAt, serverTimeOffset, roomCode, connectionState, addToast, isHost, networkQuality, networkLatency, isRoomLocked } = useMeetingStore();
  const [copied, setCopied] = useState(false);
  const [started] = useState(Date.now);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [started]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/join/${roomCode}`);
      setCopied(true);
      addToast('Đã sao chép liên kết mời.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('Không sao chép được. Bạn có thể chia sẻ mã phòng ở đầu trang.', 'warning');
    }
  };

  return (
    <header className="h-[70px] sm:h-[76px] px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 shrink-0 border-b border-white/[0.07] bg-[#10151e]">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
          <GraduationCap size={22} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm sm:text-base font-semibold tracking-tight truncate">
              MeetClass <span className="text-slate-500 font-normal">/</span> {roomCode}
            </h1>
            {isHost && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-semibold">
                Chủ phòng
              </span>
            )}
            {isRoomLocked && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 text-[10px] font-semibold">
                <Lock size={10} /> Khóa
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => void copy()}
          title="Sao chép liên kết mời"
          aria-label="Sao chép liên kết mời"
          className="p-2 sm:p-2.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 shrink-0 transition-colors"
        >
          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
        </button>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        <span className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-slate-400">
          <Clock3 size={14} />{' '}
          {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
        </span>

        {timerEndsAt && <span role="timer" aria-label="Thời gian làm bài" className="text-xs font-mono text-amber-300">
          {Math.floor(Math.max(0, Math.ceil((timerEndsAt - Date.now() - serverTimeOffset) / 1000)) / 60)}:{String(Math.max(0, Math.ceil((timerEndsAt - Date.now() - serverTimeOffset) / 1000)) % 60).padStart(2, '0')}
        </span>}
        {/* Network Quality Indicator */}
        {networkLatency > 0 && (
          <span
            className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] text-[11px] font-mono text-slate-400"
            title={`Chất lượng mạng: ${networkQuality === 'good' ? 'Tốt' : networkQuality === 'fair' ? 'Ổn định' : 'Yếu'}`}
          >
            <Wifi
              size={13}
              className={
                networkQuality === 'good'
                  ? 'text-emerald-400'
                  : networkQuality === 'fair'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }
            />
            {networkLatency}ms
          </span>
        )}

        <span
          className={`flex items-center gap-1.5 text-xs font-medium ${
            connectionState === 'connected' ? 'text-emerald-300' : 'text-amber-300'
          }`}
        >
          <Radio size={14} className="animate-pulse" />
          <span>{connectionState === 'connected' ? 'Đã kết nối' : 'Đang kết nối…'}</span>
        </span>

        <button
          onClick={onOpenSettings}
          aria-label="Thiết bị & âm thanh"
          title="Thiết bị & âm thanh"
          className="p-2 sm:p-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
        >
          <Settings2 size={18} />
        </button>
      </div>
    </header>
  );
};
