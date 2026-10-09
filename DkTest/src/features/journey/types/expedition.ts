/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Cooperative Study Expeditions Types
 */

import type { SubjectThemeType } from "./journey3D";

export type ExpeditionStatus = "active" | "completed" | "expired";

export interface ExpeditionMember {
  uid: string;
  displayName: string;
  role: "leader" | "member";
  tasksContributed: number;
  lastActiveAt: string;
}

export interface CooperativeExpedition {
  id: string;
  title: string;
  description: string;
  subject: SubjectThemeType;
  inviteCode: string;
  leaderUid: string;
  leaderName: string;
  members: ExpeditionMember[];
  targetTasksCount: number;
  completedTasksCount: number;
  status: ExpeditionStatus;
  startedAt: string;
  expiresAt: string;
  completedAt?: string;
  /** Activity IDs recorded to prevent duplicate contribution */
  contributedActivityIds: string[];
}
