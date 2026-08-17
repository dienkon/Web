import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  limit,
  orderBy,
  getDocs,
  where,
  deleteDoc,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
} from "firebase/auth";
import type { MailMessage } from "../types";
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  orderByChild,
  limitToLast,
  query as rtdbQuery,
} from "firebase/database";

const metaEnv = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "",
};

const isRealFirebaseConfigured =
  !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";

let app: any = null;
let db: any = null;
let rtdb: any = null;
let auth: any = null;
let googleProvider: any = null;

if (isRealFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    rtdb = getDatabase(app);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
  } catch (error) {
    console.error("Firebase init error:", error);
  }
}

export const listenAllPlayers = (callback: (players: any[]) => void) => {
  if (isRealFirebaseConfigured && db) {
    const unsub = onSnapshot(
      collection(db, "players"),
      (snapshot) => {
        const players = snapshot.docs.map((snap) => {
          const data = snap.data();

          // console.log(data); // xem cấu trúc dữ liệu

          return {
            uid: snap.id,
            ...data,
            ...(data.player || {}),
          };
        });

        callback(players);
      },
      (error) => {
        console.error("listenAllPlayers:", error);
        callback([]);
      },
    );

    return unsub;
  }

  // Local fallback
  const storage = typeof window === "undefined" ? null : window.localStorage;

  if (!storage) {
    callback([]);
    return () => {};
  }

  const players: any[] = [];

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);

    if (!key?.startsWith(keys.cloudCachePrefix)) continue;

    const value = safeStorage.get(key, null);

    if (value) {
      players.push({
        uid: value.uid || key.replace(keys.cloudCachePrefix, ""),
        ...value,
        ...(value.player || {}),
      });
    }
  }

  callback(players);

  return () => {};
};

const safeStorage = {
  get(key: string, fallback: any = null) {
    try {
      if (typeof window === "undefined") return fallback;
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: any) {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  remove(key: string) {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(key);
    } catch {}
  },
};

const idb = {
  dbName: "ntt_save_mirror_db",
  version: 1,
  storeName: "game_saves",
  open() {
    if (typeof window === "undefined" || !window.indexedDB)
      return Promise.resolve(null as IDBDatabase | null);
    return new Promise<IDBDatabase | null>((resolve) => {
      const request = window.indexedDB.open(this.dbName, this.version);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  },
  async set(key: string, value: any) {
    const db = await this.open();
    if (!db) return false;
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        tx.objectStore(this.storeName).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      return true;
    } catch {
      return false;
    } finally {
      db.close();
    }
  },
  async get<T = any>(
    key: string,
    fallback: T | null = null,
  ): Promise<T | null> {
    const db = await this.open();
    if (!db) return fallback;
    try {
      const value = await new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readonly");
        const req = tx.objectStore(this.storeName).get(key);
        req.onsuccess = () => resolve((req.result as T) ?? fallback);
        req.onerror = () => reject(req.error);
      });
      return value ?? fallback;
    } catch {
      return fallback;
    } finally {
      db.close();
    }
  },
  async remove(key: string) {
    const db = await this.open();
    if (!db) return;
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        tx.objectStore(this.storeName).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // ignore
    } finally {
      db.close();
    }
  },
};

const keys = {
  mockUser: "ntt_mock_firebase_user",
  cloudCachePrefix: "ntt_cloud_cache_",
  presencePrefix: "ntt_presence_cache_",
  chatCache: "ntt_village_chat_cache",
  syncMirrorPrefix: "ntt_sync_mirror_",
  legacyCodeSavePrefix: "ntt_legacy_code_save_",
  mailInbox: "ntt_mail_inbox",
  mailboxPrefix: "ntt_mailbox_",
};

type AnyObj = Record<string, any>;

const normalizeCharacterCode = (value: string) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

const isGuestUid = (uid: string) => String(uid || "").startsWith("guest_");

const isGoogleAuthUser = (user: any) => {
  if (
    !user ||
    isGuestUid(user.uid) ||
    String(user.uid || "").startsWith("mock_")
  )
    return false;
  const providers = Array.isArray(user.providerData) ? user.providerData : [];
  return providers.some((p: any) => p?.providerId === "google.com");
};

const safeClone = <T>(value: T): T => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

const stripUndefinedDeep = (value: any): any => {
  if (Array.isArray(value)) return value.map(stripUndefinedDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefinedDeep(v)]),
    );
  }
  return value;
};

const normalizeMail = (
  mail: Partial<MailMessage> & {
    title: string;
    content: string;
    type?: MailMessage["type"];
    eventType?: string;
  },
): MailMessage & {
  eventType?: string;
  senderUid?: string;
  recipientUid?: string;
  recipientName?: string;
  result?: string;
} => {
  const fromUid =
    String(
      mail.fromUid || (mail as any).senderUid || activeMailOwnerUid || "system",
    ).trim() || "system";

  return {
    id:
      mail.id || `mail_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: mail.type || "system",
    title: String(mail.title || ""),
    content: String(mail.content || ""),
    fromUid,
    fromName: mail.fromName || (mail as any).senderName || "Hệ Thống",
    toUid: mail.toUid || (mail as any).recipientUid || undefined,
    toName: mail.toName || (mail as any).recipientName || undefined,
    read: mail.read ?? false,
    createdAt: mail.createdAt || Date.now(),
    actionRefId: mail.actionRefId,
    eventType: mail.eventType || "system",
    senderUid: (mail as any).senderUid || fromUid,
    recipientUid:
      (mail as any).recipientUid ||
      normalizeUid((mail as any).recipientUid || activeMailOwnerUid),
    recipientName: (mail as any).recipientName,
    result: (mail as any).result,
  };
};
const normalizeUid = (uid?: string | null) => String(uid || "").trim();
const buildMailboxKey = (uid?: string | null) =>
  keys.mailboxPrefix + normalizeUid(uid || "global");

let activeMailOwnerUid = "global";

export const setActiveMailOwner = (uid?: string | null) => {
  activeMailOwnerUid = normalizeUid(uid) || "global";
};

export const getActiveMailOwner = () => activeMailOwnerUid;

const getMailboxStorageKey = (uid?: string | null) =>
  buildMailboxKey(uid || activeMailOwnerUid || "global");

export const getLocalMailInbox = (uid?: string | null): MailMessage[] => {
  const inbox = safeStorage.get(getMailboxStorageKey(uid), []);
  return Array.isArray(inbox) ? inbox : [];
};

const persistLocalInbox = (uid: string, inbox: any[]) => {
  safeStorage.set(getMailboxStorageKey(uid), inbox);
};

const writeMailboxToFirestore = async (
  uid: string,
  mail: ReturnType<typeof normalizeMail>,
) => {
  if (!isRealFirebaseConfigured || !db) return;

  const safeMail = JSON.parse(
    JSON.stringify({
      ...mail,
      fromUid: mail.fromUid || "system",
      fromName: mail.fromName || "Hệ Thống",
      recipientUid: uid,
      recipientName: mail.recipientName || "",
      read: mail.read ?? false,
      createdAt: mail.createdAt || Date.now(),
      updatedAt: Date.now(),
    }),
  );

  await setDoc(doc(db, "mailboxes", uid, "messages", mail.id), safeMail, {
    merge: true,
  });
};
const sendZaloDirectMessage = async (
  uid: string,
  mail: ReturnType<typeof normalizeMail>,
) => {
  const webhookUrl = String(
    metaEnv.VITE_ZALO_BOT_WEBHOOK || metaEnv.VITE_ZALO_BOT_URL || "",
  ).trim();
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientUid: uid,
        messageId: mail.id,
        title: mail.title,
        content: mail.content,
        fromUid: mail.fromUid ?? null,
        fromName: mail.fromName ?? "Hệ thống",
        type: mail.type,
        eventType: mail.eventType ?? null,
        result: mail.result ?? null,
        createdAt: mail.createdAt || Date.now(),
      }),
    });
  } catch (error) {
    console.error("sendZaloDirectMessage failed:", error);
  }
};

export const addMailToInbox = (
  mail: Partial<MailMessage> & {
    title: string;
    content: string;
    type?: MailMessage["type"];
    eventType?: string;
  },
  recipientUid?: string | null,
) => {
  const nextMail = normalizeMail(mail);
  const targetUid =
    normalizeUid(
      recipientUid || (mail as any).recipientUid || activeMailOwnerUid,
    ) || "global";

  const safeMail: MailMessage = {
    ...nextMail,
    fromUid: nextMail.fromUid || "system",
    fromName: nextMail.fromName || "Hệ Thống",
    recipientUid: targetUid,
    read: nextMail.read ?? false,
    createdAt: nextMail.createdAt || Date.now(),
  };

  const current = getLocalMailInbox(targetUid);
  const nextInbox = [safeMail, ...current].slice(0, 200);
  persistLocalInbox(targetUid, nextInbox);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("ntt-mail-added", {
        detail: safeMail,
      }),
    );
  }

  void writeMailboxToFirestore(targetUid, safeMail as any).catch((error) => {
    console.error("addMailToInbox write failed:", error);
  });

  return safeMail;
};

export const clearLocalMailInbox = (uid?: string | null) => {
  safeStorage.remove(getMailboxStorageKey(uid));
};

export const listenMailbox = (
  uid: string,
  callback: (messages: MailMessage[]) => void,
) => {
  const targetUid = normalizeUid(uid) || "global";
  const cache = getLocalMailInbox(targetUid);
  callback(cache);

  if (isRealFirebaseConfigured && db) {
    const mailboxRef = query(
      collection(db, "mailboxes", targetUid, "messages"),
      orderBy("createdAt", "desc"),
      limit(200),
    );

    const unsub = onSnapshot(
      mailboxRef,
      (snapshot) => {
        const messages = snapshot.docs.map(
          (snap) => snap.data() as MailMessage,
        );
        persistLocalInbox(targetUid, messages);
        callback(messages);
      },
      (error) => {
        console.error("listenMailbox:", error);
      },
    );

    return unsub;
  }

  return () => {};
};

export const getLocalSyncMirrorKey = (uidOrCode: string) =>
  keys.syncMirrorPrefix + normalizeCharacterCode(uidOrCode || "");

export const saveLocalSyncMirror = async (uidOrCode: string, data: any) => {
  const key = getLocalSyncMirrorKey(uidOrCode);
  const payload = {
    ...safeClone(data),
    mirrorKey: normalizeCharacterCode(uidOrCode || ""),
    mirroredAt: Date.now(),
  };
  const ok = await idb.set(key, payload);
  if (!ok) {
    safeStorage.set(key, payload);
  }
};

export const loadLocalSyncMirror = async (uidOrCode: string) => {
  const key = getLocalSyncMirrorKey(uidOrCode);
  const indexed = await idb.get(key, null);
  if (indexed) return indexed;
  return safeStorage.get(key, null);
};

export const clearLocalSyncMirror = async (uidOrCode: string) => {
  const key = getLocalSyncMirrorKey(uidOrCode);
  await idb.remove(key);
  safeStorage.remove(key);
};

export const signInAsGuest = async () => {
  throw new Error("Guest mode is disabled. Please use Google sign-in.");
};

class FallbackAuth {
  private listeners: ((user: any) => void)[] = [];
  private currentUser: any = safeStorage.get(keys.mockUser, null);

  onAuthStateChanged(callback: (user: any) => void) {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== callback);
    };
  }

  private emit() {
    this.listeners.forEach((fn) => fn(this.currentUser));
  }

  async signInWithGoogle() {
    this.currentUser = {
      uid: "mock_" + Math.random().toString(36).slice(2, 10),
      displayName: "Đạo Hữu Vô Danh",
      email: "mock@local.game",
      providerData: [{ providerId: "google.com" }],
      isAnonymous: false,
    };
    safeStorage.set(keys.mockUser, this.currentUser);
    this.emit();
    return this.currentUser;
  }

  async signInGuest() {
    this.currentUser = {
      uid: "guest_" + Math.random().toString(36).slice(2, 10),
      displayName: "Guest Đạo Hữu",
      email: "guest@local.game",
      providerData: [{ providerId: "guest" }],
      isAnonymous: true,
    };
    safeStorage.set(keys.mockUser, this.currentUser);
    this.emit();
    return this.currentUser;
  }

  async signOut() {
    this.currentUser = null;
    safeStorage.remove(keys.mockUser);
    this.emit();
  }
}

class FallbackDb {
  async setPlayer(uid: string, data: any) {
    safeStorage.set(keys.cloudCachePrefix + uid, data);
  }

  async getPlayer(uid: string) {
    return safeStorage.get(keys.cloudCachePrefix + uid, null);
  }

  async setPresence(uid: string, data: any) {
    safeStorage.set(keys.presencePrefix + uid, data);
  }

  getAllPresence() {
    const out: any[] = [];
    const storage = typeof window === "undefined" ? null : window.localStorage;
    if (!storage) return out;

    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith(keys.presencePrefix)) {
        const v = safeStorage.get(k, null);
        if (v) out.push(v);
      }
    }
    return out;
  }

  async addMessage(msg: any) {
    const current = safeStorage.get(keys.chatCache, []);
    current.push(msg);
    safeStorage.set(keys.chatCache, current);
  }

  getMessages() {
    return safeStorage.get(keys.chatCache, []);
  }
}

const mockAuth = new FallbackAuth();
const mockDb = new FallbackDb();

export const isFirebaseLive = isRealFirebaseConfigured;

const buildPresencePayload = (uid: string, data: AnyObj = {}) => {
  const player =
    data?.player && typeof data.player === "object" ? data.player : data;
  const name = String(player?.name || data?.name || "Đạo Hữu Vô Danh");
  const realmIndex = Number(player?.realmIndex ?? data?.realmIndex ?? 0) || 0;
  const realmLevel = Number(player?.realmLevel ?? data?.realmLevel ?? 1) || 1;
  const lastActive =
    Number(player?.lastActive ?? data?.lastActive ?? Date.now()) || Date.now();
  const providerId = String(
    data?.providerId ||
      player?.providerId ||
      (isGuestUid(uid) ? "guest" : "google.com"),
  );
  const currentActivity = String(
    player?.currentActivity || data?.currentActivity || "nhàn rỗi",
  );
  const isOnline = Boolean(player?.isOnline ?? data?.isOnline ?? true);
  const characterCode = normalizeCharacterCode(
    player?.characterCode || data?.characterCode || "",
  );

  return {
    uid,
    name,
    realmIndex,
    realmLevel,
    currentMapId: player?.currentMapId || data?.currentMapId || null,
    x: player?.x ?? data?.x ?? null,
    y: player?.y ?? data?.y ?? null,
    isOnline,
    lastActive,
    currentActivity,
    providerId,
    isRealUser: isGoogleAuthUser(data?.authUser) || providerId === "google.com",
    characterCode,
    spiritStones: Number(player?.spiritStones ?? data?.spiritStones ?? 0) || 0,
    immortalJade: Number(player?.immortalJade ?? data?.immortalJade ?? 0) || 0,
    cultivation: Number(player?.cultivation ?? data?.cultivation ?? 0) || 0,
    stats: player?.stats || data?.stats || null,
    portraitUrl: player?.portraitUrl || data?.portraitUrl || null,
    portraitData: player?.portraitData || data?.portraitData || null,
    portraitSource: player?.portraitSource || data?.portraitSource || null,
    updatedAt: Date.now(),
  };
};

const extractMessages = (snapshot: any) => {
  const arr: any[] = [];
  if (!snapshot) return arr;
  snapshot.forEach((child: any) =>
    arr.push(child.val ? child.val() : child.data?.()),
  );
  return arr.filter(Boolean);
};

export const signInWithGoogle = async () => {
  if (isRealFirebaseConfigured && auth) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err) {
      console.warn("Google sign-in failed, using local fallback:", err);
      return await mockAuth.signInWithGoogle();
    }
  }
  return await mockAuth.signInWithGoogle();
};

export const logoutUser = async () => {
  if (isRealFirebaseConfigured && auth) {
    await signOut(auth);
    return;
  }
  await mockAuth.signOut();
};

export const onAuthChanged = (callback: (user: any) => void) => {
  if (isRealFirebaseConfigured && auth) {
    return onAuthStateChanged(auth, callback);
  }
  return mockAuth.onAuthStateChanged(callback);
};

export const savePlayerData = async (
  uid: string,
  data: any,
  options?: { syncCloud?: boolean; syncPresence?: boolean },
) => {
  const safeData = safeClone(data);
  safeStorage.set(keys.cloudCachePrefix + uid, safeData);

  const code = normalizeCharacterCode(
    safeData?.player?.characterCode || safeData?.characterCode || "",
  );
  if (code) {
    safeStorage.set(keys.legacyCodeSavePrefix + code, safeData);
  }

  const shouldSyncCloud = options?.syncCloud === true;
  const shouldSyncPresence =
    options?.syncPresence ??
    Boolean(
      safeData?.player?.isOnline ||
      safeData?.isOnline ||
      safeData?.currentActivity ||
      safeData?.player?.currentActivity,
    );

  if (isRealFirebaseConfigured && db && shouldSyncCloud) {
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(doc(db, "players", uid), cleanData, { merge: true });

    if (code) {
      await setDoc(
        doc(db, "legacy_character_saves", code),
        {
          ...cleanData,
          uid,
          characterCode: code,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
      await setDoc(
        doc(db, "character_codes", code),
        {
          code,
          uid,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    }
  }

  if (isRealFirebaseConfigured && rtdb && shouldSyncPresence) {
    await set(
      ref(rtdb, `presence/${uid}`),
      buildPresencePayload(uid, safeData),
    );
  }

  if (!isRealFirebaseConfigured) {
    await mockDb.setPlayer(uid, safeData);
    if (shouldSyncPresence) {
      await mockDb.setPresence(uid, buildPresencePayload(uid, safeData));
    }
  }
};

export const sendCombatEvent = async (targetUid: string, event: any) => {
  const eventRef = push(ref(rtdb, `combatQueue/${targetUid}`));

  await set(eventRef, {
    ...event,
    createdAt: Date.now(),
  });
};

export const listenPlayerData = (
  uid: string,
  callback: (data: any) => void,
) => {
  const cacheKey = keys.cloudCachePrefix + uid;
  const cached = safeStorage.get(cacheKey, null);
  if (cached) callback(cached);

  if (isRealFirebaseConfigured && db) {
    const unsub = onSnapshot(
      doc(db, "players", uid),
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data());
        }
      },
      (error) => {
        console.error("Error loading player data:", error);
      },
    );
    return unsub;
  }

  return () => {};
};

export const listenLegacyCharacterSave = async (
  code: string,
  callback: (data: any) => void,
) => {
  const norm = normalizeCharacterCode(code);
  if (!norm) return;
  const cached = safeStorage.get(keys.legacyCodeSavePrefix + norm, null);
  if (cached) callback(cached);

  if (isRealFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, "legacy_character_saves", norm));
      if (snap.exists()) callback(snap.data());
    } catch (error) {
      console.error("listenLegacyCharacterSave failed:", error);
    }
  }
};

export const findPlayerByCharacterCode = async (code: string) => {
  const norm = normalizeCharacterCode(code);
  if (!norm) return null;

  const cached = safeStorage.get(keys.cloudCachePrefix + norm, null);
  if (cached) return cached;

  if (isRealFirebaseConfigured && db) {
    try {
      const directSnap = await getDocs(
        query(
          collection(db, "players"),
          where("characterCode", "==", norm),
          limit(1),
        ),
      );
      if (!directSnap.empty) {
        return directSnap.docs[0].data();
      }

      const nestedSnap = await getDocs(
        query(
          collection(db, "players"),
          where("player.characterCode", "==", norm),
          limit(1),
        ),
      );
      if (!nestedSnap.empty) {
        return nestedSnap.docs[0].data();
      }

      const legacySnap = await getDoc(doc(db, "legacy_character_saves", norm));
      if (legacySnap.exists()) return legacySnap.data();

      const codeDoc = await getDoc(doc(db, "character_codes", norm));
      if (codeDoc.exists()) {
        const mappedUid = String(codeDoc.data()?.uid || "");
        if (mappedUid) {
          const playerDoc = await getDoc(doc(db, "players", mappedUid));
          if (playerDoc.exists()) return playerDoc.data();
        }
      }
    } catch (error) {
      console.error("findPlayerByCharacterCode failed:", error);
    }
  }

  return null;
};

export const bindCharacterCodeToUser = async (
  uid: string,
  code: string,
  playerData?: any,
) => {
  const norm = normalizeCharacterCode(code);
  if (!norm) return;

  const current =
    playerData || safeStorage.get(keys.cloudCachePrefix + uid, {});
  const next = {
    ...current,
    uid,
    characterCode: norm,
    updatedAt: Date.now(),
    player: {
      ...(current?.player || {}),
      characterCode: norm,
    },
  };

  safeStorage.set(keys.cloudCachePrefix + uid, next);

  if (isRealFirebaseConfigured && db) {
    await setDoc(
      doc(db, "players", uid),
      {
        ...next,
        uid,
        characterCode: norm,
      },
      { merge: true },
    );
    await setDoc(
      doc(db, "legacy_character_saves", norm),
      {
        ...next,
        uid,
        characterCode: norm,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    await setDoc(
      doc(db, "character_codes", norm),
      {
        code: norm,
        uid,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  }
};

export const listenAllOnlinePlayers = (callback: (players: any[]) => void) => {
  const filterPlayers = (players: any[]) => {
    const now = Date.now();
    const seen = new Set<string>();
    return players.filter((player) => {
      if (!player) return false;
      const uid = String(player.uid || "");
      const providerId = String(player.providerId || "");
      const realUser =
        player.isRealUser !== false &&
        providerId !== "mock" &&
        !isGuestUid(uid);
      const active =
        Boolean(player.isOnline) &&
        now - Number(player.lastActive || 0) < 7 * 60 * 1000;
      if (!realUser || !active) return false;
      if (seen.has(uid)) return false;
      seen.add(uid);
      return true;
    });
  };

  if (isRealFirebaseConfigured && rtdb) {
    const presenceRef = ref(rtdb, "presence");
    const q = rtdbQuery(
      presenceRef,
      orderByChild("lastActive"),
      limitToLast(100),
    );

    const unsub = onValue(
      q,
      (snapshot) => {
        const players = extractMessages(snapshot).filter(Boolean);
        callback(filterPlayers(players));
      },
      (error) => {
        console.error("Error loading online players:", error);
        callback([]);
      },
    );

    return unsub;
  }

  callback(filterPlayers(mockDb.getAllPresence()));
  return () => {};
};

export const updatePresence = async (uid: string, data: any) => {
  const payload = buildPresencePayload(uid, data);
  if (isRealFirebaseConfigured && rtdb) {
    await set(ref(rtdb, `presence/${uid}`), payload);
    return;
  }
  await mockDb.setPresence(uid, payload);
};

export const sendVillageChat = async (message: {
  senderId: string;
  senderName: string;
  senderRealm: string;
  text: string;
}) => {
  const msgObj = {
    id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    ...message,
    timestamp: Date.now(),
  };

  if (isRealFirebaseConfigured && rtdb) {
    await push(ref(rtdb, "village_chats"), msgObj);
    return;
  }

  await mockDb.addMessage(msgObj);
};

export const getLocalVillageChat = () => {
  return mockDb.getMessages();
};

export const listenVillageChats = (callback: (messages: any[]) => void) => {
  if (isFirebaseLive && rtdb) {
    const chatsRef = rtdbQuery(
      ref(rtdb, "village_chats"),
      orderByChild("timestamp"),
      limitToLast(100),
    );

    const unsub = onValue(
      chatsRef,
      (snapshot) => {
        const messages = extractMessages(snapshot)
          .filter(Boolean)
          .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        callback(messages);
      },
      (err) => {
        console.error(err);
        callback([]);
      },
    );

    return unsub;
  }

  callback(getLocalVillageChat());
  return () => {};
};

export const sendZaloPersonalMessage = async (payload: {
  toUid: string;
  toName?: string;
  title: string;
  content: string;
  type?: MailMessage["type"];
}) => {
  const endpoint = (import.meta as any).env?.VITE_ZALO_MESSAGE_WEBHOOK_URL;
  if (!endpoint) {
    console.warn("Thiếu VITE_ZALO_MESSAGE_WEBHOOK_URL");
    return false;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      toUid: payload.toUid,
      toName: payload.toName || "",
      title: payload.title,
      content: payload.content,
      type: payload.type || "system",
    }),
  });

  return res.ok;
};

export { db };