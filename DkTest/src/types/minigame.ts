export type MinigameType =
  | "horse_race"
  | "bee_race"
  | "tai_xiu"
  | "bau_cua"
  | "lucky_number";

export type MinigameStatus = "lobby" | "running" | "finished" | "cancelled";

export type MinigamePrizeType = "wallet_vnd" | "voucher" | "custom_gift";

export type BauCuaFace = "bau" | "cua" | "tom" | "ca" | "ga" | "nai";

export interface MinigamePrize {
  /** 1 = Giải Nhất, 2 = Giải Nhì, 3 = Giải Ba; 0 = Giải chung cho tất cả người đoán đúng (Tài Xỉu / Bầu Cua) */
  rank: number;
  label: string;
  type: MinigamePrizeType;
  /** Positive integer VND added to Ví DkTEST when type === "wallet_vnd" */
  amountVnd?: number;
  /** Voucher code granted when type === "voucher" */
  voucherCode?: string;
  /** Free-form reward title when type === "custom_gift" (e.g., "1 tháng Gemini Pro") */
  customTitle?: string;
}

export interface MinigameParticipant {
  uid: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  joinedAt: number;
  /** True for Admin-spawned simulation bots (never receive real wallet money) */
  isBot?: boolean;
  /** Free prediction (no wagering!): "tai"|"xiu", BauCuaFace, or "00".."99" */
  prediction?: string;
  racerColor: string;
  racerNumber: number;
}

export interface MinigameRaceHeat {
  heatId: string;
  roundIndex: number;
  roundName: string;
  heatIndex: number;
  isFinal: boolean;
  status: "pending" | "racing" | "completed";
  laneUids: string[];
  advanceCount: number;
  seed: number;
  startAtMs: number | null;
  durationMs: number;
  finishOrder: string[];
  finishTimesMs: Record<string, number>;
  /** 12 normalized segment checkpoint weights per racer for realistic lead changes & sprints */
  speedProfiles: Record<string, number[]>;
}

export interface MinigamePartyResult {
  revealedAtMs: number;
  /** Tài Xỉu */
  dice?: [number, number, number];
  diceSum?: number;
  taiXiuOutcome?: "tai" | "xiu";
  /** Bầu Cua */
  bauCuaFaces?: [BauCuaFace, BauCuaFace, BauCuaFace];
  /** Đoán số may mắn (0..99) */
  luckyNumber?: number;
}

export interface MinigameWinnerRecord {
  uid: string;
  displayName: string;
  isBot?: boolean;
  rank: number; // 1, 2, 3 or 0 for collective winners
  prizeLabel: string;
  prizeType: MinigamePrizeType;
  amountVnd?: number;
  voucherCode?: string;
  customTitle?: string;
  matchDetail?: string; // e.g., "Về đích #1 (13.42s)" or "Trúng x2 Cua" or "Đoán 42 (lệch 1)"
  distributed: boolean;
  distributedAt?: string | null;
  walletTransactionId?: string | null;
}

export interface MinigameEvent {
  id: string;
  eventCode: string;
  title: string;
  description: string;
  gameType: MinigameType;
  status: MinigameStatus;
  /** Strictly 0 — all minigames are 100% free welfare events, NEVER paid gambling */
  entryFeeVnd: 0;
  /** For horse_race / bee_race: 4, 8, 16, or 32. For party games: up to 200 */
  maxParticipants: number;
  /** Number of racers per heat for horse_race / bee_race (4 or 8) */
  racersPerHeat: number;
  prizes: MinigamePrize[];
  participants: Record<string, MinigameParticipant>;
  /** Tournament heats for horse_race / bee_race */
  heats: MinigameRaceHeat[];
  activeHeatId: string | null;
  /** Party game result (tai_xiu, bau_cua, lucky_number) */
  partyResult: MinigamePartyResult | null;
  winners: MinigameWinnerRecord[];
  prizesDistributedAt?: string | null;
  createdByUid: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface MinigameCheerMessage {
  id: string;
  uid: string;
  displayName: string;
  emoji: string;
  text?: string;
  createdAt: number;
}
