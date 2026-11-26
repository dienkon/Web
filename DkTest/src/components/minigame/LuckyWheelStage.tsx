import React, { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, Sparkles } from "lucide-react";
import type { MinigameEvent } from "../../types/minigame";
import { LUCKY_WHEEL_SECTORS } from "../../services/minigame/gameLogic";
import { playDiceShakeTick, playVictoryChime } from "../../services/minigame/soundFx";

interface LuckyWheelStageProps {
  event: MinigameEvent;
  currentUid?: string;
  onSelectPrediction?: (sectorId: string) => Promise<void>;
  busy?: boolean;
}

const SECTOR_ANGLE = 360 / LUCKY_WHEEL_SECTORS.length;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeSectorPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

export const LuckyWheelStage: React.FC<LuckyWheelStageProps> = ({
  event,
  currentUid,
  onSelectPrediction,
  busy = false,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [rotationDeg, setRotationDeg] = useState(0);
  const celebratedRef = useRef<string | null>(null);
  const startedSpinRef = useRef<number | null>(null);

  const result = event.partyResult;
  const isSpinning = Boolean(result && nowMs < result.revealedAtMs);
  const isRevealed = Boolean(result && nowMs >= result.revealedAtMs);
  const winningIndex = typeof result?.wheelSectorIndex === "number" ? result.wheelSectorIndex : null;
  const winningSector = winningIndex !== null ? LUCKY_WHEEL_SECTORS[winningIndex] : null;

  useEffect(() => {
    if (!result) {
      startedSpinRef.current = null;
      setRotationDeg(0);
      return;
    }
    const targetIdx = typeof result.wheelSectorIndex === "number" ? result.wheelSectorIndex : 0;
    // Align center of target sector to top pointer (0 deg)
    const centerOfSector = targetIdx * SECTOR_ANGLE + SECTOR_ANGLE / 2;
    const finalAngle = 360 * 6 + (360 - centerOfSector);

    if (Date.now() >= result.revealedAtMs) {
      setNowMs(Date.now());
      setRotationDeg(finalAngle);
      return;
    }

    if (startedSpinRef.current !== result.revealedAtMs) {
      startedSpinRef.current = result.revealedAtMs;
      // Trigger smooth CSS rotation on next frame
      requestAnimationFrame(() => {
        setRotationDeg(finalAngle);
      });
    }

    const timer = setInterval(() => {
      const t = Date.now();
      setNowMs(t);
      if (t < result.revealedAtMs) {
        playDiceShakeTick(false);
      } else {
        if (celebratedRef.current !== event.id) {
          celebratedRef.current = event.id;
          playVictoryChime(false);
          confetti({ particleCount: 110, spread: 80, origin: { y: 0.55 } });
        }
        clearInterval(timer);
      }
    }, 150);

    return () => clearInterval(timer);
  }, [event.id, result]);

  const countsBySector = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of Object.values(event.participants || {})) {
      if (p.prediction) map[p.prediction] = (map[p.prediction] || 0) + 1;
    }
    return map;
  }, [event.participants]);

  const myPick = currentUid ? event.participants?.[currentUid]?.prediction : undefined;
  const spinDurationSec = Math.max(2, Math.min(8, ((event.revealDurationMs || 3800) / 1000)));

  return (
    <div className="space-y-5">
      {/* Illuminated Wheel Arena */}
      <div className="rounded-3xl bg-gradient-to-br from-fuchsia-950 via-purple-950 to-indigo-950 border border-fuchsia-500/30 p-5 sm:p-7 text-center text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-black tracking-wide mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>
              {isSpinning
                ? "VÒNG QUAY ĐANG BỨT TỐC..."
                : isRevealed && winningSector
                ? `MŨI TÊN DỪNG TẠI: ${winningSector.emoji} ${winningSector.label.toUpperCase()}!`
                : "CHỌN 1 BIỂU TƯỢNG MAY MẮN MIỄN PHÍ!"}
            </span>
          </div>

          {/* Pointer + Wheel SVG */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-1">
            {/* Top Golden Pointer */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_4px_10px_rgba(251,191,36,0.85)]">
              <svg width="34" height="38" viewBox="0 0 34 38">
                <polygon points="17,36 3,6 31,6" fill="#fbbf24" stroke="#ffffff" strokeWidth="3" />
                <circle cx="17" cy="10" r="5" fill="#fffbeb" />
              </svg>
            </div>

            {/* Outer glowing ring */}
            <div className="w-full h-full rounded-full p-2 bg-gradient-to-tr from-amber-400 via-yellow-200 to-fuchsia-400 shadow-[0_0_40px_rgba(217,70,239,0.45)]">
              <svg
                viewBox="0 0 240 240"
                className="w-full h-full rounded-full"
                style={{
                  transform: `rotate(${rotationDeg}deg)`,
                  transition: isSpinning
                    ? `transform ${spinDurationSec}s cubic-bezier(0.12, 0.85, 0.18, 1)`
                    : "none",
                }}
              >
                {LUCKY_WHEEL_SECTORS.map((sec, idx) => {
                  const start = idx * SECTOR_ANGLE;
                  const end = start + SECTOR_ANGLE;
                  const mid = start + SECTOR_ANGLE / 2;
                  const emojiPos = polarToCartesian(120, 120, 82, mid);
                  const textPos = polarToCartesian(120, 120, 56, mid);
                  const isWin = isRevealed && winningIndex === idx;
                  return (
                    <g key={sec.id}>
                      <path
                        d={describeSectorPath(120, 120, 118, start, end)}
                        fill={sec.hex}
                        stroke={isWin ? "#fef08a" : "#ffffff"}
                        strokeWidth={isWin ? 4 : 2}
                      />
                      <text
                        x={emojiPos.x}
                        y={emojiPos.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="24"
                        transform={`rotate(${mid}, ${emojiPos.x}, ${emojiPos.y})`}
                      >
                        {sec.emoji}
                      </text>
                      <text
                        x={textPos.x}
                        y={textPos.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="800"
                        transform={`rotate(${mid}, ${textPos.x}, ${textPos.y})`}
                      >
                        {sec.label}
                      </text>
                    </g>
                  );
                })}
                {/* Center Hub */}
                <circle cx="120" cy="120" r="24" fill="#1e1b4b" stroke="#fbbf24" strokeWidth="4" />
                <text
                  x="120"
                  y="120"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fde68a"
                  fontSize="11"
                  fontWeight="900"
                >
                  Dk
                </text>
              </svg>
            </div>
          </div>

          {isRevealed && winningSector && (
            <div className="mt-4 px-5 py-2.5 rounded-2xl bg-amber-400/20 border border-amber-300/60 text-amber-200 font-black text-sm sm:text-base animate-in zoom-in-95">
              🎉 Kết quả: {winningSector.emoji} {winningSector.label}
            </div>
          )}
        </div>
      </div>

      {/* 8 Interactive Sector Selection Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {LUCKY_WHEEL_SECTORS.map((sec) => {
          const picked = myPick === sec.id;
          const isWinner = isRevealed && result?.wheelSectorId === sec.id;
          const count = countsBySector[sec.id] || 0;
          const canPick = event.status === "lobby" && Boolean(onSelectPrediction);

          return (
            <button
              key={sec.id}
              type="button"
              disabled={!canPick || busy}
              onClick={() => onSelectPrediction && void onSelectPrediction(sec.id)}
              className={`relative p-3 rounded-2xl border-2 text-left transition-all ${
                isWinner
                  ? "border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-950/60 dark:to-yellow-950/40 ring-4 ring-amber-400/30 scale-[1.03]"
                  : picked
                  ? "border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40 shadow-md"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-fuchsia-300"
              } ${canPick ? "cursor-pointer active:scale-95" : "cursor-default"}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-2xl">{sec.emoji}</span>
                {picked && <CheckCircle2 className="w-4 h-4 text-fuchsia-600 shrink-0" />}
              </div>
              <div className="mt-1.5 font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                {sec.label}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                {count} người chọn
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
