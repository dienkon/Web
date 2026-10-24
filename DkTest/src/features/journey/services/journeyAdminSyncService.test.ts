import { describe, it, expect } from "vitest";
import { calculateJourneyDefaultRewardRange } from "./journeyAdminSyncService";

describe("calculateJourneyDefaultRewardRange", () => {
  it("should reward 1 to 10 coins for levels 1 to 5", () => {
    for (let lvl = 1; lvl <= 5; lvl++) {
      const range = calculateJourneyDefaultRewardRange(lvl);
      expect(range.min).toBe(1);
      expect(range.max).toBe(10);
    }
  });

  it("should gradually scale reward range for subsequent levels", () => {
    const lvl6 = calculateJourneyDefaultRewardRange(6);
    expect(lvl6.min).toBeGreaterThanOrEqual(1);
    expect(lvl6.max).toBeGreaterThan(10);

    const lvl10 = calculateJourneyDefaultRewardRange(10);
    expect(lvl10.min).toBe(2);
    expect(lvl10.max).toBe(15);

    const lvl15 = calculateJourneyDefaultRewardRange(15);
    expect(lvl15.min).toBe(3);
    expect(lvl15.max).toBe(20);

    const lvl20 = calculateJourneyDefaultRewardRange(20);
    expect(lvl20.min).toBe(4);
    expect(lvl20.max).toBe(25);
  });

  it("should reach min 5 and max 30 coins for higher levels (levels 25+)", () => {
    const lvl25 = calculateJourneyDefaultRewardRange(25);
    expect(lvl25.min).toBe(5);
    expect(lvl25.max).toBe(30);

    const lvl40 = calculateJourneyDefaultRewardRange(40);
    expect(lvl40.min).toBe(5);
    expect(lvl40.max).toBe(30);

    const lvl50 = calculateJourneyDefaultRewardRange(50);
    expect(lvl50.min).toBe(5);
    expect(lvl50.max).toBe(30);
  });
});
