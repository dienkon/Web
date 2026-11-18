import {
  ref,
  get,
  set,
  update,
  remove,
  onValue,
  onDisconnect,
  off,
} from "firebase/database";
import { rtdb } from "./firebase/config";

export interface ArenaParticipant {
  uid: string;
  name: string;
  avatar?: string;
  role: "host" | "player";
  isReady: boolean;
  currentQuestionIndex: number;
  score: number;
  completed: boolean;
  finishedAt?: number;
}

export interface ArenaRoom {
  id: string;
  roomCode: string;
  title: string;
  examId: string;
  examTitle: string;
  hostUid: string;
  hostName: string;
  maxParticipants: number;
  status: "waiting" | "in_progress" | "finished";
  createdAt: number;
  lastActiveAt?: number;
  startedAt?: number;
  finishedAt?: number;
  winnerUid?: string;
  participants: Record<string, ArenaParticipant>;
}

export const DEFAULT_ARENA_PRESET_EXAM_ID = "toan12_standard_01";
export const ARENA_ROOM_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

const ARENA_ROOMS_PATH = "arena_rooms";
const ARENA_CODES_PATH = "arena_room_codes";
const GUEST_UID_STORAGE_KEY = "dktest_arena_guest_uid";

// In-memory store for instant local reactivity & offline / unit test execution (ZERO Firestore calls)
const memoryRooms: Record<string, ArenaRoom> = {};
const memoryListeners: Record<string, Set<(room: ArenaRoom | null) => void>> = {};
const lobbyListeners = new Set<(rooms: ArenaRoom[]) => void>();

function canUseRtdb(): boolean {
  if (!rtdb) return false;
  if (typeof window === "undefined") return false;
  if (typeof import.meta !== "undefined" && (import.meta as any).env?.MODE === "test") {
    return false;
  }
  return true;
}

function sanitizeRtdbKey(raw: string): string {
  return String(raw || "").trim().replace(/[.#$/\[\]]/g, "_");
}

function stripUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item)) as any;
  }
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj as Record<string, any>)) {
    if (v !== undefined) {
      clean[k] = stripUndefined(v);
    }
  }
  return clean as T;
}

export function isArenaRoomExpired(room: ArenaRoom, now = Date.now()): boolean {
  const refTime = room.finishedAt || room.lastActiveAt || room.createdAt || 0;
  if (!refTime) return false;
  return now - refTime > ARENA_ROOM_TTL_MS;
}

export function resolveArenaUser(
  authUser: { uid?: string; displayName?: string | null; photoURL?: string | null } | null | undefined,
  userProfile: { uid?: string; displayName?: string; fullName?: string; photoURL?: string } | null | undefined
): { uid: string; name: string; avatar: string } {
  let storedStudent: any = null;
  if (typeof localStorage !== "undefined") {
    try {
      const rawStudent = localStorage.getItem("student_info") || localStorage.getItem("userProfile");
      storedStudent = rawStudent ? JSON.parse(rawStudent) : null;
    } catch {}
  }

  let uid = authUser?.uid || userProfile?.uid || storedStudent?.uid || "";
  if (!uid) {
    try {
      const existingGuest =
        (typeof sessionStorage !== "undefined" && sessionStorage.getItem(GUEST_UID_STORAGE_KEY)) ||
        (typeof localStorage !== "undefined" && localStorage.getItem(GUEST_UID_STORAGE_KEY)) ||
        "";
      if (existingGuest) {
        uid = existingGuest;
      } else {
        uid = `guest_${Math.random().toString(36).substring(2, 9)}`;
        if (typeof sessionStorage !== "undefined") sessionStorage.setItem(GUEST_UID_STORAGE_KEY, uid);
        if (typeof localStorage !== "undefined") localStorage.setItem(GUEST_UID_STORAGE_KEY, uid);
      }
    } catch {
      uid = "guest_local";
    }
  }

  const name =
    userProfile?.displayName ||
    userProfile?.fullName ||
    authUser?.displayName ||
    storedStudent?.displayName ||
    storedStudent?.name ||
    "Chiến binh DkTest";
  const avatar = userProfile?.photoURL || authUser?.photoURL || storedStudent?.avatarUrl || "";
  return {
    uid: sanitizeRtdbKey(uid),
    name,
    avatar,
  };
}

function notifyLobbyListeners() {
  const activeRooms = Object.values(memoryRooms).filter(
    (r) => r.status === "waiting" && !isArenaRoomExpired(r)
  );
  lobbyListeners.forEach((cb) => {
    try {
      cb(activeRooms);
    } catch {}
  });
}

function notifyRoomListeners(roomId: string) {
  const room = memoryRooms[roomId] || null;
  const cbs = memoryListeners[roomId];
  if (cbs) {
    cbs.forEach((cb) => {
      try {
        cb(room);
      } catch {}
    });
  }
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function deleteRtdbRoomAndCode(roomId: string, roomCode?: string): Promise<void> {
  if (!canUseRtdb()) return;
  try {
    await remove(ref(rtdb, `${ARENA_ROOMS_PATH}/${sanitizeRtdbKey(roomId)}`));
    if (roomCode) {
      await remove(ref(rtdb, `${ARENA_CODES_PATH}/${sanitizeRtdbKey(roomCode.toUpperCase())}`));
    }
  } catch (err) {
    console.warn("[ArenaService] RTDB cleanup warning:", err);
  }
}

function registerParticipantWaitDisconnect(roomId: string, uid: string, isHost: boolean) {
  if (!canUseRtdb() || isHost) return;
  try {
    const pRef = ref(rtdb, `${ARENA_ROOMS_PATH}/${sanitizeRtdbKey(roomId)}/participants/${sanitizeRtdbKey(uid)}`);
    void onDisconnect(pRef).remove();
  } catch {}
}

function cancelParticipantDisconnect(roomId: string, uid: string) {
  if (!canUseRtdb()) return;
  try {
    const pRef = ref(rtdb, `${ARENA_ROOMS_PATH}/${sanitizeRtdbKey(roomId)}/participants/${sanitizeRtdbKey(uid)}`);
    void onDisconnect(pRef).cancel();
  } catch {}
}

/**
 * Tạo phòng thi đấu mới trên Firebase Realtime Database (0 Firestore reads/writes)
 */
export async function createArenaRoom(params: {
  hostUid: string;
  hostName: string;
  hostAvatar?: string;
  title: string;
  examId: string;
  examTitle: string;
  maxParticipants: number;
}): Promise<ArenaRoom> {
  const safeHostUid = sanitizeRtdbKey(params.hostUid);
  const roomCode = generateRoomCode();
  const roomId = `arena_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = Date.now();

  const hostParticipant: ArenaParticipant = {
    uid: safeHostUid,
    name: params.hostName,
    avatar: params.hostAvatar || "",
    role: "host",
    isReady: true,
    currentQuestionIndex: 0,
    score: 0,
    completed: false,
  };

  const newRoom: ArenaRoom = {
    id: roomId,
    roomCode,
    title: params.title.trim() || `Phòng thi ${params.hostName}`,
    examId: params.examId,
    examTitle: params.examTitle,
    hostUid: safeHostUid,
    hostName: params.hostName,
    maxParticipants: Math.max(2, Math.min(params.maxParticipants || 4, 50)),
    status: "waiting",
    createdAt: now,
    lastActiveAt: now,
    participants: {
      [safeHostUid]: hostParticipant,
    },
  };

  memoryRooms[roomId] = newRoom;
  notifyLobbyListeners();
  notifyRoomListeners(roomId);

  if (canUseRtdb()) {
    try {
      await set(ref(rtdb, `${ARENA_ROOMS_PATH}/${roomId}`), stripUndefined(newRoom));
      await set(ref(rtdb, `${ARENA_CODES_PATH}/${roomCode}`), {
        roomId,
        createdAt: now,
      });
    } catch (err) {
      console.warn("[ArenaService] RTDB save failed, using local room state:", err);
    }
  }

  return newRoom;
}

/**
 * Tham gia phòng đấu bằng Room ID hoặc Mã phòng (6 ký tự) — truy vấn O(1) trên RTDB
 */
export async function joinArenaRoom(
  roomIdOrCode: string,
  user: { uid: string; name: string; avatar?: string }
): Promise<ArenaRoom> {
  const cleanKey = sanitizeRtdbKey(roomIdOrCode.trim().toUpperCase());
  const safeUid = sanitizeRtdbKey(user.uid);

  let targetRoom: ArenaRoom | null = null;
  let targetRoomId = roomIdOrCode.trim();

  // Check memory cache first
  for (const r of Object.values(memoryRooms)) {
    if (r.id === targetRoomId || r.roomCode.toUpperCase() === cleanKey) {
      if (isArenaRoomExpired(r)) {
        delete memoryRooms[r.id];
      } else {
        targetRoom = r;
        targetRoomId = r.id;
      }
      break;
    }
  }

  // O(1) lookup in RTDB (0 Firestore reads)
  if (!targetRoom && canUseRtdb()) {
    try {
      if (targetRoomId.startsWith("arena_")) {
        const snap = await get(ref(rtdb, `${ARENA_ROOMS_PATH}/${sanitizeRtdbKey(targetRoomId)}`));
        if (snap.exists()) {
          targetRoom = snap.val() as ArenaRoom;
          targetRoomId = targetRoom.id || targetRoomId;
        }
      } else {
        const codeSnap = await get(ref(rtdb, `${ARENA_CODES_PATH}/${cleanKey}`));
        const mappedRoomId = codeSnap.exists() ? String(codeSnap.val()?.roomId || "") : "";
        if (mappedRoomId) {
          const roomSnap = await get(ref(rtdb, `${ARENA_ROOMS_PATH}/${sanitizeRtdbKey(mappedRoomId)}`));
          if (roomSnap.exists()) {
            targetRoom = roomSnap.val() as ArenaRoom;
            targetRoomId = targetRoom.id || mappedRoomId;
          } else {
            await remove(ref(rtdb, `${ARENA_CODES_PATH}/${cleanKey}`)).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn("[ArenaService] RTDB join lookup error:", err);
    }
  }

  if (!targetRoom) {
    throw new Error("Không tìm thấy phòng thi đấu hoặc mã phòng không hợp lệ!");
  }

  if (isArenaRoomExpired(targetRoom)) {
    delete memoryRooms[targetRoomId];
    void deleteRtdbRoomAndCode(targetRoomId, targetRoom.roomCode);
    throw new Error("Phòng thi đấu đã hết hạn. Vui lòng tạo phòng mới!");
  }

  const participants = targetRoom.participants || {};
  targetRoom.participants = participants;

  if (targetRoom.status !== "waiting") {
    if (participants[safeUid]) {
      memoryRooms[targetRoomId] = targetRoom;
      return targetRoom;
    }
    throw new Error("Phòng thi đấu này đã bắt đầu hoặc đã kết thúc!");
  }

  const currentCount = Object.keys(participants).length;
  if (!participants[safeUid] && currentCount >= targetRoom.maxParticipants) {
    throw new Error("Phòng thi đã đủ số lượng người tham gia!");
  }

  const now = Date.now();
  if (!participants[safeUid]) {
    participants[safeUid] = {
      uid: safeUid,
      name: user.name,
      avatar: user.avatar || "",
      role: targetRoom.hostUid === safeUid ? "host" : "player",
      isReady: targetRoom.hostUid === safeUid,
      currentQuestionIndex: 0,
      score: 0,
      completed: false,
    };
  }
  targetRoom.lastActiveAt = now;

  memoryRooms[targetRoomId] = targetRoom;
  notifyRoomListeners(targetRoomId);
  notifyLobbyListeners();

  if (canUseRtdb()) {
    try {
      await update(ref(rtdb, `${ARENA_ROOMS_PATH}/${sanitizeRtdbKey(targetRoomId)}`), {
        [`participants/${safeUid}`]: stripUndefined(participants[safeUid]),
        lastActiveAt: now,
      });
      registerParticipantWaitDisconnect(targetRoomId, safeUid, targetRoom.hostUid === safeUid);
    } catch (err) {
      console.warn("[ArenaService] RTDB join update error:", err);
    }
  }

  return targetRoom;
}

/**
 * Đổi trạng thái Sẵn sàng
 */
export async function toggleParticipantReady(
  roomId: string,
  uid: string,
  isReady: boolean
): Promise<void> {
  const safeUid = sanitizeRtdbKey(uid);
  const now = Date.now();
  const room = memoryRooms[roomId];
  if (room && room.participants?.[safeUid]) {
    room.participants[safeUid].isReady = isReady;
    room.lastActiveAt = now;
    notifyRoomListeners(roomId);
  }

  if (canUseRtdb()) {
    try {
      await update(ref(rtdb, `${ARENA_ROOMS_PATH}/${sanitizeRtdbKey(roomId)}`), {
        [`participants/${safeUid}/isReady`]: isReady,
        lastActiveAt: now,
      });
    } catch (err) {
      console.warn("[ArenaService] RTDB toggleReady error:", err);
    }
  }
}

/**
 * Bắt đầu trận đấu (Chỉ Chủ phòng Host)
 */
export async function startArenaMatch(roomId: string, hostUid: string): Promise<void> {
  const safeHostUid = sanitizeRtdbKey(hostUid);
  const now = Date.now();
  const room = memoryRooms[roomId];
  if (room) {
    if (room.hostUid !== safeHostUid) {
      throw new Error("Chỉ chủ phòng mới có quyền bắt đầu trận đấu!");
    }
    room.status = "in_progress";
    room.startedAt = now;
    room.lastActiveAt = now;
    notifyRoomListeners(roomId);
    notifyLobbyListeners();
  }

  if (canUseRtdb()) {
    try {
      if (!room) {
        const snap = await get(ref(rtdb, `${ARENA_ROOMS_PATH}/${sanitizeRtdbKey(roomId)}/hostUid`));
        if (snap.exists() && snap.val() !== safeHostUid) {
          throw new Error("Chỉ chủ phòng mới có quyền bắt đầu trận đấu!");
        }
      }
      await update(ref(rtdb, `${ARENA_ROOMS_PATH}/${sanitizeRtdbKey(roomId)}`), {
        status: "in_progress",
        startedAt: now,
        lastActiveAt: now,
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Chỉ chủ phòng")) throw err;
      console.warn("[ArenaService] RTDB startMatch error:", err);
    }
  }
}

/**
 * Cập nhật tiến độ của người chơi trong trận đấu
 */
export async function updateParticipantProgress(
  roomId: string,
  uid: string,
  currentQuestionIndex: number,
  score: number,
  completed: boolean
): Promise<void> {
  const safeUid = sanitizeRtdbKey(uid);
  const now = Date.now();
  const room = memoryRooms[roomId];

  let nextWinnerUid = room?.winnerUid;
  let allDone = false;
  let finishedAt = room?.finishedAt;
  let roomCode = room?.roomCode;

  if (room && room.participants?.[safeUid]) {
    const p = room.participants[safeUid];
    p.currentQuestionIndex = currentQuestionIndex;
    p.score = score;
    p.completed = completed;
    if (completed && !p.finishedAt) {
      p.finishedAt = now;
    }

    const parts = Object.values(room.participants);
    allDone = parts.length > 0 && parts.every((pt) => pt.completed);
    if (!room.winnerUid && completed) {
      room.winnerUid = safeUid;
      nextWinnerUid = safeUid;
    }
    if (allDone) {
      room.status = "finished";
      room.finishedAt = now;
      finishedAt = now;
      notifyLobbyListeners();
    }
    room.lastActiveAt = now;
    notifyRoomListeners(roomId);
  }

  if (canUseRtdb()) {
    try {
      const roomRef = ref(rtdb, `${ARENA_ROOMS_PATH}/${sanitizeRtdbKey(roomId)}`);
      // If memory cache didn't have latest participants (e.g. cold rejoin), read once from RTDB to determine winner/allDone accurately
      if (!room) {
        const snap = await get(roomRef);
        if (snap.exists()) {
          const remote = snap.val() as ArenaRoom;
          roomCode = remote.roomCode;
          const parts = { ...(remote.participants || {}) };
          if (parts[safeUid]) {
            parts[safeUid] = {
              ...parts[safeUid],
              currentQuestionIndex,
              score,
              completed,
              ...(completed && !parts[safeUid].finishedAt ? { finishedAt: now } : {}),
            };
          }
          const list = Object.values(parts);
          allDone = list.length > 0 && list.every((pt) => pt.completed);
          nextWinnerUid = remote.winnerUid || (completed ? safeUid : undefined);
          if (allDone) finishedAt = now;
        }
      }

      const updates: Record<string, any> = {
        [`participants/${safeUid}/currentQuestionIndex`]: currentQuestionIndex,
        [`participants/${safeUid}/score`]: score,
        [`participants/${safeUid}/completed`]: completed,
        lastActiveAt: now,
      };
      if (completed) {
        updates[`participants/${safeUid}/finishedAt`] = now;
      }
      if (nextWinnerUid) {
        updates.winnerUid = nextWinnerUid;
      }
      if (allDone) {
        updates.status = "finished";
        updates.finishedAt = finishedAt || now;
      }

      await update(roomRef, updates);

      if (allDone && roomCode) {
        await remove(ref(rtdb, `${ARENA_CODES_PATH}/${sanitizeRtdbKey(roomCode.toUpperCase())}`)).catch(() => {});
      }
    } catch (err) {
      console.warn("[ArenaService] RTDB progress update error:", err);
    }
  }
}

/**
 * Rời phòng thi & dọn dẹp phòng khi trống hoặc giải tán
 */
export async function leaveArenaRoom(roomId: string, uid: string): Promise<void> {
  const safeUid = sanitizeRtdbKey(uid);
  const safeRoomId = sanitizeRtdbKey(roomId);
  cancelParticipantDisconnect(roomId, safeUid);

  const memRoom = memoryRooms[roomId];
  let roomCode = memRoom?.roomCode;
  let shouldDeleteEntireRoom = false;

  if (memRoom && memRoom.participants?.[safeUid]) {
    delete memRoom.participants[safeUid];
    const remainingCount = Object.keys(memRoom.participants).length;
    const isWaitingHostLeave = memRoom.status === "waiting" && memRoom.hostUid === safeUid;
    if (remainingCount === 0 || isWaitingHostLeave) {
      shouldDeleteEntireRoom = true;
      delete memoryRooms[roomId];
    }
    notifyRoomListeners(roomId);
    notifyLobbyListeners();
  }

  if (canUseRtdb()) {
    try {
      const roomRef = ref(rtdb, `${ARENA_ROOMS_PATH}/${safeRoomId}`);
      const snap = await get(roomRef);
      if (snap.exists()) {
        const data = snap.val() as ArenaRoom;
        roomCode = data.roomCode || roomCode;
        const participants = { ...(data.participants || {}) };
        delete participants[safeUid];
        const remainingCount = Object.keys(participants).length;
        const isWaitingHostLeave = data.status === "waiting" && data.hostUid === safeUid;

        if (shouldDeleteEntireRoom || remainingCount === 0 || isWaitingHostLeave) {
          await deleteRtdbRoomAndCode(safeRoomId, roomCode);
        } else {
          await remove(ref(rtdb, `${ARENA_ROOMS_PATH}/${safeRoomId}/participants/${safeUid}`));
        }
      }
    } catch (err) {
      console.warn("[ArenaService] RTDB leave error:", err);
    }
  }
}

/**
 * Lắng nghe cập nhật phòng theo thời gian thực qua Firebase RTDB (0 Firestore reads)
 */
export function subscribeToArenaRoom(
  roomId: string,
  onUpdate: (room: ArenaRoom | null) => void
): () => void {
  if (!memoryListeners[roomId]) {
    memoryListeners[roomId] = new Set();
  }
  memoryListeners[roomId].add(onUpdate);

  if (memoryRooms[roomId]) {
    onUpdate(memoryRooms[roomId]);
  }

  let rtdbRef: ReturnType<typeof ref> | null = null;
  let valueHandler: ((snapshot: any) => void) | null = null;
  let seenRemoteData = false;

  if (canUseRtdb()) {
    try {
      rtdbRef = ref(rtdb, `${ARENA_ROOMS_PATH}/${sanitizeRtdbKey(roomId)}`);
      valueHandler = onValue(
        rtdbRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const remoteRoom = snapshot.val() as ArenaRoom;
            if (isArenaRoomExpired(remoteRoom)) {
              delete memoryRooms[roomId];
              void deleteRtdbRoomAndCode(roomId, remoteRoom.roomCode);
              onUpdate(null);
              return;
            }
            seenRemoteData = true;
            if (!remoteRoom.participants) remoteRoom.participants = {};
            memoryRooms[roomId] = remoteRoom;
            onUpdate(remoteRoom);
          } else {
            if (seenRemoteData || !memoryRooms[roomId]) {
              delete memoryRooms[roomId];
              onUpdate(null);
            }
          }
        },
        (error) => {
          console.warn("[ArenaService] RTDB onValue room error:", error);
        }
      );
    } catch (e) {
      console.warn("[ArenaService] Setup RTDB room listener failed:", e);
    }
  }

  return () => {
    memoryListeners[roomId]?.delete(onUpdate);
    if (rtdbRef && valueHandler) {
      try {
        off(rtdbRef, "value", valueHandler);
      } catch {}
    }
  };
}

/**
 * Lắng nghe danh sách phòng đang chờ tại local memory (0 Firestore reads)
 */
export function subscribeToActiveRooms(
  onUpdate: (rooms: ArenaRoom[]) => void
): () => void {
  lobbyListeners.add(onUpdate);
  const currentActive = Object.values(memoryRooms).filter(
    (r) => r.status === "waiting" && !isArenaRoomExpired(r)
  );
  onUpdate(currentActive);

  return () => {
    lobbyListeners.delete(onUpdate);
  };
}

export function clearArenaMemoryStoreForTests(): void {
  Object.keys(memoryRooms).forEach((k) => delete memoryRooms[k]);
  Object.keys(memoryListeners).forEach((k) => delete memoryListeners[k]);
  lobbyListeners.clear();
}
