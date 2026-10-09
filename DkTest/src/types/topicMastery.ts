/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Canonical Topic Mastery & Evidence Data Models for DkTEST Learning Intelligence
 */

export type TopicConfidenceLevel =
  | "insufficient_evidence" // < 5 questions attempted
  | "needs_foundation"      // < 50% accuracy
  | "developing"            // 50% - 69% accuracy
  | "progressing"           // 70% - 84% accuracy
  | "mastered";             // >= 85% accuracy with >= 15 questions

export interface TopicEvidenceRecord {
  date: string; // ISO string or YYYY-MM-DD
  source: string; // e.g. "exam_DE01", "practice_arithmetic", "review_mistakes"
  questionCount: number;
  correctCount: number;
  accuracy: number; // 0 - 100
}

export interface TopicMastery {
  id: string; // Deterministic: `${studentUid}_${cleanSubject}_${cleanTopicId}`
  studentUid: string;
  studentUsername: string;
  subject: string;
  topicId: string;
  topicName: string;

  confidenceLevel: TopicConfidenceLevel;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number; // Overall accuracy 0 - 100

  recentAccuracy: number; // Last 10 questions accuracy 0 - 100
  recentQuestionsCount: number;

  evidenceHistory: TopicEvidenceRecord[]; // Most recent 10 records

  lastPracticedAt: string; // ISO string
  createdAt: string;
  updatedAt: string;
}

export interface SubjectMasterySummary {
  subject: string;
  totalTopics: number;
  masteredCount: number;
  progressingCount: number;
  developingCount: number;
  needsFoundationCount: number;
  insufficientEvidenceCount: number;
  overallAccuracy: number;
  weakestTopics: TopicMastery[];
  strongestTopics: TopicMastery[];
}
