import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import type { MinigameChatMessage, MinigameParticipant, MinigameType } from "../../types/minigame";
import {
  CLAW_PLUSHIES,
  MINIGAME_TYPE_META,
  PENALTY_WINNING_ZONE_COUNT,
  PENALTY_ZONES,
  PLINKO_SLOTS,
  buildPlinkoBouncePath,
  evaluateClawMachineWinners,
  evaluatePenaltyShootoutWinners,
  evaluatePlinkoDropWinners,
} from "./gameLogic";
import { getMinigameArtwork, isValidMinigameType } from "./minigameAssets";
import { buildInitialRaceHeats } from "./raceEngine";
import { mergeChatMessagesMonotonically } from "../minigameClientService";
import { addLiveMinigameChat, listLiveMinigameChat } from "../../../server/services/minigameService";

const ALL_TWELVE_TYPES: MinigameType[] = [
  "horse_race",
  "bee_race",
  "duck_race",
  "lucky_wheel",
  "plinko_drop",
  "penalty_shootout",
  "claw_machine",
  "treasure_flip",
  "mystery_box",
  "tai_xiu",
  "bau_cua",
  "lucky_number",
];

describe("Minigame v2.1.1 — 12 Live Games, Artwork & Zero-Jitter Unified Chat", () => {
  it("registers all 12 MinigameType entries with existing 1200x630 JPG artwork banners", () => {
    expect(Object.keys(MINIGAME_TYPE_META)).toHaveLength(12);
    for (const type of ALL_TWELVE_TYPES) {
      expect(isValidMinigameType(type)).toBe(true);
      const art = getMinigameArtwork(type);
      expect(art.gameType).toBe(type);
      expect(art.imagePath.startsWith("/images/minigames/")).toBe(true);
      const absPath = path.join(process.cwd(), "public", art.imagePath.replace(/^\//, ""));
      expect(fs.existsSync(absPath)).toBe(true);
      expect(fs.statSync(absPath).size).toBeGreaterThan(5_000);
    }
  });

  it("evaluates Plinko Drop path and awards winners accurately", () => {
    for (let slotIdx = 0; slotIdx < PLINKO_SLOTS.length; slotIdx++) {
      const pathNodes = buildPlinkoBouncePath(slotIdx, 2026);
      expect(pathNodes.length).toBeGreaterThanOrEqual(8);
      expect(pathNodes[pathNodes.length - 1]).toBe(slotIdx);
    }

    const participants: Record<string, MinigameParticipant> = {
      u1: {
        uid: "u1",
        displayName: "An",
        racerNumber: 1,
        racerColor: "#0ea5e9",
        prediction: "4",
        joinedAt: 100,
      },
      bot1: {
        uid: "bot1",
        displayName: "Bot Vui",
        isBot: true,
        racerNumber: 2,
        racerColor: "#f43f5e",
        prediction: "4",
        joinedAt: 101,
      },
      u2: {
        uid: "u2",
        displayName: "Bình",
        racerNumber: 3,
        racerColor: "#10b981",
        prediction: "1",
        joinedAt: 102,
      },
    };

    const { result, winners } = evaluatePlinkoDropWinners(
      3, // slotIndex 3 => id "4"
      participants,
      [{ rank: 0, label: "Trúng cổng Bóng Ziczac", type: "wallet_vnd", amountVnd: 10000 }],
      4000,
      123456
    );

    expect(result.plinkoSlotIndex).toBe(3);
    expect(result.plinkoSlotId).toBe("4");
    expect(result.plinkoPath?.[result.plinkoPath.length - 1]).toBe(3);
    expect(winners.map((w) => w.uid)).toEqual(["u1", "bot1"]);
    expect(winners[0].amountVnd).toBe(10000);
    expect(winners[1].isBot).toBe(true);
  });

  it("evaluates Penalty Shootout with 2 winning goal zones and 1 keeper save zone", () => {
    expect(PENALTY_ZONES).toHaveLength(5);
    expect(PENALTY_WINNING_ZONE_COUNT).toBe(2);

    const participants: Record<string, MinigameParticipant> = {
      u1: {
        uid: "u1",
        displayName: "Cầu Thủ A",
        racerNumber: 1,
        racerColor: "#10b981",
        prediction: "1",
        joinedAt: 10,
      },
      u2: {
        uid: "u2",
        displayName: "Cầu Thủ B",
        racerNumber: 2,
        racerColor: "#f59e0b",
        prediction: "5",
        joinedAt: 20,
      },
      u3: {
        uid: "u3",
        displayName: "Cầu Thủ C",
        racerNumber: 3,
        racerColor: "#ef4444",
        prediction: "3",
        joinedAt: 30,
      },
    };

    const { result, winners } = evaluatePenaltyShootoutWinners(
      [1, 5],
      3,
      participants,
      [{ rank: 0, label: "Sút vào lưới", type: "wallet_vnd", amountVnd: 15000 }],
      4200
    );

    expect(result.penaltyWinningZones).toEqual([1, 5]);
    expect(result.penaltyKeeperZone).toBe(3);
    expect(winners.map((w) => w.uid)).toEqual(["u1", "u2"]);
  });

  it("evaluates Claw Machine plushie grab and Duck Race tournament heats", () => {
    expect(CLAW_PLUSHIES).toHaveLength(8);

    const targetPlushie = CLAW_PLUSHIES[2];
    const participants: Record<string, MinigameParticipant> = {
      u1: {
        uid: "u1",
        displayName: "Lan",
        racerNumber: 1,
        racerColor: "#ec4899",
        prediction: targetPlushie.id,
        joinedAt: 50,
      },
      u2: {
        uid: "u2",
        displayName: "Mai",
        racerNumber: 2,
        racerColor: "#8b5cf6",
        prediction: CLAW_PLUSHIES[6].id,
        joinedAt: 60,
      },
    };

    const { result, winners } = evaluateClawMachineWinners(
      2,
      participants,
      [{ rank: 0, label: "Gắp trúng thú", type: "wallet_vnd", amountVnd: 12000 }],
      4500
    );

    expect(result.clawPlushieId).toBe(targetPlushie.id);
    expect(winners.map((w) => w.uid)).toEqual(["u1"]);

    // Duck race initial Round 0 heats with 8 ducks, 4 per heat -> 2 Semi-Final heats
    const duckUids = Array.from({ length: 8 }, (_, i) => `duck_${i + 1}`);
    const heats = buildInitialRaceHeats(duckUids, 4, 14000, 777);
    expect(heats).toHaveLength(2);
    expect(heats[0].laneUids).toHaveLength(4);
    expect(heats[0].isFinal).toBe(false);
  });

  it("merges realtime chat monotonically without wiping, shrinking, or duplicating optimistic IDs", () => {
    const store = new Map<string, MinigameChatMessage>();
    const now = Date.now();

    // 1. Optimistic message sent locally with pending=true
    const afterOptimistic = mergeChatMessagesMonotonically(
      store,
      [
        {
          id: "chat_abc_1",
          uid: "u1",
          displayName: "Minh",
          message: "Chào mọi người ở sảnh chung!",
          roomTag: "Sảnh Minigame",
          pending: true,
          createdAt: now - 2000,
        },
      ],
      now
    );
    expect(afterOptimistic).toHaveLength(1);
    expect(afterOptimistic[0].pending).toBe(true);

    // 2. Empty snapshot or cold-Lambda partial poll arrives -> NEVER wipes existing messages!
    const afterEmptyPoll = mergeChatMessagesMonotonically(store, [], now);
    expect(afterEmptyPoll).toHaveLength(1);
    expect(afterEmptyPoll[0].id).toBe("chat_abc_1");

    // 3. Server confirms same deterministic ID + another student chats from Solo Arcade
    const afterServerConfirm = mergeChatMessagesMonotonically(
      store,
      [
        {
          id: "chat_abc_1",
          uid: "u1",
          displayName: "Minh",
          message: "Chào mọi người ở sảnh chung!",
          roomTag: "Sảnh Minigame",
          pending: false,
          createdAt: now - 1950,
        },
        {
          id: "chat_xyz_2",
          uid: "u2",
          displayName: "Hà",
          message: "Mình vừa đạt 260đ Toán Nhẩm 0đ!",
          roomTag: "🎮 Tự chơi 0đ",
          pending: false,
          createdAt: now - 500,
        },
      ],
      now
    );

    expect(afterServerConfirm).toHaveLength(2);
    expect(afterServerConfirm[0].id).toBe("chat_abc_1");
    expect(afterServerConfirm[0].pending).toBe(false);
    expect(afterServerConfirm[1].roomTag).toBe("🎮 Tự chơi 0đ");

    // 4. Server in-memory helper is also idempotent on repeated client ID
    const room = `test_v211_${now}`;
    addLiveMinigameChat(room, {
      id: "same_id_99",
      uid: "u1",
      displayName: "Minh",
      message: "Tin nhắn không nhân đôi",
      roomTag: "Đua Vịt",
    });
    addLiveMinigameChat(room, {
      id: "same_id_99",
      uid: "u1",
      displayName: "Minh",
      message: "Tin nhắn không nhân đôi",
      roomTag: "Đua Vịt",
    });
    const listAfterRetry = listLiveMinigameChat(room);
    expect(listAfterRetry.filter((m) => m.id === "same_id_99")).toHaveLength(1);
    expect(listAfterRetry[0].roomTag).toBe("Đua Vịt");
  });
});
