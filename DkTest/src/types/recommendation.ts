/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Canonical Learning Recommendation Data Models for DkTEST Learning Intelligence
 */

export type RecommendationReasonCode =
  | "REC_REMEDY_WEAK_TOPIC"
  | "REC_REVIEW_SPACED"
  | "REC_CHALLENGE_STREAK"
  | "REC_RETAKE_WRONG_EXAM"
  | "REC_MAINTAIN_PACE"
  | "REC_COUNTDOWN_DRILL";

export type RecommendationPriority = "high" | "medium" | "low";

export interface LearningRecommendation {
  id: string;
  reasonCode: RecommendationReasonCode;
  priority: RecommendationPriority;

  title: string;
  description: string;
  reasonExplanation: string; // Transparent, student-friendly explanation

  subject: string;
  topicId?: string;
  topicName?: string;
  sourceExamId?: string;

  estimatedMinutes: number;
  actionLabel: string;
  actionRoute: string; // Internal route e.g. "/practice", "/exam/preview/...", "/student/journey"
  actionParams?: Record<string, any>;

  evidenceData?: {
    accuracy?: number;
    daysSinceLastPractice?: number;
    wrongQuestionsCount?: number;
    daysUntilExam?: number;
  };

  createdAt: string;
}
