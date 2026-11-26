import { doc, onSnapshot } from "firebase/firestore";
import { limitToLast, onValue, push, query as rtdbQuery, ref, set } from "firebase/database";
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
// LIVE CHEER / REACTION BAR (Server API — Zero RTDB permission_denied warnings!)
// ---------------------------------------------------------------------------

export async function sendMinigameCheer(
  eventId: string,
  cheer: { uid: string; displayName: string; emoji: string; text?: string }
): Promise<MinigameCheerMessage[]> {
  if (!eventId) return [];
  try {
    const res = await api.post<{ success: boolean; cheers: MinigameCheerMessage[] }>(
      `/api/minigames/${encodeURIComponent(eventId)}/cheer`,
      { emoji: cheer.emoji, text: cheer.text || "" }
    );
    return res?.cheers || [];
  } catch {
    return [];
  }
}

export function subscribeMinigameCheers(
  eventId: string,
  onUpdate: (cheers: MinigameCheerMessage[]) => void
): () => void {
  if (!eventId) return () => {};
  let stopped = false;

  const pull = async () => {
    if (stopped) return;
    try {
      const res = await api.get<{ success: boolean; cheers: MinigameCheerMessage[] }>(
        `/api/minigames/${encodeURIComponent(eventId)}/cheers`
      );
      if (!stopped && Array.isArray(res?.cheers)) {
        onUpdate(res.cheers);
      }
    } catch {
      // Non-critical visual interaction
    }
  };

  void pull();
  const timer = setInterval(pull, 3000);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

// ---------------------------------------------------------------------------
// REALTIME MINIGAME ROOM CHAT (RTDB primary + Server API fallback — 0 Firestore reads!)
// ---------------------------------------------------------------------------

export async function sendMinigameChatMessage(
  eventId: string,
  payload: {
    uid: string;
    displayName: string;
    avatarUrl?: string;
    isAdmin?: boolean;
    message: string;
  }
): Promise<MinigameChatMessage | null> {
  const cleanText = String(payload.message || "")
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, 280);
  if (!eventId || !cleanText) return null;

  const localMsg: MinigameChatMessage = {
    id: `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    uid: payload.uid,
    displayName: (payload.displayName || "Học sinh").slice(0, 60),
    ...(payload.avatarUrl ? { avatarUrl: payload.avatarUrl } : {}),
    isAdmin: Boolean(payload.isAdmin),
    message: cleanText,
    createdAt: Date.now(),
  };

  let pushedToRtdb = false;
  if (rtdb) {
    try {
      const chatRef = push(ref(rtdb, `minigame_chat/${eventId}`));
      await set(chatRef, {
        ...localMsg,
        id: chatRef.key || localMsg.id,
      });
      pushedToRtdb = true;
    } catch {
      // RTDB rules may not yet be deployed — gracefully fall back to backend API below
    }
  }

  try {
    const res = await api.post<{ success: boolean; chatMessage?: MinigameChatMessage }>(
      `/api/minigames/${encodeURIComponent(eventId)}/chat`,
      { message: cleanText, avatarUrl: payload.avatarUrl }
    );
    return res?.chatMessage || localMsg;
  } catch {
    return pushedToRtdb ? localMsg : null;
  }
}

export function subscribeMinigameChatRealtime(
  eventId: string,
  onUpdate: (messages: MinigameChatMessage[]) => void
): () => void {
  if (!eventId) return () => {};
  let stopped = false;
  let unsubRtdb: (() => void) | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const mergeAndEmit = (list: MinigameChatMessage[]) => {
    if (stopped) return;
    const dedup = new Map<string, MinigameChatMessage>();
    for (const item of list) {
      if (!item?.message) continue;
      const key = item.id || `${item.uid}_${item.createdAt}_${item.message.slice(0, 20)}`;
      dedup.set(key, item);
    }
    const sorted = Array.from(dedup.values())
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-60);
    onUpdate(sorted);
  };

  const startApiFallback = () => {
    if (stopped || pollTimer) return;
    const pull = async () => {
      if (stopped) return;
      try {
        const res = await api.get<{ success: boolean; messages?: MinigameChatMessage[] }>(
          `/api/minigames/${encodeURIComponent(eventId)}/chat`
        );
        if (!stopped && Array.isArray(res?.messages)) {
          mergeAndEmit(res.messages);
        }
      } catch {
        // Silent retry
      }
    };
    void pull();
    pollTimer = setInterval(pull, 2200);
  };

  if (rtdb) {
    try {
      const q = rtdbQuery(ref(rtdb, `minigame_chat/${eventId}`), limitToLast(60));
      unsubRtdb = onValue(
        q,
        (snap) => {
          if (stopped) return;
          const val = snap.val();
          if (!val || typeof val !== "object") {
            onUpdate([]);
            return;
          }
          const items = Object.entries(val).map(([key, raw]: [string, any]) => ({
            id: raw?.id || key,
            uid: String(raw?.uid || ""),
            displayName: String(raw?.displayName || "Học sinh"),
            avatarUrl: raw?.avatarUrl ? String(raw.avatarUrl) : undefined,
            isAdmin: Boolean(raw?.isAdmin),
            message: String(raw?.message || ""),
            createdAt: Number(raw?.createdAt) || 0,
          }));
          mergeAndEmit(items);
        },
        () => {
          // RTDB permission_denied or offline -> fall back smoothly to API polling
          startApiFallback();
        }
      );
    } catch {
      startApiFallback();
    }
  } else {
    startApiFallback();
  }

  return () => {
    stopped = true;
    if (unsubRtdb) unsubRtdb();
    if (pollTimer) clearInterval(pollTimer);
  };
}
