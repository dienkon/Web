import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  Gamepad2,
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  Megaphone,
  Sparkles,
  Play,
  Timer,
  Flame,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import {
  MINIGAME_UNIFIED_CHAT_ROOM,
  sendMinigameChatMessage,
} from "../../services/minigameClientService";
import {
  BAU_CUA_FACES,
  LUCKY_WHEEL_SECTORS,
  PLINKO_SLOTS,
  buildPlinkoBouncePath,
} from "../../services/minigame/gameLogic";

export type SoloGameId =
  | "speed_math"
  | "memory_flip"
  | "whack_mole"
  | "treasure_mines"
  | "lucky_sandbox";

interface SoloMinigameArcadeProps {
  currentUid: string;
  currentDisplayName: string;
  currentAvatarUrl?: string;
  isAdmin?: boolean;
  onShareToast?: (msg: string) => void;
}

interface SoloHighScores {
  speedMathBest: number;
  memoryBestMoves: number;
  whackMoleBest: number;
  treasureBestScore: number;
  treasureStreak: number;
}

const STORAGE_KEY = "dktest_solo_arcade_scores_v1";

function loadHighScores(): SoloHighScores {
  if (typeof window === "undefined") {
    return {
      speedMathBest: 0,
      memoryBestMoves: 0,
      whackMoleBest: 0,
      treasureBestScore: 0,
      treasureStreak: 0,
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const p = JSON.parse(raw);
    return {
      speedMathBest: Number(p.speedMathBest) || 0,
      memoryBestMoves: Number(p.memoryBestMoves) || 0,
      whackMoleBest: Number(p.whackMoleBest) || 0,
      treasureBestScore: Number(p.treasureBestScore) || 0,
      treasureStreak: Number(p.treasureStreak) || 0,
    };
  } catch {
    return {
      speedMathBest: 0,
      memoryBestMoves: 0,
      whackMoleBest: 0,
      treasureBestScore: 0,
      treasureStreak: 0,
    };
  }
}

function saveHighScores(scores: SoloHighScores): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // Ignore storage quota
  }
}

function playArcadeTone(
  muted: boolean,
  kind: "good" | "bad" | "combo" | "win" | "tick"
): void {
  if (muted || typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    if (kind === "win") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        g.gain.setValueAtTime(0.08, now + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.26);
      });
    } else {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = kind === "bad" ? "sawtooth" : "sine";
      const freq =
        kind === "good"
          ? 740
          : kind === "combo"
          ? 960
          : kind === "bad"
          ? 180
          : 520;
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(kind === "tick" ? 0.03 : 0.07, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + (kind === "bad" ? 0.22 : 0.12));
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + (kind === "bad" ? 0.23 : 0.13));
    }
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    // Ignore audio context restriction
  }
}

const SOLO_GAMES_META: Array<{
  id: SoloGameId;
  emoji: string;
  title: string;
  badge: string;
  desc: string;
  gradient: string;
}> = [
  {
    id: "speed_math",
    emoji: "⚡",
    title: "Toán Nhẩm Thần Tốc",
    badge: "Phản xạ 30s",
    desc: "Giải nhanh phép tính +, -, × trong 30 giây tích lũy chuỗi Combo x5!",
    gradient: "from-amber-500 via-orange-500 to-rose-500",
  },
  {
    id: "memory_flip",
    emoji: "🃏",
    title: "Lật Hình Trí Nhớ 4×4",
    badge: "Rèn não 0đ",
    desc: "Tìm đủ 8 cặp biểu tượng giống nhau với số lượt lật ít nhất!",
    gradient: "from-indigo-500 via-violet-500 to-fuchsia-500",
  },
  {
    id: "whack_mole",
    emoji: "🔨",
    title: "Đập Chuột Xả Stress",
    badge: "Giải lao 30s",
    desc: "Săn Chuột Vàng vương miện (+30đ), né Bom khói (-15đ) cực đã tay!",
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
  },
  {
    id: "treasure_mines",
    emoji: "💎",
    title: "Dò Kho Báu Né Cua",
    badge: "Chiến thuật 5×5",
    desc: "Đào Kim Cương trên đảo 25 ô dựa theo số Cua Kẹp xung quanh!",
    gradient: "from-sky-500 via-blue-600 to-indigo-700",
  },
  {
    id: "lucky_sandbox",
    emoji: "🎡",
    title: "Máy Nhân Phẩm Tự Do",
    badge: "Quay tẹt ga",
    desc: "Tự quay Vòng Quay, thả bóng Ziczac & lắc Bầu Cua giải trí không giới hạn!",
    gradient: "from-pink-500 via-rose-500 to-purple-600",
  },
];

// ---------------------------------------------------------------------------
// HELPERS FOR MATH, MEMORY & MINES
// ---------------------------------------------------------------------------

interface MathQuestion {
  prompt: string;
  answer: number;
  choices: number[];
}

function generateMathQuestion(level: number): MathQuestion {
  const ops = level >= 4 ? ["+", "-", "×"] : ["+", "-"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = 0;
  let b = 0;
  let answer = 0;
  if (op === "×") {
    a = 2 + Math.floor(Math.random() * 11);
    b = 2 + Math.floor(Math.random() * 10);
    answer = a * b;
  } else if (op === "+") {
    const span = Math.min(80, 15 + level * 7);
    a = 4 + Math.floor(Math.random() * span);
    b = 3 + Math.floor(Math.random() * span);
    answer = a + b;
  } else {
    const span = Math.min(80, 18 + level * 7);
    a = 12 + Math.floor(Math.random() * span);
    b = 2 + Math.floor(Math.random() * Math.max(3, a - 2));
    answer = a - b;
  }

  const set = new Set<number>([answer]);
  const offsets = [-10, -3, -2, -1, 1, 2, 3, 10, 4, -4, 6, -6];
  while (set.size < 4) {
    const delta = offsets[Math.floor(Math.random() * offsets.length)];
    const cand = Math.max(0, answer + delta + (set.size > 2 ? Math.floor(Math.random() * 5) : 0));
    if (cand !== answer) set.add(cand);
  }
  const choices = Array.from(set).sort(() => Math.random() - 0.5);
  return { prompt: `${a} ${op} ${b} = ?`, answer, choices };
}

const MEMORY_EMOJIS = ["🦊", "🐼", "🦄", "🐬", "🚀", "🍀", "🍓", "👑"];

interface MemoryCard {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

function createShuffledMemoryDeck(): MemoryCard[] {
  const pairs = [...MEMORY_EMOJIS, ...MEMORY_EMOJIS];
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((emoji, idx) => ({
    id: idx,
    emoji,
    flipped: false,
    matched: false,
  }));
}

interface MineCell {
  index: number;
  isTrap: boolean;
  adjacentTraps: number;
  revealed: boolean;
}

function buildTreasureIslandGrid(trapCount = 5): MineCell[] {
  const traps = new Set<number>();
  while (traps.size < trapCount) {
    traps.add(Math.floor(Math.random() * 25));
  }
  const cells: MineCell[] = Array.from({ length: 25 }, (_, idx) => ({
    index: idx,
    isTrap: traps.has(idx),
    adjacentTraps: 0,
    revealed: false,
  }));
  for (let idx = 0; idx < 25; idx++) {
    const r = Math.floor(idx / 5);
    const c = idx % 5;
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && traps.has(nr * 5 + nc)) {
          count++;
        }
      }
    }
    cells[idx].adjacentTraps = count;
  }
  return cells;
}

// ---------------------------------------------------------------------------
// MAIN SOLO ARCADE COMPONENT
// ---------------------------------------------------------------------------

export const SoloMinigameArcade: React.FC<SoloMinigameArcadeProps> = ({
  currentUid,
  currentDisplayName,
  currentAvatarUrl,
  isAdmin = false,
  onShareToast,
}) => {
  const [activeGame, setActiveGame] = useState<SoloGameId>("speed_math");
  const [muted, setMuted] = useState(false);
  const [scores, setScores] = useState<SoloHighScores>(() => loadHighScores());
  const [sharingScore, setSharingScore] = useState(false);
  const [sharedBanner, setSharedBanner] = useState<string | null>(null);

  const updateBestScores = useCallback((updater: (prev: SoloHighScores) => SoloHighScores) => {
    setScores((prev) => {
      const next = updater(prev);
      saveHighScores(next);
      return next;
    });
  }, []);

  const shareBragToChat = async (text: string) => {
    if (!currentUid || sharingScore) return;
    setSharingScore(true);
    try {
      await sendMinigameChatMessage(MINIGAME_UNIFIED_CHAT_ROOM, {
        uid: currentUid,
        displayName: currentDisplayName,
        avatarUrl: currentAvatarUrl,
        isAdmin,
        message: text,
        roomTag: "🎮 Tự chơi 0đ",
      });
      setSharedBanner("Đã khoe thành tích lên Kênh Chat Chung!");
      onShareToast?.("Đã gửi kỷ lục lên Kênh Chat Chung!");
      setTimeout(() => setSharedBanner(null), 3500);
    } finally {
      setSharingScore(false);
    }
  };

  // =========================================================================
  // GAME 1: SPEED MATH 30s
  // =========================================================================
  const [mathRunning, setMathRunning] = useState(false);
  const [mathFinished, setMathFinished] = useState(false);
  const [mathSecLeft, setMathSecLeft] = useState(30);
  const [mathScore, setMathScore] = useState(0);
  const [mathCombo, setMathCombo] = useState(0);
  const [mathCorrectCount, setMathCorrectCount] = useState(0);
  const [mathQuestion, setMathQuestion] = useState<MathQuestion>(() => generateMathQuestion(1));
  const [mathFlash, setMathFlash] = useState<"good" | "bad" | null>(null);

  const startSpeedMath = () => {
    setMathScore(0);
    setMathCombo(0);
    setMathCorrectCount(0);
    setMathSecLeft(30);
    setMathFinished(false);
    setMathQuestion(generateMathQuestion(1));
    setMathRunning(true);
    playArcadeTone(muted, "tick");
  };

  useEffect(() => {
    if (!mathRunning) return;
    const timer = setInterval(() => {
      setMathSecLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setMathRunning(false);
          setMathFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mathRunning]);

  useEffect(() => {
    if (!mathFinished) return;
    playArcadeTone(muted, "win");
    if (mathScore > 0) {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.65 } });
    }
    updateBestScores((prev) => ({
      ...prev,
      speedMathBest: Math.max(prev.speedMathBest, mathScore),
    }));
  }, [mathFinished, mathScore, muted, updateBestScores]);

  const answerMath = (choice: number) => {
    if (!mathRunning) return;
    if (choice === mathQuestion.answer) {
      const nextCombo = mathCombo + 1;
      const mult = Math.min(5, 1 + Math.floor(nextCombo / 3));
      const gained = 10 * mult;
      const nextScore = mathScore + gained;
      const nextCount = mathCorrectCount + 1;
      setMathCombo(nextCombo);
      setMathScore(nextScore);
      setMathCorrectCount(nextCount);
      setMathFlash("good");
      playArcadeTone(muted, mult >= 2 ? "combo" : "good");
      setMathQuestion(generateMathQuestion(1 + Math.floor(nextCount / 3)));
    } else {
      setMathCombo(0);
      setMathScore((s) => Math.max(0, s - 5));
      setMathFlash("bad");
      playArcadeTone(muted, "bad");
      setMathQuestion(generateMathQuestion(1 + Math.floor(mathCorrectCount / 3)));
    }
    setTimeout(() => setMathFlash(null), 220);
  };

  // =========================================================================
  // GAME 2: MEMORY FLIP 4x4
  // =========================================================================
  const [memoryDeck, setMemoryDeck] = useState<MemoryCard[]>(() => createShuffledMemoryDeck());
  const [memoryFlippedIds, setMemoryFlippedIds] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memorySeconds, setMemorySeconds] = useState(0);
  const [memoryActive, setMemoryActive] = useState(false);
  const [memoryWon, setMemoryWon] = useState(false);
  const memoryLockRef = useRef(false);

  const resetMemoryGame = () => {
    memoryLockRef.current = false;
    setMemoryDeck(createShuffledMemoryDeck());
    setMemoryFlippedIds([]);
    setMemoryMoves(0);
    setMemorySeconds(0);
    setMemoryActive(false);
    setMemoryWon(false);
  };

  useEffect(() => {
    if (!memoryActive || memoryWon) return;
    const t = setInterval(() => setMemorySeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [memoryActive, memoryWon]);

  const handleFlipMemoryCard = (cardId: number) => {
    if (memoryLockRef.current || memoryWon) return;
    const target = memoryDeck[cardId];
    if (!target || target.flipped || target.matched) return;

    if (!memoryActive) setMemoryActive(true);
    playArcadeTone(muted, "tick");

    const nextDeck = memoryDeck.map((c) => (c.id === cardId ? { ...c, flipped: true } : c));
    const nextFlipped = [...memoryFlippedIds, cardId];
    setMemoryDeck(nextDeck);
    setMemoryFlippedIds(nextFlipped);

    if (nextFlipped.length === 2) {
      const nextMoveCount = memoryMoves + 1;
      setMemoryMoves(nextMoveCount);
      const [firstId, secondId] = nextFlipped;
      if (nextDeck[firstId].emoji === nextDeck[secondId].emoji) {
        const matchedDeck = nextDeck.map((c) =>
          c.id === firstId || c.id === secondId ? { ...c, matched: true } : c
        );
        setMemoryDeck(matchedDeck);
        setMemoryFlippedIds([]);
        playArcadeTone(muted, "combo");

        if (matchedDeck.every((c) => c.matched)) {
          setMemoryWon(true);
          setMemoryActive(false);
          playArcadeTone(muted, "win");
          confetti({ particleCount: 90, spread: 80, origin: { y: 0.62 } });
          updateBestScores((prev) => ({
            ...prev,
            memoryBestMoves:
              prev.memoryBestMoves === 0
                ? nextMoveCount
                : Math.min(prev.memoryBestMoves, nextMoveCount),
          }));
        }
      } else {
        memoryLockRef.current = true;
        setTimeout(() => {
          setMemoryDeck((curr) =>
            curr.map((c) =>
              c.id === firstId || c.id === secondId ? { ...c, flipped: false } : c
            )
          );
          setMemoryFlippedIds([]);
          memoryLockRef.current = false;
        }, 620);
      }
    }
  };

  // =========================================================================
  // GAME 3: WHACK-A-MOLE 30s
  // =========================================================================
  const [moleRunning, setMoleRunning] = useState(false);
  const [moleFinished, setMoleFinished] = useState(false);
  const [moleSecLeft, setMoleSecLeft] = useState(30);
  const [moleScore, setMoleScore] = useState(0);
  const [moleCombo, setMoleCombo] = useState(0);
  const [moleHoles, setMoleHoles] = useState<Array<"empty" | "mole" | "gold" | "bomb">>(() =>
    Array(9).fill("empty")
  );

  const startWhackMole = () => {
    setMoleScore(0);
    setMoleCombo(0);
    setMoleSecLeft(30);
    setMoleFinished(false);
    setMoleHoles(Array(9).fill("empty"));
    setMoleRunning(true);
    playArcadeTone(muted, "tick");
  };

  useEffect(() => {
    if (!moleRunning) return;
    const secTimer = setInterval(() => {
      setMoleSecLeft((prev) => {
        if (prev <= 1) {
          clearInterval(secTimer);
          setMoleRunning(false);
          setMoleFinished(true);
          setMoleHoles(Array(9).fill("empty"));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const spawnTimer = setInterval(() => {
      const next: Array<"empty" | "mole" | "gold" | "bomb"> = Array(9).fill("empty");
      const count = Math.random() > 0.45 ? 2 : 1;
      const picked = new Set<number>();
      while (picked.size < count) {
        picked.add(Math.floor(Math.random() * 9));
      }
      for (const idx of picked) {
        const roll = Math.random();
        next[idx] = roll < 0.2 ? "gold" : roll < 0.4 ? "bomb" : "mole";
      }
      setMoleHoles(next);
    }, 680);

    return () => {
      clearInterval(secTimer);
      clearInterval(spawnTimer);
    };
  }, [moleRunning]);

  useEffect(() => {
    if (!moleFinished) return;
    playArcadeTone(muted, "win");
    if (moleScore > 0) {
      confetti({ particleCount: 75, spread: 75, origin: { y: 0.65 } });
    }
    updateBestScores((prev) => ({
      ...prev,
      whackMoleBest: Math.max(prev.whackMoleBest, moleScore),
    }));
  }, [moleFinished, moleScore, muted, updateBestScores]);

  const whackHole = (idx: number) => {
    if (!moleRunning) return;
    const item = moleHoles[idx];
    if (item === "empty") return;
    setMoleHoles((prev) => prev.map((v, i) => (i === idx ? "empty" : v)));
    if (item === "bomb") {
      setMoleCombo(0);
      setMoleScore((s) => Math.max(0, s - 15));
      playArcadeTone(muted, "bad");
    } else {
      const pts = item === "gold" ? 30 : 10;
      const nextCombo = moleCombo + 1;
      const bonus = nextCombo >= 4 ? 5 : 0;
      setMoleCombo(nextCombo);
      setMoleScore((s) => s + pts + bonus);
      playArcadeTone(muted, item === "gold" ? "combo" : "good");
    }
  };

  // =========================================================================
  // GAME 4: TREASURE MINES 5x5 (20 Gems + 5 Crab Traps)
  // =========================================================================
  const [mineCells, setMineCells] = useState<MineCell[]>(() => buildTreasureIslandGrid(5));
  const [mineStatus, setMineStatus] = useState<"playing" | "busted" | "cashed">("playing");
  const [mineFoundGems, setMineFoundGems] = useState(0);

  const currentMinePoints = useMemo(() => {
    if (mineFoundGems === 0) return 0;
    return Math.round(mineFoundGems * 15 + mineFoundGems * mineFoundGems * 3);
  }, [mineFoundGems]);

  const resetTreasureMines = () => {
    setMineCells(buildTreasureIslandGrid(5));
    setMineStatus("playing");
    setMineFoundGems(0);
    playArcadeTone(muted, "tick");
  };

  const digMineCell = (idx: number) => {
    if (mineStatus !== "playing") return;
    const cell = mineCells[idx];
    if (!cell || cell.revealed) return;

    if (cell.isTrap) {
      setMineCells((prev) => prev.map((c) => ({ ...c, revealed: true })));
      setMineStatus("busted");
      playArcadeTone(muted, "bad");
      updateBestScores((prev) => ({ ...prev, treasureStreak: 0 }));
      return;
    }

    const nextFound = mineFoundGems + 1;
    const nextCells = mineCells.map((c) => (c.index === idx ? { ...c, revealed: true } : c));
    setMineCells(nextCells);
    setMineFoundGems(nextFound);
    playArcadeTone(muted, nextFound >= 5 ? "combo" : "good");

    if (nextFound >= 20) {
      // Cleared all 20 safe gems!
      const finalPts = Math.round(20 * 15 + 400 * 3);
      setMineStatus("cashed");
      playArcadeTone(muted, "win");
      confetti({ particleCount: 110, spread: 85, origin: { y: 0.6 } });
      updateBestScores((prev) => ({
        ...prev,
        treasureBestScore: Math.max(prev.treasureBestScore, finalPts),
        treasureStreak: prev.treasureStreak + 1,
      }));
    }
  };

  const cashOutTreasure = () => {
    if (mineStatus !== "playing" || mineFoundGems === 0) return;
    setMineCells((prev) => prev.map((c) => ({ ...c, revealed: true })));
    setMineStatus("cashed");
    playArcadeTone(muted, "win");
    confetti({ particleCount: 65, spread: 70, origin: { y: 0.65 } });
    updateBestScores((prev) => ({
      ...prev,
      treasureBestScore: Math.max(prev.treasureBestScore, currentMinePoints),
      treasureStreak: prev.treasureStreak + 1,
    }));
  };

  // =========================================================================
  // GAME 5: LUCKY SANDBOX (Free Wheel + Plinko + Bầu Cua Shaker)
  // =========================================================================
  const [sandboxMode, setSandboxMode] = useState<"wheel" | "plinko" | "baucua">("wheel");
  const [soloWheelDeg, setSoloWheelDeg] = useState(0);
  const [soloWheelSpinning, setSoloWheelSpinning] = useState(false);
  const [soloWheelResult, setSoloWheelResult] = useState<string | null>(null);

  const [soloPlinkoSlot, setSoloPlinkoSlot] = useState<number | null>(null);
  const [soloPlinkoDropping, setSoloPlinkoDropping] = useState(false);
  const [soloPlinkoStep, setSoloPlinkoStep] = useState(0);
  const [soloPlinkoPath, setSoloPlinkoPath] = useState<number[]>([3, 3, 3, 3, 3, 3, 3, 3]);

  const [soloBauCuaRolling, setSoloBauCuaRolling] = useState(false);
  const [soloBauCuaDice, setSoloBauCuaDice] = useState<[number, number, number]>([0, 2, 4]);

  const spinSoloWheel = () => {
    if (soloWheelSpinning) return;
    const winIdx = Math.floor(Math.random() * LUCKY_WHEEL_SECTORS.length);
    const sectorDeg = 360 / LUCKY_WHEEL_SECTORS.length;
    const targetCenter = winIdx * sectorDeg + sectorDeg / 2;
    const nextDeg =
      soloWheelDeg + 360 * 5 + ((360 - targetCenter - (soloWheelDeg % 360) + 360) % 360);
    setSoloWheelSpinning(true);
    setSoloWheelResult(null);
    setSoloWheelDeg(nextDeg);
    playArcadeTone(muted, "tick");
    setTimeout(() => {
      const s = LUCKY_WHEEL_SECTORS[winIdx];
      setSoloWheelSpinning(false);
      setSoloWheelResult(`${s.emoji} ${s.label}`);
      playArcadeTone(muted, "win");
      confetti({ particleCount: 55, spread: 65, origin: { y: 0.65 } });
    }, 3200);
  };

  const dropSoloPlinko = () => {
    if (soloPlinkoDropping) return;
    const slotIdx = Math.floor(Math.random() * PLINKO_SLOTS.length);
    const path = buildPlinkoBouncePath(slotIdx);
    setSoloPlinkoPath(path);
    setSoloPlinkoSlot(null);
    setSoloPlinkoStep(0);
    setSoloPlinkoDropping(true);
    path.forEach((_, idx) => {
      setTimeout(() => {
        setSoloPlinkoStep(idx);
        playArcadeTone(muted, idx === path.length - 1 ? "win" : "tick");
        if (idx === path.length - 1) {
          setSoloPlinkoDropping(false);
          setSoloPlinkoSlot(slotIdx);
          confetti({ particleCount: 55, spread: 65, origin: { y: 0.68 } });
        }
      }, idx * 240);
    });
  };

  const rollSoloBauCua = () => {
    if (soloBauCuaRolling) return;
    setSoloBauCuaRolling(true);
    playArcadeTone(muted, "tick");
    let ticks = 0;
    const timer = setInterval(() => {
      ticks++;
      setSoloBauCuaDice([
        Math.floor(Math.random() * 6),
        Math.floor(Math.random() * 6),
        Math.floor(Math.random() * 6),
      ]);
      if (ticks >= 10) {
        clearInterval(timer);
        setSoloBauCuaRolling(false);
        playArcadeTone(muted, "win");
      }
    }, 110);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl border-2 border-indigo-500/40 p-4 sm:p-6 text-white shadow-xl space-y-5">
      {/* Arcade Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>KHU TỰ CHƠI MIỄN PHÍ 24/7 • 0Đ • KHÔNG CẦN CHỜ ADMIN</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-amber-400" />
            <span>Góc Giải Trí Tự Chơi Miễn Phí (5 Trò Chơi Tức Thì)</span>
          </h2>
          <p className="text-xs text-indigo-200/85">
            Chơi xả stress bất cứ lúc nào sau giờ luyện đề — hoàn toàn miễn phí, không trừ ví, tự lưu kỷ lục cá nhân &amp; khoe điểm lên kênh Chat chung!
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          title={muted ? "Bật âm thanh" : "Tắt âm thanh"}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {sharedBanner && (
        <div className="px-3.5 py-2 rounded-xl bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
          <span>{sharedBanner}</span>
        </div>
      )}

      {/* 5 Solo Game Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {SOLO_GAMES_META.map((g) => {
          const isSel = activeGame === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveGame(g.id)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                isSel
                  ? `bg-gradient-to-br ${g.gradient} border-amber-300 shadow-lg scale-[1.02]`
                  : "bg-slate-950/65 border-white/10 hover:border-white/30 hover:bg-slate-900"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-2xl">{g.emoji}</span>
                <span className="px-2 py-0.5 rounded-full bg-black/30 text-[9px] font-black uppercase tracking-wider text-amber-200">
                  {g.badge}
                </span>
              </div>
              <div>
                <div className="text-xs font-black text-white leading-snug">{g.title}</div>
                <div className="text-[10px] text-white/75 line-clamp-2 mt-0.5">{g.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* STAGE 1: SPEED MATH 30s                                                */}
      {/* ===================================================================== */}
      {activeGame === "speed_math" && (
        <div className="bg-slate-950/75 rounded-2xl border border-amber-400/30 p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" /> {mathSecLeft}s
              </span>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
                Điểm: {mathScore}
              </span>
              {mathCombo >= 2 && (
                <span className="px-2.5 py-1 rounded-xl bg-rose-500/25 border border-rose-400/40 text-rose-200 text-xs font-black flex items-center gap-1 animate-bounce">
                  <Flame className="w-3.5 h-3.5 text-amber-300" /> Combo x
                  {Math.min(5, 1 + Math.floor(mathCombo / 3))}
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              Kỷ lục của bạn: <b>{scores.speedMathBest} điểm</b>
            </div>
          </div>

          {!mathRunning && !mathFinished ? (
            <div className="py-8 text-center space-y-4">
              <div className="text-5xl">⚡🧮</div>
              <h3 className="text-lg font-black">Thử thách Toán Nhẩm Thần Tốc 30 Giây</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Trả lời đúng liên tiếp để nhân hệ số Combo lên tới <b>x5</b>! Chơi hoàn toàn miễn phí, rèn phản xạ tính nhẩm cực nhạy.
              </p>
              <button
                type="button"
                onClick={startSpeedMath}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm shadow-lg cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" /> Bắt đầu chơi ngay (0đ)
              </button>
            </div>
          ) : mathFinished ? (
            <div className="py-6 text-center space-y-4">
              <div className="text-4xl">🏆🎉</div>
              <h3 className="text-xl font-black text-amber-300">
                Hết giờ! Bạn đạt {mathScore} điểm ({mathCorrectCount} câu đúng)
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={startSpeedMath}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Chơi lại ván mới
                </button>
                <button
                  type="button"
                  disabled={sharingScore}
                  onClick={() =>
                    shareBragToChat(
                      `⚡ Mình vừa đạt ${mathScore} điểm (${mathCorrectCount} câu đúng/30s) ở trò Toán Nhẩm Thần Tốc 0đ! Ai phá kỷ lục không? 🔥`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black cursor-pointer disabled:opacity-50"
                >
                  <Megaphone className="w-4 h-4" /> Khoe lên Chat chung
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div
                className={`p-6 rounded-2xl border-2 text-center transition-colors ${
                  mathFlash === "good"
                    ? "bg-emerald-500/25 border-emerald-400"
                    : mathFlash === "bad"
                    ? "bg-rose-500/25 border-rose-400"
                    : "bg-slate-900 border-white/15"
                }`}
              >
                <div className="text-3xl sm:text-4xl font-black tracking-wide text-white">
                  {mathQuestion.prompt}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {mathQuestion.choices.map((c, idx) => (
                  <button
                    key={`${c}_${idx}`}
                    type="button"
                    onClick={() => answerMath(c)}
                    className="py-4 rounded-2xl bg-gradient-to-b from-indigo-600 to-indigo-800 hover:from-amber-400 hover:to-amber-500 hover:text-slate-950 border border-indigo-400/40 text-xl font-black transition-all active:scale-95 cursor-pointer"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 2: MEMORY FLIP 4x4                                              */}
      {/* ===================================================================== */}
      {activeGame === "memory_flip" && (
        <div className="bg-slate-950/75 rounded-2xl border border-violet-400/30 p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 text-xs font-black">
              <span className="px-3 py-1 rounded-xl bg-violet-500/20 border border-violet-400/40 text-violet-200">
                Số lượt lật: {memoryMoves}
              </span>
              <span className="px-3 py-1 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-200">
                Thời gian: {memorySeconds}s
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-amber-200">
                Kỷ lục ít lượt nhất:{" "}
                <b>{scores.memoryBestMoves > 0 ? `${scores.memoryBestMoves} lượt` : "Chưa có"}</b>
              </span>
              <button
                type="button"
                onClick={resetMemoryGame}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Xáo bài mới
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5 max-w-md mx-auto">
            {memoryDeck.map((card) => {
              const revealed = card.flipped || card.matched;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleFlipMemoryCard(card.id)}
                  className={`aspect-square rounded-2xl border-2 text-2xl sm:text-3xl font-black flex items-center justify-center transition-all duration-200 cursor-pointer ${
                    card.matched
                      ? "bg-emerald-500/30 border-emerald-400 scale-95"
                      : revealed
                      ? "bg-amber-400 text-slate-950 border-white scale-105 shadow-lg"
                      : "bg-gradient-to-br from-violet-700 to-indigo-900 border-violet-400/40 hover:border-amber-300"
                  }`}
                >
                  {revealed ? card.emoji : "❓"}
                </button>
              );
            })}
          </div>

          {memoryWon && (
            <div className="pt-2 text-center space-y-2.5">
              <div className="text-sm font-black text-emerald-300">
                🎉 Xuất sắc! Bạn tìm đủ 8 cặp hình chỉ trong {memoryMoves} lượt ({memorySeconds}s)!
              </div>
              <button
                type="button"
                disabled={sharingScore}
                onClick={() =>
                  shareBragToChat(
                    `🃏 Mình vừa phá đảo Lật Hình Trí Nhớ 4×4 chỉ với ${memoryMoves} lượt trong ${memorySeconds}s (Tự chơi 0đ)!`
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black cursor-pointer"
              >
                <Megaphone className="w-3.5 h-3.5" /> Khoe kỷ lục lên Chat chung
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 3: WHACK-A-MOLE 30s                                             */}
      {/* ===================================================================== */}
      {activeGame === "whack_mole" && (
        <div className="bg-slate-950/75 rounded-2xl border border-emerald-400/30 p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 text-xs font-black">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                ⏱️ {moleSecLeft}s
              </span>
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300">
                Điểm: {moleScore}
              </span>
              <span className="text-[11px] text-slate-300 hidden sm:inline">
                🐹 +10đ • 👑 Chuột Vàng +30đ • 💣 Bom -15đ
              </span>
            </div>
            <div className="text-xs font-bold text-amber-200">
              Kỷ lục: <b>{scores.whackMoleBest} điểm</b>
            </div>
          </div>

          {!moleRunning && !moleFinished ? (
            <div className="py-8 text-center space-y-4">
              <div className="text-5xl">🔨🐹👑</div>
              <h3 className="text-lg font-black">Đập Chuột Xả Stress 30 Giây</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Nhấp thật nhanh vào Chuột thường (+10đ) và Chuột Vàng đội vương miện (+30đ), cẩn thận đừng đập nhầm Bom khói (-15đ)!
              </p>
              <button
                type="button"
                onClick={startWhackMole}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black text-sm shadow-lg cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" /> Bắt đầu đập chuột (0đ)
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                {moleHoles.map((state, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => whackHole(idx)}
                    className={`aspect-square rounded-3xl border-2 flex flex-col items-center justify-center transition-all active:scale-90 cursor-pointer ${
                      state === "gold"
                        ? "bg-amber-400/30 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.45)]"
                        : state === "mole"
                        ? "bg-emerald-500/25 border-emerald-400"
                        : state === "bomb"
                        ? "bg-rose-500/25 border-rose-400"
                        : "bg-slate-900 border-slate-700"
                    }`}
                  >
                    <span className="text-3xl sm:text-4xl select-none">
                      {state === "gold"
                        ? "👑"
                        : state === "mole"
                        ? "🐹"
                        : state === "bomb"
                        ? "💣"
                        : "🕳️"}
                    </span>
                    {state !== "empty" && (
                      <span className="text-[10px] font-black mt-1">
                        {state === "gold" ? "+30đ" : state === "mole" ? "+10đ" : "-15đ"}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {moleFinished && (
                <div className="pt-2 text-center space-y-3">
                  <div className="text-base font-black text-amber-300">
                    🎯 Hết giờ! Tổng điểm xả stress: {moleScore} điểm!
                  </div>
                  <div className="flex flex-wrap justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={startWhackMole}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Đập lại ván mới
                    </button>
                    <button
                      type="button"
                      disabled={sharingScore}
                      onClick={() =>
                        shareBragToChat(
                          `🔨 Mình vừa đập được ${moleScore} điểm trong 30s ở trò Đập Chuột Xả Stress 0đ! 🐹👑`
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black cursor-pointer"
                    >
                      <Megaphone className="w-3.5 h-3.5" /> Khoe lên Chat chung
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 4: TREASURE MINES 5x5                                           */}
      {/* ===================================================================== */}
      {activeGame === "treasure_mines" && (
        <div className="bg-slate-950/75 rounded-2xl border border-sky-400/30 p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-black">
              <span className="px-3 py-1 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-200">
                💎 Đã đào: {mineFoundGems}/20
              </span>
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300">
                Kho báu tạm tính: {currentMinePoints}đ
              </span>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                🔥 Chuỗi thắng: {scores.treasureStreak}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {mineStatus === "playing" && mineFoundGems > 0 && (
                <button
                  type="button"
                  onClick={cashOutTreasure}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer shadow-md"
                >
                  💰 Chốt Kho Báu ({currentMinePoints}đ)
                </button>
              )}
              <button
                type="button"
                onClick={resetTreasureMines}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Đảo mới
              </button>
            </div>
          </div>

          <p className="text-[11px] text-sky-200/80 text-center">
            Mẹo chiến thuật: Con số trên viên Kim Cương cho biết có bao nhiêu con <b>🦀 Cua Kẹp</b> trong 8 ô xung quanh nó (giống Dò Mìn)!
          </p>

          <div className="grid grid-cols-5 gap-2 max-w-sm mx-auto">
            {mineCells.map((cell) => (
              <button
                key={cell.index}
                type="button"
                disabled={mineStatus !== "playing" || cell.revealed}
                onClick={() => digMineCell(cell.index)}
                className={`aspect-square rounded-xl border flex flex-col items-center justify-center font-black transition-all cursor-pointer ${
                  !cell.revealed
                    ? "bg-gradient-to-b from-sky-700 to-indigo-900 border-sky-400/40 hover:border-amber-300 active:scale-95"
                    : cell.isTrap
                    ? "bg-rose-600/40 border-rose-400"
                    : "bg-emerald-500/25 border-emerald-400/60"
                }`}
              >
                {!cell.revealed ? (
                  <span className="text-lg opacity-80">🏝️</span>
                ) : cell.isTrap ? (
                  <span className="text-xl">🦀</span>
                ) : (
                  <>
                    <span className="text-base leading-none">💎</span>
                    <span className="text-[10px] text-amber-200 leading-none mt-0.5">
                      {cell.adjacentTraps}🦀
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>

          {mineStatus !== "playing" && (
            <div className="text-center space-y-2.5 pt-1">
              <div
                className={`text-sm font-black ${
                  mineStatus === "cashed" ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {mineStatus === "cashed"
                  ? `🏆 Chốt kho báu thành công: +${currentMinePoints} điểm danh dự (${mineFoundGems} viên Kim Cương)! Kỷ lục: ${scores.treasureBestScore}đ`
                  : "🦀 Ái chà! Đào trúng Cua Kẹp mất rồi — bấm 'Đảo mới' phục thù ngay nhé (0đ)!"}
              </div>
              {mineStatus === "cashed" && (
                <button
                  type="button"
                  disabled={sharingScore}
                  onClick={() =>
                    shareBragToChat(
                      `💎 Mình vừa đào an toàn ${mineFoundGems} Kim Cương (${currentMinePoints} điểm, chuỗi thắng ${scores.treasureStreak}) ở Đảo Kho Báu Né Cua 0đ!`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black cursor-pointer"
                >
                  <Megaphone className="w-3.5 h-3.5" /> Khoe chiến tích lên Chat chung
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 5: LUCKY SANDBOX (0đ Free Spin / Plinko / Bầu Cua)              */}
      {/* ===================================================================== */}
      {activeGame === "lucky_sandbox" && (
        <div className="bg-slate-950/75 rounded-2xl border border-pink-400/30 p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "wheel" as const, label: "🎡 Vòng Quay Tự Do" },
                { id: "plinko" as const, label: "🪩 Thả Bóng Ziczac" },
                { id: "baucua" as const, label: "🦀 Lắc Bầu Cua Vui" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSandboxMode(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    sandboxMode === tab.id
                      ? "bg-pink-500 text-white shadow-md"
                      : "bg-white/10 text-slate-300 hover:bg-white/20"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-pink-200 flex items-center gap-1 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Tự bấm quay giải trí 0đ không giới hạn!
            </span>
          </div>

          {sandboxMode === "wheel" && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="relative w-56 h-56 sm:w-64 sm:h-64">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 text-2xl drop-shadow">
                  🔻
                </div>
                <div
                  className="w-full h-full rounded-full border-4 border-amber-300 shadow-2xl overflow-hidden relative"
                  style={{
                    transform: `rotate(${soloWheelDeg}deg)`,
                    transition: soloWheelSpinning
                      ? "transform 3.1s cubic-bezier(0.16, 1, 0.3, 1)"
                      : "none",
                    background: `conic-gradient(${LUCKY_WHEEL_SECTORS.map(
                      (s, idx) => `${s.hex} ${idx * 45}deg ${(idx + 1) * 45}deg`
                    ).join(", ")})`,
                  }}
                >
                  {LUCKY_WHEEL_SECTORS.map((s, idx) => {
                    const angle = idx * 45 + 22.5;
                    return (
                      <div
                        key={s.id}
                        className="absolute inset-0 flex justify-center pt-3 text-lg select-none"
                        style={{ transform: `rotate(${angle}deg)` }}
                      >
                        <span>{s.emoji}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {soloWheelResult && (
                <div className="px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-300 text-amber-200 text-xs font-black">
                  🎉 Kim chỉ dừng tại: {soloWheelResult}!
                </div>
              )}

              <button
                type="button"
                disabled={soloWheelSpinning}
                onClick={spinSoloWheel}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white font-black text-xs sm:text-sm shadow-lg cursor-pointer disabled:opacity-50"
              >
                {soloWheelSpinning ? "Đang quay tít mù..." : "🎡 Quay thử vận may ngay (0đ)"}
              </button>
            </div>
          )}

          {sandboxMode === "plinko" && (
            <div className="space-y-4 py-2 text-center">
              <div className="max-w-md mx-auto bg-slate-900 rounded-2xl border border-fuchsia-500/30 p-4 space-y-3">
                <div className="text-xs font-bold text-fuchsia-200">
                  {soloPlinkoDropping
                    ? `🪩 Bóng đang nảy tầng ${soloPlinkoStep + 1}/8...`
                    : soloPlinkoSlot !== null
                    ? `🎉 Bóng rơi trúng ô: ${PLINKO_SLOTS[soloPlinkoSlot].emoji} ${PLINKO_SLOTS[soloPlinkoSlot].label}!`
                    : "Bấm thả bóng để xem đường ziczac ngẫu nhiên!"}
                </div>
                <div className="grid grid-cols-7 gap-1.5 pt-2">
                  {PLINKO_SLOTS.map((s, idx) => {
                    const activeCol =
                      soloPlinkoDropping &&
                      Math.round(soloPlinkoPath[soloPlinkoStep] ?? 3) === idx;
                    const landed = soloPlinkoSlot === idx && !soloPlinkoDropping;
                    return (
                      <div
                        key={s.id}
                        className={`py-2.5 rounded-xl border text-center transition-all ${
                          landed
                            ? "bg-amber-400 text-slate-950 border-white scale-105 font-black"
                            : activeCol
                            ? "bg-fuchsia-500/40 border-fuchsia-300 text-white"
                            : "bg-slate-800 border-white/10 text-slate-200"
                        }`}
                      >
                        <div className="text-lg">{s.emoji}</div>
                        <div className="text-[9px] font-bold truncate px-1">
                          {s.label.replace("Cổng ", "")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                disabled={soloPlinkoDropping}
                onClick={dropSoloPlinko}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white font-black text-xs sm:text-sm shadow-lg cursor-pointer disabled:opacity-50"
              >
                {soloPlinkoDropping ? "Đang nảy ziczac..." : "🪩 Thả bóng Ziczac ngay (0đ)"}
              </button>
            </div>
          )}

          {sandboxMode === "baucua" && (
            <div className="space-y-4 py-2 text-center">
              <div className="flex items-center justify-center gap-3">
                {soloBauCuaDice.map((faceIdx, i) => {
                  const f = BAU_CUA_FACES[faceIdx] || BAU_CUA_FACES[0];
                  return (
                    <div
                      key={i}
                      className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-b from-amber-50 to-amber-200 text-slate-900 border-4 border-amber-400 shadow-lg flex flex-col items-center justify-center ${
                        soloBauCuaRolling ? "animate-bounce" : ""
                      }`}
                    >
                      <span className="text-3xl sm:text-4xl">{f.emoji}</span>
                      <span className="text-[11px] font-black mt-1">{f.label}</span>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={soloBauCuaRolling}
                onClick={rollSoloBauCua}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-black text-xs sm:text-sm shadow-lg cursor-pointer disabled:opacity-50"
              >
                {soloBauCuaRolling ? "Đang xóc đĩa..." : "🎲 Xóc Bầu Cua giải trí (0đ)"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
