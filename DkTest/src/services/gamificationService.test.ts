import { describe, it, expect } from "vitest";
import { computeStreak, computeXPAndLevel } from "./gamificationService";

describe("gamificationService", () => {
  it("calculates active streak correctly for consecutive days", () => {
    const today = new Date();
    const d0 = today.toISOString().split("T")[0];
    const prev1 = new Date(today);
    prev1.setDate(prev1.getDate() - 1);
    const d1 = prev1.toISOString().split("T")[0];
    const prev2 = new Date(today);
    prev2.setDate(prev2.getDate() - 2);
    const d2 = prev2.toISOString().split("T")[0];

    const result = computeStreak([d0, d1, d2]);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });

  it("handles empty and single date streaks", () => {
    expect(computeStreak([])).toEqual({ currentStreak: 0, longestStreak: 0 });
    const today = new Date().toISOString().split("T")[0];
    expect(computeStreak([today])).toEqual({ currentStreak: 1, longestStreak: 1 });
  });

  it("resets current streak if last activity was 3 days ago", () => {
    const old = new Date();
    old.setDate(old.getDate() - 5);
    const dOld = old.toISOString().split("T")[0];
    const result = computeStreak([dOld]);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(1);
  });

  it("calculates XP and levels with correct tier progression", () => {
    const level1 = computeXPAndLevel(8, 1, 0); // 25 + 80 = 105 XP -> Level 2
    expect(level1.level).toBe(2);
    expect(level1.levelTitle).toBe("Tập Sự");

    const levelHigh = computeXPAndLevel(100, 10, 5); // 250 + 1000 + 250 = 1500 XP -> Level 5 Cao Thủ
    expect(levelHigh.level).toBe(5);
    expect(levelHigh.levelTitle).toBe("Cao Thủ");
  });
});
