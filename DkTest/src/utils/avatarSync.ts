import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../services/firebase/config";

const AVATAR_EVENT_NAME = "dktest:avatar_updated";
const avatarMemoryCache = new Map<string, string>();

/**
 * Broadcasts an avatar update event across the entire app so all
 * header, sidebar, profile, and leaderboard components can update instantly.
 */
export function broadcastAvatarUpdate(
  avatarUrl: string,
  userMeta?: { uid?: string; username?: string; name?: string }
): void {
  if (!avatarUrl) return;

  // 1. Update in-memory cache
  if (userMeta?.uid) avatarMemoryCache.set(userMeta.uid, avatarUrl);
  if (userMeta?.username) avatarMemoryCache.set(userMeta.username.toLowerCase(), avatarUrl);
  if (userMeta?.name) avatarMemoryCache.set(userMeta.name.toLowerCase(), avatarUrl);

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
 * Retrieves an avatar from in-memory cache if available.
 */
export function getCachedAvatar(key: string): string | undefined {
  if (!key) return undefined;
  return avatarMemoryCache.get(key) || avatarMemoryCache.get(key.toLowerCase());
}

/**
 * Fetches the freshest avatar URL for a given user from Firestore (students/users collection).
 * Results are cached in-memory to prevent repeated reads.
 */
export async function fetchUserAvatar(userIdOrUsername: string): Promise<string> {
  if (!userIdOrUsername) return "";
  const normalizedKey = userIdOrUsername.trim().toLowerCase();

  // 1. Check cache first
  const cached = avatarMemoryCache.get(normalizedKey);
  if (cached !== undefined) {
    return cached;
  }

  try {
    // 2. Try students collection by doc id (often username or uid)
    const studentDocRef = doc(db, "students", userIdOrUsername.trim());
    const snap = await getDoc(studentDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const avt = data.avatarUrl || data.photoURL || "";
      avatarMemoryCache.set(normalizedKey, avt);
      return avt;
    }

    // 3. Try students collection by username query
    const studentQuery = query(
      collection(db, "students"),
      where("username", "==", userIdOrUsername.trim()),
      limit(1)
    );
    const querySnap = await getDocs(studentQuery);
    if (!querySnap.empty) {
      const data = querySnap.docs[0].data();
      const avt = data.avatarUrl || data.photoURL || "";
      avatarMemoryCache.set(normalizedKey, avt);
      return avt;
    }

    // 4. Try users collection by doc id
    const userDocRef = doc(db, "users", userIdOrUsername.trim());
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const avt = data.photoURL || data.avatarUrl || "";
      avatarMemoryCache.set(normalizedKey, avt);
      return avt;
    }

    // Not found
    avatarMemoryCache.set(normalizedKey, "");
    return "";
  } catch (err) {
    console.warn(`[avatarSync] Could not fetch avatar for ${userIdOrUsername}:`, err);
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
