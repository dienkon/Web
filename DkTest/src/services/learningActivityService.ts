/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Canonical Learning Activity Service for DkTEST Learning Intelligence
 * Provides idempotent tracking, honest active time calculation, and unified activity querying.
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
  where,
} from "firebase/firestore";
import { db } from "./firebase/config";
import type {
  ActivityLifecycleEvent,
  LearningActivity,
  LearningActivityFilter,
  LearningActivityOrigin,
  StudentLearningStats,
} from "../types/learningActivity";
import type { Exam, Submission } from "../types";
import type { PracticeResultSummary } from "../practice/core/types";

export const ACTIVITIES_COLLECTION = "learning_activities";
const LOCAL_ACTIVITIES_PREFIX = "dktest_learning_activities_";

export function buildActivityId(
  studentUid: string,
  origin: LearningActivityOrigin,
  sourceId: string
): string {
  const cleanUid = (studentUid || "anon").replace(/[^a-zA-Z0-9_-]/g, "_");
  const cleanSourceId = (sourceId || Date.now().toString()).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `act_${cleanUid}_${origin}_${cleanSourceId}`;
}

export function calculateAccuracy(correct: number, answered: number): number {
  if (!answered || answered <= 0) return 0;
  const ratio = (correct / answered) * 100;
  return Math.min(100, Math.max(0, Math.round(ratio * 10) / 10));
}

export function calculateHonestDuration(events: ActivityLifecycleEvent[]): {
  activeDurationSeconds: number;
  totalDurationSeconds: number;
} {
  if (!events || events.length === 0) {
    return { activeDurationSeconds: 0, totalDurationSeconds: 0 };
  }

  let activeDuration = 0;
  let lastActiveTimestamp: number | null = null;
  let isRunning = false;

  const firstEventTime = new Date(events[0].timestamp).getTime();
  let lastEventTime = firstEventTime;

  for (const ev of events) {
    const curTime = new Date(ev.timestamp).getTime();
    if (isNaN(curTime)) continue;

    if (curTime > lastEventTime) {
      lastEventTime = curTime;
    }

    if (ev.event === "start" || ev.event === "resume") {
      if (!isRunning) {
        isRunning = true;
        lastActiveTimestamp = curTime;
      }
    } else if (ev.event === "pause") {
      if (isRunning && lastActiveTimestamp !== null) {
        const delta = Math.max(0, Math.floor((curTime - lastActiveTimestamp) / 1000));
        activeDuration += delta;
        isRunning = false;
        lastActiveTimestamp = null;
      }
    } else if (ev.event === "submit" || ev.event === "complete" || ev.event === "abandon") {
      if (isRunning && lastActiveTimestamp !== null) {
        const delta = Math.max(0, Math.floor((curTime - lastActiveTimestamp) / 1000));
        activeDuration += delta;
        isRunning = false;
        lastActiveTimestamp = null;
      }
    }
  }

  const totalDuration = Math.max(0, Math.floor((lastEventTime - firstEventTime) / 1000));
  return {
    activeDurationSeconds: Math.min(activeDuration, totalDuration > 0 ? totalDuration : activeDuration),
    totalDurationSeconds: totalDuration,
  };
}

export function getLocalCachedActivities(studentUid: string): LearningActivity[] {
  if (!studentUid || typeof localStorage === "undefined" || !localStorage?.getItem) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_ACTIVITIES_PREFIX}${studentUid}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("[LearningActivityService] Error reading local activities cache:", err);
  }
  return [];
}

export function saveLocalCachedActivities(studentUid: string, activities: LearningActivity[]): void {
  if (!studentUid || typeof localStorage === "undefined" || !localStorage?.setItem) return;
  try {
    const trimmed = activities.slice(0, 100);
    localStorage.setItem(`${LOCAL_ACTIVITIES_PREFIX}${studentUid}`, JSON.stringify(trimmed));
  } catch (err) {
    console.warn("[LearningActivityService] Error writing local activities cache:", err);
  }
}

/**
 * Idempotently saves or merges a learning activity into Firestore and local cache.
 */
export async function saveLearningActivity(activity: LearningActivity): Promise<void> {
  if (!activity || !activity.id) return;

  // 1. Update local cache immediately
  const localList = getLocalCachedActivities(activity.studentUid);
  const existingIdx = localList.findIndex((item) => item.id === activity.id);
  let updatedList: LearningActivity[];
  if (existingIdx >= 0) {
    updatedList = [...localList];
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...activity, updatedAt: new Date().toISOString() };
  } else {
    updatedList = [activity, ...localList];
  }
  saveLocalCachedActivities(activity.studentUid, updatedList);

  // 2. Persist to Firestore asynchronously
  try {
    const docRef = doc(db, ACTIVITIES_COLLECTION, activity.id);
    await setDoc(docRef, { ...activity, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn(`[LearningActivityService] Could not persist activity ${activity.id} to Firestore:`, err);
  }
}

/**
 * Retrieves paginated learning activities for a student with optional filtering.
 */
export async function getStudentLearningActivities(
  filter: LearningActivityFilter
): Promise<LearningActivity[]> {
  const { studentUid, origin, subject, status, limitCount = 20 } = filter;
  if (!studentUid) return [];

  try {
    const actRef = collection(db, ACTIVITIES_COLLECTION);
    let q = query(
      actRef,
      where("studentUid", "==", studentUid),
      orderBy("startedAt", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const results: LearningActivity[] = snapshot.docs.map((d) => d.data() as LearningActivity);
      saveLocalCachedActivities(studentUid, results);
      let filtered = results;
      if (origin) {
        filtered = filtered.filter((a) => a.origin === origin);
      }
      if (subject) {
        filtered = filtered.filter((a) => a.subject === subject);
      }
      if (status) {
        filtered = filtered.filter((a) => a.status === status);
      }
      return filtered;
    }
    // Successful empty query response from Firestore: do not resurrect deleted records
    saveLocalCachedActivities(studentUid, []);
    return [];
  } catch (err) {
    console.warn("[LearningActivityService] Firestore query error, using local cache fallback:", err);
  }

  // Fallback to local storage only upon actual network/query errors
  let localList = getLocalCachedActivities(studentUid);
  if (origin) {
    localList = localList.filter((a) => a.origin === origin);
  }
  if (subject) {
    localList = localList.filter((a) => a.subject === subject);
  }
  if (status) {
    localList = localList.filter((a) => a.status === status);
  }
  return localList.slice(0, limitCount);
}

/**
 * Pure aggregation function: Computes honest statistics from an array of learning activities.
 * Avoids any duplicate Firestore reads when activities are already in memory.
 */
export function computeStudentLearningStats(activities: LearningActivity[]): StudentLearningStats {
  let totalActiveSeconds = 0;
  let totalCorrect = 0;
  let totalAnswered = 0;
  let formalExamsCount = 0;
  let practiceSessionsCount = 0;
  let oldExamReviewsCount = 0;
  let journeyChallengesCount = 0;

  const activeDates = new Set<string>();

  for (const act of activities) {
    if (act.status === "completed" || act.status === "submitted") {
      totalActiveSeconds += act.activeDurationSeconds || 0;
      totalCorrect += act.correctQuestions || 0;
      totalAnswered += act.answeredQuestions || 0;

      if (act.origin === "formal_exam") formalExamsCount++;
      else if (act.origin === "practice_session") practiceSessionsCount++;
      else if (act.origin === "old_exam_review") oldExamReviewsCount++;
      else if (act.origin === "journey_challenge") journeyChallengesCount++;

      if (act.completedAt) {
        const dateStr = act.completedAt.split("T")[0];
        activeDates.add(dateStr);
      }
    }
  }

  // Calculate current streak days
  const sortedDates = Array.from(activeDates).sort().reverse();
  let currentStreak = 0;
  if (sortedDates.length > 0) {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    let checkDate = sortedDates[0] === today ? today : sortedDates[0] === yesterday ? yesterday : null;
    if (checkDate) {
      let targetTime = new Date(checkDate).getTime();
      for (const d of sortedDates) {
        const dTime = new Date(d).getTime();
        const diffDays = Math.round((targetTime - dTime) / 86400000);
        if (diffDays === 0) {
          currentStreak++;
          targetTime -= 86400000;
        } else {
          break;
        }
      }
    }
  }

  return {
    totalActivitiesCompleted: formalExamsCount + practiceSessionsCount + oldExamReviewsCount + journeyChallengesCount,
    totalActiveStudyMinutes: Math.round(totalActiveSeconds / 60),
    averageAccuracy: calculateAccuracy(totalCorrect, totalAnswered),
    formalExamsCount,
    practiceSessionsCount,
    oldExamReviewsCount,
    journeyChallengesCount,
    currentStreakDays: currentStreak,
    lastActiveDate: sortedDates[0],
  };
}

/**
 * Computes honest aggregated statistics from the student's activities.
 * Can reuse preloaded activities to prevent redundant Firestore queries.
 */
export async function getStudentLearningStats(
  studentUid: string,
  preloadedActivities?: LearningActivity[]
): Promise<StudentLearningStats> {
  const activities =
    preloadedActivities ?? (await getStudentLearningActivities({ studentUid, limitCount: 100 }));
  return computeStudentLearningStats(activities);
}

/**
 * Bridges a formal exam Submission into a canonical LearningActivity.
 * Ensures strict idempotency via deterministic ID.
 */
export async function syncFromSubmission(
  submission: Submission,
  exam: Exam,
  studentUid: string
): Promise<LearningActivity> {
  const isRetake = Boolean(submission.isRetake || exam.isRetake || submission.originalExamId);
  const origin: LearningActivityOrigin = isRetake ? "old_exam_review" : "formal_exam";
  const activityId = buildActivityId(studentUid, origin, submission.id);

  const answeredCount = submission.answers ? Object.keys(submission.answers).length : 0;
  const correctCount = submission.correctCount || 0;
  const totalCount = submission.totalCount || exam.questionCount || answeredCount;
  const activeSeconds = Math.max(0, submission.timeSpent || 0);

  const submittedAtIso = submission.submittedAt?.toDate
    ? submission.submittedAt.toDate().toISOString()
    : new Date().toISOString();

  const activity: LearningActivity = {
    id: activityId,
    studentUid,
    studentUsername: submission.studentUsername || submission.studentNameSnapshot || "hoc_sinh",
    studentDisplayName: submission.studentNameSnapshot,
    origin,
    sourceExamId: submission.examId,
    sourceSubmissionId: submission.id,
    title: submission.examTitleSnapshot || exam.title || "Bài thi",
    subject: exam.subject || "Tổng hợp",
    gradeCategory: exam.gradeCategory,
    status: "completed",
    startedAt: submittedAtIso,
    submittedAt: submittedAtIso,
    completedAt: submittedAtIso,
    activeDurationSeconds: activeSeconds,
    totalDurationSeconds: activeSeconds,
    score: submission.score,
    maxScore: submission.maxScore || 10,
    scorePercentage: submission.maxScore ? Math.round((submission.score / submission.maxScore) * 100) : 0,
    totalQuestions: totalCount,
    answeredQuestions: answeredCount,
    correctQuestions: correctCount,
    accuracy: calculateAccuracy(correctCount, answeredCount),
    lifecycleEvents: [
      {
        event: "start",
        timestamp: submittedAtIso,
      },
      {
        event: "submit",
        timestamp: submittedAtIso,
        activeDurationDeltaSeconds: activeSeconds,
      },
      {
        event: "complete",
        timestamp: submittedAtIso,
      },
    ],
    isCountedInStreak: true,
    isCountedInMastery: true,
    createdAt: submittedAtIso,
    updatedAt: new Date().toISOString(),
  };

  await saveLearningActivity(activity);
  return activity;
}

/**
 * Bridges a PracticeResultSummary into a canonical LearningActivity.
 */
export async function syncFromPracticeResult(
  result: PracticeResultSummary,
  studentUid: string,
  username: string
): Promise<LearningActivity> {
  const origin: LearningActivityOrigin = "practice_session";
  const activityId = buildActivityId(studentUid, origin, result.sessionId);

  const nowIso = result.completedAt || new Date().toISOString();
  const activeSeconds = Math.max(0, result.durationSeconds || 0);

  const activity: LearningActivity = {
    id: activityId,
    studentUid,
    studentUsername: username,
    origin,
    title: `Luyện tập: ${result.modeTitle}`,
    subject:
      result.category === "physics"
        ? "Vật Lý"
        : result.category === "chemistry"
        ? "Hóa Học"
        : result.category === "cs"
        ? "Tin học"
        : result.category === "english"
        ? "Tiếng Anh"
        : "Toán",
    status: "completed",
    startedAt: nowIso,
    submittedAt: nowIso,
    completedAt: nowIso,
    activeDurationSeconds: activeSeconds,
    totalDurationSeconds: activeSeconds,
    score: result.score,
    maxScore: result.totalQuestions * 10,
    scorePercentage: Math.round(result.accuracy),
    totalQuestions: result.totalQuestions,
    answeredQuestions: result.answeredCount,
    correctQuestions: result.correctCount,
    accuracy: calculateAccuracy(result.correctCount, result.answeredCount),
    lifecycleEvents: [
      { event: "start", timestamp: nowIso },
      { event: "complete", timestamp: nowIso, activeDurationDeltaSeconds: activeSeconds },
    ],
    isCountedInStreak: true,
    isCountedInMastery: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await saveLearningActivity(activity);
  return activity;
}
