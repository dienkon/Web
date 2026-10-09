/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * DkTEST Escape Room - Type Definitions
 */

export type ChamberId = "chamber-1" | "chamber-2" | "chamber-3";

export type PuzzleType = "keypad" | "sequence" | "dial" | "knowledge" | "multi-lock";

export type ItemRarity = "common" | "uncommon" | "rare" | "legendary";

export interface InventoryItem {
  id: string;
  name: string;
  shortDesc: string;
  lore: string;
  icon: string;
  rarity: ItemRarity;
  inspectionDetail: string;
  usableOnObjectId?: string;
  usableMessage?: string;
}

export interface ClueItem {
  id: string;
  chamberId: ChamberId;
  title: string;
  content: string;
  category: "math" | "physics" | "chemistry" | "general" | "cipher";
  discoveredAt: number;
  relatedPuzzleId?: string;
  icon?: string;
}

export type HintTier = 1 | 2 | 3;

export interface ProgressiveHints {
  tier1Nudge: string;          // Gợi ý nhẹ: chỉ hướng nhìn hoặc liên hệ cơ bản
  tier2Reasoning: string;      // Hướng dẫn suy luận: công thức hoặc phương pháp giải
  tier3Solution: string;       // Lời giải và đáp án chi tiết
}

export interface KeypadPuzzleConfig {
  correctCode: string;
  codeLength: number;
  isNumericOnly: boolean;
  placeholder?: string;
}

export interface SequencePuzzleItem {
  id: string;
  label: string;
  description?: string;
  formula?: string;
}

export interface SequencePuzzleConfig {
  items: SequencePuzzleItem[];
  correctOrder: string[]; // List of item IDs in correct order
}

export interface DialRingConfig {
  id: string;
  label: string;
  options: string[];
  correctOption: string;
}

export interface DialPuzzleConfig {
  rings: DialRingConfig[];
}

export interface KnowledgePuzzleConfig {
  question: string;
  subject: "math" | "physics" | "chemistry" | "general";
  topic: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface MultiLockPuzzleConfig {
  requiredItemIds: string[];
  prompt: string;
}

export interface PuzzleDefinition {
  id: string;
  chamberId: ChamberId;
  title: string;
  loreIntro: string;
  type: PuzzleType;
  hints: ProgressiveHints;
  solvedMessage: string;
  rewardItemIds?: string[];
  rewardClueIds?: string[];
  targetObjectId?: string; // Which object this puzzle unlocks/solves
  config: {
    keypad?: KeypadPuzzleConfig;
    sequence?: SequencePuzzleConfig;
    dial?: DialPuzzleConfig;
    knowledge?: KnowledgePuzzleConfig;
    multiLock?: MultiLockPuzzleConfig;
  };
}

export interface InteractiveObject {
  id: string;
  name: string;
  chamberId: ChamberId;
  type: "inspectable" | "container" | "mechanism" | "door";
  x: number; // Percentage 0 - 100 for responsive placement
  y: number; // Percentage 0 - 100
  width?: number; // Size percentage
  height?: number;
  icon: string;
  description: string;
  inspectedDescription?: string;
  isLocked: boolean;
  requiresItemId?: string;
  requiresPuzzleId?: string;
  leadsToChamberId?: ChamberId;
  rewardItemIds?: string[];
  rewardClueIds?: string[];
}

export interface ChamberDefinition {
  id: ChamberId;
  order: number;
  name: string;
  themeTitle: string;
  narrativeIntro: string;
  atmosphereTone: string;
  backgroundColor: string;
  accentColor: string;
  objects: InteractiveObject[];
  puzzles: PuzzleDefinition[];
  exitDoorId: string;
}

export interface EscapeRoomCampaign {
  id: string;
  title: string;
  tagline: string;
  synopsis: string;
  chambers: Record<ChamberId, ChamberDefinition>;
  allItems: Record<string, InventoryItem>;
  allClues: Record<string, Omit<ClueItem, "discoveredAt">>;
}

export interface EscapeRoomScore {
  timeSeconds: number;
  hintsUsedCount: number;
  totalPuzzlesSolved: number;
  accuracyScore: number;
  rankTitle: string;
  badgeAwarded: string;
  summaryFeedback: string;
}

export interface EscapeRoomSession {
  id: string;
  campaignId: string;
  currentChamberId: ChamberId;
  unlockedObjectIds: string[];
  solvedPuzzleIds: string[];
  inventoryItemIds: string[];
  discoveredClues: ClueItem[];
  hintsRequested: Record<string, HintTier>; // puzzleId -> highest tier used
  startTime: number;
  elapsedSeconds: number;
  isCompleted: boolean;
  completedAt?: number;
  finalScore?: EscapeRoomScore;
}
