import React, { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, Sparkles } from "lucide-react";
import type { BauCuaFace, MinigameEvent } from "../../types/minigame";
import { BAU_CUA_FACES } from "../../services/minigame/gameLogic";
import { playDiceShakeTick, playVictoryChime } from "../../services/minigame/soundFx";

interface BauCuaStageProps {
  event: MinigameEvent;
  currentUid?: string;
  onSelectPrediction?: (face: BauCuaFace) => Promise<void>;
  busy?: boolean;
}

export const BauCuaStage: React.FC<BauCuaStageProps> = ({
  event,
  currentUid,
  onSelectPrediction,
  busy = false,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [rollingFaces, setRollingFaces] = useState<[BauCuaFace, BauCuaFace, BauCuaFace]>([
    "bau",
    "cua",
    "tom",
  ]);
  const celebratedRef = useRef<string | null>(null);

  const result = event.partyResult;
  const isShaking = Boolean(result && nowMs < result.revealedAtMs);
  const isRevealed = Boolean(result && nowMs >= result.revealedAtMs);

  useEffect(() => {
    if (!result) return;
    if (Date.now() >= result.revealedAtMs) {
      setNowMs(Date.now());
      if (result.bauCuaFaces) setRollingFaces(result.bauCuaFaces);
      return;
    }

    const ids = BAU_CUA_FACES.map((f) => f.id);
    const timer = setInterval(() => {
      const t = Date.now();
      setNowMs(t);
      if (t < result.revealedAtMs) {
        setRollingFaces([
          ids[Math.floor(Math.random() * 6)],
          ids[Math.floor(Math.random() * 6)],
          ids[Math.floor(Math.random() * 6)],
        ]);
        playDiceShakeTick(false);
      } else {
        if (result.bauCuaFaces) setRollingFaces(result.bauCuaFaces);
        if (celebratedRef.current !== event.id) {
          celebratedRef.current = event.id;
          playVictoryChime(false);
          confetti({ particleCount: 110, spread: 80, origin: { y: 0.6 } });
        }
        clearInterval(timer);
      }
    }, 115);
    return () => clearInterval(timer);
  }, [result?.revealedAtMs, event.id]);

  const participants = useMemo(() => Object.values(event.participants || {}), [event.participants]);
  const myPred = currentUid ? event.participants?.[currentUid]?.prediction : undefined;
  const canPick = event.status === "lobby" && Boolean(onSelectPrediction);

  const shownFaces = isRevealed && result?.bauCuaFaces ? result.bauCuaFaces : rollingFaces;

  return (
    <div className="rounded-3xl bg-gradient-to-br from-red-900 via-rose-900 to-amber-950 border-2 border-amber-400 p-5 sm:p-6 text-white shadow-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-black">
            <Sparkles className="w-3.5 h-3.5" /> HỘI XUÂN PHÚC LỢI MIỄN PHÍ 100%
          </span>
          <h3 className="text-lg font-black mt-1">Bàn Bầu Cua Tôm Cá</h3>
        </div>
        <div className="text-xs text-amber-200 font-semibold">
          {event.status === "lobby"
            ? "Bấm chọn 1 linh vật may mắn miễn phí!"
            : isShaking
            ? "Đang xóc đĩa bầu cua..."
            : "Đã mở đĩa kết quả!"}
        </div>
      </div>

      {/* Ceramic Shaking Plate with Festive Lid Overlay */}
      <div className="flex flex-col items-center justify-center py-4 relative">
        <div className="relative">
          {isShaking && (
            <div className="absolute -inset-3 z-20 rounded-full bg-gradient-to-b from-red-600 via-red-700 to-amber-800 border-4 border-amber-300 shadow-[0_12px_35px_rgba(251,191,36,0.5)] flex flex-col items-center justify-center animate-bounce">
              <span className="text-2xl mb-0.5">🏮</span>
              <span className="text-xs font-black text-amber-200 uppercase tracking-widest">
                Đang xóc Bầu Cua...
              </span>
            </div>
          )}
          <div
            className={`px-7 py-5 rounded-full bg-gradient-to-b from-amber-100 to-amber-200 border-4 border-amber-500 shadow-[0_0_40px_rgba(251,191,36,0.4)] flex items-center gap-3 sm:gap-5 transition-all duration-500 ${
              isRevealed ? "scale-105 ring-4 ring-amber-300/60" : ""
            }`}
          >
            {shownFaces.map((faceId, idx) => {
              const info = BAU_CUA_FACES.find((f) => f.id === faceId) || BAU_CUA_FACES[0];
              return (
                <div
                  key={idx}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-red-300 shadow-lg flex flex-col items-center justify-center text-slate-900 transform hover:scale-105 transition-transform"
                >
                  <span className="text-3xl sm:text-4xl">{info.emoji}</span>
                  <span className="text-[10px] font-black uppercase text-red-700">{info.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 6 Classic Vietnamese Mascot Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {BAU_CUA_FACES.map((face) => {
          const pickedHere = participants.filter((p) => p.prediction === face.id);
          const matchCount = isRevealed && result?.bauCuaFaces
            ? result.bauCuaFaces.filter((f) => f === face.id).length
            : 0;
          const isMine = myPred === face.id;

          return (
            <button
              key={face.id}
              type="button"
              disabled={!canPick || busy}
              onClick={() => onSelectPrediction?.(face.id)}
              className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                canPick ? "cursor-pointer hover:scale-[1.02]" : "cursor-default"
              } ${
                matchCount > 0
                  ? "border-amber-300 bg-amber-400/25 ring-4 ring-amber-400/40"
                  : isMine
                  ? "border-white bg-white/15 ring-2 ring-white/40"
                  : "border-white/15 bg-black/20 hover:bg-black/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">{face.emoji}</span>
                  <div>
                    <div className="text-sm font-black uppercase tracking-wide">{face.label}</div>
                    <div className="text-[11px] text-amber-200">{pickedHere.length} người chọn</div>
                  </div>
                </div>
                {matchCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black">
                    x{matchCount}
                  </span>
                )}
              </div>

              {isMine && (
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Bạn đang chọn
                </div>
              )}

              {pickedHere.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {pickedHere.slice(0, 6).map((p) => (
                    <span
                      key={p.uid}
                      className="px-1.5 py-0.5 rounded bg-black/30 text-[10px] font-semibold truncate max-w-[90px]"
                    >
                      {p.displayName}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
