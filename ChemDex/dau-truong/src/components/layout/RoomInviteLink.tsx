import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';
import { Swords, LogIn, Clock, Sparkles } from 'lucide-react';

interface RoomInviteLinkProps {
  roomCode: string;
  isMe: boolean;
}

export default function RoomInviteLink({ roomCode, isMe }: RoomInviteLinkProps) {
  const [room, setRoom] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!roomCode) return;
    const roomRef = doc(db, 'rooms', roomCode.toUpperCase());
    
    // Listen in real-time to room status changes
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoom(snapshot.data());
      } else {
        setRoom(null);
      }
      setLoading(false);
    }, (err) => {
      console.warn("RoomInviteLink query error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomCode]);

  if (loading) {
    return (
      <div className="mt-2.5 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Clock size={12} className="animate-spin" />
        <span>Đang kiểm tra phòng {roomCode}...</span>
      </div>
    );
  }

  // Only display the link / invite widget when the room is currently LIVE (lobby state)
  const isLive = room && room.status === 'lobby';
  if (!isLive) {
    return (
      <div className="mt-2.5 p-2.5 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 italic">
        Phòng {roomCode.toUpperCase()} không khả dụng.
      </div>
    );
  }

  const playerCount = Object.keys(room.players || {}).length;
  const isFull = playerCount >= (room.maxPlayers || 4);

  return (
    <div className={`mt-2.5 p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 ${
      isMe 
        ? 'bg-cyan-600/30 text-cyan-50 border border-cyan-400/20' 
        : 'bg-cyan-50/50 dark:bg-slate-900 border border-cyan-500/10 dark:border-slate-800'
    }`}>
      <div className="flex items-center gap-2">
        <Swords className={isMe ? 'text-slate-900 dark:text-white' : 'text-cyan-500'} size={16} />
        <div className="text-left">
          <div className="font-extrabold text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Lời mời ghép trận</div>
          <div className="font-mono text-xs font-black">
            MÃ: <span className="text-cyan-600 dark:text-cyan-400">{roomCode.toUpperCase()}</span>
            <span className="ml-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-normal">({playerCount}/{room.maxPlayers || 4})</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => navigate(`/room/${roomCode.toUpperCase()}`)}
        disabled={isFull}
        className={`w-full sm:w-auto px-3.5 py-1.5 font-black rounded-lg text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0 ${
          isFull
            ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
        }`}
      >
        <LogIn size={11} />
        {isFull ? 'Đầy' : 'Tham gia'}
      </button>
    </div>
  );
}
