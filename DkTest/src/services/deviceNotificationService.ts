import { Capacitor, registerPlugin } from "@capacitor/core";
import { isNativeAndroid } from "./offline/sync";

export type DeviceNotificationPermission = "granted" | "denied" | "prompt" | "unsupported";

interface DkNotificationsNativePlugin {
  checkPermission(): Promise<{ permission: DeviceNotificationPermission }>;
  requestPermission(): Promise<{ permission: DeviceNotificationPermission }>;
  showLocalNotification(options: {
    id: number;
    title: string;
    body: string;
    route?: string;
  }): Promise<void>;
  configureBackgroundPoll(options: {
    apiBaseUrl: string;
    uid?: string;
  }): Promise<void>;
}

const DkNotifications = registerPlugin<DkNotificationsNativePlugin>("DkNotifications");

let swRegPromise: Promise<ServiceWorkerRegistration | null> | null = null;

function canUseWebNotification(): boolean {
  return (
    typeof window !== "undefined" &&
    !isNativeAndroid() &&
    typeof Notification !== "undefined"
  );
}

export async function ensureWebNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || isNativeAndroid() || !("serviceWorker" in navigator)) {
    return null;
  }
  if (!swRegPromise) {
    swRegPromise = navigator.serviceWorker
      .register("/sw-notifications.js", { scope: "/" })
      .catch(() => null);
  }
  return swRegPromise;
}

export async function checkDeviceNotificationPermission(): Promise<DeviceNotificationPermission> {
  if (isNativeAndroid() && Capacitor.isPluginAvailable("DkNotifications")) {
    try {
      const res = await DkNotifications.checkPermission();
      return res?.permission || "prompt";
    } catch {
      return "prompt";
    }
  }
  if (!canUseWebNotification()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return "prompt";
}

export async function requestDeviceNotificationPermission(): Promise<DeviceNotificationPermission> {
  if (isNativeAndroid() && Capacitor.isPluginAvailable("DkNotifications")) {
    try {
      const res = await DkNotifications.requestPermission();
      return res?.permission || "denied";
    } catch {
      return "denied";
    }
  }
  if (!canUseWebNotification()) return "unsupported";
  try {
    await ensureWebNotificationServiceWorker();
    const res = await Notification.requestPermission();
    if (res === "granted") return "granted";
    if (res === "denied") return "denied";
    return "prompt";
  } catch {
    return "denied";
  }
}

export async function configureNativeBackgroundNotifications(uid?: string): Promise<void> {
  if (!isNativeAndroid() || !Capacitor.isPluginAvailable("DkNotifications")) return;
  const mobileBase =
    (import.meta as any).env?.VITE_MOBILE_API_URL ||
    (import.meta as any).env?.VITE_API_URL ||
    "https://dk-test-v3.vercel.app";
  try {
    await DkNotifications.configureBackgroundPoll({
      apiBaseUrl: String(mobileBase).replace(/\/+$/, ""),
      uid: uid || "",
    });
  } catch {
    // Non-fatal
  }
}

function hashIdToInt(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h % 2_000_000_000) + 1;
}

export async function showRealDeviceNotification(params: {
  id: string;
  title: string;
  body: string;
  route?: string;
}): Promise<boolean> {
  const cleanRoute = params.route && params.route.startsWith("/") ? params.route : "/";

  // 1. Native Android Status-Bar / Heads-Up Notification
  if (isNativeAndroid() && Capacitor.isPluginAvailable("DkNotifications")) {
    try {
      await DkNotifications.showLocalNotification({
        id: hashIdToInt(params.id),
        title: params.title,
        body: params.body,
        route: cleanRoute,
      });
      return true;
    } catch {
      return false;
    }
  }

  // 2. Web OS / Mobile Browser Notification (Service Worker preferred, fallback to Notification API)
  if (!canUseWebNotification() || Notification.permission !== "granted") {
    return false;
  }

  try {
    const reg = await ensureWebNotificationServiceWorker();
    if (reg && typeof reg.showNotification === "function") {
      await reg.showNotification(params.title, {
        body: params.body,
        icon: "/logo.png",
        badge: "/favicon.png",
        tag: params.id,
        data: { route: cleanRoute },
      });
      return true;
    }

    const n = new Notification(params.title, {
      body: params.body,
      icon: "/logo.png",
      tag: params.id,
    });
    n.onclick = () => {
      window.focus();
      if (cleanRoute && window.location.pathname !== cleanRoute) {
        window.location.href = cleanRoute;
      }
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}
