import React, { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Sparkles, CheckCircle2 } from "lucide-react";
import type { MinigameEvent } from "../../types/minigame";
import { PLINKO_SLOTS, buildPlinkoBouncePath } from "../../services/minigame/gameLogic";
import { playDiceShakeTick, playVictoryChime } from "../../services/minigame/soundFx";

interface PlinkoDropStageProps {
  event: MinigameEvent;
  currentUid?: string;
  onSelectPrediction?: (slotId: string) => void;
  busy?: boolean;
}

export const PlinkoDropStage: React.FC<PlinkoDropStageProps> = ({
  event,
  currentUid,
  onSelectPrediction,
  busy = false,
}) => {
  const myPrediction = currentUid ? event.participants?.[currentUid]?.prediction : undefined;
  const partyResult = event.partyResult;
  const [nowMs, setNowMs] = useState(() => Date.now());
  const chimePlayedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!partyResult?.revealedAtMs) return;
    let rafId = 0;
    let lastTick = 0;

    const tick = () => {
      const t = Date.now();
      setNowMs(t);
      if (t < partyResult.revealedAtMs && t - lastTick > 220) {
        lastTick = t;
        playDiceShakeTick(false);
      }
      if (t >= partyResult.revealedAtMs && chimePlayedRef.current !== partyResult.revealedAtMs) {
        chimePlayedRef.current = partyResult.revealedAtMs;
        playVictoryChime(false);
        confetti({ particleCount: 95, spread: 80, origin: { y: 0.65 } });
      }
      if (t < partyResult.revealedAtMs + 600) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [partyResult?.revealedAtMs]);

  const slotCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of Object.values(event.participants || {})) {
      if (p.prediction) counts[p.prediction] = (counts[p.prediction] || 0) + 1;
    }
    return counts;
  }, [event.participants]);

  const isDropping = Boolean(partyResult && nowMs < partyResult.revealedAtMs);
  const isRevealed = Boolean(partyResult && nowMs >= partyResult.revealedAtMs);

  const trajectory = useMemo(() => {
    if (!partyResult) return [3, 3, 3, 3, 3, 3, 3, 3];
    if (Array.isArray(partyResult.plinkoPath) && partyResult.plinkoPath.length >= 2) {
      return partyResult.plinkoPath;
    }
    return buildPlinkoBouncePath(partyResult.plinkoSlotIndex ?? 3, 2026);
  }, [partyResult]);

  // Compute current animated ball position (xPct 8..92%, yPct 6..88%)
  const ballPos = useMemo(() => {
    if (!partyResult) return { xPct: 50, yPct: 7, visible: true };
    const totalDuration = 3400;
    const startMs = partyResult.revealedAtMs - totalDuration;
    const progress = Math.max(0, Math.min(1, (nowMs - startMs) / totalDuration));
    const steps = trajectory.length - 1;
    const scaled = progress * steps;
    const idx = Math.min(steps - 1, Math.floor(scaled));
    const frac = scaled - idx;
    const colStart = trajectory[idx] ?? 3;
    const colEnd = trajectory[Math.min(steps, idx + 1)] ?? colStart;
    const col = colStart + (colEnd - colStart) * frac;
    const bounceArc = isDropping ? Math.abs(Math.sin(frac * Math.PI)) * -3.2 : 0;
    return {
      xPct: 9 + (col / 6) * 82,
      yPct: 8 + progress * 78 + bounceArc,
      visible: true,
    };
  }, [partyResult, nowMs, trajectory, isDropping]);

  const winningSlot =
    isRevealed && partyResult?.plinkoSlotIndex !== undefined
      ? PLINKO_SLOTS[partyResult.plinkoSlotIndex]
      : null;

  return (
    <div className="rounded-3xl bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 border-2 border-cyan-500/40 p-4 sm:p-6 text-white shadow-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
            <span>🪩 Tháp Thả Bóng Ziczac (Plinko Neon)</span>
          </h2>
          <p className="text-xs text-cyan-200/80">
            {event.status === "lobby"
              ? "Chọn miễn phí 1 cổng thưởng bên dưới — bóng vàng rơi trúng cổng nào, cả nhóm cổng đó trúng giải!"
              : isDropping
              ? "⚡ Quả cầu năng lượng đang nảy ziczac qua các tầng đinh..."
              : winningSlot
              ? `🎉 KẾT QUẢ: Bóng rơi trúng ${winningSlot.emoji} ${winningSlot.label} (#${winningSlot.id})!`
              : "Đang chờ thả bóng..."}
          </p>
        </div>

        {myPrediction && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-extrabold">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300" />
            <span>
              Đã chọn:{" "}
              {PLINKO_SLOTS.find((s) => s.id === myPrediction)?.label || `Cổng #${myPrediction}`}
            </span>
          </span>
        )}
      </div>

      {/* Plinko Peg Pyramid Board */}
      <div className="relative h-64 sm:h-72 rounded-2xl bg-gradient-to-b from-slate-900/95 via-indigo-950/90 to-slate-950 border border-cyan-500/30 overflow-hidden shadow-inner">
        {/* Drop Chute at Top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1 rounded-b-xl bg-cyan-500/25 border-x border-b border-cyan-400/40 text-[10px] font-black text-cyan-200 tracking-wider">
          ▼ CỬA THẢ BÓNG ▼
        </div>

        {/* 7 Rows of Glowing Pegs */}
        <div className="absolute inset-x-6 top-10 bottom-8 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="flex items-center justify-around px-2">
              {Array.from({ length: row % 2 === 0 ? 7 : 6 }).map((_, col) => (
                <span
                  key={col}
                  className="w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.85)]"
                />
              ))}
            </div>
          ))}
        </div>

        {/* Animated Golden Energy Ball */}
        {ballPos.visible && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-75"
            style={{ left: `${ballPos.xPct}%`, top: `${ballPos.yPct}%` }}
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-yellow-200 via-amber-400 to-orange-500 border-2 border-white shadow-[0_0_20px_rgba(251,191,36,0.95)] flex items-center justify-center text-[11px] font-black text-slate-950">
              ★
            </div>
          </div>
        )}
      </div>

      {/* 7 Interactive Prize Slots at Bottom */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {PLINKO_SLOTS.map((slot) => {
          const isMine = myPrediction === slot.id;
          const isWinner = winningSlot?.id === slot.id;
          const canPick = event.status === "lobby" && Boolean(onSelectPrediction);
          return (
            <button
              key={slot.id}
              type="button"
              disabled={!canPick || busy}
              onClick={() => onSelectPrediction?.(slot.id)}
              className={`relative p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-between gap-1.5 ${
                isWinner
                  ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 border-white ring-4 ring-amber-300/60 scale-[1.03] shadow-lg"
                  : isMine
                  ? `bg-gradient-to-br ${slot.gradient} text-white border-white ring-2 ring-cyan-300 shadow-md`
                  : "bg-slate-900/90 hover:bg-slate-800/90 border-slate-700 text-slate-100"
              } ${canPick ? "cursor-pointer hover:-translate-y-0.5" : "cursor-default"}`}
            >
              <span className="text-2xl">{slot.emoji}</span>
              <div className="text-[11px] font-black leading-tight">{slot.label}</div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isWinner
                    ? "bg-slate-950/20 text-slate-950"
                    : "bg-white/15 text-cyan-200"
                }`}
              >
                {slotCounts[slot.id] || 0} người chọn
              </span>
              {isMine && !isWinner && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-amber-200">
                  <Sparkles className="w-3 h-3" /> Lựa chọn của bạn
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
