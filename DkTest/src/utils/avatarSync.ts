import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase/config";

const AVATAR_EVENT_NAME = "dktest:avatar_updated";
const avatarMemoryCache = new Map<string, string>();

/**
 * Helper to get avatar from sessionStorage
 */
function getSessionAvatar(key: string): string | undefined {
  if (typeof window === "undefined" || !window.sessionStorage || !key) return undefined;
  try {
    const val = sessionStorage.getItem(`avatar_${key.toLowerCase()}`);
    return val !== null ? val : undefined;
  } catch (_) {
    return undefined;
  }
}

/**
 * Helper to save avatar to sessionStorage
 */
function setSessionAvatar(key: string, url: string): void {
  if (typeof window === "undefined" || !window.sessionStorage || !key) return;
  try {
    sessionStorage.setItem(`avatar_${key.toLowerCase()}`, url || "");
  } catch (_) {}
}

/**
 * Broadcasts an avatar update event across the entire app so all
 * header, sidebar, profile, and leaderboard components can update instantly.
 */
export function broadcastAvatarUpdate(
  avatarUrl: string,
  userMeta?: { uid?: string; username?: string; name?: string }
): void {
  if (!avatarUrl) return;

  // 1. Update in-memory and session cache
  if (userMeta?.uid) {
    avatarMemoryCache.set(userMeta.uid, avatarUrl);
    setSessionAvatar(userMeta.uid, avatarUrl);
  }
  if (userMeta?.username) {
    avatarMemoryCache.set(userMeta.username.toLowerCase(), avatarUrl);
    setSessionAvatar(userMeta.username, avatarUrl);
  }
  if (userMeta?.name) {
    avatarMemoryCache.set(userMeta.name.toLowerCase(), avatarUrl);
    setSessionAvatar(userMeta.name, avatarUrl);
  }

  // 2. Synchronize localStorage student_info
  try {
    const raw = localStorage.getItem("student_info");
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.avatarUrl = avatarUrl;
      parsed.photoURL = avatarUrl;
      localStorage.setItem("student_info", JSON.stringify(parsed));
    }
  } catch (e) {
    // Ignore JSON errors
  }

  // 3. Dispatch global browser event
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(AVATAR_EVENT_NAME, {
        detail: {
          avatarUrl,
          ...userMeta,
        },
      })
    );
  }
}

/**
 * Subscribes a React component to real-time avatar updates.
 */
export function subscribeToAvatarUpdates(
  callback: (data: { avatarUrl: string; uid?: string; username?: string }) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  window.addEventListener(AVATAR_EVENT_NAME, handler);
  return () => window.removeEventListener(AVATAR_EVENT_NAME, handler);
}

/**
 * Retrieves an avatar from in-memory cache or sessionStorage if available.
 */
export function getCachedAvatar(key: string): string | undefined {
  if (!key) return undefined;
  const normalizedKey = key.trim().toLowerCase();
  const mem = avatarMemoryCache.get(normalizedKey) ?? avatarMemoryCache.get(key);
  if (mem !== undefined) return mem;

  const ses = getSessionAvatar(normalizedKey);
  if (ses !== undefined) {
    avatarMemoryCache.set(normalizedKey, ses);
    return ses;
  }
  return undefined;
}

/**
 * Fetches the freshest avatar URL for a given user from Firestore (students/users collection).
 * Results are cached in-memory and sessionStorage (including "" for missing avatars) to prevent repeated reads.
 */
export async function fetchUserAvatar(userIdOrUsername: string): Promise<string> {
  if (!userIdOrUsername) return "";
  const normalizedKey = userIdOrUsername.trim().toLowerCase();

  // 1. Check RAM and sessionStorage first
  const cached = getCachedAvatar(normalizedKey);
  if (cached !== undefined) {
    return cached;
  }

  const rawKey = userIdOrUsername.trim();

  try {
    // 2. Try students collection by doc id (often username or uid)
    const studentDocRef = doc(db, "students", rawKey);
    const snap = await getDoc(studentDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const avt = data.avatarUrl || data.photoURL || "";
      avatarMemoryCache.set(normalizedKey, avt);
      setSessionAvatar(normalizedKey, avt);
      return avt;
    }

    // 3. Try users collection by doc id
    const userDocRef = doc(db, "users", rawKey);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const avt = data.photoURL || data.avatarUrl || "";
      avatarMemoryCache.set(normalizedKey, avt);
      setSessionAvatar(normalizedKey, avt);
      return avt;
    }

    // Not found - cache empty string so we don't query again
    avatarMemoryCache.set(normalizedKey, "");
    setSessionAvatar(normalizedKey, "");
    return "";
  } catch (err) {
    console.warn(`[avatarSync] Could not fetch avatar for ${userIdOrUsername}:`, err);
    avatarMemoryCache.set(normalizedKey, "");
    setSessionAvatar(normalizedKey, "");
    return "";
  }
}

/**
 * Hydrates or enriches a list of entries with fresh avatars.
 */
export async function hydrateAvatarsForUsers(
  users: { userId: string; avatarUrl?: string }[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  const toFetch: string[] = [];
  for (const u of users) {
    if (!u.userId) continue;
    if (u.avatarUrl) {
      result[u.userId] = u.avatarUrl;
      avatarMemoryCache.set(u.userId.toLowerCase(), u.avatarUrl);
      setSessionAvatar(u.userId, u.avatarUrl);
    } else {
      const cached = getCachedAvatar(u.userId);
      if (cached !== undefined) {
        result[u.userId] = cached;
      } else {
        toFetch.push(u.userId);
      }
    }
  }

  if (toFetch.length > 0) {
    const promises = toFetch.slice(0, 15).map(async (uid) => {
      const avt = await fetchUserAvatar(uid);
      result[uid] = avt;
    });
    await Promise.all(promises);
  }

  return result;
}
