/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Canonical Learning Activity Data Model for DkTEST Learning Intelligence
 */

export type LearningActivityOrigin =
  | "formal_exam"
  | "practice_session"
  | "old_exam_review"
  | "revision_task"
  | "journey_challenge";

export type LearningActivityStatus =
  | "not_started"
  | "in_progress"
  | "paused"
  | "submitted"
  | "completed"
  | "abandoned";

export interface ActivityLifecycleEvent {
  event: "start" | "pause" | "resume" | "submit" | "complete" | "abandon";
  timestamp: string; // ISO string
  activeDurationDeltaSeconds?: number;
  metadata?: Record<string, any>;
}

export interface ActivityTopicBreakdown {
  topicId: string;
  topicName: string;
  total: number;
  answered: number;
  correct: number;
  accuracy: number; // 0 - 100
}

export interface ActivityDifficultyBreakdown {
  easy: { total: number; correct: number };
  medium: { total: number; correct: number };
  hard: { total: number; correct: number };
}

export interface LearningActivity {
  id: string; // Deterministic ID for deduplication: act_${studentUid}_${origin}_${sourceId}
  studentUid: string;
  studentUsername: string;
  studentDisplayName?: string;

  origin: LearningActivityOrigin;
  sourceExamId?: string;
  sourceSubmissionId?: string;
  revisionTaskId?: string;
  revisionProgramId?: string;

  title: string;
  subject: string;
  gradeCategory?: string;

  status: LearningActivityStatus;

  startedAt: string; // ISO string
  pausedAt?: string | null;
  resumedAt?: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;

  /**
   * Honest active work duration in seconds, strictly subtracting pause/idle intervals.
   */
  activeDurationSeconds: number;

  /**
   * Wall clock time in seconds from start to completion.
   */
  totalDurationSeconds: number;

  score?: number;
  maxScore?: number;
  scorePercentage?: number;

  totalQuestions: number;
  answeredQuestions: number;
  correctQuestions: number;

  /**
   * Evaluated strictly as (correctQuestions / answeredQuestions) * 100
   * If answeredQuestions === 0, accuracy is 0.
   */
  accuracy: number;

  topicBreakdown?: ActivityTopicBreakdown[];
  difficultyBreakdown?: ActivityDifficultyBreakdown;
  lifecycleEvents: ActivityLifecycleEvent[];

  isCountedInStreak: boolean;
  isCountedInMastery: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface LearningActivityFilter {
  studentUid: string;
  origin?: LearningActivityOrigin;
  subject?: string;
  status?: LearningActivityStatus;
  limitCount?: number;
  startDate?: string;
  endDate?: string;
}

export interface StudentLearningStats {
  totalActivitiesCompleted: number;
  totalActiveStudyMinutes: number;
  averageAccuracy: number;
  formalExamsCount: number;
  practiceSessionsCount: number;
  oldExamReviewsCount: number;
  journeyChallengesCount: number;
  currentStreakDays: number;
  lastActiveDate?: string;
}
