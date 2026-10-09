/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * DkTEST Escape Room Engine Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EscapeRoomEngine } from "./escapeRoomEngine";

describe("EscapeRoomEngine", () => {
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

  it("initializes a fresh new session starting in Chamber 1", () => {
    const session = EscapeRoomEngine.createInitialSession();
    expect(session.currentChamberId).toBe("chamber-1");
    expect(session.inventoryItemIds).toEqual([]);
    expect(session.discoveredClues).toEqual([]);
    expect(session.solvedPuzzleIds).toEqual([]);
    expect(session.isCompleted).toBe(false);
  });

  it("persists and restores session from localStorage", () => {
    const session = EscapeRoomEngine.createInitialSession();
    session.inventoryItemIds.push("item_luminescent_lens");
    EscapeRoomEngine.saveSession(session);

    const loaded = EscapeRoomEngine.loadSession();
    expect(loaded).not.toBeNull();
    expect(loaded?.inventoryItemIds).toContain("item_luminescent_lens");
  });

  it("handles object inspection and clue/item rewards in Chamber 1", () => {
    let session = EscapeRoomEngine.createInitialSession();

    // 1. Inspect Bookshelf -> discovers math calculus clue
    const resBookshelf = EscapeRoomEngine.interactWithObject(session, "obj_c1_bookshelf");
    expect(resBookshelf.isSuccess).toBe(true);
    expect(resBookshelf.newClues.length).toBe(1);
    expect(resBookshelf.newClues[0].id).toBe("clue_c1_calculus");
    session = resBookshelf.updatedSession;

    // 2. Inspect Scholar's Desk -> receives Luminescent Lens item + freezing point clue
    const resDesk = EscapeRoomEngine.interactWithObject(session, "obj_c1_desk");
    expect(resDesk.isSuccess).toBe(true);
    expect(resDesk.newItems.length).toBe(1);
    expect(resDesk.newItems[0].id).toBe("item_luminescent_lens");
    expect(resDesk.newClues.length).toBe(1);
    expect(resDesk.newClues[0].id).toBe("clue_c1_freezing_point");
    session = resDesk.updatedSession;

    // 3. Inspect Relief (locked, requires item_luminescent_lens) -> player has it, unlocks!
    const resRelief = EscapeRoomEngine.interactWithObject(session, "obj_c1_relief");
    expect(resRelief.isSuccess).toBe(true);
    expect(resRelief.newClues.length).toBe(1);
    expect(resRelief.newClues[0].id).toBe("clue_c1_pendulum");
  });

  it("validates keypad puzzle with correct 4-digit code (1002)", () => {
    const session = EscapeRoomEngine.createInitialSession();

    // Wrong code fails
    const failResult = EscapeRoomEngine.solvePuzzle(session, "puz_c1_keypad", { code: "1234" });
    expect(failResult.isCorrect).toBe(false);

    // Correct code succeeds and unlocks Chamber 1 Door
    const winResult = EscapeRoomEngine.solvePuzzle(session, "puz_c1_keypad", { code: "1002" });
    expect(winResult.isCorrect).toBe(true);
    expect(winResult.updatedSession.solvedPuzzleIds).toContain("puz_c1_keypad");
    expect(winResult.updatedSession.unlockedObjectIds).toContain("obj_c1_door");
  });

  it("validates sequence puzzle for chemical esterification in Chamber 2", () => {
    const session = EscapeRoomEngine.createInitialSession();

    // Wrong sequence order fails
    const failSeq = EscapeRoomEngine.solvePuzzle(session, "puz_c2_sequence", {
      order: ["step_heat", "step_add_reactants", "step_add_nacl"],
    });
    expect(failSeq.isCorrect).toBe(false);

    // Correct sequence order succeeds and grants Clockwork Gear item
    const winSeq = EscapeRoomEngine.solvePuzzle(session, "puz_c2_sequence", {
      order: ["step_add_reactants", "step_heat", "step_add_nacl"],
    });
    expect(winSeq.isCorrect).toBe(true);
    expect(winSeq.newItems.some((i) => i.id === "item_clockwork_gear")).toBe(true);
  });

  it("validates gas laws dial puzzle in Chamber 2", () => {
    const session = EscapeRoomEngine.createInitialSession();

    const correctChoices = {
      ring_isothermal: "T = const (Nhiệt độ không đổi)",
      ring_isochoric: "V = const (Thể tích không đổi)",
      ring_isobaric: "P = const (Áp suất không đổi)",
    };

    const winDial = EscapeRoomEngine.solvePuzzle(session, "puz_c2_dial", {
      dialChoices: correctChoices,
    });
    expect(winDial.isCorrect).toBe(true);
  });

  it("tracks tiered progressive hints without giving away solution on tier 1", () => {
    let session = EscapeRoomEngine.createInitialSession();

    const h1 = EscapeRoomEngine.requestHint(session, "puz_c1_keypad", 1);
    expect(h1.hintText).toContain("Sổ Tay");
    expect(h1.hintText).not.toContain("1002");
    session = h1.updatedSession;
    expect(session.hintsRequested["puz_c1_keypad"]).toBe(1);

    const h3 = EscapeRoomEngine.requestHint(session, "puz_c1_keypad", 3);
    expect(h3.hintText).toContain("1002");
    expect(h3.updatedSession.hintsRequested["puz_c1_keypad"]).toBe(3);
  });

  it("calculates completion score with proper achievement rank", () => {
    const session = EscapeRoomEngine.createInitialSession();
    session.startTime = Date.now() - 300 * 1000; // 5 mins elapsed
    session.completedAt = Date.now();
    session.isCompleted = true;
    session.solvedPuzzleIds = ["puz_c1_keypad", "puz_c2_sequence", "puz_c2_dial", "puz_c3_knowledge", "puz_c3_final_escape"];

    const score = EscapeRoomEngine.calculateScore(session);
    expect(score.rankTitle).toBe("Nhà Thám Hiểm Huyền Thoại");
    expect(score.accuracyScore).toBe(100);
    expect(score.badgeAwarded).toBe("legendary_explorer");
  });
});
