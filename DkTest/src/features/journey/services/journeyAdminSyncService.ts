/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Canonical Admin CSDL Sync Service for Learning Journey
 * Allows administrators and teachers to author, sync, and publish custom questions,
 * level lore, bonus rewards, and live events into Firestore.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../services/firebase/config";
import type { JourneyQuestionItem } from "../data/journeySubjectQuestions";
import { getSubjectJourneyQuestions } from "../data/journeySubjectQuestions";

export interface AdminJourneyCustomLevel {
  id: string; // e.g. "math_lvl_1"
  subject: "math" | "physics" | "chemistry";
  level: number;
  title?: string;
  loreIntro?: string;
  eventName?: string;
  eventDescription?: string;
  eventActive?: boolean;
  rewardCoinsMin?: number;
  rewardCoinsMax?: number;
  questions: JourneyQuestionItem[];
  updatedAt: string;
  updatedBy?: string;
}

const FIRESTORE_JOURNEY_COLLECTION = "journey_custom_levels";
const LOCAL_OVERRIDE_PREFIX = "dktest_admin_journey_levels_";

function getLocalCacheKey(subject: string): string {
  return `${LOCAL_OVERRIDE_PREFIX}${subject}`;
}

function getLocalOverrides(subject: string): Record<number, AdminJourneyCustomLevel> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(getLocalCacheKey(subject));
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function setLocalOverride(levelData: AdminJourneyCustomLevel): void {
  if (typeof localStorage === "undefined") return;
  try {
    const map = getLocalOverrides(levelData.subject);
    map[levelData.level] = levelData;
    localStorage.setItem(getLocalCacheKey(levelData.subject), JSON.stringify(map));
  } catch (_) {}
}

/**
 * Saves an admin custom level / event into Firestore and local cache
 */
export async function saveAdminJourneyLevel(
  levelData: AdminJourneyCustomLevel
): Promise<{ success: boolean; error?: string }> {
  const docId = `${levelData.subject}_lvl_${levelData.level}`;
  const preparedData: AdminJourneyCustomLevel = {
    ...levelData,
    id: docId,
    updatedAt: new Date().toISOString(),
  };

  // 1. Cache locally first
  setLocalOverride(preparedData);

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, FIRESTORE_JOURNEY_COLLECTION, docId);
    await setDoc(docRef, preparedData, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.warn("[JourneyAdminSyncService] Could not persist to Firestore:", err);
    // Still succeeded locally
    return { success: true };
  }
}

/**
 * Retrieves an admin custom level if configured
 */
export async function getAdminJourneyLevel(
  subject: "math" | "physics" | "chemistry",
  level: number
): Promise<AdminJourneyCustomLevel | null> {
  const docId = `${subject}_lvl_${level}`;

  // Try Firestore first
  try {
    const docRef = doc(db, FIRESTORE_JOURNEY_COLLECTION, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as AdminJourneyCustomLevel;
      setLocalOverride(data);
      return data;
    }
  } catch (err) {
    console.warn("[JourneyAdminSyncService] Firestore read error, using cache:", err);
  }

  // Fallback to local cache
  const localMap = getLocalOverrides(subject);
  return localMap[level] || null;
}

/**
 * Retrieves all admin journey custom levels for a subject
 */
export async function getAllAdminJourneyLevels(
  subject?: "math" | "physics" | "chemistry"
): Promise<AdminJourneyCustomLevel[]> {
  const list: AdminJourneyCustomLevel[] = [];

  try {
    let q = collection(db, FIRESTORE_JOURNEY_COLLECTION);
    const snapshot = subject
      ? await getDocs(query(q, where("subject", "==", subject)))
      : await getDocs(q);

    snapshot.forEach((d) => {
      list.push(d.data() as AdminJourneyCustomLevel);
    });

    if (list.length > 0) return list;
  } catch (err) {
    console.warn("[JourneyAdminSyncService] getAllAdminJourneyLevels Firestore error:", err);
  }

  // Local fallback
  const subjectsToScan = subject ? [subject] : (["math", "physics", "chemistry"] as const);
  for (const sub of subjectsToScan) {
    const map = getLocalOverrides(sub);
    Object.values(map).forEach((lvl) => list.push(lvl));
  }
  return list;
}

/**
 * Calculates tiered reward range based on journey level:
 * - Levels 1-5: 1 - 10 đồng
 * - Subsequent levels: gradually scales minimum up to 5 and maximum up to 30 đồng
 */
export function calculateJourneyDefaultRewardRange(level: number): { min: number; max: number } {
  if (level <= 5) {
    return { min: 1, max: 10 };
  }
  const progress = Math.min(1, Math.max(0, (level - 5) / 20));
  const min = Math.round(1 + progress * 4); // scales 1 -> 5
  const max = Math.round(10 + progress * 20); // scales 10 -> 30
  return { min, max };
}

/**
 * Resolves questions for a journey level, prioritizing Admin Firestore overrides
 * before falling back to default curriculum generated questions.
 */
export async function getJourneyQuestionsWithAdminSync(
  subject: "math" | "physics" | "chemistry",
  level: number
): Promise<{
  questions: JourneyQuestionItem[];
  isAdminCustom: boolean;
  eventInfo?: { name: string; description: string };
  rewardRange?: { min: number; max: number };
}> {
  // Check if admin has set custom questions
  const adminLevel = await getAdminJourneyLevel(subject, level);

  const defaultRange = calculateJourneyDefaultRewardRange(level);
  const defaultMin = defaultRange.min;
  const defaultMax = defaultRange.max;

  if (adminLevel && adminLevel.questions && adminLevel.questions.length > 0) {
    return {
      questions: adminLevel.questions,
      isAdminCustom: true,
      eventInfo:
        adminLevel.eventActive && adminLevel.eventName
          ? {
              name: adminLevel.eventName,
              description: adminLevel.eventDescription || "",
            }
          : undefined,
      rewardRange: {
        min: adminLevel.rewardCoinsMin ?? defaultMin,
        max: adminLevel.rewardCoinsMax ?? defaultMax,
      },
    };
  }

  // Fallback to default curriculum questions
  const defaultQuestions = getSubjectJourneyQuestions(subject, level);
  return {
    questions: defaultQuestions,
    isAdminCustom: false,
    rewardRange: { min: defaultMin, max: defaultMax },
  };
}
