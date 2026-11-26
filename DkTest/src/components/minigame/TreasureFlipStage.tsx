import React, { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, Sparkles } from "lucide-react";
import type { MinigameEvent } from "../../types/minigame";
import { TREASURE_CHEST_COUNT, TREASURE_WINNING_COUNT } from "../../services/minigame/gameLogic";
import { playDiceShakeTick, playVictoryChime } from "../../services/minigame/soundFx";

interface TreasureFlipStageProps {
  event: MinigameEvent;
  currentUid?: string;
  onSelectPrediction?: (chestIndex: string) => Promise<void>;
  busy?: boolean;
}

export const TreasureFlipStage: React.FC<TreasureFlipStageProps> = ({
  event,
  currentUid,
  onSelectPrediction,
  busy = false,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [pulseIdx, setPulseIdx] = useState<number>(1);
  const celebratedRef = useRef<string | null>(null);

  const result = event.partyResult;
  const isShaking = Boolean(result && nowMs < result.revealedAtMs);
  const isRevealed = Boolean(result && nowMs >= result.revealedAtMs);
  const winningIndices = useMemo(
    () => new Set(result?.treasureWinningIndices || []),
    [result?.treasureWinningIndices]
  );

  useEffect(() => {
    if (!result) return;
    if (Date.now() >= result.revealedAtMs) {
      setNowMs(Date.now());
      return;
    }
    const timer = setInterval(() => {
      const t = Date.now();
      setNowMs(t);
      if (t < result.revealedAtMs) {
        setPulseIdx(1 + Math.floor(Math.random() * TREASURE_CHEST_COUNT));
        playDiceShakeTick(false);
      } else {
        if (celebratedRef.current !== event.id) {
          celebratedRef.current = event.id;
          playVictoryChime(false);
          confetti({ particleCount: 120, spread: 85, origin: { y: 0.55 } });
        }
        clearInterval(timer);
      }
    }, 160);
    return () => clearInterval(timer);
  }, [event.id, result]);

  const countsByChest = useMemo(() => {
    const map: Record<number, number> = {};
    for (const p of Object.values(event.participants || {})) {
      const n = Number(p.prediction);
      if (n >= 1 && n <= TREASURE_CHEST_COUNT) {
        map[n] = (map[n] || 0) + 1;
      }
    }
    return map;
  }, [event.participants]);

  const myPick = currentUid ? Number(event.participants?.[currentUid]?.prediction || 0) : 0;
  const canPick = event.status === "lobby" && Boolean(onSelectPrediction);

  return (
    <div className="rounded-3xl bg-gradient-to-br from-amber-950 via-stone-900 to-yellow-950 border border-amber-500/30 p-5 sm:p-6 text-white shadow-xl space-y-5">
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-300/40 text-amber-200 text-[11px] font-black">
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {isShaking
              ? "ĐANG MỞ KHÓA 9 RƯƠNG KHO BÁU..."
              : isRevealed
              ? `KHO BÁU KIM CƯƠNG NẰM TẠI RƯƠNG #${Array.from(winningIndices).join(" & #")}!`
              : `CHỌN 1 TRONG ${TREASURE_CHEST_COUNT} RƯƠNG — CÓ ${TREASURE_WINNING_COUNT} RƯƠNG CHỨA KHO BÁU VÀNG!`}
          </span>
        </div>
        <p className="text-xs text-amber-100/75">
          Hoàn toàn miễn phí • Lật mở đồng loạt theo thời gian thực khi Admin bấm Bắt đầu
        </p>
      </div>

      {/* 3x3 Treasure Chest Grid */}
      <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
        {Array.from({ length: TREASURE_CHEST_COUNT }, (_, idx) => {
          const chestNum = idx + 1;
          const isPicked = myPick === chestNum;
          const isWinningChest = isRevealed && winningIndices.has(chestNum);
          const isEmptyRevealed = isRevealed && !winningIndices.has(chestNum);
          const isPulsing = isShaking && pulseIdx === chestNum;
          const count = countsByChest[chestNum] || 0;

          return (
            <button
              key={chestNum}
              type="button"
              disabled={!canPick || busy}
              onClick={() => onSelectPrediction && void onSelectPrediction(String(chestNum))}
              className={`relative aspect-square rounded-2xl border-2 p-2.5 flex flex-col items-center justify-center transition-all duration-300 ${
                isWinningChest
                  ? "border-yellow-300 bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-500 text-amber-950 scale-105 shadow-[0_0_30px_rgba(251,191,36,0.7)]"
                  : isEmptyRevealed
                  ? "border-white/10 bg-white/5 text-white/50 opacity-75"
                  : isPulsing
                  ? "border-amber-300 bg-amber-500/30 scale-105 animate-bounce"
                  : isPicked
                  ? "border-emerald-400 bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.45)]"
                  : "border-amber-500/30 bg-white/10 hover:bg-amber-500/20 hover:border-amber-400"
              } ${canPick ? "cursor-pointer active:scale-95" : "cursor-default"}`}
            >
              <span className="absolute top-1.5 left-2 text-[10px] font-black opacity-80">
                #{chestNum}
              </span>
              {isPicked && (
                <CheckCircle2
                  className={`absolute top-1.5 right-1.5 w-4 h-4 ${
                    isWinningChest ? "text-emerald-900" : "text-emerald-300"
                  }`}
                />
              )}

              <div className={`text-3xl sm:text-4xl transition-transform ${isShaking ? "animate-pulse" : ""}`}>
                {isWinningChest ? "💎" : isEmptyRevealed ? "🪙" : "🏴‍☠️"}
              </div>
              <div className="mt-1 text-[11px] font-black">
                {isWinningChest ? "KHO BÁU!" : isEmptyRevealed ? "Trống" : `Rương #${chestNum}`}
              </div>
              <div className="text-[10px] font-bold opacity-80 mt-0.5">{count} người</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
