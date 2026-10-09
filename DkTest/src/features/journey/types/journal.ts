/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Personal Discovery Journal Types
 */

export type JournalMilestoneType =
  | "campaign_completed"
  | "checkpoint_passed"
  | "topic_mastered"
  | "revision_recovered"
  | "streak_milestone"
  | "first_step";

export interface DiscoveryJournalEntry {
  id: string;
  studentUid: string;
  milestoneType: JournalMilestoneType;
  title: string;
  summary: string;
  topicOrSubject: string;
  timestamp: string;
  /** Optional reference to related activity or exam ID */
  sourceActivityId?: string;
  /** Private student reflection */
  reflection?: {
    learnedWhat: string;
    difficultPart?: string;
    nextGoal?: string;
    confidenceLevel: 1 | 2 | 3 | 4 | 5;
    updatedAt: string;
  };
}
