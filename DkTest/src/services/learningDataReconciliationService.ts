/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Learning Data Reconciliation Service for DkTEST Learning Intelligence
 * Provides dry-run diagnostics and consistency checks for learning activities,
 * revision tasks, programs, and topic mastery aggregates.
 */

import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase/config";
import type { LearningActivity } from "../types/learningActivity";
import type { RevisionProgram, RevisionTask } from "../types/revisionProgram";
import type { TopicMastery } from "../types/topicMastery";
import {
  ACTIVITIES_COLLECTION,
  getLocalCachedActivities,
} from "./learningActivityService";
import {
  PROGRAMS_COLLECTION,
  TASKS_COLLECTION,
  getLocalPrograms,
  getLocalTasks,
} from "./revisionProgramService";
import {
  TOPIC_MASTERY_COLLECTION,
  getLocalTopicMastery,
} from "./topicMasteryService";

export type LearningIssueType =
  | "ORPHAN_TASK"
  | "DUPLICATE_ACTIVITY"
  | "INVALID_DURATION"
  | "INCONSISTENT_MASTERY"
  | "MISSING_SOURCE";

export interface LearningHealthIssue {
  id: string;
  type: LearningIssueType;
  severity: "info" | "warning" | "error";
  description: string;
  targetId: string;
  studentUid?: string;
  suggestedAction: string;
  safeToAutoRepair: boolean;
  details?: Record<string, any>;
}

export interface LearningHealthReport {
  scannedAt: string;
  totalActivitiesScanned: number;
  totalProgramsScanned: number;
  totalTasksScanned: number;
  totalMasteriesScanned: number;
  issues: LearningHealthIssue[];
  isHealthy: boolean;
}

export interface RepairResult {
  dryRun: boolean;
  plannedRepairsCount: number;
  appliedRepairsCount: number;
  repairedIssueIds: string[];
  message: string;
}

/**
 * Scans learning intelligence collections for structural anomalies or data inconsistencies.
 */
export async function scanLearningDataHealth(studentUid?: string): Promise<LearningHealthReport> {
  const issues: LearningHealthIssue[] = [];

  // Security & Data Privacy: Never perform unscoped collection scans without a specific student filter
  if (!studentUid) {
    return {
      scannedAt: new Date().toISOString(),
      totalActivitiesScanned: 0,
      totalProgramsScanned: 0,
      totalTasksScanned: 0,
      totalMasteriesScanned: 0,
      issues: [],
      isHealthy: true,
    };
  }

  let activities: LearningActivity[] = [];
  let programs: RevisionProgram[] = [];
  let tasks: RevisionTask[] = [];
  let masteries: TopicMastery[] = [];

  try {
    const actSnap = await getDocs(
      query(collection(db, ACTIVITIES_COLLECTION), where("studentUid", "==", studentUid), limit(100))
    );
    activities = actSnap.docs.map((d) => d.data() as LearningActivity);

    const progSnap = await getDocs(
      query(collection(db, PROGRAMS_COLLECTION), where("studentUid", "==", studentUid), limit(50))
    );
    programs = progSnap.docs.map((d) => d.data() as RevisionProgram);

    const taskSnap = await getDocs(
      query(collection(db, TASKS_COLLECTION), where("studentUid", "==", studentUid), limit(200))
    );
    tasks = taskSnap.docs.map((d) => d.data() as RevisionTask);

    const mastSnap = await getDocs(
      query(collection(db, TOPIC_MASTERY_COLLECTION), where("studentUid", "==", studentUid), limit(100))
    );
    masteries = mastSnap.docs.map((d) => d.data() as TopicMastery);
  } catch (err) {
    console.warn("[LearningReconciliation] Firestore fetch error, checking local fallback:", err);
    activities = getLocalCachedActivities(studentUid);
    programs = getLocalPrograms(studentUid);
    tasks = getLocalTasks(studentUid);
    masteries = getLocalTopicMastery(studentUid);
  }

  const programIdSet = new Set(programs.map((p) => p.id));
  const seenActivityKeys = new Set<string>();

  // 1. Check activities for duplicate submissions and invalid durations
  for (const act of activities) {
    if (act.activeDurationSeconds < 0 || act.activeDurationSeconds > 86400) {
      issues.push({
        id: `issue_dur_${act.id}`,
        type: "INVALID_DURATION",
        severity: "warning",
        description: `Thời gian hoạt động bất thường (${act.activeDurationSeconds}s) trong bài "${act.title}".`,
        targetId: act.id,
        studentUid: act.studentUid,
        suggestedAction: "Đặt lại thời gian học thực tế bằng độ dài hợp lý.",
        safeToAutoRepair: true,
        details: { activeDurationSeconds: act.activeDurationSeconds },
      });
    }

    if (act.sourceSubmissionId) {
      const key = `${act.studentUid}_${act.sourceSubmissionId}`;
      if (seenActivityKeys.has(key)) {
        issues.push({
          id: `issue_dup_${act.id}`,
          type: "DUPLICATE_ACTIVITY",
          severity: "error",
          description: `Phát hiện hoạt động trùng lặp từ cùng một submission ${act.sourceSubmissionId}.`,
          targetId: act.id,
          studentUid: act.studentUid,
          suggestedAction: "Xóa hoặc hợp nhất hoạt động bị trùng lặp.",
          safeToAutoRepair: false,
          details: { sourceSubmissionId: act.sourceSubmissionId },
        });
      } else {
        seenActivityKeys.add(key);
      }
    }
  }

  // 2. Check revision tasks for orphans
  for (const t of tasks) {
    if (t.programId && !programIdSet.has(t.programId) && programs.length > 0) {
      issues.push({
        id: `issue_orphan_${t.id}`,
        type: "ORPHAN_TASK",
        severity: "warning",
        description: `Nhiệm vụ "${t.title}" trỏ tới lộ trình không tồn tại (${t.programId}).`,
        targetId: t.id,
        studentUid: t.studentUid,
        suggestedAction: "Gỡ bỏ nhiệm vụ mồ côi hoặc liên kết với lộ trình hiện hữu.",
        safeToAutoRepair: false,
        details: { programId: t.programId },
      });
    }
  }

  // 3. Check topic mastery mathematical consistency
  for (const m of masteries) {
    if (m.totalAttempts > 0) {
      const expectedAccuracy = Math.round((m.correctAttempts / m.totalAttempts) * 1000) / 10;
      if (Math.abs(m.accuracy - expectedAccuracy) > 1) {
        issues.push({
          id: `issue_mast_${m.id}`,
          type: "INCONSISTENT_MASTERY",
          severity: "info",
          description: `Độ chính xác chuyên đề ${m.topicName} (${m.accuracy}%) không khớp với tỷ lệ đúng (${expectedAccuracy}%).`,
          targetId: m.id,
          studentUid: m.studentUid,
          suggestedAction: "Tính toán lại độ chính xác tổng hợp chuẩn.",
          safeToAutoRepair: true,
          details: { currentAccuracy: m.accuracy, expectedAccuracy },
        });
      }
    }
  }

  return {
    scannedAt: new Date().toISOString(),
    totalActivitiesScanned: activities.length,
    totalProgramsScanned: programs.length,
    totalTasksScanned: tasks.length,
    totalMasteriesScanned: masteries.length,
    issues,
    isHealthy: issues.length === 0,
  };
}

/**
 * Reconciles identified issues. Supports safe dry-run mode.
 */
export async function repairLearningDataHealth(
  issues: LearningHealthIssue[],
  dryRun: boolean = true
): Promise<RepairResult> {
  const repairable = issues.filter((i) => i.safeToAutoRepair);

  if (dryRun) {
    return {
      dryRun: true,
      plannedRepairsCount: repairable.length,
      appliedRepairsCount: 0,
      repairedIssueIds: repairable.map((i) => i.id),
      message: `[Dry Run] Đã phát hiện ${repairable.length} mục có thể tự động sửa chữa an toàn. Không có dữ liệu nào bị thay đổi.`,
    };
  }

  let appliedCount = 0;
  const repairedIds: string[] = [];

  for (const issue of repairable) {
    try {
      if (issue.type === "INVALID_DURATION") {
        await updateDoc(doc(db, ACTIVITIES_COLLECTION, issue.targetId), {
          activeDurationSeconds: Math.max(0, Math.min(7200, issue.details?.activeDurationSeconds || 0)),
          updatedAt: new Date().toISOString(),
        });
        appliedCount++;
        repairedIds.push(issue.id);
      } else if (issue.type === "INCONSISTENT_MASTERY") {
        if (issue.details?.expectedAccuracy !== undefined) {
          await updateDoc(doc(db, TOPIC_MASTERY_COLLECTION, issue.targetId), {
            accuracy: issue.details.expectedAccuracy,
            updatedAt: new Date().toISOString(),
          });
          appliedCount++;
          repairedIds.push(issue.id);
        }
      }
    } catch (err) {
      console.warn(`[LearningReconciliation] Could not repair issue ${issue.id}:`, err);
    }
  }

  return {
    dryRun: false,
    plannedRepairsCount: repairable.length,
    appliedRepairsCount: appliedCount,
    repairedIssueIds: repairedIds,
    message: `Đã áp dụng sửa chữa ${appliedCount}/${repairable.length} mục dữ liệu thành công.`,
  };
}
