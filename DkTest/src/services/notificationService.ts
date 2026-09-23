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
import type { SystemNotification } from "../types";

const NOTIF_COLLECTION = "notifications";

export async function fetchUserNotifications(uid: string): Promise<SystemNotification[]> {
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
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, NOTIF_COLLECTION, notificationId), {
      read: true,
    });
  } catch (err) {
    console.error("[notificationService] markNotificationAsRead error:", err);
  }
}

export async function createSystemNotification(notif: Omit<SystemNotification, "id">): Promise<string> {
  const notifRef = doc(collection(db, NOTIF_COLLECTION));
  await setDoc(notifRef, {
    ...notif,
    id: notifRef.id,
    createdAt: new Date().toISOString(),
    read: false,
  });
  return notifRef.id;
}
