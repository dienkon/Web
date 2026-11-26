import { describe, it, expect } from "vitest";
import {
  LUCKY_WHEEL_SECTORS,
  evaluateLuckyWheelWinners,
  evaluateMinigameSchedule,
  evaluateMysteryBoxWinners,
  evaluateTreasureFlipWinners,
  formatMinigameCountdown,
} from "./gameLogic";
import { isValidMinigameType, getMinigameArtwork } from "./minigameAssets";
import { addLiveMinigameChat, listLiveMinigameChat } from "../../../server/services/minigameService";
import type { MinigameParticipant, MinigamePrize } from "../../types/minigame";

const collectivePrize: MinigamePrize[] = [
  { rank: 0, label: "Trúng giải phúc lợi", type: "wallet_vnd", amountVnd: 15000 },
];

function makeParticipant(uid: string, prediction: string, joinedAt: number): MinigameParticipant {
  return {
    uid,
    displayName: `User ${uid}`,
    joinedAt,
    prediction,
    racerColor: "#2563eb",
    racerNumber: 1,
  };
}

describe("Minigame v2.0.6: 3 new games, schedule evaluator & realtime chat", () => {
  it("recognizes all 8 minigame types and resolves artwork metadata", () => {
    const allTypes = [
      "horse_race",
      "bee_race",
      "tai_xiu",
      "bau_cua",
      "lucky_number",
      "lucky_wheel",
      "treasure_flip",
      "mystery_box",
    ];
    for (const t of allTypes) {
      expect(isValidMinigameType(t)).toBe(true);
      expect(getMinigameArtwork(t).imagePath).toMatch(/^\/images\/minigames\/.+\.jpg$/);
    }
  });

  it("evaluates Lucky Wheel winners accurately", () => {
    const sector = LUCKY_WHEEL_SECTORS[2]; // ngoi_sao
    const participants = {
      u1: makeParticipant("u1", sector.id, 100),
      u2: makeParticipant("u2", "kim_cuong", 200),
      u3: makeParticipant("u3", sector.id, 300),
    };
    const { result, winners } = evaluateLuckyWheelWinners(2, participants, collectivePrize, 9999);
    expect(result.wheelSectorIndex).toBe(2);
    expect(result.wheelSectorId).toBe(sector.id);
    expect(winners.map((w) => w.uid)).toEqual(["u1", "u3"]);
  });

  it("evaluates Treasure Flip (2 golden chests out of 9) winners accurately", () => {
    const participants = {
      u1: makeParticipant("u1", "2", 100),
      u2: makeParticipant("u2", "5", 200),
      u3: makeParticipant("u3", "7", 300),
    };
    const { result, winners } = evaluateTreasureFlipWinners([7, 2], participants, collectivePrize, 9999);
    expect(result.treasureWinningIndices).toEqual([2, 7]);
    expect(winners.map((w) => w.uid)).toEqual(["u1", "u3"]);
  });

  it("evaluates Mystery Box winners accurately", () => {
    const participants = {
      u1: makeParticipant("u1", "4", 100),
      u2: makeParticipant("u2", "6", 200),
    };
    const { result, winners } = evaluateMysteryBoxWinners(6, participants, collectivePrize, 9999);
    expect(result.mysteryWinningBox).toBe(6);
    expect(winners.map((w) => w.uid)).toEqual(["u2"]);
  });

  it("evaluates custom schedules (upcoming, open, closed) and formats countdowns", () => {
    const now = Date.parse("2026-11-26T10:00:00.000Z");
    expect(evaluateMinigameSchedule({}, now).phase).toBe("unscheduled");
    expect(
      evaluateMinigameSchedule(
        { scheduledStartAt: "2026-11-26T10:15:00.000Z", scheduledEndAt: "2026-11-26T11:00:00.000Z" },
        now
      )
    ).toMatchObject({ phase: "upcoming", startsInMs: 15 * 60_000 });
    expect(
      evaluateMinigameSchedule(
        { scheduledStartAt: "2026-11-26T09:30:00.000Z", scheduledEndAt: "2026-11-26T10:30:00.000Z" },
        now
      )
    ).toMatchObject({ phase: "open", endsInMs: 30 * 60_000 });
    expect(
      evaluateMinigameSchedule(
        { scheduledStartAt: "2026-11-26T08:00:00.000Z", scheduledEndAt: "2026-11-26T09:00:00.000Z" },
        now
      ).phase
    ).toBe("closed");

    expect(formatMinigameCountdown(65_000)).toBe("01:05");
    expect(formatMinigameCountdown(3_661_000)).toBe("01:01:01");
  });

  it("sanitizes and buffers live minigame room chat with zero Firestore reads", () => {
    const eventId = `evt_chat_${Date.now()}`;
    const msg = addLiveMinigameChat(eventId, {
      uid: "stu_1",
      displayName: "Minh Anh",
      message: "  Chúc mọi người\nmay mắn!  ",
    });
    expect(msg.message).toBe("Chúc mọi người may mắn!");
    const list = listLiveMinigameChat(eventId);
    expect(list.length).toBe(1);
    expect(list[0].uid).toBe("stu_1");

    expect(() =>
      addLiveMinigameChat(eventId, { uid: "stu_1", displayName: "Minh Anh", message: "   " })
    ).toThrow();
  });
});
