import React, { useEffect, useState } from 'react';
import { useMeetingStore } from '../../store/meetingStore';
import { socketService } from '../../services/socket';
import { clsx } from 'clsx';

export const POPULAR_REACTIONS = [
  { emoji: '👍', label: 'Thích' },
  { emoji: '❤️', label: 'Yêu thích' },
  { emoji: '👏', label: 'Vỗ tay' },
  { emoji: '🎉', label: 'Chúc mừng' },
  { emoji: '😂', label: 'Cười vui' },
  { emoji: '💡', label: 'Ý tưởng' },
  { emoji: '🔥', label: 'Tuyệt đỉnh' },
];

interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  leftPercent: number;
}

export const ReactionsOverlay: React.FC = () => {
  const reactions = useMeetingStore((s) => s.reactions);
  const [floatingList, setFloatingList] = useState<FloatingReaction[]>([]);

  useEffect(() => {
    if (!reactions.length) return;
    const latest = reactions[reactions.length - 1];
    if (!latest) return;

    // Generate random horizontal position between 15% and 85%
    const randomLeft = 15 + Math.random() * 70;
    const item: FloatingReaction = {
      id: latest.id,
      emoji: latest.emoji,
      senderName: latest.senderName,
      leftPercent: randomLeft,
    };

    setFloatingList((prev) => [...prev.slice(-12), item]);

    // Cleanup after animation finishes
    const timer = setTimeout(() => {
      setFloatingList((prev) => prev.filter((r) => r.id !== item.id));
    }, 3800);

    return () => clearTimeout(timer);
  }, [reactions]);

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {floatingList.map((item) => (
        <div
          key={item.id}
          style={{ left: `${item.leftPercent}%` }}
          className="absolute bottom-20 animate-reaction-float flex flex-col items-center gap-1 select-none"
        >
          <div className="text-4xl sm:text-5xl drop-shadow-lg transform transition-transform hover:scale-125">
            {item.emoji}
          </div>
          <span className="px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[11px] font-medium text-white shadow-md border border-white/10 whitespace-nowrap">
            {item.senderName}
          </span>
        </div>
      ))}
    </div>
  );
};

export const ReactionBar: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const sendReaction = (emoji: string) => {
    socketService.emit('reaction:send', { emoji });
    onClose();
  };

  return (
    <div className="flex items-center gap-1.5 p-2 bg-[#202938] border border-white/15 rounded-2xl shadow-2xl backdrop-blur-xl animate-fade-in">
      {POPULAR_REACTIONS.map((r) => (
        <button
          key={r.emoji}
          onClick={() => sendReaction(r.emoji)}
          className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center text-2xl transition-transform hover:scale-125 active:scale-95"
          title={r.label}
        >
          {r.emoji}
        </button>
      ))}
    </div>
  );
};
