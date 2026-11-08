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

const NOTIF_COLLECTION = "notifications";

export async function fetchUserNotifications(
  uid: string,
  forceRefresh: boolean = false,
  isAdmin: boolean = false,
  maxLimit: number = isAdmin ? 10 : 15
): Promise<SystemNotification[]> {
  const targetUid = uid || (isAdmin ? "admin_master" : "");
  if (!targetUid && !isAdmin) return [];
  const key = `notifications:${targetUid}:${isAdmin ? "admin" : "user"}:${maxLimit}`;

  return FirestoreCache.getOrFetch<SystemNotification[]>(
    key,
    async () => {
      try {
        const recipients = isAdmin
          ? Array.from(new Set([targetUid, "all", "admin"].filter(Boolean)))
          : Array.from(new Set([targetUid, "all"].filter(Boolean)));

        let snap;
        try {
          // Strictly query newest first with orderBy createdAt desc
          const q = query(
            collection(db, NOTIF_COLLECTION),
            where("recipientUid", "in", recipients),
            orderBy("createdAt", "desc"),
            limit(maxLimit)
          );
          snap = await getDocs(q);
        } catch (idxErr) {
          // Fallback if composite index is pending deployment
          console.warn("[notificationService] Composite query failed, falling back to client sort:", idxErr);
          const fallbackQ = query(
            collection(db, NOTIF_COLLECTION),
            where("recipientUid", "in", recipients),
            limit(Math.max(maxLimit * 3, 30))
          );
          snap = await getDocs(fallbackQ);
        }

        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SystemNotification));
        items.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        return items.slice(0, maxLimit);
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
