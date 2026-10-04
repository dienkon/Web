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
import { FirestoreCache } from "./firebase/firestoreCache";
import { FirestoreRepository } from "./firebase/firestoreRepository";
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
      FirestoreCache.invalidate("doc:system_stats:overview");
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
        FirestoreCache.invalidate(`doc:exam_stats:${examId}`);
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
  return FirestoreCache.getOrFetch<SystemStatsOverview | null>(
    "doc:system_stats:overview",
    async () => {
      try {
        const t0 = performance.now();
        const overviewRef = doc(db, "system_stats", "overview");
        const snap = await getDoc(overviewRef);
        logDocRead("system_stats", "overview", snap.exists(), performance.now() - t0, "Aggregated dashboard metrics");

        if (snap.exists()) {
          return snap.data() as SystemStatsOverview;
        }
      } catch (err) {
        console.warn("[StatsAggregator] Error fetching system_stats/overview:", err);
      }
      return null;
    },
    45 * 1000,
    forceRefresh
  );
}

/**
 * Get aggregated stats for a specific exam (1 doc read or 0 if cached)
 */
export async function getExamAggregatedStats(examId: string): Promise<ExamAggregatedStats | null> {
  return FirestoreRepository.getDocument<ExamAggregatedStats>("exam_stats", examId, {
    ttlMs: 60 * 1000,
    purpose: "Specific exam aggregated stats",
  });
}

export interface ExamSummaryItem {
  id: string;
  title: string;
  code?: string;
  description?: string;
  subject?: string;
  gradeCategory?: string;
  timeLimit?: number;
  totalQuestions?: number;
  status: "published" | "draft" | "unlisted";
  folderId?: string | null;
  ownerId?: string | null;
  isFeatured?: boolean;
  attemptCount?: number;
  submissionsCount?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface ExamsCatalogSummary {
  exams: ExamSummaryItem[];
  totalCount: number;
  lastUpdated: string;
}

export const getExamTimestampMs = (val: any): number => {
  if (!val) return 0;
  if (typeof val.toMillis === "function") return val.toMillis();
  if (typeof val.toDate === "function") return val.toDate().getTime();
  if (typeof val.seconds === "number") return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  if (typeof val === "number") return val;
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Reads the centralized exams catalog summary in EXACTLY 1 FIRESTORE READ.
 * Returns all active exams sorted from newest to oldest.
 * If the doc does not exist yet, auto-heals by aggregating existing exams once.
 */
export async function getExamsCatalogSummary(forceRefresh = false): Promise<ExamsCatalogSummary> {
  const cacheKey = "doc:system_stats:exams_summary";
  if (!forceRefresh) {
    const cached = FirestoreCache.get<ExamsCatalogSummary>(cacheKey);
    if (cached && Array.isArray(cached.exams)) {
      logCacheHit("Exams Catalog Summary Cache");
      return cached;
    }
  }

  try {
    const t0 = performance.now();
    const catalogRef = doc(db, "system_stats", "exams_summary");
    const snap = await getDoc(catalogRef);
    logDocRead("system_stats", "exams_summary", snap.exists(), performance.now() - t0, "1-read exams catalog summary");

    if (snap.exists()) {
      const data = snap.data() as ExamsCatalogSummary;
      if (Array.isArray(data.exams)) {
        // Ensure robust sorting by newest first
        data.exams.sort((a, b) => {
          const timeA = getExamTimestampMs(a.updatedAt) || getExamTimestampMs(a.createdAt);
          const timeB = getExamTimestampMs(b.updatedAt) || getExamTimestampMs(b.createdAt);
          return timeB - timeA;
        });
        FirestoreCache.set(cacheKey, data, 60 * 1000);
        return data;
      }
    }
  } catch (err) {
    console.warn("[StatsAggregator] Warning reading system_stats/exams_summary:", err);
  }

  // Auto-heal fallback: Fetch exams collection, sort, and save to system_stats/exams_summary
  try {
    const t0 = performance.now();
    const snap = await getDocs(collection(db, "exams"));
    logQueryRead("exams", snap.size, 100, performance.now() - t0, "Auto-heal exams catalog summary");

    const rawExams: ExamSummaryItem[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title || "Bài thi không tên",
        code: data.code || "",
        description: data.description || "",
        subject: data.subject || "Khác",
        gradeCategory: data.gradeCategory || "",
        timeLimit: typeof data.timeLimit === "number" ? data.timeLimit : 45,
        totalQuestions: Array.isArray(data.questions) ? data.questions.length : (data.totalQuestions || 0),
        status: data.status || "published",
        folderId: data.folderId ?? null,
        ownerId: data.ownerId ?? null,
        isFeatured: !!data.isFeatured,
        attemptCount: data.attemptCount || data.submissionsCount || 0,
        submissionsCount: data.submissionsCount || data.attemptCount || 0,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || data.createdAt || null,
      };
    });

    rawExams.sort((a, b) => {
      const timeA = getExamTimestampMs(a.updatedAt) || getExamTimestampMs(a.createdAt);
      const timeB = getExamTimestampMs(b.updatedAt) || getExamTimestampMs(b.createdAt);
      return timeB - timeA;
    });

    const catalogData: ExamsCatalogSummary = {
      exams: rawExams,
      totalCount: rawExams.length,
      lastUpdated: new Date().toISOString(),
    };

    // Save to system_stats/exams_summary for future 1-read queries (non-blocking)
    setDoc(doc(db, "system_stats", "exams_summary"), catalogData)
      .then(() => logDocWrite("system_stats", "exams_summary", "SET", "Auto-heal persisted"))
      .catch((e) => console.warn("[StatsAggregator] Failed to persist exams_summary auto-heal:", e));

    FirestoreCache.set(cacheKey, catalogData, 60 * 1000);
    return catalogData;
  } catch (healErr) {
    console.error("[StatsAggregator] Critical error building exams catalog:", healErr);
    return { exams: [], totalCount: 0, lastUpdated: new Date().toISOString() };
  }
}

/**
 * Atomically synchronizes an exam change (create, update, or delete) to system_stats/exams_summary.
 */
export async function syncExamToCatalogSummary(
  exam: Partial<ExamSummaryItem> & { id: string },
  action: "upsert" | "delete"
): Promise<void> {
  const cacheKey = "doc:system_stats:exams_summary";
  FirestoreCache.invalidate(cacheKey);

  try {
    const catalogRef = doc(db, "system_stats", "exams_summary");
    const snap = await getDoc(catalogRef);
    let currentExams: ExamSummaryItem[] = [];

    if (snap.exists()) {
      const data = snap.data() as ExamsCatalogSummary;
      if (Array.isArray(data.exams)) {
        currentExams = [...data.exams];
      }
    }

    if (action === "delete") {
      currentExams = currentExams.filter((e) => e.id !== exam.id);
    } else {
      const existingIdx = currentExams.findIndex((e) => e.id === exam.id);
      const updatedItem: ExamSummaryItem = {
        id: exam.id,
        title: exam.title || "Bài thi",
        code: exam.code || "",
        description: exam.description || "",
        subject: exam.subject || "Khác",
        gradeCategory: exam.gradeCategory || "",
        timeLimit: typeof exam.timeLimit === "number" ? exam.timeLimit : 45,
        totalQuestions: exam.totalQuestions || 0,
        status: exam.status || "published",
        folderId: exam.folderId !== undefined ? exam.folderId : null,
        ownerId: exam.ownerId !== undefined ? exam.ownerId : null,
        isFeatured: exam.isFeatured !== undefined ? exam.isFeatured : false,
        attemptCount: exam.attemptCount || 0,
        submissionsCount: exam.submissionsCount || 0,
        createdAt: exam.createdAt || new Date().toISOString(),
        updatedAt: exam.updatedAt || new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        currentExams[existingIdx] = { ...currentExams[existingIdx], ...updatedItem };
      } else {
        currentExams.unshift(updatedItem);
      }
    }

    currentExams.sort((a, b) => {
      const timeA = getExamTimestampMs(a.updatedAt) || getExamTimestampMs(a.createdAt);
      const timeB = getExamTimestampMs(b.updatedAt) || getExamTimestampMs(b.createdAt);
      return timeB - timeA;
    });

    const newCatalog: ExamsCatalogSummary = {
      exams: currentExams,
      totalCount: currentExams.length,
      lastUpdated: new Date().toISOString(),
    };

    await setDoc(catalogRef, newCatalog);
    logDocWrite("system_stats", "exams_summary", "SET", `Catalog sync: ${action} ${exam.id}`);
    FirestoreCache.set(cacheKey, newCatalog, 60 * 1000);
  } catch (err) {
    console.warn("[StatsAggregator] Warning syncing exam to catalog:", err);
  }
}
