import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type { MinigameCheerMessage } from "../../types/minigame";
import {
  sendMinigameCheer,
  subscribeMinigameCheers,
} from "../../services/minigameClientService";

const CHEER_EMOJIS = ["🔥", "🐎", "🐝", "🦆", "⚽", "🎉", "👏", "🍀"];

interface LiveCheerBarProps {
  eventId: string;
  currentUid: string;
  currentDisplayName: string;
}

export const LiveCheerBar: React.FC<LiveCheerBarProps> = ({
  eventId,
  currentUid,
  currentDisplayName,
}) => {
  const [cheers, setCheers] = useState<MinigameCheerMessage[]>([]);
  const [cooldown, setCooldown] = useState(false);

  useEffect(() => {
    const unsub = subscribeMinigameCheers(eventId, setCheers);
    return () => unsub();
  }, [eventId]);

  const handleCheer = async (emoji: string) => {
    if (cooldown || !currentUid) return;
    setCooldown(true);
    setTimeout(() => setCooldown(false), 600);
    const updated = await sendMinigameCheer(eventId, {
      uid: currentUid,
      displayName: currentDisplayName,
      emoji,
    });
    if (updated.length > 0) setCheers(updated);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Cổ vũ Live:
        </span>
        {CHEER_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            disabled={cooldown}
            onClick={() => handleCheer(emoji)}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-amber-950/60 hover:scale-110 active:scale-95 transition-all text-base flex items-center justify-center cursor-pointer disabled:opacity-50"
            title="Thả cổ vũ thời gian thực"
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
        {cheers.length === 0 ? (
          <span className="text-[11px] text-slate-400">Bấm biểu tượng để cổ vũ các thí sinh!</span>
        ) : (
          cheers.slice(0, 5).map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap animate-in fade-in zoom-in-95"
            >
              <span>{c.emoji}</span>
              <span className="max-w-[90px] truncate">{c.displayName}</span>
            </span>
          ))
        )}
      </div>
    </div>
  );
};
