import React, { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, Trophy } from "lucide-react";
import type { MinigameEvent } from "../../types/minigame";
import { PENALTY_ZONES } from "../../services/minigame/gameLogic";
import { playDiceShakeTick, playVictoryChime } from "../../services/minigame/soundFx";

interface PenaltyShootoutStageProps {
  event: MinigameEvent;
  currentUid?: string;
  onSelectPrediction?: (zoneId: string) => void;
  busy?: boolean;
}

export const PenaltyShootoutStage: React.FC<PenaltyShootoutStageProps> = ({
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
      if (t < partyResult.revealedAtMs && t - lastTick > 260) {
        lastTick = t;
        playDiceShakeTick(false);
      }
      if (t >= partyResult.revealedAtMs && chimePlayedRef.current !== partyResult.revealedAtMs) {
        chimePlayedRef.current = partyResult.revealedAtMs;
        playVictoryChime(false);
        confetti({ particleCount: 100, spread: 85, origin: { y: 0.6 } });
      }
      if (t < partyResult.revealedAtMs + 500) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [partyResult?.revealedAtMs]);

  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of Object.values(event.participants || {})) {
      if (p.prediction) counts[p.prediction] = (counts[p.prediction] || 0) + 1;
    }
    return counts;
  }, [event.participants]);

  const isKicking = Boolean(partyResult && nowMs < partyResult.revealedAtMs);
  const isRevealed = Boolean(partyResult && nowMs >= partyResult.revealedAtMs);
  const winningSet = useMemo(
    () => new Set((partyResult?.penaltyWinningZones || []).map(String)),
    [partyResult]
  );
  const keeperZone = partyResult?.penaltyKeeperZone ? String(partyResult.penaltyKeeperZone) : null;

  return (
    <div className="rounded-3xl bg-gradient-to-b from-emerald-950 via-green-900 to-emerald-950 border-2 border-emerald-400/50 p-4 sm:p-6 text-white shadow-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
            <span>⚽ Cầu Trường Sút Luân Lưu Siêu Cúp</span>
          </h2>
          <p className="text-xs text-emerald-100/85">
            {event.status === "lobby"
              ? "Chọn miễn phí 1 trong 5 góc khung thành để sút phạt — 2 góc đánh bại thủ môn sẽ ghi bàn thắng Vàng!"
              : isKicking
              ? "👟 Cầu thủ đang lấy đà sút căng về khung thành..."
              : isRevealed
              ? `🥅 VÀOOO!! Bóng găm thẳng vào góc #${(partyResult?.penaltyWinningZones || []).join(" & #")}!`
              : "Sẵn sàng trước chấm 11m!"}
          </p>
        </div>

        {myPrediction && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-extrabold">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
            <span>
              Góc sút của bạn:{" "}
              {PENALTY_ZONES.find((z) => z.id === myPrediction)?.shortLabel || `#${myPrediction}`}
            </span>
          </span>
        )}
      </div>

      {/* Football Goal Net Visual */}
      <div className="relative rounded-2xl border-4 border-white/95 bg-gradient-to-b from-emerald-800/80 to-green-950/90 p-3 sm:p-5 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
        {/* Net mesh pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Left Column (Zones 1 & 2) */}
          <div className="space-y-3">
            {[PENALTY_ZONES[0], PENALTY_ZONES[1]].map((z) => {
              const isMine = myPrediction === z.id;
              const isGoal = isRevealed && winningSet.has(z.id);
              const isSaved = isRevealed && keeperZone === z.id;
              const canPick = event.status === "lobby" && Boolean(onSelectPrediction);
              return (
                <button
                  key={z.id}
                  type="button"
                  disabled={!canPick || busy}
                  onClick={() => onSelectPrediction?.(z.id)}
                  className={`w-full p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-2 ${
                    isGoal
                      ? "bg-amber-400 text-slate-950 border-white ring-4 ring-amber-300/60 shadow-lg"
                      : isSaved
                      ? "bg-rose-900/80 text-rose-100 border-rose-400/70"
                      : isMine
                      ? "bg-emerald-500 text-slate-950 border-white shadow-md"
                      : "bg-slate-950/55 hover:bg-slate-900/75 border-white/30 text-white"
                  } ${canPick ? "cursor-pointer hover:scale-[1.01]" : "cursor-default"}`}
                >
                  <div>
                    <div className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                      <span>{isGoal ? "⚽" : isSaved ? "🧤" : z.emoji}</span>
                      <span>{z.label}</span>
                    </div>
                    <div className="text-[11px] font-bold opacity-85 mt-0.5">
                      {isGoal
                        ? "🏆 BÀN THẮNG VÀNG!"
                        : isSaved
                        ? "Thủ môn cản phá!"
                        : `${zoneCounts[z.id] || 0} cầu thủ chọn`}
                    </div>
                  </div>
                  {isMine && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-950/20 text-[10px] font-black">
                      BẠN
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Center Column (Zone 3 + Goalkeeper Showcase) */}
          <div className="flex flex-col justify-between gap-3">
            {(() => {
              const z = PENALTY_ZONES[2];
              const isMine = myPrediction === z.id;
              const isGoal = isRevealed && winningSet.has(z.id);
              const isSaved = isRevealed && keeperZone === z.id;
              const canPick = event.status === "lobby" && Boolean(onSelectPrediction);
              return (
                <button
                  type="button"
                  disabled={!canPick || busy}
                  onClick={() => onSelectPrediction?.(z.id)}
                  className={`w-full p-3.5 rounded-2xl border-2 text-center transition-all ${
                    isGoal
                      ? "bg-amber-400 text-slate-950 border-white ring-4 ring-amber-300/60 shadow-lg"
                      : isSaved
                      ? "bg-rose-900/80 text-rose-100 border-rose-400/70"
                      : isMine
                      ? "bg-emerald-500 text-slate-950 border-white shadow-md"
                      : "bg-slate-950/55 hover:bg-slate-900/75 border-white/30 text-white"
                  } ${canPick ? "cursor-pointer hover:scale-[1.01]" : "cursor-default"}`}
                >
                  <div className="text-xs sm:text-sm font-black">
                    {isGoal ? "⚽ " : isSaved ? "🧤 " : `${z.emoji} `}
                    {z.shortLabel}
                  </div>
                  <div className="text-[11px] font-bold opacity-85 mt-0.5">
                    {isGoal
                      ? "🏆 PANENKA THÀNH CÔNG!"
                      : isSaved
                      ? "Thủ môn bắt gọn!"
                      : `${zoneCounts[z.id] || 0} cầu thủ chọn`}
                  </div>
                </button>
              );
            })()}

            <div className="flex-1 rounded-2xl bg-slate-950/45 border border-white/15 p-3 flex flex-col items-center justify-center text-center">
              <div className={`text-4xl ${isKicking ? "animate-bounce" : ""}`}>
                {isRevealed ? "🥅⚽" : isKicking ? "🏃‍♂️💨⚽" : "🧤⚽"}
              </div>
              <div className="text-[11px] font-extrabold text-emerald-200 mt-1 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Chấm phạt đền 11m</span>
              </div>
            </div>
          </div>

          {/* Right Column (Zones 4 & 5) */}
          <div className="space-y-3">
            {[PENALTY_ZONES[3], PENALTY_ZONES[4]].map((z) => {
              const isMine = myPrediction === z.id;
              const isGoal = isRevealed && winningSet.has(z.id);
              const isSaved = isRevealed && keeperZone === z.id;
              const canPick = event.status === "lobby" && Boolean(onSelectPrediction);
              return (
                <button
                  key={z.id}
                  type="button"
                  disabled={!canPick || busy}
                  onClick={() => onSelectPrediction?.(z.id)}
                  className={`w-full p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-2 ${
                    isGoal
                      ? "bg-amber-400 text-slate-950 border-white ring-4 ring-amber-300/60 shadow-lg"
                      : isSaved
                      ? "bg-rose-900/80 text-rose-100 border-rose-400/70"
                      : isMine
                      ? "bg-emerald-500 text-slate-950 border-white shadow-md"
                      : "bg-slate-950/55 hover:bg-slate-900/75 border-white/30 text-white"
                  } ${canPick ? "cursor-pointer hover:scale-[1.01]" : "cursor-default"}`}
                >
                  <div>
                    <div className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                      <span>{isGoal ? "⚽" : isSaved ? "🧤" : z.emoji}</span>
                      <span>{z.label}</span>
                    </div>
                    <div className="text-[11px] font-bold opacity-85 mt-0.5">
                      {isGoal
                        ? "🏆 BÀN THẮNG VÀNG!"
                        : isSaved
                        ? "Thủ môn cản phá!"
                        : `${zoneCounts[z.id] || 0} cầu thủ chọn`}
                    </div>
                  </div>
                  {isMine && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-950/20 text-[10px] font-black">
                      BẠN
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
