/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Study Companion System Types
 */

export type CompanionArchetype = "owl" | "robot" | "fox" | "orb";

export type CompanionMoodState =
  | "idle"
  | "moving"
  | "pointing"
  | "observing"
  | "celebrating"
  | "explaining"
  | "resting";

export interface CompanionProfile {
  id: CompanionArchetype;
  name: string;
  title: string;
  avatarIcon: string;
  personality: string;
  welcomeMessage: string;
}

export interface CompanionPreferences {
  studentUid: string;
  selectedArchetype: CompanionArchetype;
  isEnabled: boolean;
  hintsEnabled: boolean;
  scale: number; // 0.8 -> 1.2
  soundEnabled: boolean;
  reducedMotion: boolean;
  updatedAt: string;
}

export interface CompanionGuidanceMessage {
  id: string;
  text: string;
  mood: CompanionMoodState;
  actionLabel?: string;
  actionDestination?: string;
  actionNodeId?: string;
  evidenceReason?: string;
  timestamp: string;
}
