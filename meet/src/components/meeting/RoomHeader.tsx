import React, { useEffect, useState } from 'react';
import { Copy, Check, GraduationCap, Radio, Clock3, Settings2 } from 'lucide-react';
import { useMeetingStore } from '../../store/meetingStore';

export const RoomHeader: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const { roomCode, connectionState, addToast, isHost } = useMeetingStore();
  const [copied, setCopied] = useState(false);
  const [started] = useState(Date.now);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000); return () => clearInterval(timer); }, [started]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/join/${roomCode}`);
      setCopied(true); addToast('Đã sao chép liên kết mời.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch { addToast('Không sao chép được. Bạn có thể chia sẻ mã phòng ở đầu trang.', 'warning'); }
  };
  return <header className="h-[76px] px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 border-b border-white/[0.07] bg-[#10151e]">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded-xl bg-blue-400 text-slate-950 flex items-center justify-center shrink-0"><GraduationCap size={24} /></div>
      <div className="min-w-0"><h1 className="text-base font-semibold tracking-tight truncate">MeetClass <span className="text-slate-500 font-normal">/</span> {roomCode}</h1><p className="text-[11px] text-slate-400 mt-0.5">{isHost ? 'Bạn là chủ phòng' : 'Cùng học, cùng kết nối'}</p></div>
      <button onClick={() => void copy()} title="Sao chép liên kết mời" aria-label="Sao chép liên kết mời" className="p-2.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10">{copied ? <Check size={16} /> : <Copy size={16} />}</button>
    </div>
    <div className="flex items-center gap-3 sm:gap-5">
      <span className="hidden sm:flex items-center gap-2 font-mono text-xs text-slate-400"><Clock3 size={15} /> {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</span>
      <span className={`hidden sm:flex items-center gap-2 text-xs ${connectionState === 'connected' ? 'text-emerald-300' : 'text-amber-300'}`}><Radio size={15} />{connectionState === 'connected' ? 'Đã kết nối' : 'Đang kết nối…'}</span>
      <button onClick={onOpenSettings} aria-label="Thiết bị & âm thanh" title="Thiết bị & âm thanh" className="p-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5"><Settings2 size={18} /></button>
    </div>
  </header>;
};
