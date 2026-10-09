/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Canonical Revision Program and Task Data Models for DkTEST
 */

export type RevisionProgramType =
  | "exam_countdown"
  | "weakness_remedy"
  | "topic_deep_dive"
  | "maintenance_spaced"
  | "speed_drill"
  | "retake_mastery"
  | "comprehensive_prep";

export type RevisionProgramStatus = "active" | "paused" | "completed" | "archived";

export type RevisionTaskType =
  | "practice"
  | "review_mistakes"
  | "full_exam"
  | "topic_quiz"
  | "flashcards"
  | "speed_drill";

export type RevisionTaskStatus = "pending" | "in_progress" | "completed" | "skipped";

export interface RevisionTask {
  id: string; // Deterministic or unique uuid: task_${programId}_${orderIndex}
  programId: string;
  studentUid: string;
  orderIndex: number;

  title: string;
  description: string;
  taskType: RevisionTaskType;

  targetSubject: string;
  targetTopic?: string;
  sourceExamId?: string;
  sourceSubmissionId?: string;

  targetQuestionsCount: number;
  estimatedMinutes: number;

  dueDate: string; // YYYY-MM-DD
  status: RevisionTaskStatus;

  completedActivityId?: string;
  completedAt?: string; // ISO string
  scoreAchieved?: number;
  accuracyAchieved?: number;

  rescheduleCount: number;
  lastRescheduledAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface RevisionProgramProgress {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  percentComplete: number; // 0 - 100
  totalStudyMinutesLogged: number;
  currentStreakDays: number;
}

export interface RevisionProgram {
  id: string; // Deterministic: prog_${studentUid}_${type}_${timestamp}
  studentUid: string;
  studentUsername: string;

  type: RevisionProgramType;
  title: string;
  description: string;
  subject: string;
  targetExamName?: string; // e.g. "Kỳ thi THPT Quốc Gia 2027", "ĐGNL ĐHQG-HCM 2027"
  targetExamDate?: string; // YYYY-MM-DD

  status: RevisionProgramStatus;

  startDate: string; // YYYY-MM-DD
  targetEndDate?: string; // YYYY-MM-DD

  dailyTargetMinutes: number; // e.g. 20, 30, 45, 60
  weeklyDays: number[]; // [1, 2, 3, 4, 5, 6, 0] where 1=Mon, 0=Sun

  topics: string[];
  initialLevel?: "foundation" | "intermediate" | "advanced";

  progress: RevisionProgramProgress;

  createdAt: string;
  updatedAt: string;
}

export interface RevisionProgramConfigInput {
  studentUid: string;
  studentUsername: string;
  type: RevisionProgramType;
  title?: string;
  subject: string;
  targetExamName?: string;
  targetExamDate?: string;
  dailyTargetMinutes: number;
  weeklyDays: number[];
  topics: string[];
  initialLevel?: "foundation" | "intermediate" | "advanced";
  sourceExamIds?: string[];
  durationWeeks?: number;
}
