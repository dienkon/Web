import { describe, expect, it } from "vitest";
import {
  advanceRaceTournamentIfReady,
  buildInitialRaceHeats,
  evaluateRacerAtTime,
  simulateRaceHeat,
} from "../src/services/minigame/raceEngine";
import {
  buildRaceWinners,
  evaluateBauCuaWinners,
  evaluateLuckyNumberWinners,
  evaluateTaiXiuWinners,
  getDefaultRankLabel,
} from "../src/services/minigame/gameLogic";
import { createMinigameSchema } from "../server/services/minigameService";
import {
  buildSeedServiceRecords,
  resolveServiceStorefrontMeta,
} from "../src/services/aiShop/initialCatalog";
import type { MinigameParticipant, MinigamePrize } from "../src/types/minigame";

function makeParticipants(count: number): Record<string, MinigameParticipant> {
  const map: Record<string, MinigameParticipant> = {};
  for (let i = 1; i <= count; i++) {
    const uid = `u${i}`;
    map[uid] = {
      uid,
      displayName: `Học sinh ${i}`,
      joinedAt: 1000 + i * 100,
      racerColor: "#ef4444",
      racerNumber: i,
    };
  }
  return map;
}

describe("Minigame Race Engine & Tournament Brackets (4 / 8 / 16 / 32)", () => {
  it("simulates deterministic race heats with monotonic progress matching official finish order", () => {
    const lanes = ["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8"];
    const sim1 = simulateRaceHeat(lanes, 123456, 14000);
    const sim2 = simulateRaceHeat(lanes, 123456, 14000);

    expect(sim1).toEqual(sim2);
    expect(sim1.finishOrder).toHaveLength(8);
    expect(new Set(sim1.finishOrder).size).toBe(8);

    const heat = {
      heatId: "r0_h0",
      roundIndex: 0,
      roundName: "Chung Kết",
      heatIndex: 0,
      isFinal: true,
      status: "racing" as const,
      laneUids: lanes,
      advanceCount: 3,
      seed: 123456,
      startAtMs: 10000,
      durationMs: 14000,
      ...sim1,
    };

    // Check monotonic progress from t=0 to finishTime for every racer
    for (const uid of lanes) {
      let prev = 0;
      for (let t = 0; t <= 14000; t += 500) {
        const st = evaluateRacerAtTime(heat, uid, 10000 + t);
        expect(st.progress).toBeGreaterThanOrEqual(prev - 1e-9);
        expect(st.progress).toBeLessThanOrEqual(1);
        prev = st.progress;
      }
      const atFinish = evaluateRacerAtTime(heat, uid, 10000 + heat.finishTimesMs[uid]);
      expect(atFinish.progress).toBe(1);
      expect(atFinish.isFinished).toBe(true);
    }
  });

  it("runs a complete 16-player tournament (4 racers/heat) from Round 0 -> Semifinals -> Final podium", () => {
    const uids = Array.from({ length: 16 }, (_, i) => `u${i + 1}`);
    let heats = buildInitialRaceHeats(uids, 4, 4242);
    // 16 players with 4 per heat -> 4 heats in Round 0
    expect(heats).toHaveLength(4);
    expect(heats.every((h) => h.laneUids.length === 4)).toBe(true);

    // Complete Round 0 heats
    heats = heats.map((h) => ({
      ...h,
      status: "completed" as const,
      ...simulateRaceHeat(h.laneUids, h.seed, h.durationMs),
    }));

    const afterR0 = advanceRaceTournamentIfReady(heats, 4, 4242);
    expect(afterR0.tournamentFinished).toBe(false);
    const r1Heats = afterR0.heats.filter((h) => h.roundIndex === 1);
    expect(r1Heats).toHaveLength(2); // 8 qualifiers -> 2 Semifinal heats of 4

    // Complete Round 1 (Semifinals)
    heats = afterR0.heats.map((h) =>
      h.status === "completed"
        ? h
        : {
            ...h,
            status: "completed" as const,
            ...simulateRaceHeat(h.laneUids, h.seed, h.durationMs),
          }
    );

    const afterR1 = advanceRaceTournamentIfReady(heats, 4, 4242);
    expect(afterR1.tournamentFinished).toBe(false);
    const finalHeats = afterR1.heats.filter((h) => h.roundIndex === 2);
    expect(finalHeats).toHaveLength(1);
    expect(finalHeats[0].isFinal).toBe(true);
    expect(finalHeats[0].laneUids).toHaveLength(4);

    // Complete Final
    heats = afterR1.heats.map((h) =>
      h.status === "completed"
        ? h
        : {
            ...h,
            status: "completed" as const,
            ...simulateRaceHeat(h.laneUids, h.seed, h.durationMs),
          }
    );

    const afterFinal = advanceRaceTournamentIfReady(heats, 4, 4242);
    expect(afterFinal.tournamentFinished).toBe(true);
    expect(afterFinal.podiumUids).toHaveLength(3);
    expect(new Set(afterFinal.podiumUids).size).toBe(3);
  });

  it("supports 32-player tournament with 8 racers/heat smoothly to Final podium", () => {
    const uids = Array.from({ length: 32 }, (_, i) => `u${i + 1}`);
    let heats = buildInitialRaceHeats(uids, 8, 999);
    expect(heats).toHaveLength(4);
    expect(heats.every((h) => h.laneUids.length === 8)).toBe(true);

    // Complete Round 0 -> top 2 of each heat (8 racers) go directly to Final of 8!
    heats = heats.map((h) => ({
      ...h,
      status: "completed" as const,
      ...simulateRaceHeat(h.laneUids, h.seed, h.durationMs),
    }));
    const afterR0 = advanceRaceTournamentIfReady(heats, 8, 999);
    const finals = afterR0.heats.filter((h) => h.roundIndex === 1);
    expect(finals).toHaveLength(1);
    expect(finals[0].isFinal).toBe(true);
    expect(finals[0].laneUids).toHaveLength(8);
  });

  it("supports 2-player head-to-head race directly into Final and awards custom 1-prize or 2-prize setups with arbitrary VND amounts", () => {
    const participants = makeParticipants(2);
    const uids = ["u1", "u2"];
    let heats = buildInitialRaceHeats(uids, 2, 777);
    expect(heats).toHaveLength(1);
    expect(heats[0].isFinal).toBe(true);
    expect(heats[0].laneUids).toHaveLength(2);

    heats = heats.map((h) => ({
      ...h,
      status: "completed" as const,
      ...simulateRaceHeat(h.laneUids, h.seed, h.durationMs),
    }));

    const afterFinal = advanceRaceTournamentIfReady(heats, 2, 777);
    expect(afterFinal.tournamentFinished).toBe(true);
    expect(afterFinal.rankedUids).toHaveLength(2);

    // Case A: Only 1 prize (less than 3) with odd custom VND amount 7.777đ
    const singlePrize: MinigamePrize[] = [
      { rank: 1, label: "Vô địch 1v1", type: "wallet_vnd", amountVnd: 7777 },
    ];
    const winners1 = buildRaceWinners(
      afterFinal.rankedUids,
      participants,
      singlePrize,
      heats[0].finishTimesMs
    );
    expect(winners1).toHaveLength(1);
    expect(winners1[0].rank).toBe(1);
    expect(winners1[0].amountVnd).toBe(7777);

    // Case B: 2 prizes with exact custom amounts 12.345đ and 1.111đ
    const twoPrizes: MinigamePrize[] = [
      { rank: 1, label: "Giải Nhất", type: "wallet_vnd", amountVnd: 12345 },
      { rank: 2, label: "Giải Nhì", type: "wallet_vnd", amountVnd: 1111 },
    ];
    const winners2 = buildRaceWinners(
      afterFinal.rankedUids,
      participants,
      twoPrizes,
      heats[0].finishTimesMs
    );
    expect(winners2).toHaveLength(2);
    expect(winners2.map((w) => ({ rank: w.rank, amountVnd: w.amountVnd }))).toEqual([
      { rank: 1, amountVnd: 12345 },
      { rank: 2, amountVnd: 1111 },
    ]);
  });

  it("never creates a 1-racer heat (e.g. 6 players with 2/heat) and awards >3 prizes (e.g. 5 prizes) across final + runner-up rankings", () => {
    const participants = makeParticipants(6);
    const uids = Object.keys(participants);
    let heats = buildInitialRaceHeats(uids, 2, 555);
    expect(heats).toHaveLength(3);
    expect(heats.every((h) => h.laneUids.length === 2)).toBe(true);

    // Complete Round 0 -> 3 qualifiers -> must merge into a 3-racer Final (never [2, 1])!
    heats = heats.map((h) => ({
      ...h,
      status: "completed" as const,
      ...simulateRaceHeat(h.laneUids, h.seed, h.durationMs),
    }));
    const afterR0 = advanceRaceTournamentIfReady(heats, 2, 555);
    expect(afterR0.tournamentFinished).toBe(false);
    const r1 = afterR0.heats.filter((h) => h.roundIndex === 1);
    expect(r1).toHaveLength(1);
    expect(r1[0].isFinal).toBe(true);
    expect(r1[0].laneUids).toHaveLength(3);

    heats = afterR0.heats.map((h) =>
      h.status === "completed"
        ? h
        : {
            ...h,
            status: "completed" as const,
            ...simulateRaceHeat(h.laneUids, h.seed, h.durationMs),
          }
    );
    const afterFinal = advanceRaceTournamentIfReady(heats, 2, 555);
    expect(afterFinal.tournamentFinished).toBe(true);
    expect(afterFinal.rankedUids).toHaveLength(6);
    expect(new Set(afterFinal.rankedUids).size).toBe(6);

    // Award 5 prizes (>3 prizes!) with arbitrary VND amounts
    const fivePrizes: MinigamePrize[] = [
      { rank: 1, label: getDefaultRankLabel(1), type: "wallet_vnd", amountVnd: 50000 },
      { rank: 2, label: getDefaultRankLabel(2), type: "wallet_vnd", amountVnd: 25500 },
      { rank: 3, label: getDefaultRankLabel(3), type: "wallet_vnd", amountVnd: 12345 },
      { rank: 4, label: getDefaultRankLabel(4), type: "wallet_vnd", amountVnd: 4321 },
      { rank: 5, label: getDefaultRankLabel(5), type: "wallet_vnd", amountVnd: 999 },
    ];
    const winners5 = buildRaceWinners(afterFinal.rankedUids, participants, fivePrizes, {});
    expect(winners5).toHaveLength(5);
    expect(winners5.map((w) => ({ rank: w.rank, amountVnd: w.amountVnd }))).toEqual([
      { rank: 1, amountVnd: 50000 },
      { rank: 2, amountVnd: 25500 },
      { rank: 3, amountVnd: 12345 },
      { rank: 4, amountVnd: 4321 },
      { rank: 5, amountVnd: 999 },
    ]);

    // Verify Zod schema accepts 2-player race, 5+ prizes, and arbitrary integer amounts
    const parsed = createMinigameSchema.parse({
      title: "Đua Ngựa 1v1 & 5 Giải Tự Chọn",
      gameType: "horse_race",
      maxParticipants: 2,
      racersPerHeat: 2,
      prizes: fivePrizes,
    });
    expect(parsed.maxParticipants).toBe(2);
    expect(parsed.prizes).toHaveLength(5);
    expect(parsed.prizes[4].amountVnd).toBe(999);
  });
});

describe("Minigame Free Welfare Party Games (Tài Xỉu, Bầu Cua, Đoán Số)", () => {
  it("evaluates Tài Xỉu winners accurately (sum >= 11 is Tài, <= 10 is Xỉu)", () => {
    const participants = makeParticipants(3);
    participants.u1.prediction = "tai";
    participants.u2.prediction = "xiu";
    participants.u3.prediction = "tai";
    const prizes: MinigamePrize[] = [
      { rank: 0, label: "Quà đoán đúng", type: "wallet_vnd", amountVnd: 5000 },
    ];

    const res = evaluateTaiXiuWinners([4, 5, 4], participants, prizes, 50000);
    expect(res.result.diceSum).toBe(13);
    expect(res.result.taiXiuOutcome).toBe("tai");
    expect(res.winners.map((w) => w.uid)).toEqual(["u1", "u3"]);
    expect(res.winners[0].amountVnd).toBe(5000);
  });

  it("evaluates Bầu Cua winners with multi-match counts", () => {
    const participants = makeParticipants(3);
    participants.u1.prediction = "cua";
    participants.u2.prediction = "bau";
    participants.u3.prediction = "nai";
    const prizes: MinigamePrize[] = [
      { rank: 0, label: "Quà Bầu Cua", type: "voucher", voucherCode: "TET2026" },
    ];

    const res = evaluateBauCuaWinners(["cua", "cua", "bau"], participants, prizes, 50000);
    expect(res.winners.map((w) => w.uid)).toEqual(["u1", "u2"]);
    expect(res.winners[0].matchDetail).toContain("x2");
    expect(res.winners[1].matchDetail).toContain("x1");

    // Supports tiered ranked prizes (e.g. 1st + 2nd with custom amounts) on Tài Xỉu / Bầu Cua too
    const tieredRes = evaluateBauCuaWinners(
      ["cua", "cua", "bau"],
      participants,
      [
        { rank: 1, label: "Giải Nhất Bầu Cua", type: "wallet_vnd", amountVnd: 8888 },
        { rank: 2, label: "Giải Nhì Bầu Cua", type: "wallet_vnd", amountVnd: 2222 },
      ],
      50000
    );
    expect(tieredRes.winners.map((w) => ({ uid: w.uid, rank: w.rank, amountVnd: w.amountVnd }))).toEqual([
      { uid: "u1", rank: 1, amountVnd: 8888 },
      { uid: "u2", rank: 2, amountVnd: 2222 },
    ]);
  });

  it("selects ONLY exact matches in Đoán Số May Mắn (00-99) and returns empty when nobody matches", () => {
    const participants = makeParticipants(5);
    participants.u1.prediction = "45"; // near, must NOT win
    participants.u2.prediction = "42"; // exact match #1
    participants.u3.prediction = "44"; // near, must NOT win
    participants.u4.prediction = "41"; // distance 1, still must NOT win
    participants.u5.prediction = "42"; // exact match #2 (later joinedAt)
    participants.u5.isBot = true;
    const prizes: MinigamePrize[] = [
      { rank: 1, label: "Giải Nhất", type: "wallet_vnd", amountVnd: 20000 },
      { rank: 2, label: "Giải Nhì", type: "wallet_vnd", amountVnd: 10000 },
      { rank: 3, label: "Giải Ba", type: "custom_gift", customTitle: "1 slot Gemini Pro" },
    ];

    const res = evaluateLuckyNumberWinners(42, participants, prizes, 50000);
    expect(res.winners.map((w) => ({ uid: w.uid, rank: w.rank, isBot: w.isBot }))).toEqual([
      { uid: "u2", rank: 1, isBot: false },
      { uid: "u5", rank: 2, isBot: true },
    ]);

    // When zero participants pick the exact winning number -> zero winners
    const noHit = evaluateLuckyNumberWinners(99, participants, prizes, 50000);
    expect(noHit.winners).toEqual([]);
  });
});

describe("AI Shop Monthly Slot Renewal Cancellation", () => {
  it("stops generating future billing cycles after student cancels renewal at end of paid cycle", async () => {
    const { computeOrderFinancialSummary } = await import("../src/services/aiShop/billingEngine");
    const order = {
      id: "ord_slot_1",
      orderCode: "DH-SLOT01",
      customerId: "cust_1",
      customerCodeSnapshot: "KH0001",
      serviceId: "svc_gemini_pro_slot_ngon",
      serviceNameSnapshot: "Gemini Pro slot ngon",
      serviceConditionsSnapshot: "25k/tháng",
      accountSlot: "student@gmail.com",
      quantity: 1,
      startDate: "2026-01-15",
      stopDate: "2026-02-15", // Cancelled after Cycle 1 (15/01 -> 15/02)
      autoRenewCancelled: true,
      autoRenewCancelledAt: "2026-01-20T00:00:00.000Z",
      billingType: "monthly" as const,
      firstCyclePriceVnd: 25000,
      recurringPriceVnd: 25000,
      durationValue: 1,
      durationUnit: "months" as const,
      note: "",
      source: "student_auto" as const,
      fulfillmentStatus: "delivered" as const,
      createdByUid: "u1",
      createdAt: "2026-01-15T00:00:00.000Z",
      updatedAt: "2026-01-20T00:00:00.000Z",
    };
    const payments = [
      {
        id: "pay_slot_1",
        paymentCode: "TT-001",
        orderId: "ord_slot_1",
        customerId: "cust_1",
        paidDate: "2026-01-15",
        amountVnd: 25000,
        method: "dktest_wallet" as const,
        note: "Thanh toán kỳ đầu",
        status: "active" as const,
        createdByUid: "u1",
        createdAt: "2026-01-15T00:00:00.000Z",
        updatedAt: "2026-01-15T00:00:00.000Z",
      },
    ];

    // Viewed 3 months later -> still ONLY 1 cycle, 0 debt, status stopped
    const summaryCancelled = computeOrderFinancialSummary(order, payments, "2026-04-20");
    expect(summaryCancelled.periods).toHaveLength(1);
    expect(summaryCancelled.dueUpToAsOfDateVnd).toBe(25000);
    expect(summaryCancelled.debtUpToAsOfDateVnd).toBe(0);
    expect(summaryCancelled.status).toBe("stopped");

    // Resuming renewal (stopDate = null) restores monthly recurring cycles
    const summaryResumed = computeOrderFinancialSummary(
      { ...order, stopDate: null, autoRenewCancelled: false },
      payments,
      "2026-04-20"
    );
    expect(summaryResumed.periods.length).toBeGreaterThanOrEqual(4);
    expect(summaryResumed.debtUpToAsOfDateVnd).toBe(75000);
  });
});

describe("AI Shop Storefront Grouping & Upgrade Email Requirements", () => {
  it("groups initial services into the 6 expected categories and flags upgrade-email services", () => {
    const seeds = buildSeedServiceRecords("2026-11-22T00:00:00.000Z");
    const byId = new Map(seeds.map((s) => [s.id, resolveServiceStorefrontMeta(s)]));

    expect(byId.get("svc_chatgpt_plus_30d_private")?.categoryKey).toBe("chatgpt");
    expect(byId.get("svc_chatgpt_plus_30d_shared")?.categoryKey).toBe("chatgpt");
    expect(byId.get("svc_chatgpt_plus_30d_private")?.requiresUpgradeEmail).toBe(false);

    expect(byId.get("svc_gemini_pro_3m_offer")?.categoryKey).toBe("gemini_pro_3m");
    expect(byId.get("svc_gemini_plus_6m_offer")?.categoryKey).toBe("gemini_plus_6m");

    expect(byId.get("svc_gemini_pro_slot_lom")?.categoryKey).toBe("gemini_pro_fam");
    expect(byId.get("svc_gemini_pro_slot_lom")?.requiresUpgradeEmail).toBe(true);
    expect(byId.get("svc_gemini_pro_slot_ngon")?.requiresUpgradeEmail).toBe(true);

    expect(byId.get("svc_youtube_premium_slot")?.categoryKey).toBe("yt_pre");
    expect(byId.get("svc_youtube_premium_slot")?.requiresUpgradeEmail).toBe(true);

    expect(byId.get("svc_verify_student")?.categoryKey).toBe("verify_student");
    expect(byId.get("svc_verify_student")?.requiresUpgradeEmail).toBe(true);
  });
});
