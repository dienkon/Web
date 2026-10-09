import { describe, it, expect, beforeEach } from "vitest";
import {
  MASTER_COLLECTIBLES,
  getStudentCollectibles,
} from "./journeyCollectiblesService";

describe("journeyCollectiblesService", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => store.set(key, String(val)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (idx: number) => Array.from(store.keys())[idx] ?? null,
      length: store.size,
    } as any;
  });

  it("contains 7 canonical master collectibles across different rarities", () => {
    expect(MASTER_COLLECTIBLES).toHaveLength(7);
    const ids = MASTER_COLLECTIBLES.map((c) => c.id);
    expect(ids).toContain("col_math_crystal_begin");
    expect(ids).toContain("col_checkpoint_10");
    expect(ids).toContain("col_physics_core_10");
    expect(ids).toContain("col_chem_flask_10");
    expect(ids).toContain("col_checkpoint_25");
    expect(ids).toContain("col_checkpoint_40");
    expect(ids).toContain("col_master_50");
  });

  it("locks all collectibles for a brand new student at level 1 across all subjects", () => {
    const collectibles = getStudentCollectibles({
      math: 1,
      physics: 1,
      chemistry: 1,
    });

    expect(collectibles.every((c) => !c.isUnlocked)).toBe(true);
    expect(collectibles.every((c) => !c.unlockedAt)).toBe(true);
  });

  it("unlocks col_math_crystal_begin when math progress exceeds level 1", () => {
    const collectibles = getStudentCollectibles({
      math: 2,
      physics: 1,
      chemistry: 1,
    });

    const mathBegin = collectibles.find((c) => c.id === "col_math_crystal_begin");
    expect(mathBegin?.isUnlocked).toBe(true);
    expect(mathBegin?.unlockedAt).toBeTruthy();

    const others = collectibles.filter((c) => c.id !== "col_math_crystal_begin");
    expect(others.every((c) => !c.isUnlocked)).toBe(true);
  });

  it("unlocks checkpoint 10 and physics core when physics progress reaches level 11", () => {
    const collectibles = getStudentCollectibles({
      math: 1,
      physics: 11,
      chemistry: 1,
    });

    const cp10 = collectibles.find((c) => c.id === "col_checkpoint_10");
    const phys10 = collectibles.find((c) => c.id === "col_physics_core_10");
    const chem10 = collectibles.find((c) => c.id === "col_chem_flask_10");

    expect(cp10?.isUnlocked).toBe(true);
    expect(phys10?.isUnlocked).toBe(true);
    expect(chem10?.isUnlocked).toBe(false);
  });

  it("unlocks chemistry flask when chemistry progress reaches level 11", () => {
    const collectibles = getStudentCollectibles({
      math: 1,
      physics: 1,
      chemistry: 11,
    });

    const cp10 = collectibles.find((c) => c.id === "col_checkpoint_10");
    const chem10 = collectibles.find((c) => c.id === "col_chem_flask_10");

    expect(cp10?.isUnlocked).toBe(true);
    expect(chem10?.isUnlocked).toBe(true);
  });

  it("unlocks checkpoint 25, 40, and master trophy 50 appropriately", () => {
    const midWay = getStudentCollectibles({
      math: 26,
      physics: 15,
      chemistry: 10,
    });
    expect(midWay.find((c) => c.id === "col_checkpoint_25")?.isUnlocked).toBe(true);
    expect(midWay.find((c) => c.id === "col_checkpoint_40")?.isUnlocked).toBe(false);

    const highWay = getStudentCollectibles({
      math: 42,
      physics: 15,
      chemistry: 10,
    });
    expect(highWay.find((c) => c.id === "col_checkpoint_40")?.isUnlocked).toBe(true);
    expect(highWay.find((c) => c.id === "col_master_50")?.isUnlocked).toBe(false);

    const master = getStudentCollectibles({
      math: 50,
      physics: 1,
      chemistry: 1,
    });
    expect(master.find((c) => c.id === "col_master_50")?.isUnlocked).toBe(true);
  });

  it("persists unlock timestamps in localStorage and preserves original unlock dates", () => {
    const firstCall = getStudentCollectibles({
      math: 2,
      physics: 1,
      chemistry: 1,
    });
    const firstTimestamp = firstCall.find((c) => c.id === "col_math_crystal_begin")?.unlockedAt;
    expect(firstTimestamp).toBeTruthy();

    // Verify localStorage has the key
    const rawStorage = localStorage.getItem("dktest_journey_collectibles_v1");
    expect(rawStorage).toBeTruthy();
    const parsed = JSON.parse(rawStorage!);
    expect(parsed["col_math_crystal_begin"]).toBe(firstTimestamp);

    // Call again, timestamp should remain identical
    const secondCall = getStudentCollectibles({
      math: 5,
      physics: 1,
      chemistry: 1,
    });
    expect(secondCall.find((c) => c.id === "col_math_crystal_begin")?.unlockedAt).toBe(firstTimestamp);
  });
});
