import crypto from "node:crypto";
import { z } from "zod";
import {
  adminDb,
  getFirestoreRestDocs,
  setFirestoreRestDoc,
} from "../firebaseAdmin.js";

export interface PushNotificationItem {
  id: string;
  recipientUid: string; // "all" | specific user UID | "admin"
  type: "minigame_event" | "minigame_reward" | "ai_order_delivered" | "feature_release" | "system";
  title: string;
  message: string;
  route: string;
  read: boolean;
  createdAt: string;
  createdAtMs: number;
  actorName?: string;
}

const COL_NOTIFS = "notifications";
const FEED_CACHE_TTL_MS = 10_000;
let feedCache: { items: PushNotificationItem[]; ts: number } | null = null;

export function invalidateNotificationFeedCache() {
  feedCache = null;
}

export const broadcastNotificationSchema = z.object({
  title: z.string().trim().min(2, "Vui lòng nhập tiêu đề thông báo.").max(140),
  message: z.string().trim().min(2, "Vui lòng nhập nội dung thông báo.").max(600),
  route: z.string().trim().max(240).optional().default("/"),
  type: z
    .enum(["minigame_event", "minigame_reward", "ai_order_delivered", "feature_release", "system"])
    .optional()
    .default("feature_release"),
  recipientUid: z.string().trim().max(128).optional().default("all"),
});

export async function publishDeviceNotification(params: {
  recipientUid: string;
  type: PushNotificationItem["type"];
  title: string;
  message: string;
  route?: string;
  actorName?: string;
}): Promise<PushNotificationItem> {
  const now = new Date();
  const invTs = String(Math.max(0, 9_999_999_999_999 - now.getTime())).padStart(13, "0");
  const id = `00_${invTs}_${crypto.randomBytes(3).toString("hex")}`;
  const item: PushNotificationItem = {
    id,
    recipientUid: params.recipientUid || "all",
    type: params.type,
    title: params.title.slice(0, 140),
    message: params.message.slice(0, 600),
    route: params.route && params.route.startsWith("/") ? params.route : "/",
    read: false,
    createdAt: now.toISOString(),
    createdAtMs: now.getTime(),
    actorName: params.actorName || "DkTEST",
  };

  try {
    if (adminDb) {
      await adminDb.collection(COL_NOTIFS).doc(id).set(item);
    } else {
      await setFirestoreRestDoc(COL_NOTIFS, id, item);
    }
    invalidateNotificationFeedCache();
  } catch (err) {
    console.warn("[notificationPushService] Failed to persist notification:", err);
  }

  return item;
}

function toMillis(val: any): number {
  if (!val) return 0;
  if (typeof val === "number") return val < 1e11 ? val * 1000 : val;
  if (typeof val?.toMillis === "function") return val.toMillis();
  if (typeof val?.seconds === "number") return val.seconds * 1000;
  const ms = new Date(val).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Fetches recent notifications addressed to `uid` (or `"all"` if anonymous / background worker)
 * created strictly after `sinceMs`. Zero composite index required.
 */
export async function fetchNotificationFeed(params: {
  uid?: string | null;
  sinceMs?: number;
  limitCount?: number;
}): Promise<PushNotificationItem[]> {
  const now = Date.now();
  let allItems: PushNotificationItem[];

  if (feedCache && now - feedCache.ts < FEED_CACHE_TTL_MS) {
    allItems = feedCache.items;
  } else {
    let raw: any[] = [];
    if (adminDb) {
      const snap = await adminDb.collection(COL_NOTIFS).orderBy("createdAtMs", "desc").limit(120).get();
      raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      raw = await getFirestoreRestDocs(COL_NOTIFS, 120, false);
    }

    allItems = raw
      .map((d) => {
        const ms = Number(d.createdAtMs) || toMillis(d.createdAt);
        return {
          id: String(d.id || ""),
          recipientUid: String(d.recipientUid || "all"),
          type: (d.type || "system") as PushNotificationItem["type"],
          title: String(d.title || "Thông báo DkTEST"),
          message: String(d.message || d.body || ""),
          route: typeof d.route === "string" && d.route.startsWith("/") ? d.route : "/",
          read: Boolean(d.read),
          createdAt: typeof d.createdAt === "string" ? d.createdAt : new Date(ms || now).toISOString(),
          createdAtMs: ms,
          actorName: d.actorName ? String(d.actorName) : "DkTEST",
        };
      })
      .filter((n) => n.id && n.title)
      .sort((a, b) => b.createdAtMs - a.createdAtMs);

    feedCache = { items: allItems, ts: now };
  }

  const sinceMs = Number(params.sinceMs) || 0;
  const maxItems = Math.max(1, Math.min(30, Number(params.limitCount) || 15));
  const uid = params.uid || null;

  return allItems
    .filter((item) => {
      const targetOk = item.recipientUid === "all" || (uid && item.recipientUid === uid);
      if (!targetOk) return false;
      if (sinceMs > 0 && item.createdAtMs <= sinceMs) return false;
      return true;
    })
    .slice(0, maxItems);
}
