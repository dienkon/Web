/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * DkTEST Escape Room Engine Service
 * Handles state transitions, clue discovery, puzzle verification, and persistence.
 */

import {
  ChamberId,
  EscapeRoomSession,
  EscapeRoomScore,
  HintTier,
  InventoryItem,
  ClueItem,
  InteractiveObject,
  PuzzleDefinition,
} from "../types/escapeRoom";
import {
  LOST_ARCHIVE_CAMPAIGN,
  LOST_ARCHIVE_ITEMS,
  LOST_ARCHIVE_CLUES,
} from "../data/lostArchiveCampaign";

const STORAGE_KEY = "dktest_escape_room_session_v1";

export class EscapeRoomEngine {
  /**
   * Initializes a fresh new escape room session
   */
  public static createInitialSession(campaignId = "the-lost-archive"): EscapeRoomSession {
    const session: EscapeRoomSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      campaignId,
      currentChamberId: "chamber-1",
      unlockedObjectIds: [],
      solvedPuzzleIds: [],
      inventoryItemIds: [],
      discoveredClues: [],
      hintsRequested: {},
      startTime: Date.now(),
      elapsedSeconds: 0,
      isCompleted: false,
    };
    return session;
  }

  /**
   * Loads saved session from localStorage or returns null
   */
  public static loadSession(): EscapeRoomSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      const parsed = JSON.parse(data) as EscapeRoomSession;
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Persists session to localStorage
   */
  public static saveSession(session: EscapeRoomSession): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn("[EscapeRoomEngine] Failed to save session to localStorage", e);
    }
  }

  /**
   * Clears saved session from localStorage
   */
  public static clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  /**
   * Get chamber definition by ID
   */
  public static getChamber(chamberId: ChamberId) {
    return LOST_ARCHIVE_CAMPAIGN.chambers[chamberId];
  }

  /**
   * Get an object by ID across all chambers
   */
  public static getObject(objectId: string): InteractiveObject | undefined {
    for (const chamber of Object.values(LOST_ARCHIVE_CAMPAIGN.chambers)) {
      const found = chamber.objects.find((o) => o.id === objectId);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * Get a puzzle by ID across all chambers
   */
  public static getPuzzle(puzzleId: string): PuzzleDefinition | undefined {
    for (const chamber of Object.values(LOST_ARCHIVE_CAMPAIGN.chambers)) {
      const found = chamber.puzzles.find((p) => p.id === puzzleId);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * Get resolved inventory items from session item IDs
   */
  public static getSessionInventory(session: EscapeRoomSession): InventoryItem[] {
    return session.inventoryItemIds
      .map((id) => LOST_ARCHIVE_ITEMS[id])
      .filter((item): item is InventoryItem => Boolean(item));
  }

  /**
   * Handles user interaction with an in-room object
   */
  public static interactWithObject(
    session: EscapeRoomSession,
    objectId: string,
    usedItemId?: string
  ): {
    updatedSession: EscapeRoomSession;
    message: string;
    newItems: InventoryItem[];
    newClues: ClueItem[];
    triggerPuzzleId?: string;
    triggerTransitionChamberId?: ChamberId;
    isSuccess: boolean;
  } {
    const chamber = this.getChamber(session.currentChamberId);
    const obj = chamber.objects.find((o) => o.id === objectId);

    if (!obj) {
      return {
        updatedSession: session,
        message: "Không tìm thấy vật thể trong phòng hiện tại.",
        newItems: [],
        newClues: [],
        isSuccess: false,
      };
    }

    const nextSession: EscapeRoomSession = {
      ...session,
      unlockedObjectIds: [...session.unlockedObjectIds],
      inventoryItemIds: [...session.inventoryItemIds],
      discoveredClues: [...session.discoveredClues],
    };

    const isAlreadyUnlocked = nextSession.unlockedObjectIds.includes(obj.id);
    const newItems: InventoryItem[] = [];
    const newClues: ClueItem[] = [];

    // 1. Check if object requires a puzzle to be solved
    if (obj.requiresPuzzleId && !nextSession.solvedPuzzleIds.includes(obj.requiresPuzzleId)) {
      return {
        updatedSession: nextSession,
        message: `${obj.name} đang bị khóa bởi một cơ chế mật mã. Cần giải mã câu đố để mở.`,
        newItems: [],
        newClues: [],
        triggerPuzzleId: obj.requiresPuzzleId,
        isSuccess: false,
      };
    }

    // 2. Check if object requires an item
    if (obj.requiresItemId && !isAlreadyUnlocked) {
      const playerHasItem = nextSession.inventoryItemIds.includes(obj.requiresItemId);
      const isUsingCorrectItem = usedItemId === obj.requiresItemId;

      if (!playerHasItem && !isUsingCorrectItem) {
        const requiredItem = LOST_ARCHIVE_ITEMS[obj.requiresItemId];
        return {
          updatedSession: nextSession,
          message: `${obj.name} đang bị khóa. Bạn cần vật phẩm [${requiredItem?.name || "chìa khóa thích hợp"}] để kích hoạt.`,
          newItems: [],
          newClues: [],
          isSuccess: false,
        };
      }

      // Unlock with item
      if (!isAlreadyUnlocked) {
        nextSession.unlockedObjectIds.push(obj.id);
      }
    } else if (!isAlreadyUnlocked) {
      nextSession.unlockedObjectIds.push(obj.id);
    }

    // 3. Grant rewards (items and clues)
    if (obj.rewardItemIds) {
      for (const itemId of obj.rewardItemIds) {
        if (!nextSession.inventoryItemIds.includes(itemId)) {
          nextSession.inventoryItemIds.push(itemId);
          const item = LOST_ARCHIVE_ITEMS[itemId];
          if (item) newItems.push(item);
        }
      }
    }

    if (obj.rewardClueIds) {
      for (const clueId of obj.rewardClueIds) {
        const alreadyDiscovered = nextSession.discoveredClues.some((c) => c.id === clueId);
        if (!alreadyDiscovered) {
          const rawClue = LOST_ARCHIVE_CLUES[clueId];
          if (rawClue) {
            const fullClue: ClueItem = {
              ...rawClue,
              discoveredAt: Date.now(),
            };
            nextSession.discoveredClues.push(fullClue);
            newClues.push(fullClue);
          }
        }
      }
    }

    // 4. Door navigation check
    let triggerTransitionChamberId: ChamberId | undefined = undefined;
    if (obj.type === "door" && obj.leadsToChamberId) {
      triggerTransitionChamberId = obj.leadsToChamberId;
    }

    this.saveSession(nextSession);

    const message = isAlreadyUnlocked
      ? (obj.inspectedDescription || obj.description)
      : (obj.inspectedDescription || `${obj.name} đã được kiểm tra thành công!`);

    return {
      updatedSession: nextSession,
      message,
      newItems,
      newClues,
      triggerTransitionChamberId,
      isSuccess: true,
    };
  }

  /**
   * Validates and solves a puzzle
   */
  public static solvePuzzle(
    session: EscapeRoomSession,
    puzzleId: string,
    answer: {
      code?: string;
      order?: string[];
      dialChoices?: Record<string, string>;
      selectedIndex?: number;
    }
  ): {
    updatedSession: EscapeRoomSession;
    isCorrect: boolean;
    message: string;
    newItems: InventoryItem[];
    newClues: ClueItem[];
  } {
    const puzzle = this.getPuzzle(puzzleId);
    if (!puzzle) {
      return {
        updatedSession: session,
        isCorrect: false,
        message: "Không tìm thấy câu đố.",
        newItems: [],
        newClues: [],
      };
    }

    let isCorrect = false;

    switch (puzzle.type) {
      case "keypad": {
        const expected = puzzle.config.keypad?.correctCode.trim().toLowerCase();
        const actual = answer.code?.trim().toLowerCase();
        isCorrect = Boolean(expected && actual && expected === actual);
        break;
      }
      case "sequence": {
        const expectedOrder = puzzle.config.sequence?.correctOrder || [];
        const actualOrder = answer.order || [];
        if (expectedOrder.length === actualOrder.length && expectedOrder.length > 0) {
          isCorrect = expectedOrder.every((val, idx) => val === actualOrder[idx]);
        }
        break;
      }
      case "dial": {
        const rings = puzzle.config.dial?.rings || [];
        const choices = answer.dialChoices || {};
        isCorrect = rings.length > 0 && rings.every((ring) => choices[ring.id] === ring.correctOption);
        break;
      }
      case "knowledge": {
        const expected = puzzle.config.knowledge?.correctIndex;
        isCorrect = typeof expected === "number" && answer.selectedIndex === expected;
        break;
      }
      case "multi-lock": {
        const required = puzzle.config.multiLock?.requiredItemIds || [];
        isCorrect = required.every((reqId) => session.inventoryItemIds.includes(reqId));
        break;
      }
      default:
        isCorrect = false;
    }

    if (!isCorrect) {
      return {
        updatedSession: session,
        isCorrect: false,
        message: "Mật mã hoặc đáp án chưa chính xác. Hãy suy luận lại hoặc sử dụng gợi ý nếu cần!",
        newItems: [],
        newClues: [],
      };
    }

    // Puzzle correctly solved!
    const nextSession: EscapeRoomSession = {
      ...session,
      solvedPuzzleIds: Array.from(new Set([...session.solvedPuzzleIds, puzzleId])),
      unlockedObjectIds: [...session.unlockedObjectIds],
      inventoryItemIds: [...session.inventoryItemIds],
      discoveredClues: [...session.discoveredClues],
    };

    // Unlock target object if present
    if (puzzle.targetObjectId && !nextSession.unlockedObjectIds.includes(puzzle.targetObjectId)) {
      nextSession.unlockedObjectIds.push(puzzle.targetObjectId);
    }

    const newItems: InventoryItem[] = [];
    const newClues: ClueItem[] = [];

    // Grant rewards
    if (puzzle.rewardItemIds) {
      for (const itemId of puzzle.rewardItemIds) {
        if (!nextSession.inventoryItemIds.includes(itemId)) {
          nextSession.inventoryItemIds.push(itemId);
          const item = LOST_ARCHIVE_ITEMS[itemId];
          if (item) newItems.push(item);
        }
      }
    }

    if (puzzle.rewardClueIds) {
      for (const clueId of puzzle.rewardClueIds) {
        const alreadyDiscovered = nextSession.discoveredClues.some((c) => c.id === clueId);
        if (!alreadyDiscovered) {
          const rawClue = LOST_ARCHIVE_CLUES[clueId];
          if (rawClue) {
            const fullClue: ClueItem = {
              ...rawClue,
              discoveredAt: Date.now(),
            };
            nextSession.discoveredClues.push(fullClue);
            newClues.push(fullClue);
          }
        }
      }
    }

    // Check if this was the final escape puzzle
    if (puzzleId === "puz_c3_final_escape") {
      nextSession.isCompleted = true;
      nextSession.completedAt = Date.now();
      nextSession.finalScore = this.calculateScore(nextSession);
    }

    this.saveSession(nextSession);

    return {
      updatedSession: nextSession,
      isCorrect: true,
      message: puzzle.solvedMessage,
      newItems,
      newClues,
    };
  }

  /**
   * Requests a tiered hint for a specific puzzle
   */
  public static requestHint(
    session: EscapeRoomSession,
    puzzleId: string,
    tier: HintTier
  ): {
    updatedSession: EscapeRoomSession;
    hintText: string;
  } {
    const puzzle = this.getPuzzle(puzzleId);
    if (!puzzle) {
      return {
        updatedSession: session,
        hintText: "Không có gợi ý khả dụng.",
      };
    }

    const currentTier = session.hintsRequested[puzzleId] || 0;
    const nextSession: EscapeRoomSession = {
      ...session,
      hintsRequested: {
        ...session.hintsRequested,
        [puzzleId]: Math.max(currentTier, tier) as HintTier,
      },
    };

    this.saveSession(nextSession);

    let hintText = "";
    if (tier === 1) hintText = puzzle.hints.tier1Nudge;
    else if (tier === 2) hintText = puzzle.hints.tier2Reasoning;
    else hintText = puzzle.hints.tier3Solution;

    return {
      updatedSession: nextSession,
      hintText,
    };
  }

  /**
   * Moves player to a new chamber
   */
  public static moveToChamber(
    session: EscapeRoomSession,
    targetChamberId: ChamberId
  ): EscapeRoomSession {
    const nextSession: EscapeRoomSession = {
      ...session,
      currentChamberId: targetChamberId,
    };
    this.saveSession(nextSession);
    return nextSession;
  }

  /**
   * Calculates overall escape game score & feedback
   */
  public static calculateScore(session: EscapeRoomSession): EscapeRoomScore {
    const timeSeconds = Math.max(
      1,
      Math.floor(((session.completedAt || Date.now()) - session.startTime) / 1000)
    );

    const hintsUsedCount = Object.values(session.hintsRequested).reduce(
      (acc, tier) => acc + tier,
      0
    );

    const totalPuzzlesSolved = session.solvedPuzzleIds.length;

    // Accuracy starts at 100, drops slightly based on hint depth
    let penalty = 0;
    Object.values(session.hintsRequested).forEach((tier) => {
      if (tier === 1) penalty += 5;
      else if (tier === 2) penalty += 12;
      else if (tier === 3) penalty += 20;
    });

    const accuracyScore = Math.max(50, 100 - penalty);

    let rankTitle = "Học Giả Kiên Cường";
    let badgeAwarded = "resilient_scholar";
    let summaryFeedback = "Bạn đã kiên trì vượt qua mọi cạm bẫy và hoàn thành cuộc đào thoát thành công!";

    if (hintsUsedCount <= 1 && timeSeconds <= 900) {
      rankTitle = "Nhà Thám Hiểm Huyền Thoại";
      badgeAwarded = "legendary_explorer";
      summaryFeedback = "Thần tốc và sắc bén tuyệt đỉnh! Bạn hầu như không cần bất kỳ gợi ý nào để giải mã toàn bộ viện lưu trữ cổ đại.";
    } else if (hintsUsedCount <= 4) {
      rankTitle = "Bậc Thầy Giải Mã Tri Thức";
      badgeAwarded = "master_decoder";
      summaryFeedback = "Tư duy logic và khả năng áp dụng kiến thức Toán Lý Hóa tuyệt vời. Một thành tích giải đố đáng nể!";
    } else if (hintsUsedCount <= 8) {
      rankTitle = "Nhà Khảo Cổ Xuất Sắc";
      badgeAwarded = "elite_archaeologist";
      summaryFeedback = "Vượt qua thử thách với tinh thần học hỏi cao và nắm vững các quy luật khoa học cốt lõi.";
    }

    return {
      timeSeconds,
      hintsUsedCount,
      totalPuzzlesSolved,
      accuracyScore,
      rankTitle,
      badgeAwarded,
      summaryFeedback,
    };
  }
}
