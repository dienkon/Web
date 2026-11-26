import crypto from "node:crypto";
import { z } from "zod";
import {
  adminDb,
  deleteFirestoreRestDoc,
  getFirestoreRestDoc,
  getFirestoreRestDocs,
  setFirestoreRestDoc,
} from "../firebaseAdmin.js";
import type {
  BauCuaFace,
  MinigameEvent,
  MinigameParticipant,
  MinigameRaceHeat,
} from "../../src/types/minigame.js";
import type { StudentWallet, WalletTransaction } from "../../src/types/index.js";
import {
  RACER_PALETTE,
  advanceRaceTournamentIfReady,
  buildInitialRaceHeats,
  simulateRaceHeat,
} from "../../src/services/minigame/raceEngine.js";
import {
  BAU_CUA_FACES,
  buildRaceWinners,
  evaluateBauCuaWinners,
  evaluateLuckyNumberWinners,
  evaluateTaiXiuWinners,
} from "../../src/services/minigame/gameLogic.js";
import {
  getOrCreateWallet,
  invalidateStudentDetailsCache,
  invalidateWalletOverviewCache,
  sanitizeVnd,
} from "./walletService.js";
import { publishDeviceNotification } from "./notificationPushService.js";
import type { MinigameCheerMessage } from "../../src/types/minigame.js";

const COL_MINIGAMES = "minigame_events";

// In-memory ring buffer for live cheers per event (0 Firestore reads/writes, zero RTDB permission_denied errors)
const liveCheersByEvent = new Map<string, MinigameCheerMessage[]>();

export function addLiveMinigameCheer(
  eventId: string,
  cheer: { uid: string; displayName: string; emoji: string; text?: string }
): MinigameCheerMessage {
  const msg: MinigameCheerMessage = {
    id: makeId("ch"),
    uid: cheer.uid,
    displayName: (cheer.displayName || "Người xem").slice(0, 60),
    emoji: (cheer.emoji || "🔥").slice(0, 8),
    text: (cheer.text || "").slice(0, 80),
    createdAt: Date.now(),
  };
  const existing = liveCheersByEvent.get(eventId) || [];
  const next = [msg, ...existing.filter((m) => Date.now() - m.createdAt < 60_000)].slice(0, 24);
  liveCheersByEvent.set(eventId, next);
  return msg;
}

export function listLiveMinigameCheers(eventId: string): MinigameCheerMessage[] {
  const existing = liveCheersByEvent.get(eventId) || [];
  const fresh = existing.filter((m) => Date.now() - m.createdAt < 60_000);
  liveCheersByEvent.set(eventId, fresh);
  return fresh.slice(0, 12);
}

const BOT_NAMES = [
  "Ngựa Chiến Đỏ",
  "Tia Chớp Vàng",
  "Bão Tố Xanh",
  "Sao Băng",
  "Hỏa Long",
  "Bạch Mã",
  "Hắc Long",
  "Phong Thần",
  "Lôi Vũ",
  "Thần Tốc",
  "Siêu Ong Mật",
  "Hoàng Kim",
  "Bạch Hổ",
  "Thanh Long",
  "Chu Tước",
  "Huyền Vũ",
  "Minh Khôi",
  "Gia Huy",
  "Khánh Linh",
  "Thảo Vy",
  "Anh Tuấn",
  "Bảo Ngọc",
  "Đức Anh",
  "Hải Đăng",
  "Lan Anh",
  "Quốc Bảo",
  "Thanh Trúc",
  "Nhật Minh",
  "Phương Nhi",
  "Tuấn Kiệt",
  "Mỹ Duyên",
  "Văn Kiên",
];

// ---------------------------------------------------------------------------
// ZOD SCHEMAS
// ---------------------------------------------------------------------------

const prizeSchema = z.object({
  rank: z.number().int().min(0).max(50),
  label: z.string().trim().min(1).max(120),
  type: z.enum(["wallet_vnd", "voucher", "custom_gift"]),
  amountVnd: z.number().int().min(0).max(1_000_000_000).optional(),
  voucherCode: z.string().trim().max(80).optional(),
  customTitle: z.string().trim().max(200).optional(),
});

export const createMinigameSchema = z.object({
  title: z.string().trim().min(2, "Vui lòng nhập tên sự kiện minigame.").max(160),
  description: z.string().trim().max(1000).optional().default(""),
  gameType: z.enum(["horse_race", "bee_race", "tai_xiu", "bau_cua", "lucky_number"]),
  maxParticipants: z.number().int().min(2).max(200).default(8),
  racersPerHeat: z.number().int().min(2).max(8).optional().default(4),
  prizes: z
    .array(prizeSchema)
    .min(1, "Vui lòng cấu hình ít nhất 1 giải thưởng phúc lợi.")
    .max(32, "Tối đa 32 giải thưởng trong một sự kiện."),
});

export const joinMinigameSchema = z.object({
  prediction: z.string().trim().max(32).optional(),
  avatarUrl: z.string().trim().max(1024).optional(),
});

// ---------------------------------------------------------------------------
// LOW-LEVEL FIRESTORE HELPERS
// ---------------------------------------------------------------------------

async function listEventsRaw(): Promise<MinigameEvent[]> {
  if (adminDb) {
    const snap = await adminDb.collection(COL_MINIGAMES).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MinigameEvent));
  }
  const docs = await getFirestoreRestDocs(COL_MINIGAMES, 200, false);
  return docs as MinigameEvent[];
}

async function getEventRaw(id: string): Promise<MinigameEvent | null> {
  if (adminDb) {
    const snap = await adminDb.collection(COL_MINIGAMES).doc(id).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as MinigameEvent) : null;
  }
  const doc = await getFirestoreRestDoc(COL_MINIGAMES, id, false);
  return doc ? ({ id, ...doc } as MinigameEvent) : null;
}

async function saveEventRaw(event: MinigameEvent): Promise<void> {
  if (adminDb) {
    await adminDb.collection(COL_MINIGAMES).doc(event.id).set(event, { merge: false });
  } else {
    await setFirestoreRestDoc(COL_MINIGAMES, event.id, event);
  }
}

async function deleteEventRaw(id: string): Promise<void> {
  if (adminDb) {
    await adminDb.collection(COL_MINIGAMES).doc(id).delete();
  } else {
    await deleteFirestoreRestDoc(COL_MINIGAMES, id);
  }
}

function makeEventCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "MG";
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }
  return code;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
}

function isRaceGame(type: MinigameEvent["gameType"]): boolean {
  return type === "horse_race" || type === "bee_race";
}

function validatePredictionForGame(
  gameType: MinigameEvent["gameType"],
  prediction?: string
): string | undefined {
  if (isRaceGame(gameType)) return undefined;
  const clean = (prediction || "").trim().toLowerCase();
  if (gameType === "tai_xiu") {
    if (clean !== "tai" && clean !== "xiu") {
      throw new Error("Vui lòng chọn dự đoán miễn phí: Tài hoặc Xỉu.");
    }
    return clean;
  }
  if (gameType === "bau_cua") {
    const valid = BAU_CUA_FACES.map((f) => f.id);
    if (!valid.includes(clean as BauCuaFace)) {
      throw new Error("Vui lòng chọn 1 linh vật Bầu Cua hợp lệ.");
    }
    return clean;
  }
  if (gameType === "lucky_number") {
    if (!/^\d{1,2}$/.test(clean)) {
      throw new Error("Vui lòng chọn số may mắn từ 00 đến 99.");
    }
    const num = Number(clean);
    if (num < 0 || num > 99) {
      throw new Error("Số may mắn phải nằm trong khoảng 00 đến 99.");
    }
    return String(num).padStart(2, "0");
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// PUBLIC / STUDENT READ & JOIN SERVICES
// ---------------------------------------------------------------------------

export async function listMinigameEvents(): Promise<MinigameEvent[]> {
  const all = await listEventsRaw();
  return all.sort((a, b) => {
    const priority = (s: string) =>
      s === "running" ? 0 : s === "lobby" ? 1 : s === "finished" ? 2 : 3;
    const diff = priority(a.status) - priority(b.status);
    if (diff !== 0) return diff;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
}

export async function getMinigameEvent(idOrCode: string): Promise<MinigameEvent> {
  const clean = idOrCode.trim();
  const direct = await getEventRaw(clean);
  if (direct) return direct;

  // Fallback lookup by eventCode (e.g. /minigame/MGXXXXXX)
  const all = await listEventsRaw();
  const byCode = all.find((e) => e.eventCode.toUpperCase() === clean.toUpperCase());
  if (!byCode) {
    const err: any = new Error("Không tìm thấy sự kiện Minigame này.");
    err.statusCode = 404;
    throw err;
  }
  return byCode;
}

export async function joinOrUpdateMinigameParticipant(
  eventId: string,
  user: { uid: string; email?: string; displayName?: string },
  rawInput: unknown
): Promise<MinigameEvent> {
  const data = joinMinigameSchema.parse(rawInput || {});
  const event = await getMinigameEvent(eventId);

  if (event.status !== "lobby") {
    throw new Error("Sự kiện đã bắt đầu hoặc kết thúc, không thể đăng ký thêm.");
  }

  const prediction = validatePredictionForGame(event.gameType, data.prediction);
  const participants = { ...(event.participants || {}) };
  const existing = participants[user.uid];

  if (!existing) {
    const currentCount = Object.keys(participants).length;
    if (currentCount >= event.maxParticipants) {
      throw new Error(
        `Sự kiện đã đủ tối đa ${event.maxParticipants} người tham gia. Hẹn bạn ở sự kiện tiếp theo nhé!`
      );
    }

    const racerNumber = currentCount + 1;
    const racerColor = RACER_PALETTE[currentCount % RACER_PALETTE.length];
    const participant: MinigameParticipant = {
      uid: user.uid,
      displayName: user.displayName || user.email?.split("@")[0] || `Học sinh #${racerNumber}`,
      email: user.email || "",
      avatarUrl: data.avatarUrl || "",
      joinedAt: Date.now(),
      ...(prediction !== undefined ? { prediction } : {}),
      racerColor,
      racerNumber,
    };
    participants[user.uid] = participant;
  } else {
    // Allow updating free prediction while in lobby
    participants[user.uid] = {
      ...existing,
      displayName: user.displayName || existing.displayName,
      ...(prediction !== undefined ? { prediction } : {}),
    };
  }

  const updated: MinigameEvent = {
    ...event,
    entryFeeVnd: 0,
    participants,
    updatedAt: new Date().toISOString(),
  };
  await saveEventRaw(updated);
  return updated;
}

export async function leaveMinigameEvent(
  eventId: string,
  uid: string
): Promise<MinigameEvent> {
  const event = await getMinigameEvent(eventId);
  if (event.status !== "lobby") {
    throw new Error("Chỉ có thể rời phòng khi sự kiện đang mở đăng ký.");
  }
  const participants = { ...(event.participants || {}) };
  delete participants[uid];
  const updated: MinigameEvent = {
    ...event,
    participants,
    updatedAt: new Date().toISOString(),
  };
  await saveEventRaw(updated);
  return updated;
}

// ---------------------------------------------------------------------------
// ADMIN EVENT LIFECYCLE & PRIZE DISTRIBUTION
// ---------------------------------------------------------------------------

export async function createMinigameEvent(
  rawInput: unknown,
  actor: { uid: string; displayName?: string }
): Promise<MinigameEvent> {
  const data = createMinigameSchema.parse(rawInput);

  // Support flexible race participant counts from 2 up to 64 (presets 2, 4, 8, 16, 32 or custom)
  let maxParticipants = data.maxParticipants;
  let racersPerHeat = data.racersPerHeat;
  if (isRaceGame(data.gameType)) {
    maxParticipants = Math.max(2, Math.min(64, Math.trunc(maxParticipants) || 2));
    racersPerHeat = Math.max(2, Math.min(8, Math.trunc(racersPerHeat) || 4));
    if (racersPerHeat > maxParticipants) racersPerHeat = maxParticipants;
  }

  const now = new Date().toISOString();
  const id = makeId("mg");
  const event: MinigameEvent = {
    id,
    eventCode: makeEventCode(),
    title: data.title,
    description: data.description,
    gameType: data.gameType,
    status: "lobby",
    entryFeeVnd: 0, // Strictly free welfare event!
    maxParticipants,
    racersPerHeat,
    prizes: data.prizes,
    participants: {},
    heats: [],
    activeHeatId: null,
    partyResult: null,
    winners: [],
    prizesDistributedAt: null,
    createdByUid: actor.uid,
    createdByName: actor.displayName || "Quản trị viên",
    createdAt: now,
    updatedAt: now,
  };

  await saveEventRaw(event);

  // Broadcast real device notification to Web & Android app users!
  await publishDeviceNotification({
    recipientUid: "all",
    type: "minigame_event",
    title: `🎉 Minigame mới: ${event.title}`,
    message: `Tham gia MIỄN PHÍ 100% — nhận quà phúc lợi trực tiếp từ Admin! (${event.eventCode})`,
    route: `/student/minigame/${event.id}`,
    actorName: event.createdByName,
  });

  return event;
}

/**
 * Adds virtual simulation bots so Admin can preview race/dice/lottery animations & effects anytime.
 * Bots are tagged `isBot: true` and are strictly excluded from real wallet prize credits.
 */
export async function fillMinigameWithBots(
  eventId: string,
  options?: { count?: number; clearFirst?: boolean }
): Promise<MinigameEvent> {
  const event = await getMinigameEvent(eventId);
  if (event.status !== "lobby") {
    throw new Error("Chỉ có thể thêm Bot ảo khi phòng đang ở trạng thái chờ đăng ký.");
  }

  const participants: Record<string, MinigameParticipant> = options?.clearFirst
    ? Object.fromEntries(
        Object.entries(event.participants || {}).filter(([, p]) => !p.isBot)
      )
    : { ...(event.participants || {}) };

  const currentCount = Object.keys(participants).length;
  const remaining = Math.max(0, event.maxParticipants - currentCount);
  const toAdd =
    typeof options?.count === "number" && options.count > 0
      ? Math.min(remaining, Math.trunc(options.count))
      : remaining;

  if (toAdd <= 0) {
    return event;
  }

  const allFaces = BAU_CUA_FACES.map((f) => f.id);
  const baseNow = Date.now();

  for (let i = 0; i < toAdd; i++) {
    const idx = currentCount + i;
    const botUid = `bot_${event.id.slice(-5)}_${idx + 1}_${crypto.randomBytes(2).toString("hex")}`;
    const botName = `🤖 ${BOT_NAMES[idx % BOT_NAMES.length]} #${idx + 1}`;

    let prediction: string | undefined;
    if (event.gameType === "tai_xiu") {
      prediction = crypto.randomInt(0, 2) === 0 ? "tai" : "xiu";
    } else if (event.gameType === "bau_cua") {
      prediction = allFaces[crypto.randomInt(0, allFaces.length)];
    } else if (event.gameType === "lucky_number") {
      // Spread numbers evenly across 00-99 for testing
      prediction = String(crypto.randomInt(0, 100)).padStart(2, "0");
    }

    participants[botUid] = {
      uid: botUid,
      displayName: botName,
      joinedAt: baseNow + i * 25,
      isBot: true,
      ...(prediction !== undefined ? { prediction } : {}),
      racerColor: RACER_PALETTE[idx % RACER_PALETTE.length],
      racerNumber: idx + 1,
    };
  }

  const updated: MinigameEvent = {
    ...event,
    participants,
    updatedAt: new Date().toISOString(),
  };
  await saveEventRaw(updated);
  return updated;
}

export async function clearMinigameBots(eventId: string): Promise<MinigameEvent> {
  const event = await getMinigameEvent(eventId);
  if (event.status !== "lobby") {
    throw new Error("Chỉ có thể xóa Bot ảo khi phòng đang ở trạng thái chờ.");
  }
  const realOnly = Object.fromEntries(
    Object.entries(event.participants || {}).filter(([, p]) => !p.isBot)
  );
  const updated: MinigameEvent = {
    ...event,
    participants: realOnly,
    updatedAt: new Date().toISOString(),
  };
  await saveEventRaw(updated);
  return updated;
}

/**
 * Resets an event back to lobby so Admin can replay bot demos or re-test animations cleanly.
 * Blocked if real monetary prizes were already distributed to real users.
 */
export async function resetMinigameForDemo(eventId: string): Promise<MinigameEvent> {
  const event = await getMinigameEvent(eventId);
  const hasRealPaidWinners = (event.winners || []).some(
    (w) => !w.isBot && w.distributed && w.prizeType === "wallet_vnd"
  );
  if (hasRealPaidWinners) {
    throw new Error("Không thể đặt lại sự kiện đã cộng thưởng tiền thật cho học sinh.");
  }

  const updated: MinigameEvent = {
    ...event,
    status: "lobby",
    heats: [],
    activeHeatId: null,
    partyResult: null,
    winners: [],
    prizesDistributedAt: null,
    updatedAt: new Date().toISOString(),
  };
  await saveEventRaw(updated);
  return updated;
}

/**
 * Starts the minigame event:
 * - For horse_race / bee_race: locks lobby, builds Round 0 tournament heats (4/8/16/32 bracket),
 *   and sets activeHeatId to the first heat (ready for Admin to click "Xuất phát lượt đua"!).
 * - For tai_xiu / bau_cua / lucky_number: draws cryptographically secure result,
 *   evaluates winners immediately, and finishes the event so clients play the reveal animation!
 */
export async function startMinigameEvent(eventId: string): Promise<MinigameEvent> {
  const event = await getMinigameEvent(eventId);
  if (event.status !== "lobby") {
    throw new Error("Sự kiện không ở trạng thái mở đăng ký.");
  }

  const participantUids = Object.keys(event.participants || {});
  if (isRaceGame(event.gameType)) {
    if (participantUids.length < 2) {
      throw new Error("Cần ít nhất 2 người chơi đăng ký để mở đường đua.");
    }
    const seed = crypto.randomInt(100000, 999999999);
    const heats = buildInitialRaceHeats(participantUids, event.racersPerHeat, seed, 14000);
    const updated: MinigameEvent = {
      ...event,
      status: "running",
      heats,
      activeHeatId: heats[0]?.heatId || null,
      updatedAt: new Date().toISOString(),
    };
    await saveEventRaw(updated);
    return updated;
  }

  // Party games (Tài Xỉu, Bầu Cua, Đoán số may mắn)
  if (participantUids.length < 1) {
    throw new Error("Cần ít nhất 1 người chơi tham gia trước khi quay thưởng.");
  }

  const revealedAtMs = Date.now() + 3600; // 3.6s suspenseful roll/spin animation synced across all screens!
  let partyResult = event.partyResult;
  let winners = event.winners;

  if (event.gameType === "tai_xiu") {
    const dice: [number, number, number] = [
      crypto.randomInt(1, 7),
      crypto.randomInt(1, 7),
      crypto.randomInt(1, 7),
    ];
    const evalRes = evaluateTaiXiuWinners(dice, event.participants, event.prizes, revealedAtMs);
    partyResult = evalRes.result;
    winners = evalRes.winners;
  } else if (event.gameType === "bau_cua") {
    const allFaces = BAU_CUA_FACES.map((f) => f.id);
    const faces: [BauCuaFace, BauCuaFace, BauCuaFace] = [
      allFaces[crypto.randomInt(0, allFaces.length)],
      allFaces[crypto.randomInt(0, allFaces.length)],
      allFaces[crypto.randomInt(0, allFaces.length)],
    ];
    const evalRes = evaluateBauCuaWinners(faces, event.participants, event.prizes, revealedAtMs);
    partyResult = evalRes.result;
    winners = evalRes.winners;
  } else if (event.gameType === "lucky_number") {
    const winningNum = crypto.randomInt(0, 100);
    const evalRes = evaluateLuckyNumberWinners(
      winningNum,
      event.participants,
      event.prizes,
      revealedAtMs
    );
    partyResult = evalRes.result;
    winners = evalRes.winners;
  }

  const updated: MinigameEvent = {
    ...event,
    status: "finished",
    partyResult,
    winners,
    updatedAt: new Date().toISOString(),
  };
  await saveEventRaw(updated);
  return updated;
}

/**
 * Starts a specific race heat (generates seeded realistic race curves & starts 3s countdown).
 */
export async function launchRaceHeat(eventId: string, heatId?: string): Promise<MinigameEvent> {
  const event = await getMinigameEvent(eventId);
  if (!isRaceGame(event.gameType) || event.status !== "running") {
    throw new Error("Sự kiện đua hiện không ở trạng thái đang diễn ra.");
  }

  const targetId =
    heatId ||
    event.heats.find((h) => h.status === "pending")?.heatId ||
    event.activeHeatId;

  const heatIdx = event.heats.findIndex((h) => h.heatId === targetId);
  if (heatIdx < 0) {
    throw new Error("Không tìm thấy lượt đua cần xuất phát.");
  }

  const targetHeat = event.heats[heatIdx];
  // Idempotent: if already racing or completed, return current state cleanly instead of 400
  if (targetHeat.status === "racing" || targetHeat.status === "completed") {
    return event;
  }

  const freshSeed = crypto.randomInt(100000, 999999999);
  const durationMs = targetHeat.durationMs || 14000;
  const sim = simulateRaceHeat(targetHeat.laneUids, freshSeed, durationMs);
  const startAtMs = Date.now() + 3000; // 3-second synced countdown

  const updatedHeat: MinigameRaceHeat = {
    ...targetHeat,
    status: "racing",
    seed: freshSeed,
    startAtMs,
    durationMs,
    finishOrder: sim.finishOrder,
    finishTimesMs: sim.finishTimesMs,
    speedProfiles: sim.speedProfiles,
  };

  const nextHeats = [...event.heats];
  nextHeats[heatIdx] = updatedHeat;

  const updated: MinigameEvent = {
    ...event,
    heats: nextHeats,
    activeHeatId: updatedHeat.heatId,
    updatedAt: new Date().toISOString(),
  };
  await saveEventRaw(updated);
  return updated;
}

/**
 * Marks a racing heat as completed, advances tournament bracket (Semifinals / Final),
 * and crowns Top 1/2/3 winners when the Final heat finishes.
 */
export async function completeRaceHeat(eventId: string, heatId?: string): Promise<MinigameEvent> {
  const event = await getMinigameEvent(eventId);
  if (!isRaceGame(event.gameType) || event.status !== "running") {
    return event;
  }

  const targetId = heatId || event.activeHeatId;
  const heatIdx = event.heats.findIndex((h) => h.heatId === targetId);
  if (heatIdx < 0) throw new Error("Không tìm thấy lượt đua cần chốt.");

  const currentHeat = event.heats[heatIdx];
  // Idempotent guard: prevent duplicate auto-complete / manual-click 400 errors
  if (currentHeat.status === "completed") {
    return event;
  }
  if (currentHeat.status === "pending") {
    return event;
  }

  const heatsCopy = [...event.heats];
  heatsCopy[heatIdx] = {
    ...currentHeat,
    status: "completed",
  };

  const seed = crypto.randomInt(100000, 999999999);
  const advanced = advanceRaceTournamentIfReady(
    heatsCopy,
    event.racersPerHeat,
    seed,
    currentHeat.durationMs || 14000
  );

  let status: MinigameEvent["status"] = event.status;
  let winners = event.winners;
  let nextActiveHeatId: string | null =
    advanced.heats.find((h) => h.status === "pending")?.heatId || currentHeat.heatId;

  if (advanced.tournamentFinished) {
    status = "finished";
    const finalHeat = advanced.heats.find((h) => h.isFinal);
    // Merge finish times across heats (latest round / final heat wins) so all ranked winners show timing
    const mergedFinishTimesMs: Record<string, number> = {};
    for (const h of [...advanced.heats].sort((a, b) => a.roundIndex - b.roundIndex)) {
      Object.assign(mergedFinishTimesMs, h.finishTimesMs || {});
    }
    winners = buildRaceWinners(
      advanced.rankedUids,
      event.participants,
      event.prizes,
      mergedFinishTimesMs
    );
    nextActiveHeatId = finalHeat?.heatId || currentHeat.heatId;
  }

  const updated: MinigameEvent = {
    ...event,
    status,
    heats: advanced.heats,
    activeHeatId: nextActiveHeatId,
    winners,
    updatedAt: new Date().toISOString(),
  };
  await saveEventRaw(updated);
  return updated;
}

/**
 * Idempotently distributes configured rewards to all winners:
 * - `wallet_vnd`: atomically credits Ví DkTEST (`wallets/{uid}`) + writes `wallet_transactions` (`minigame_reward_credit`).
 * - `voucher` & `custom_gift`: marks distributed so winners see their voucher/gift badge immediately.
 */
export async function distributeMinigamePrizes(
  eventId: string,
  actor: { uid: string; displayName?: string }
): Promise<{ event: MinigameEvent; creditedCount: number; totalCreditedVnd: number }> {
  const event = await getMinigameEvent(eventId);
  if (event.status !== "finished") {
    throw new Error("Chỉ có thể trao thưởng khi sự kiện đã kết thúc và có danh sách thắng giải.");
  }

  const now = new Date().toISOString();
  let creditedCount = 0;
  let totalCreditedVnd = 0;
  const updatedWinners = [...(event.winners || [])];

  for (let i = 0; i < updatedWinners.length; i++) {
    const w = updatedWinners[i];
    if (w.distributed) continue;

    // SAFETY: Virtual test bots NEVER receive real Ví DkTEST balance!
    if (w.isBot || w.uid.startsWith("bot_")) {
      updatedWinners[i] = {
        ...w,
        isBot: true,
        distributed: true,
        distributedAt: now,
        matchDetail: `${w.matchDetail || ""} (Bot thử nghiệm — không cộng tiền thật)`.trim(),
      };
      continue;
    }

    if (w.prizeType === "wallet_vnd" && (w.amountVnd || 0) > 0) {
      const rewardVnd = sanitizeVnd(w.amountVnd);
      const walletTxId = `wtx_mg_${event.id}_${w.uid}_${w.rank}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
      const initialWallet = await getOrCreateWallet(w.uid, { fullName: w.displayName });

      if (adminDb) {
        await adminDb.runTransaction(async (tx) => {
          const txRef = adminDb!.collection("wallet_transactions").doc(walletTxId);
          const existingTx = await tx.get(txRef);
          if (existingTx.exists) return; // Idempotency guard

          const walletRef = adminDb!.collection("wallets").doc(w.uid);
          const walletSnap = await tx.get(walletRef);
          const currentWallet = (walletSnap.exists ? walletSnap.data() : initialWallet) as StudentWallet;
          const before = sanitizeVnd(currentWallet.balanceVnd);
          const after = before + rewardVnd;

          tx.set(
            walletRef,
            {
              ...currentWallet,
              uid: w.uid,
              balanceVnd: after,
              totalCreditedVnd: sanitizeVnd(currentWallet.totalCreditedVnd) + rewardVnd,
              updatedAt: now,
            },
            { merge: true }
          );

          const walletTx: WalletTransaction = {
            id: walletTxId,
            uid: w.uid,
            type: "minigame_reward_credit",
            amountVnd: rewardVnd,
            balanceBeforeVnd: before,
            balanceAfterVnd: after,
            studentNameSnapshot: currentWallet.fullName || w.displayName,
            studentClassSnapshot: currentWallet.currentClass || "",
            idempotencyKey: walletTxId,
            actorUid: actor.uid,
            actorName: actor.displayName || "Admin",
            note: `Thưởng Minigame "${event.title}" — ${w.prizeLabel}`,
            description: `Thưởng Minigame "${event.title}" — ${w.prizeLabel}`,
            createdAt: now,
            metadata: {
              minigameEventId: event.id,
              minigameCode: event.eventCode,
              rank: w.rank,
            },
          };
          tx.set(txRef, walletTx);
        });
      } else {
        const existingTx = await getFirestoreRestDoc("wallet_transactions", walletTxId, false);
        if (!existingTx) {
          const currentWallet = (await getFirestoreRestDoc("wallets", w.uid, false)) || initialWallet;
          const before = sanitizeVnd(currentWallet.balanceVnd);
          const after = before + rewardVnd;
          await setFirestoreRestDoc("wallets", w.uid, {
            ...currentWallet,
            uid: w.uid,
            balanceVnd: after,
            totalCreditedVnd: sanitizeVnd(currentWallet.totalCreditedVnd) + rewardVnd,
            updatedAt: now,
          });
          const walletTx: WalletTransaction = {
            id: walletTxId,
            uid: w.uid,
            type: "minigame_reward_credit",
            amountVnd: rewardVnd,
            balanceBeforeVnd: before,
            balanceAfterVnd: after,
            studentNameSnapshot: currentWallet.fullName || w.displayName,
            studentClassSnapshot: currentWallet.currentClass || "",
            idempotencyKey: walletTxId,
            actorUid: actor.uid,
            actorName: actor.displayName || "Admin",
            note: `Thưởng Minigame "${event.title}" — ${w.prizeLabel}`,
            description: `Thưởng Minigame "${event.title}" — ${w.prizeLabel}`,
            createdAt: now,
            metadata: {
              minigameEventId: event.id,
              minigameCode: event.eventCode,
              rank: w.rank,
            },
          };
          await setFirestoreRestDoc("wallet_transactions", walletTxId, walletTx);
        }
      }

      updatedWinners[i] = {
        ...w,
        distributed: true,
        distributedAt: now,
        walletTransactionId: walletTxId,
      };
      creditedCount++;
      totalCreditedVnd += rewardVnd;
      invalidateStudentDetailsCache(w.uid);
    } else {
      updatedWinners[i] = {
        ...w,
        distributed: true,
        distributedAt: now,
      };
      creditedCount++;
    }

    // Send real device notification to the winning student!
    await publishDeviceNotification({
      recipientUid: w.uid,
      type: "minigame_reward",
      title: `🏆 Chúc mừng trúng giải: ${event.title}`,
      message:
        w.prizeType === "wallet_vnd"
          ? `Bạn vừa nhận +${(w.amountVnd || 0).toLocaleString("vi-VN")}đ vào Ví DkTEST (${w.prizeLabel})!`
          : w.prizeType === "voucher"
          ? `Bạn nhận được mã Voucher ${w.voucherCode || ""} (${w.prizeLabel})!`
          : `Bạn nhận được phần quà: ${w.customTitle || w.prizeLabel}!`,
      route: `/student/minigame/${event.id}`,
      actorName: actor.displayName || "DkTEST",
    });
  }

  invalidateWalletOverviewCache();

  const updated: MinigameEvent = {
    ...event,
    winners: updatedWinners,
    prizesDistributedAt: now,
    updatedAt: now,
  };
  await saveEventRaw(updated);
  return { event: updated, creditedCount, totalCreditedVnd };
}

export async function cancelOrDeleteMinigameEvent(
  eventId: string,
  hardDelete = false
): Promise<void> {
  const event = await getEventRaw(eventId);
  if (!event) return;
  if (hardDelete) {
    liveCheersByEvent.delete(event.id);
    await deleteEventRaw(event.id);
    return;
  }
  await saveEventRaw({
    ...event,
    status: "cancelled",
    updatedAt: new Date().toISOString(),
  });
}
