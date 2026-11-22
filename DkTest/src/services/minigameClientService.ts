import { doc, onSnapshot } from "firebase/firestore";
import { api } from "./apiClient";
import { db } from "./firebase/config";
import type {
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
  prizes: MinigamePrize[];
}): Promise<MinigameEvent> {
  const res = await api.post<{ success: boolean; event: MinigameEvent }>(
    "/api/admin/minigames",
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
