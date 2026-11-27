import React, { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Flag, Trophy, Volume2, VolumeX, Zap, Play, CheckCircle2 } from "lucide-react";
import type {
  MinigameEvent,
  MinigameParticipant,
  MinigameRaceHeat,
} from "../../types/minigame";
import {
  RACER_PALETTE,
  evaluateRacerAtTime,
  type EvaluatedRacerState,
} from "../../services/minigame/raceEngine";
import {
  playGallopTick,
  playRaceStartFanfare,
  playVictoryChime,
} from "../../services/minigame/soundFx";

const HORSE_COATS = [
  { body: "#8B4513", dark: "#5C2C0C", mane: "#1E120B" }, // Bay
  { body: "#D97706", dark: "#92400E", mane: "#FDE68A" }, // Palomino
  { body: "#334155", dark: "#0F172A", mane: "#020617" }, // Black Stallion
  { body: "#F1F5F9", dark: "#CBD5E1", mane: "#94A3B8" }, // White Arab
  { body: "#9A3412", dark: "#7C2D12", mane: "#431407" }, // Chestnut
  { body: "#78350F", dark: "#451A03", mane: "#1C1917" }, // Dark Brown
  { body: "#B45309", dark: "#78350F", mane: "#292524" }, // Buckskin
  { body: "#475569", dark: "#1E293B", mane: "#E2E8F0" }, // Dapple Grey
];

/**
 * High-craft articulated galloping Horse + Jockey SVG model.
 * Leg angles, body bob, mane/tail wave, dust puffs, and sprint fire respond smoothly to stridePhase & speed.
 */
const HorseRacerSvg: React.FC<{
  laneIndex: number;
  jerseyColor: string;
  racerNumber: number;
  stridePhase: number;
  isMoving: boolean;
  isSprinting: boolean;
}> = ({ laneIndex, jerseyColor, racerNumber, stridePhase, isMoving, isSprinting }) => {
  const coat = HORSE_COATS[laneIndex % HORSE_COATS.length];
  const s = isMoving ? Math.sin(stridePhase) : 0;
  const c = isMoving ? Math.cos(stridePhase) : 0;

  const frontLeg1 = isMoving ? s * 36 : 4;
  const frontLeg2 = isMoving ? Math.sin(stridePhase + 0.9) * 34 : -6;
  const backLeg1 = isMoving ? -s * 38 : -8;
  const backLeg2 = isMoving ? -Math.sin(stridePhase + 0.8) * 34 : 6;
  const bodyBob = isMoving ? Math.abs(c) * -3.5 : 0;
  const bodyTilt = isMoving ? s * 3.5 : 0;
  const tailWave = isMoving ? c * 18 : 0;

  return (
    <svg
      viewBox="0 0 116 68"
      className="w-[82px] h-[48px] sm:w-[100px] sm:h-[58px] overflow-visible drop-shadow-[0_4px_4px_rgba(0,0,0,0.35)]"
    >
      {/* Sprint flame / wind streaks */}
      {isSprinting && (
        <g opacity={0.9}>
          <path
            d="M -26 30 L 6 26 L -12 33 L 10 35 L -22 41"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M -18 22 L 8 20"
            stroke="#fde047"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Ground dust clouds when galloping */}
      {isMoving && (
        <g opacity={0.55}>
          <circle cx={14 - ((stridePhase * 5) % 16)} cy={60} r={3.5} fill="#e7e5e4" />
          <circle cx={24 - ((stridePhase * 7) % 20)} cy={62} r={2.5} fill="#d6d3d1" />
          <circle cx={6 - ((stridePhase * 4) % 12)} cy={58} r={2.2} fill="#f5f5f4" />
        </g>
      )}

      {/* Ground shadow */}
      <ellipse cx="56" cy="63" rx="30" ry="4" fill="rgba(0,0,0,0.28)" />

      <g transform={`translate(0, ${bodyBob}) rotate(${bodyTilt}, 58, 36)`}>
        {/* Far back leg */}
        <g transform={`translate(34, 42) rotate(${backLeg2})`}>
          <path d="M0,0 L-5,11 L-2,20" stroke={coat.dark} strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx="-2" cy="20" r="2.2" fill="#0f172a" />
        </g>

        {/* Far front leg */}
        <g transform={`translate(73, 41) rotate(${frontLeg2})`}>
          <path d="M0,0 L4,11 L1,20" stroke={coat.dark} strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <circle cx="1" cy="20" r="2.2" fill="#0f172a" />
        </g>

        {/* Flowing Tail */}
        <g transform={`translate(24, 30) rotate(${tailWave})`}>
          <path
            d="M0,0 C-12,-2 -18,6 -22,15 C-14,13 -8,11 -2,6 Z"
            fill={coat.mane}
          />
        </g>

        {/* Muscular Horse Body */}
        <path
          d="M 24 34 C 24 23, 38 22, 54 24 C 66 25, 76 23, 81 29 C 85 35, 81 44, 70 45 L 36 45 C 26 45, 22 40, 24 34 Z"
          fill={coat.body}
        />
        {/* Body highlight */}
        <path
          d="M 32 28 C 44 25, 62 26, 74 29"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* Neck & Head */}
        <path
          d="M 73 28 L 87 13 L 96 15 L 106 23 C 107 25, 104 28, 100 28 L 91 25 L 81 39 Z"
          fill={coat.body}
        />
        {/* Flowing Mane */}
        <path
          d="M 74 25 C 78 18, 82 13, 89 11 C 85 16, 82 21, 78 27 Z"
          fill={coat.mane}
        />
        {/* Ears */}
        <polygon points="88,13 91,6 94,13" fill={coat.dark} />
        {/* Eye & Bridle */}
        <circle cx="95" cy="18" r="1.5" fill="#0f172a" />
        <path d="M 90 19 L 103 24" stroke="#f8fafc" strokeWidth="1.2" />

        {/* Near back leg */}
        <g transform={`translate(30, 42) rotate(${backLeg1})`}>
          <path d="M0,0 L-6,11 L-1,20" stroke={coat.body} strokeWidth="5.5" strokeLinecap="round" fill="none" />
          <circle cx="-1" cy="20" r="2.4" fill="#0f172a" />
        </g>

        {/* Near front leg */}
        <g transform={`translate(76, 41) rotate(${frontLeg1})`}>
          <path d="M0,0 L6,10 L3,20" stroke={coat.body} strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx="3" cy="20" r="2.4" fill="#0f172a" />
        </g>

        {/* Saddle cloth with racer number */}
        <rect x="44" y="23" width="20" height="15" rx="3" fill="#ffffff" stroke={jerseyColor} strokeWidth="2" />
        <text
          x="54"
          y="34"
          textAnchor="middle"
          fontSize="10"
          fontWeight="900"
          fill="#0f172a"
        >
          {racerNumber}
        </text>

        {/* Jockey leaning forward in racing stance */}
        <g transform="translate(50, 7)">
          {/* Flowing jockey scarf */}
          {isMoving && (
            <path
              d={`M 14 11 Q 2 ${8 + s * 4} -8 ${13 - c * 4}`}
              stroke={isSprinting ? "#fde047" : jerseyColor}
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          )}
          {/* Jockey legs */}
          <path d="M4,18 L10,22 L6,26" stroke="#f8fafc" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          {/* Jockey jersey torso */}
          <path d="M2,16 L14,8 L22,12 L12,20 Z" fill={jerseyColor} />
          {/* Arm holding reins */}
          <path d="M16,12 L34,15" stroke="#1e293b" strokeWidth="1.3" />
          {/* Helmet */}
          <circle cx="20" cy="8" r="5" fill={jerseyColor} stroke="#ffffff" strokeWidth="1.3" />
          <path d="M23,7 L28,9" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
};

/**
 * Cute 3D-feel Animated Fluttering Bumblebee SVG model for Bee Race.
 */
const BeeRacerSvg: React.FC<{
  jerseyColor: string;
  racerNumber: number;
  stridePhase: number;
  isMoving: boolean;
  isSprinting: boolean;
}> = ({ jerseyColor, racerNumber, stridePhase, isMoving, isSprinting }) => {
  const wingFlap = isMoving ? Math.sin(stridePhase * 3.5) * 28 : Math.sin(Date.now() / 120) * 6;
  const hoverY = isMoving ? Math.sin(stridePhase * 1.4) * 4 : 0;

  return (
    <svg
      viewBox="0 0 96 60"
      className="w-[70px] h-[44px] sm:w-[84px] sm:h-[52px] overflow-visible drop-shadow-[0_4px_6px_rgba(245,158,11,0.45)]"
    >
      {/* Golden pollen / honey boost trail */}
      {isMoving && (
        <g opacity={isSprinting ? 0.95 : 0.55}>
          <circle cx={-6} cy={30 + hoverY} r={isSprinting ? 4 : 2.5} fill="#fde047" />
          <circle cx={-16} cy={34 - hoverY * 0.5} r={2.2} fill="#fbbf24" />
          {isSprinting && (
            <path d="M -28 30 L 4 30" stroke="#f59e0b" strokeWidth="3" strokeDasharray="4 4" />
          )}
        </g>
      )}

      <g transform={`translate(0, ${hoverY})`}>
        {/* Back wing */}
        <ellipse
          cx="46"
          cy="14"
          rx="14"
          ry="7"
          fill="rgba(224,242,254,0.85)"
          stroke="#7dd3fc"
          strokeWidth="1.5"
          transform={`rotate(${-25 + wingFlap}, 48, 22)`}
        />
        {/* Stinger */}
        <polygon points="10,31 22,26 22,36" fill="#1e293b" />
        {/* Glossy Bee Body */}
        <ellipse cx="46" cy="31" rx="26" ry="16" fill="#facc15" stroke="#854d0e" strokeWidth="2" />
        {/* Stripes */}
        <path d="M 33 17 Q 30 31 33 45" stroke="#1e293b" strokeWidth="6" fill="none" />
        <path d="M 47 15 Q 44 31 47 47" stroke="#1e293b" strokeWidth="6" fill="none" />
        {/* Racing helmet / jersey band */}
        <circle cx="67" cy="27" r="10" fill={jerseyColor} stroke="#ffffff" strokeWidth="1.5" />
        {/* Racing goggles */}
        <circle cx="72" cy="26" r="4.2" fill="#e0f2fe" stroke="#0f172a" strokeWidth="1.5" />
        <circle cx="73" cy="26" r="1.7" fill="#0f172a" />
        {/* Antennae */}
        <path d="M 70 18 Q 76 10 82 12" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="82" cy="12" r="2.2" fill="#f59e0b" />
        {/* Front translucent wing */}
        <ellipse
          cx="40"
          cy="16"
          rx="16"
          ry="8"
          fill="rgba(255,255,255,0.9)"
          stroke="#38bdf8"
          strokeWidth="1.5"
          transform={`rotate(${-15 - wingFlap}, 44, 24)`}
        />
        {/* Number badge */}
        <circle cx="46" cy="31" r="8" fill="#ffffff" stroke={jerseyColor} strokeWidth="2" />
        <text x="46" y="34.5" textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#0f172a">
          {racerNumber}
        </text>
      </g>
    </svg>
  );
};

/**
 * Cute Sunglasses Rubber Duck surfing foaming river rapids (`duck_race`)!
 */
const DuckRacerSvg: React.FC<{
  jerseyColor: string;
  racerNumber: number;
  stridePhase: number;
  isMoving: boolean;
  isSprinting: boolean;
}> = ({ jerseyColor, racerNumber, stridePhase, isMoving, isSprinting }) => {
  const bob = isMoving ? Math.sin(stridePhase * 1.15) * 3.2 : 0;
  const rock = isMoving ? Math.cos(stridePhase) * 5.5 : 0;
  const wingFlap = isMoving ? Math.sin(stridePhase * 2) * 12 : 0;

  return (
    <svg
      viewBox="0 0 100 62"
      className="w-[74px] h-[46px] sm:w-[90px] sm:h-[54px] overflow-visible drop-shadow-[0_4px_5px_rgba(2,132,199,0.45)]"
    >
      {/* Foaming wake trail */}
      {isMoving && (
        <g opacity={0.85}>
          <path
            d={`M 4 ${48 + (bob % 2)} Q 16 42, 28 49 T 48 49`}
            fill="none"
            stroke="#e0f2fe"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx={10 - ((stridePhase * 4) % 12)} cy={46} r="3" fill="#ffffff" opacity="0.9" />
          <circle cx={18 - ((stridePhase * 6) % 14)} cy={51} r="2.2" fill="#bae6fd" />
        </g>
      )}
      {isSprinting && (
        <path
          d="M -12 30 L 14 28 M -8 38 L 16 37"
          stroke="#fde047"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      )}

      <g transform={`translate(0, ${bob}) rotate(${rock}, 52, 38)`}>
        {/* Colorful Swim Ring */}
        <ellipse
          cx="50"
          cy="46"
          rx="26"
          ry="8.5"
          fill={jerseyColor}
          stroke="#ffffff"
          strokeWidth="2.5"
        />
        {/* Golden Duck Body */}
        <path
          d="M 28 38 C 25 27, 36 22, 50 25 C 62 27, 70 33, 68 42 C 66 47, 34 47, 28 38 Z"
          fill="#facc15"
          stroke="#ca8a04"
          strokeWidth="1.5"
        />
        {/* Flapping Wing */}
        <path
          d="M 38 31 C 46 28, 55 32, 52 39 C 46 42, 37 39, 38 31 Z"
          fill="#eab308"
          stroke="#a16207"
          strokeWidth="1.2"
          transform={`rotate(${wingFlap}, 42, 34)`}
        />
        {/* Duck Head */}
        <circle cx="63" cy="21" r="11.5" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
        {/* Racing Cap */}
        <path d="M 53 15 Q 63 6, 73 15 L 78 16 L 52 17 Z" fill={jerseyColor} />
        {/* Cool Aviator Sunglasses */}
        <rect x="61" y="17" width="11" height="5.5" rx="2" fill="#0f172a" />
        <line x1="55" y1="19" x2="61" y2="19" stroke="#0f172a" strokeWidth="1.8" />
        <line x1="63" y1="18.5" x2="67" y2="18.5" stroke="#38bdf8" strokeWidth="1.2" />
        {/* Orange Beak */}
        <path d="M 73 21 L 84 23.5 L 73 27 Z" fill="#f97316" stroke="#c2410c" strokeWidth="1" />
        {/* Number Badge */}
        <circle cx="44" cy="36" r="7.5" fill="#ffffff" stroke={jerseyColor} strokeWidth="2" />
        <text x="44" y="39.5" textAnchor="middle" fontSize="9" fontWeight="900" fill="#0f172a">
          {racerNumber}
        </text>
      </g>
    </svg>
  );
};

interface RaceTrackStageProps {
  event: MinigameEvent;
  currentUid?: string;
  isAdmin?: boolean;
  onAdminLaunchHeat?: (heatId: string) => Promise<void>;
  onAdminCompleteHeat?: (heatId: string) => Promise<void>;
  busy?: boolean;
}

export const RaceTrackStage: React.FC<RaceTrackStageProps> = ({
  event,
  currentUid,
  isAdmin = false,
  onAdminLaunchHeat,
  onAdminCompleteHeat,
  busy = false,
}) => {
  const isBee = event.gameType === "bee_race";
  const isDuck = event.gameType === "duck_race";
  const [selectedHeatId, setSelectedHeatId] = useState<string | null>(event.activeHeatId);
  const [muted, setMuted] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const fanfarePlayedForRef = useRef<string | null>(null);
  const victoryPlayedForRef = useRef<string | null>(null);
  const autoCompletedRef = useRef<string | null>(null);

  useEffect(() => {
    if (event.activeHeatId) {
      setSelectedHeatId(event.activeHeatId);
    }
  }, [event.activeHeatId]);

  const activeHeat: MinigameRaceHeat | null = useMemo(() => {
    if (!event.heats || event.heats.length === 0) return null;
    return (
      event.heats.find((h) => h.heatId === selectedHeatId) ||
      event.heats.find((h) => h.heatId === event.activeHeatId) ||
      event.heats[0]
    );
  }, [event.heats, selectedHeatId, event.activeHeatId]);

  // 60fps animation loop whenever a heat is actively racing or counting down
  useEffect(() => {
    if (!activeHeat || activeHeat.status !== "racing" || !activeHeat.startAtMs) return;

    let rafId = 0;
    let lastTickSound = 0;

    const tick = () => {
      const t = Date.now();
      setNowMs(t);

      // Play start fanfare right as countdown finishes
      const startedKey = `${activeHeat.heatId}_${activeHeat.startAtMs}`;
      if (t >= activeHeat.startAtMs! && fanfarePlayedForRef.current !== startedKey) {
        fanfarePlayedForRef.current = startedKey;
        playRaceStartFanfare(muted);
      }

      // Rhythmic hoof/wing/water ticks during race
      if (
        t >= activeHeat.startAtMs! &&
        t < activeHeat.startAtMs! + activeHeat.durationMs &&
        t - lastTickSound > (isBee || isDuck ? 250 : 210)
      ) {
        lastTickSound = t;
        playGallopTick(muted, isBee || isDuck);
      }

      // Finish chime & confetti when last racer crosses line
      if (
        t >= activeHeat.startAtMs! + activeHeat.durationMs + 300 &&
        victoryPlayedForRef.current !== startedKey
      ) {
        victoryPlayedForRef.current = startedKey;
        playVictoryChime(muted);
        confetti({
          particleCount: activeHeat.isFinal ? 130 : 65,
          spread: 80,
          origin: { y: 0.62 },
        });
        // Auto-finalize heat on Admin screen once animation completes!
        if (isAdmin && onAdminCompleteHeat && autoCompletedRef.current !== startedKey) {
          autoCompletedRef.current = startedKey;
          void onAdminCompleteHeat(activeHeat.heatId);
        }
      }

      if (t < activeHeat.startAtMs! + activeHeat.durationMs + 1200) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [activeHeat?.heatId, activeHeat?.status, activeHeat?.startAtMs, muted, isBee, isDuck, isAdmin]);

  const countdownSec = useMemo(() => {
    if (!activeHeat || activeHeat.status !== "racing" || !activeHeat.startAtMs) return 0;
    const diff = activeHeat.startAtMs - nowMs;
    if (diff <= 0) return 0;
    return Math.ceil(diff / 1000);
  }, [activeHeat, nowMs]);

  const isActivelyRunning = Boolean(
    activeHeat &&
      activeHeat.status === "racing" &&
      activeHeat.startAtMs &&
      nowMs >= activeHeat.startAtMs &&
      nowMs < activeHeat.startAtMs + activeHeat.durationMs
  );

  const laneStates = useMemo(() => {
    if (!activeHeat) return [];
    return activeHeat.laneUids.map((uid, laneIdx) => {
      const participant: MinigameParticipant | undefined = event.participants[uid];
      const state: EvaluatedRacerState = evaluateRacerAtTime(activeHeat, uid, nowMs);
      return {
        uid,
        laneIdx,
        participant,
        state,
        color: participant?.racerColor || RACER_PALETTE[laneIdx % RACER_PALETTE.length],
        number: participant?.racerNumber || laneIdx + 1,
      };
    });
  }, [activeHeat, event.participants, nowMs]);

  // Live sorted leaderboard by progress (or official finishOrder once finished)
  const liveLeaderboard = useMemo(() => {
    if (!activeHeat) return [];
    return [...laneStates].sort((a, b) => {
      if (a.state.isFinished && b.state.isFinished) {
        return (
          activeHeat.finishOrder.indexOf(a.uid) - activeHeat.finishOrder.indexOf(b.uid)
        );
      }
      if (a.state.isFinished) return -1;
      if (b.state.isFinished) return 1;
      return b.state.progress - a.state.progress;
    });
  }, [laneStates, activeHeat]);

  if (!activeHeat) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
        Đang chờ Admin khóa danh sách và chia bảng vòng đua...
      </div>
    );
  }

  const raceFinishedVisually =
    activeHeat.status === "completed" ||
    (activeHeat.status === "racing" &&
      Boolean(activeHeat.startAtMs && nowMs >= activeHeat.startAtMs + activeHeat.durationMs));

  const leader = liveLeaderboard[0];
  const second = liveLeaderboard[1];
  const leaderMeters = leader ? Math.round(leader.state.progress * 1000) : 0;
  const parallaxShiftPx = leader ? Math.round(leader.state.progress * 320) : 0;
  const photoFlashActive =
    activeHeat.status === "racing" &&
    Boolean(
      leader &&
        activeHeat.startAtMs &&
        nowMs >= activeHeat.startAtMs + (activeHeat.finishTimesMs[leader.uid] || activeHeat.durationMs) &&
        nowMs <=
          activeHeat.startAtMs + (activeHeat.finishTimesMs[leader.uid] || activeHeat.durationMs) + 450
    );

  // Dynamic Vietnamese Live Sports Commentary
  const liveCommentary = useMemo(() => {
    if (countdownSec > 0) return `🎺 Các chiến mã vào vạch xuất phát — đếm ngược ${countdownSec}...`;
    if (activeHeat.status === "pending") {
      return `📣 Sẵn sàng cho ${activeHeat.roundName} (${activeHeat.laneUids.length} thí sinh)!`;
    }
    if (raceFinishedVisually && leader) {
      return `🏆 VỀ ĐÍCH! #${leader.number} ${leader.participant?.displayName || ""} cán đích đầu tiên cực kỳ ấn tượng!`;
    }
    if (!leader) return "Đang tường thuật trực tiếp...";
    const gapM = second ? Math.round((leader.state.progress - second.state.progress) * 1000) : 99;
    if (leaderMeters >= 800) {
      return gapM <= 25 && second
        ? `🔥 NƯỚC RÚT NGẠT THỞ! #${leader.number} và #${second.number} song mã lao về đích ở ${leaderMeters}m!`
        : `⚡ #${leader.number} ${leader.participant?.displayName || ""} đang tăng tốc bứt phá về đích (${leaderMeters}m)!`;
    }
    if (leader.state.isSprinting) {
      return `💨 BỨT TỐC! #${leader.number} ${leader.participant?.displayName || ""} tung cú nước rút ngoạn mục ở mốc ${leaderMeters}m!`;
    }
    if (gapM <= 18 && second) {
      return `⚔️ Bám đuổi cực sát! #${leader.number} và #${second.number} chỉ hơn nhau ${gapM}m tại mốc ${leaderMeters}m!`;
    }
    return `🎙️ #${leader.number} ${leader.participant?.displayName || ""} đang dẫn đầu đoàn đua tại mốc ${leaderMeters}m!`;
  }, [countdownSec, activeHeat.status, activeHeat.roundName, activeHeat.laneUids.length, raceFinishedVisually, leader, second, leaderMeters]);

  return (
    <div className="space-y-4">
      {/* Tournament Bracket Round Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {event.heats.map((h) => {
            const isSel = h.heatId === activeHeat.heatId;
            return (
              <button
                key={h.heatId}
                type="button"
                onClick={() => setSelectedHeatId(h.heatId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSel
                    ? "bg-blue-600 text-white shadow-xs"
                    : h.status === "completed"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {h.isFinal && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                <span>{h.roundName}</span>
                {h.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                {h.status === "racing" && (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
            title={muted ? "Bật âm thanh trường đua" : "Tắt âm thanh"}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {isAdmin && activeHeat.status === "pending" && onAdminLaunchHeat && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAdminLaunchHeat(activeHeat.heatId)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md disabled:opacity-60 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Xuất phát {activeHeat.roundName}!</span>
            </button>
          )}

          {isAdmin && activeHeat.status === "racing" && raceFinishedVisually && onAdminCompleteHeat && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAdminCompleteHeat(activeHeat.heatId)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md disabled:opacity-60 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Chốt kết quả & Qua lượt tiếp</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Top 3 Leaderboard Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {liveLeaderboard.slice(0, 3).map((item, idx) => (
          <div
            key={item.uid}
            className={`px-3.5 py-2.5 rounded-2xl border flex items-center justify-between gap-2 transition-all ${
              idx === 0
                ? "bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700"
                : idx === 1
                ? "bg-slate-50 dark:bg-slate-800/70 border-slate-300 dark:border-slate-700"
                : "bg-orange-50/70 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg shrink-0">
                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
              </span>
              <span
                className="w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0"
                style={{ backgroundColor: item.color }}
              >
                {item.number}
              </span>
              <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                {item.participant?.displayName || item.uid}
                {item.uid === currentUid && " (Bạn)"}
              </span>
            </div>
            <div className="text-xs font-mono font-black text-slate-600 dark:text-slate-300 shrink-0 flex items-center gap-1">
              {item.state.isSprinting && <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />}
              <span>{Math.round(item.state.progress * 1000)}m</span>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN STADIUM / RACE TRACK */}
      <div
        className={`relative rounded-3xl overflow-hidden border-2 shadow-xl ${
          isDuck
            ? "border-cyan-400 bg-gradient-to-b from-sky-400 via-cyan-600 to-sky-900"
            : isBee
            ? "border-amber-400 bg-gradient-to-b from-sky-300 via-amber-100 to-lime-200 dark:from-slate-900 dark:via-amber-950/40 dark:to-slate-950"
            : "border-emerald-700 bg-gradient-to-b from-sky-500 via-emerald-700 to-emerald-900"
        }`}
      >
        {/* Top Stadium Banner & Distance Markers */}
        <div
          className={`px-4 py-2.5 flex items-center justify-between text-xs font-black ${
            isDuck
              ? "bg-sky-950/90 text-cyan-100"
              : isBee
              ? "bg-amber-500 text-slate-950"
              : "bg-emerald-950/85 text-emerald-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>
              {isDuck
                ? "🦆 THÁC ĐUA VỊT SIÊU TỐC"
                : isBee
                ? "🐝 TRƯỜNG ĐUA ONG MẬT"
                : "🐎 TRƯỜNG ĐUA NGỰA PHÚC LỢI"}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px]">
              {activeHeat.roundName}
            </span>
          </div>
          <div className="text-[11px] opacity-90">
            {activeHeat.isFinal
              ? "🏆 Tranh Giải Nhất - Nhì - Ba"
              : `⚡ Top ${activeHeat.advanceCount} đi tiếp vòng sau`}
          </div>
        </div>

        {/* Live Commentary & Animated Scenic Grandstand Parallax Strip */}
        <div
          className={`relative h-14 overflow-hidden border-b border-white/20 ${
            isDuck
              ? "bg-gradient-to-b from-sky-400 via-cyan-300 to-sky-500"
              : isBee
              ? "bg-gradient-to-b from-sky-400 via-sky-200 to-amber-100"
              : "bg-gradient-to-b from-sky-500 via-sky-300 to-emerald-400"
          }`}
        >
          {/* Drifting clouds */}
          <div
            className="absolute inset-0 flex items-start justify-around pt-1.5 opacity-80 pointer-events-none transition-transform duration-75"
            style={{ transform: `translateX(-${parallaxShiftPx % 160}px)` }}
          >
            {[0, 1, 2, 3, 4, 5].map((c) => (
              <div key={c} className="w-16 h-4 rounded-full bg-white/80 blur-[1px] shrink-0 mx-8" />
            ))}
          </div>
          {/* Stadium crowd / flower meadow / tropical waterfall silhouette */}
          <div
            className="absolute bottom-0 left-0 right-[-240px] h-5 flex items-end gap-2 opacity-75 pointer-events-none"
            style={{ transform: `translateX(-${(parallaxShiftPx * 1.4) % 120}px)` }}
          >
            {Array.from({ length: 48 }).map((_, i) => (
              <span
                key={i}
                className="text-xs leading-none select-none"
                style={{
                  transform: isActivelyRunning
                    ? `translateY(${Math.sin((nowMs / 150) + i) * 2.5}px)`
                    : undefined,
                }}
              >
                {isDuck
                  ? i % 3 === 0
                    ? "🌊"
                    : i % 3 === 1
                    ? "🫧"
                    : "🌴"
                  : isBee
                  ? i % 3 === 0
                    ? "🌻"
                    : i % 3 === 1
                    ? "🌼"
                    : "🌸"
                  : i % 4 === 0
                  ? "🚩"
                  : "🙌"}
              </span>
            ))}
          </div>
          {/* Live Sports Commentary Pill */}
          <div className="relative z-10 h-full flex items-center justify-center px-3">
            <div className="px-3.5 py-1 rounded-full bg-slate-950/75 backdrop-blur-sm text-amber-200 text-[11px] sm:text-xs font-extrabold shadow-md border border-white/15 truncate max-w-full">
              {liveCommentary}
            </div>
          </div>
        </div>

        {/* Distance Scale Ruler */}
        <div className="relative h-6 bg-black/25 text-[10px] font-mono font-bold text-white/90 flex items-center justify-between px-4 sm:px-6 border-b border-white/20">
          <span>0m XUẤT PHÁT</span>
          <span className="hidden sm:inline">250m</span>
          <span>500m</span>
          <span className="hidden sm:inline">750m</span>
          <span className="flex items-center gap-1 text-amber-300 font-black">
            <Flag className="w-3 h-3" /> 1000m ĐÍCH
          </span>
        </div>

        {/* Race Lanes */}
        <div className="relative divide-y divide-white/20">
          {/* Photo-finish camera flash strobe! */}
          {photoFlashActive && (
            <div className="pointer-events-none absolute inset-0 z-50 bg-white/70 animate-ping" />
          )}
          {/* Checkered Finish Line Overlay on Right */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 right-[6%] sm:right-[7%] w-3.5 z-10 opacity-90"
            style={{
              backgroundImage:
                "repeating-conic-gradient(#0f172a 0% 25%, #ffffff 0% 50%)",
              backgroundSize: "10px 10px",
            }}
          />

          {/* Vertical Distance Guide Lines */}
          {[25, 50, 75].map((pct) => (
            <div
              key={pct}
              className="pointer-events-none absolute top-0 bottom-0 border-l border-dashed border-white/20"
              style={{ left: `${pct}%` }}
            />
          ))}

          {laneStates.map((item, idx) => {
            const isMine = item.uid === currentUid;
            const rankNum =
              raceFinishedVisually && activeHeat.finishOrder.length > 0
                ? activeHeat.finishOrder.indexOf(item.uid) + 1
                : null;
            const hasCollectivePrize = (event.prizes || []).some((p) => p.rank === 0);
            const rankedPrizeSet = new Set(
              (event.prizes || []).filter((p) => p.rank >= 1).map((p) => p.rank)
            );
            const qualified =
              rankNum !== null &&
              (activeHeat.isFinal
                ? hasCollectivePrize || rankedPrizeSet.has(rankNum)
                : rankNum <= activeHeat.advanceCount);

            // Map progress 0..1 into 2%..84% horizontal CSS left so sprite crosses finish line cleanly
            const leftPct = 2 + item.state.progress * 82;

            return (
              <div
                key={item.uid}
                className={`relative h-[66px] sm:h-[74px] flex items-center transition-colors ${
                  isDuck
                    ? idx % 2 === 0
                      ? "bg-sky-500/75"
                      : "bg-cyan-600/80"
                    : isBee
                    ? idx % 2 === 0
                      ? "bg-amber-50/70 dark:bg-amber-950/25"
                      : "bg-lime-50/70 dark:bg-emerald-950/25"
                    : idx % 2 === 0
                    ? "bg-emerald-700/80"
                    : "bg-emerald-800/85"
                } ${isMine ? "ring-2 ring-inset ring-amber-300" : ""}`}
              >
                {/* Lane Number & Name Tag on Left */}
                <div className="z-10 ml-2 px-2 py-1 rounded-lg bg-slate-950/65 backdrop-blur-xs text-white text-[11px] font-bold flex items-center gap-1.5 max-w-[130px] sm:max-w-[165px]">
                  <span
                    className="w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center shrink-0"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.number}
                  </span>
                  <span className="truncate">
                    {item.participant?.displayName || item.uid}
                  </span>
                  {isMine && <span className="text-amber-300 text-[9px] font-black">★</span>}
                </div>

                {/* Animated Racer Sprite */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 z-20 will-change-transform"
                  style={{ left: `${leftPct}%` }}
                >
                  {isDuck ? (
                    <DuckRacerSvg
                      jerseyColor={item.color}
                      racerNumber={item.number}
                      stridePhase={item.state.stridePhase}
                      isMoving={isActivelyRunning && !item.state.isFinished}
                      isSprinting={item.state.isSprinting}
                    />
                  ) : isBee ? (
                    <BeeRacerSvg
                      jerseyColor={item.color}
                      racerNumber={item.number}
                      stridePhase={item.state.stridePhase}
                      isMoving={isActivelyRunning && !item.state.isFinished}
                      isSprinting={item.state.isSprinting}
                    />
                  ) : (
                    <HorseRacerSvg
                      laneIndex={idx}
                      jerseyColor={item.color}
                      racerNumber={item.number}
                      stridePhase={item.state.stridePhase}
                      isMoving={isActivelyRunning && !item.state.isFinished}
                      isSprinting={item.state.isSprinting}
                    />
                  )}
                </div>

                {/* Finish Rank Pill on Right */}
                {rankNum !== null && (
                  <div className="ml-auto mr-2 z-30">
                    <span
                      className={`px-2 py-1 rounded-lg text-[11px] font-black shadow-sm ${
                        rankNum === 1
                          ? "bg-amber-400 text-slate-950"
                          : rankNum === 2
                          ? "bg-slate-200 text-slate-900"
                          : rankNum === 3
                          ? "bg-orange-400 text-white"
                          : qualified
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-900/70 text-slate-200"
                      }`}
                    >
                      #{rankNum}
                      {activeHeat.finishTimesMs[item.uid]
                        ? ` • ${(activeHeat.finishTimesMs[item.uid] / 1000).toFixed(2)}s`
                        : ""}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Synchronized 3-2-1 Countdown Overlay */}
          {countdownSec > 0 && (
            <div className="absolute inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px] flex flex-col items-center justify-center text-white animate-in fade-in">
              <div className="text-xs font-black uppercase tracking-widest text-amber-300 mb-1">
                Chuẩn bị xuất phát!
              </div>
              <div className="text-7xl sm:text-8xl font-black text-white drop-shadow-[0_6px_20px_rgba(251,191,36,0.8)] animate-bounce">
                {countdownSec}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
