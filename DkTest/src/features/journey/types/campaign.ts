/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Narrative Learning Campaigns & Graph Architecture Types
 */

import type { SubjectThemeType } from "./journey3D";

export type CampaignStatus = "draft" | "validated" | "published" | "archived";

export type CampaignNodeType =
  | "story_intro"
  | "concept_exploration"
  | "diagnostic"
  | "practice_encounter"
  | "optional_branch"
  | "checkpoint"
  | "final_assessment";

export interface CampaignNode {
  id: string;
  title: string;
  subtitle?: string;
  learningObjective: string;
  type: CampaignNodeType;
  regionId: string;
  chapterName: string;
  topicName: string;
  /** IDs of nodes that must be completed before unlocking this node */
  prerequisiteNodeIds: string[];
  /** Is this an optional side exploration branch */
  isOptional: boolean;
  /** Estimated duration in minutes */
  estimatedMinutes: number;
  /** Coordinates on the campaign layout (0-100 percentage) */
  x: number;
  y: number;
  /** Number of practice questions */
  questionCount: number;
  /** Passing accuracy percentage required if this is a checkpoint/assessment */
  passAccuracyThreshold?: number;
  /** Dialogue or lore text from learning guide */
  guideDialogue?: string;
}

export interface CampaignRegion {
  id: string;
  name: string;
  description: string;
  subject: SubjectThemeType;
  accentColor: string;
  unlockedAtLevel?: number;
}

export interface NarrativeCampaign {
  id: string;
  version: number;
  title: string;
  slug: string;
  description: string;
  narrativeIntro: string;
  subject: SubjectThemeType;
  grade: number; // 12
  status: CampaignStatus;
  regions: CampaignRegion[];
  nodes: CampaignNode[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface StudentCampaignNodeProgress {
  nodeId: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  completedAt?: string;
  bestAccuracy?: number;
  attemptsCount: number;
}

export interface StudentCampaignProgress {
  campaignId: string;
  campaignVersion: number;
  studentUid: string;
  currentNodeId: string;
  nodeProgress: Record<string, StudentCampaignNodeProgress>;
  completedNodeCount: number;
  totalNodeCount: number;
  isCompleted: boolean;
  completedAt?: string;
  lastActiveAt: string;
}
