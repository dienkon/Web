/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebase/config";
import { FirestoreCache } from "./firebase/firestoreCache";
import type { SystemAnnouncement } from "../types";
import { getTimestampMillis } from "../utils/date";

const ANNOUNCEMENT_COLLECTION = "system_announcements";

export async function createAnnouncement(
  data: Omit<SystemAnnouncement, "id" | "createdAt">
): Promise<string> {
  const ref = doc(collection(db, ANNOUNCEMENT_COLLECTION));
  const newDoc: SystemAnnouncement = {
    ...data,
    id: ref.id,
    createdAt: new Date().toISOString(),
    isActive: data.isActive !== undefined ? data.isActive : true,
  };
  await setDoc(ref, newDoc);
  FirestoreCache.invalidate(/^announcements:/);

  // Also push to real device notifications feed when announcement is active
  if (newDoc.isActive) {
    try {
      const now = new Date();
      const invTs = String(Math.max(0, 9_999_999_999_999 - now.getTime())).padStart(13, "0");
      const notifId = `00_${invTs}_${ref.id.slice(0, 6)}`;
      const notifRef = doc(db, "notifications", notifId);
      await setDoc(notifRef, {
        id: notifId,
        recipientUid:
          newDoc.targetType === "specific_users" && newDoc.targetUids?.length === 1
            ? newDoc.targetUids[0]
            : "all",
        type: "feature_release",
        title: `📢 ${newDoc.title || "Thông báo mới từ DkTEST"}`,
        message: (newDoc.content || "").slice(0, 260),
        route: "/",
        read: false,
        createdAt: now.toISOString(),
        createdAtMs: now.getTime(),
        actorName: "DkTEST",
      });
    } catch {
      // Non-blocking
    }
  }
  return ref.id;
}

export async function getAnnouncements(): Promise<SystemAnnouncement[]> {
  try {
    let snap;
    try {
      const q = query(collection(db, ANNOUNCEMENT_COLLECTION), orderBy("createdAt", "desc"), limit(50));
      snap = await getDocs(q);
    } catch {
      const fallbackQ = query(collection(db, ANNOUNCEMENT_COLLECTION), limit(50));
      snap = await getDocs(fallbackQ);
    }
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SystemAnnouncement));
    items.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
    return items;
  } catch (err) {
    console.error("[announcementService] getAnnouncements error:", err);
    return [];
  }
}

export async function updateAnnouncement(
  id: string,
  updates: Partial<SystemAnnouncement>
): Promise<void> {
  const ref = doc(db, ANNOUNCEMENT_COLLECTION, id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  FirestoreCache.invalidate(/^announcements:/);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const ref = doc(db, ANNOUNCEMENT_COLLECTION, id);
  await deleteDoc(ref);
  FirestoreCache.invalidate(/^announcements:/);
}

export async function getActiveAnnouncementsForUser(
  userUid?: string
): Promise<SystemAnnouncement[]> {
  const cacheKey = `announcements:active:${userUid || "guest"}`;
  return FirestoreCache.getOrFetch<SystemAnnouncement[]>(
    cacheKey,
    async () => {
      try {
        let snap;
        try {
          const q = query(
            collection(db, ANNOUNCEMENT_COLLECTION),
            where("isActive", "==", true),
            orderBy("createdAt", "desc"),
            limit(20)
          );
          snap = await getDocs(q);
        } catch {
          const fallbackQ = query(
            collection(db, ANNOUNCEMENT_COLLECTION),
            where("isActive", "==", true),
            limit(30)
          );
          snap = await getDocs(fallbackQ);
        }
        const now = Date.now();
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as SystemAnnouncement))
          .filter((a) => {
            // Check expiry
            if (a.expiresAt && getTimestampMillis(a.expiresAt) < now) return false;
            // Check target audience
            if (a.targetType === "all") return true;
            if (a.targetType === "specific_users") {
              if (!userUid) return false;
              return Array.isArray(a.targetUids) && a.targetUids.includes(userUid);
            }
            return true;
          });

        items.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
        return items;
      } catch (err) {
        console.warn("[announcementService] getActiveAnnouncementsForUser error:", err);
        return [];
      }
    },
    60 * 1000 // 60s cache
  );
}
