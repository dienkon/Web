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
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebase/config";
import { FirestoreCache } from "./firebase/firestoreCache";
import { FirestoreRepository } from "./firebase/firestoreRepository";
import type { SystemNotification } from "../types";
import { getTimestampMillis } from "../utils/date";

const NOTIF_COLLECTION = "notifications";

export async function fetchUserNotifications(
  uid: string,
  forceRefresh: boolean = false,
  isAdmin: boolean = false,
  maxLimit: number = 5
): Promise<SystemNotification[]> {
  const safeLimit = Math.max(1, Math.min(maxLimit, 10));
  const targetUid = uid || (isAdmin ? "admin_master" : "");
  const key = `notifications:${targetUid || "guest"}:${isAdmin ? "admin" : "user"}:${safeLimit}`;

  return FirestoreCache.getOrFetch<SystemNotification[]>(
    key,
    async () => {
      try {
        const recipients = isAdmin
          ? Array.from(new Set([targetUid, "all", "admin"].filter(Boolean)))
          : Array.from(new Set([targetUid, "all"].filter(Boolean)));

        if (recipients.length === 0) return [];

        // Uses inverted-timestamp IDs (00_<invTs>_...) so newest items return first without composite index
        const q = query(
          collection(db, NOTIF_COLLECTION),
          where("recipientUid", "in", recipients),
          limit(safeLimit)
        );
        const snap = await getDocs(q);

        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SystemNotification));
        items.sort((a, b) => {
          const timeA = getTimestampMillis(a.createdAt);
          const timeB = getTimestampMillis(b.createdAt);
          return timeB - timeA;
        });
        return items.slice(0, safeLimit);
      } catch (err) {
        console.error("[notificationService] fetchUserNotifications error:", err);
        return [];
      }
    },
    60 * 1000, // 60s TTL
    forceRefresh
  );
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await FirestoreRepository.updateDocument(
      NOTIF_COLLECTION,
      notificationId,
      { read: true },
      { purpose: "markNotificationAsRead" }
    );
    FirestoreCache.invalidate(/^notifications:/);
  } catch (err) {
    console.error("[notificationService] markNotificationAsRead error:", err);
  }
}

export async function createSystemNotification(
  notif: Omit<SystemNotification, "id">
): Promise<string> {
  const notifRef = doc(collection(db, NOTIF_COLLECTION));
  await FirestoreRepository.setDocument(
    NOTIF_COLLECTION,
    notifRef.id,
    {
      ...notif,
      id: notifRef.id,
      createdAt: new Date().toISOString(),
      read: false,
    },
    {},
    { purpose: "createSystemNotification" }
  );
  FirestoreCache.invalidate(/^notifications:/);
  return notifRef.id;
}
