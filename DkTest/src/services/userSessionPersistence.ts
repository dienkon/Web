import { Capacitor, registerPlugin } from "@capacitor/core";
import type { UserProfile } from "../types";

const PERSISTENT_PROFILE_KEY = "dktest_persistent_user_profile_v1";
const IDB_NAME = "dktest_auth_persistence_db";
const IDB_STORE = "session_store";
const IDB_PROFILE_RECORD_KEY = "current_profile";

interface NativeUserSnapshotPlugin {
  setSession(data: {
    uid: string;
    refreshToken: string;
    apiKey: string;
    projectId: string;
  }): Promise<void>;
  saveUserSnapshot(data: {
    uid: string;
    profileJson: string;
    savedAt: number;
  }): Promise<void>;
  getUserSnapshot(): Promise<{ snapshot?: string }>;
  clearUserSnapshot(): Promise<void>;
}

const nativePlugin = registerPlugin<NativeUserSnapshotPlugin>("OfflineSync");

function isAndroidNative(): boolean {
  try {
    return Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

function openPersistenceDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeProfileToIdb(profile: UserProfile): Promise<void> {
  const db = await openPersistenceDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put({ profile, savedAt: Date.now() }, IDB_PROFILE_RECORD_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      try {
        db.close();
      } catch {}
      resolve();
    }
  });
}

async function readProfileFromIdb(): Promise<UserProfile | null> {
  const db = await openPersistenceDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_PROFILE_RECORD_KEY);
      req.onsuccess = () => {
        db.close();
        const record = req.result;
        const p = record?.profile;
        resolve(p?.uid && p?.role ? (p as UserProfile) : null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      try {
        db.close();
      } catch {}
      resolve(null);
    }
  });
}

async function clearProfileFromIdb(): Promise<void> {
  const db = await openPersistenceDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(IDB_PROFILE_RECORD_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      try {
        db.close();
      } catch {}
      resolve();
    }
  });
}

/**
 * Synchronous fast-path read from localStorage for instant UI hydration on reload/update.
 */
export function readPersistentProfileSync(expectedUid?: string): UserProfile | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw =
      (expectedUid ? localStorage.getItem(`dktest_cached_profile_${expectedUid}`) : null) ||
      localStorage.getItem(PERSISTENT_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const profile: UserProfile | null = parsed?.profile || parsed;
    if (!profile?.uid || !profile?.role) return null;
    if (expectedUid && profile.uid !== expectedUid) return null;
    return profile;
  } catch {
    return null;
  }
}

/**
 * Persists user profile snapshot across 3 resilient layers on-device:
 * 1) localStorage (instant sync boot)
 * 2) IndexedDB (survives WebView localStorage eviction)
 * 3) Native Android Keystore AES-256-GCM file (survives APK upgrades & WebView cache clears)
 */
export async function savePersistentUserProfile(
  profile: UserProfile,
  nativeRefreshToken?: { refreshToken: string; apiKey: string; projectId: string }
): Promise<void> {
  if (!profile?.uid) return;
  const serialized = JSON.stringify(profile);

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(PERSISTENT_PROFILE_KEY, serialized);
      localStorage.setItem(`dktest_cached_profile_${profile.uid}`, serialized);
      if (profile.role === "student") {
        localStorage.setItem(`dktest_offline_profile_${profile.uid}`, serialized);
      }
    } catch {}
  }

  await writeProfileToIdb(profile);

  if (isAndroidNative()) {
    try {
      await nativePlugin.saveUserSnapshot({
        uid: profile.uid,
        profileJson: serialized,
        savedAt: Date.now(),
      });
    } catch {
      // Non-fatal on web or older native builds
    }

    if (
      nativeRefreshToken?.refreshToken &&
      nativeRefreshToken.apiKey &&
      nativeRefreshToken.projectId
    ) {
      try {
        await nativePlugin.setSession({
          uid: profile.uid,
          refreshToken: nativeRefreshToken.refreshToken,
          apiKey: nativeRefreshToken.apiKey,
          projectId: nativeRefreshToken.projectId,
        });
      } catch {}
    }
  }
}

/**
 * Loads the persisted user profile from localStorage -> IndexedDB -> Native Android Keystore snapshot,
 * and automatically heals any missing layer (e.g. after an app update cleared WebView cache).
 */
export async function loadPersistentUserProfile(expectedUid?: string): Promise<UserProfile | null> {
  const fromLocal = readPersistentProfileSync(expectedUid);
  if (fromLocal) return fromLocal;

  const fromIdb = await readProfileFromIdb();
  if (fromIdb && (!expectedUid || fromIdb.uid === expectedUid)) {
    if (typeof localStorage !== "undefined") {
      try {
        const s = JSON.stringify(fromIdb);
        localStorage.setItem(PERSISTENT_PROFILE_KEY, s);
        localStorage.setItem(`dktest_cached_profile_${fromIdb.uid}`, s);
      } catch {}
    }
    return fromIdb;
  }

  if (isAndroidNative()) {
    try {
      const res = await nativePlugin.getUserSnapshot();
      if (res?.snapshot) {
        const outer = JSON.parse(res.snapshot);
        const profile: UserProfile | null =
          typeof outer?.profileJson === "string" ? JSON.parse(outer.profileJson) : outer;
        if (profile?.uid && profile?.role && (!expectedUid || profile.uid === expectedUid)) {
          await savePersistentUserProfile(profile);
          return profile;
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Clears persisted user login data ONLY when the user explicitly clicks Sign Out.
 */
export async function clearPersistentUserProfile(uid?: string | null): Promise<void> {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(PERSISTENT_PROFILE_KEY);
      if (uid) {
        localStorage.removeItem(`dktest_cached_profile_${uid}`);
      }
    } catch {}
  }
  await clearProfileFromIdb();
  if (isAndroidNative()) {
    try {
      await nativePlugin.clearUserSnapshot();
    } catch {}
  }
}
