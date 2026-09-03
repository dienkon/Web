import React, { useState } from 'react';
import { Lock, Copy, Check, ShieldCheck, GraduationCap, Signal, Zap } from 'lucide-react';
import { useMeetingStore } from '../../store/meetingStore';
import { socketService } from '../../services/socket';
import { Badge } from '../ui/Badge';

export const RoomHeader: React.FC = () => {
  const { roomCode, isHost, connectionState, addToast } = useMeetingStore();
  const [copied, setCopied] = useState(false);

  const mode = socketService.connectionMode;
  const modeLabel =
    mode === 'socket-io'
      ? 'Socket.IO Server'
      : mode === 'vercel-serverless'
      ? 'Vercel Realtime'
      : 'Local Broadcast Sync';

  const copyRoomLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      addToast('Đã sao chép liên kết phòng học', 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <header className="h-16 bg-[#121212]/90 backdrop-blur-md border-b border-gray-800/80 px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 select-none">
      {/* Room Title & Code */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
            <GraduationCap className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-semibold text-white tracking-wide">
                Phòng Học {roomCode}
              </h1>
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-[11px] text-gray-400 hidden sm:block">MeetClass Interactive Room</p>
          </div>
        </div>

        <button
          onClick={copyRoomLink}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#202124] hover:bg-[#2e3033] border border-gray-700/70 rounded-full text-xs font-medium text-gray-300 hover:text-white transition-colors"
          title="Sao chép liên kết"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Đã chép' : 'Copy link'}</span>
        </button>
      </div>

      {/* Connection & Host Status */}
      <div className="flex items-center gap-3">
        {isHost && (
          <Badge variant="yellow" className="gap-1 hidden sm:inline-flex">
            <ShieldCheck className="w-3.5 h-3.5" />
            Host (Giáo viên)
          </Badge>
        )}

        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#202124] rounded-full border border-gray-700 text-xs font-medium text-gray-300" title={`Chế độ kết nối: ${modeLabel}`}>
          {mode === 'vercel-serverless' ? (
            <Zap className="w-3.5 h-3.5 text-blue-400" />
          ) : (
            <Signal className={`w-3.5 h-3.5 ${mode === 'socket-io' ? 'text-emerald-400' : 'text-amber-400'}`} />
          )}
          <span className="truncate">{modeLabel}</span>
        </div>
      </div>
    </header>
  );
};
