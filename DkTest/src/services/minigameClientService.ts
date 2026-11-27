import { doc, onSnapshot } from "firebase/firestore";
import { limitToLast, onValue, query as rtdbQuery, ref } from "firebase/database";
import { api } from "./apiClient";
import { db, rtdb } from "./firebase/config";
import type {
  MinigameChatMessage,
  MinigameCheerMessage,
  MinigameEvent,
  MinigamePrize,
  MinigameType,
} from "../types/minigame";

// ---------------------------------------------------------------------------
// ADMIN API CALLS
// ---------------------------------------------------------------------------

export async function fetchAdminMinigamesApi(): Promise<MinigameEvent[]> {
  const res = await api.get<{ success: boolean; events: MinigameEvent[] }>("/api/admin/minigames");
  return res.events || [];
}

export async function createMinigameApi(payload: {
  title: string;
  description?: string;
  gameType: MinigameType;
  maxParticipants: number;
  racersPerHeat: number;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  durationMinutes?: number | null;
  raceDurationMs?: number;
  revealDurationMs?: number;
  chatEnabled?: boolean;
  prizes: MinigamePrize[];
}): Promise<MinigameEvent> {
  const res = await api.post<{ success: boolean; event: MinigameEvent }>(
    "/api/admin/minigames",
    payload
  );
  return res.event;
}

export async function updateMinigameScheduleApi(
  eventId: string,
  payload: {
    scheduledStartAt?: string | null;
    scheduledEndAt?: string | null;
    durationMinutes?: number | null;
    raceDurationMs?: number;
    revealDurationMs?: number;
    chatEnabled?: boolean;
  }
): Promise<MinigameEvent> {
  const res = await api.patch<{ success: boolean; event: MinigameEvent }>(
    `/api/admin/minigames/${encodeURIComponent(eventId)}/schedule`,
    payload
  );
  return res.event;
}

export async function fillMinigameBotsApi(
  eventId: string,
  options?: { count?: number; clearFirst?: boolean }
): Promise<MinigameEvent> {
  const res = await api.post<{ success: boolean; event: MinigameEvent }>(
    `/api/admin/minigames/${encodeURIComponent(eventId)}/bots/fill`,
    options || {}
  );
  return res.event;
}

export async function clearMinigameBotsApi(eventId: string): Promise<MinigameEvent> {
  const res = await api.post<{ success: boolean; event: MinigameEvent }>(
    `/api/admin/minigames/${encodeURIComponent(eventId)}/bots/clear`
  );
  return res.event;
}

export async function resetMinigameDemoApi(eventId: string): Promise<MinigameEvent> {
  const res = await api.post<{ success: boolean; event: MinigameEvent }>(
    `/api/admin/minigames/${encodeURIComponent(eventId)}/reset-demo`
  );
  return res.event;
}

export async function startMinigameApi(eventId: string): Promise<MinigameEvent> {
  const res = await api.post<{ success: boolean; event: MinigameEvent }>(
    `/api/admin/minigames/${encodeURIComponent(eventId)}/start`
  );
  return res.event;
}

export async function launchRaceHeatApi(
  eventId: string,
  heatId?: string
): Promise<MinigameEvent> {
  const res = await api.post<{ success: boolean; event: MinigameEvent }>(
    `/api/admin/minigames/${encodeURIComponent(eventId)}/heats/launch`,
    { heatId }
  );
  return res.event;
}

export async function completeRaceHeatApi(
  eventId: string,
  heatId?: string
): Promise<MinigameEvent> {
  const res = await api.post<{ success: boolean; event: MinigameEvent }>(
    `/api/admin/minigames/${encodeURIComponent(eventId)}/heats/complete`,
    { heatId }
  );
  return res.event;
}

export async function distributeMinigamePrizesApi(eventId: string): Promise<{
  event: MinigameEvent;
  creditedCount: number;
  totalCreditedVnd: number;
}> {
  return api.post(`/api/admin/minigames/${encodeURIComponent(eventId)}/distribute-prizes`);
}

export async function cancelMinigameApi(eventId: string, hard = false): Promise<void> {
  await api.delete(
    `/api/admin/minigames/${encodeURIComponent(eventId)}${hard ? "?hard=true" : ""}`
  );
}

export async function broadcastDeviceNotificationApi(payload: {
  title: string;
  message: string;
  route?: string;
  type?: "minigame_event" | "feature_release" | "system";
}): Promise<void> {
  await api.post("/api/admin/notifications/broadcast", payload);
}

// ---------------------------------------------------------------------------
// STUDENT API CALLS
// ---------------------------------------------------------------------------

export async function fetchStudentMinigamesApi(): Promise<MinigameEvent[]> {
  const res = await api.get<{ success: boolean; events: MinigameEvent[] }>("/api/minigames");
  return res.events || [];
}

export async function fetchStudentMinigameDetailApi(idOrCode: string): Promise<MinigameEvent> {
  const res = await api.get<{ success: boolean; event: MinigameEvent }>(
    `/api/minigames/${encodeURIComponent(idOrCode)}`
  );
  return res.event;
}

export async function joinMinigameApi(
  eventId: string,
  payload?: { prediction?: string; avatarUrl?: string }
): Promise<MinigameEvent> {
  const res = await api.post<{ success: boolean; event: MinigameEvent }>(
    `/api/minigames/${encodeURIComponent(eventId)}/join`,
    payload || {}
  );
  return res.event;
}

export async function leaveMinigameApi(eventId: string): Promise<MinigameEvent> {
  const res = await api.post<{ success: boolean; event: MinigameEvent }>(
    `/api/minigames/${encodeURIComponent(eventId)}/leave`
  );
  return res.event;
}

// ---------------------------------------------------------------------------
// REALTIME SUBSCRIPTION (Firestore onSnapshot + Resilient Polling Fallback)
// ---------------------------------------------------------------------------

export function subscribeMinigameEventRealtime(
  eventId: string,
  onUpdate: (event: MinigameEvent) => void,
  isAdmin = false
): () => void {
  let stopped = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let unsubFirestore: (() => void) | null = null;

  const startPollingFallback = () => {
    if (stopped || pollTimer) return;
    pollTimer = setInterval(async () => {
      if (stopped) return;
      try {
        const res = await api.get<{ success: boolean; event: MinigameEvent }>(
          isAdmin
            ? `/api/admin/minigames/${encodeURIComponent(eventId)}`
            : `/api/minigames/${encodeURIComponent(eventId)}`
        );
        if (!stopped && res?.event) onUpdate(res.event);
      } catch {
        // silent retry on transient network error
      }
    }, 2500);
  };

  if (db && eventId && !eventId.toUpperCase().startsWith("MG")) {
    try {
      unsubFirestore = onSnapshot(
        doc(db, "minigame_events", eventId),
        (snap) => {
          if (stopped) return;
          if (snap.exists()) {
            onUpdate({ id: snap.id, ...snap.data() } as MinigameEvent);
          }
        },
        () => {
          // If Firestore rules aren't deployed yet or offline, smoothly fall back to API polling
          startPollingFallback();
        }
      );
    } catch {
      startPollingFallback();
    }
  } else {
    startPollingFallback();
  }

  return () => {
    stopped = true;
    if (unsubFirestore) unsubFirestore();
    if (pollTimer) clearInterval(pollTimer);
  };
}

// ---------------------------------------------------------------------------
// LIVE CHEER / REACTION BAR (Unified Monotonic Store — Zero Serverless Jitter!)
// ---------------------------------------------------------------------------

export const MINIGAME_UNIFIED_CHAT_ROOM = "global";

const cheerStoreByRoom = new Map<string, Map<string, MinigameCheerMessage>>();

function mergeCheersMonotonically(
  roomKey: string,
  incoming: MinigameCheerMessage[]
): MinigameCheerMessage[] {
  const now = Date.now();
  let map = cheerStoreByRoom.get(roomKey);
  if (!map) {
    map = new Map();
    cheerStoreByRoom.set(roomKey, map);
  }
  for (const item of incoming) {
    if (!item?.id || !item?.emoji) continue;
    if (now - Number(item.createdAt || 0) < 90_000) {
      map.set(item.id, item);
    }
  }
  for (const [k, v] of map.entries()) {
    if (now - Number(v.createdAt || 0) >= 90_000) map.delete(k);
  }
  return Array.from(map.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 12);
}

export async function sendMinigameCheer(
  eventId: string,
  cheer: { uid: string; displayName: string; emoji: string; text?: string }
): Promise<MinigameCheerMessage[]> {
  const roomKey = MINIGAME_UNIFIED_CHAT_ROOM || eventId;
  const id = `ch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const optimistic: MinigameCheerMessage = {
    id,
    uid: cheer.uid,
    displayName: cheer.displayName || "Người xem",
    emoji: cheer.emoji,
    text: cheer.text || "",
    createdAt: Date.now(),
  };
  mergeCheersMonotonically(roomKey, [optimistic]);
  try {
    const res = await api.post<{ success: boolean; cheers: MinigameCheerMessage[] }>(
      `/api/minigames/${encodeURIComponent(roomKey)}/cheer`,
      { id, emoji: cheer.emoji, text: cheer.text || "" }
    );
    return mergeCheersMonotonically(roomKey, res?.cheers || [optimistic]);
  } catch {
    return mergeCheersMonotonically(roomKey, [optimistic]);
  }
}

export function subscribeMinigameCheers(
  eventId: string,
  onUpdate: (cheers: MinigameCheerMessage[]) => void
): () => void {
  const roomKey = MINIGAME_UNIFIED_CHAT_ROOM || eventId;
  let stopped = false;
  let lastSig = "";

  const emitIfChanged = (list: MinigameCheerMessage[]) => {
    const sig = list.map((c) => c.id).join("|");
    if (sig !== lastSig) {
      lastSig = sig;
      onUpdate(list);
    }
  };

  emitIfChanged(mergeCheersMonotonically(roomKey, []));

  const pull = async () => {
    if (stopped) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    try {
      const res = await api.get<{ success: boolean; cheers: MinigameCheerMessage[] }>(
        `/api/minigames/${encodeURIComponent(roomKey)}/cheers`
      );
      if (!stopped && Array.isArray(res?.cheers)) {
        emitIfChanged(mergeCheersMonotonically(roomKey, res.cheers));
      }
    } catch {
      // Non-critical visual interaction
    }
  };

  void pull();
  const timer = setInterval(pull, 3500);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

// ---------------------------------------------------------------------------
// UNIFIED REALTIME MINIGAME CHAT (Single Continuous Stream + Zero Jitter!)
// ---------------------------------------------------------------------------

interface RoomChatController {
  roomKey: string;
  messagesMap: Map<string, MinigameChatMessage>;
  listeners: Set<(messages: MinigameChatMessage[]) => void>;
  lastSignature: string;
  pollTimer: ReturnType<typeof setInterval> | null;
  unsubRtdb: (() => void) | null;
  inFlightPull: boolean;
}

const chatControllers = new Map<string, RoomChatController>();
const CHAT_SESSION_STORAGE_PREFIX = "dktest_minigame_chat_v2_";
const CHAT_TTL_MS = 24 * 60 * 60 * 1000;

function resolveCanonicalChatRoom(_eventId?: string): string {
  // Unify all Minigame rooms, Lobby & Solo Arcade into ONE continuous chat stream!
  return MINIGAME_UNIFIED_CHAT_ROOM;
}

function hydrateStoredChat(roomKey: string): Map<string, MinigameChatMessage> {
  const map = new Map<string, MinigameChatMessage>();
  if (typeof window === "undefined") return map;
  try {
    const raw = window.sessionStorage.getItem(`${CHAT_SESSION_STORAGE_PREFIX}${roomKey}`);
    if (!raw) return map;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const now = Date.now();
      for (const m of parsed) {
        if (m?.id && m?.message && now - Number(m.createdAt || 0) < CHAT_TTL_MS) {
          map.set(String(m.id), { ...m, pending: false });
        }
      }
    }
  } catch {
    // Ignore storage quota / parse errors
  }
  return map;
}

function persistStoredChat(roomKey: string, list: MinigameChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      `${CHAT_SESSION_STORAGE_PREFIX}${roomKey}`,
      JSON.stringify(list.slice(-60))
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function mergeChatMessagesMonotonically(
  existingMap: Map<string, MinigameChatMessage>,
  incoming: MinigameChatMessage[],
  now = Date.now()
): MinigameChatMessage[] {
  for (const item of incoming) {
    if (!item || !item.message) continue;
    const cleanText = String(item.message).trim();
    if (!cleanText) continue;
    const createdAt = Number(item.createdAt) || now;
    if (now - createdAt >= CHAT_TTL_MS) continue;
    const key =
      item.id || `${item.uid}_${Math.floor(createdAt / 1000)}_${cleanText.slice(0, 24)}`;
    const prev = existingMap.get(key);
    if (!prev || (prev.pending && !item.pending)) {
      existingMap.set(key, {
        ...prev,
        ...item,
        id: key,
        message: cleanText,
        createdAt: prev ? Math.min(prev.createdAt, createdAt) : createdAt,
        pending: Boolean(item.pending && !prev),
      });
    }
  }

  for (const [k, v] of existingMap.entries()) {
    if (now - Number(v.createdAt || 0) >= CHAT_TTL_MS) {
      existingMap.delete(k);
    }
  }

  return Array.from(existingMap.values())
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
    .slice(-60);
}

function getSortedRoomMessages(ctrl: RoomChatController): MinigameChatMessage[] {
  return mergeChatMessagesMonotonically(ctrl.messagesMap, []);
}

function notifyRoomController(ctrl: RoomChatController, incoming: MinigameChatMessage[]): void {
  const sorted = mergeChatMessagesMonotonically(ctrl.messagesMap, incoming);
  const sig = sorted
    .map((m) => `${m.id}:${m.pending ? "1" : "0"}:${m.roomTag || ""}`)
    .join("|");
  if (sig === ctrl.lastSignature) return;
  ctrl.lastSignature = sig;
  persistStoredChat(ctrl.roomKey, sorted);
  ctrl.listeners.forEach((fn) => {
    try {
      fn(sorted);
    } catch {
      // Isolate listener error
    }
  });
}

function getOrCreateChatController(roomKey: string): RoomChatController {
  let ctrl = chatControllers.get(roomKey);
  if (ctrl) return ctrl;

  const messagesMap = hydrateStoredChat(roomKey);
  ctrl = {
    roomKey,
    messagesMap,
    listeners: new Set(),
    lastSignature: "",
    pollTimer: null,
    unsubRtdb: null,
    inFlightPull: false,
  };
  chatControllers.set(roomKey, ctrl);
  return ctrl;
}

function startControllerTransportIfNeeded(ctrl: RoomChatController): void {
  if (ctrl.pollTimer) return;

  const pullFromServer = async () => {
    if (ctrl.listeners.size === 0 || ctrl.inFlightPull) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    ctrl.inFlightPull = true;
    try {
      const res = await api.get<{ success: boolean; messages?: MinigameChatMessage[] }>(
        `/api/minigames/${encodeURIComponent(ctrl.roomKey)}/chat`
      );
      if (Array.isArray(res?.messages) && res.messages.length > 0) {
        notifyRoomController(
          ctrl,
          res.messages.map((m) => ({ ...m, pending: false }))
        );
      }
    } catch {
      // Keep existing messages intact — NEVER wipe or flicker on network blip!
    } finally {
      ctrl.inFlightPull = false;
    }
  };

  void pullFromServer();
  ctrl.pollTimer = setInterval(pullFromServer, 2400);

  // Optional passive read-only RTDB boost if RTDB read rules are active:
  // NEVER write directly from client (avoids optimistic write -> permission_denied wipe!)
  // and NEVER overwrite when snapshot is empty (`!val`).
  if (rtdb && !ctrl.unsubRtdb) {
    try {
      const q = rtdbQuery(ref(rtdb, `minigame_chat/${ctrl.roomKey}`), limitToLast(60));
      ctrl.unsubRtdb = onValue(
        q,
        (snap) => {
          const val = snap.val();
          if (!val || typeof val !== "object") return;
          const items: MinigameChatMessage[] = Object.entries(val).map(
            ([key, raw]: [string, any]) => ({
              id: String(raw?.id || key),
              uid: String(raw?.uid || ""),
              displayName: String(raw?.displayName || "Học sinh"),
              avatarUrl: raw?.avatarUrl ? String(raw.avatarUrl) : undefined,
              isAdmin: Boolean(raw?.isAdmin),
              message: String(raw?.message || ""),
              roomTag: raw?.roomTag ? String(raw.roomTag) : undefined,
              pending: false,
              createdAt: Number(raw?.createdAt) || 0,
            })
          );
          if (items.length > 0) {
            notifyRoomController(ctrl, items);
          }
        },
        () => {
          // Silently ignore RTDB read permission warning; server API sync handles everything!
          if (ctrl.unsubRtdb) {
            ctrl.unsubRtdb();
            ctrl.unsubRtdb = null;
          }
        }
      );
    } catch {
      // Ignore RTDB init issue
    }
  }
}

function stopControllerTransportIfIdle(ctrl: RoomChatController): void {
  if (ctrl.listeners.size > 0) return;
  if (ctrl.pollTimer) {
    clearInterval(ctrl.pollTimer);
    ctrl.pollTimer = null;
  }
  if (ctrl.unsubRtdb) {
    ctrl.unsubRtdb();
    ctrl.unsubRtdb = null;
  }
}

export async function sendMinigameChatMessage(
  eventId: string,
  payload: {
    uid: string;
    displayName: string;
    avatarUrl?: string;
    isAdmin?: boolean;
    message: string;
    roomTag?: string;
  }
): Promise<MinigameChatMessage | null> {
  const cleanText = String(payload.message || "")
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, 280);
  if (!cleanText || !payload.uid) return null;

  const roomKey = resolveCanonicalChatRoom(eventId);
  const ctrl = getOrCreateChatController(roomKey);
  const deterministicId = `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const optimisticMsg: MinigameChatMessage = {
    id: deterministicId,
    uid: payload.uid,
    displayName: (payload.displayName || "Học sinh").slice(0, 60),
    ...(payload.avatarUrl ? { avatarUrl: payload.avatarUrl } : {}),
    isAdmin: Boolean(payload.isAdmin),
    message: cleanText,
    ...(payload.roomTag ? { roomTag: payload.roomTag.slice(0, 48) } : {}),
    pending: true,
    createdAt: Date.now(),
  };

  // Instant 0ms optimistic render with stable `id` (never remounts when confirmed!)
  notifyRoomController(ctrl, [optimisticMsg]);

  try {
    const res = await api.post<{
      success: boolean;
      chatMessage?: MinigameChatMessage;
      messages?: MinigameChatMessage[];
    }>(`/api/minigames/${encodeURIComponent(roomKey)}/chat`, {
      id: deterministicId,
      message: cleanText,
      avatarUrl: payload.avatarUrl,
      roomTag: payload.roomTag,
    });

    const confirmed: MinigameChatMessage = res?.chatMessage
      ? { ...res.chatMessage, id: deterministicId, pending: false }
      : { ...optimisticMsg, pending: false };

    const serverBatch = Array.isArray(res?.messages)
      ? res.messages.map((m) => ({ ...m, pending: false }))
      : [];
    notifyRoomController(ctrl, [confirmed, ...serverBatch]);
    return confirmed;
  } catch {
    const settled = { ...optimisticMsg, pending: false };
    notifyRoomController(ctrl, [settled]);
    return settled;
  }
}

export function subscribeMinigameChatRealtime(
  eventId: string,
  onUpdate: (messages: MinigameChatMessage[]) => void
): () => void {
  const roomKey = resolveCanonicalChatRoom(eventId);
  const ctrl = getOrCreateChatController(roomKey);
  ctrl.listeners.add(onUpdate);

  // Immediately deliver cached continuous messages synchronously (zero blank flash on navigation!)
  onUpdate(getSortedRoomMessages(ctrl));
  startControllerTransportIfNeeded(ctrl);

  return () => {
    ctrl.listeners.delete(onUpdate);
    stopControllerTransportIfIdle(ctrl);
  };
}
