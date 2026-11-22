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

export const MINIGAME_TYPE_META: Record<
  string,
  { label: string; shortDesc: string; badge: string; gradient: string; emoji: string }
> = {
  horse_race: {
    label: "Đua Ngựa Tranh Cúp",
    shortDesc: "Chia vòng 4 / 8 / 16 / 32 người chơi, tranh Giải Nhất - Nhì - Ba trực tiếp",
    badge: "Đua tốc độ",
    gradient: "from-emerald-600 to-teal-600",
    emoji: "🐎",
  },
  bee_race: {
    label: "Đua Ong Về Tổ",
    shortDesc: "Đàn ong vỗ cánh tăng tốc qua các vòng loại 4 / 8 / 16 / 32 người chơi",
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
};

export function findPrizeForRank(prizes: MinigamePrize[], rank: number): MinigamePrize | null {
  return (
    prizes.find((p) => p.rank === rank) ||
    prizes.find((p) => p.rank === 0) ||
    null
  );
}

export function buildRaceWinners(
  podiumUids: string[],
  participants: Record<string, MinigameParticipant>,
  prizes: MinigamePrize[],
  finalFinishTimesMs: Record<string, number>
): MinigameWinnerRecord[] {
  const winners: MinigameWinnerRecord[] = [];
  podiumUids.slice(0, 3).forEach((uid, idx) => {
    const rank = idx + 1;
    const p = participants[uid];
    if (!p) return;
    const prize = findPrizeForRank(prizes, rank);
    if (!prize) return;
    const timeSec = finalFinishTimesMs[uid]
      ? `${(finalFinishTimesMs[uid] / 1000).toFixed(2)}s`
      : "";
    winners.push({
      uid,
      displayName: p.displayName,
      isBot: Boolean(p.isBot),
      rank,
      prizeLabel: prize.label || `Giải ${rank === 1 ? "Nhất" : rank === 2 ? "Nhì" : "Ba"}`,
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

  const prize = findPrizeForRank(prizes, 0) || findPrizeForRank(prizes, 1);
  if (!prize) return { result, winners: [] };

  const matched = Object.values(participants)
    .filter((p) => p.prediction === outcome)
    .sort((a, b) => a.joinedAt - b.joinedAt);

  const winners: MinigameWinnerRecord[] = matched.map((p) => ({
    uid: p.uid,
    displayName: p.displayName,
    isBot: Boolean(p.isBot),
    rank: 0,
    prizeLabel: prize.label || "Người dự đoán đúng",
    prizeType: prize.type,
    amountVnd: prize.amountVnd,
    voucherCode: prize.voucherCode,
    customTitle: prize.customTitle,
    matchDetail: `Đoán đúng ${outcome === "tai" ? "TÀI" : "XỈU"} (Tổng ${sum})`,
    distributed: false,
    distributedAt: null,
    walletTransactionId: null,
  }));

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
  const prize = findPrizeForRank(prizes, 0) || findPrizeForRank(prizes, 1);
  if (!prize) return { result, winners: [] };

  const faceLabel = (f: string) => BAU_CUA_FACES.find((x) => x.id === f)?.label || f;
  const matched = Object.values(participants)
    .map((p) => {
      const count = faces.filter((f) => f === p.prediction).length;
      return { p, count };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.p.joinedAt - b.p.joinedAt);

  const winners: MinigameWinnerRecord[] = matched.map(({ p, count }) => ({
    uid: p.uid,
    displayName: p.displayName,
    isBot: Boolean(p.isBot),
    rank: 0,
    prizeLabel: prize.label || "Trúng Bầu Cua",
    prizeType: prize.type,
    amountVnd: prize.amountVnd,
    voucherCode: prize.voucherCode,
    customTitle: prize.customTitle,
    matchDetail: `Trúng ${faceLabel(p.prediction || "")} (x${count} viên)`,
    distributed: false,
    distributedAt: null,
    walletTransactionId: null,
  }));

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

  const exactMatches = Object.values(participants)
    .filter((p) => {
      if (p.prediction === undefined || !/^\d{1,2}$/.test(p.prediction)) return false;
      return Number(p.prediction) === cleanTarget;
    })
    .sort((a, b) => a.joinedAt - b.joinedAt);

  const targetFormatted = String(cleanTarget).padStart(2, "0");
  const winners: MinigameWinnerRecord[] = [];
  const collectivePrize = prizes.find((pr) => pr.rank === 0) || null;
  const fallbackPrize = collectivePrize || prizes[prizes.length - 1] || null;

  exactMatches.forEach((p, idx) => {
    const rank = collectivePrize ? 0 : idx + 1;
    const prize = findPrizeForRank(prizes, rank) || fallbackPrize;
    if (!prize) return;
    winners.push({
      uid: p.uid,
      displayName: p.displayName,
      isBot: Boolean(p.isBot),
      rank: collectivePrize ? 0 : rank,
      prizeLabel:
        prize.label ||
        (collectivePrize ? "Trúng Số May Mắn" : `Trúng Số May Mắn (#${idx + 1})`),
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
