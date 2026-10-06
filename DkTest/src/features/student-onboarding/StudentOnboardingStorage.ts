/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { StoredOnboardingState, OnboardingStatus, TourStepId } from "./StudentOnboardingTypes";

const STORAGE_PREFIX = "dktest_student_onboarding_v1_";

export function getOnboardingStorageKey(uid: string): string {
  return `${STORAGE_PREFIX}${uid}`;
}

export function loadStoredOnboardingState(uid: string): StoredOnboardingState | null {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(getOnboardingStorageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === "v1") {
      return parsed as StoredOnboardingState;
    }
  } catch (err) {
    console.warn("[OnboardingStorage] Failed to parse stored state:", err);
  }
  return null;
}

export function saveStoredOnboardingState(
  uid: string,
  statePartial: Partial<StoredOnboardingState>
): StoredOnboardingState {
  const existing = loadStoredOnboardingState(uid);
  const updated: StoredOnboardingState = {
    version: "v1",
    uid,
    status: statePartial.status || existing?.status || "in_progress",
    currentStepId: statePartial.currentStepId || existing?.currentStepId,
    completedAt: statePartial.completedAt || existing?.completedAt,
    updatedAt: Date.now(),
    answersDraft: statePartial.answersDraft !== undefined ? statePartial.answersDraft : existing?.answersDraft,
    hasInteractedWithScratchpad:
      statePartial.hasInteractedWithScratchpad ?? existing?.hasInteractedWithScratchpad,
    hasInteractedWithMap: statePartial.hasInteractedWithMap ?? existing?.hasInteractedWithMap,
    hasInteractedWithCasio: statePartial.hasInteractedWithCasio ?? existing?.hasInteractedWithCasio,
    hasInteractedWithFlag: statePartial.hasInteractedWithFlag ?? existing?.hasInteractedWithFlag,
  };

  try {
    localStorage.setItem(getOnboardingStorageKey(uid), JSON.stringify(updated));
  } catch (err) {
    console.warn("[OnboardingStorage] Failed to save stored state:", err);
  }

  return updated;
}

export async function markOnboardingCompleted(uid: string): Promise<void> {
  if (!uid) return;
  saveStoredOnboardingState(uid, {
    status: "completed",
    completedAt: Date.now(),
  });

  if (uid === "guest" || uid.startsWith("guest_")) return;

  // Background non-blocking sync to Firestore user doc
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      studentOnboardingStatus: "completed",
    });
  } catch (err) {
    console.warn("[OnboardingStorage] Non-critical error syncing completed to Firestore:", err);
  }
}

export async function markOnboardingSkipped(uid: string): Promise<void> {
  if (!uid) return;
  saveStoredOnboardingState(uid, {
    status: "skipped",
    completedAt: Date.now(),
  });

  if (uid === "guest" || uid.startsWith("guest_")) return;

  // Background non-blocking sync to Firestore user doc
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      studentOnboardingStatus: "skipped",
    });
  } catch (err) {
    console.warn("[OnboardingStorage] Non-critical error syncing skipped to Firestore:", err);
  }
}

export function resetOnboardingState(uid: string): void {
  if (!uid) return;
  saveStoredOnboardingState(uid, {
    status: "in_progress",
    currentStepId: "nav_logo",
    answersDraft: {},
    hasInteractedWithScratchpad: false,
    hasInteractedWithMap: false,
    hasInteractedWithCasio: false,
    hasInteractedWithFlag: false,
  });
}
