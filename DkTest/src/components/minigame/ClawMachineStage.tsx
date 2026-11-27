import React, { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, Sparkles } from "lucide-react";
import type { MinigameEvent } from "../../types/minigame";
import { CLAW_PLUSHIES } from "../../services/minigame/gameLogic";
import { playDiceShakeTick, playVictoryChime } from "../../services/minigame/soundFx";

interface ClawMachineStageProps {
  event: MinigameEvent;
  currentUid?: string;
  onSelectPrediction?: (plushieId: string) => void;
  busy?: boolean;
}

export const ClawMachineStage: React.FC<ClawMachineStageProps> = ({
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
      if (t < partyResult.revealedAtMs && t - lastTick > 240) {
        lastTick = t;
        playDiceShakeTick(false);
      }
      if (t >= partyResult.revealedAtMs && chimePlayedRef.current !== partyResult.revealedAtMs) {
        chimePlayedRef.current = partyResult.revealedAtMs;
        playVictoryChime(false);
        confetti({ particleCount: 95, spread: 80, origin: { y: 0.62 } });
      }
      if (t < partyResult.revealedAtMs + 500) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [partyResult?.revealedAtMs]);

  const plushieCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of Object.values(event.participants || {})) {
      if (p.prediction) counts[p.prediction] = (counts[p.prediction] || 0) + 1;
    }
    return counts;
  }, [event.participants]);

  const isGrabbing = Boolean(partyResult && nowMs < partyResult.revealedAtMs);
  const isRevealed = Boolean(partyResult && nowMs >= partyResult.revealedAtMs);
  const winningPlushie =
    isRevealed && partyResult?.clawPlushieIndex !== undefined
      ? CLAW_PLUSHIES[partyResult.clawPlushieIndex]
      : null;

  const clawHorizontalPct = useMemo(() => {
    if (!partyResult) return 50;
    if (isGrabbing) {
      return 50 + Math.sin(nowMs / 180) * 34;
    }
    const idx = partyResult.clawPlushieIndex ?? 0;
    const col = idx % 4;
    return 14 + col * 24;
  }, [partyResult, isGrabbing, nowMs]);

  return (
    <div className="rounded-3xl bg-gradient-to-b from-fuchsia-950 via-purple-950 to-slate-950 border-2 border-fuchsia-400/45 p-4 sm:p-6 text-white shadow-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
            <span>🧸 Tủ Kính Gắp Thú Siêu Nhân Phẩm</span>
          </h2>
          <p className="text-xs text-fuchsia-200/85">
            {event.status === "lobby"
              ? "Chọn miễn phí 1 trong 8 thú bông trong tủ kính — càng gắp trúng thú nào, tất cả bạn chọn thú đó nhận quà!"
              : isGrabbing
              ? "🕹️ Càng gắp đang di chuyển và hạ xuống kẹp thú bông..."
              : winningPlushie
              ? `🎉 GẮP THÀNH CÔNG: ${winningPlushie.emoji} ${winningPlushie.label}!`
              : "Sẵn sàng bấm nút gắp thú!"}
          </p>
        </div>

        {myPrediction && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-fuchsia-500/25 border border-fuchsia-300/40 text-fuchsia-100 text-xs font-extrabold">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
            <span>
              Đã chọn:{" "}
              {CLAW_PLUSHIES.find((p) => p.id === myPrediction)?.label || myPrediction}
            </span>
          </span>
        )}
      </div>

      {/* Mechanical Crane Gantry Header */}
      <div className="relative h-24 rounded-2xl bg-slate-900/90 border border-fuchsia-400/35 overflow-hidden">
        <div className="absolute top-2 inset-x-4 h-2 rounded-full bg-slate-700 border border-slate-600" />
        <div
          className="absolute top-2 -translate-x-1/2 flex flex-col items-center transition-all duration-150"
          style={{ left: `${clawHorizontalPct}%` }}
        >
          <div className="w-6 h-3 rounded bg-amber-400 border border-white" />
          <div className={`w-1 bg-slate-300 ${isGrabbing ? "h-10" : "h-6"} transition-all`} />
          <div className="text-xl leading-none">
            {winningPlushie ? `🦾${winningPlushie.emoji}` : "🦾"}
          </div>
        </div>
      </div>

      {/* 8 Adorable Plushie Capsules inside Arcade Cabinet */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CLAW_PLUSHIES.map((plushie) => {
          const isMine = myPrediction === plushie.id;
          const isWinner = winningPlushie?.id === plushie.id;
          const canPick = event.status === "lobby" && Boolean(onSelectPrediction);
          return (
            <button
              key={plushie.id}
              type="button"
              disabled={!canPick || busy}
              onClick={() => onSelectPrediction?.(plushie.id)}
              className={`p-3.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center gap-1.5 ${
                isWinner
                  ? "bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-400 text-slate-950 border-white ring-4 ring-amber-300/60 scale-[1.03] shadow-lg"
                  : isMine
                  ? `bg-gradient-to-br ${plushie.gradient} text-white border-white ring-2 ring-fuchsia-300 shadow-md`
                  : "bg-slate-900/80 hover:bg-slate-800/90 border-fuchsia-500/30 text-white"
              } ${canPick ? "cursor-pointer hover:-translate-y-0.5" : "cursor-default"}`}
            >
              <span className={`text-3xl ${isGrabbing ? "animate-pulse" : ""}`}>
                {plushie.emoji}
              </span>
              <div className="text-xs font-black">{plushie.label}</div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isWinner ? "bg-slate-950/20 text-slate-950" : "bg-white/15 text-fuchsia-200"
                }`}
              >
                {plushieCounts[plushie.id] || 0} người chọn
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
