import React, { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Sparkles, CheckCircle2 } from "lucide-react";
import type { MinigameEvent } from "../../types/minigame";
import { playDiceShakeTick, playVictoryChime } from "../../services/minigame/soundFx";

const PIP_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]],
};

const DiceSvg: React.FC<{ value: number; spinning?: boolean }> = ({ value, spinning }) => {
  const pips = PIP_POSITIONS[value] || PIP_POSITIONS[1];
  const isRedPip = value === 1 || value === 4;
  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-16 h-16 sm:w-20 sm:h-20 drop-shadow-lg transition-transform ${
        spinning ? "animate-spin" : ""
      }`}
    >
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="18"
        fill="#ffffff"
        stroke="#cbd5e1"
        strokeWidth="4"
      />
      {pips.map(([cx, cy], idx) => (
        <circle
          key={idx}
          cx={cx}
          cy={cy}
          r={value === 1 ? 12 : 9}
          fill={isRedPip ? "#e11d48" : "#0f172a"}
        />
      ))}
    </svg>
  );
};

interface TaiXiuStageProps {
  event: MinigameEvent;
  currentUid?: string;
  onSelectPrediction?: (side: "tai" | "xiu") => Promise<void>;
  busy?: boolean;
}

export const TaiXiuStage: React.FC<TaiXiuStageProps> = ({
  event,
  currentUid,
  onSelectPrediction,
  busy = false,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [displayDice, setDisplayDice] = useState<[number, number, number]>([6, 5, 4]);
  const celebratedRef = useRef<string | null>(null);

  const result = event.partyResult;
  const isShaking = Boolean(result && nowMs < result.revealedAtMs);
  const isRevealed = Boolean(result && nowMs >= result.revealedAtMs);

  useEffect(() => {
    if (!result) return;
    if (Date.now() >= result.revealedAtMs) {
      setNowMs(Date.now());
      if (result.dice) setDisplayDice(result.dice);
      return;
    }

    const timer = setInterval(() => {
      const t = Date.now();
      setNowMs(t);
      if (t < result.revealedAtMs) {
        setDisplayDice([
          1 + Math.floor(Math.random() * 6),
          1 + Math.floor(Math.random() * 6),
          1 + Math.floor(Math.random() * 6),
        ]);
        playDiceShakeTick(false);
      } else {
        if (result.dice) setDisplayDice(result.dice);
        if (celebratedRef.current !== event.id) {
          celebratedRef.current = event.id;
          playVictoryChime(false);
          confetti({ particleCount: 100, spread: 75, origin: { y: 0.6 } });
        }
        clearInterval(timer);
      }
    }, 110);

    return () => clearInterval(timer);
  }, [result?.revealedAtMs, event.id]);

  const participants = useMemo(() => Object.values(event.participants || {}), [event.participants]);
  const taiPlayers = participants.filter((p) => p.prediction === "tai");
  const xiuPlayers = participants.filter((p) => p.prediction === "xiu");
  const myPred = currentUid ? event.participants?.[currentUid]?.prediction : undefined;
  const canPick = event.status === "lobby" && Boolean(onSelectPrediction);

  return (
    <div className="rounded-3xl bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 border-2 border-amber-400/70 p-5 sm:p-6 text-white shadow-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-black">
            <Sparkles className="w-3.5 h-3.5" /> DỰ ĐOÁN MIỄN PHÍ 100% — KHÔNG ĐẶT CƯỢC TIỀN
          </span>
          <h3 className="text-lg font-black mt-1">Bàn Tài Xỉu Phúc Lợi</h3>
        </div>
        <div className="text-xs text-emerald-200 font-semibold">
          {event.status === "lobby"
            ? "Chọn cửa Tài hoặc Xỉu miễn phí rồi chờ Admin mở bát!"
            : isShaking
            ? "Đang lắc bát xúc xắc..."
            : `Kết quả: ${result?.taiXiuOutcome === "tai" ? "TÀI" : "XỈU"} (Tổng ${result?.diceSum})`}
        </div>
      </div>

      {/* Dice Bowl Center with Animated Ceramic Lid Lift */}
      <div className="flex flex-col items-center justify-center py-5 relative">
        <div className="relative">
          {/* Shaking Ceramic Dome Lid Overlay while shaking */}
          {isShaking && (
            <div className="absolute -inset-3 z-20 rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 border-4 border-yellow-200 shadow-[0_12px_35px_rgba(251,191,36,0.55)] flex flex-col items-center justify-center animate-bounce">
              <div className="w-10 h-4 rounded-full bg-amber-200 border-2 border-amber-800 mb-1 shadow-inner" />
              <span className="text-xs font-black text-slate-950 uppercase tracking-widest">
                Đang xóc bát...
              </span>
            </div>
          )}
          <div
            className={`px-8 py-6 rounded-full bg-gradient-to-b from-slate-800 to-slate-950 border-4 border-amber-400 shadow-[0_0_45px_rgba(251,191,36,0.3)] flex items-center gap-4 transition-all duration-500 ${
              isRevealed ? "scale-105 ring-4 ring-amber-300/50" : ""
            }`}
          >
            {(isRevealed && result?.dice ? result.dice : displayDice).map((v, idx) => (
              <DiceSvg key={idx} value={v} spinning={isShaking} />
            ))}
          </div>
        </div>

        {isRevealed && result && (
          <div className="mt-4 px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 text-slate-950 font-black text-base shadow-xl animate-in zoom-in-95">
            {result.taiXiuOutcome === "tai" ? "🔥 TÀI THẮNG!" : "❄️ XỈU THẮNG!"} — Tổng{" "}
            {result.diceSum} điểm
          </div>
        )}
      </div>

      {/* Free Selection Cards: TÀI vs XỈU */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(
          [
            {
              key: "tai" as const,
              title: "TÀI",
              range: "Tổng 11 – 18 điểm",
              players: taiPlayers,
              accent: "from-rose-600 to-orange-600",
            },
            {
              key: "xiu" as const,
              title: "XỈU",
              range: "Tổng 3 – 10 điểm",
              players: xiuPlayers,
              accent: "from-sky-600 to-indigo-600",
            },
          ] as const
        ).map((side) => {
          const isWinner = isRevealed && result?.taiXiuOutcome === side.key;
          const isSelected = myPred === side.key;
          return (
            <button
              key={side.key}
              type="button"
              disabled={!canPick || busy}
              onClick={() => onSelectPrediction?.(side.key)}
              className={`p-5 rounded-2xl border-2 text-left transition-all relative ${
                canPick ? "cursor-pointer hover:scale-[1.01]" : "cursor-default"
              } ${
                isWinner
                  ? "border-amber-300 bg-amber-500/25 ring-4 ring-amber-400/40"
                  : isSelected
                  ? "border-white bg-white/15 ring-2 ring-white/40"
                  : "border-white/15 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className={`inline-block px-3 py-1 rounded-xl bg-gradient-to-r ${side.accent} text-xl font-black tracking-wider`}
                  >
                    {side.title}
                  </div>
                  <div className="text-xs text-slate-200 mt-1.5 font-semibold">{side.range}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black">{side.players.length}</div>
                  <div className="text-[11px] text-slate-300">người chọn</div>
                </div>
              </div>

              {isSelected && (
                <div className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[11px] font-black">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Bạn đang chọn cửa này (Miễn phí)
                </div>
              )}

              {side.players.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {side.players.slice(0, 12).map((p) => (
                    <span
                      key={p.uid}
                      className="px-2 py-0.5 rounded-full bg-black/30 text-[11px] font-semibold text-white/90"
                    >
                      {p.displayName}
                    </span>
                  ))}
                  {side.players.length > 12 && (
                    <span className="text-[11px] text-slate-300">
                      +{side.players.length - 12} khác
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
