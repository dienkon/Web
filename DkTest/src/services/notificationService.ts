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
  limit,
} from "firebase/firestore";
import { db } from "./firebase/config";
import { FirestoreCache } from "./firebase/firestoreCache";
import { FirestoreRepository } from "./firebase/firestoreRepository";
import type { SystemNotification } from "../types";

const NOTIF_COLLECTION = "notifications";

export async function fetchUserNotifications(
  uid: string,
  forceRefresh: boolean = false
): Promise<SystemNotification[]> {
  if (!uid) return [];
  const key = `notifications:${uid}`;

  return FirestoreCache.getOrFetch<SystemNotification[]>(
    key,
    async () => {
      try {
        const q = query(
          collection(db, NOTIF_COLLECTION),
          where("recipientUid", "in", [uid, "all"]),
          limit(20)
        );
        const snap = await getDocs(q);
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SystemNotification));
        items.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        return items;
      } catch (err) {
        console.error("[notificationService] fetchUserNotifications error:", err);
        return [];
      }
    },
    30 * 1000, // 30s TTL
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
