/**
 * Aggregated Statistics Service
 * Maintains single-document counters and metrics (system_stats/overview and exam_stats/{examId})
 * Eliminates scanning entire collections to compute totals or render dashboards.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  query,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase/config";
import type { Submission } from "../types";
import { logDocRead, logDocWrite, logCacheHit, logQueryRead } from "../utils/firestoreLogger";

export interface SystemStatsOverview {
  totalSubmissions: number;
  totalScoreSum: number;
  averageScore: number;
  totalExams: number;
  totalAccounts: number;
  studentAccounts: number;
  parentAccounts: number;
  adminAccounts: number;
  teacherAccounts: number;
  activeAccounts: number;
  submissionsToday: number;
  submissions7Days: number;
  submissions30Days: number;
  recentSubmissions: Array<{
    id: string;
    examId: string;
    examTitle?: string;
    studentId?: string;
    studentUsername?: string;
    studentNameSnapshot?: string;
    score: number;
    maxScore?: number;
    timeSpent?: number;
    submittedAt: string;
  }>;
  classDistribution: Record<string, number>;
  lastUpdated: string;
  updatedBy?: string;
}

export interface ExamAggregatedStats {
  examId: string;
  examTitle?: string;
  totalSubmissions: number;
  totalScoreSum: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  lastSubmittedAt: string;
  lastUpdated: string;
}

// In-memory Client Cache for system_stats
let cachedOverview: { data: SystemStatsOverview; timestamp: number } | null = null;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Update system_stats/overview and exam_stats/{examId} immediately after a submission is created.
 * Uses atomic increments so multiple students submitting simultaneously don't overwrite each other.
 */
export async function updateGlobalStatsOnSubmission(submission: Partial<Submission>): Promise<void> {
  const examId = submission.examId;
  const score = typeof submission.score === "number" ? submission.score : 0;
  const now = new Date().toISOString();

  // Create lightweight summary item for recent submissions list
  const recentItem = {
    id: submission.id || submission.attemptId || `sub_${Date.now()}`,
    examId: examId || "",
    examTitle: (submission as any).examTitleSnapshot || (submission as any).examTitle || "",
    studentId: submission.studentId || submission.studentUsername || "unknown",
    studentUsername: submission.studentUsername || "",
    studentNameSnapshot: submission.studentNameSnapshot || submission.studentUsername || "Thí sinh",
    score,
    maxScore: submission.maxScore || 10,
    timeSpent: submission.timeSpent || 0,
    submittedAt: now,
  };

  // 1. Update system_stats/overview
  const overviewRef = doc(db, "system_stats", "overview");
  try {
    const t0 = performance.now();
    const snap = await getDoc(overviewRef);
    logDocRead("system_stats", "overview", performance.now() - t0, "Pre-check before atomic update");

    if (snap.exists()) {
      const data = snap.data() as SystemStatsOverview;
      const currentRecent = Array.isArray(data.recentSubmissions) ? data.recentSubmissions : [];
      // Keep at most 10 recent submissions
      const updatedRecent = [recentItem, ...currentRecent.filter((s) => s.id !== recentItem.id)].slice(0, 10);

      const newTotal = (data.totalSubmissions || 0) + 1;
      const newScoreSum = (data.totalScoreSum || 0) + score;
      const newAvg = Number((newScoreSum / newTotal).toFixed(2));

      await updateDoc(overviewRef, {
        totalSubmissions: increment(1),
        totalScoreSum: increment(score),
        averageScore: newAvg,
        recentSubmissions: updatedRecent,
        lastUpdated: now,
        updatedBy: "submission_hook",
      });
      logDocWrite("system_stats", "overview", "UPDATE", "Atomic increment on submission");

      // Invalidate memory cache so next read gets fresh data
      cachedOverview = null;
    } else {
      // First-time initialization
      const initialOverview: SystemStatsOverview = {
        totalSubmissions: 1,
        totalScoreSum: score,
        averageScore: Number(score.toFixed(2)),
        totalExams: 1,
        totalAccounts: 1,
        studentAccounts: 1,
        parentAccounts: 0,
        adminAccounts: 0,
        teacherAccounts: 0,
        activeAccounts: 1,
        submissionsToday: 1,
        submissions7Days: 1,
        submissions30Days: 1,
        recentSubmissions: [recentItem],
        classDistribution: {},
        lastUpdated: now,
        updatedBy: "submission_hook_init",
      };
      await setDoc(overviewRef, initialOverview);
      logDocWrite("system_stats", "overview", "SET", "Initial creation on submission");
      cachedOverview = null;
    }
  } catch (err) {
    console.warn("[StatsAggregator] Warning updating system_stats/overview:", err);
  }

  // 2. Update exam_stats/{examId} if examId is provided
  if (examId) {
    const examStatsRef = doc(db, "exam_stats", examId);
    try {
      const t0 = performance.now();
      const examSnap = await getDoc(examStatsRef);
      logDocRead("exam_stats", examId, performance.now() - t0, "Exam stats update check");

      if (examSnap.exists()) {
        const d = examSnap.data() as ExamAggregatedStats;
        const newTotal = (d.totalSubmissions || 0) + 1;
        const newSum = (d.totalScoreSum || 0) + score;
        const newAvg = Number((newSum / newTotal).toFixed(2));
        const highest = Math.max(d.highestScore ?? score, score);
        const lowest = Math.min(d.lowestScore ?? score, score);

        await updateDoc(examStatsRef, {
          totalSubmissions: increment(1),
          totalScoreSum: increment(score),
          averageScore: newAvg,
          highestScore: highest,
          lowestScore: lowest,
          lastSubmittedAt: now,
          lastUpdated: now,
        });
        logDocWrite("exam_stats", examId, "UPDATE", "Atomic increment exam submissions");
      } else {
        const initialExamStats: ExamAggregatedStats = {
          examId,
          examTitle: (submission as any).examTitleSnapshot || "",
          totalSubmissions: 1,
          totalScoreSum: score,
          averageScore: Number(score.toFixed(2)),
          highestScore: score,
          lowestScore: score,
          lastSubmittedAt: now,
          lastUpdated: now,
        };
        await setDoc(examStatsRef, initialExamStats);
        logDocWrite("exam_stats", examId, "SET", "Initial creation exam stats");
      }
    } catch (examErr) {
      console.warn(`[StatsAggregator] Warning updating exam_stats/${examId}:`, examErr);
    }
  }
}

/**
 * Get aggregated system statistics.
 * Reads exactly 1 document (system_stats/overview) or 0 documents if memory cache is valid!
 */
export async function getAggregatedSystemStats(forceRefresh = false): Promise<SystemStatsOverview | null> {
  const now = Date.now();
  if (!forceRefresh && cachedOverview && now - cachedOverview.timestamp < CACHE_TTL_MS) {
    logCacheHit("system_stats/overview", "Served from memory cache");
    return cachedOverview.data;
  }

  try {
    const t0 = performance.now();
    const overviewRef = doc(db, "system_stats", "overview");
    const snap = await getDoc(overviewRef);
    logDocRead("system_stats", "overview", performance.now() - t0, "Aggregated dashboard metrics");

    if (snap.exists()) {
      const data = snap.data() as SystemStatsOverview;
      cachedOverview = { data, timestamp: now };
      return data;
    }
  } catch (err) {
    console.warn("[StatsAggregator] Error fetching system_stats/overview:", err);
  }

  return null;
}

/**
 * Get aggregated stats for a specific exam (1 doc read)
 */
export async function getExamAggregatedStats(examId: string): Promise<ExamAggregatedStats | null> {
  try {
    const t0 = performance.now();
    const examStatsRef = doc(db, "exam_stats", examId);
    const snap = await getDoc(examStatsRef);
    logDocRead("exam_stats", examId, performance.now() - t0, "Specific exam aggregated stats");

    if (snap.exists()) {
      return snap.data() as ExamAggregatedStats;
    }
  } catch (err) {
    console.warn(`[StatsAggregator] Error fetching exam_stats/${examId}:`, err);
  }
  return null;
}
