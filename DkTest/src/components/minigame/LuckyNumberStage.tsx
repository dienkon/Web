import React, { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, Sparkles, Target } from "lucide-react";
import type { MinigameEvent } from "../../types/minigame";
import { playDiceShakeTick, playVictoryChime } from "../../services/minigame/soundFx";

interface LuckyNumberStageProps {
  event: MinigameEvent;
  currentUid?: string;
  onSelectPrediction?: (numStr: string) => Promise<void>;
  busy?: boolean;
}

export const LuckyNumberStage: React.FC<LuckyNumberStageProps> = ({
  event,
  currentUid,
  onSelectPrediction,
  busy = false,
}) => {
  const myPred = currentUid ? event.participants?.[currentUid]?.prediction : undefined;
  const [inputNum, setInputNum] = useState(myPred || "");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [displayDigits, setDisplayDigits] = useState<[string, string]>(["?", "?"]);
  const celebratedRef = useRef<string | null>(null);

  useEffect(() => {
    if (myPred) setInputNum(myPred);
  }, [myPred]);

  const result = event.partyResult;
  const isSpinning = Boolean(result && nowMs < result.revealedAtMs);
  const isRevealed = Boolean(result && nowMs >= result.revealedAtMs);

  useEffect(() => {
    if (!result || result.luckyNumber === undefined) return;
    const finalStr = String(result.luckyNumber).padStart(2, "0");

    if (Date.now() >= result.revealedAtMs) {
      setNowMs(Date.now());
      setDisplayDigits([finalStr[0], finalStr[1]]);
      return;
    }

    const timer = setInterval(() => {
      const t = Date.now();
      setNowMs(t);
      const remaining = result.revealedAtMs - t;
      if (remaining > 1400) {
        setDisplayDigits([
          String(Math.floor(Math.random() * 10)),
          String(Math.floor(Math.random() * 10)),
        ]);
        playDiceShakeTick(false);
      } else if (remaining > 0) {
        // Lock tens digit first for maximum suspense!
        setDisplayDigits([finalStr[0], String(Math.floor(Math.random() * 10))]);
        playDiceShakeTick(false);
      } else {
        setDisplayDigits([finalStr[0], finalStr[1]]);
        if (celebratedRef.current !== event.id) {
          celebratedRef.current = event.id;
          playVictoryChime(false);
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }
        clearInterval(timer);
      }
    }, 95);
    return () => clearInterval(timer);
  }, [result?.revealedAtMs, result?.luckyNumber, event.id]);

  const participants = useMemo(() => Object.values(event.participants || {}), [event.participants]);
  const canPick = event.status === "lobby" && Boolean(onSelectPrediction);

  const handleSubmitNum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPick || busy) return;
    const cleaned = inputNum.replace(/\D/g, "").slice(0, 2);
    if (!cleaned) return;
    const formatted = String(Math.min(99, Number(cleaned))).padStart(2, "0");
    setInputNum(formatted);
    await onSelectPrediction?.(formatted);
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-indigo-900 via-violet-900 to-slate-900 border-2 border-indigo-400/70 p-5 sm:p-6 text-white shadow-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-400/20 text-indigo-200 text-[11px] font-black">
            <Sparkles className="w-3.5 h-3.5" /> ĐOÁN SỐ MAY MẮN MIỄN PHÍ (00 – 99)
          </span>
          <h3 className="text-lg font-black mt-1">Lồng Quay Số Trực Tiếp</h3>
        </div>
        <div className="text-xs text-amber-200 font-bold">
          Chỉ người đoán TRÚNG CHÍNH XÁC con số may mắn mới nhận giải!
        </div>
      </div>

      {/* 2-Digit Neon Game-Show Slot Drum */}
      <div className="flex flex-col items-center justify-center py-5 relative">
        <div
          className={`flex items-center gap-4 px-8 py-6 rounded-3xl bg-slate-950/90 border-4 border-amber-400 shadow-[0_0_50px_rgba(129,140,248,0.55)] transition-all duration-500 ${
            isRevealed ? "scale-105 ring-4 ring-amber-300/60" : ""
          }`}
        >
          {displayDigits.map((digit, idx) => (
            <div
              key={idx}
              className={`w-20 h-24 sm:w-24 sm:h-28 rounded-2xl bg-gradient-to-b from-white via-amber-50 to-slate-200 text-slate-950 flex items-center justify-center text-5xl sm:text-6xl font-black font-mono shadow-inner border-2 border-amber-300 ${
                isSpinning ? "animate-bounce" : ""
              }`}
            >
              {digit}
            </div>
          ))}
        </div>

        {isRevealed && result?.luckyNumber !== undefined && (
          <div className="mt-4 px-6 py-2 rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 text-slate-950 font-black text-base shadow-xl animate-in zoom-in-95">
            🎯 CON SỐ MAY MẮN: {String(result.luckyNumber).padStart(2, "0")} —{" "}
            {event.winners.length > 0
              ? `Có ${event.winners.length} người đoán trúng chính xác!`
              : "Chưa có ai đoán trúng chính xác số này!"}
          </div>
        )}
      </div>

      {/* Free Number Picker for Student */}
      {canPick && (
        <form
          onSubmit={handleSubmitNum}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/15 flex flex-wrap items-center justify-center gap-3"
        >
          <Target className="w-5 h-5 text-amber-300" />
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={inputNum}
            onChange={(e) => setInputNum(e.target.value.replace(/\D/g, "").slice(0, 2))}
            placeholder="00 - 99"
            className="w-28 px-4 py-2.5 rounded-xl bg-white text-slate-950 text-center text-lg font-black font-mono"
          />
          <button
            type="button"
            onClick={() => setInputNum(String(Math.floor(Math.random() * 100)).padStart(2, "0"))}
            className="px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold cursor-pointer"
          >
            Chọn ngẫu nhiên
          </button>
          <button
            type="submit"
            disabled={busy || !inputNum.trim()}
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {myPred ? `Cập nhật số (${myPred})` : "Chốt số miễn phí"}
          </button>
        </form>
      )}

      {myPred && (
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" /> Số may mắn của bạn: <b className="font-mono text-sm">{myPred}</b>
          </span>
        </div>
      )}

      {/* Registered Numbers Grid */}
      {participants.length > 0 && (
        <div className="bg-black/25 rounded-2xl p-3.5">
          <div className="text-[11px] font-bold text-indigo-200 mb-2">
            Danh sách các số đã đăng ký ({participants.length} người):
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {participants.map((p) => (
              <span
                key={p.uid}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 ${
                  p.uid === currentUid
                    ? "bg-amber-400 text-slate-950"
                    : "bg-white/10 text-white"
                }`}
              >
                <span className="font-mono font-black">{p.prediction || "??"}</span>
                <span className="opacity-80 max-w-[100px] truncate">{p.displayName}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
