/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Types and interfaces for the DkTEST 3D Learning Journey World
 */

export type SubjectThemeType = "math" | "physics" | "chemistry";

export type QualityProfile = "high" | "balanced" | "low" | "fallback";

export type NodeArchetype =
  | "entrance"     // Màn 1: Cửa ngõ hành trình
  | "standard"     // Màn thường: Đảo luyện tập
  | "checkpoint"   // Màn 10, 25, 40: Trạm kiểm soát năng lực
  | "boss"         // Màn 50: Đỉnh cao chinh phục
  | "review";      // Trạm củng cố lỗ hổng

export type NodeState =
  | "completed"
  | "current"
  | "available"
  | "locked"
  | "needs_revision"
  | "insufficient_evidence";

export interface Journey3DNode {
  id: string;
  level: number;
  subject: SubjectThemeType;
  title: string;
  topicName: string;
  archetype: NodeArchetype;
  state: NodeState;
  x: number; // Percentage 0 - 100 on landscape
  y: number; // Pixels down the path
  elevation: number; // Z-axis floating height in pixels
  prerequisites: number[]; // Required levels to unlock
  isCheckpoint: boolean;
  isBoss: boolean;
  questionCount: number;
  estimatedMinutes: number;
  pastAccuracy?: number;
  pastAttemptsCount?: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number; // 0.6 -> 1.5
  pitch: number; // Angle in degrees 0 -> 45
}

export interface JourneyMission {
  id: string;
  title: string;
  description: string;
  subject?: SubjectThemeType;
  targetCount: number;
  currentCount: number;
  isCompleted: boolean;
  rewardXp: number;
  rewardType: "crystal" | "xp" | "streak";
  actionRoute?: string;
  actionLevel?: number;
}

export interface CollectibleItem {
  id: string;
  name: string;
  subject: SubjectThemeType;
  description: string;
  iconType: "math_crystal" | "physics_core" | "chemistry_flask" | "checkpoint_star" | "master_trophy";
  rarity: "common" | "rare" | "epic" | "legendary";
  isUnlocked: boolean;
  unlockedAt?: string;
  requirementText: string;
}
