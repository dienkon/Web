/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Topic Mastery & Evidence Service for DkTEST Learning Intelligence
 * Tracks evidence-based topic competency with conservative confidence labeling.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase/config";
import type {
  SubjectMasterySummary,
  TopicConfidenceLevel,
  TopicEvidenceRecord,
  TopicMastery,
} from "../types/topicMastery";

export const TOPIC_MASTERY_COLLECTION = "topic_mastery";
const LOCAL_MASTERY_PREFIX = "dktest_topic_mastery_";

export function cleanKey(str: string): string {
  return (str || "unknown").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

export function buildTopicMasteryId(studentUid: string, subject: string, topicId: string): string {
  return `${cleanKey(studentUid)}_${cleanKey(subject)}_${cleanKey(topicId)}`;
}

/**
 * Pure evaluation function mapping attempt count and accuracy to conservative confidence level.
 */
export function evaluateConfidenceLevel(
  totalAttempts: number,
  accuracy: number
): TopicConfidenceLevel {
  if (totalAttempts < 5) {
    return "insufficient_evidence";
  }
  if (accuracy < 50) {
    return "needs_foundation";
  }
  if (accuracy < 70) {
    return "developing";
  }
  if (accuracy < 85) {
    return "progressing";
  }
  // To earn "mastered", student must have solid evidence (>= 15 questions) and >= 85% accuracy
  if (totalAttempts >= 15 && accuracy >= 85) {
    return "mastered";
  }
  return "progressing";
}

export function getLocalTopicMastery(studentUid: string): TopicMastery[] {
  if (!studentUid) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_MASTERY_PREFIX}${studentUid}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("[TopicMasteryService] Error reading local topic mastery cache:", err);
  }
  return [];
}

export function saveLocalTopicMastery(studentUid: string, items: TopicMastery[]): void {
  if (!studentUid) return;
  try {
    localStorage.setItem(`${LOCAL_MASTERY_PREFIX}${studentUid}`, JSON.stringify(items.slice(0, 100)));
  } catch (err) {
    console.warn("[TopicMasteryService] Error writing local topic mastery cache:", err);
  }
}

/**
 * Records practice evidence for a specific topic and recalculates confidence.
 */
export async function recordTopicEvidence(
  studentUid: string,
  studentUsername: string,
  subject: string,
  topicId: string,
  topicName: string,
  questionCount: number,
  correctCount: number,
  source: string
): Promise<TopicMastery> {
  const nowIso = new Date().toISOString();
  const docId = buildTopicMasteryId(studentUid, subject, topicId);
  const localList = getLocalTopicMastery(studentUid);
  const existing = localList.find((item) => item.id === docId);

  const prevTotal = existing ? existing.totalAttempts : 0;
  const prevCorrect = existing ? existing.correctAttempts : 0;

  const newTotal = prevTotal + questionCount;
  const newCorrect = prevCorrect + correctCount;
  const newAccuracy = newTotal > 0 ? Math.round((newCorrect / newTotal) * 1000) / 10 : 0;

  // Recent record
  const newRecord: TopicEvidenceRecord = {
    date: nowIso.split("T")[0],
    source,
    questionCount,
    correctCount,
    accuracy: questionCount > 0 ? Math.round((correctCount / questionCount) * 1000) / 10 : 0,
  };

  const existingHistory = existing?.evidenceHistory || [];
  const updatedHistory = [newRecord, ...existingHistory].slice(0, 10);

  // Compute recent accuracy from the last 10 evidence records
  const recentQuestions = updatedHistory.reduce((acc, h) => acc + h.questionCount, 0);
  const recentCorrect = updatedHistory.reduce((acc, h) => acc + h.correctCount, 0);
  const recentAccuracy =
    recentQuestions > 0 ? Math.round((recentCorrect / recentQuestions) * 1000) / 10 : newAccuracy;

  const confidenceLevel = evaluateConfidenceLevel(newTotal, newAccuracy);

  const masteryDoc: TopicMastery = {
    id: docId,
    studentUid,
    studentUsername,
    subject,
    topicId,
    topicName: topicName || topicId,
    confidenceLevel,
    totalAttempts: newTotal,
    correctAttempts: newCorrect,
    accuracy: newAccuracy,
    recentAccuracy,
    recentQuestionsCount: recentQuestions,
    evidenceHistory: updatedHistory,
    lastPracticedAt: nowIso,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
  };

  // 1. Update local cache
  const updatedList = [masteryDoc, ...localList.filter((m) => m.id !== docId)];
  saveLocalTopicMastery(studentUid, updatedList);

  // 2. Persist to Firestore
  try {
    await setDoc(doc(db, TOPIC_MASTERY_COLLECTION, docId), masteryDoc, { merge: true });
  } catch (err) {
    console.warn(`[TopicMasteryService] Firestore write failed for ${docId}:`, err);
  }

  return masteryDoc;
}

/**
 * Retrieves all topic mastery entries for a student, optionally filtered by subject.
 */
export async function getStudentTopicMastery(
  studentUid: string,
  subject?: string
): Promise<TopicMastery[]> {
  if (!studentUid) return [];

  try {
    const q = query(
      collection(db, TOPIC_MASTERY_COLLECTION),
      where("studentUid", "==", studentUid),
      limit(50)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const items = snap.docs.map((d) => d.data() as TopicMastery);
      saveLocalTopicMastery(studentUid, items);
      if (subject) {
        return items.filter((i) => i.subject.toLowerCase() === subject.toLowerCase());
      }
      return items;
    }
    // Successful empty query from Firestore: do not resurrect stale records
    saveLocalTopicMastery(studentUid, []);
    return [];
  } catch (err) {
    console.warn("[TopicMasteryService] Firestore fetch error, fallback to local cache:", err);
  }

  const localItems = getLocalTopicMastery(studentUid);
  if (subject) {
    return localItems.filter((i) => i.subject.toLowerCase() === subject.toLowerCase());
  }
  return localItems;
}

/**
 * Pure aggregation function: Computes subject mastery summary from an array of topics.
 */
export function computeSubjectMasterySummary(
  topics: TopicMastery[],
  subject: string
): SubjectMasterySummary {
  const filtered = subject ? topics.filter((t) => t.subject.toLowerCase() === subject.toLowerCase()) : topics;

  let masteredCount = 0;
  let progressingCount = 0;
  let developingCount = 0;
  let needsFoundationCount = 0;
  let insufficientEvidenceCount = 0;

  let totalAttemptsSum = 0;
  let totalCorrectSum = 0;

  for (const t of filtered) {
    totalAttemptsSum += t.totalAttempts;
    totalCorrectSum += t.correctAttempts;

    switch (t.confidenceLevel) {
      case "mastered":
        masteredCount++;
        break;
      case "progressing":
        progressingCount++;
        break;
      case "developing":
        developingCount++;
        break;
      case "needs_foundation":
        needsFoundationCount++;
        break;
      case "insufficient_evidence":
        insufficientEvidenceCount++;
        break;
    }
  }

  const overallAccuracy =
    totalAttemptsSum > 0 ? Math.round((totalCorrectSum / totalAttemptsSum) * 1000) / 10 : 0;

  // Sort weakest topics: minimum 3 attempts, lowest accuracy first
  const weakestTopics = [...filtered]
    .filter((t) => t.totalAttempts >= 3)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  // Sort strongest topics: highest accuracy first
  const strongestTopics = [...filtered]
    .filter((t) => t.totalAttempts >= 5)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 3);

  return {
    subject,
    totalTopics: filtered.length,
    masteredCount,
    progressingCount,
    developingCount,
    needsFoundationCount,
    insufficientEvidenceCount,
    overallAccuracy,
    weakestTopics,
    strongestTopics,
  };
}

/**
 * Generates an aggregated summary for a subject.
 * Can reuse preloadedTopics to prevent a redundant getStudentTopicMastery call.
 */
export async function getSubjectMasterySummary(
  studentUid: string,
  subject: string,
  preloadedTopics?: TopicMastery[]
): Promise<SubjectMasterySummary> {
  const topics = preloadedTopics ?? (await getStudentTopicMastery(studentUid, subject));
  return computeSubjectMasterySummary(topics, subject);
}
