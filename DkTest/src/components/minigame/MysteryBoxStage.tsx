import React, { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, Sparkles } from "lucide-react";
import type { MinigameEvent } from "../../types/minigame";
import { MYSTERY_BOXES } from "../../services/minigame/gameLogic";
import { playDiceShakeTick, playVictoryChime } from "../../services/minigame/soundFx";

interface MysteryBoxStageProps {
  event: MinigameEvent;
  currentUid?: string;
  onSelectPrediction?: (boxNumber: string) => Promise<void>;
  busy?: boolean;
}

export const MysteryBoxStage: React.FC<MysteryBoxStageProps> = ({
  event,
  currentUid,
  onSelectPrediction,
  busy = false,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [highlightBox, setHighlightBox] = useState<number>(1);
  const celebratedRef = useRef<string | null>(null);

  const result = event.partyResult;
  const isShaking = Boolean(result && nowMs < result.revealedAtMs);
  const isRevealed = Boolean(result && nowMs >= result.revealedAtMs);
  const winningBox = result?.mysteryWinningBox || null;

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
        setHighlightBox(1 + Math.floor(Math.random() * MYSTERY_BOXES.length));
        playDiceShakeTick(false);
      } else {
        if (celebratedRef.current !== event.id) {
          celebratedRef.current = event.id;
          playVictoryChime(false);
          confetti({ particleCount: 130, spread: 90, origin: { y: 0.55 } });
        }
        clearInterval(timer);
      }
    }, 150);
    return () => clearInterval(timer);
  }, [event.id, result]);

  const countsByBox = useMemo(() => {
    const map: Record<number, number> = {};
    for (const p of Object.values(event.participants || {})) {
      const n = Number(p.prediction);
      if (n >= 1 && n <= MYSTERY_BOXES.length) {
        map[n] = (map[n] || 0) + 1;
      }
    }
    return map;
  }, [event.participants]);

  const myPick = currentUid ? Number(event.participants?.[currentUid]?.prediction || 0) : 0;
  const canPick = event.status === "lobby" && Boolean(onSelectPrediction);
  const winningMeta = MYSTERY_BOXES.find((b) => b.boxNumber === winningBox);

  return (
    <div className="rounded-3xl bg-gradient-to-br from-rose-950 via-pink-950 to-indigo-950 border border-pink-500/30 p-5 sm:p-6 text-white shadow-xl space-y-5">
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-pink-300/40 text-pink-100 text-[11px] font-black">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>
            {isShaking
              ? "ĐANG ĐẬP HỘP BÍ ẨN..."
              : isRevealed && winningMeta
              ? `HỘP ĐẶC BIỆT LÀ: ${winningMeta.label.toUpperCase()} (#${winningMeta.boxNumber})!`
              : "CHỌN 1 HỘP QUÀ BÍ ẨN MIỄN PHÍ — BUNG PHÁO HOA NHẬN THƯỞNG!"}
          </span>
        </div>
        <p className="text-xs text-pink-100/75">
          6 hộp quà neon rực rỡ — chọn đúng hộp có Ngôi Sao Đặc Biệt để nhận quà phúc lợi!
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
        {MYSTERY_BOXES.map((box) => {
          const isPicked = myPick === box.boxNumber;
          const isWin = isRevealed && winningBox === box.boxNumber;
          const isOtherRevealed = isRevealed && winningBox !== box.boxNumber;
          const isActiveShake = isShaking && highlightBox === box.boxNumber;
          const count = countsByBox[box.boxNumber] || 0;

          return (
            <button
              key={box.id}
              type="button"
              disabled={!canPick || busy}
              onClick={() => onSelectPrediction && void onSelectPrediction(String(box.boxNumber))}
              className={`relative rounded-2xl border-2 p-4 flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${
                isWin
                  ? `border-yellow-300 bg-gradient-to-br ${box.gradient} scale-105 shadow-[0_0_32px_rgba(251,191,36,0.75)]`
                  : isOtherRevealed
                  ? "border-white/10 bg-white/5 opacity-60"
                  : isActiveShake
                  ? `border-white bg-gradient-to-br ${box.gradient} scale-105 -rotate-2`
                  : isPicked
                  ? `border-emerald-300 bg-gradient-to-br ${box.gradient} shadow-lg`
                  : `border-white/20 bg-white/10 hover:bg-white/15 hover:border-pink-300`
              } ${canPick ? "cursor-pointer active:scale-95" : "cursor-default"}`}
            >
              <span className="absolute top-2 left-2.5 text-[10px] font-black opacity-85">
                Hộp #{box.boxNumber}
              </span>
              {isPicked && <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-white" />}

              <div className={`text-4xl ${isShaking ? "animate-bounce" : ""}`}>
                {isWin ? "🎊" : isOtherRevealed ? "📦" : box.emoji}
              </div>
              <div className="text-xs sm:text-sm font-black">{box.label}</div>
              <div className="text-[11px] font-bold opacity-85">
                {isWin ? "🌟 TRÚNG ĐẶC BIỆT!" : `${count} người chọn`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
