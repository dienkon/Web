import React, { useEffect, useState } from "react";
import { CalendarClock, Clock, Timer } from "lucide-react";
import type { MinigameEvent } from "../../types/minigame";
import {
  evaluateMinigameSchedule,
  formatMinigameCountdown,
} from "../../services/minigame/gameLogic";

interface MinigameScheduleBannerProps {
  event: MinigameEvent;
}

function formatDateTimeVi(iso?: string | null): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export const MinigameScheduleBanner: React.FC<MinigameScheduleBannerProps> = ({ event }) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!event.scheduledStartAt && !event.scheduledEndAt) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [event.scheduledStartAt, event.scheduledEndAt]);

  if (!event.scheduledStartAt && !event.scheduledEndAt) return null;

  const snap = evaluateMinigameSchedule(event, nowMs);

  const toneClass =
    snap.phase === "closed"
      ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
      : snap.phase === "upcoming"
      ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
      : "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200";

  return (
    <div
      className={`rounded-2xl border px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs ${toneClass}`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <CalendarClock className="w-4 h-4 shrink-0" />
        <span className="font-black">{snap.label}</span>
        {event.scheduledStartAt && (
          <span className="inline-flex items-center gap-1 opacity-85">
            <Clock className="w-3.5 h-3.5" />
            Bắt đầu: <strong>{formatDateTimeVi(event.scheduledStartAt)}</strong>
          </span>
        )}
        {event.scheduledEndAt && (
          <span className="inline-flex items-center gap-1 opacity-85">
            • Hạn chót: <strong>{formatDateTimeVi(event.scheduledEndAt)}</strong>
          </span>
        )}
      </div>

      {snap.phase === "upcoming" && snap.startsInMs > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-slate-900/80 font-mono font-black text-amber-700 dark:text-amber-300">
          <Timer className="w-3.5 h-3.5" />
          Mở sau {formatMinigameCountdown(snap.startsInMs)}
        </span>
      )}
      {snap.phase === "open" && snap.endsInMs > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-slate-900/80 font-mono font-black text-indigo-700 dark:text-indigo-300">
          <Timer className="w-3.5 h-3.5" />
          Còn {formatMinigameCountdown(snap.endsInMs)}
        </span>
      )}
    </div>
  );
};
