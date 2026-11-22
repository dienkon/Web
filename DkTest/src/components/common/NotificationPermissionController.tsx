import React, { useEffect, useRef, useState } from "react";
import { BellRing, X, ExternalLink, Sparkles } from "lucide-react";
import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase/config";
import { api } from "../../services/apiClient";
import {
  checkDeviceNotificationPermission,
  configureNativeBackgroundNotifications,
  ensureWebNotificationServiceWorker,
  requestDeviceNotificationPermission,
  showRealDeviceNotification,
  type DeviceNotificationPermission,
} from "../../services/deviceNotificationService";

const PROMPT_DISMISSED_KEY = "dktest_notif_prompt_dismissed_at";
const DELIVERED_IDS_KEY = "dktest_delivered_device_notif_ids";
const LAST_SYNC_MS_KEY = "dktest_device_notif_last_ms";
const PROMPT_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // Re-ask only after 3 days if user tapped "Để sau"

interface LiveAlertItem {
  id: string;
  title: string;
  message: string;
  route: string;
  createdAtMs: number;
}

function loadDeliveredIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELIVERED_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.slice(-150)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDeliveredIds(set: Set<string>) {
  try {
    localStorage.setItem(DELIVERED_IDS_KEY, JSON.stringify(Array.from(set).slice(-150)));
  } catch {}
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
 * Global real-time Web & Android Device Notification Controller:
 * 1. Gently requests OS notification permission when entering Web/App for the first time.
 * 2. Configures Android WorkManager background polling for status-bar alerts even when minimized.
 * 3. Listens for newly published events, feature launches, Minigame rewards, & completed AI Shop orders,
 *    firing BOTH real OS/Phone notifications AND clickable in-app heads-up banners.
 */
export default function NotificationPermissionController() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<DeviceNotificationPermission>("unsupported");
  const [showPromptBanner, setShowPromptBanner] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [liveToast, setLiveToast] = useState<LiveAlertItem | null>(null);

  const deliveredRef = useRef<Set<string>>(loadDeliveredIds());
  const sessionStartRef = useRef<number>((() => {
    try {
      const saved = Number(localStorage.getItem(LAST_SYNC_MS_KEY) || 0);
      if (saved > 0) return saved;
      const now = Date.now();
      localStorage.setItem(LAST_SYNC_MS_KEY, String(now));
      return now;
    } catch {
      return Date.now();
    }
  })());

  // 1. Check permission & show first-entry permission prompt
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      await ensureWebNotificationServiceWorker();
      const status = await checkDeviceNotificationPermission();
      if (!active) return;
      setPermission(status);

      if (status === "granted") {
        void configureNativeBackgroundNotifications(user?.uid);
        return;
      }

      if (status === "prompt") {
        const dismissedAt = Number(localStorage.getItem(PROMPT_DISMISSED_KEY) || 0);
        if (!dismissedAt || Date.now() - dismissedAt > PROMPT_COOLDOWN_MS) {
          setShowPromptBanner(true);
        }
      }
    }, 1800);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [user?.uid]);

  // 2. Deliver incoming notifications (deduplicated) to OS + In-App Toast
  const handleIncomingItems = (items: LiveAlertItem[]) => {
    const fresh = items
      .filter((it) => it.id && it.createdAtMs > sessionStartRef.current && !deliveredRef.current.has(it.id))
      .sort((a, b) => a.createdAtMs - b.createdAtMs);

    if (fresh.length === 0) return;

    let maxMs = sessionStartRef.current;
    for (const item of fresh.slice(-3)) {
      deliveredRef.current.add(item.id);
      if (item.createdAtMs > maxMs) maxMs = item.createdAtMs;

      // Fire real OS / Android phone notification
      void showRealDeviceNotification({
        id: item.id,
        title: item.title,
        body: item.message,
        route: item.route,
      });

      // Also display clickable in-app heads-up notification
      setLiveToast(item);
    }

    sessionStartRef.current = maxMs;
    saveDeliveredIds(deliveredRef.current);
    try {
      localStorage.setItem(LAST_SYNC_MS_KEY, String(maxMs));
    } catch {}
  };

  // Auto-dismiss in-app heads-up banner after 9 seconds
  useEffect(() => {
    if (!liveToast) return;
    const t = setTimeout(() => setLiveToast(null), 9000);
    return () => clearTimeout(t);
  }, [liveToast]);

  // 3. Real-time Firestore listener + resilient API feed poll fallback
  useEffect(() => {
    let stopped = false;
    const recipients = user?.uid ? [user.uid, "all"] : ["all"];
    let unsubFirestore: (() => void) | null = null;

    if (db) {
      try {
        const q = query(
          collection(db, "notifications"),
          where("recipientUid", "in", recipients),
          limit(25)
        );
        unsubFirestore = onSnapshot(
          q,
          (snap) => {
            if (stopped) return;
            const mapped: LiveAlertItem[] = snap.docs.map((d) => {
              const data = d.data() as any;
              return {
                id: d.id,
                title: String(data.title || "Thông báo mới từ DkTEST"),
                message: String(data.message || data.body || ""),
                route: typeof data.route === "string" && data.route.startsWith("/") ? data.route : "/",
                createdAtMs: Number(data.createdAtMs) || toMillis(data.createdAt),
              };
            });
            handleIncomingItems(mapped);
          },
          () => {
            // Silent fallback to HTTP feed poll below
          }
        );
      } catch {
        // Silent fallback
      }
    }

    // Background-safe HTTP feed poll every 35s (catches server REST-written notifications too)
    const pollFeed = async () => {
      if (stopped || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
      try {
        const res = await api.get<{
          success: boolean;
          notifications: Array<{
            id: string;
            title: string;
            message: string;
            route?: string;
            createdAtMs: number;
          }>;
        }>(`/api/notifications/feed?since=${sessionStartRef.current}&limit=10`, {
          requiresAuth: Boolean(user),
          timeoutMs: 10000,
        });
        if (!stopped && Array.isArray(res?.notifications)) {
          handleIncomingItems(
            res.notifications.map((n) => ({
              id: n.id,
              title: n.title,
              message: n.message,
              route: n.route || "/",
              createdAtMs: n.createdAtMs,
            }))
          );
        }
      } catch {
        // Ignore transient offline errors
      }
    };

    const pollTimer = setInterval(pollFeed, 35_000);
    return () => {
      stopped = true;
      if (unsubFirestore) unsubFirestore();
      clearInterval(pollTimer);
    };
  }, [user?.uid]);

  const handleEnableNotifications = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const next = await requestDeviceNotificationPermission();
      setPermission(next);
      setShowPromptBanner(false);
      if (next === "granted") {
        void configureNativeBackgroundNotifications(user?.uid);
        void showRealDeviceNotification({
          id: `welcome_${Date.now()}`,
          title: "🔔 Đã bật thông báo DkTEST thành công!",
          body: "Bạn sẽ nhận thông báo ngay khi có Minigame phát quà, đơn Acc AI hoàn tất hoặc tính năng mới.",
          route: "/student/minigame",
        });
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleDismissPrompt = () => {
    setShowPromptBanner(false);
    try {
      localStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now()));
    } catch {}
  };

  return (
    <>
      {/* First-Visit Notification Permission Prompt */}
      {showPromptBanner && permission === "prompt" && (
        <div className="fixed bottom-20 md:bottom-5 left-4 right-4 md:left-auto md:right-5 md:max-w-sm z-[70] bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500/70 shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <BellRing className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                Bật thông báo trực tiếp DkTEST?
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Nhận thông báo ngay trên điện thoại & trình duyệt khi có <b>Minigame phát quà</b>, <b>đơn Acc AI xử lý xong</b> hoặc <b>tính năng mới</b>!
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={requesting}
                  onClick={handleEnableNotifications}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {requesting ? "Đang xin quyền..." : "Cho phép thông báo"}
                </button>
                <button
                  type="button"
                  onClick={handleDismissPrompt}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Để sau
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissPrompt}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Real-time Clickable Heads-Up Notification Toast */}
      {liveToast && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:max-w-sm z-[80] bg-slate-900/95 text-white rounded-2xl border border-amber-400/70 shadow-2xl p-4 animate-in fade-in slide-in-from-top-3 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-amber-300 leading-snug">
                {liveToast.title}
              </div>
              <p className="text-[11px] text-slate-200 mt-0.5 line-clamp-2">
                {liveToast.message}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = liveToast.route || "/";
                    setLiveToast(null);
                    window.location.href = target;
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black cursor-pointer"
                >
                  <span>Mở xem ngay</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLiveToast(null)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
