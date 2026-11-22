import type { MinigameRaceHeat } from "../../types/minigame";

export const RACER_PALETTE = [
  "#ef4444", // Red
  "#2563eb", // Blue
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#84cc16", // Lime
  "#6366f1", // Indigo
  "#14b8a6", // Teal
  "#e11d48", // Rose
];

export const RACE_CHECKPOINTS = 12;

/** Deterministic Mulberry32 PRNG so every client renders the exact same race */
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  const rng = createSeededRng(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates realistic multi-phase race curves and official finish times/order.
 * Every racer has 12 segment weights summing to 1.0, producing authentic lead changes,
 * mid-race tactical pacing, and thrilling final-stretch photo finishes.
 */
export function simulateRaceHeat(
  laneUids: string[],
  seed: number,
  durationMs: number = 14000
): {
  finishOrder: string[];
  finishTimesMs: Record<string, number>;
  speedProfiles: Record<string, number[]>;
} {
  const rng = createSeededRng(seed ^ 0x9e3779b9);
  const n = laneUids.length;
  if (n === 0) {
    return { finishOrder: [], finishTimesMs: {}, speedProfiles: {} };
  }

  // Determine exciting tight finish times around durationMs (winner ~88%-92% of durationMs, last ~98%-100%)
  const shuffledOrder = seededShuffle(laneUids, seed + 17);
  const winnerTime = Math.round(durationMs * (0.86 + rng() * 0.04));
  const finishTimesMs: Record<string, number> = {};
  let prevTime = winnerTime;

  shuffledOrder.forEach((uid, idx) => {
    if (idx === 0) {
      finishTimesMs[uid] = winnerTime;
    } else {
      // Tight photo-finish gaps for top 3 (110ms - 340ms), slightly wider behind
      const gap =
        idx <= 2
          ? Math.round(110 + rng() * 230)
          : Math.round(150 + rng() * 340);
      prevTime = Math.min(durationMs, prevTime + gap);
      finishTimesMs[uid] = prevTime;
    }
  });

  // Ensure strictly sorted finish order by exact finishTimesMs
  const finishOrder = [...laneUids].sort((a, b) => finishTimesMs[a] - finishTimesMs[b]);

  // Build dramatic 12-segment speed profiles per racer (start, cruise, late surge or fade)
  const speedProfiles: Record<string, number[]> = {};
  for (const uid of laneUids) {
    const rankIdx = finishOrder.indexOf(uid);
    const archetype = rng(); // 0..0.33 front-runner, 0.33..0.66 stalker, 0.66..1 closer/sprinter
    const weights: number[] = [];

    for (let seg = 0; seg < RACE_CHECKPOINTS; seg++) {
      const frac = seg / (RACE_CHECKPOINTS - 1);
      let base = 1.0;

      if (archetype < 0.33) {
        // Fast starter, holds on
        base = 1.22 - frac * 0.34;
      } else if (archetype < 0.66) {
        // Mid-race surge
        base = 0.88 + Math.sin(frac * Math.PI) * 0.36;
      } else {
        // Dramatic late closer / final kick!
        base = 0.78 + Math.pow(frac, 1.8) * 0.58;
      }

      // Winner & podium contenders get extra dramatic late-stretch push
      if (rankIdx <= 2 && seg >= 8) {
        base += 0.14 + rng() * 0.12;
      }

      // Organic turbulence each segment
      const noise = 0.76 + rng() * 0.48;
      weights.push(Math.max(0.35, base * noise));
    }

    const sum = weights.reduce((a, b) => a + b, 0);
    // Store cumulative progress checkpoints [p1, p2, ..., p12=1.0] rounded to 4 decimals
    let acc = 0;
    const cumulative: number[] = [];
    for (let i = 0; i < RACE_CHECKPOINTS; i++) {
      acc += weights[i] / sum;
      cumulative.push(i === RACE_CHECKPOINTS - 1 ? 1 : Number(acc.toFixed(4)));
    }
    speedProfiles[uid] = cumulative;
  }

  return { finishOrder, finishTimesMs, speedProfiles };
}

export interface EvaluatedRacerState {
  uid: string;
  progress: number; // 0..1 (1 = crossed finish line)
  speed: number; // relative speed factor ~0.5..1.8
  isSprinting: boolean;
  isFinished: boolean;
  stridePhase: number; // continuous phase in radians for smooth leg/wing animation
}

/**
 * Evaluates a racer's exact interpolated track position & animation phase at timestamp `nowMs`.
 * Identical across Admin & all Student screens!
 */
export function evaluateRacerAtTime(
  heat: MinigameRaceHeat,
  uid: string,
  nowMs: number
): EvaluatedRacerState {
  if (!heat.startAtMs || heat.status === "pending") {
    return {
      uid,
      progress: 0,
      speed: 0,
      isSprinting: false,
      isFinished: false,
      stridePhase: 0,
    };
  }

  const elapsed = Math.max(0, nowMs - heat.startAtMs);
  const finishTime = heat.finishTimesMs[uid] || heat.durationMs;

  if (heat.status === "completed" || elapsed >= finishTime) {
    return {
      uid,
      progress: 1,
      speed: 0.35,
      isSprinting: false,
      isFinished: true,
      stridePhase: (finishTime / 1000) * 14,
    };
  }

  const profile = heat.speedProfiles[uid];
  const u = Math.min(1, Math.max(0, elapsed / Math.max(1, finishTime)));

  if (!profile || profile.length === 0) {
    return {
      uid,
      progress: u,
      speed: 1,
      isSprinting: u > 0.75,
      isFinished: false,
      stridePhase: (elapsed / 1000) * 15,
    };
  }

  const segFloat = u * profile.length;
  const segIdx = Math.min(profile.length - 1, Math.floor(segFloat));
  const localT = segFloat - segIdx;
  // Smoothstep interpolation between checkpoints for silky 60fps acceleration
  const smoothT = localT * localT * (3 - 2 * localT);
  const prevP = segIdx === 0 ? 0 : profile[segIdx - 1];
  const nextP = profile[segIdx];
  const progress = Math.min(1, Math.max(0, prevP + (nextP - prevP) * smoothT));

  const segDelta = (nextP - prevP) * profile.length; // ~1.0 is average speed
  const speed = Math.max(0.45, Math.min(1.9, segDelta));
  const isSprinting = progress > 0.68 && speed >= 1.08;
  // Stride phase advances proportionally to elapsed time and progress
  const stridePhase = (elapsed / 1000) * 12 + progress * 42;

  return {
    uid,
    progress,
    speed,
    isSprinting,
    isFinished: false,
    stridePhase,
  };
}

function getRoundLabel(totalRacersInRound: number, heatCount: number, heatIndex: number): string {
  if (heatCount === 1) return "Chung Kết";
  if (heatCount === 2) return `Bán Kết — Lượt ${heatIndex + 1}`;
  if (heatCount === 4 && totalRacersInRound >= 16) return `Vòng Loại — Bảng ${heatIndex + 1}`;
  return `Vòng Loại — Lượt ${heatIndex + 1}`;
}

/**
 * Builds Round 0 tournament heats from registered participants and `racersPerHeat` (4 or 8).
 */
export function buildInitialRaceHeats(
  participantUids: string[],
  racersPerHeat: number,
  seed: number,
  durationMs: number = 14000
): MinigameRaceHeat[] {
  const unique = Array.from(new Set(participantUids));
  if (unique.length < 2) {
    throw new Error("Cần ít nhất 2 người tham gia để bắt đầu vòng đua.");
  }

  const perHeat = Math.max(2, Math.min(8, Math.trunc(racersPerHeat) || 4));
  const shuffled = seededShuffle(unique, seed);

  // If everyone fits in 1 single heat -> direct Final!
  if (shuffled.length <= perHeat) {
    return [
      {
        heatId: "r0_h0",
        roundIndex: 0,
        roundName: "Chung Kết",
        heatIndex: 0,
        isFinal: true,
        status: "pending",
        laneUids: shuffled,
        advanceCount: Math.min(3, shuffled.length),
        seed: seed + 101,
        startAtMs: null,
        durationMs,
        finishOrder: [],
        finishTimesMs: {},
        speedProfiles: {},
      },
    ];
  }

  const heatCount = Math.ceil(shuffled.length / perHeat);
  // Distribute participants evenly across heats (e.g. 6 players -> 3 & 3 instead of 4 & 2)
  const heats: MinigameRaceHeat[] = [];
  const baseSize = Math.floor(shuffled.length / heatCount);
  const remainder = shuffled.length % heatCount;
  // Shrink the field by ~half each round (top 2 per heat for 4/heat, or fill next round cleanly for 8/heat)
  const advancePerHeat = Math.max(
    1,
    Math.min(
      Math.floor(baseSize / 2),
      perHeat >= 8 && heatCount === 2 ? 4 : 2
    )
  );

  let cursor = 0;
  for (let h = 0; h < heatCount; h++) {
    const size = baseSize + (h < remainder ? 1 : 0);
    const laneUids = shuffled.slice(cursor, cursor + size);
    cursor += size;
    heats.push({
      heatId: `r0_h${h}`,
      roundIndex: 0,
      roundName: getRoundLabel(shuffled.length, heatCount, h),
      heatIndex: h,
      isFinal: false,
      status: "pending",
      laneUids,
      advanceCount: Math.min(advancePerHeat, Math.max(1, laneUids.length - 1)),
      seed: seed + (h + 1) * 131,
      startAtMs: null,
      durationMs,
      finishOrder: [],
      finishTimesMs: {},
      speedProfiles: {},
    });
  }

  return heats;
}

/**
 * Checks if the current round is completely finished and generates the next tournament round
 * (or returns final podium [1st, 2nd, 3rd] if the Final heat finished!).
 */
export function advanceRaceTournamentIfReady(
  heats: MinigameRaceHeat[],
  racersPerHeat: number,
  seed: number,
  durationMs: number = 14000
): {
  heats: MinigameRaceHeat[];
  tournamentFinished: boolean;
  podiumUids: string[];
} {
  if (heats.length === 0) {
    return { heats, tournamentFinished: false, podiumUids: [] };
  }

  const maxRound = Math.max(...heats.map((h) => h.roundIndex));
  const currentRoundHeats = heats
    .filter((h) => h.roundIndex === maxRound)
    .sort((a, b) => a.heatIndex - b.heatIndex);

  const allCompleted = currentRoundHeats.every((h) => h.status === "completed");
  if (!allCompleted) {
    return { heats, tournamentFinished: false, podiumUids: [] };
  }

  // If the current round was the Final -> tournament complete!
  if (currentRoundHeats.length === 1 && currentRoundHeats[0].isFinal) {
    const podiumUids = currentRoundHeats[0].finishOrder.slice(0, 3);
    return { heats, tournamentFinished: true, podiumUids };
  }

  // Collect qualified racers from all heats in this round
  const qualifiers: string[] = [];
  for (const h of currentRoundHeats) {
    qualifiers.push(...h.finishOrder.slice(0, h.advanceCount));
  }

  const nextRound = maxRound + 1;
  const perHeat = Math.max(2, Math.min(8, Math.trunc(racersPerHeat) || 4));
  const nextHeats: MinigameRaceHeat[] = [];

  if (qualifiers.length <= perHeat) {
    nextHeats.push({
      heatId: `r${nextRound}_h0`,
      roundIndex: nextRound,
      roundName: "Chung Kết",
      heatIndex: 0,
      isFinal: true,
      status: "pending",
      laneUids: qualifiers,
      advanceCount: Math.min(3, qualifiers.length),
      seed: seed + nextRound * 997,
      startAtMs: null,
      durationMs,
      finishOrder: [],
      finishTimesMs: {},
      speedProfiles: {},
    });
  } else {
    const heatCount = Math.ceil(qualifiers.length / perHeat);
    const baseSize = Math.floor(qualifiers.length / heatCount);
    const remainder = qualifiers.length % heatCount;
    const advancePerHeat = Math.max(
      1,
      Math.min(
        Math.floor(baseSize / 2),
        perHeat >= 8 && heatCount === 2 ? 4 : 2
      )
    );

    let cursor = 0;
    for (let h = 0; h < heatCount; h++) {
      const size = baseSize + (h < remainder ? 1 : 0);
      const laneUids = qualifiers.slice(cursor, cursor + size);
      cursor += size;
      nextHeats.push({
        heatId: `r${nextRound}_h${h}`,
        roundIndex: nextRound,
        roundName: getRoundLabel(qualifiers.length, heatCount, h),
        heatIndex: h,
        isFinal: false,
        status: "pending",
        laneUids,
        advanceCount: Math.min(advancePerHeat, Math.max(1, laneUids.length - 1)),
        seed: seed + nextRound * 997 + (h + 1) * 53,
        startAtMs: null,
        durationMs,
        finishOrder: [],
        finishTimesMs: {},
        speedProfiles: {},
      });
    }
  }

  return {
    heats: [...heats, ...nextHeats],
    tournamentFinished: false,
    podiumUids: [],
  };
}
