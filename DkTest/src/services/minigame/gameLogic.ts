import type {
  BauCuaFace,
  MinigameParticipant,
  MinigamePartyResult,
  MinigamePrize,
  MinigameWinnerRecord,
} from "../../types/minigame";

export const BAU_CUA_FACES: Array<{
  id: BauCuaFace;
  label: string;
  emoji: string;
  color: string;
}> = [
  { id: "bau", label: "Bầu", emoji: "🍐", color: "from-emerald-500 to-green-600" },
  { id: "cua", label: "Cua", emoji: "🦀", color: "from-rose-500 to-red-600" },
  { id: "tom", label: "Tôm", emoji: "🦐", color: "from-orange-500 to-amber-600" },
  { id: "ca", label: "Cá", emoji: "🐟", color: "from-sky-500 to-blue-600" },
  { id: "ga", label: "Gà", emoji: "🐓", color: "from-yellow-500 to-amber-500" },
  { id: "nai", label: "Nai", emoji: "🦌", color: "from-violet-500 to-purple-600" },
];

export interface LuckyWheelSector {
  id: string;
  label: string;
  emoji: string;
  color: string;
  hex: string;
}

export const LUCKY_WHEEL_SECTORS: LuckyWheelSector[] = [
  { id: "kim_cuong", label: "Kim Cương", emoji: "💎", color: "from-cyan-500 to-blue-600", hex: "#0ea5e9" },
  { id: "vuong_mien", label: "Vương Miện", emoji: "👑", color: "from-amber-400 to-yellow-500", hex: "#f59e0b" },
  { id: "ngoi_sao", label: "Ngôi Sao", emoji: "⭐", color: "from-violet-500 to-purple-600", hex: "#8b5cf6" },
  { id: "ten_lua", label: "Tên Lửa", emoji: "🚀", color: "from-rose-500 to-pink-600", hex: "#f43f5e" },
  { id: "sam_set", label: "Sấm Sét", emoji: "⚡", color: "from-orange-500 to-amber-600", hex: "#f97316" },
  { id: "co_bon_la", label: "Cỏ 4 Lá", emoji: "🍀", color: "from-emerald-500 to-green-600", hex: "#10b981" },
  { id: "phuc_loc", label: "Phúc Lộc", emoji: "🧧", color: "from-red-500 to-rose-600", hex: "#ef4444" },
  { id: "sieu_cup", label: "Siêu Cúp", emoji: "🏆", color: "from-indigo-500 to-blue-600", hex: "#6366f1" },
];

export const MYSTERY_BOXES: Array<{
  id: string;
  boxNumber: number;
  label: string;
  emoji: string;
  gradient: string;
}> = [
  { id: "1", boxNumber: 1, label: "Hộp Ruby", emoji: "🎁", gradient: "from-rose-500 to-red-600" },
  { id: "2", boxNumber: 2, label: "Hộp Hoàng Kim", emoji: "✨", gradient: "from-amber-400 to-orange-500" },
  { id: "3", boxNumber: 3, label: "Hộp Ngọc Lục", emoji: "💚", gradient: "from-emerald-500 to-teal-600" },
  { id: "4", boxNumber: 4, label: "Hộp Đại Dương", emoji: "🌊", gradient: "from-sky-500 to-blue-600" },
  { id: "5", boxNumber: 5, label: "Hộp Pha Lê", emoji: "🔮", gradient: "from-violet-500 to-purple-600" },
  { id: "6", boxNumber: 6, label: "Hộp Kim Cương", emoji: "💖", gradient: "from-fuchsia-500 to-pink-600" },
];

export const TREASURE_CHEST_COUNT = 9;
export const TREASURE_WINNING_COUNT = 2;

export const MINIGAME_TYPE_META: Record<
  string,
  { label: string; shortDesc: string; badge: string; gradient: string; emoji: string }
> = {
  horse_race: {
    label: "Đua Ngựa Tranh Cúp",
    shortDesc: "Hỗ trợ từ 2 / 4 / 8 / 16 / 32 người chơi, tùy chỉnh số lượng giải thưởng & mức thưởng bất kỳ",
    badge: "Đua tốc độ",
    gradient: "from-emerald-600 to-teal-600",
    emoji: "🐎",
  },
  bee_race: {
    label: "Đua Ong Về Tổ",
    shortDesc: "Đàn ong vỗ cánh bứt tốc từ 2 / 4 / 8 / 16 / 32 người chơi với cơ cấu giải thưởng tùy biến",
    badge: "Đua tốc độ",
    gradient: "from-amber-500 to-yellow-600",
    emoji: "🐝",
  },
  tai_xiu: {
    label: "Tài Xỉu Phúc Lợi",
    shortDesc: "Dự đoán miễn phí Tài (11–18) hoặc Xỉu (3–10) nhận quà sự kiện từ Admin",
    badge: "Miễn phí 100%",
    gradient: "from-rose-600 to-orange-600",
    emoji: "🎲",
  },
  bau_cua: {
    label: "Bầu Cua Hội Xuân",
    shortDesc: "Chọn miễn phí 1 linh vật Bầu - Cua - Tôm - Cá - Gà - Nai nhận thưởng phúc lợi",
    badge: "Miễn phí 100%",
    gradient: "from-red-600 to-amber-600",
    emoji: "🦀",
  },
  lucky_number: {
    label: "Đoán Số May Mắn (00–99)",
    shortDesc: "Chọn miễn phí 1 số may mắn — chỉ người đoán trúng chính xác con số may mắn mới nhận giải",
    badge: "Quay số trực tiếp",
    gradient: "from-indigo-600 to-violet-600",
    emoji: "🎯",
  },
  lucky_wheel: {
    label: "Vòng Quay Siêu Tốc",
    shortDesc: "Chọn miễn phí 1 trong 8 biểu tượng trên Vòng Quay — mũi tên vàng dừng ở đâu, chủ nhân ô đó thắng giải",
    badge: "Quay thưởng live",
    gradient: "from-fuchsia-600 to-purple-600",
    emoji: "🎡",
  },
  treasure_flip: {
    label: "Lật Thẻ Kho Báu",
    shortDesc: "9 rương kho báu ẩn giấu 2 Kim Cương Vàng — chọn 1 rương miễn phí và lật mở 3D đồng loạt",
    badge: "Lật thẻ 3D",
    gradient: "from-amber-600 to-yellow-500",
    emoji: "🏴‍☠️",
  },
  mystery_box: {
    label: "Đập Hộp Bí Ẩn",
    shortDesc: "Chọn miễn phí 1 trong 6 hộp quà sắc màu — hồi hộp chờ màn đập hộp bung pháo hoa tìm Hộp Đặc Biệt",
    badge: "Bung hộp pháo hoa",
    gradient: "from-pink-600 to-rose-500",
    emoji: "🎁",
  },
};

export function getDefaultRankLabel(rank: number): string {
  if (rank === 0) return "Giải đồng hạng";
  if (rank === 1) return "Giải Nhất";
  if (rank === 2) return "Giải Nhì";
  if (rank === 3) return "Giải Ba";
  if (rank === 4) return "Giải Tư";
  if (rank === 5) return "Giải Năm";
  return `Giải Hạng #${rank}`;
}

export function findPrizeForRank(prizes: MinigamePrize[], rank: number): MinigamePrize | null {
  return (
    prizes.find((p) => p.rank === rank) ||
    prizes.find((p) => p.rank === 0) ||
    null
  );
}

/**
 * Builds race winner records for ALL configured prizes (supports 1, 2, 3, 4, 5, ... N prizes,
 * as well as optional collective rank=0 consolation prizes).
 */
export function buildRaceWinners(
  rankedUids: string[],
  participants: Record<string, MinigameParticipant>,
  prizes: MinigamePrize[],
  finalFinishTimesMs: Record<string, number>
): MinigameWinnerRecord[] {
  const winners: MinigameWinnerRecord[] = [];
  rankedUids.forEach((uid, idx) => {
    const rank = idx + 1;
    const p = participants[uid];
    if (!p) return;
    const exactPrize = prizes.find((pr) => pr.rank === rank) || null;
    const collectivePrize = prizes.find((pr) => pr.rank === 0) || null;
    const prize = exactPrize || collectivePrize;
    if (!prize) return;
    const timeSec = finalFinishTimesMs[uid]
      ? `${(finalFinishTimesMs[uid] / 1000).toFixed(2)}s`
      : "";
    winners.push({
      uid,
      displayName: p.displayName,
      isBot: Boolean(p.isBot),
      rank: exactPrize ? rank : 0,
      prizeLabel: prize.label || getDefaultRankLabel(exactPrize ? rank : 0),
      prizeType: prize.type,
      amountVnd: prize.amountVnd,
      voucherCode: prize.voucherCode,
      customTitle: prize.customTitle,
      matchDetail: `Về đích hạng #${rank}${timeSec ? ` (${timeSec})` : ""}`,
      distributed: false,
      distributedAt: null,
      walletTransactionId: null,
    });
  });
  return winners;
}

export function evaluateTaiXiuWinners(
  dice: [number, number, number],
  participants: Record<string, MinigameParticipant>,
  prizes: MinigamePrize[],
  revealedAtMs: number
): { result: MinigamePartyResult; winners: MinigameWinnerRecord[] } {
  const sum = dice[0] + dice[1] + dice[2];
  const outcome: "tai" | "xiu" = sum >= 11 ? "tai" : "xiu";
  const result: MinigamePartyResult = {
    revealedAtMs,
    dice,
    diceSum: sum,
    taiXiuOutcome: outcome,
  };

  if (!prizes || prizes.length === 0) return { result, winners: [] };

  const matched = Object.values(participants)
    .filter((p) => p.prediction === outcome)
    .sort((a, b) => a.joinedAt - b.joinedAt);

  const collectivePrize = prizes.find((pr) => pr.rank === 0) || null;
  const winners: MinigameWinnerRecord[] = [];

  matched.forEach((p, idx) => {
    const pos = idx + 1;
    const exactPrize = prizes.find((pr) => pr.rank === pos) || null;
    const prize = exactPrize || collectivePrize;
    if (!prize) return;
    winners.push({
      uid: p.uid,
      displayName: p.displayName,
      isBot: Boolean(p.isBot),
      rank: exactPrize ? pos : 0,
      prizeLabel: prize.label || (exactPrize ? getDefaultRankLabel(pos) : "Người dự đoán đúng"),
      prizeType: prize.type,
      amountVnd: prize.amountVnd,
      voucherCode: prize.voucherCode,
      customTitle: prize.customTitle,
      matchDetail: `Đoán đúng ${outcome === "tai" ? "TÀI" : "XỈU"} (Tổng ${sum})`,
      distributed: false,
      distributedAt: null,
      walletTransactionId: null,
    });
  });

  return { result, winners };
}

export function evaluateBauCuaWinners(
  faces: [BauCuaFace, BauCuaFace, BauCuaFace],
  participants: Record<string, MinigameParticipant>,
  prizes: MinigamePrize[],
  revealedAtMs: number
): { result: MinigamePartyResult; winners: MinigameWinnerRecord[] } {
  const result: MinigamePartyResult = {
    revealedAtMs,
    bauCuaFaces: faces,
  };
  if (!prizes || prizes.length === 0) return { result, winners: [] };

  const faceLabel = (f: string) => BAU_CUA_FACES.find((x) => x.id === f)?.label || f;
  const matched = Object.values(participants)
    .map((p) => {
      const count = faces.filter((f) => f === p.prediction).length;
      return { p, count };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.p.joinedAt - b.p.joinedAt);

  const collectivePrize = prizes.find((pr) => pr.rank === 0) || null;
  const winners: MinigameWinnerRecord[] = [];

  matched.forEach(({ p, count }, idx) => {
    const pos = idx + 1;
    const exactPrize = prizes.find((pr) => pr.rank === pos) || null;
    const prize = exactPrize || collectivePrize;
    if (!prize) return;
    winners.push({
      uid: p.uid,
      displayName: p.displayName,
      isBot: Boolean(p.isBot),
      rank: exactPrize ? pos : 0,
      prizeLabel: prize.label || (exactPrize ? getDefaultRankLabel(pos) : "Trúng Bầu Cua"),
      prizeType: prize.type,
      amountVnd: prize.amountVnd,
      voucherCode: prize.voucherCode,
      customTitle: prize.customTitle,
      matchDetail: `Trúng ${faceLabel(p.prediction || "")} (x${count} viên)`,
      distributed: false,
      distributedAt: null,
      walletTransactionId: null,
    });
  });

  return { result, winners };
}

/**
 * Strictly selects ONLY participants whose prediction matches `luckyNumber` EXACTLY.
 * Ordered by earliest registration (`joinedAt ASC`) if tiered rank prizes exist.
 */
export function evaluateLuckyNumberWinners(
  luckyNumber: number,
  participants: Record<string, MinigameParticipant>,
  prizes: MinigamePrize[],
  revealedAtMs: number
): { result: MinigamePartyResult; winners: MinigameWinnerRecord[] } {
  const cleanTarget = Math.max(0, Math.min(99, Math.trunc(luckyNumber)));
  const result: MinigamePartyResult = {
    revealedAtMs,
    luckyNumber: cleanTarget,
  };

  if (!prizes || prizes.length === 0) return { result, winners: [] };

  const exactMatches = Object.values(participants)
    .filter((p) => {
      if (p.prediction === undefined || !/^\d{1,2}$/.test(p.prediction)) return false;
      return Number(p.prediction) === cleanTarget;
    })
    .sort((a, b) => a.joinedAt - b.joinedAt);

  const targetFormatted = String(cleanTarget).padStart(2, "0");
  const winners: MinigameWinnerRecord[] = [];
  const collectivePrize = prizes.find((pr) => pr.rank === 0) || null;

  exactMatches.forEach((p, idx) => {
    const pos = idx + 1;
    const exactPrize = prizes.find((pr) => pr.rank === pos) || null;
    const prize = exactPrize || collectivePrize;
    if (!prize) return;
    winners.push({
      uid: p.uid,
      displayName: p.displayName,
      isBot: Boolean(p.isBot),
      rank: exactPrize ? pos : 0,
      prizeLabel:
        prize.label ||
        (exactPrize ? getDefaultRankLabel(pos) : "Trúng Số May Mắn"),
      prizeType: prize.type,
      amountVnd: prize.amountVnd,
      voucherCode: prize.voucherCode,
      customTitle: prize.customTitle,
      matchDetail: `Đoán trúng chính xác số ${targetFormatted}!`,
      distributed: false,
      distributedAt: null,
      walletTransactionId: null,
    });
  });

  return { result, winners };
}

export function evaluateLuckyWheelWinners(
  sectorIndex: number,
  participants: Record<string, MinigameParticipant>,
  prizes: MinigamePrize[],
  revealedAtMs: number
): { result: MinigamePartyResult; winners: MinigameWinnerRecord[] } {
  const safeIdx =
    ((Math.trunc(sectorIndex) % LUCKY_WHEEL_SECTORS.length) + LUCKY_WHEEL_SECTORS.length) %
    LUCKY_WHEEL_SECTORS.length;
  const sector = LUCKY_WHEEL_SECTORS[safeIdx];
  const result: MinigamePartyResult = {
    revealedAtMs,
    wheelSectorIndex: safeIdx,
    wheelSectorId: sector.id,
    wheelSectorLabel: `${sector.emoji} ${sector.label}`,
  };
  if (!prizes || prizes.length === 0) return { result, winners: [] };

  const matched = Object.values(participants)
    .filter((p) => p.prediction === sector.id)
    .sort((a, b) => a.joinedAt - b.joinedAt);

  const collectivePrize = prizes.find((pr) => pr.rank === 0) || null;
  const winners: MinigameWinnerRecord[] = [];
  matched.forEach((p, idx) => {
    const pos = idx + 1;
    const exactPrize = prizes.find((pr) => pr.rank === pos) || null;
    const prize = exactPrize || collectivePrize;
    if (!prize) return;
    winners.push({
      uid: p.uid,
      displayName: p.displayName,
      isBot: Boolean(p.isBot),
      rank: exactPrize ? pos : 0,
      prizeLabel: prize.label || (exactPrize ? getDefaultRankLabel(pos) : "Trúng Vòng Quay"),
      prizeType: prize.type,
      amountVnd: prize.amountVnd,
      voucherCode: prize.voucherCode,
      customTitle: prize.customTitle,
      matchDetail: `Trúng ô ${sector.emoji} ${sector.label}!`,
      distributed: false,
      distributedAt: null,
      walletTransactionId: null,
    });
  });

  return { result, winners };
}

export function evaluateTreasureFlipWinners(
  winningIndices: number[],
  participants: Record<string, MinigameParticipant>,
  prizes: MinigamePrize[],
  revealedAtMs: number
): { result: MinigamePartyResult; winners: MinigameWinnerRecord[] } {
  const uniqueSorted = Array.from(
    new Set(
      winningIndices
        .map((n) => Math.trunc(Number(n)))
        .filter((n) => n >= 1 && n <= TREASURE_CHEST_COUNT)
    )
  ).sort((a, b) => a - b);

  const result: MinigamePartyResult = {
    revealedAtMs,
    treasureWinningIndices: uniqueSorted,
  };
  if (!prizes || prizes.length === 0) return { result, winners: [] };

  const winSet = new Set(uniqueSorted.map(String));
  const matched = Object.values(participants)
    .filter((p) => p.prediction && winSet.has(String(p.prediction)))
    .sort((a, b) => a.joinedAt - b.joinedAt);

  const collectivePrize = prizes.find((pr) => pr.rank === 0) || null;
  const winners: MinigameWinnerRecord[] = [];
  matched.forEach((p, idx) => {
    const pos = idx + 1;
    const exactPrize = prizes.find((pr) => pr.rank === pos) || null;
    const prize = exactPrize || collectivePrize;
    if (!prize) return;
    winners.push({
      uid: p.uid,
      displayName: p.displayName,
      isBot: Boolean(p.isBot),
      rank: exactPrize ? pos : 0,
      prizeLabel: prize.label || (exactPrize ? getDefaultRankLabel(pos) : "Trúng Kho Báu Vàng"),
      prizeType: prize.type,
      amountVnd: prize.amountVnd,
      voucherCode: prize.voucherCode,
      customTitle: prize.customTitle,
      matchDetail: `Mở trúng Rương Kho Báu #${p.prediction}!`,
      distributed: false,
      distributedAt: null,
      walletTransactionId: null,
    });
  });

  return { result, winners };
}

export function evaluateMysteryBoxWinners(
  winningBox: number,
  participants: Record<string, MinigameParticipant>,
  prizes: MinigamePrize[],
  revealedAtMs: number
): { result: MinigamePartyResult; winners: MinigameWinnerRecord[] } {
  const cleanBox = Math.max(1, Math.min(MYSTERY_BOXES.length, Math.trunc(winningBox)));
  const boxMeta = MYSTERY_BOXES.find((b) => b.boxNumber === cleanBox) || MYSTERY_BOXES[0];
  const result: MinigamePartyResult = {
    revealedAtMs,
    mysteryWinningBox: cleanBox,
  };
  if (!prizes || prizes.length === 0) return { result, winners: [] };

  const matched = Object.values(participants)
    .filter((p) => String(p.prediction) === String(cleanBox))
    .sort((a, b) => a.joinedAt - b.joinedAt);

  const collectivePrize = prizes.find((pr) => pr.rank === 0) || null;
  const winners: MinigameWinnerRecord[] = [];
  matched.forEach((p, idx) => {
    const pos = idx + 1;
    const exactPrize = prizes.find((pr) => pr.rank === pos) || null;
    const prize = exactPrize || collectivePrize;
    if (!prize) return;
    winners.push({
      uid: p.uid,
      displayName: p.displayName,
      isBot: Boolean(p.isBot),
      rank: exactPrize ? pos : 0,
      prizeLabel: prize.label || (exactPrize ? getDefaultRankLabel(pos) : "Trúng Hộp Bí Ẩn"),
      prizeType: prize.type,
      amountVnd: prize.amountVnd,
      voucherCode: prize.voucherCode,
      customTitle: prize.customTitle,
      matchDetail: `Đập trúng ${boxMeta.label} (#${cleanBox})!`,
      distributed: false,
      distributedAt: null,
      walletTransactionId: null,
    });
  });

  return { result, winners };
}

export interface MinigameScheduleSnapshot {
  phase: "unscheduled" | "upcoming" | "open" | "closed";
  startsInMs: number;
  endsInMs: number;
  label: string;
}

export function evaluateMinigameSchedule(
  schedule: { scheduledStartAt?: string | null; scheduledEndAt?: string | null },
  nowMs = Date.now()
): MinigameScheduleSnapshot {
  const startMs = schedule.scheduledStartAt ? Date.parse(schedule.scheduledStartAt) : NaN;
  const endMs = schedule.scheduledEndAt ? Date.parse(schedule.scheduledEndAt) : NaN;
  const hasStart = Number.isFinite(startMs);
  const hasEnd = Number.isFinite(endMs);

  if (!hasStart && !hasEnd) {
    return { phase: "unscheduled", startsInMs: 0, endsInMs: 0, label: "Đang mở tự do" };
  }
  if (hasStart && nowMs < startMs) {
    return {
      phase: "upcoming",
      startsInMs: startMs - nowMs,
      endsInMs: hasEnd ? Math.max(0, endMs - nowMs) : 0,
      label: "Sắp diễn ra",
    };
  }
  if (hasEnd && nowMs >= endMs) {
    return {
      phase: "closed",
      startsInMs: 0,
      endsInMs: 0,
      label: "Hết giờ đăng ký",
    };
  }
  return {
    phase: "open",
    startsInMs: 0,
    endsInMs: hasEnd ? Math.max(0, endMs - nowMs) : 0,
    label: hasEnd ? "Đang mở đăng ký" : "Đang diễn ra",
  };
}

export function formatMinigameCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) return `${days} ngày ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  if (hours > 0) return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(mins)}:${pad(secs)}`;
}
