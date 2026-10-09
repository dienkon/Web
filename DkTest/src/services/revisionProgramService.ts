/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Revision Program & Task Service for DkTEST Learning Intelligence
 * Manages creation, lifecycle, progress calculation, and daily task retrieval.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase/config";
import type {
  RevisionProgram,
  RevisionProgramConfigInput,
  RevisionProgramStatus,
  RevisionTask,
} from "../types/revisionProgram";
import { formatDate, scheduleRevisionTasks } from "./revisionTaskScheduler";

export const PROGRAMS_COLLECTION = "revision_programs";
export const TASKS_COLLECTION = "revision_tasks";

const LOCAL_PROGRAMS_PREFIX = "dktest_revision_programs_";
const LOCAL_TASKS_PREFIX = "dktest_revision_tasks_";

export function getLocalPrograms(studentUid: string): RevisionProgram[] {
  if (!studentUid) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_PROGRAMS_PREFIX}${studentUid}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("[RevisionProgramService] Error reading local programs cache:", err);
  }
  return [];
}

export function saveLocalPrograms(studentUid: string, programs: RevisionProgram[]): void {
  if (!studentUid) return;
  try {
    localStorage.setItem(`${LOCAL_PROGRAMS_PREFIX}${studentUid}`, JSON.stringify(programs.slice(0, 50)));
  } catch (err) {
    console.warn("[RevisionProgramService] Error saving local programs cache:", err);
  }
}

export function getLocalTasks(studentUid: string): RevisionTask[] {
  if (!studentUid) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_TASKS_PREFIX}${studentUid}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("[RevisionProgramService] Error reading local tasks cache:", err);
  }
  return [];
}

export function saveLocalTasks(studentUid: string, tasks: RevisionTask[]): void {
  if (!studentUid) return;
  try {
    localStorage.setItem(`${LOCAL_TASKS_PREFIX}${studentUid}`, JSON.stringify(tasks.slice(0, 200)));
  } catch (err) {
    console.warn("[RevisionProgramService] Error saving local tasks cache:", err);
  }
}

/**
 * Creates a new revision program and schedules all associated tasks.
 */
export async function createRevisionProgram(
  config: RevisionProgramConfigInput
): Promise<{ program: RevisionProgram; tasks: RevisionTask[] }> {
  const nowIso = new Date().toISOString();
  const programId = `prog_${config.studentUid}_${Date.now()}`;
  const startDate = formatDate(new Date());

  const tasks = scheduleRevisionTasks(programId, config, startDate);

  const program: RevisionProgram = {
    id: programId,
    studentUid: config.studentUid,
    studentUsername: config.studentUsername,
    type: config.type,
    title: config.title || `Lộ trình ôn tập: ${config.subject}`,
    description: `Kế hoạch ôn tập cá nhân hóa môn ${config.subject} với mục tiêu rèn luyện hàng ngày.`,
    subject: config.subject,
    targetExamName: config.targetExamName,
    targetExamDate: config.targetExamDate,
    status: "active",
    startDate,
    dailyTargetMinutes: config.dailyTargetMinutes,
    weeklyDays: config.weeklyDays,
    topics: config.topics,
    initialLevel: config.initialLevel || "intermediate",
    progress: {
      totalTasks: tasks.length,
      completedTasks: 0,
      pendingTasks: tasks.length,
      percentComplete: 0,
      totalStudyMinutesLogged: 0,
      currentStreakDays: 0,
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // 1. Update local storage cache
  const currentProgs = getLocalPrograms(config.studentUid);
  saveLocalPrograms(config.studentUid, [program, ...currentProgs]);

  const currentTasks = getLocalTasks(config.studentUid);
  saveLocalTasks(config.studentUid, [...tasks, ...currentTasks]);

  // 2. Persist to Firestore asynchronously
  try {
    await setDoc(doc(db, PROGRAMS_COLLECTION, program.id), program);
    for (const t of tasks) {
      await setDoc(doc(db, TASKS_COLLECTION, t.id), t);
    }
  } catch (err) {
    console.warn("[RevisionProgramService] Firestore write failed for new program, preserved in local cache:", err);
  }

  return { program, tasks };
}

/**
 * Retrieves all revision programs for a student.
 */
export async function getStudentRevisionPrograms(studentUid: string): Promise<RevisionProgram[]> {
  if (!studentUid) return [];

  try {
    const q = query(
      collection(db, PROGRAMS_COLLECTION),
      where("studentUid", "==", studentUid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const items = snap.docs.map((d) => d.data() as RevisionProgram);
      saveLocalPrograms(studentUid, items);
      return items;
    }
    // Successful empty query response from Firestore: do not resurrect deleted records
    saveLocalPrograms(studentUid, []);
    return [];
  } catch (err) {
    console.warn("[RevisionProgramService] Firestore getStudentRevisionPrograms failed, using fallback:", err);
  }

  return getLocalPrograms(studentUid);
}

/**
 * Retrieves all tasks for a specific program.
 */
export async function getProgramTasks(programId: string, studentUid: string): Promise<RevisionTask[]> {
  if (!programId) return [];

  try {
    const q = query(
      collection(db, TASKS_COLLECTION),
      where("programId", "==", programId),
      orderBy("orderIndex", "asc")
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as RevisionTask);
    }
    return [];
  } catch (err) {
    console.warn("[RevisionProgramService] Firestore getProgramTasks failed, checking local cache:", err);
  }

  const allLocal = getLocalTasks(studentUid);
  return allLocal.filter((t) => t.programId === programId).sort((a, b) => a.orderIndex - b.orderIndex);
}

/**
 * Retrieves tasks due for today (or overdue) across all active programs.
 * Can reuse preloadedPrograms to prevent a redundant getStudentRevisionPrograms call.
 */
export async function getTodayTasks(
  studentUid: string,
  targetDateStr: string = formatDate(new Date()),
  preloadedPrograms?: RevisionProgram[]
): Promise<RevisionTask[]> {
  if (!studentUid) return [];

  // Check active programs (reuse preloadedPrograms if available to save reads)
  const programs = preloadedPrograms ?? (await getStudentRevisionPrograms(studentUid));
  const activeProgIds = new Set(programs.filter((p) => p.status === "active").map((p) => p.id));

  let tasks: RevisionTask[] = [];

  try {
    const q = query(
      collection(db, TASKS_COLLECTION),
      where("studentUid", "==", studentUid),
      where("status", "==", "pending"),
      limit(50)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      tasks = snap.docs.map((d) => d.data() as RevisionTask);
      saveLocalTasks(studentUid, tasks);
    } else {
      tasks = [];
      saveLocalTasks(studentUid, []);
    }
  } catch (err) {
    console.warn("[RevisionProgramService] Firestore getTodayTasks failed, fallback to local:", err);
    tasks = getLocalTasks(studentUid);
  }

  // Filter tasks belonging to active programs and due on or before targetDate
  return tasks
    .filter((t) => {
      const isPending = t.status === "pending" || t.status === "in_progress";
      const isActiveProg = activeProgIds.size === 0 || activeProgIds.has(t.programId);
      const isDue = t.dueDate <= targetDateStr;
      return isPending && isActiveProg && isDue;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.orderIndex - b.orderIndex);
}

/**
 * Marks a task as completed and recalculates the parent program's progress.
 */
export async function completeTask(
  taskId: string,
  studentUid: string,
  params?: {
    activityId?: string;
    scoreAchieved?: number;
    accuracyAchieved?: number;
  }
): Promise<void> {
  const nowIso = new Date().toISOString();

  // 1. Update local cache for task
  const localTasks = getLocalTasks(studentUid);
  const taskIdx = localTasks.findIndex((t) => t.id === taskId);
  let targetProgramId = "";

  if (taskIdx >= 0) {
    const updated = {
      ...localTasks[taskIdx],
      status: "completed" as const,
      completedAt: nowIso,
      completedActivityId: params?.activityId,
      scoreAchieved: params?.scoreAchieved,
      accuracyAchieved: params?.accuracyAchieved,
      updatedAt: nowIso,
    };
    localTasks[taskIdx] = updated;
    targetProgramId = updated.programId;
    saveLocalTasks(studentUid, localTasks);
  }

  // 2. Recalculate parent program progress
  if (targetProgramId) {
    const localPrograms = getLocalPrograms(studentUid);
    const progIdx = localPrograms.findIndex((p) => p.id === targetProgramId);
    if (progIdx >= 0) {
      const progTasks = localTasks.filter((t) => t.programId === targetProgramId);
      const completedCount = progTasks.filter((t) => t.status === "completed").length;
      const totalCount = progTasks.length;
      const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      const prog = localPrograms[progIdx];
      const updatedProg: RevisionProgram = {
        ...prog,
        status: percent === 100 ? "completed" : prog.status,
        progress: {
          ...prog.progress,
          completedTasks: completedCount,
          pendingTasks: Math.max(0, totalCount - completedCount),
          percentComplete: percent,
        },
        updatedAt: nowIso,
      };
      localPrograms[progIdx] = updatedProg;
      saveLocalPrograms(studentUid, localPrograms);

      // Persist program update to Firestore
      try {
        await updateDoc(doc(db, PROGRAMS_COLLECTION, targetProgramId), {
          status: updatedProg.status,
          progress: updatedProg.progress,
          updatedAt: nowIso,
        });
      } catch (err) {
        console.warn("[RevisionProgramService] Could not update program progress in Firestore:", err);
      }
    }
  }

  // 3. Persist task to Firestore
  try {
    await updateDoc(doc(db, TASKS_COLLECTION, taskId), {
      status: "completed",
      completedAt: nowIso,
      completedActivityId: params?.activityId || null,
      scoreAchieved: params?.scoreAchieved || null,
      accuracyAchieved: params?.accuracyAchieved || null,
      updatedAt: nowIso,
    });
  } catch (err) {
    console.warn(`[RevisionProgramService] Could not complete task ${taskId} in Firestore:`, err);
  }
}

/**
 * Reschedules a task to a new due date.
 */
export async function rescheduleTask(
  taskId: string,
  studentUid: string,
  newDueDate: string
): Promise<void> {
  const nowIso = new Date().toISOString();

  const localTasks = getLocalTasks(studentUid);
  const taskIdx = localTasks.findIndex((t) => t.id === taskId);
  if (taskIdx >= 0) {
    localTasks[taskIdx] = {
      ...localTasks[taskIdx],
      dueDate: newDueDate,
      rescheduleCount: (localTasks[taskIdx].rescheduleCount || 0) + 1,
      lastRescheduledAt: nowIso,
      updatedAt: nowIso,
    };
    saveLocalTasks(studentUid, localTasks);
  }

  try {
    await updateDoc(doc(db, TASKS_COLLECTION, taskId), {
      dueDate: newDueDate,
      rescheduleCount: ((localTasks[taskIdx]?.rescheduleCount) || 1),
      lastRescheduledAt: nowIso,
      updatedAt: nowIso,
    });
  } catch (err) {
    console.warn(`[RevisionProgramService] Could not reschedule task in Firestore:`, err);
  }
}

/**
 * Skips a task.
 */
export async function skipTask(taskId: string, studentUid: string): Promise<void> {
  const nowIso = new Date().toISOString();

  const localTasks = getLocalTasks(studentUid);
  const taskIdx = localTasks.findIndex((t) => t.id === taskId);
  if (taskIdx >= 0) {
    localTasks[taskIdx] = {
      ...localTasks[taskIdx],
      status: "skipped",
      updatedAt: nowIso,
    };
    saveLocalTasks(studentUid, localTasks);
  }

  try {
    await updateDoc(doc(db, TASKS_COLLECTION, taskId), {
      status: "skipped",
      updatedAt: nowIso,
    });
  } catch (err) {
    console.warn(`[RevisionProgramService] Could not skip task in Firestore:`, err);
  }
}

/**
 * Updates a program's overall status (active, paused, completed, archived).
 */
export async function updateProgramStatus(
  programId: string,
  studentUid: string,
  status: RevisionProgramStatus
): Promise<void> {
  const nowIso = new Date().toISOString();

  const localPrograms = getLocalPrograms(studentUid);
  const progIdx = localPrograms.findIndex((p) => p.id === programId);
  if (progIdx >= 0) {
    localPrograms[progIdx] = {
      ...localPrograms[progIdx],
      status,
      updatedAt: nowIso,
    };
    saveLocalPrograms(studentUid, localPrograms);
  }

  try {
    await updateDoc(doc(db, PROGRAMS_COLLECTION, programId), {
      status,
      updatedAt: nowIso,
    });
  } catch (err) {
    console.warn(`[RevisionProgramService] Could not update program status in Firestore:`, err);
  }
}
